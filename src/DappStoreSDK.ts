import { createReadStream } from 'fs'

import FormData from 'form-data'
import fetch from 'node-fetch'
import loglevel from 'loglevel'
import chalk from 'chalk'

const logger = loglevel.getLogger('Main')

export class DappStoreSDK {
  public baseUrl: string

  protected _cookies: string = ''

  constructor ({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  }

  public async login ({ email, password }: { email: string, password: string }) {
    logger.info(chalk.green(`Login ...`))

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

    logger.debug(chalk.blue(`Login successfully, the cookie is: ${this._cookies}`))
    return ret
  }

  public async uploadPackage ({ pid, file }: { pid: string, file: string }) {
    logger.info(chalk.green(`Uploading archive ...`))

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

    logger.debug(chalk.blue(`Upload successfully.`))
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
