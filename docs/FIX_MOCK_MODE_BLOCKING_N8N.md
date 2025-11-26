# Fix: Mock Mode Blocking n8n

## Problem
Chat is showing mock data instead of connecting to n8n, even though `VITE_N8N_CHAT_URL` is configured.

## Root Cause
The `VITE_USE_CHAT_MOCKS` environment variable defaults to `'true'` if not set, which prevents n8n from being used.

## Solution

### Step 1: Update `.env` file
Add or update this line in your `.env` file:

```bash
VITE_USE_CHAT_MOCKS=false
```

Your `.env` file should now have:
```bash
VITE_N8N_CHAT_URL=https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat
VITE_USE_CHAT_MOCKS=false
```

### Step 2: Restart Dev Server
**IMPORTANT**: You MUST restart the dev server for environment variable changes to take effect.

1. Stop the current dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Verify
1. Open browser console (F12)
2. Navigate to `/chat/index.html`
3. You should see:
   ```
   [chat] n8n integration enabled: https://santoshi-atmakuru.n8n-wsk.com/...
   [chat] ✅ Mock mode disabled - n8n will be used
   ```

4. Send a test message
5. You should see:
   ```
   [chat] Attempting n8n API call...
   [chat] n8n payload prepared: {...}
   [chat] Sending request to n8n: ...
   [chat] n8n API call successful
   ```

## How to Check Current Status

### Option 1: Browser Console
Open `/chat/index.html` and check console logs on page load.

### Option 2: Verification Page
Navigate to `/chat/verify-n8n-config.html` and click "Check Configuration"

### Option 3: Test Script
In browser console on `/chat/index.html`:
```javascript
import { getN8nStatus } from './chat-services.js';
console.log(getN8nStatus());
```

Expected output when fixed:
```javascript
{
  configured: true,
  url: "https://santoshi-atmakuru.n8n-wsk.com/...",
  mockMode: false,  // ← Must be false!
  willUseN8n: true  // ← Must be true!
}
```

## Why This Happens

The code checks:
```javascript
if (N8N_CHAT_URL && !shouldUseMockData()) {
  // Use n8n
}
```

And `shouldUseMockData()` returns `true` if:
- `VITE_USE_CHAT_MOCKS` is `'true'` (default), OR
- Supabase config is missing

So even with n8n URL configured, mock mode blocks it.

## After Fixing

Once you set `VITE_USE_CHAT_MOCKS=false` and restart:
- ✅ n8n will be tried first
- ✅ If n8n fails, it falls back to Supabase RPC
- ✅ If Supabase fails, it falls back to mock data
- ✅ Console will show clear logs of which provider is used

