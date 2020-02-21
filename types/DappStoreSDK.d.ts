import { Logger } from 'winston';
export declare class DappStoreSDK {
    baseUrl: string;
    protected _logger: Logger;
    protected _cookies: string;
    constructor({ baseUrl, logger }: {
        baseUrl: string;
        logger?: Logger;
    });
    login({ email, password }: {
        email: string;
        password: string;
    }): Promise<any>;
    uploadPackage({ pid, file }: {
        pid: string;
        file: string;
    }): Promise<any>;
    protected parseCookies(res: Response): void;
}
