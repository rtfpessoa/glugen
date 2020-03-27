declare module 'swagger2openapi' {
  interface Result {
    openapi: string;
  }
  interface Options {
    anchors: boolean;
  }
  export function convertFile(filename: string, options: Options): Result;
}
