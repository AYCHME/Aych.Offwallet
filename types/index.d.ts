export interface IMapPair {
    from: string;
    to: string;
}
export declare type IMap = IMapPair[];
declare class Packager {
    protected _pid: string;
    protected _map: IMap;
    protected _input: string;
    protected _output: string;
    get pid(): string;
    get map(): IMap;
    get input(): string;
    get output(): string;
    create({ pid, input, output, host, map, verbose }: {
        pid: string;
        input: string;
        output: string;
        host?: string;
        map?: IMap;
        verbose?: boolean;
    }): Promise<void>;
    protected archive(inputPath: any, outputPath: any): Promise<void>;
}
export declare const packager: Packager;
export default packager;
