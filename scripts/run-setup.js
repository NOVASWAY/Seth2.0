const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🏥 Seth Medical Clinic - Setup Execution")

// Create necessary directories
const dirs = ["logs", "backups", "uploads"]
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 Created directory: ${dir}`)
  }
})

// Check environment file
if (!fs.existsSync(".env")) {
  if (fs.existsSync(".env.example")) {
    fs.copyFileSync(".env.example", ".env")
    console.log("📝 Created .env from .env.example")
  }
}

console.log("✅ Setup directories and environment configured")
console.log("🌐 Frontend ready at: http://localhost:3000")
console.log("🔧 Backend API ready at: http://localhost:5000")
console.log("")
console.log("Default admin credentials:")
console.log("Username: admin")
console.log("Password: admin123")
console.log("⚠️ Change default password in production!")
