import axios from 'axios'
import { sendGroupMeMessage } from './groupme'

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
let isPolling = false
const notifiedAppointments = new Set<number>() // Track appointments we've already notified about

interface BuilderPrimeMeeting {
  id: number
  title: string
  startDateTime: number
  createdDate: number
  employeeFirstName: string
  employeeLastName: string
  clientFirstName: string
  clientLastName: string
  meetingTypeName: string
  location?: string
}

interface BuilderPrimeResponse {
  success: boolean
  data: BuilderPrimeMeeting[]
  errors?: Array<{ code: string; message: string }>
}

/**
 * Fetch meetings from BuilderPrime API
 */
async function fetchMeetings(startDateFrom: number, startDateTo: number): Promise<BuilderPrimeMeeting[]> {
  const apiKey = process.env.BUILDERPRIME_API_KEY
  const baseUrl = process.env.BUILDERPRIME_API_URL || 'https://comercross.builderprime.com/api/meetings/v1'

  if (!apiKey) {
    console.warn('BUILDERPRIME_API_KEY not configured, skipping poll')
    return []
  }

  try {
    const response = await axios.get<BuilderPrimeResponse>(baseUrl, {
      params: {
        'start-date-from': startDateFrom,
        'start-date-to': startDateTo,
        limit: 100
      },
      headers: {
        'x-api-key': apiKey
      }
    })

    if (response.data.success && response.data.data) {
      return response.data.data
    } else {
      console.error('BuilderPrime API error:', response.data.errors)
      return []
    }
  } catch (error: any) {
    console.error('Error fetching BuilderPrime meetings:', error.response?.data || error.message)
    return []
  }
}

/**
 * Format meeting data for GroupMe message
 */
function formatMeetingMessage(meeting: BuilderPrimeMeeting): string {
  const csrName = `${meeting.employeeFirstName} ${meeting.employeeLastName}`
  const customerName = `${meeting.clientFirstName} ${meeting.clientLastName}`
  const meetingDate = new Date(meeting.startDateTime)
  const dateStr = meetingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = meetingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  
  let message = `📅 Appointment Set by ${csrName}: ${customerName} — ${dateStr} @ ${timeStr} — ${meeting.meetingTypeName}`
  
  if (meeting.location) {
    message += ` — Location: ${meeting.location}`
  }
  
  return message
}

/**
 * Check for new meetings and post to GroupMe
 */
async function pollForNewMeetings() {
  console.log('🔄 Polling BuilderPrime for new appointments...')
  
  const now = Date.now()
  // Get midnight today in UTC
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const todayMidnightMs = todayMidnight.getTime()
  
  // Query meetings starting from 30 days ago to 1 year in the future
  // to catch all appointments regardless of when they're scheduled
  const startDateFrom = now - (30 * 24 * 60 * 60 * 1000) // 30 days ago
  const startDateTo = now + (365 * 24 * 60 * 60 * 1000) // 1 year from now
  
  try {
    const meetings = await fetchMeetings(startDateFrom, startDateTo)
    
    // Filter for meetings created TODAY that we haven't notified about yet
    const newMeetings = meetings.filter(m => 
      m.createdDate >= todayMidnightMs && !notifiedAppointments.has(m.id)
    )
    
    console.log(`Found ${newMeetings.length} new appointments created today (after ${todayMidnight.toISOString()})`)
    
    for (const meeting of newMeetings) {
      const message = formatMeetingMessage(meeting)
      await sendGroupMeMessage(message)
      console.log(`✅ Posted appointment ${meeting.id} to GroupMe: ${meeting.title}`)
      notifiedAppointments.add(meeting.id) // Mark as notified
    }
  } catch (error) {
    console.error('❌ Error polling BuilderPrime:', error)
  }
}

/**
 * Start polling for new meetings
 */
export function startPolling() {
  if (isPolling) {
    console.log('⚠️  Polling already running')
    return
  }
  
  console.log(`🚀 Starting BuilderPrime polling (every ${POLL_INTERVAL_MS / 1000}s)`)
  isPolling = true
  
  // Poll immediately on start
  pollForNewMeetings()
  
  // Then poll on interval
  setInterval(pollForNewMeetings, POLL_INTERVAL_MS)
}

/**
 * Stop polling
 */
export function stopPolling() {
  isPolling = false
  console.log('🛑 Stopped BuilderPrime polling')
}

