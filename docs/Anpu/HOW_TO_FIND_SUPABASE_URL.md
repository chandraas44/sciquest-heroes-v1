# How to Find Your Supabase URL

## Step-by-Step Instructions

### Step 1: Log into Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your Supabase account credentials

### Step 2: Select Your Project

1. You'll see a list of your Supabase projects
2. Click on the project you want to use
3. This will take you to the project dashboard

### Step 3: Navigate to API Settings

1. In the left sidebar, click on **Settings** (gear icon at the bottom)
2. In the Settings menu, click on **API**

### Step 4: Find Your Project URL

On the API settings page, you'll see:

#### **Project URL**
- This is your Supabase URL
- Format: `https://xxxxx.supabase.co`
- Example: `https://mojtgwvpexgfawkeofwl.supabase.co`

#### **Project API keys**
- **anon/public** key - This is your `VITE_SUPABASE_ANON_KEY`
- **service_role** key - Keep this secret (not for client-side use)

### Step 5: Copy the Values

1. **Copy the Project URL** - This goes in `.env` as `VITE_SUPABASE_URL`
2. **Copy the anon/public key** - This goes in `.env` as `VITE_SUPABASE_ANON_KEY`

## Visual Guide

```
Supabase Dashboard
  └─> Select Project
      └─> Settings (left sidebar, bottom)
          └─> API
              ├─> Project URL: https://xxxxx.supabase.co  ← Copy this
              └─> Project API keys
                  └─> anon/public: eyJhbGci...  ← Copy this
```

## Alternative: From Project Settings

You can also find the URL in:

1. **Settings** → **General**
2. Look for **Reference ID** or **Project URL**
3. The URL format is: `https://[reference-id].supabase.co`

## Quick Reference

### What You Need:
- **Project URL**: `https://[your-project-id].supabase.co`
- **Anon Key**: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Where to Find:
- **Location**: Settings → API
- **Section**: "Project URL" and "Project API keys"

## Example .env File

After copying from Supabase dashboard, your `.env` file should look like:

```env
VITE_SUPABASE_URL=https://mo1jtgwvp1exgfawk1eofwl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1N1iIsInR5cCI61IkpXVCJ9.eyJpc3MiOiJ1zdXBhYmFzZSIsInJlZiI6Im1van1Rnd3ZwZXhnZmF3a2VvZndsIi1wicm9sZSI6ImFub24iLCJpYXQiO1E3NjI5MDEyMTIsImV4cCI16MjA3ODQ3NzIxMn0.5Hg813LoVUWi4Yt5Ef1fLlH-ZmI093MbKL7uE1Yl_pWSU
```

## Troubleshooting

### Can't Find Settings?
- Make sure you're logged into the correct Supabase account
- Ensure you have access to the project (you need to be a project member)

### Can't See API Section?
- You need to be a project owner or have admin permissions
- Contact the project owner if you don't have access

### URL Format Looks Wrong?
- Supabase URLs always follow: `https://[project-id].supabase.co`
- Project ID is a random string of letters/numbers
- If your URL looks different, you might be looking at the wrong field

## Security Note

⚠️ **Important**: 
- The **anon/public** key is safe to use in client-side code
- The **service_role** key should NEVER be exposed in client-side code
- Only use the **anon/public** key in your `.env` file for frontend applications

---

**Last Updated**: 2025-01-15

