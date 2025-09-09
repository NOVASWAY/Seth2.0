"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketService = exports.initializeWebSocket = exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
            if (socket.userId) {
                this.connectedUsers.set(socket.userId, socket);
                this.userRooms.set(socket.userId, new Set());
            }
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
                this.userRooms.get(socket.userId)?.add(`user:${socket.userId}`);
            }
            if (socket.role) {
                socket.join(`role:${socket.role}`);
                this.userRooms.get(socket.userId)?.add(`role:${socket.role}`);
            }
            socket.join('general');
            this.userRooms.get(socket.userId)?.add('general');
            socket.on('user_activity', (data) => {
                this.handleUserActivity(socket, data);
            });
            socket.on('typing_start', (data) => {
                this.handleTypingStart(socket, data);
            });
            socket.on('typing_stop', (data) => {
                this.handleTypingStop(socket, data);
            });
            socket.on('entity_edit_start', (data) => {
                this.handleEntityEditStart(socket, data);
            });
            socket.on('entity_edit_stop', (data) => {
                this.handleEntityEditStop(socket, data);
            });
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
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
        socket.to(`role:${socket.role}`).emit('user_activity', {
            userId: socket.userId,
            username: socket.username,
            activity: data.activity,
            page: data.page,
            timestamp: new Date()
        });
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
        socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_start', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            timestamp: new Date()
        });
        socket.join(`entity:${data.entityType}:${data.entityId}`);
        this.userRooms.get(socket.userId)?.add(`entity:${data.entityType}:${data.entityId}`);
    }
    handleEntityEditStop(socket, data) {
        socket.to(`entity:${data.entityType}:${data.entityId}`).emit('entity_edit_stop', {
            userId: socket.userId,
            username: socket.username,
            entityId: data.entityId,
            entityType: data.entityType,
            timestamp: new Date()
        });
        socket.leave(`entity:${data.entityType}:${data.entityId}`);
        this.userRooms.get(socket.userId)?.delete(`entity:${data.entityType}:${data.entityId}`);
    }
    handleDisconnect(socket) {
        console.log(`User ${socket.username} (${socket.userId}) disconnected`);
        if (socket.userId) {
            this.connectedUsers.delete(socket.userId);
            this.userRooms.delete(socket.userId);
        }
        socket.broadcast.emit('user_disconnected', {
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date()
        });
    }
    broadcastNotification(notification) {
        const notificationData = {
            ...notification,
            id: this.generateNotificationId(),
            timestamp: new Date()
        };
        if (notification.targetUsers && notification.targetUsers.length > 0) {
            notification.targetUsers.forEach(userId => {
                this.io.to(`user:${userId}`).emit('notification', notificationData);
            });
        }
        else if (notification.targetRoles && notification.targetRoles.length > 0) {
            notification.targetRoles.forEach(role => {
                this.io.to(`role:${role}`).emit('notification', notificationData);
            });
        }
        else {
            this.io.emit('notification', notificationData);
        }
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
        this.io.emit('sync_event', syncData);
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
                connectedAt: new Date()
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
    getIO() {
        return this.io;
    }
}
exports.WebSocketService = WebSocketService;
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
//# sourceMappingURL=WebSocketService.js.map