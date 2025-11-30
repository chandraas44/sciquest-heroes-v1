# Step-by-Step: Deploy generate-avatar-story Edge Function

## Quick Deployment Guide

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **mojtgwvpexgfawkeofwl**

### Step 2: Navigate to Edge Functions

1. In the left sidebar, click **"Edge Functions"**
   - If you don't see it, click **"Project Settings"** → **"Edge Functions"**

### Step 3: Check if Function Exists

1. Look for `generate-avatar-story` in the functions list
2. **If it exists:**
   - Click on it
   - Click the **"..."** menu (three dots)
   - Select **"Redeploy"** or **"Deploy"**
   - Skip to Step 5

3. **If it doesn't exist:**
   - Continue to Step 4

### Step 4: Create New Function

1. Click **"Deploy a new function"** or **"Create function"** button
2. You'll see options:
   - **Option A: Upload from file** (if available)
     - Select the folder: `supabase/functions/generate-avatar-story`
   - **Option B: Use code editor** (recommended)
     - Function name: `generate-avatar-story`
     - Copy the entire contents of `supabase/functions/generate-avatar-story/index.ts`
     - Paste into the code editor
     - Click **"Deploy"**

### Step 5: Verify Deployment

1. After deployment, you should see:
   - Status: **"Active"** (green)
   - Function name: `generate-avatar-story`
   - Last deployed: (timestamp)

2. Click on the function to view details

### Step 6: Create Storage Bucket (Required for Image Uploads)

1. Go to **SQL Editor** in the Supabase Dashboard
2. Open the migration file: `supabase/migrations/20250128000001_create_comic_images_bucket.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor
5. Click **"Run"** to execute the migration
6. This creates the `comic-images` storage bucket with proper permissions

**Alternative: Manual Bucket Creation**
1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Name: `comic-images`
4. Check **"Public bucket"** (for public read access)
5. File size limit: `50 MB`
6. Allowed MIME types: `image/png, image/jpeg, image/jpg, image/webp`
7. Click **"Create bucket"**
8. Then run the SQL migration to set up the storage policies

### Step 7: Verify Secrets Are Set

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Verify you have:
   - `OPENAI_API_KEY` (should show as masked: `sk-...`)
   - `NANO_BANANA_API_KEY` (should show as masked value)
3. If missing, add them now

### Step 8: Test the Function

1. In the Edge Functions page, click on `generate-avatar-story`
2. Go to the **"Logs"** tab
3. In your app, try clicking **"Start your adventure"**
4. Check the logs - you should see:
   ```
   [generate-avatar-story] Incoming request
   [generate-avatar-story] Generating avatar story
   hasOpenAI: true
   hasNanoBanana: true
   ```

### Step 9: Test in Your App

1. Make sure your dev server is running with `VITE_USE_STORY_MOCKS=false` in `.env`
2. Go to: http://localhost:3001/stories
3. Select a predefined story
4. Click **"Start your adventure"**
5. Check browser console - should see:
   - `[stories] Invoking generate-avatar-story function` ✅
   - No CORS errors ✅
   - Function response with panels ✅

## Troubleshooting

### If deployment fails:
- Check that the code has no syntax errors
- Make sure you copied the entire file content
- Try deploying again

### If function shows errors:
- Check the **Logs** tab for specific error messages
- Verify secrets are set correctly
- Make sure API keys are valid

### If CORS error persists:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check that function status is "Active"

### If you see "Bucket not found" error:
- **Error:** `Bucket not found` (404) when uploading images
- **Solution:** Run the SQL migration `20250128000001_create_comic_images_bucket.sql` in the SQL Editor
- Or manually create the `comic-images` bucket in Storage (see Step 6)

### If you see Nano Banana rate limit errors:
- **Error:** 429 or rate limit message from Nano Banana API
- **Cause:** Your Nano Banana subscription or credits are limiting request rate
- **Solutions:**
  1. **Add credits or upgrade plan:** Ensure your Nano Banana account has enough quota
  2. **Wait between requests:** The function now automatically waits 12 seconds between panel generations
  3. **Retry logic:** The function will automatically retry up to 3 times when rate limited
  4. **Generate fewer panels:** Consider generating fewer images per story for testing
- **Note:** The function will continue with story generation even if some images fail due to rate limits

## Alternative: Manual Code Copy

If the dashboard doesn't have an upload option, you can:

1. Open `supabase/functions/generate-avatar-story/index.ts` in your editor
2. Copy ALL the code (Ctrl+A, Ctrl+C)
3. In Supabase Dashboard → Edge Functions → Create Function
4. Paste the code into the editor
5. Name it: `generate-avatar-story`
6. Click **"Deploy"**

## Need Help?

If you encounter issues:
1. Check the function logs in Supabase Dashboard
2. Check browser console for errors
3. Verify `.env` file has `VITE_USE_STORY_MOCKS=false`
4. Make sure dev server was restarted after changing `.env`

