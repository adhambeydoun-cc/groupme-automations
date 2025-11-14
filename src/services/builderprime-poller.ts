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
  opportunityId: number
  clientId: number
}

interface ClientData {
  id: number
  leadSetterFirstName: string | null
  leadSetterLastName: string | null
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
 * Fetch client/opportunity data to get lead setter info
 */
async function fetchLeadSetter(opportunityId: number): Promise<{ firstName: string; lastName: string } | null> {
  const apiKey = process.env.BUILDERPRIME_API_KEY
  const clientsUrl = 'https://comercross.builderprime.com/api/clients'

  if (!apiKey) {
    return null
  }

  try {
    const response = await axios.get<ClientData[]>(clientsUrl, {
      params: {
        id: opportunityId,
        limit: 500
      },
      headers: {
        'x-api-key': apiKey
      }
    })

    // Find the client with matching opportunity ID
    const client = response.data.find(c => c.id === opportunityId)
    
    if (client && client.leadSetterFirstName && client.leadSetterLastName) {
      return {
        firstName: client.leadSetterFirstName,
        lastName: client.leadSetterLastName
      }
    }
    
    return null
  } catch (error: any) {
    console.error('Error fetching lead setter:', error.response?.data || error.message)
    return null
  }
}

/**
 * Format meeting data for GroupMe message
 */
async function formatMeetingMessage(meeting: BuilderPrimeMeeting): Promise<string> {
  // Get the lead setter (CSR) info from the clients API
  const leadSetter = await fetchLeadSetter(meeting.opportunityId)
  
  const csrName = leadSetter 
    ? `${leadSetter.firstName} ${leadSetter.lastName}`
    : 'Unknown CSR'
  
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
  
  try {
    // Make multiple API calls to cover appointments scheduled up to 120 days out
    // This ensures we catch appointments created TODAY regardless of when they're scheduled
    const allMeetings: BuilderPrimeMeeting[] = []
    const daysToQuery = 120 // Query 4 months into the future
    const chunkSize = 30 // API limit is 31 days
    
    for (let offset = 0; offset < daysToQuery; offset += chunkSize) {
      const startDateFrom = now + (offset * 24 * 60 * 60 * 1000)
      const startDateTo = now + ((offset + chunkSize) * 24 * 60 * 60 * 1000)
      
      const meetings = await fetchMeetings(startDateFrom, startDateTo)
      allMeetings.push(...meetings)
    }
    
    console.log(`Retrieved ${allMeetings.length} total appointments from BuilderPrime`)
    
    // Filter for meetings created TODAY that we haven't notified about yet
    const newMeetings = allMeetings.filter(m => 
      m.createdDate >= todayMidnightMs && !notifiedAppointments.has(m.id)
    )
    
    console.log(`Found ${newMeetings.length} new appointments SET today (after ${todayMidnight.toISOString()})`)
    
    for (const meeting of newMeetings) {
      const message = await formatMeetingMessage(meeting)
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

