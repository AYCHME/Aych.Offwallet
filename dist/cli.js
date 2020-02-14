#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const index_1 = require("./index");
(async () => {
    const pkg = await fs_extra_1.default.readJson(path_1.default.join(path_1.default.dirname(__dirname), 'package.json'));
    const argv = yargs_1.default
        .usage(chalk_1.default.green('Create ABCWallet compatiable offline package.') + '\n\nUsage: $0 [options]')
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
        await index_1.packager.create({
            pid: argv.pid.toString(),
            input: argv.input,
            output: argv.output,
            host: argv.host,
            map: argv.map,
        });
    }
    catch (err) {
        console.log('test');
        console.error(err);
        process.exit();
    }
})();
