# Deploy Edge Function Guide

## Quick Deploy: generate-avatar-story

After adding API keys, you need to redeploy the Edge Function for the secrets to take effect.

### Method 1: Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Navigate to your project root
cd /path/to/sciquest-heroes-v1

# Deploy the function
supabase functions deploy generate-avatar-story
```

**First time setup?** Install Supabase CLI:
```bash
# Windows (PowerShell)
winget install Supabase.CLI

# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

Then link your project:
```bash
supabase link --project-ref your-project-ref
```

### Method 2: Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**
4. Find `generate-avatar-story` in the list
5. Click the **"..."** menu → **"Redeploy"** or **"Deploy"**
6. Or upload the function folder manually:
   - Click **"Deploy a new function"**
   - Select the `supabase/functions/generate-avatar-story` folder
   - Click **"Deploy"**

### Method 3: Using Supabase CLI from Project Root

If you're in the project root directory:

```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy generate-avatar-story --project-ref YOUR_PROJECT_REF
```

### Verify Deployment

After deployment, verify it worked:

1. **Check Dashboard:**
   - Go to **Edge Functions** → `generate-avatar-story`
   - Status should show as **"Active"**

2. **Test the Function:**
   - Go to **Edge Functions** → `generate-avatar-story` → **"Invoke"**
   - Or test from your app by clicking "Start your adventure"

3. **Check Logs:**
   - Go to **Edge Functions** → `generate-avatar-story` → **"Logs"**
   - Look for: `hasOpenAI: true` and `hasReplicate: true` in the logs

### Troubleshooting

**"Function not found" error:**
- Make sure you're in the correct project
- Verify the function folder exists at `supabase/functions/generate-avatar-story/`

**"Secrets not found" error:**
- Double-check secrets are set in **Project Settings** → **Edge Functions** → **Secrets**
- Secret names must be exactly: `OPENAI_API_KEY` and `REPLICATE_API_TOKEN` (case-sensitive)
- Redeploy after adding secrets

**"Permission denied" error:**
- Make sure you're logged into Supabase CLI: `supabase login`
- Verify you have deployment permissions for the project

### Quick Test Command

After deployment, you can test the function:

```bash
# Get your project URL and anon key from Supabase Dashboard
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-avatar-story \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": "test-story",
    "storySummary": "A test adventure about science"
  }'
```

