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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketService = exports.initializeWebSocket = exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const jwt = __importStar(require("jsonwebtoken"));
const EventLoggerService_1 = require("./EventLoggerService");
class WebSocketService {
    constructor(server) {
        this.connectedUsers = new Map();
        this.userRooms = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.userId = decoded.userId;
                socket.username = decoded.username;
                socket.role = decoded.role;
                next();
            }
            catch (error) {
                next(new Error('Invalid authentication token'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.username} (${socket.userId}) connected`);
            // Store connected user
            if (socket.userId) {
                this.connectedUsers.set(socket.userId, socket);
                this.userRooms.set(socket.userId, new Set());
            }
            // Join user to their personal room
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
                this.userRooms.get(socket.userId)?.add(`user:${socket.userId}`);
            }
            // Join user to role-based rooms
            if (socket.role) {
                socket.join(`role:${socket.role}`);
                this.userRooms.get(socket.userId)?.add(`role:${socket.role}`);
            }
            // Join user to general room
            socket.join('general');
            this.userRooms.get(socket.userId)?.add('general');
            // Handle user activity
            socket.on('user_activity', (data) => {
                this.handleUserActivity(socket, data);
            });
            // Handle typing indicators
            socket.on('typing_start', (data) => {
                this.handleTypingStart(socket, data);
            });
            socket.on('typing_stop', (data) => {
                this.handleTypingStop(socket, data);
            });
            // Handle real-time collaboration
            socket.on('entity_edit_start', (data) => {
                this.handleEntityEditStart(socket, data);
            });
            socket.on('entity_edit_stop', (data) => {
                this.handleEntityEditStop(socket, data);
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
            // Send connection confirmation
            socket.emit('connected', {
                message: 'Successfully connected to real-time sync',
                userId: socket.userId,
                username: socket.username,
                role: socket.role,
                connectedUsers: this.getConnectedUsersCount()
            });
        });
    }
    handleUserActivity(socket, data) {
        // Broadcast user activity to relevant rooms
        socket.to(`role:${socket.role}`).emit('user_activity', {
            userId: socket.userId,
            username: socket.username,
            activity: data.activity,
            page: data.page,
            timestamp: new Date()
        });
        // Log activity for audit
        EventLoggerService_1.EventLoggerService.logEvent({
            event_type: 'USER',
            user_id: socket.userId,
            username: socket.username,
            target_type: 'activity',
            target_id: data.page,
            action: 'user_activity',
            details: data,
            severity: 'LOW'
        });
    }
    handleTypingStart(socket, data) {
        socket.to(data.room).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            isTyping: true
        });
    }
    handleTypingStop(socket, data) {
        socket.to(data.room).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            isTyping: false
        });
    }
    handleEntityEditStart(socket, data) {
        // Notify other users that someone is editing this entity
        socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_start', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            timestamp: new Date()
        });
        // Join the entity-specific room
        socket.join(`entity:${data.entityType}:${data.entityId}`);
        this.userRooms.get(socket.userId)?.add(`entity:${data.entityType}:${data.entityId}`);
    }
    handleEntityEditStop(socket, data) {
        // Notify other users that editing has stopped
        socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_stop', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            timestamp: new Date()
        });
        // Leave the entity-specific room
        socket.leave(`entity:${data.entityType}:${data.entityId}`);
        this.userRooms.get(socket.userId)?.delete(`entity:${data.entityType}:${data.entityId}`);
    }
    handleDisconnect(socket) {
        console.log(`User ${socket.username} (${socket.userId}) disconnected`);
        if (socket.userId) {
            this.connectedUsers.delete(socket.userId);
            this.userRooms.delete(socket.userId);
        }
        // Notify other users about disconnection
        socket.broadcast.emit('user_disconnected', {
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date()
        });
    }
    // Public methods for broadcasting events
    broadcastNotification(notification) {
        const notificationData = {
            ...notification,
            id: this.generateNotificationId(),
            timestamp: new Date()
        };
        if (notification.targetUsers && notification.targetUsers.length > 0) {
            // Send to specific users
            notification.targetUsers.forEach(userId => {
                this.io.to(`user:${userId}`).emit('notification', notificationData);
            });
        }
        else if (notification.targetRoles && notification.targetRoles.length > 0) {
            // Send to specific roles
            notification.targetRoles.forEach(role => {
                this.io.to(`role:${role}`).emit('notification', notificationData);
            });
        }
        else {
            // Broadcast to all connected users
            this.io.emit('notification', notificationData);
        }
        // Log notification
        EventLoggerService_1.EventLoggerService.logEvent({
            event_type: 'SYSTEM',
            user_id: 'system',
            username: 'system',
            target_type: 'notification',
            target_id: notificationData.id,
            action: 'notification_sent',
            details: notification,
            severity: notification.priority.toUpperCase()
        });
    }
    broadcastSyncEvent(event) {
        const syncData = {
            ...event,
            id: this.generateSyncEventId(),
            timestamp: new Date()
        };
        // Broadcast to all connected users
        this.io.emit('sync_event', syncData);
        // Log sync event
        EventLoggerService_1.EventLoggerService.logEvent({
            event_type: 'SYSTEM',
            user_id: event.userId,
            username: 'system',
            target_type: event.entityType,
            target_id: event.entityId,
            action: `sync_${event.action}`,
            details: event,
            severity: 'MEDIUM'
        });
    }
    notifyUser(userId, notification) {
        this.broadcastNotification({
            ...notification,
            targetUsers: [userId]
        });
    }
    notifyRole(role, notification) {
        this.broadcastNotification({
            ...notification,
            targetRoles: [role]
        });
    }
    getConnectedUsers() {
        const users = [];
        this.connectedUsers.forEach((socket, userId) => {
            users.push({
                userId,
                username: socket.username || 'Unknown',
                role: socket.role || 'Unknown',
                connectedAt: new Date() // In a real implementation, you'd track this
            });
        });
        return users;
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSyncEventId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Method to get the Socket.IO instance for use in other parts of the application
    getIO() {
        return this.io;
    }
}
exports.WebSocketService = WebSocketService;
// Singleton instance
let webSocketService = null;
const initializeWebSocket = (server) => {
    if (!webSocketService) {
        webSocketService = new WebSocketService(server);
    }
    return webSocketService;
};
exports.initializeWebSocket = initializeWebSocket;
const getWebSocketService = () => {
    return webSocketService;
};
exports.getWebSocketService = getWebSocketService;
