# GroupMe Automation

API automation connecting BuilderPrime CRM with GroupMe for real-time notifications and team communication.

## 🚀 Features

- **BuilderPrime Webhook Handler**: Receives webhooks from BuilderPrime
- **GroupMe Integration**: Sends automated messages to GroupMe groups
- **Event Processing**: Handles various BuilderPrime events:
  - New leads
  - Appointment scheduling
  - Project updates
  - Estimate notifications
  - And more...

## 📋 Prerequisites

- Node.js 18+ installed
- BuilderPrime account with API access
- GroupMe account with bot access
- A GroupMe group where you want to send notifications

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
PORT=3000
NODE_ENV=development

# BuilderPrime Configuration
BUILDERPRIME_API_KEY=your_builderprime_api_key_here
BUILDERPRIME_WEBHOOK_SECRET=your_webhook_secret_here
BUILDERPRIME_API_URL=https://api.builderprime.com/v1

# GroupMe Configuration
GROUPME_BOT_ID=your_groupme_bot_id_here
GROUPME_ACCESS_TOKEN=your_groupme_access_token_here
GROUPME_GROUP_ID=your_groupme_group_id_here
```

### 3. Get GroupMe Credentials

#### Create a GroupMe Bot:

1. Go to https://dev.groupme.com/bots
2. Click "Create Bot"
3. Select your group
4. Name your bot (e.g., "BuilderPrime Notifications")
5. Copy the **Bot ID** to your `.env` file

#### Get Access Token:

1. Go to https://dev.groupme.com/
2. Sign in
3. Click "Access Token" in the top right
4. Copy your access token to `.env`

### 4. Configure BuilderPrime Webhooks

1. Log into BuilderPrime
2. Go to Settings → Integrations → Webhooks
3. Add a new webhook with URL: `https://your-domain.com/webhook/builderprime`
4. Select the events you want to receive:
   - Lead Created
   - Appointment Scheduled
   - Project Updated
   - Estimate Sent
   - etc.

> **Note**: For local development, use [ngrok](https://ngrok.com/) to expose your local server:
> ```bash
> ngrok http 3000
> ```
> Then use the ngrok URL in BuilderPrime webhook settings.

## 🏃 Running the Server

### Development Mode (with auto-reload):

```bash
npm run dev
```

### Production Mode:

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### BuilderPrime Webhook
```
POST /webhook/builderprime
```

Receives webhooks from BuilderPrime. This endpoint should be configured in your BuilderPrime webhook settings.

### Manual GroupMe Message (Testing)
```
POST /api/groupme/send
```

Send a test message to GroupMe:

```bash
curl -X POST http://localhost:3000/api/groupme/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message from API"}'
```

## 🔧 Customization

### Adding New Event Handlers

Edit `src/services/builderprime.ts` to add new event handlers:

```typescript
switch (event) {
  case 'your.new.event':
    await handleYourNewEvent(data)
    break
  
  // ... other cases
}
```

### Customizing Message Format

Modify the message templates in `src/services/builderprime.ts`:

```typescript
async function handleNewLead(lead: any) {
  const message = `Your custom message format here...`
  await sendGroupMeMessage(message)
}
```

## 🧪 Testing

### Test the Server:
```bash
curl http://localhost:3000/health
```

### Test GroupMe Integration:
```bash
curl -X POST http://localhost:3000/api/groupme/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from BuilderPrime!"}'
```

### Test BuilderPrime Webhook (simulate):
```bash
curl -X POST http://localhost:3000/webhook/builderprime \
  -H "Content-Type: application/json" \
  -d '{
    "event": "lead.created",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "source": "Website",
      "service": "Garage Floor"
    }
  }'
```

## 📦 Project Structure

```
groupme-automation/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── routes/
│   │   ├── builderprime.ts   # BuilderPrime webhook routes
│   │   └── groupme.ts        # GroupMe API routes
│   └── services/
│       ├── builderprime.ts   # BuilderPrime event handlers
│       └── groupme.ts        # GroupMe API client
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Deployment

### Deploy to Production:

1. **Choose a hosting platform**: 
   - Heroku
   - Railway
   - DigitalOcean
   - AWS
   - Render

2. **Set environment variables** on your hosting platform

3. **Deploy the code**

4. **Update BuilderPrime webhook URL** to your production URL

### Example: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

## 🔒 Security

- Keep your `.env` file private (it's in `.gitignore`)
- Use webhook signature verification for BuilderPrime webhooks
- Consider adding authentication to your API endpoints
- Use HTTPS in production (required by most webhook providers)

## 📝 License

ISC

## 🤝 Support

For issues or questions:
- Check BuilderPrime API documentation
- Check GroupMe API documentation: https://dev.groupme.com/docs/v3
- Review server logs for error messages

## 🎯 Next Steps

- [ ] Add webhook signature verification
- [ ] Add rate limiting
- [ ] Add message queuing for reliability
- [ ] Add database for logging/analytics
- [ ] Add more event handlers
- [ ] Add retry logic for failed messages
- [ ] Add admin dashboard


