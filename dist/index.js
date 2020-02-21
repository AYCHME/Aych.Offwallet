"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const util_1 = require("util");
const archiver_1 = __importDefault(require("archiver"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const glob_1 = __importDefault(require("glob"));
const logger_1 = require("./logger");
const DappStoreSDK_1 = require("./DappStoreSDK");
const glob = util_1.promisify(glob_1.default);
class Packager {
    constructor() {
        this._logger = logger_1.logger;
        this._input = '.';
        this._output = '.';
    }
    get pid() {
        return this._pid;
    }
    get map() {
        return this._map;
    }
    get input() {
        return this._input;
    }
    get output() {
        return this._output;
    }
    async pack({ cwd, pid, input, output, host = '', map = [], verbose = false, logger = null }) {
        if (logger) {
            this._logger = logger;
        }
        if (verbose) {
            this._logger.level = 'debug';
        }
        this._logger.debug(`CWD: ${process.cwd()}`);
        assert_1.default(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.');
        assert_1.default(input, 'Input must be a path to directory.');
        assert_1.default(host || map, 'Host and map can not be both empty.');
        this._pid = pid;
        if (host) {
            this._map = [{
                    from: '.',
                    to: host
                }];
            this._logger.debug(`Convert host to map: ${JSON.stringify(this._map)}`);
        }
        else if (map) {
            this._map = map;
        }
        this._logger.info(`Validating input path and output path...`);
        // Ensure input path is ok
        this._input = path.resolve(cwd, input);
        await fs_1.promises.access(this._input, fs_1.constants.X_OK | fs_1.constants.R_OK);
        this._logger.debug(`Input directory: ${this._input}`);
        // Ensure output path is ok
        this._output = path.resolve(cwd, output);
        let stat;
        let createFile = false;
        let createDir = false;
        try {
            stat = await fs_1.promises.stat(this._output);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
            else {
                if (this._output.endsWith(path.sep)) {
                    createDir = true;
                }
                else {
                    createFile = true;
                }
            }
        }
        // If output path is file, create new archive with the same path
        if (createFile || stat.isFile()) {
            this._logger.debug(`Output path is file: ${this._output}`);
            await this.archive(this._input, this._output);
        }
        // If output path is directory, create new archive in the directory with default file name
        else if (createDir || stat.isDirectory()) {
            this._logger.debug(`Output path is directory: ${this._output}`);
            await fs_extra_1.default.ensureDir(this._output, { mode: 0o2775 });
            await fs_1.promises.access(this._output, fs_1.constants.X_OK | fs_1.constants.W_OK);
            this._output = path.join(this._output, 'archive.zip');
            await this.archive(this._input, this._output);
        }
        else {
            throw new Error('Output path must be either a file path or a directory path.');
        }
        this._logger.info(`Create offline package successfully!`);
    }
    async deploy({ cwd, pid, input, verbose = false, logger = null }) {
        var _a;
        if (logger) {
            this._logger = logger;
        }
        if (verbose) {
            this._logger.level = 'debug';
        }
        this._logger.debug(`CWD: ${process.cwd()}`);
        assert_1.default(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.');
        assert_1.default(input, 'Input must be a path to archive file.');
        // Ensure input path is ok
        const inputPath = path.resolve(cwd, input);
        await fs_1.promises.access(inputPath, fs_1.constants.R_OK);
        this._logger.debug(chalk_1.default.blue(`Input file path: ${inputPath}`));
        const DappStoreBaseUrl = (_a = process.env.DS_BASE_URL, (_a !== null && _a !== void 0 ? _a : 'https://store.abcwallet.com/api/open'));
        const sdk = new DappStoreSDK_1.DappStoreSDK({ baseUrl: DappStoreBaseUrl });
        let email = process.env.DS_EMAIL;
        if (!email) {
            const res = await prompts_1.default({
                type: 'text',
                name: 'email',
                message: `Email of your ${chalk_1.default.red('store.abcwallet.com')} account: `,
            });
            email = res.email;
        }
        let password = process.env.DS_PASSWORD;
        if (!password) {
            const res = await prompts_1.default({
                type: 'password',
                name: 'password',
                message: `Password of your ${chalk_1.default.red('store.abcwallet.com')} account: `,
            });
            password = res.password;
        }
        assert_1.default(email, 'You must set email of ABCWallet Dapp Store account with environment var [DS_EMAIL].');
        assert_1.default(password, 'You must set password of ABCWallet Dapp Store account with environment var [DS_PASSWORD].');
        await sdk.login({ email, password });
        await sdk.uploadPackage({ pid, file: inputPath });
        this._logger.info('Deployment complete.');
    }
    archive(inputPath, outputPath) {
        return new Promise(async (resolve, reject) => {
            this._logger.info(`Start archiving input path ...`);
            const output = fs_1.createWriteStream(outputPath);
            const archive = archiver_1.default('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });
            output.on('close', () => {
                this._logger.info(`Archive done, total bytes: ${archive.pointer()}B`);
                resolve();
            });
            archive.on('warning', (err) => {
                this._logger.warn(`Archiver warning: ${err.message}`);
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            const map = {};
            this._map.map(async (pair) => {
                const files = await glob(path.join(inputPath, pair.from, '**/*.*(html|js|css|png|jpg)'));
                files.forEach(filePath => {
                    let mappedPath = filePath.replace(inputPath + path.sep, '');
                    mappedPath = path.join(pair.to, mappedPath);
                    if (mappedPath.match(/index\.html$/)) {
                        // /path/home/ => /path/home/index.html
                        const fromPath1 = mappedPath.replace(/index\.html$/, '');
                        map[fromPath1] = mappedPath;
                        // /path/home => /path/home/index.html
                        const fromPath2 = mappedPath.replace(/\/index\.html$/, '');
                        map[fromPath2] = mappedPath;
                    }
                    if (mappedPath.match(/\.html$/)) {
                        // /path/home/ => /path/home.html
                        const fromPath1 = mappedPath.replace(/\.html$/, '');
                        map[fromPath1] = mappedPath;
                        // /path/home => /path/home.html
                        const fromPath2 = mappedPath.replace(/\/\.html$/, '');
                        map[fromPath2] = mappedPath;
                    }
                    map[mappedPath] = mappedPath;
                });
                archive.directory(path.join(inputPath, pair.from), path.join(this._pid, pair.to));
            });
            this._logger.debug(`Create map config: ${JSON.stringify(map, null, '  ')}`);
            archive.append(JSON.stringify({ map }, null, '  '), { name: path.join(this._pid, 'config.json') });
            archive.finalize();
        });
    }
}
exports.packager = new Packager();
exports.default = exports.packager;
