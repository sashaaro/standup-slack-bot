import {Logger, LogLevel} from '@slack/logger';
import {Logger as PinoLogger} from "pino";

export class WinstonSlackLoggerAdapter implements Logger
{
    private level: LogLevel;

    constructor(private logger: PinoLogger) {
    }

    debug(...msg: any[]): void {
        msg.forEach(m => this.logger.debug(m));
    }

    error(...msg: any[]): void {
        msg.forEach(m => this.logger.error(m));
    }

    getLevel(): LogLevel {
        return this.level;
    }

    info(...msg: any[]): void {
        msg.forEach(m => this.logger.info(m));
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    setName(name: string): void {

    }

    warn(...msg: any[]): void {
        msg.forEach(m => this.logger.warn(m));
    }
}