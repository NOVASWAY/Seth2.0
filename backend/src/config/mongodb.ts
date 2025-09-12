import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

dotenv.config()

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
}

// MongoDB connection string
const mongoUri = process.env.MONGODB_URL || 'mongodb://admin:admin123@localhost:27017/seth_clinic_mongo?authSource=admin'

// Connection state
let isConnected = false

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) {
    console.log('✅ MongoDB already connected')
    return
  }

  try {
    await mongoose.connect(mongoUri, mongoOptions)
    isConnected = true
    console.log('✅ Connected to MongoDB database')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

export const disconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) {
    return
  }

  try {
    await mongoose.disconnect()
    isConnected = false
    console.log('✅ Disconnected from MongoDB database')
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error)
    throw error
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB')
  isConnected = true
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err)
  isConnected = false
})

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB')
  isConnected = false
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectMongoDB()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectMongoDB()
  process.exit(0)
})

export { mongoose }
export default mongoose
