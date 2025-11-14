import { Router, Request, Response } from 'express'
import { handleBuilderPrimeWebhook } from '../services/builderprime'

const router = Router()

// BuilderPrime webhook endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📨 Received BuilderPrime webhook:', req.body)

    // Validate webhook signature if needed
    const signature = req.headers['x-builderprime-signature']
    
    // Process the webhook
    await handleBuilderPrimeWebhook(req.body)
    
    // Respond to BuilderPrime immediately
    res.status(200).json({ success: true, message: 'Webhook received' })
  } catch (error: any) {
    console.error('❌ Error processing BuilderPrime webhook:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Test endpoint
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'BuilderPrime webhook endpoint is active',
    endpoint: '/webhook/builderprime'
  })
})

export default router




