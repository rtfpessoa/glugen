import yargs from 'yargs';

export type Argv = {
  http: HTTPLibrary;
};

const defaults: Argv = {
  http: 'fetch',
};

type HTTPLibrary = 'fetch';

type ArgvChoices = {
  http: ReadonlyArray<HTTPLibrary>;
};

const choices: ArgvChoices = {
  http: ['fetch'],
};

export function setup(): Argv {
  const startYear = 2020;
  const currentYear = new Date().getFullYear();

  const copyrightYearText = startYear !== currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;

  return yargs
    .usage('Usage: glugen [flags] [options] [arguments]')
    .option('input', {
      alias: 'i',
      describe: 'Input specification file',
      nargs: 1,
      type: 'string',
    })
    .option('output', {
      alias: 'o',
      describe: 'Output directory',
      nargs: 1,
      type: 'string',
    })
    .option('http', {
      alias: 'h',
      describe: 'HTTP library to use',
      nargs: 1,
      choices: choices.http,
      default: defaults.http,
    })
    .example(
      'glugen -i openapi.yaml -o ./my-client',
      'Generate client into my-client directory from specification in openapi.yaml',
    )
    .help()
    .alias('help', 'h')
    .alias('help', '?')
    .version()
    .alias('version', 'v')
    .epilog(
      `© ${copyrightYearText} rtfpessoa
      For more information, check out https://glugen.rtfpessoa.xyz/
      For support, check out https://github.com/rtfpessoa/glugen`,
    )
    .strict(true)
    .recommendCommands().argv;
}

export function help(): void {
  yargs.showHelp('log');
}
