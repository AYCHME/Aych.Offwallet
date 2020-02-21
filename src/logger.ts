import { createLogger, format, transports } from 'winston'

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.label({ label: 'Main' }),
    format.timestamp(),
    format.colorize({ all: true }),
    format.printf(({ level, message, label, timestamp }): string => {
      return `[${timestamp}] [${level}] [${label}] ${message}`
    })
  ),
  transports: [
    new transports.Console(),
  ]
})
