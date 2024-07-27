export default ProjectDirectories;
declare class ProjectDirectories {
    static defaults: {
        input: string;
        data: string;
        includes: string;
        layouts: string;
        output: string;
    };
    static normalizePath(fileOrDir: any): any;
    static normalizeDirectory(dir: any): any;
    static addTrailingSlash(path: any): any;
    inputFile: undefined;
    inputGlob: undefined;
    normalizeDirectoryPathRelativeToInputDirectory(filePath: any): any;
    freeze(): void;
    setViaConfigObject(configDirs?: {}): void;
    updateInputDependencies(): void;
    setInput(dirOrFile: any, inputDir?: undefined): void;
    setIncludes(dir: any): void;
    setLayouts(dir: any): void;
    setData(dir: any): void;
    setOutput(dir: any): void;
    get input(): any;
    get data(): any;
    get includes(): any;
    get layouts(): any;
    get output(): any;
    isTemplateFile(filePath: any): any;
    getInputPath(filePathRelativeToInputDir: any): any;
    getInputPathRelativeToInputDirectory(filePathRelativeToInputDir: any): any;
    getLayoutPath(filePathRelativeToLayoutDir: any): any;
    getLayoutPathRelativeToInputDirectory(filePathRelativeToLayoutDir: any): any;
    getProjectPath(filePath: any): any;
    getUserspaceInstance(): {
        readonly input: any;
        readonly inputFile: undefined;
        readonly inputGlob: undefined;
        readonly data: any;
        readonly includes: any;
        readonly layouts: any;
        readonly output: any;
    };
    toString(): {
        input: any;
        inputFile: undefined;
        inputGlob: undefined;
        data: any;
        includes: any;
        layouts: any;
        output: any;
    };
    #private;
}
