# Edge Function Setup Guide

## API Keys Configuration

The `generate-avatar-story` Edge Function requires two API keys to enable AI-powered story and image generation.

### Required API Keys

1. **OpenAI API Key** - For AI story generation
2. **Nano Banana API Key** - For Nano Banana image generation

### How to Add API Keys

#### Method 1: Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **"Add new secret"** and add:

   **Secret 1:**
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-...`)
   - Click **"Save"**

   **Secret 2:**
   - **Name:** `NANO_BANANA_API_KEY`
   - **Value:** Your Nano Banana API key (Bearer token)
   - Click **"Save"**

5. **Important:** After adding secrets, you may need to redeploy the Edge Function for changes to take effect.

#### Method 2: Supabase CLI

If you're using the Supabase CLI locally:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here

# Set Nano Banana API key
supabase secrets set NANO_BANANA_API_KEY=your-nano-banana-api-key-here
```

### Getting Your API Keys

#### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (it starts with `sk-`)
6. **Important:** Save it immediately - you won't be able to see it again!

#### Nano Banana API Key

1. Log in to your Nano Banana account
2. Go to the API / developer section
3. Create or copy your API key
4. Save it securely

### Verifying Setup

After adding the secrets:

1. The Edge Function will automatically use them when called
2. Check the Edge Function logs in Supabase Dashboard:
   - Go to **Edge Functions** → **generate-avatar-story** → **Logs**
   - Look for messages like:
     - `[generate-avatar-story] Generating avatar story` with `hasOpenAI: true` and `hasNanoBanana: true`
3. If keys are missing, the function will fall back to template-based generation (no AI)

### Fallback Behavior

- **If `OPENAI_API_KEY` is missing:** The function uses a template-based story generator (still works, but not AI-powered)
- **If `NANO_BANANA_API_KEY` is missing:** The function generates the story but won't create images (panels will have `imageUrl: null`)
- **If both are missing:** The function still works but uses basic templates

### Security Notes

- **Never commit API keys to git** - they are stored as Supabase secrets
- **Never expose API keys in client-side code** - they are only used server-side in Edge Functions
- **Rotate keys regularly** for security
- **Monitor usage** in OpenAI and Replicate dashboards to track costs

### Cost Considerations

- **OpenAI (story generation):** Depends on model and usage
- **Nano Banana (image generation):** Depends on your Nano Banana subscription and credit usage
- **Total per story:** Varies based on provider pricing

Consider implementing:
- Rate limiting to prevent abuse
- Caching to reuse generated stories
- Usage monitoring and alerts

### Troubleshooting

**Issue: "Missing OPENAI_API_KEY" in logs**
- Verify the secret is set in Supabase Dashboard
- Check the secret name is exactly `OPENAI_API_KEY` (case-sensitive)
- Redeploy the Edge Function after adding secrets

**Issue: "Missing NANO_BANANA_API_KEY" in logs**
- Verify the secret is set in Supabase Dashboard
- Check the secret name is exactly `NANO_BANANA_API_KEY` (case-sensitive)
- Redeploy the Edge Function after adding secrets

**Issue: Images not generating**
- Check Nano Banana API key is valid
- Verify you have credits in your Nano Banana account
- Check Edge Function logs for specific error messages

**Issue: Story generation failing**
- Check OpenAI API key is valid
- Verify you have credits/quota in your OpenAI account
- Check Edge Function logs for API error responses

