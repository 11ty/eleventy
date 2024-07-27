export default ConsoleLogger;
/**
 * Logger implementation that logs to STDOUT.
 */
export type LogType = "error" | "log" | "warn" | "info";
/**
 * Logger implementation that logs to STDOUT.
 * @typedef {'error'|'log'|'warn'|'info'} LogType
 */
declare class ConsoleLogger {
    outputStream: Readable;
    set isVerbose(verbose: boolean);
    get isVerbose(): boolean;
    set isChalkEnabled(enabled: boolean);
    get isChalkEnabled(): boolean;
    overrideLogger(logger: any): void;
    get logger(): any;
    /** @param {string} msg */
    log(msg: string): void;
    /**
     * @typedef LogOptions
     * @property {string} message
     * @property {string=} prefix
     * @property {LogType=} type
     * @property {string=} color
     * @property {boolean=} force
     * @param {LogOptions} options
    */
    logWithOptions({ message, type, prefix, color, force }: {
        message: string;
        prefix?: string | undefined;
        type?: LogType | undefined;
        color?: string | undefined;
        force?: boolean | undefined;
    }): void;
    /** @param {string} msg */
    forceLog(msg: string): void;
    /** @param {string} msg */
    info(msg: string): void;
    /** @param {string} msg */
    warn(msg: string): void;
    /** @param {string} msg */
    error(msg: string): void;
    /** @param {string} msg */
    toStream(msg: string): void;
    closeStream(): Readable;
    /**
     * Formats the message to log.
     *
     * @param {string} message - The raw message to log.
     * @param {LogType} [type='log'] - The error level to log.
     * @param {string|undefined} [chalkColor=undefined] - Color name or falsy to disable
     * @param {boolean} [forceToConsole=false] - Enforce a log on console instead of specified target.
     */
    message(message: string, type?: LogType | undefined, chalkColor?: string | undefined, forceToConsole?: boolean | undefined, prefix?: string): void;
    #private;
}
import { Readable } from "node:stream";
