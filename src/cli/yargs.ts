import yargs from 'yargs';

// type HTTPLibrary = 'fetch';

export type Argv = {
  input: string;
  output: string;
  // httpLibrary: HTTPLibrary;
};

// export type ArgvDefaults = {
//   httpLibrary: HTTPLibrary;
// };

// const defaults: ArgvDefaults = {
//   httpLibrary: 'fetch',
// };

// type ArgvChoices = {
//   httpLibrary: ReadonlyArray<HTTPLibrary>;
// };

// const choices: ArgvChoices = {
//   httpLibrary: ['fetch'],
// };

export function setup(): Argv {
  const startYear = 2020;
  const currentYear = new Date().getFullYear();

  const copyrightYearText = startYear !== currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;

  return (
    yargs
      .usage('Usage: glugen [flags] [options] [arguments]')
      .option('input', {
        alias: 'i',
        describe: 'Input specification file',
        nargs: 1,
        type: 'string',
        demand: true,
      })
      .option('output', {
        alias: 'o',
        describe: 'Output directory',
        nargs: 1,
        type: 'string',
        demand: true,
      })
      // .option('httpLibrary', {
      //   alias: 'h',
      //   describe: 'HTTP library to use',
      //   nargs: 1,
      //   choices: choices.httpLibrary,
      //   default: defaults.httpLibrary,
      // })
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
      .showHelpOnFail(true)
      .recommendCommands().argv
  );
}

export function help(): void {
  yargs.showHelp('log');
}
