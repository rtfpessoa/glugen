import {
  ReferenceObject,
  OAObject,
  toTSType,
  ComponentsObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  ResolvedComponentsObject,
  OperationObject,
  PathItemObject,
  PathsObject,
  SchemaObject,
} from './types';

function capitalize(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

/** Renders the name for a reference
 * You can pass the @isLocal as true to not render the prefix
 *   if the type is being used in the same file as the reference
 */
function getRefName($ref: string, isLocal = false): string {
  const [, , componentType, name] = $ref.split('/');
  return `${!isLocal ? `${capitalize(componentType)}.` : ''}${name}`;
}

function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return (obj as ReferenceObject).$ref !== undefined;
}

function renderObject(object: OAObject): string {
  if (isReferenceObject(object)) {
    // RefType
    return getRefName(object.$ref);
  } else {
    const nullablePart = object.nullable ?? false ? ' | null' : '';
    if (object.enum !== undefined) {
      // EnumType
      return `${object.enum.map(value => `'${value}'`).join(' | ')}${nullablePart}`;
    } else if (object.type == 'array') {
      // ArrayType
      return `${object.uniqueItems ? 'Set' : 'Array'}<${renderObject(object.items)}>${nullablePart}`;
    } else if (object.type == 'object') {
      // ObjectType
      if (object.properties !== undefined) {
        return (
          '{ ' +
          Object.entries(object.properties)
            .map(([propertyKey, propertyValue]) => {
              const required = object.required ?? [];
              return `${propertyKey}${required.includes(propertyKey) ? '' : '?'}: ${renderObject(propertyValue)};`;
            })
            .join(' ') +
          ' }'
        );
      } else if (object.anyOf !== undefined) {
        return object.anyOf.map(object => renderObject(object)).join(' | ');
      } else if (object.allOf !== undefined) {
        return object.allOf.map(object => renderObject(object)).join(' & ');
      } else {
        throw new Error('Could not render object without properties, anyOf or allOf');
      }
    }

    // ValueType
    return `${toTSType[object.type]}${nullablePart}`;
  }
}

function renderSchema(schemas: ComponentsObject['schemas'] = {}): string {
  return Object.keys(schemas)
    .map(key => {
      const object = schemas[key];
      return `export type ${key} = ${renderObject(object)};`;
    })
    .join('\n');
}

function renderParameterType(parameter: ParameterObject | ReferenceObject): string {
  if (isReferenceObject(parameter)) {
    return getRefName(parameter.$ref);
  } else {
    return renderObject(parameter.schema);
  }
}

function renderParameters(parameters: ComponentsObject['parameters'] = {}): string {
  return Object.keys(parameters)
    .map(key => {
      return `export type ${key} = ${renderParameterType(parameters[key])};`;
    })
    .join('\n');
}

function renderRequestBodyType(requestBody: RequestBodyObject | ReferenceObject): string {
  if (isReferenceObject(requestBody)) {
    return getRefName(requestBody.$ref);
  } else {
    const required = requestBody.required ?? false;
    const requiredSuffix = required ? '' : ' | null';
    return `${renderObject(requestBody.content['application/json'].schema)}${requiredSuffix}`;
  }
}

function renderRequestBodies(requestBodies: ComponentsObject['requestBodies'] = {}): string {
  return Object.keys(requestBodies)
    .map(key => {
      return `export type ${key} = ${renderRequestBodyType(requestBodies[key])};`;
    })
    .join('\n');
}

function renderResponsesType(response: ResponseObject | ReferenceObject): string {
  if (isReferenceObject(response)) {
    return getRefName(response.$ref);
  } else if (response.content?.['application/json']?.schema !== undefined) {
    return renderObject(response.content['application/json'].schema);
  } else {
    // TODO: Check what is the type of an empty response
    return 'null';
  }
}

function resolveParameter(param: ReferenceObject, components: ResolvedComponentsObject): ParameterObject {
  const [, , componentType, objectName] = param.$ref.split('/');

  if (componentType !== 'parameters') {
    throw new Error(`Tried to resolve $ref ${param.$ref} as parameter but it is of type ${componentType}`);
  }

  const resolvedParameter = components.parameters?.[objectName];

  if (resolvedParameter === undefined) {
    throw new Error(`Failed to resolve parameter ${objectName}`);
  }

  return resolvedParameter;
}

function resolveResponse(response: ReferenceObject, components: ResolvedComponentsObject): ResponseObject {
  const [, , componentType, objectName] = response.$ref.split('/');

  if (componentType !== 'responses') {
    throw new Error(`Tried to resolve $ref ${response.$ref} as response but it is of type ${componentType}`);
  }

  const resolvedResponse = components.responses?.[objectName];

  if (resolvedResponse === undefined) {
    throw new Error(`Failed to resolve response ${objectName}`);
  }

  return resolvedResponse;
}

function resolveSchema(schema: ReferenceObject, components: ResolvedComponentsObject): SchemaObject {
  const [, , componentType, objectName] = schema.$ref.split('/');

  if (componentType !== 'schemas') {
    throw new Error(`Tried to resolve $ref ${schema.$ref} as schema but it is of type ${componentType}`);
  }

  const resolvedSchema = components.schemas?.[objectName];

  if (resolvedSchema === undefined) {
    throw new Error(`Failed to resolve schema ${objectName}`);
  }

  return resolvedSchema;
}

function getOperations(path: PathItemObject): Array<[string, OperationObject]> {
  const operations: Array<[string, OperationObject]> = [];
  if (path.get !== undefined) operations.push(['GET', path.get]);
  if (path.put !== undefined) operations.push(['PUT', path.put]);
  if (path.post !== undefined) operations.push(['POST', path.post]);
  if (path.patch !== undefined) operations.push(['PATCH', path.patch]);
  if (path.delete !== undefined) operations.push(['DELETE', path.delete]);

  return operations;
}

function renderResponses(
  paths: PathsObject,
  responses: ComponentsObject['responses'] = {},
  components: ResolvedComponentsObject,
): string {
  const renderedOperationsResponseBodyTypes = Object.entries(paths)
    .map(([, pathObject]) => {
      const operations = getOperations(pathObject);
      const renderedResponseBodyTypes = operations.map(([, operation]) => {
        if (operation.operationId === undefined) throw new Error('');

        const operationResponses = Object.entries(operation.responses || {});

        const renderedResponseBodyTypes = operationResponses
          .map(([responseKey]) => `${operation.operationId}${responseKey}`)
          .join(' | ');
        const renderedResponseBodyAggregatedType = `export type ${operation.operationId}Response = ${renderedResponseBodyTypes};`;

        const renderedResponseBodyType = operationResponses.reduce((responses, [responseKey, response]) => {
          const dereferencedResponse = isReferenceObject(response) ? resolveResponse(response, components) : response;
          const responseSchema = dereferencedResponse.content?.['application/json']?.schema;
          const renderedResponseBody = responseSchema !== undefined ? renderObject(responseSchema) : 'void';

          const responseBodyType = `export type ${operation.operationId}${responseKey} = {
  kind: ${responseKey};
  value: ${renderedResponseBody};
};`;

          return `${responses}\n${responseBodyType}`;
        }, '');
        return renderedResponseBodyAggregatedType + renderedResponseBodyType + '\n';
      });
      return renderedResponseBodyTypes;
    })
    .join('\n');

  return (
    renderedOperationsResponseBodyTypes +
    '\n\n' +
    Object.keys(responses)
      .map(key => {
        return `export type ${key} = ${renderResponsesType(responses[key])};`;
      })
      .join('\n')
  );
}

function renderArgumentParameters(params: Array<RenderableParameter>): string | undefined {
  if (params.length === 0) return;

  return (
    '{ ' +
    params
      .map(param => {
        const required = param.required ?? false ? '' : '?';
        return `${param.name}${required}: ${param.renderedType};`;
      })
      .join(' ') +
    ' }'
  );
}

import toJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';

type RenderableParameter = {
  name: string;
  required: boolean;
  renderedType: string;
};

function renderOperation(
  pattern: string,
  operationName: string,
  parameters: Array<ReferenceObject | ParameterObject>,
  operation: OperationObject,
  components: ResolvedComponentsObject,
): string {
  const operationParameters = operation.parameters || [];
  const allParameters = parameters.concat(operationParameters);

  const {
    path,
    header,
    query,
  }: {
    path: Array<RenderableParameter>;
    header: Array<RenderableParameter>;
    query: Array<RenderableParameter>;
  } = allParameters.reduce(
    (accumulator, param) => {
      const resolvedParam = isReferenceObject(param) ? resolveParameter(param, components) : param;
      accumulator[resolvedParam.in].push({
        name: resolvedParam.name,
        required: resolvedParam.required ?? false,
        renderedType: renderParameterType(param),
      });
      return accumulator;
    },
    {
      path: new Array<RenderableParameter>(),
      header: new Array<RenderableParameter>(),
      query: new Array<RenderableParameter>(),
    },
  );

  const responseSchemas = Object.entries(operation.responses || {}).reduce((responses, [responseKey, response]) => {
    const dereferencedResponse = isReferenceObject(response) ? resolveResponse(response, components) : response;
    const responseSchema = dereferencedResponse.content?.['application/json']?.schema;
    const resolvedSchema =
      responseSchema !== undefined
        ? isReferenceObject(responseSchema)
          ? resolveSchema(responseSchema, components)
          : responseSchema
        : undefined;

    // TODO: Check what is the type of an empty response (when resolvedSchema is undefined)
    const jsonSchema = resolvedSchema !== undefined ? toJsonSchema(resolvedSchema) : undefined;

    return {
      ...responses,
      [responseKey]: jsonSchema,
    };
  }, {});

  const pathParamType = renderArgumentParameters(path);
  const headerParamType = renderArgumentParameters(header);
  const queryParamType = renderArgumentParameters(query);
  const bodyType = operation.requestBody !== undefined ? renderRequestBodyType(operation.requestBody) : undefined;

  return `${operation.operationId}(
  ${pathParamType !== undefined ? `pathParams: ${pathParamType},` : ''}
  ${headerParamType !== undefined ? `headerParams: ${headerParamType},` : ''}
  ${queryParamType !== undefined ? `queryParams: ${queryParamType},` : ''}
  ${bodyType !== undefined ? `body: ${bodyType},` : ''}
): Promise<Responses.${operation.operationId}Response> {
  return this.performRequest(
    '${operationName.toUpperCase()}',
    '${pattern}',
    ${pathParamType !== undefined ? `pathParams,` : '{},'}
    ${headerParamType !== undefined ? `headerParams,` : '{},'}
    ${queryParamType !== undefined ? `queryParams,` : '{},'}
    ${bodyType !== undefined ? `body,` : 'null,'}
    ${JSON.stringify(responseSchemas)},
  ).then((responseJson) => { return responseJson as Promise<Responses.${operation.operationId}Response>; });
}`;
}

function renderPath(pattern: string, path: PathItemObject, components: ResolvedComponentsObject): string {
  const commonParameters = path.parameters || [];
  const operations: Array<[string, OperationObject]> = getOperations(path);

  return operations
    .map(([operationName, operation]) =>
      renderOperation(pattern, operationName, commonParameters, operation, components),
    )
    .join('\n');
}

function renderPaths(paths: PathsObject, components: ResolvedComponentsObject): string {
  return Object.entries(paths)
    .map(([pattern, pathObject]) => renderPath(pattern, pathObject, components))
    .join('\n');
}

function renderClient(baseUrl: string, endpoints: string): string {
  return `
import { URL } from 'url';
import fetch from 'isomorphic-unfetch';
import { Schema, Validator } from 'jsonschema';

type Parameter = number | boolean | string | undefined;
type ResponseSchemas = { [statusCode: string]: Schema };

export class Client {
  readonly baseUrl: string = '${baseUrl}';
  readonly validator: Validator = new Validator();

  constructor(baseUrl?: string) {
    if(baseUrl !== undefined) this.baseUrl = baseUrl;
  }

  removeNulls(instance: { [key: string]: unknown }, property: string): void {
    const value = instance[property];
    if (value === null || typeof value == 'undefined') {
      delete instance[property];
    }
  }

  performRequest(
    method: string,
    path: string,
    pathParams: { [key: string]: Parameter } = {},
    headerParams: { [key: string]: Parameter } = {},
    queryParams: { [key: string]: Parameter } = {},
    body: unknown,
    responseSchemas: ResponseSchemas,
  ): Promise<unknown> {
    const requestUrl = new URL(this.baseUrl);
  
    const replacedPath = Object.entries(pathParams).reduce((url, [paramKey, paramValue]) => {
      return paramValue !== undefined ? url.replace(\`{\${paramKey}}\`, paramValue.toString()) : url;
    }, path);
  
    requestUrl.pathname = requestUrl.pathname + replacedPath;
  
    Object.entries(queryParams).forEach(([queryParamKey, queryParamValue]) => {
      if (queryParamValue !== undefined) requestUrl.searchParams.append(queryParamKey, queryParamValue.toString());
    });
  
    const headers = Object.entries(headerParams).reduce((headers, [headerName, headerValue]) => {
      if (headerValue !== undefined) headers.push([headerName, headerValue.toString()]);
      return headers;
    }, new Array<[string, string]>());
  
    const bodyParam = body !== null ? { body: JSON.stringify(body) } : {};
  
    return fetch(requestUrl.toString(), {
      method,
      headers,
      ...bodyParam,
    }).then(async response => {
      const responseJson = await response.json();
      const validationOptions = { allowUnknownAttributes: true, preValidateProperty: this.removeNulls };
      const responseSchema: Schema | undefined = responseSchemas[response.status.toString()];
      const validationResponse =
        responseSchema !== undefined
          ? this.validator.validate(responseJson, responseSchema, validationOptions)
          : { valid: false, errors: { message: \`Response status \${response.status} does not have a schema defined.\` } };
      if (validationResponse.valid) {
        return {
          kind: response.status,
          value: responseJson
        };
      }

      const errorBody = await response.body.read().toString('utf-8');
      throw new Error(\`Failed to validate schema of response with status \${response.status} and body:\\n\${errorBody}\`);
    });
  }

  ${endpoints}
}`;
}

function renderEmptyExport(): string {
  return `export {};`;
}

function renderSchemaTypeImports(basePath: string): string {
  return `/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/namespace */
// @ts-nocheck
import * as Schemas from '${basePath}/schemas';`;
}

function renderTypeImports(basePath: string): string {
  return `${renderSchemaTypeImports(basePath)}
import * as RequestBodies from '${basePath}/requestBodies';
import * as Parameters from '${basePath}/parameters';
import * as Responses from '${basePath}/responses';`;
}

import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import swagger2openapi from 'swagger2openapi';
import fs from 'fs';
import path from 'path';

function isOpenAPIV3Document(obj: unknown): obj is OpenAPIV3.Document {
  return (obj as OpenAPIV3.Document).openapi !== undefined;
}

async function loadOpenAPI(filename: string): Promise<[OpenAPIV3.Document, OpenAPIV3.Document]> {
  const parser = new SwaggerParser();

  let filenameToParse = filename;
  let parsedDocument: OpenAPI.Document = await parser.parse(filename);
  if (!isOpenAPIV3Document(parsedDocument)) {
    const apiObject = (await swagger2openapi.convertFile(filename, { anchors: true })).openapi;
    const tmpDirectory = fs.mkdtempSync('glugen');
    const tmpFile = path.join(tmpDirectory, 'api.json');
    fs.writeFileSync(tmpFile, JSON.stringify(apiObject));
    filenameToParse = tmpFile;
    parsedDocument = await parser.parse(filenameToParse);
  }

  const dereferencedDocument: OpenAPI.Document = await parser.dereference(filenameToParse);

  if (!isOpenAPIV3Document(parsedDocument) || !isOpenAPIV3Document(dereferencedDocument)) {
    throw new Error('Problem occured while preparing your specification');
  }

  return [parsedDocument, dereferencedDocument];
}

export async function render(filename: string, output: string): Promise<void> {
  const [document, documentDereferenced] = await loadOpenAPI(filename);

  if (!fs.existsSync(output) || fs.lstatSync(output).isDirectory()) {
    const modelsOutput = path.join(output, 'models');
    fs.mkdirSync(modelsOutput, { recursive: true });

    const schemasStr = [renderSchemaTypeImports('./'), renderSchema(document.components?.schemas)].join('\n\n');
    fs.writeFileSync(`${modelsOutput}/schemas.ts`, schemasStr);

    const requestBodiesStr = [
      renderSchemaTypeImports('./'),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      renderRequestBodies(document.components?.requestBodies),
      renderEmptyExport(),
    ].join('\n\n');
    fs.writeFileSync(`${modelsOutput}/requestBodies.ts`, requestBodiesStr);

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const parametersStr = renderParameters(document.components?.parameters);
    fs.writeFileSync(`${modelsOutput}/parameters.ts`, parametersStr);

    const responsesStr = [
      renderSchemaTypeImports('./'),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      renderResponses(document.paths, document.components?.responses),
      renderEmptyExport(),
    ].join('\n\n');
    fs.writeFileSync(`${modelsOutput}/responses.ts`, responsesStr);

    // TODO: Handle multiple servers
    const baseUrl = document.servers?.[0].url ?? 'http://localhost:9000';
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const endpoints = renderPaths(document.paths, documentDereferenced.components);
    const clientStr = [renderTypeImports('./models'), renderClient(baseUrl, endpoints)].join('\n\n');
    fs.writeFileSync(`${output}/client.ts`, clientStr);
  } else {
    throw new Error(`Path ${output} already exists and is not a directory`);
  }
}
