import { sendGroupMeMessage } from './groupme'

/**
 * Handle incoming webhooks from BuilderPrime
 */
export async function handleBuilderPrimeWebhook(payload: any) {
  console.log('🔄 Processing BuilderPrime webhook...')
  
  const { event, data } = payload

  try {
    switch (event) {
      case 'lead.created':
        await handleNewLead(data)
        break
      
      case 'appointment.scheduled':
        await handleAppointmentScheduled(data)
        break
      
      case 'project.updated':
        await handleProjectUpdate(data)
        break
      
      case 'estimate.sent':
        await handleEstimateSent(data)
        break
      
      default:
        console.log(`ℹ️  Unhandled event type: ${event}`)
    }
  } catch (error) {
    console.error('❌ Error handling BuilderPrime webhook:', error)
    throw error
  }
}

/**
 * Handle new lead creation
 */
async function handleNewLead(lead: any) {
  const message = `🎉 New Lead Alert!
  
Name: ${lead.name || 'Unknown'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Source: ${lead.source || 'Unknown'}
Service: ${lead.service || 'Not specified'}

👉 Check BuilderPrime for full details!`

  await sendGroupMeMessage(message)
}

/**
 * Handle appointment scheduling
 */
async function handleAppointmentScheduled(appointment: any) {
  const csr = appointment.csr || appointment.created_by || 'CSR'
  const notes = appointment.notes ? ` — Notes: ${appointment.notes}` : ''
  const date = appointment.date || appointment.start_date || 'TBD'
  const time = appointment.time || appointment.start_time || 'TBD'
  const type = appointment.type || appointment.appointment_type || 'General'
  const customer = appointment.customer_name || appointment.customer || 'Unknown'

  const message = `📅 Appointment Set by ${csr}: ${customer} — ${date} @ ${time} — ${type}${notes}`

  await sendGroupMeMessage(message)
}

/**
 * Handle project updates
 */
async function handleProjectUpdate(project: any) {
  const message = `📋 Project Update
  
Project: ${project.name || 'Unknown'}
Status: ${project.status || 'Unknown'}
Customer: ${project.customer_name || 'Unknown'}

👉 View details in BuilderPrime`

  await sendGroupMeMessage(message)
}

/**
 * Handle estimate sent
 */
async function handleEstimateSent(estimate: any) {
  const message = `💰 Estimate Sent!
  
Customer: ${estimate.customer_name || 'Unknown'}
Amount: $${estimate.amount || 'TBD'}
Project: ${estimate.project_name || 'Unknown'}

🤞 Fingers crossed for this one!`

  await sendGroupMeMessage(message)
}

