# Replicate Model Version Setup

## Issue: "Invalid version or not permitted"

The Replicate API requires a specific version hash for models, not just the model name.

## Solution Options

### Option 1: Use flux-schnell (Recommended - Already Updated)

The code has been updated to use `black-forest-labs/flux-schnell` which is more accessible. This should work without a version hash.

### Option 2: Get Specific Version Hash for flux-pro

If you want to use `flux-pro` (higher quality, slower), you need to get the version hash:

1. Go to: https://replicate.com/black-forest-labs/flux-pro
2. Look for the **"Version"** section
3. Copy the version hash (looks like: `abc123def456...`)
4. Update the code in `supabase/functions/generate-avatar-story/index.ts`:

```typescript
// Replace this line (around line 408):
const modelVersion = 'black-forest-labs/flux-schnell';

// With:
const modelVersion = 'black-forest-labs/flux-pro:YOUR_VERSION_HASH_HERE';
```

### Option 3: Use Replicate API to Get Latest Version

You can programmatically get the latest version:

```typescript
// Get latest version of flux-pro
const modelInfoResponse = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-pro', {
  headers: {
    'Authorization': `Token ${REPLICATE_API_TOKEN}`
  }
});
const modelInfo = await modelInfoResponse.json();
const latestVersion = modelInfo.latest_version.id; // Use this as version hash
```

## Current Configuration

The code currently uses:
- **Model:** `black-forest-labs/flux-schnell`
- **Why:** More accessible, faster generation, works without version hash
- **Trade-off:** Slightly lower quality than flux-pro, but still excellent

## Testing

After updating, redeploy the Edge Function and test. You should see:
- No "Invalid version" errors
- Images generating successfully
- Faster generation times (flux-schnell is faster than flux-pro)

## Available FLUX Models

1. **flux-schnell** - Fast, good quality (currently used)
2. **flux-pro** - Highest quality, slower (requires version hash)
3. **flux-dev** - Fastest, good for testing (requires version hash)

## Need Help?

If you still get version errors:
1. Check your Replicate API token is valid
2. Verify you have access to the model (some models require payment/credits)
3. Try using flux-schnell (already configured)
4. Check Replicate dashboard for model availability

