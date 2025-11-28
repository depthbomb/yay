import { app } from 'electron';
import { join } from 'node:path';
import { injectable } from '@needle-di/core';
import { serializeError } from 'serialize-error';
import { LogLevel, LogLayer, BlankTransport } from 'loglayer';
import { LogFileRotationTransport } from '@loglayer/transport-log-file-rotation';
import type { LogLayerMetadata } from 'loglayer';

@injectable()
export class LoggingService {
	private readonly logger: LogLayer;

	public constructor() {
		this.logger = new LogLayer({
			prefix: '[yay]',
			errorSerializer: serializeError,
			transport: [
				new BlankTransport({
					shipToLogger: ({ logLevel, messages, data, hasData })  => {
						console.log(
							`[${new Date().toISOString()}]`,
							`[${logLevel.toUpperCase()}]`,
							...messages,
							hasData ? data : ''
						)

						return messages;
					}
				}),
				new LogFileRotationTransport({
					auditFile: join(app.getPath('userData'), 'logs', 'audit.json'),
					filename: join(app.getPath('userData'), 'logs', 'yay.%DATE%.log'),
					dateFormat: 'YMD',
					frequency: 'daily',
					compressOnRotate: true,
					maxLogs: 5
				}),
			]
		});
	}

	public info(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.info, message, metadata);
	}

	public warn(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.warn, message, metadata);
	}

	public error(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.error, message, metadata);
	}

	public fatal(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.fatal, message, metadata);
	}

	public debug(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.debug, message, metadata);
	}

	public trace(message: string, metadata?: LogLayerMetadata) {
		return this.log(LogLevel.trace, message, metadata);
	}

	private log(level: LogLevel, message: string, metadata?: LogLayerMetadata) {
		const logger = metadata
			? this.logger.withMetadata(metadata)
			: this.logger;

		if (level in logger) {
			return logger[level](message);
		}
	}
}
