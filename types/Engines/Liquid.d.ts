export default Liquid;
declare class Liquid extends TemplateEngine {
    static argumentLexerOptions: {
        number: RegExp;
        doubleQuoteString: RegExp;
        singleQuoteString: RegExp;
        keyword: RegExp;
        "ignore:whitespace": RegExp;
    };
    static wrapFilter(name: any, fn: any): (this: any, ...args: any[]) => any;
    static normalizeScope(context: any): {
        ctx: any;
    };
    static parseArguments(lexer: any, str: any): any[];
    static parseArgumentsBuiltin(args: any): (import("liquidjs/dist/tokens/range-token.js").RangeToken | import("liquidjs/dist/tokens/literal-token.js").LiteralToken | import("liquidjs/dist/tokens/quoted-token.js").QuotedToken | import("liquidjs/dist/tokens/property-access-token.js").PropertyAccessToken | import("liquidjs/dist/tokens/number-token.js").NumberToken)[];
    liquidOptions: any;
    argLexer: any;
    setLibrary(override: any): void;
    liquidLib: any;
    getLiquidOptions(): any;
    addCustomTags(tags: any): void;
    addFilters(filters: any): void;
    addFilter(name: any, filter: any): void;
    addTag(name: any, tagFn: any): void;
    addAllShortcodes(shortcodes: any): void;
    addAllPairedShortcodes(shortcodes: any): void;
    addShortcode(shortcodeName: any, shortcodeFn: any): void;
    addPairedShortcode(shortcodeName: any, shortcodeFn: any): void;
    parseForSymbols(str: any): any[];
    compile(str: any, inputPath: any): Promise<(data: any) => Promise<any>>;
}
import TemplateEngine from "./TemplateEngine.js";
