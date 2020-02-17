export declare class DappStoreSDK {
    baseUrl: string;
    protected _cookies: string;
    constructor({ baseUrl }: {
        baseUrl: string;
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
