export default ProjectTemplateFormats;
declare class ProjectTemplateFormats {
    static union(...sets: any[]): Set<any>;
    isWildcard(): any;
    setViaCommandLine(formats: any): void;
    setViaConfig(formats: any): void;
    addViaConfig(formats: any): void;
    getAllTemplateFormats(): any[];
    getTemplateFormats(): any[];
    #private;
}
