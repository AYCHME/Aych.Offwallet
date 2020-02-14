# ABCWallet Offline Packager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A packager for easily creating ABCWallet compatiable offline package.


## Installation

### NPM

`npm install abcwallet-offline-packager`

### Yarn

`Yarn add abcwallet-offline-packager`


## Usage

### Requirements

Node 10+

### Examples

`offline-packager -I 100 -H 127.0.0.1 -i test/public -o test/archive.zip` Only use commandline options.

`offline-packager -c config.json` Use a JSON config file to pass options, useful for complicated map relation.


## Development

### Code Style

We use a little tweaked version of standardjs: https://github.com/BlockABC/eslint-config-blockabc


## License

[MIT](LICENSE)
