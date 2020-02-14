#!/usr/bin/env node
import path from 'path'
import yargs from 'yargs'
import chalk from 'chalk'

import fse from 'fs-extra'
import { packager } from './index'

;(async () => {
  const pkg = await fse.readJson(path.join(path.dirname(__dirname), 'package.json'))

  const argv = yargs
    .usage(chalk.green('Create ABCWallet compatiable offline package.') + '\n\nUsage: $0 [options]')
    .example('$0 -I 100 -H 127.0.0.1 -i test/public -o test/archive.zip', '')
    .example('$0 -c config.json', '')
    .help('help').alias('help', 'h')
    .version('version', pkg.version).alias('version', 'V')
    .options({
      pid: {
        alias: 'I',
        description: '<ID> Your dapp ID',
        requiresArg: true,
        required: true,
        number: true,
      },
      input: {
        alias: 'i',
        description: '<filename> Input directory, the directory contains files need to be packaged.',
        requiresArg: true,
        required: true,
        string: true,
      },
      output: {
        alias: 'o',
        description: '<filename> Output path, a directory to put the archive or a file to write the archive.',
        requiresArg: true,
        string: true,
      },
      host: {
        alias: 'H',
        description: '<host> Host name of dapp, if you only need simple map use this.',
        requiresArg: true,
        string: true,
      },
      config: {
        alias: 'c',
        description: '<config> Json config file path, will be load automatically',
        requiresArg: true,
        config: true,
      },
    })
    .argv;

  try {
    await packager.create({
      pid: argv.pid.toString(),
      input: argv.input,
      output: argv.output,
      host: argv.host,
      map: (argv.map as any),
    })
  }
  catch (err) {
    console.log('test')
    console.error(err)
    process.exit()
  }
})()
