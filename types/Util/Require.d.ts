/**
 *
 * @returns {string|undefined}
 */
declare function loadContents(path: any, options?: {}): string | undefined;
declare function dynamicImport(localPath: any, type: any): Promise<any>;
declare function dynamicImportRaw(localPath: any, type: any): Promise<any>;
declare function dynamicImportFromEleventyPackage(file: any): Promise<any>;
declare function dynamicImportRawFromEleventyPackage(file: any): Promise<any>;
export function normalizeFilePathInEleventyPackage(file: any): string;
export { loadContents as EleventyLoadContent, dynamicImport as EleventyImport, dynamicImportRaw as EleventyImportRaw, dynamicImportFromEleventyPackage as EleventyImportFromEleventy, dynamicImportRawFromEleventyPackage as EleventyImportRawFromEleventy };
