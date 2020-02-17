#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
function getCWD(argv) {
    if (!argv.config) {
        return process.cwd();
    }
    return path_1.default.dirname(path_1.default.resolve(argv.config));
}
yargs_1.default
    .usage(chalk_1.default.green('ABCWallet Offline Packager') + '\n\nUsage: $0 <command> [args]')
    .command('pack [options]', 'Pack files into an offline package.', async (yargs) => {
    const argv = yargs
        .usage(chalk_1.default.green('Pack files into an offline package.') + '\n\nUsage: $0 pack [options]')
        .example('$0 pack -I 100 -H 127.0.0.1 -i test/public -o test/archive.zip', '')
        .example('$0 pack -c config.json', '')
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
        verbose: {
            alias: 'v',
            description: '<verbose> Run with verbose logging.',
            boolean: true,
        },
    })
        .argv;
    try {
        await index_1.packager.pack({
            cwd: getCWD(argv),
            pid: argv.pid.toString(),
            input: argv.input,
            output: argv.output,
            host: argv.host,
            map: argv.map,
            verbose: argv.verbose,
        });
    }
    catch (err) {
        console.error(err);
        process.exit();
    }
})
    .command('deploy [options]', 'Upload offline package to Dapp Store.', async (yargs) => {
    const argv = yargs
        .usage(chalk_1.default.green('Upload offline package to Dapp Store.') + '\n\nUsage: $0 deploy [options]')
        .example('$0 deploy -i test/archive.zip', '')
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
            description: '<filename> Input file, the archive created by [pack].',
            requiresArg: true,
            required: true,
            string: true,
        },
        config: {
            alias: 'c',
            description: '<config> Json config file path, will be load automatically',
            requiresArg: true,
            config: true,
        },
        verbose: {
            alias: 'v',
            description: '<verbose> Run with verbose logging.',
            boolean: true,
        },
    })
        .argv;
    try {
        await index_1.packager.deploy({
            cwd: getCWD(argv),
            pid: argv.pid.toString(),
            // 如果是从配置获取离线包，那就要从输出位置获取
            input: argv.config ? argv.output : argv.input,
            verbose: argv.verbose,
        });
    }
    catch (err) {
        console.error(err);
        process.exit();
    }
})
    .demandCommand()
    .version().alias('version', 'V')
    .help('help').alias('help', 'h')
    .argv;
