// Source: https://github.com/cellular/oazapfts/blob/master/src/tscodegen.ts

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
