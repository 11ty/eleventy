export default Compatibility;
declare class Compatibility {
    static NORMALIZE_PRERELEASE_REGEX: RegExp;
    static normalizeIdentifier(identifier: any): any;
    static getCompatibilityValue(compatibleRange: any): any;
    static satisfies(version: any, compatibleRange: any): any;
    constructor(compatibleRange: any);
    compatibleRange: any;
    isCompatible(): any;
    getErrorMessage(): string;
}
