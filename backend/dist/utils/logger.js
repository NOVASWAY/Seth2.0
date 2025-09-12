"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class SimpleLogger {
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }
    info(message, meta) {
        console.log(this.formatMessage('info', message, meta));
    }
    error(message, meta) {
        console.error(this.formatMessage('error', message, meta));
    }
    warn(message, meta) {
        console.warn(this.formatMessage('warn', message, meta));
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }
}
exports.logger = new SimpleLogger();
