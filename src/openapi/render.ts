import fs from 'fs';
import path from 'path';

import ts, { QualifiedName } from 'typescript';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import swagger2openapi from 'swagger2openapi';

import {
  Document,
  ReferenceObject,
  OAObject,
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
import * as cg from './codegen';

// type importableSources = 'schemas' | 'parameters' | 'requestBodies' | 'responses';

function capitalize(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

function getRefName($ref: string): QualifiedName {
  const [, , componentType, name] = $ref.split('/');
  return ts.createQualifiedName(ts.createIdentifier(capitalize(componentType)), name);
}

function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return (obj as ReferenceObject).$ref !== undefined;
}

function isNullable(object: OAObject): boolean {
  return object && typeof object === 'object' && 'nullable' in object;
}

function getNullableTypeFromSchema(object: OAObject): ts.TypeNode {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const type = getTypeFromSchema(object);
  return isNullable(object) ? ts.createUnionTypeNode([type, cg.keywordType.null]) : type;
}

function getTypeFromSchema(object: OAObject): ts.TypeNode {
  if (isReferenceObject(object)) {
    const name = getRefName(object.$ref);
    return ts.createTypeReferenceNode(name, undefined);
  } else {
    if (object.enum !== undefined) {
      return ts.createUnionTypeNode(
        object.enum.map(value => ts.createLiteralTypeNode(ts.createStringLiteral(value.toString()))),
      );
    } else if (object.type == 'array' && 'items' in object) {
      // TODO: How can we create a Set instead of an Array when `uniqueItems === true` ?
      return ts.createArrayTypeNode(getNullableTypeFromSchema(object.items));
    } else if (object.type === 'object') {
      if (object.properties !== undefined) {
        const members = Object.entries(object.properties).map(([propertyKey, propertyValue]) => {
          const required = object.required ?? [];
          return cg.createPropertySignature({
            questionToken: !required.includes(propertyKey),
            name: propertyKey,
            type: getNullableTypeFromSchema(propertyValue),
          });
        });
        return ts.createTypeLiteralNode(members);
      } else if (object.oneOf !== undefined) {
        return ts.createUnionTypeNode(object.oneOf.map(getNullableTypeFromSchema));
      } else if (object.allOf !== undefined) {
        return ts.createIntersectionTypeNode(object.allOf.map(getNullableTypeFromSchema));
      }
    } else if (object.type !== undefined) {
      return cg.keywordType[object.type];
    }
  }

  return cg.keywordType.any;
}

function renderSchema(document: Document): ts.TypeAliasDeclaration[] {
  const schemas = document.components?.schemas ?? {};
  return Object.keys(schemas).map(key => {
    return ts.createTypeAliasDeclaration([], [cg.modifier.export], key, [], getTypeFromSchema(schemas[key]));
  });
}

function renderParameterType(parameter: ParameterObject | ReferenceObject): ts.TypeNode {
  return isReferenceObject(parameter) ? getTypeFromSchema(parameter) : getTypeFromSchema(parameter.schema);
}

function renderParameters(parameters: ComponentsObject['parameters'] = {}): ts.TypeAliasDeclaration[] {
  return Object.keys(parameters).map(key => {
    return ts.createTypeAliasDeclaration([], [cg.modifier.export], key, [], renderParameterType(parameters[key]));
  });
}

function renderRequestBodyType(requestBody: RequestBodyObject | ReferenceObject): ts.TypeNode {
  if (isReferenceObject(requestBody)) {
    return getTypeFromSchema(requestBody);
  } else {
    const required = requestBody.required ?? false;
    const type = getTypeFromSchema(requestBody.content['application/json'].schema);
    return required ? type : ts.createUnionTypeNode([type, cg.keywordType.null]);
  }
}

function renderRequestBodies(requestBodies: ComponentsObject['requestBodies'] = {}): ts.TypeAliasDeclaration[] {
  return Object.keys(requestBodies).map(key => {
    return ts.createTypeAliasDeclaration([], [cg.modifier.export], key, [], renderRequestBodyType(requestBodies[key]));
  });
}

function renderResponsesType(response: ResponseObject | ReferenceObject): ts.TypeNode {
  if (isReferenceObject(response)) {
    return getTypeFromSchema(response);
  } else if (response.content?.['application/json']?.schema !== undefined) {
    return getTypeFromSchema(response.content['application/json'].schema);
  }

  return cg.keywordType.any;
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
  if (path.options !== undefined) operations.push(['DELETE', path.options]);
  if (path.head !== undefined) operations.push(['DELETE', path.head]);
  if (path.trace !== undefined) operations.push(['DELETE', path.trace]);

  return operations;
}

function renderResponses(
  paths: PathsObject,
  responses: ComponentsObject['responses'] = {},
  components: ResolvedComponentsObject,
): ts.TypeAliasDeclaration[] {
  const renderedOperationsResponseBodyTypes = Object.entries(paths).flatMap(([, pathObject]) => {
    const operations = getOperations(pathObject);
    return operations.flatMap(([, operation]) => {
      if (operation.operationId === undefined) throw new Error('Could not find operationId, it is mandatory !!!');

      const operationResponses = Object.entries(operation.responses || {});

      const renderedResponseBodyTypes = ts.createUnionTypeNode(
        operationResponses.map(([responseKey]) =>
          ts.createTypeReferenceNode(`${operation.operationId}${responseKey}`, undefined),
        ),
      );
      const renderedResponseBodyAggregatedType = ts.createTypeAliasDeclaration(
        [],
        [cg.modifier.export],
        `${operation.operationId}Response`,
        [],
        renderedResponseBodyTypes,
      );

      const renderedResponseBodyType = operationResponses.map(([responseKey, response]) => {
        const dereferencedResponse = isReferenceObject(response) ? resolveResponse(response, components) : response;
        const responseSchema = dereferencedResponse.content?.['application/json']?.schema;
        const renderedResponseBody =
          responseSchema !== undefined ? getTypeFromSchema(responseSchema) : cg.keywordType.any;

        const responseBodyType = ts.createTypeAliasDeclaration(
          [],
          [cg.modifier.export],
          `${operation.operationId}${responseKey}`,
          [],
          ts.createTypeLiteralNode([
            cg.createPropertySignature({
              questionToken: false,
              name: 'kind',
              type: ts.createLiteralTypeNode(ts.createLiteral(responseKey)),
            }),
            cg.createPropertySignature({
              questionToken: false,
              name: 'value',
              type: renderedResponseBody,
            }),
          ]),
        );

        return responseBodyType;
      });

      return [renderedResponseBodyAggregatedType, ...renderedResponseBodyType];
    });
  });

  return [
    ...renderedOperationsResponseBodyTypes,
    ...Object.keys(responses).map(key => {
      return ts.createTypeAliasDeclaration([], [cg.modifier.export], key, [], renderResponsesType(responses[key]));
    }),
  ];
}

function renderArgumentParameters(params: Array<RenderableParameter>): ts.TypeLiteralNode | undefined {
  if (params.length === 0) return;

  const members = params.map(param => {
    const required = param.required ?? false;
    return cg.createPropertySignature({
      questionToken: !required,
      name: param.name,
      type: param.renderedType,
    });
  });
  return ts.createTypeLiteralNode(members);
}

import toJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';

type RenderableParameter = {
  name: string;
  required: boolean;
  renderedType: ts.TypeNode;
};

function renderOperation(
  pattern: string,
  operationName: string,
  parameters: Array<ReferenceObject | ParameterObject>,
  operation: OperationObject,
  components: ResolvedComponentsObject,
): ts.ClassElement {
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

  const methodParams = [];
  if (pathParamType !== undefined) {
    methodParams.push(
      cg.createParameter('pathParams', {
        type: pathParamType,
        questionToken: false,
      }),
    );
  }
  if (headerParamType !== undefined) {
    methodParams.push(
      cg.createParameter('headerParams', {
        type: headerParamType,
        questionToken: false,
      }),
    );
  }
  if (queryParamType !== undefined) {
    methodParams.push(
      cg.createParameter('queryParams', {
        type: queryParamType,
        questionToken: false,
      }),
    );
  }
  if (bodyType !== undefined) {
    methodParams.push(
      cg.createParameter('body', {
        type: bodyType,
        questionToken: false,
      }),
    );
  }

  const methodArguments: ts.Expression[] = [ts.createLiteral(operationName.toUpperCase()), ts.createLiteral(pattern)];
  if (pathParamType !== undefined) {
    methodArguments.push(ts.createIdentifier('pathParams'));
  } else {
    methodArguments.push(ts.createObjectLiteral([]));
  }
  if (headerParamType !== undefined) {
    methodArguments.push(ts.createIdentifier('headerParams'));
  } else {
    methodArguments.push(ts.createObjectLiteral([]));
  }
  if (queryParamType !== undefined) {
    methodArguments.push(ts.createIdentifier('queryParams'));
  } else {
    methodArguments.push(ts.createObjectLiteral([]));
  }
  if (bodyType !== undefined) {
    methodArguments.push(ts.createIdentifier('body'));
  } else {
    methodArguments.push(ts.createNull());
  }

  // HACK: HUUUUUUUUUGE hammer to convert an object in a literal
  methodArguments.push(ts.parseJsonText('someFileName.ts', JSON.stringify(responseSchemas)).statements[0].expression);

  return cg.createMethodDeclaration(
    operation.operationId,
    {
      type: ts.createTypeReferenceNode('Promise', [
        ts.createTypeReferenceNode(
          ts.createQualifiedName(ts.createIdentifier('Responses'), `${operation.operationId}Response`),
          undefined,
        ),
      ]),
    },
    methodParams,
    cg.block(
      ts.createReturn(
        cg.createCall(
          ts.createPropertyAccess(
            cg.createCall(ts.createPropertyAccess(ts.createIdentifier('this'), 'performRequest'), {
              args: methodArguments,
            }),
            'then',
          ),
          {
            args: [
              cg.createArrowFunction(
                [cg.createParameter('responseJson', {})],
                ts.createAsExpression(
                  ts.createIdentifier('responseJson'),
                  ts.createTypeReferenceNode('Promise', [
                    ts.createTypeReferenceNode(
                      ts.createQualifiedName(ts.createIdentifier('Responses'), `${operation.operationId}Response`),
                      undefined,
                    ),
                  ]),
                ),
                {},
              ),
            ],
          },
        ),
      ),
    ),
  );
}

function renderPath(pattern: string, path: PathItemObject, components: ResolvedComponentsObject): ts.ClassElement[] {
  const commonParameters = path.parameters || [];
  const operations: Array<[string, OperationObject]> = getOperations(path);

  return operations.map(([operationName, operation]) =>
    renderOperation(pattern, operationName, commonParameters, operation, components),
  );
}

function renderPaths(paths: PathsObject, components: ResolvedComponentsObject): ts.ClassElement[] {
  return Object.entries(paths).flatMap(([pattern, pathObject]) => renderPath(pattern, pathObject, components));
}

function renderClient(baseUrl: string, endpoints: ts.ClassElement[]): ts.NodeArray<ts.Statement> {
  // Parse ClientStub.ts so that we do not have to generate everything manually
  const stub = cg.parseFile(path.resolve(__dirname, '../../src/openapi/ClientStub.ts'));

  const clientClass: ts.ClassDeclaration = cg.findNode<ts.ClassDeclaration>(
    stub.statements,
    ts.SyntaxKind.ClassDeclaration,
  );

  const baseUrlDeclaration: ts.PropertyDeclaration = cg.findNode<ts.PropertyDeclaration>(
    clientClass.members,
    ts.SyntaxKind.PropertyDeclaration,
  );
  // Inject base url
  baseUrlDeclaration.initializer = ts.createStringLiteral(baseUrl);

  // Inject endpoint methods
  clientClass.members = cg.appendNodes(clientClass.members, ...endpoints);

  return stub.statements;
}

function renderEmptyExport(): ts.ExportDeclaration {
  return ts.createExportDeclaration([], [], undefined, ts.createObjectLiteral([]));
}

function renderSchemaTypeImports(basePath: string): ts.ImportDeclaration {
  const importNode = cg.createImport(
    ts.createIdentifier('Schemas'),
    ts.createStringLiteral(path.join(basePath, 'schemas')),
  );

  ts.addSyntheticLeadingComment(
    importNode,
    ts.SyntaxKind.SingleLineCommentTrivia,
    'eslint-disable @typescript-eslint/no-unused-vars',
    false,
  );
  ts.addSyntheticLeadingComment(
    importNode,
    ts.SyntaxKind.SingleLineCommentTrivia,
    'eslint-disable import/namespace',
    false,
  );
  ts.addSyntheticLeadingComment(importNode, ts.SyntaxKind.SingleLineCommentTrivia, '@ts-nocheck', false);

  return importNode;
}

function renderTypeImports(basePath: string): ts.ImportDeclaration[] {
  return [
    renderSchemaTypeImports(basePath),
    cg.createImport(ts.createIdentifier('RequestBodies'), ts.createStringLiteral(path.join(basePath, 'requestBodies'))),
    cg.createImport(ts.createIdentifier('Parameters'), ts.createStringLiteral(path.join(basePath, 'parameters'))),
    cg.createImport(ts.createIdentifier('Responses'), ts.createStringLiteral(path.join(basePath, 'responses'))),
  ];
}

function isOpenAPIV3Document(obj: unknown): obj is OpenAPIV3.Document {
  return (obj as OpenAPIV3.Document).openapi !== undefined;
}

async function loadOpenAPI(filename: string): Promise<[Document, ResolvedComponentsObject]> {
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

  if (filenameToParse !== filename) {
    fs.unlinkSync(filenameToParse);
    fs.rmdirSync(path.dirname(filenameToParse));
  }

  if (!isOpenAPIV3Document(parsedDocument) || !isOpenAPIV3Document(dereferencedDocument)) {
    throw new Error('Problem occured while preparing your specification');
  }

  return [parsedDocument as Document, (dereferencedDocument.components ?? {}) as ResolvedComponentsObject];
}

export async function render(filename: string, output: string): Promise<void> {
  const [document, dereferencedComponents] = await loadOpenAPI(filename);

  if (!fs.existsSync(output) || fs.lstatSync(output).isDirectory()) {
    const modelsOutput = path.join(output, 'models');
    fs.mkdirSync(modelsOutput, { recursive: true });

    const schemas = renderSchema(document);
    fs.writeFileSync(`${modelsOutput}/schemas.ts`, cg.printNodes([renderSchemaTypeImports('./'), ...schemas]));

    fs.writeFileSync(`${modelsOutput}/parameters.ts`, cg.printNodes(renderParameters(document.components?.parameters)));

    fs.writeFileSync(
      `${modelsOutput}/requestBodies.ts`,
      cg.printNodes([
        renderSchemaTypeImports('./'),
        ...renderRequestBodies(document.components?.requestBodies),
        renderEmptyExport(),
      ]),
    );

    fs.writeFileSync(
      `${modelsOutput}/responses.ts`,
      cg.printNodes([
        renderSchemaTypeImports('./'),
        ...renderResponses(document.paths, document.components?.responses, dereferencedComponents.responses ?? {}),
        renderEmptyExport(),
      ]),
    );

    // TODO: Handle multiple servers
    const baseUrl = document.servers?.[0].url ?? 'http://localhost:9000';
    const endpoints = renderPaths(document.paths, dereferencedComponents);
    fs.writeFileSync(
      `${output}/client.ts`,
      cg.printNodes([...renderTypeImports('./models'), ...renderClient(baseUrl, endpoints)]),
    );
  } else {
    throw new Error(`Path ${output} already exists and is not a directory`);
  }
}
