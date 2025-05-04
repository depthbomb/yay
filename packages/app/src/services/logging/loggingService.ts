import { app } from 'electron';
import { join } from 'node:path';
import { injectable } from '@needle-di/core';
import { format, transports, createLogger } from 'winston';
import type { Logger } from 'winston';

@injectable()
export class LoggingService {
	private readonly logger: Logger;

	public constructor() {
		this.logger = createLogger({
			transports: [
				new transports.Console({
					level: import.meta.env.DEV ? 'silly' : 'http',
					format: format.combine(
						format.colorize(),
						format.timestamp(),
						format.padLevels(),
						format.printf(({ level, message, timestamp, ...meta }) => {
							if (Object.keys(meta).length) {
								return `${timestamp} [${level}] ${message} ${JSON.stringify(meta)}`;
							}

							return `${timestamp} [${level}] ${message}`;
						})
					)
				}),
				new transports.File({
					level: 'silly',
					filename: join(app.getPath('userData'), 'logs', 'yay.log'),
					format: format.combine(
						format.timestamp(),
						format.printf(({ level, message, timestamp, ...meta }) => {
							if (Object.keys(meta).length) {
								return `${timestamp} [${level}] ${message} ${JSON.stringify(meta)}`;
							}

							return `${timestamp} [${level}] ${message}`;
						})
					)
				})
			]
		});
	}

	public error(message: string, ...meta: any[]) {
		return this.logger.error(message, ...meta);
	}

	public warn(message: string, ...meta: any[]) {
		return this.logger.warn(message, ...meta);
	}

	public info(message: string, ...meta: any[]) {
		return this.logger.info(message, ...meta);
	}

	public http(message: string, ...meta: any[]) {
		return this.logger.http(message, ...meta);
	}

	public verbose(message: string, ...meta: any[]) {
		return this.logger.verbose(message, ...meta);
	}

	public debug(message: string, ...meta: any[]) {
		return this.logger.debug(message, ...meta);
	}

	public silly(message: string, ...meta: any[]) {
		return this.logger.debug(message, ...meta);
	}
}
