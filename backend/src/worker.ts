import "./jobs/workers"
import { scheduleRecurringJobs } from "./jobs/workers"

console.log("Starting background worker...")

// Schedule recurring jobs
scheduleRecurringJobs()

console.log("Background worker started successfully")

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully")
  process.exit(0)
})
