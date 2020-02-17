# ABCWallet Packager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A packager for easily creating ABCWallet compatiable offline package.


## Installation

### NPM

`npm install @abcwallet/packager`

### Yarn

`Yarn add @abcwallet/packager`


## Usage

### Requirements

Node 10+

### Examples

#### Pack files into an offline package.

First, you need pack resources of your dapp, which should be packed is up to you:

`abcp pack -I 100 -H 127.0.0.1 -i test/public -o test/archive.zip`

Also, you may put every options in a JSON config file for reuse purpose:

`abcp pack -c config.json`

The JSON config file support complicated map relation.

#### Upload offline package to Dapp Store.

Then, you may deploy your package with the web page of Dapp Store or the deploy command:

`abcp deploy -I 287 -i test/create_by_config.zip`

Here you may also reuse the same JSON config file which pack command used:

`abcp deploy -c config.json`

this will upload offline package to Dapp Store automatically, it will be helpful if you use some sort of ci progress.


## Development

### Code Style

We use a little tweaked version of standardjs: https://github.com/BlockABC/eslint-config-blockabc


## License

[MIT](LICENSE)
