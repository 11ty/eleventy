export default ExistsCache;
declare class ExistsCache {
    _cache: Map<any, any>;
    lookupCount: number;
    setDirectoryCheck(check: any): void;
    cacheDirectories: boolean | undefined;
    get size(): number;
    parentsDoNotExist(path: any): boolean;
    has(path: any): boolean;
    exists(path: any): any;
    markExistsWithParentDirectories(path: any, exists?: boolean): void;
    markExists(path: any, exists?: boolean, alreadyNormalized?: boolean): void;
}
