import { Logger } from 'winston';
export interface IMapPair {
    from: string;
    to: string;
}
export declare type IMap = IMapPair[];
declare class Packager {
    protected _logger: Logger;
    protected _pid: string;
    protected _map: IMap;
    protected _input: string;
    protected _output: string;
    get pid(): string;
    get map(): IMap;
    get input(): string;
    get output(): string;
    pack({ cwd, pid, input, output, host, map, verbose, logger }: {
        cwd: string;
        pid: string;
        input: string;
        output: string;
        host?: string;
        map?: IMap;
        verbose?: boolean;
        logger?: Logger;
    }): Promise<void>;
    deploy({ cwd, pid, input, verbose, logger }: {
        cwd: string;
        pid: string;
        input: string;
        verbose?: boolean;
        logger?: Logger;
    }): Promise<void>;
    protected archive(inputPath: any, outputPath: any): Promise<unknown>;
}
export declare const packager: Packager;
export default packager;
