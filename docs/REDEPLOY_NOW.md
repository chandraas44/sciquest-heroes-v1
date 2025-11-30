# Quick Redeploy: generate-avatar-story Edge Function

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Sign in if needed
3. Select your project: **mojtgwvpexgfawkeofwl**

### Step 2: Navigate to Edge Functions
1. In the **left sidebar**, click **"Edge Functions"**
   - If you don't see it, click the **☰ menu** (hamburger icon) to expand

### Step 3: Find Your Function
1. Look for **`generate-avatar-story`** in the functions list
2. You should see it with status "Active" or similar

### Step 4: Redeploy the Function

**Option A: Quick Redeploy (if available)**
1. Click on **`generate-avatar-story`** to open it
2. Look for a **"Redeploy"** or **"Deploy"** button
3. Click it
4. Wait for deployment to complete (usually 10-30 seconds)

**Option B: Update Code and Deploy**
1. Click on **`generate-avatar-story`** to open it
2. Click **"Edit"** or the **code editor icon**
3. **Copy the entire contents** of `supabase/functions/generate-avatar-story/index.ts` from your local file
4. **Paste** it into the code editor (replace all existing code)
5. Click **"Deploy"** or **"Save and Deploy"**
6. Wait for deployment to complete

**Option C: Delete and Recreate (if redeploy doesn't work)**
1. Click the **"..."** menu (three dots) next to `generate-avatar-story`
2. Select **"Delete"** (confirm if asked)
3. Click **"Deploy a new function"** or **"Create function"**
4. Function name: `generate-avatar-story`
5. Copy all code from `supabase/functions/generate-avatar-story/index.ts`
6. Paste into the editor
7. Click **"Deploy"**

### Step 5: Verify Deployment
1. After deployment, check:
   - Status shows **"Active"** ✅
   - Last deployed timestamp is recent ✅
   - No error messages ✅

### Step 6: Test the Function
1. Go to your app: **http://localhost:3001/stories**
2. Select a predefined story
3. Click **"Start your adventure"**
4. Check browser console - should see:
   - `[stories] Invoking generate-avatar-story function` ✅
   - No CORS errors ✅
   - No "Invalid version" errors ✅

### Step 7: Check Logs (Optional)
1. In Supabase Dashboard → Edge Functions → `generate-avatar-story`
2. Click **"Logs"** tab
3. You should see:
   - `[generate-avatar-story] Incoming request`
   - `hasOpenAI: true`
   - `hasNanoBanana: true`
   - No image provider errors

## Quick Checklist

- [ ] Opened Supabase Dashboard
- [ ] Navigated to Edge Functions
- [ ] Found `generate-avatar-story`
- [ ] Redeployed the function
- [ ] Verified status is "Active"
- [ ] Tested in app
- [ ] No errors in console

## Troubleshooting

**If "Redeploy" button is not available:**
- Use Option B (Edit code and deploy)

**If deployment fails:**
- Check for syntax errors in the code
- Make sure you copied the entire file
- Try Option C (delete and recreate)

**If function still shows errors:**
- Check the Logs tab for specific error messages
- Verify API keys are set in Secrets
- Make sure `.env` has `VITE_USE_STORY_MOCKS=false`

## Need Help?

If you encounter issues:
1. Check the function logs in Supabase Dashboard
2. Check browser console for errors
3. Verify secrets are set: `OPENAI_API_KEY` and `NANO_BANANA_API_KEY`

