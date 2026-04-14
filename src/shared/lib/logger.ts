import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export function createLogger(name: string) {
  return logger.child({ component: name });
}

export const apiLogger = createLogger('api');
export const dbLogger = createLogger('database');
export const authLogger = createLogger('auth');
export const uploadLogger = createLogger('upload');
