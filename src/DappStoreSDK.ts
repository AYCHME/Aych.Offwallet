import { createReadStream } from 'fs'

import chalk from 'chalk'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { Logger } from 'winston'

import { logger as innerLogger } from './logger'

export class DappStoreSDK {
  public baseUrl: string

  protected _logger = innerLogger
  protected _cookies: string = ''

  constructor ({ baseUrl, logger = null }: { baseUrl: string, logger?: Logger }) {
    if (logger) {
      this._logger = logger
    }

    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  }

  public async login ({ email, password }: { email: string, password: string }) {
    this._logger.info(chalk.green(`Login ...`))

    const res: Response = await fetch(this.baseUrl + 'user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const ret = await res.json()
    if (ret.code && ret.code > 0) {
      throw new Error(`API response error: ${ret.code} ${ret.message}`)
    }

    this.parseCookies(res)

    this._logger.debug(chalk.blue(`Login successfully, the cookie is: ${this._cookies}`))
    return ret
  }

  public async uploadPackage ({ pid, file }: { pid: string, file: string }) {
    this._logger.info(chalk.green(`Uploading archive ...`))

    const form = new FormData()
    form.append('zip', createReadStream(file));

    const res = await fetch(`${this.baseUrl}dapp/${pid}/packages`, {
      method: 'POST',
      headers: {
        'cookie': this._cookies,
      },
      body: form
    })

    const ret = await res.json()
    if (ret.code && ret.code > 0) {
      throw new Error(`API response error: ${ret.code} ${ret.message}`)
    }

    this._logger.debug(chalk.blue(`Upload successfully.`))
    return ret
  }

  protected parseCookies(res: Response) {
    // @ts-ignore 这里的 raw 方法是 fetch V2 接口
    this._cookies = res.headers.raw()['set-cookie'].map((entry) => {
      const parts = entry.split(';')
      return parts[0]
    }).join(';')
  }
}
