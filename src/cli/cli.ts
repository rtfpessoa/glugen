import * as yargs from './yargs';
import { render } from '../openapi/render';

export async function main(): Promise<void> {
  const { input, output } = yargs.setup();

  console.log('CLI: ', input, output);

  await render(input, output);
}
