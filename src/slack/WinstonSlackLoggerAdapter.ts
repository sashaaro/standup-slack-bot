import {Logger, LogLevel} from '@slack/logger';
import {Logger as WinstonLogger} from "winston";

export class WinstonSlackLoggerAdapter implements Logger
{
    private level: LogLevel;

    private context = {channel: 'slack-web-client'}

    constructor(private logger: WinstonLogger) {
    }

    debug(...msg: any[]): void {
        msg.forEach(m => this.logger.debug(m, this.context));
    }

    error(...msg: any[]): void {
        msg.forEach(m => this.logger.error(m, this.context));
    }

    getLevel(): LogLevel {
        return this.level;
    }

    info(...msg: any[]): void {
        msg.forEach(m => this.logger.info(m, this.context));
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    setName(name: string): void {

    }

    warn(...msg: any[]): void {
        msg.forEach(m => this.logger.warn(m, this.context));
    }
}