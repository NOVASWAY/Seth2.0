"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupQueue = exports.notificationQueue = exports.inventoryQueue = exports.claimsQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
// Redis connection
const redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379");
// Job queues
exports.claimsQueue = new bull_1.default("claims processing", {
    redis: {
        port: 6379,
        host: process.env.REDIS_HOST || "localhost",
        password: process.env.REDIS_PASSWORD,
    },
});
exports.inventoryQueue = new bull_1.default("inventory alerts", {
    redis: {
        port: 6379,
        host: process.env.REDIS_HOST || "localhost",
        password: process.env.REDIS_PASSWORD,
    },
});
exports.notificationQueue = new bull_1.default("notifications", {
    redis: {
        port: 6379,
        host: process.env.REDIS_HOST || "localhost",
        password: process.env.REDIS_PASSWORD,
    },
});
exports.backupQueue = new bull_1.default("database backup", {
    redis: {
        port: 6379,
        host: process.env.REDIS_HOST || "localhost",
        password: process.env.REDIS_PASSWORD,
    },
});
