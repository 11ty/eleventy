declare const DATA_KEYS: string[];
export function augmentFunction(fn: any, options?: {}): (this: any, ...args: any[]) => any;
export function augmentObject(targetObject: any, options?: {}): any;
export { DATA_KEYS as augmentKeys };
