# n8n Chat Integration Status

## ✅ Integration Complete

The "Start Chat" button in `/chat/index.html` is now fully connected to n8n with automatic fallback chain.

## How It Works

### Flow:
1. **User clicks "Start Chat"** on any topic card
2. **Navigates to chat session** with `?topicId=<topic-id>`
3. **User sends a message** via the chat input
4. **System attempts n8n first** (if configured)
5. **Falls back to Supabase RPC** if n8n fails
6. **Falls back to mock data** if both fail

### Integration Points:

#### 1. Topic Selection (`chat-session.js`)
- `renderTopicPicker()` creates topic cards with "Start Chat" buttons
- Clicking navigates to: `./index.html?topicId=${topic.id}`
- This initializes the chat session with the selected topic

#### 2. Message Sending (`chat-session.js`)
- `handleSendMessage()` is called when user sends a message
- Calls `sendMessage()` with:
  - `topicId`: Current topic ID
  - `message`: User's message text
  - `context`: Story/panel context (if any)
  - `sessionId`: Current chat session ID
  - `messages`: Full chat history array

#### 3. n8n Integration (`chat-services.js`)
- `sendMessage()` implements fallback chain:
  1. **n8n** (if `VITE_N8N_CHAT_URL` is set and not in mock mode)
  2. **Supabase RPC** (`get_ai_response`)
  3. **Mock data** (final fallback)

## Configuration

### Environment Variable
Add to `.env.local` or `.env`:
```bash
VITE_N8N_CHAT_URL=https://your-n8n-instance.com/webhook/chat
```

### Check Status
Open browser console and run:
```javascript
import { getN8nStatus } from './chat/chat-services.js';
console.log(getN8nStatus());
```

This will show:
- `configured`: Whether n8n URL is set
- `url`: The n8n URL (or "Not configured")
- `mockMode`: Whether mock mode is enabled
- `willUseN8n`: Whether n8n will actually be used

## Logging

The integration includes comprehensive logging:

### On Module Load:
- `[chat] n8n integration enabled: <url>` or
- `[chat] n8n integration disabled (VITE_N8N_CHAT_URL not set)`

### On Message Send:
- `[chat] Attempting n8n API call...`
- `[chat] n8n payload prepared: {...}`
- `[chat] Sending request to n8n: <url>`
- `[chat] n8n response received: {...}`
- `[chat] n8n API call successful`

### On Failure:
- `[chat] N8N failed, trying Supabase fallback`
- `[chat] Supabase RPC failed, using mock fallback`

## n8n Payload Format

The system sends this payload to n8n:

```json
{
  "sessionId": "chat_1234567890_abc123",
  "conversation_id": "abc123",
  "user_message": "How do plants make food?",
  "topic": "Photosynthesis",
  "topic_id": "photosynthesis",
  "guide_name": "Mr. Chloro – Plant Wizard",
  "grade_level": "5",
  "chat_history": [
    {
      "role": "guide",
      "content": "Hi! I'm here to help...",
      "timestamp": "2025-01-XX..."
    },
    {
      "role": "user",
      "content": "How do plants make food?",
      "timestamp": "2025-01-XX..."
    }
  ],
  "timestamp": "2025-01-XX...",
  "user_id": "user-uuid-or-guest-user"
}
```

## n8n Response Format

n8n should return JSON with one of these fields:
- `response` (preferred)
- `content`
- `message`
- `answer`
- `ai_response`
- `text`

The system will extract the AI response from the first available field.

## Testing

### 1. Check Configuration
```javascript
// In browser console
import { getN8nStatus } from './chat/chat-services.js';
console.log(getN8nStatus());
```

### 2. Test Chat Flow
1. Navigate to `/chat/index.html`
2. Click "Start Chat" on any topic
3. Type a message and send
4. Check browser console for n8n logs
5. Verify response comes from n8n (check logs)

### 3. Test Fallback
- Disable n8n URL → Should use Supabase RPC
- Disable Supabase → Should use mock data
- Check console logs to verify fallback chain

## Troubleshooting

### n8n Not Being Called
1. Check `VITE_N8N_CHAT_URL` is set in `.env.local`
2. Check `VITE_USE_CHAT_MOCKS` is not `'true'`
3. Check browser console for configuration logs
4. Verify Supabase config is available (n8n only works if not in mock mode)

### n8n Returns Error
1. Check n8n webhook URL is correct
2. Verify n8n webhook accepts POST requests
3. Check n8n response format matches expected format
4. Review console logs for error details

### Response Format Issues
- n8n should return JSON with `response`, `content`, `message`, `answer`, `ai_response`, or `text` field
- Check console logs: `[chat] n8n response received: {...}`
- System will log available keys if response format is unexpected

## Status: ✅ Ready for Production

The integration is complete and ready to use. Just add `VITE_N8N_CHAT_URL` to your environment variables and start chatting!

