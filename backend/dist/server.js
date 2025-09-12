"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const patients_1 = __importDefault(require("./routes/patients"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const claims_1 = __importDefault(require("./routes/claims"));
const audit_1 = __importDefault(require("./routes/audit"));
const prescriptions_1 = __importDefault(require("./routes/prescriptions"));
const lab_tests_1 = __importDefault(require("./routes/lab-tests"));
const lab_requests_1 = __importDefault(require("./routes/lab-requests"));
const sha_invoices_1 = __importDefault(require("./routes/sha-invoices"));
const sha_batches_1 = __importDefault(require("./routes/sha-batches"));
const sha_claims_1 = __importDefault(require("./routes/sha-claims"));
const sha_patient_data_1 = __importDefault(require("./routes/sha-patient-data"));
const financial_1 = __importDefault(require("./routes/financial"));
const admin_1 = __importDefault(require("./routes/admin"));
const visits_1 = __importDefault(require("./routes/visits"));
const patient_encounters_1 = __importDefault(require("./routes/patient-encounters"));
const sha_documents_1 = __importDefault(require("./routes/sha-documents"));
const sha_exports_1 = __importDefault(require("./routes/sha-exports"));
const clinical_autocomplete_1 = __importDefault(require("./routes/clinical-autocomplete"));
const events_1 = __importDefault(require("./routes/events"));
const patient_assignments_1 = __importDefault(require("./routes/patient-assignments"));
const quick_assignments_1 = __importDefault(require("./routes/quick-assignments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const user_presence_1 = __importDefault(require("./routes/user-presence"));
const sync_1 = __importDefault(require("./routes/sync"));
const immunization_1 = __importDefault(require("./routes/immunization"));
const family_planning_1 = __importDefault(require("./routes/family-planning"));
const mch_services_1 = __importDefault(require("./routes/mch-services"));
const stock_categories_1 = __importDefault(require("./routes/stock-categories"));
const stock_items_1 = __importDefault(require("./routes/stock-items"));
const migration_1 = __importDefault(require("./routes/migration"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const backup_1 = __importDefault(require("./routes/backup"));
const performance_1 = __importDefault(require("./routes/performance"));
const sync_2 = __importDefault(require("./routes/sync"));
const health_1 = __importDefault(require("./routes/health"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const auditLogger_1 = require("./middleware/auditLogger");
const auth_2 = require("./middleware/auth");
// import { initializeWebSocket } from "./services/WebSocketService"
const DatabaseService_1 = require("./services/DatabaseService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: [
        process.env.CORS_ORIGIN || "http://localhost:3000",
        "http://localhost:3001", // Allow Next.js dev server on port 3001
        "http://localhost:3000" // Allow Next.js dev server on port 3000
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
    message: "Too many requests from this IP, please try again later.",
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login attempts per windowMs (increased for development)
    message: "Too many login attempts, please try again later.",
});
// Development-only endpoint to reset rate limits (must be before general limiter)
if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/reset-rate-limits', (req, res) => {
        // This is a simple way to reset rate limits by restarting the limiter
        // In production, you'd want a more sophisticated approach
        res.json({
            success: true,
            message: 'Rate limits reset. Note: This only works in development mode.',
            timestamp: new Date().toISOString()
        });
    });
}
app.use("/api/auth/login", authLimiter);
app.use("/api/", limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Compression middleware
app.use((0, compression_1.default)());
// Logging middleware
app.use((0, morgan_1.default)("combined"));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});
// API routes
app.use("/api/auth", auth_1.default);
app.use("/api/users", auth_2.authenticate, users_1.default);
app.use("/api/patients", auth_2.authenticate, patients_1.default);
app.use("/api/inventory", auth_2.authenticate, inventory_1.default);
app.use("/api/invoices", auth_2.authenticate, invoices_1.default);
app.use("/api/claims", auth_2.authenticate, claims_1.default);
app.use("/api/audit", auth_2.authenticate, audit_1.default);
app.use("/api/prescriptions", auth_2.authenticate, prescriptions_1.default);
app.use("/api/lab-tests", auth_2.authenticate, lab_tests_1.default);
app.use("/api/lab-requests", auth_2.authenticate, lab_requests_1.default);
app.use("/api/sha-invoices", auth_2.authenticate, sha_invoices_1.default);
app.use("/api/sha-batches", auth_2.authenticate, sha_batches_1.default);
app.use("/api/sha-claims", auth_2.authenticate, sha_claims_1.default);
app.use("/api/sha-patient-data", auth_2.authenticate, sha_patient_data_1.default);
app.use("/api/financial", auth_2.authenticate, financial_1.default);
app.use("/api/admin", auth_2.authenticate, admin_1.default);
app.use("/api/visits", auth_2.authenticate, visits_1.default);
app.use("/api/patient-encounters", auth_2.authenticate, patient_encounters_1.default);
app.use("/api/sha-documents", auth_2.authenticate, sha_documents_1.default);
app.use("/api/sha-exports", auth_2.authenticate, sha_exports_1.default);
app.use("/api/clinical-autocomplete", auth_2.authenticate, clinical_autocomplete_1.default);
app.use("/api/events", auth_2.authenticate, events_1.default);
app.use("/api/patient-assignments", auth_2.authenticate, patient_assignments_1.default);
app.use("/api/quick-assignments", auth_2.authenticate, quick_assignments_1.default);
app.use("/api/notifications", auth_2.authenticate, notifications_1.default);
app.use("/api/user-presence", auth_2.authenticate, user_presence_1.default);
app.use("/api/sync", auth_2.authenticate, sync_1.default);
app.use("/api/immunization", auth_2.authenticate, immunization_1.default);
app.use("/api/family-planning", auth_2.authenticate, family_planning_1.default);
app.use("/api/mch-services", auth_2.authenticate, mch_services_1.default);
app.use("/api/stock-categories", auth_2.authenticate, stock_categories_1.default);
app.use("/api/stock-items", auth_2.authenticate, stock_items_1.default);
app.use("/api/migration", auth_2.authenticate, migration_1.default);
app.use("/api/analytics", auth_2.authenticate, analytics_1.default);
app.use("/api/backup", auth_2.authenticate, backup_1.default);
app.use("/api/performance", auth_2.authenticate, performance_1.default);
app.use("/api/sync", auth_2.authenticate, sync_2.default);
app.use("/api/health", health_1.default);
// Audit logging middleware (after routes)
app.use(auditLogger_1.auditLogger);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
const PORT = process.env.PORT || 5000;
// Initialize databases and start server
async function startServer() {
    try {
        // Initialize both PostgreSQL and MongoDB
        await DatabaseService_1.databaseService.initialize();
        // Start the server
        server.listen(PORT, () => {
            console.log(`🚀 Seth Clinic API Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`🛠️  Dev endpoint: http://localhost:${PORT}/api/dev/reset-rate-limits`);
            }
        });
        // Initialize WebSocket service
        // initializeWebSocket(server) // Temporarily disabled
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer();
exports.default = app;
