"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoose = exports.disconnectMongoDB = exports.connectMongoDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// MongoDB connection options
const mongoOptions = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferCommands: false, // Disable mongoose buffering
};
// MongoDB connection string
const mongoUri = process.env.MONGODB_URL || 'mongodb://admin:admin123@localhost:27017/seth_clinic_mongo?authSource=admin';
// Connection state
let isConnected = false;
const connectMongoDB = async () => {
    if (isConnected) {
        console.log('✅ MongoDB already connected');
        return;
    }
    try {
        await mongoose_1.default.connect(mongoUri, mongoOptions);
        isConnected = true;
        console.log('✅ Connected to MongoDB database');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
};
exports.connectMongoDB = connectMongoDB;
const disconnectMongoDB = async () => {
    if (!isConnected) {
        return;
    }
    try {
        await mongoose_1.default.disconnect();
        isConnected = false;
        console.log('✅ Disconnected from MongoDB database');
    }
    catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
        throw error;
    }
};
exports.disconnectMongoDB = disconnectMongoDB;
// Connection event handlers
mongoose_1.default.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
    isConnected = true;
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
    isConnected = false;
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
    isConnected = false;
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await (0, exports.disconnectMongoDB)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, exports.disconnectMongoDB)();
    process.exit(0);
});
exports.default = mongoose_1.default;
