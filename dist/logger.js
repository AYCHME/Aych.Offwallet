"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
exports.logger = winston_1.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.format.combine(winston_1.format.label({ label: 'Main' }), winston_1.format.timestamp(), winston_1.format.colorize({ all: true }), winston_1.format.printf(({ level, message, label, timestamp }) => {
        return `[${timestamp}] [${level}] [${label}] ${message}`;
    })),
    transports: [
        new winston_1.transports.Console(),
    ]
});
