import assert from 'assert'
import { createWriteStream, promises as fs, constants as fsConst } from 'fs'
import * as path from 'path'
import { promisify } from 'util'

import archiver from 'archiver'
import prompts from 'prompts'
import chalk from 'chalk'
import fse from 'fs-extra'
import { default as globModule } from 'glob'
import { Logger } from 'winston'

import { logger as innerLogger } from './logger'
import { DappStoreSDK } from './DappStoreSDK'

const glob = promisify(globModule)

export interface IMapPair {
  from: string,
  to: string,
}

export type IMap = IMapPair[]

class Packager {
  protected _logger = innerLogger
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
    {
      cwd,
      pid,
      input,
      output,
      host = '',
      map = [],
      verbose = false,
      logger = null
    }:
    {
      cwd: string,
      pid: string,
      input: string,
      output: string,
      host?: string,
      map?: IMap,
      verbose?: boolean,
      logger?: Logger
    }
  ) {
    if (logger) {
      this._logger = logger
    }
    if (verbose) {
      this._logger.level = 'debug'
    }

    this._logger.debug(`CWD: ${process.cwd()}`)

    assert(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.')
    assert(input, 'Input must be a path to directory.')
    assert(host || map, 'Host and map can not be both empty.')

    this._pid = pid

    if (host) {
      this._map = [{
        from: '.',
        to: host
      }]
      this._logger.debug(`Convert host to map: ${JSON.stringify(this._map)}`)
    }
    else if (map) {
      this._map = map
    }

    this._logger.info(`Validating input path and output path...`)

    // Ensure input path is ok
    this._input = path.resolve(cwd, input)
    await fs.access(this._input, fsConst.X_OK | fsConst.R_OK)


    this._logger.debug(`Input directory: ${this._input}`)

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
      this._logger.debug(`Output path is file: ${this._output}`)
      await this.archive(this._input, this._output)
    }
    // If output path is directory, create new archive in the directory with default file name
    else if (createDir || stat.isDirectory()) {
      this._logger.debug(`Output path is directory: ${this._output}`)

      await fse.ensureDir(this._output, { mode: 0o2775 })
      await fs.access(this._output, fsConst.X_OK | fsConst.W_OK)

      this._output = path.join(this._output, 'archive.zip')
      await this.archive(this._input, this._output)
    }
    else {
      throw new Error('Output path must be either a file path or a directory path.')
    }

    this._logger.info(`Create offline package successfully!`)
  }

  public async deploy (
    { cwd, pid, input, verbose = false, logger = null }:
    { cwd: string, pid: string, input: string, verbose?: boolean, logger?: Logger }
  ) {
    if (logger) {
      this._logger = logger
    }
    if (verbose) {
      this._logger.level = 'debug'
    }
    this._logger.debug(`CWD: ${process.cwd()}`)

    assert(pid && Number.parseInt(pid) > 0, 'Pid must be an integer bigger than 0.')
    assert(input, 'Input must be a path to archive file.')

    // Ensure input path is ok
    const inputPath = path.resolve(cwd, input)
    await fs.access(inputPath, fsConst.R_OK)

    this._logger.debug(chalk.blue(`Input file path: ${inputPath}`))

    const DappStoreBaseUrl = process.env.DS_BASE_URL ?? 'https://store.abcwallet.com/api/open'
    const sdk = new DappStoreSDK({ baseUrl: DappStoreBaseUrl })


    let email = process.env.DS_EMAIL
    if (!email) {
      const res = await prompts({
        type: 'text',
        name: 'email',
        message: `Email of your ${chalk.red('store.abcwallet.com')} account: `,
      })
      email = res.email
    }
    let password = process.env.DS_PASSWORD
    if (!password) {
      const res = await prompts({
        type: 'password',
        name: 'password',
        message: `Password of your ${chalk.red('store.abcwallet.com')} account: `,
      })
      password = res.password
    }
    assert(email, 'You must set email of ABCWallet Dapp Store account with environment var [DS_EMAIL].')
    assert(password, 'You must set password of ABCWallet Dapp Store account with environment var [DS_PASSWORD].')

    await sdk.login({ email, password })
    await sdk.uploadPackage({ pid, file: inputPath })

    this._logger.info('Deployment complete.')
  }

  protected archive (inputPath, outputPath) {
    return new Promise(async (resolve, reject) => {
      this._logger.info(`Start archiving input path ...`)

      const output = createWriteStream(outputPath)
      const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      })

      output.on('close', () => {
        this._logger.info(`Archive done, total bytes: ${archive.pointer()}B`)
        resolve()
      })

      archive.on('warning', (err) => {
        this._logger.warn(`Archiver warning: ${err.message}`)
      })

      archive.on('error', (err) => {
        reject(err)
      })

      archive.pipe(output)

      const map = {}
      this._map.map(async (pair): Promise<void> => {
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
      })

      this._logger.debug(`Create map config: ${JSON.stringify(map, null, '  ')}`)
      archive.append(JSON.stringify({ map }, null, '  '), { name: path.join(this._pid, 'config.json') })

      archive.finalize()
    })
  }
}

export const packager = new Packager()

export default packager
