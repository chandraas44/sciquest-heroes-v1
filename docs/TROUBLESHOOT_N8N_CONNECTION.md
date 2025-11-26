# Troubleshooting: n8n Not Connecting

## Quick Diagnostic

**Run this in your browser console** (on `/chat/index.html`):

```javascript
import('./chat/diagnose-n8n.js').then(m => m.diagnoseN8n());
```

This will show you exactly what's wrong.

## Common Issues & Solutions

### Issue 1: Mock Mode Enabled

**Symptoms:**
- Console shows: `⚠️ Mock mode enabled, skipping n8n call`
- Chat uses mock responses

**Solution:**
1. Open `.env` file in project root
2. Add or update:
   ```bash
   VITE_USE_CHAT_MOCKS=false
   ```
3. **RESTART dev server** (Ctrl+C, then `npm run dev`)
4. **Hard refresh browser** (Ctrl+Shift+R)

**Verify:**
Check console on page load - should see:
```
[chat] ✅ Mock mode disabled - n8n will be used
```

### Issue 2: Environment Variable Not Loaded

**Symptoms:**
- Console shows: `n8n URL not configured`
- Diagnostic shows `VITE_N8N_CHAT_URL: undefined`

**Solution:**
1. Check `.env` file exists in project root (same level as `package.json`)
2. Verify it contains:
   ```bash
   VITE_N8N_CHAT_URL=https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat
   ```
3. **RESTART dev server** (Vite only loads .env on startup)
4. Check for typos (must start with `VITE_`)

**Note:** Vite only reads `.env` files, not `.env.local` unless configured.

### Issue 3: Dev Server Not Restarted

**Symptoms:**
- Updated `.env` but changes not reflected
- Console shows old values

**Solution:**
1. **Stop dev server** (Ctrl+C in terminal)
2. **Start again**: `npm run dev`
3. **Hard refresh browser** (Ctrl+Shift+R or F5)

**Important:** Environment variables are loaded when Vite starts, not on file changes.

### Issue 4: Browser Cache

**Symptoms:**
- Old JavaScript code running
- Environment variables not updating

**Solution:**
1. **Hard refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Or open DevTools → Network tab → Check "Disable cache"
3. Or use Incognito/Private window

### Issue 5: Wrong .env File Location

**Symptoms:**
- Variables set but not loading

**Solution:**
`.env` file must be in project root (same directory as `package.json`):
```
sciquest-heroes-v1/
├── .env          ← HERE
├── package.json
├── vite.config.js
└── ...
```

### Issue 6: CORS Error

**Symptoms:**
- Console shows: `CORS policy` error
- Network tab shows failed request

**Solution:**
Configure n8n webhook to allow your origin:
- Add `http://localhost:3000` to n8n CORS settings
- Or use n8n's public webhook (no CORS restrictions)

### Issue 7: n8n Webhook Not Active

**Symptoms:**
- Request sent but 404 or 500 error
- Network tab shows failed request

**Solution:**
1. Check n8n workflow is **active** (not paused)
2. Verify webhook URL is correct
3. Test webhook directly:
   ```bash
   curl -X POST https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat \
     -H "Content-Type: application/json" \
     -d '{"user_message":"test"}'
   ```

## Step-by-Step Verification

### Step 1: Check Console on Page Load
Open `/chat/index.html` and check console. You should see:
```
[chat] 🔍 Environment Configuration Diagnostics
  VITE_N8N_CHAT_URL (raw): https://...
  VITE_N8N_CHAT_URL (processed): https://...
  VITE_USE_CHAT_MOCKS (raw): false
  VITE_USE_CHAT_MOCKS (processed): false
  hasSupabaseConfig(): true/false
  shouldUseMockData(): false  ← Must be false!
  Will use n8n: true  ← Must be true!
```

### Step 2: Send a Test Message
1. Click "Start Chat" on any topic
2. Send a message
3. Check console for:
   ```
   [chat] Attempting n8n API call...
   [chat] n8n payload prepared: {...}
   [chat] Sending request to n8n: ...
   [chat] n8n API call successful
   ```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Send a message
3. Look for POST request to your n8n URL
4. Check:
   - Status: 200 (success)
   - Request payload: Contains sessionId, user_message, etc.
   - Response: Contains AI response

## Diagnostic Commands

### Check Configuration
```javascript
import { getN8nStatus } from './chat-services.js';
console.log(getN8nStatus());
```

### Test n8n Connection
```javascript
import('./chat/diagnose-n8n.js').then(m => m.diagnoseN8n());
```

### Check Environment Variables
```javascript
console.log('N8N URL:', import.meta.env.VITE_N8N_CHAT_URL);
console.log('Use Mocks:', import.meta.env.VITE_USE_CHAT_MOCKS);
console.log('All VITE vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
```

## Expected .env File

Your `.env` file should look like:
```bash
# Supabase (if using)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# n8n Chat Integration
VITE_N8N_CHAT_URL=https://santoshi-atmakuru.n8n-wsk.com/webhook/8289a1b9-a372-4054-b7c1-616a4e9329d8/chat
VITE_USE_CHAT_MOCKS=false

# Other variables...
```

## Still Not Working?

1. **Run diagnostic**: `diagnoseN8n()` in console
2. **Check terminal**: Look for Vite startup messages
3. **Check browser console**: Look for error messages
4. **Check Network tab**: See if request is being sent
5. **Verify n8n webhook**: Test directly with curl

## Need More Help?

Share the output of:
```javascript
import('./chat/diagnose-n8n.js').then(m => m.diagnoseN8n());
```

This will show exactly what's configured and what's blocking n8n.

