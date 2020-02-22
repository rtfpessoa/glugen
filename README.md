# glugen

[![Codacy Quality Badge](https://api.codacy.com/project/badge/Grade/f9c19d8a04ff43d5b42102ca2c628736)](https://www.codacy.com/manual/rtfpessoa/glugen?utm_source=github.com&utm_medium=referral&utm_content=rtfpessoa/glugen&utm_campaign=Badge_Grade)
[![Codacy Coverage Badge](https://api.codacy.com/project/badge/Coverage/f9c19d8a04ff43d5b42102ca2c628736)](https://www.codacy.com/manual/rtfpessoa/glugen?utm_source=github.com&utm_medium=referral&utm_content=rtfpessoa/glugen&utm_campaign=Badge_Coverage)
[![CircleCI](https://circleci.com/gh/rtfpessoa/glugen.svg?style=svg)](https://app.circleci.com/github/rtfpessoa/glugen/pipelines)

[![npm](https://img.shields.io/npm/v/glugen.svg)](https://www.npmjs.com/package/glugen)
[![Dependency Status](https://david-dm.org/rtfpessoa/glugen.svg)](https://david-dm.org/rtfpessoa/glugen)
[![devDependency Status](https://david-dm.org/rtfpessoa/glugen/dev-status.svg)](https://david-dm.org/rtfpessoa/glugen#info=devDependencies)

[![node](https://img.shields.io/node/v/glugen.svg)]() [![npm](https://img.shields.io/npm/l/glugen.svg)]()
[![npm](https://img.shields.io/npm/dm/glugen.svg)](https://www.npmjs.com/package/glugen)
[![Gitter](https://badges.gitter.im/rtfpessoa/glugen.svg)](https://gitter.im/rtfpessoa/glugen?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

glugen generates http clients for an OpenAPI v3 specification.

> :warning: **This is still in under early development**: Be very careful here!

[![NPM](https://nodei.co/npm/glugen.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/glugen/)

## Table of Contents

<!-- toc -->

- [Features](#features)
- [Distributions](#distributions)
- [Dependencies](#dependencies)
  - [CLI](#cli)
  - [Generated Code](#generated-code)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Contribute](#contribute)
- [Contributors](#contributors)
- [License](#license)

<!-- tocstop -->

## Features

<!-- TODO -->

## Distributions

- [Node Library](https://www.npmjs.org/package/glugen)
- [NPM CLI](https://www.npmjs.org/package/glugen)

## Dependencies

### CLI

- Check [npmjs.org](https://www.npmjs.com/package/glugen?activeTab=dependencies)

### Generated Code

- [url](https://www.npmjs.com/package/url)
- [node-fetch](https://www.npmjs.com/package/node-fetch)
- [jsonschema](https://www.npmjs.com/package/jsonschema)

## Usage

```sh
glugen --input ./api.yaml --output ./api-generated.ts
```

## Troubleshooting

<!-- TODO -->

## Contribute

This is a developer friendly project, all the contributions are welcome. To contribute just send a pull request with
your changes following the guidelines described in [CONTRIBUTING.md](./CONTRIBUTING.md). I will try to review them as
soon as possible.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://rtfpessoa.xyz"><img src="https://avatars0.githubusercontent.com/u/902384?v=4" width="100px;" alt=""/><br /><sub><b>Rodrigo Fernandes</b></sub></a><br /><a href="https://github.com/rtfpessoa/glugen/commits?author=rtfpessoa" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.
Contributions of any kind welcome!

## License

Copyright 2020-present Rodrigo Fernandes. Released under the terms of the MIT license.
