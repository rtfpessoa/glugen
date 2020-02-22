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

function getRefName($ref: string): string {
  const [, , componentType, name] = $ref.split('/');
  const nameSuffix =
    componentType === 'requestBodies'
      ? 'Body'
      : componentType === 'parameters'
      ? 'Parameter'
      : componentType === 'responses'
      ? 'Response'
      : '';
  return `${name}${nameSuffix}`;
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
      return `export type ${key}Parameter = ${renderParameterType(parameters[key])};`;
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
      return `export type ${key}RequestBody = ${renderRequestBodyType(requestBodies[key])};`;
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

function renderResponses(responses: ComponentsObject['responses'] = {}): string {
  return Object.keys(responses)
    .map(key => {
      return `export type ${key}Response = ${renderResponsesType(responses[key])};`;
    })
    .join('\n');
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

  const responses = Object.entries(operation.responses || {}).reduce((responses, [responseKey, response]) => {
    return {
      ...responses,
      [responseKey]: renderResponsesType(response),
    };
  }, {});

  const returnTypes = Array.from(new Set(Object.values(responses)).values()).join(' | ');

  const pathParamType = renderArgumentParameters(path);
  const headerParamType = renderArgumentParameters(header);
  const queryParamType = renderArgumentParameters(query);
  const bodyType = operation.requestBody !== undefined ? renderRequestBodyType(operation.requestBody) : undefined;

  return `export function ${operation.operationId}(
      ${pathParamType !== undefined ? `pathParams: ${pathParamType},` : ''}
      ${headerParamType !== undefined ? `headerParams: ${headerParamType},` : ''}
      ${queryParamType !== undefined ? `queryParams: ${queryParamType},` : ''}
      ${bodyType !== undefined ? `body: ${bodyType},` : ''}
    ): Promise<${returnTypes}> {
      return performRequest(
        '${operationName.toUpperCase()}',
        '${pattern}',
        ${pathParamType !== undefined ? `pathParams,` : '{},'}
        ${headerParamType !== undefined ? `headerParams,` : '{},'}
        ${queryParamType !== undefined ? `queryParams,` : '{},'}
        ${bodyType !== undefined ? `body,` : 'undefined,'}
      ).then(([responseCode, responseJson]) => {
        const responseSchemas: { [statusCode: string]: Schema } = ${JSON.stringify(responseSchemas)};
        const validationOptions = { allowUnknownAttributes: true, preValidateProperty: removeNulls };
        const responseSchema: Schema | undefined = responseSchemas[responseCode.toString()];
        const validationResponse =
          responseSchema !== undefined
            ? validator.validate(responseJson, responseSchema, validationOptions)
            : { valid: false, errors: { message: \`Response status \${responseCode} does not have a schema defined.\` } };
        if(validationResponse.valid) {
          return responseJson as Promise<${returnTypes}> 
        }

        console.log(JSON.stringify(validationResponse, null, 2));
        throw new Error("Failed to validate schema of response");
      });
  }`;
}

function renderPath(pattern: string, path: PathItemObject, components: ResolvedComponentsObject): string {
  const commonParameters = path.parameters || [];
  const operations: Array<[string, OperationObject]> = [];
  if (path.get !== undefined) operations.push(['GET', path.get]);
  if (path.put !== undefined) operations.push(['PUT', path.put]);
  if (path.post !== undefined) operations.push(['POST', path.post]);
  if (path.patch !== undefined) operations.push(['PATCH', path.patch]);
  if (path.delete !== undefined) operations.push(['DELETE', path.delete]);

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

function renderUtilFunctions(baseUrl: string): string {
  return `
  import { URL } from 'url';
  import fetch from 'node-fetch';
  import { Schema, Validator } from 'jsonschema';

  const baseUrl = '${baseUrl}';
  const validator = new Validator();

  function removeNulls(instance: { [key: string]: unknown }, property: string): void {
    const value = instance[property];
    if (value === null || typeof value == 'undefined') {
      delete instance[property];
    }
  }

  type Parameter = number | boolean | string | undefined;

  function performRequest(
    method: string,
    path: string,
    pathParams: { [key: string]: Parameter } = {},
    headerParams: { [key: string]: Parameter } = {},
    queryParams: { [key: string]: Parameter } = {},
    body?: unknown,
  ): Promise<[number, unknown]> {
    const requestUrl = new URL(baseUrl);
  
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
  
    const bodyParam = body ? { body: JSON.stringify(body) } : {};
  
    return fetch(requestUrl.toString(), {
      method,
      headers,
      ...bodyParam,
    }).then(async response => {
      if (response.ok) {
        const responseTuple: [number, unknown] = [response.status, await response.json()];
        return responseTuple;
      }
  
      const errorBody = await response.body.read().toString('utf-8');
      throw new Error(\`Request did not succeed got \${response.status} and \${errorBody}\`);
    });
  }`;
}

import Parser from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import fs from 'fs';

function isOpenAPIV3Document(obj: unknown): obj is OpenAPIV3.Document {
  return (obj as OpenAPIV3.Document).openapi !== undefined;
}

export async function render(input: string, output: string): Promise<void> {
  const document = await Parser.parse(input);
  const documentDereferenced = await Parser.dereference(input);

  // TODO: Support Swagger v2
  if (!isOpenAPIV3Document(document) || !isOpenAPIV3Document(documentDereferenced)) {
    throw new Error('You must provide a valid OpenAPI v3 document. Swagger v2 is not supported.');
  }

  // TODO: Handle multiple servers
  const baseUrl = document.servers?.[0].url ?? 'http://localhost:9000';

  const content = [
    renderSchema(document.components?.schemas),
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    renderRequestBodies(document.components?.requestBodies),
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    renderParameters(document.components?.parameters),
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    renderResponses(document.components?.responses),
    renderUtilFunctions(baseUrl),
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    renderPaths(document.paths, documentDereferenced.components),
  ].join('\n\n');

  if (fs.existsSync(output) && fs.lstatSync(output).isDirectory()) {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(`${output}/api-generated.ts`, content);
  } else {
    fs.writeFileSync(output, content);
  }
}
