// Source: https://github.com/cellular/oazapfts/blob/master/src/tscodegen.ts

import fs from 'fs';

import ts from 'typescript';

import { OANonArrayTypes } from './types';

const questionToken = ts.createToken(ts.SyntaxKind.QuestionToken);

export function createQuestionToken(token?: boolean | ts.QuestionToken): ts.QuestionToken | undefined {
  if (!token) return undefined;
  if (token === true) return questionToken;
  return token;
}

export const keywordType: {
  [key in OANonArrayTypes]: ts.KeywordTypeNode;
} = {
  any: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  number: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  integer: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  object: ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
  string: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  boolean: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
  undefined: ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
  null: ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword),
};

export const modifier = {
  async: ts.createModifier(ts.SyntaxKind.AsyncKeyword),
  export: ts.createModifier(ts.SyntaxKind.ExportKeyword),
};

export function isValidIdentifier(str: string): boolean {
  if (!str.length || str.trim() !== str) return false;
  const node = ts.parseIsolatedEntityName(str, ts.ScriptTarget.Latest);
  return !!node && node.kind === ts.SyntaxKind.Identifier && !('originalKeywordKind' in node);
}

function propertyName(name: string | ts.PropertyName): ts.PropertyName {
  if (typeof name === 'string') {
    return isValidIdentifier(name) ? ts.createIdentifier(name) : ts.createStringLiteral(name);
  }
  return name;
}

export function createPropertySignature({
  modifiers,
  name,
  questionToken,
  type,
  initializer,
}: {
  modifiers?: Array<ts.Modifier>;
  name: ts.PropertyName | string;
  questionToken?: ts.QuestionToken | boolean;
  type?: ts.TypeNode;
  initializer?: ts.Expression;
}): ts.TypeElement {
  return ts.createPropertySignature(
    modifiers,
    propertyName(name),
    createQuestionToken(questionToken),
    type,
    initializer,
  );
}

export function createFunctionDeclaration(
  name: string | ts.Identifier | undefined,
  {
    decorators,
    modifiers,
    asteriskToken,
    typeParameters,
    type,
  }: {
    decorators?: ts.Decorator[];
    modifiers?: ts.Modifier[];
    asteriskToken?: ts.AsteriskToken;
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
  },
  parameters: ts.ParameterDeclaration[],
  body?: ts.Block,
): ts.FunctionDeclaration {
  return ts.createFunctionDeclaration(
    decorators,
    modifiers,
    asteriskToken,
    name,
    typeParameters,
    parameters,
    type,
    body,
  );
}

export function createMethodDeclaration(
  name: string | ts.Identifier,
  {
    decorators,
    modifiers,
    asteriskToken,
    questionToken,
    typeParameters,
    type,
  }: {
    decorators?: ts.Decorator[];
    modifiers?: ts.Modifier[];
    asteriskToken?: ts.AsteriskToken;
    questionToken?: ts.QuestionToken | boolean;
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
  },
  parameters: ts.ParameterDeclaration[],
  body?: ts.Block,
): ts.MethodDeclaration {
  return ts.createMethod(
    decorators,
    modifiers,
    asteriskToken,
    name,
    createQuestionToken(questionToken),
    typeParameters,
    parameters,
    type,
    body,
  );
}

export function block(...statements: ts.Statement[]): ts.Block {
  return ts.createBlock(statements, true);
}

function toExpression(ex: ts.Expression | string): ts.Expression {
  if (typeof ex === 'string') return ts.createIdentifier(ex);
  return ex;
}

export function createCall(
  expression: ts.Expression | string,
  {
    typeArgs,
    args,
  }: {
    typeArgs?: Array<ts.TypeNode>;
    args?: Array<ts.Expression>;
  } = {},
): ts.CallExpression {
  return ts.createCall(toExpression(expression), typeArgs, args);
}

export function createArrowFunction(
  parameters: ts.ParameterDeclaration[],
  body: ts.ConciseBody,
  {
    modifiers,
    typeParameters,
    type,
    equalsGreaterThanToken,
  }: {
    modifiers?: ts.Modifier[];
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
    equalsGreaterThanToken?: ts.EqualsGreaterThanToken;
  },
): ts.ArrowFunction {
  return ts.createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body);
}

export function createParameter(
  name: string | ts.BindingName,
  {
    decorators,
    modifiers,
    dotDotDotToken,
    questionToken,
    type,
    initializer,
  }: {
    decorators?: Array<ts.Decorator>;
    modifiers?: Array<ts.Modifier>;
    dotDotDotToken?: ts.DotDotDotToken;
    questionToken?: ts.QuestionToken | boolean;
    type?: ts.TypeNode;
    initializer?: ts.Expression;
  },
): ts.ParameterDeclaration {
  return ts.createParameter(
    decorators,
    modifiers,
    dotDotDotToken,
    name,
    createQuestionToken(questionToken),
    type,
    initializer,
  );
}

export function createImport(namespaceAlias: ts.Identifier, moduleSpecifier: ts.Expression): ts.ImportDeclaration {
  return ts.createImportDeclaration(
    [],
    [],
    ts.createImportClause(
      undefined,
      // ts.createImportSpecifier(ts.createIdentifier('OneType'), ts.createIdentifier('OtherType')),
      ts.createNamespaceImport(namespaceAlias),
      undefined,
    ),
    moduleSpecifier,
  );
}

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
});

export function printNode(node: ts.Node): string {
  const file = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
  return printer.printNode(ts.EmitHint.Unspecified, node, file);
}

export function printNodeArray(nodeArray: ts.NodeArray<ts.Node>): string {
  const file = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
  return printer.printList(ts.ListFormat.ClassMembers, nodeArray, file);
}

export function printNodes(nodes: ts.Node[]): string {
  const file = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
  return nodes.map(node => printer.printNode(ts.EmitHint.Unspecified, node, file)).join('\n');
}

export function printFile(sourceFile: ts.SourceFile): string {
  return printer.printFile(sourceFile);
}

export function parseFile(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
}

export function appendNodes<T extends ts.Node>(array: ts.NodeArray<T>, ...nodes: T[]): ts.NodeArray<T> {
  return ts.createNodeArray([...array, ...nodes]);
}

export function findNode<T extends ts.Node>(
  nodes: ts.NodeArray<ts.Node>,
  kind: T extends { kind: infer K } ? K : never,
  check?: (node: T) => boolean | undefined,
): T {
  const node = nodes.find(s => s.kind === kind && (!check || check(s as T))) as T;
  if (!node) throw new Error(`Node not found: ${kind}`);
  return node;
}
