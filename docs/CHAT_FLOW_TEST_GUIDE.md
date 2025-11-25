# Chat Flow Test Guide

## Prerequisites

1. **n8n URL configured** in `.env`:
   ```bash
   VITE_N8N_CHAT_URL=https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat
   ```

2. **Mock mode disabled** (if you want to test n8n):
   ```bash
   VITE_USE_CHAT_MOCKS=false
   ```
   ⚠️ **Important**: If `VITE_USE_CHAT_MOCKS=true`, n8n will NOT be used (it will use mock data instead).

3. **Development server running**:
   ```bash
   npm run dev
   ```

## Test Flow

### Step 1: Open Chat Page
1. Navigate to: `http://localhost:3000/chat/index.html`
2. Open browser DevTools (F12) and go to Console tab
3. You should see: `[chat] n8n integration enabled: <your-url>`

### Step 2: Check n8n Status
In the browser console, run:
```javascript
import { getN8nStatus } from './chat-services.js';
console.log(getN8nStatus());
```

Expected output:
```javascript
{
  configured: true,
  url: "https://santoshi-atmakuru.n8n-wsk.com/webhook/...",
  mockMode: false,
  willUseN8n: true
}
```

### Step 3: Select a Topic
1. You should see topic cards (e.g., "Moon & Gravity", "Plant Power", etc.)
2. Click **"Start Chat"** on any topic
3. URL should change to: `?topicId=<topic-id>`
4. Chat session should open with a welcome message

### Step 4: Send a Test Message
1. Type a message in the chat input (e.g., "What is photosynthesis?")
2. Click **Send** or press Enter
3. Watch the console for n8n logs:

**Expected Console Logs:**
```
[chat] Attempting n8n API call... {topicId: "photosynthesis", messageLength: 25}
[chat] n8n payload prepared: {
  sessionId: "chat_...",
  conversation_id: "...",
  topic: "Photosynthesis",
  guide_name: "Mr. Chloro – Plant Wizard",
  grade_level: "5",
  chat_history_length: 1
}
[chat] Sending request to n8n: https://santoshi-atmakuru.n8n-wsk.com/webhook/...
[chat] n8n response received: {hasResponse: true, ...}
[chat] n8n API call successful
```

### Step 5: Verify Response
1. Check that AI response appears in chat
2. Response should be from n8n (not mock data)
3. Response should be relevant to your question

## Automated Test Script

You can also run the automated test script:

1. Open `/chat/index.html` in browser
2. Open browser console
3. Run:
```javascript
import('./chat/test-n8n-integration.js').then(m => m.testN8nIntegration());
```

This will:
- ✅ Check n8n configuration
- ✅ Get a test topic
- ✅ Send a test message
- ✅ Verify response
- ✅ Show detailed logs

## Troubleshooting

### Issue: "n8n URL not configured"
**Solution**: Check `.env` file has `VITE_N8N_CHAT_URL` set and restart dev server

### Issue: "Mock mode enabled, skipping n8n call"
**Solution**: Set `VITE_USE_CHAT_MOCKS=false` in `.env` and restart dev server

### Issue: "N8N API error: 404"
**Solution**: 
- Verify n8n webhook URL is correct
- Check n8n workflow is active
- Test webhook URL directly with curl:
  ```bash
  curl -X POST https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat \
    -H "Content-Type: application/json" \
    -d '{"user_message":"test"}'
  ```

### Issue: "n8n response format may be unexpected"
**Solution**: 
- Check n8n returns JSON with one of: `response`, `content`, `message`, `answer`, `ai_response`, or `text`
- Check console logs for available keys in response

### Issue: Response is from fallback, not n8n
**Check**:
1. Console shows n8n attempt logs
2. If n8n fails, it will fallback to Supabase RPC
3. If Supabase fails, it will use mock data
4. Check network tab for n8n API call

## Network Tab Verification

1. Open DevTools → Network tab
2. Filter by "chat" or your n8n domain
3. Send a message
4. You should see a POST request to your n8n URL
5. Check:
   - **Request**: Should contain full payload with sessionId, conversation_id, etc.
   - **Response**: Should contain AI response in expected format

## Expected n8n Payload Format

The system sends this to n8n:
```json
{
  "sessionId": "chat_1234567890_abc123",
  "conversation_id": "abc123",
  "user_message": "What is photosynthesis?",
  "topic": "Photosynthesis",
  "topic_id": "photosynthesis",
  "guide_name": "Mr. Chloro – Plant Wizard",
  "grade_level": "5",
  "chat_history": [
    {
      "role": "guide",
      "content": "Hi! I'm here to help...",
      "timestamp": "2025-01-XX..."
    }
  ],
  "timestamp": "2025-01-XX...",
  "user_id": "user-uuid-or-guest-user"
}
```

## Expected n8n Response Format

n8n should return JSON with one of these fields:
```json
{
  "response": "Photosynthesis is the process by which plants..."
}
// OR
{
  "content": "Photosynthesis is the process..."
}
// OR
{
  "message": "Photosynthesis is..."
}
```

## Success Criteria

✅ n8n URL is configured and detected  
✅ Console shows n8n integration enabled  
✅ Clicking "Start Chat" opens chat session  
✅ Sending message triggers n8n API call  
✅ Console shows n8n payload and response logs  
✅ AI response appears in chat  
✅ Response is from n8n (not mock/Supabase)  
✅ Network tab shows successful POST to n8n  

## Next Steps

Once testing is successful:
1. Test with different topics
2. Test with multiple messages in same session
3. Test fallback behavior (disable n8n temporarily)
4. Monitor n8n workflow execution logs
5. Verify chat history is maintained correctly

