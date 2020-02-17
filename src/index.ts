import assert from 'assert'
import { createWriteStream, promises as fs, constants as fsConst } from 'fs'
import * as path from 'path'
import { promisify } from 'util'

import archiver from 'archiver'
import chalk from 'chalk'
import fse from 'fs-extra'
import { default as globModule } from 'glob'
import loglevel from 'loglevel'

import { DappStoreSDK } from './DappStoreSDK'

const logger = loglevel.getLogger('Main')
logger.setLevel(loglevel.levels.INFO)

const glob = promisify(globModule)

export interface IMapPair {
  from: string,
  to: string,
}

export type IMap = IMapPair[]

class Packager {

  protected _pid: string
  protected _map: IMap
  protected _input = '.'
  protected _output = '.'

  get pid (): string {
    return this._pid
  }

  get map (): IMap {
    return this._map
  }

  get input (): string {
    return this._input
  }

  get output (): string {
    return this._output
  }

  public async pack (
    { cwd, pid, input, output, host = '', map = [], verbose = false }:
    { cwd: string, pid: string, input: string, output: string, host?: string, map?: IMap, verbose?: boolean }
  ) {
    if (verbose) {
      logger.setLevel(loglevel.levels.TRACE)
    }
    logger.debug(chalk.blue(`CWD: ${process.cwd()}`))

    assert(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.')
    assert(input, 'Input must be a path to directory.')
    assert(host || map, 'Host and map can not be both empty.')

    this._pid = pid

    if (host) {
      this._map = [{
        from: '.',
        to: host
      }]
      logger.debug(chalk.blue(`Convert host to map: ${JSON.stringify(this._map)}`))
    }
    else if (map) {
      this._map = map
    }

    logger.info(chalk.green(`Validating input path and output path...`))

    // Ensure input path is ok
    this._input = path.resolve(cwd, input)
    await fs.access(this._input, fsConst.X_OK | fsConst.R_OK)


    logger.debug(chalk.blue(`Input directory: ${this._input}`))

    // Ensure output path is ok
    this._output = path.resolve(cwd, output)
    let stat
    let createFile = false
    let createDir = false
    try {
      stat = await fs.stat(this._output)
    }
    catch (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }
      else {
        if (this._output.endsWith(path.sep)) {
          createDir = true
        }
        else {
          createFile = true
        }
      }
    }

    // If output path is file, create new archive with the same path
    if (createFile || stat.isFile()) {
      logger.debug(chalk.blue(`Output path is file: ${this._output}`))
      await this.archive(this._input, this._output)
    }
    // If output path is directory, create new archive in the directory with default file name
    else if (createDir || stat.isDirectory()) {
      logger.debug(chalk.blue(`Output path is directory: ${this._output}`))

      await fse.ensureDir(this._output, { mode: 0o2775 })
      await fs.access(this._output, fsConst.X_OK | fsConst.W_OK)

      this._output = path.join(this._output, 'archive.zip')
      await this.archive(this._input, this._output)
    }
    else {
      throw new Error('Output path must be either a file path or a directory path.')
    }

    logger.info(chalk.green(`Create offline package successfully!`))
  }

  public async deploy (
    { cwd, pid, input, verbose = false }:
    { cwd: string, pid: string, input: string, verbose?: boolean }
  ) {
    if (verbose) {
      logger.setLevel(loglevel.levels.TRACE)
    }
    logger.debug(chalk.blue(`CWD: ${process.cwd()}`))

    assert(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.')
    assert(input, 'Input must be a path to archive file.')

    // Ensure input path is ok
    const inputPath = path.resolve(cwd, input)
    await fs.access(inputPath, fsConst.R_OK)

    logger.debug(chalk.blue(`Input file path: ${inputPath}`))

    const DappStoreBaseUrl = process.env.DS_BASE_URL ?? 'https://store.abcwallet.com/api/open'
    const sdk = new DappStoreSDK({ baseUrl: DappStoreBaseUrl })

    const email = process.env.DS_EMAIL
    const password = process.env.DS_PASSWORD
    assert(email, 'You must set email of ABCWallet Dapp Store account with environment var [DS_EMAIL].')
    assert(password, 'You must set password of ABCWallet Dapp Store account with environment var [DS_PASSWORD].')

    await sdk.login({ email, password })
    await sdk.uploadPackage({ pid, file: inputPath })

    logger.info(chalk.green('Deployment complete.'))
  }

  protected async archive (inputPath, outputPath) {
    logger.info(chalk.green(`Start archiving input path ...`))

    const output = createWriteStream(outputPath)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    output.on('close', function() {
      logger.info(chalk.green(`Archive done, total bytes: ${archive.pointer()}B`))
    })

    archive.on('warning', function(err) {
      logger.warn(`Archiver warning: ${err.message}`)
    })

    archive.on('error', function(err) {
      throw err
    })

    archive.pipe(output)

    const map = {}
    await Promise.all(this._map.map(async (pair): Promise<void> => {
      const files = await glob(path.join(inputPath, pair.from, '**/*.*(html|js|css|png|jpg)'))
      files.forEach(filePath => {
        let mappedPath = filePath.replace(inputPath + path.sep, '')
        mappedPath = path.join(pair.to, mappedPath)

        if (mappedPath.match(/index\.html$/)) {
          // /path/home/ => /path/home/index.html
          const fromPath1 = mappedPath.replace(/index\.html$/, '')
          map[fromPath1] = mappedPath
          // /path/home => /path/home/index.html
          const fromPath2 = mappedPath.replace(/\/index\.html$/, '')
          map[fromPath2] = mappedPath
        }
        if (mappedPath.match(/\.html$/)) {
          // /path/home/ => /path/home.html
          const fromPath1 = mappedPath.replace(/\.html$/, '')
          map[fromPath1] = mappedPath
          // /path/home => /path/home.html
          const fromPath2 = mappedPath.replace(/\/\.html$/, '')
          map[fromPath2] = mappedPath
        }

        map[mappedPath] = mappedPath
      })

      archive.directory(path.join(inputPath, pair.from), path.join(this._pid, pair.to))
    }))

    logger.debug(chalk.blue(`Create map config: ${JSON.stringify(map, null, '  ')}`))

    archive.append(JSON.stringify({ map }, null, '  '), { name: path.join(this._pid, 'config.json') })
    archive.finalize()
  }
}

export const packager = new Packager()

export default packager
