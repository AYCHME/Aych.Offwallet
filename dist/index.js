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
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const glob_1 = __importDefault(require("glob"));
const loglevel_1 = __importDefault(require("loglevel"));
const logger = loglevel_1.default.getLogger('Main');
logger.setLevel(loglevel_1.default.levels.INFO);
const glob = util_1.promisify(glob_1.default);
class Packager {
    constructor() {
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
    async create({ pid, input, output, host = '', map = [], verbose = false }) {
        if (verbose) {
            logger.setLevel(loglevel_1.default.levels.TRACE);
        }
        logger.debug(chalk_1.default.blue(`CWD: ${process.cwd()}`));
        assert_1.default(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.');
        assert_1.default(input, 'Input directory must be a path.');
        assert_1.default(host || map, 'Host and map can not be both empty.');
        this._pid = pid;
        if (host) {
            this._map = [{
                    from: '.',
                    to: host
                }];
            logger.debug(chalk_1.default.blue(`Convert host to map: ${JSON.stringify(this._map)}`));
        }
        else if (map) {
            this._map = map;
        }
        logger.info(chalk_1.default.green(`Validating input path and output path...`));
        // Ensure input path is ok
        this._input = path.resolve(input);
        await fs_1.promises.access(this._input, fs_1.constants.X_OK | fs_1.constants.R_OK);
        logger.debug(chalk_1.default.blue(`Input directory: ${this._input}`));
        // Ensure output path is ok
        this._output = path.resolve(output);
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
            logger.debug(chalk_1.default.blue(`Output path is file: ${this._output}`));
            await this.archive(this._input, this._output);
        }
        // If output path is directory, create new archive in the directory with default file name
        else if (createDir || stat.isDirectory()) {
            logger.debug(chalk_1.default.blue(`Output path is directory: ${this._output}`));
            await fs_extra_1.default.ensureDir(this._output, { mode: 0o2775 });
            await fs_1.promises.access(this._output, fs_1.constants.X_OK | fs_1.constants.W_OK);
            this._output = path.join(this._output, 'archive.zip');
            await this.archive(this._input, this._output);
        }
        else {
            throw new Error('Output path must be either a file path or a directory path.');
        }
        logger.info(chalk_1.default.green(`Create offline package successfully!`));
    }
    async archive(inputPath, outputPath) {
        logger.info(chalk_1.default.green(`Start archiving input path ...`));
        const output = fs_1.createWriteStream(outputPath);
        const archive = archiver_1.default('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        output.on('close', function () {
            logger.info(chalk_1.default.green(`Archive done, total bytes: ${archive.pointer()}B`));
        });
        archive.on('warning', function (err) {
            logger.warn(`Archiver warning: ${err.message}`);
        });
        archive.on('error', function (err) {
            throw err;
        });
        archive.pipe(output);
        const map = {};
        await Promise.all(this._map.map(async (pair) => {
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
        }));
        logger.debug(chalk_1.default.blue(`Create map config: ${JSON.stringify(map, null, '  ')}`));
        archive.append(JSON.stringify({ map }, null, '  '), { name: path.join(this._pid, 'config.json') });
        archive.finalize();
    }
}
exports.packager = new Packager();
exports.default = exports.packager;
