import { Router, Request, Response } from 'express'
import { sendGroupMeMessage } from '../services/groupme'

const router = Router()

// Manual message send endpoint (for testing)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { message } = req.body
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    await sendGroupMeMessage(message)
    
    res.json({ 
      success: true, 
      message: 'Message sent to GroupMe' 
    })
  } catch (error: any) {
    console.error('❌ Error sending GroupMe message:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Test endpoint
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'GroupMe API endpoint is active',
    botId: process.env.GROUPME_BOT_ID ? '✓ configured' : '✗ not configured'
  })
})

export default router



