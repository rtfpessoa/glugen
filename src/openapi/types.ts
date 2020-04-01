export type ArrayType = 'array';
// type EnumType = 'enum';

export type TSValueTypes = 'null' | 'boolean' | 'number' | 'string' | 'undefined' | 'any';

// Not Used:
//   - void
//   - never

export type OANonArrayTypes = 'null' | 'boolean' | 'number' | 'string' | 'integer' | 'undefined' | 'any' | 'object';

export interface ReferenceObject {
  $ref: string;
}

export type NonArraySchemaObjectType = OANonArrayTypes;
export type ArraySchemaObjectType = ArrayType;

export type SchemaObject = ArraySchemaObject | NonArraySchemaObject;
export interface ArraySchemaObject extends BaseSchemaObject {
  type: ArraySchemaObjectType;
  items: OAObject;
  uniqueItems?: boolean;
}
export interface NonArraySchemaObject extends BaseSchemaObject {
  type: NonArraySchemaObjectType;
}
export interface BaseSchemaObject {
  required?: Array<string>;
  enum?: Array<number | string>;
  properties?: {
    [name: string]: OAObject;
  };
  allOf?: Array<OAObject>;
  oneOf?: Array<OAObject>;
  // anyOf?: Array<OAObject>;
  nullable?: boolean;
}

export type OAObject = ReferenceObject | SchemaObject;

export interface JsonSchemaObject {
  'application/json': {
    schema: OAObject;
  };
}

export type ParameterInType = 'path' | 'query' | 'header';

export interface ParameterObject {
  name: string;
  in: ParameterInType;
  required?: boolean;
  deprecated?: boolean;
  schema: OAObject;
}

export interface RequestBodyObject {
  required?: boolean;
  content: JsonSchemaObject;
}

export interface ResponseObject {
  content?: JsonSchemaObject;
}

export interface ResponsesObject {
  [code: string]: ReferenceObject | ResponseObject;
}

export interface ResolvedComponentsObject {
  schemas?: {
    [name: string]: SchemaObject;
  };
  responses?: {
    [code: string]: ResponseObject;
  };
  parameters?: {
    [name: string]: ParameterObject;
  };
  requestBodies?: {
    [name: string]: RequestBodyObject;
  };
}

export interface ComponentsObject {
  schemas?: {
    [key: string]: OAObject;
  };
  responses?: ResponsesObject;
  parameters?: {
    [key: string]: ReferenceObject | ParameterObject;
  };
  requestBodies?: {
    [key: string]: ReferenceObject | RequestBodyObject;
  };
}

export interface OperationObject {
  operationId?: string;
  parameters?: Array<ReferenceObject | ParameterObject>;
  requestBody?: ReferenceObject | RequestBodyObject;
  responses?: ResponsesObject;
  deprecated?: boolean;
}

export interface PathItemObject {
  $ref?: string;
  parameters?: Array<ReferenceObject | ParameterObject>;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
}

export interface PathsObject {
  [pattern: string]: PathItemObject;
}

export interface TagObject {
  name: string;
}

export interface ServerObject {
  url: string;
}

export interface Document {
  servers?: Array<ServerObject>;
  paths: PathsObject;
  components?: ComponentsObject;
  tags?: Array<TagObject>;
}
