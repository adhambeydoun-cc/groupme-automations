import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import builderPrimeRoutes from './routes/builderprime'
import groupMeRoutes from './routes/groupme'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'GroupMe Automation'
  })
})

// Routes
app.use('/webhook/builderprime', builderPrimeRoutes)
app.use('/api/groupme', groupMeRoutes)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GroupMe Automation server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`📨 BuilderPrime webhook: http://localhost:${PORT}/webhook/builderprime`)
})

export default app


