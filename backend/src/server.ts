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
import financialRoutes from "./routes/financial"
import adminRoutes from "./routes/admin"
import visitRoutes from "./routes/visits"

// Import middleware
import { errorHandler } from "./middleware/errorHandler"
import { auditLogger } from "./middleware/auditLogger"
import { authenticate } from "./middleware/auth"

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
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
})

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
app.use("/api/financial", authenticate, financialRoutes)
app.use("/api/admin", authenticate, adminRoutes)
app.use("/api/visits", authenticate, visitRoutes)

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

server.listen(PORT, () => {
  console.log(`🚀 Seth Clinic API Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔒 Environment: ${process.env.NODE_ENV}`)
})

export default app
