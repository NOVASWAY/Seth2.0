import { createClient } from "redis"
import * as dotenv from "dotenv"

dotenv.config()

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err)
})

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis")
})

// Connect to Redis
redisClient.connect().catch(console.error)

export default redisClient
