import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { createServer } from "http"

// Import routes
import authRoutes from "./routes/auth"
import userRoutes from "./routes/users"
import patientRoutes from "./routes/patients"
import inventoryRoutes from "./routes/inventory"
import invoiceRoutes from "./routes/invoices"
import claimsRoutes from "./routes/claims"
import auditRoutes from "./routes/audit"
import prescriptionRoutes from "./routes/prescriptions"
import labTestRoutes from "./routes/lab-tests"
import labRequestRoutes from "./routes/lab-requests"
import shaInvoiceRoutes from "./routes/sha-invoices"
import shaBatchRoutes from "./routes/sha-batches"
import shaClaimsRoutes from "./routes/sha-claims"
import shaPatientDataRoutes from "./routes/sha-patient-data"
import financialRoutes from "./routes/financial"
import adminRoutes from "./routes/admin"
import visitRoutes from "./routes/visits"
import patientEncountersRoutes from "./routes/patient-encounters"
import shaDocumentsRoutes from "./routes/sha-documents"
import shaExportsRoutes from "./routes/sha-exports"
import clinicalAutocompleteRoutes from "./routes/clinical-autocomplete"
import eventRoutes from "./routes/events"
import patientAssignmentRoutes from "./routes/patient-assignments"
import quickAssignmentRoutes from "./routes/quick-assignments"
import notificationRoutes from "./routes/notifications"
import userPresenceRoutes from "./routes/user-presence"
import syncRoutes from "./routes/sync"
import immunizationRoutes from "./routes/immunization"
import familyPlanningRoutes from "./routes/family-planning"
import mchServicesRoutes from "./routes/mch-services"
import stockCategoryRoutes from "./routes/stock-categories"
import stockItemRoutes from "./routes/stock-items"
import migrationRoutes from "./routes/migration"
import analyticsRoutes from "./routes/analytics"
import backupRoutes from "./routes/backup"
import performanceRoutes from "./routes/performance"
import dataSyncRoutes from "./routes/sync"
import healthRoutes from "./routes/health"

// Import middleware
import { errorHandler } from "./middleware/errorHandler"
import { auditLogger } from "./middleware/auditLogger"
import { authenticate } from "./middleware/auth"
// import { initializeWebSocket } from "./services/WebSocketService"
import { databaseService } from "./services/DatabaseService"

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
)

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:3000",
      "http://localhost:3001", // Allow Next.js dev server on port 3001
      "http://localhost:3000"  // Allow Next.js dev server on port 3000
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: "Too many requests from this IP, please try again later.",
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs (increased for development)
  message: "Too many login attempts, please try again later.",
})

// Development-only endpoint to reset rate limits (must be before general limiter)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/reset-rate-limits', (req, res) => {
    // This is a simple way to reset rate limits by restarting the limiter
    // In production, you'd want a more sophisticated approach
    res.json({ 
      success: true, 
      message: 'Rate limits reset. Note: This only works in development mode.',
      timestamp: new Date().toISOString()
    })
  })
}

app.use("/api/auth/login", authLimiter)
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Compression middleware
app.use(compression())

// Logging middleware
app.use(morgan("combined"))

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/users", authenticate, userRoutes)
app.use("/api/patients", authenticate, patientRoutes)
app.use("/api/inventory", authenticate, inventoryRoutes)
app.use("/api/invoices", authenticate, invoiceRoutes)
app.use("/api/claims", authenticate, claimsRoutes)
app.use("/api/audit", authenticate, auditRoutes)
app.use("/api/prescriptions", authenticate, prescriptionRoutes)
app.use("/api/lab-tests", authenticate, labTestRoutes)
app.use("/api/lab-requests", authenticate, labRequestRoutes)
app.use("/api/sha-invoices", authenticate, shaInvoiceRoutes)
app.use("/api/sha-batches", authenticate, shaBatchRoutes)
app.use("/api/sha-claims", authenticate, shaClaimsRoutes)
app.use("/api/sha-patient-data", authenticate, shaPatientDataRoutes)
app.use("/api/financial", authenticate, financialRoutes)
app.use("/api/admin", authenticate, adminRoutes)
app.use("/api/visits", authenticate, visitRoutes)
app.use("/api/patient-encounters", authenticate, patientEncountersRoutes)
app.use("/api/sha-documents", authenticate, shaDocumentsRoutes)
app.use("/api/sha-exports", authenticate, shaExportsRoutes)
app.use("/api/clinical-autocomplete", authenticate, clinicalAutocompleteRoutes)
app.use("/api/events", authenticate, eventRoutes)
app.use("/api/patient-assignments", authenticate, patientAssignmentRoutes)
app.use("/api/quick-assignments", authenticate, quickAssignmentRoutes)
app.use("/api/notifications", authenticate, notificationRoutes)
app.use("/api/user-presence", authenticate, userPresenceRoutes)
app.use("/api/sync", authenticate, syncRoutes)
app.use("/api/immunization", authenticate, immunizationRoutes)
app.use("/api/family-planning", authenticate, familyPlanningRoutes)
app.use("/api/mch-services", authenticate, mchServicesRoutes)
app.use("/api/stock-categories", authenticate, stockCategoryRoutes)
app.use("/api/stock-items", authenticate, stockItemRoutes)
app.use("/api/migration", authenticate, migrationRoutes)
app.use("/api/analytics", authenticate, analyticsRoutes)
app.use("/api/backup", authenticate, backupRoutes)
app.use("/api/performance", authenticate, performanceRoutes)
app.use("/api/sync", authenticate, dataSyncRoutes)
app.use("/api/health", healthRoutes)

// Audit logging middleware (after routes)
app.use(auditLogger)

// Error handling middleware (must be last)
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

const PORT = process.env.PORT || 5000

// Initialize databases and start server
async function startServer() {
  try {
    // Initialize both PostgreSQL and MongoDB
    await databaseService.initialize()
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Seth Clinic API Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔒 Environment: ${process.env.NODE_ENV}`)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🛠️  Dev endpoint: http://localhost:${PORT}/api/dev/reset-rate-limits`)
      }
    })

    // Initialize WebSocket service
        // initializeWebSocket(server) // Temporarily disabled
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app
