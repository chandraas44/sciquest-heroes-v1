# Troubleshooting Edge Function Deployment

## CORS Error: "Response to preflight request doesn't pass access control check"

This error typically means the Edge Function is not deployed or not accessible.

### Step 1: Verify Function is Deployed

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**
4. Check if `generate-avatar-story` appears in the list
5. Status should be **"Active"**

### Step 2: Deploy the Function

If the function is not listed or shows errors:

#### Option A: Via Dashboard

1. In **Edge Functions**, click **"Deploy a new function"** or **"Create function"**
2. Function name: `generate-avatar-story`
3. Upload or paste the code from `supabase/functions/generate-avatar-story/index.ts`
4. Click **"Deploy"**

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref mojtgwvpexgfawkeofwl

# Deploy
supabase functions deploy generate-avatar-story
```

### Step 3: Verify Function Endpoint

After deployment, the function should be accessible at:
```
https://mojtgwvpexgfawkeofwl.supabase.co/functions/v1/generate-avatar-story
```

### Step 4: Test the Function Directly

You can test the function using curl or Postman:

```bash
curl -X POST https://mojtgwvpexgfawkeofwl.supabase.co/functions/v1/generate-avatar-story \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": "test-story",
    "storySummary": "A test adventure"
  }'
```

Replace `YOUR_ANON_KEY` with your anon key from `.env` file.

### Step 5: Check Function Logs

1. Go to **Edge Functions** → `generate-avatar-story` → **Logs**
2. Look for:
   - Any error messages
   - `[generate-avatar-story] Incoming request` when you test
   - `hasOpenAI: true` and `hasReplicate: true` (if keys are set)

### Common Issues

#### Issue: Function returns 404
- **Solution:** Function is not deployed. Deploy it using Step 2.

#### Issue: CORS error persists
- **Solution:** 
  - Make sure the function is deployed
  - Check that OPTIONS handler returns 204 status (already fixed in code)
  - Clear browser cache and try again

#### Issue: "Function not found" in logs
- **Solution:** 
  - Verify function name is exactly `generate-avatar-story` (case-sensitive)
  - Redeploy the function

#### Issue: API keys not working
- **Solution:**
  - Verify secrets are set in **Project Settings** → **Edge Functions** → **Secrets**
  - Secret names must be exactly: `OPENAI_API_KEY` and `REPLICATE_API_TOKEN`
  - Redeploy after adding secrets

### Quick Test Script

Create a test file `test-edge-function.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Edge Function</title>
</head>
<body>
  <button onclick="testFunction()">Test generate-avatar-story</button>
  <pre id="result"></pre>
  
  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
    
    const supabaseUrl = 'https://mojtgwvpexgfawkeofwl.supabase.co';
    const supabaseKey = 'YOUR_ANON_KEY'; // Replace with your anon key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    window.testFunction = async () => {
      const resultEl = document.getElementById('result');
      resultEl.textContent = 'Testing...';
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-avatar-story', {
          body: {
            storyId: 'test-story',
            storySummary: 'A test adventure about science'
          }
        });
        
        if (error) {
          resultEl.textContent = 'Error: ' + JSON.stringify(error, null, 2);
        } else {
          resultEl.textContent = 'Success: ' + JSON.stringify(data, null, 2);
        }
      } catch (err) {
        resultEl.textContent = 'Exception: ' + err.message;
      }
    };
  </script>
</body>
</html>
```

Open this file in your browser and click the button to test.

