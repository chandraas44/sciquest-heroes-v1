# Fix: Storage Bucket and Rate Limit Errors

## Error 1: "Bucket not found" (404)

### Problem
```
[generate-avatar-story] Failed to upload image for panel 1 {
  statusCode: "404",
  error: "Bucket not found",
  message: "Bucket not found"
}
```

### Solution

**Option A: Run SQL Migration (Recommended)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20250128000001_create_comic_images_bucket.sql`
4. Copy the entire SQL content
5. Paste into SQL Editor
6. Click **"Run"**

This creates the `comic-images` bucket with proper permissions.

**Option B: Manual Creation**

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Configure:
   - **Name:** `comic-images`
   - **Public bucket:** ✅ Checked
   - **File size limit:** `50 MB`
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/webp`
4. Click **"Create bucket"**
5. Then run the SQL migration to set up storage policies (Option A)

### Verify Fix

After creating the bucket, test the function again. The error should be gone.

---

## Error 2: Replicate Rate Limit (429)

### Problem
```
[generate-avatar-story] Replicate prediction failed for panel 2 {
  "detail": "Request was throttled. Your rate limit for creating predictions is reduced to 6 requests per minute with a burst of 1 requests while you have less than $5.0 in credit. Your rate limit resets in ~5s.",
  "status": 429,
  "retry_after": 5
}
```

### Understanding the Issue

Replicate limits accounts with less than $5.0 in credit to:
- **6 requests per minute**
- **Burst of 1 request**

Since the function generates 6 images (one per panel), it can easily exceed this limit.

### Solutions

#### Solution 1: Add Credits to Replicate (Best Long-term)

1. Go to [Replicate.com](https://replicate.com/)
2. Sign in to your account
3. Navigate to **Account** → **Billing**
4. Add at least **$5.00** in credits
5. This increases your rate limit significantly

**After adding credits:**
- Rate limit increases to higher tiers
- Function can generate all 6 panels without delays
- Better performance overall

#### Solution 2: Use Automatic Retry (Already Implemented)

The edge function has been updated to:
- ✅ Automatically wait 12 seconds between panel generations
- ✅ Retry up to 3 times when rate limited
- ✅ Respect the `retry_after` value from Replicate's response
- ✅ Continue with story generation even if some images fail

**No action needed** - this is already in the code!

#### Solution 3: Generate Fewer Images (For Testing)

If you're just testing, you can temporarily modify the function to generate fewer panels:

1. Edit `supabase/functions/generate-avatar-story/index.ts`
2. Find the line: `for (let i = 0; i < panels.length; i++)`
3. Change to: `for (let i = 0; i < Math.min(panels.length, 3); i++)` (generates only 3 images)
4. Redeploy the function

**Note:** This is only for testing. The full story experience requires all 6 panels.

### Current Behavior

With the updated function:
- ✅ Waits 12 seconds between each panel generation
- ✅ Automatically retries when rate limited (up to 3 times)
- ✅ Logs clear messages about rate limits
- ✅ Continues generating remaining panels even if some fail
- ✅ Returns story with available images (some may be `null`)

### Monitoring Rate Limits

Check the Edge Function logs in Supabase Dashboard:
- Look for: `Rate limit hit for panel X. Waiting Ys before retry`
- If you see multiple retries, consider adding credits to Replicate

---

## Quick Fix Checklist

- [ ] Run SQL migration to create `comic-images` bucket
- [ ] Verify bucket exists in Storage dashboard
- [ ] Add at least $5 to Replicate account (recommended)
- [ ] Redeploy edge function (if you made code changes)
- [ ] Test story generation
- [ ] Check Edge Function logs for any remaining errors

---

## Expected Behavior After Fixes

✅ **Bucket created:** Images upload successfully to Supabase Storage  
✅ **Rate limits handled:** Function waits and retries automatically  
✅ **Story generation:** Complete stories with images (or partial if rate limited)  
✅ **Error logging:** Clear messages in logs for any issues  

---

## Need More Help?

1. Check Edge Function logs in Supabase Dashboard
2. Verify Replicate account has credits
3. Ensure bucket is public and has correct permissions
4. Review `docs/DEPLOY_STEPS.md` for complete setup guide

