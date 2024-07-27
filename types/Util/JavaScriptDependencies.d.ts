export default JavaScriptDependencies;
declare class JavaScriptDependencies {
    static getErrorMessage(file: any, type: any): string;
    static getDependencies(inputFiles: any, isProjectUsingEsm: any): Promise<any[]>;
}
