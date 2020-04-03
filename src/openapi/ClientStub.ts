/**
 * DO NOT MODIFY - This file has been generated using glugen.
 * See https://www.npmjs.com/package/glugen
 */

import { URL } from 'url';
// import fetch from 'isomorphic-unfetch';
import fetch from 'node-fetch';
import { Schema, Validator } from 'jsonschema';

type Parameter = number | boolean | string | undefined;
type ResponseSchemas = { [statusCode: string]: Schema };

export class Client {
  readonly baseUrl: string = '/';
  readonly validator: Validator = new Validator();

  constructor(baseUrl?: string) {
    if (baseUrl !== undefined) this.baseUrl = baseUrl;
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
      return paramValue !== undefined ? url.replace(`{${paramKey}}`, paramValue.toString()) : url;
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
          : {
              valid: false,
              errors: { message: `Response status ${response.status} does not have a schema defined.` },
            };
      if (validationResponse.valid) {
        return {
          kind: response.status,
          value: responseJson,
        };
      }

      const errorBody = await response.body.read().toString('utf-8');
      throw new Error(`Failed to validate schema of response with status ${response.status} and body:\n${errorBody}`);
    });
  }
}
