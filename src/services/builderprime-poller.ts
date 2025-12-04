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

interface OpportunityData {
  /**
   * ID of the client in BuilderPrime.
   * We use this together with `BuilderPrimeMeeting.clientId` to look up the lead setter.
   */
  id: number
  firstName: string
  lastName: string
  leadSetterFirstName: string | null
  leadSetterLastName: string | null
  salesPersonFirstName: string | null
  salesPersonLastName: string | null
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

// Cache opportunities to avoid repeated API calls
const opportunitiesCache = new Map<number, OpportunityData>()
let lastOpportunitiesFetch = 0
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch all opportunities to build a lookup cache
 */
async function fetchOpportunities(): Promise<OpportunityData[]> {
  const apiKey = process.env.BUILDERPRIME_API_KEY
  const clientsUrl = 'https://comercross.builderprime.com/api/clients'

  if (!apiKey) {
    return []
  }

  try {
    const response = await axios.get<OpportunityData[]>(clientsUrl, {
      params: {
        limit: 500
      },
      headers: {
        'x-api-key': apiKey
      }
    })

    return response.data || []
  } catch (error: any) {
    console.error('Error fetching opportunities:', error.response?.data || error.message)
    return []
  }
}

/**
 * Get lead setter info for a given CLIENT (with caching)
 */
async function fetchLeadSetter(clientId: number): Promise<{ firstName: string; lastName: string } | null> {
  const now = Date.now()
  
  // Refresh cache if it's stale
  if (now - lastOpportunitiesFetch > CACHE_DURATION_MS) {
    console.log('🔄 Refreshing opportunities cache...')
    const opportunities = await fetchOpportunities()
    
    opportunitiesCache.clear()
    opportunities.forEach(opp => {
      opportunitiesCache.set(opp.id, opp)
    })
    
    lastOpportunitiesFetch = now
    console.log(`✅ Cached ${opportunities.length} opportunities`)
  }
  
  // Lookup from cache using the clientId from the meeting
  const opportunity = opportunitiesCache.get(clientId)
  
  if (opportunity?.leadSetterFirstName && opportunity?.leadSetterLastName) {
    return {
      firstName: opportunity.leadSetterFirstName,
      lastName: opportunity.leadSetterLastName
    }
  }
  
  return null
}

/**
 * Format meeting data for GroupMe message
 */
async function formatMeetingMessage(meeting: BuilderPrimeMeeting): Promise<string> {
  // Get the lead setter (CSR) info from the clients API.
  // NOTE: The `/api/clients` endpoint is keyed by client ID, so we must
  // look up using `meeting.clientId`, not `opportunityId`.
  const leadSetter = await fetchLeadSetter(meeting.clientId)
  
  const csrName = leadSetter 
    ? `${leadSetter.firstName} ${leadSetter.lastName}`
    : 'Unknown CSR'
  
  // Use title if customer name is missing
  const customerName = meeting.clientFirstName && meeting.clientLastName
    ? `${meeting.clientFirstName} ${meeting.clientLastName}`
    : meeting.title.replace(' - Estimate', '').replace(' - ', ' ')
  
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

