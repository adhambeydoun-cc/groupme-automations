import axios from 'axios'

const GROUPME_API_URL = 'https://api.groupme.com/v3'

/**
 * Send a message to GroupMe
 */
export async function sendGroupMeMessage(text: string) {
  const botId = process.env.GROUPME_BOT_ID
  const isPlaceholder = !botId || /your_groupme_bot_id_here/i.test(botId)

  if (isPlaceholder) {
    console.warn('GROUPME_BOT_ID is not configured; skipping send. Message would be:')
    console.warn(text)
    return { skipped: true }
  }

  try {
    console.log('📤 Sending message to GroupMe:', text)

    const response = await axios.post('https://api.groupme.com/v3/bots/post', {
      bot_id: botId,
      text: text
    })

    console.log('✅ Message sent successfully')
    return response.data
  } catch (error: any) {
    console.error('❌ Error sending GroupMe message:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Get GroupMe groups (requires access token)
 */
export async function getGroupMeGroups() {
  const accessToken = process.env.GROUPME_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('GROUPME_ACCESS_TOKEN is not configured')
  }

  try {
    const response = await axios.get(`${GROUPME_API_URL}/groups`, {
      params: { token: accessToken }
    })

    return response.data
  } catch (error: any) {
    console.error('❌ Error fetching GroupMe groups:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Create a GroupMe bot
 */
export async function createGroupMeBot(groupId: string, name: string, avatarUrl?: string) {
  const accessToken = process.env.GROUPME_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('GROUPME_ACCESS_TOKEN is not configured')
  }

  try {
    const response = await axios.post(
      `${GROUPME_API_URL}/bots`,
      {
        bot: {
          name: name,
          group_id: groupId,
          avatar_url: avatarUrl,
          callback_url: '' // Optional webhook URL
        }
      },
      {
        params: { token: accessToken }
      }
    )

    console.log('✅ Bot created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ Error creating GroupMe bot:', error.response?.data || error.message)
    throw error
  }
}


