# Supabase URL Configuration for Parent Dashboard and Quiz Routing

## Overview

This document explains how Supabase is configured for the Parent Dashboard and Quiz Routing features, including testing setup and production configuration.

---

## Configuration Method

### Environment Variables

The application reads Supabase configuration from environment variables via `config.js`:

```javascript
// config.js
export const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};
```

### Environment File

The Supabase URL and anon key are stored in a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: The `.env` file is in `.gitignore` and is **not committed** to the repository for security reasons.

---

## Testing Configuration

### Automated Tests Use Mocks

**All automated tests use mocked Supabase clients** - they do **not** connect to a real Supabase instance.

**Test Files:**
- `parent/dashboard-services.test.js`
- `stories/quiz-routing.test.js`

**Mocking Approach:**

1. **Supabase Client Mocked:**
   ```javascript
   // Tests mock the Supabase createClient function
   vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm', () => ({
     createClient: (...args) => mockCreateClientImpl(...args)
   }));
   ```

2. **Config Mocked:**
   ```javascript
   // Tests use fake config values
   vi.mock('../config.js', () => ({
     supabaseConfig: {
       url: 'https://test.supabase.co',  // Fake URL
       anonKey: 'test-anon-key'          // Fake key
     }
   }));
   ```

**Why Mocks?**
- Tests run fast (no network calls)
- Tests are reliable (no dependency on external services)
- Tests can simulate any scenario (errors, empty data, etc.)
- Tests work offline

---

## Production Configuration

### Finding Your Supabase URL

1. **Log into Supabase Dashboard:**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Get Project URL:**
   - Navigate to: **Settings** → **API**
   - Find **Project URL** (format: `https://xxxxx.supabase.co`)
   - Copy this URL

3. **Get Anon Key:**
   - On the same page, find **Project API keys**
   - Copy the **anon/public** key (starts with `eyJ...`)

### Setting Up .env File

1. **Create `.env` file** in project root (if it doesn't exist)

2. **Add your Supabase credentials:**
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart development server** after creating/updating `.env`:
   ```bash
   npm run dev
   ```

### Verifying Configuration

**Check if Supabase is configured:**

1. **In Browser Console:**
   ```javascript
   // Open browser console (F12)
   // Navigate to parent dashboard
   // Check for console logs:
   // - "[dashboard] No Supabase client available" = Not configured
   // - No error = Configured correctly
   ```

2. **In Code:**
   ```javascript
   // config.js will return:
   // - { url: "https://...", anonKey: "..." } = Configured
   // - { url: undefined, anonKey: undefined } = Not configured
   ```

---

## Fallback Behavior

### When Supabase is Not Configured

The application implements graceful fallbacks:

1. **Parent Dashboard:**
   - `getChildProgress()` returns empty progress structure
   - Dashboard still renders (not blank)
   - All UI components work with zero/empty values

2. **Quiz Routing:**
   - `getQuizUrl()` defaults to beginner difficulty
   - Non-photosynthesis stories use fallback URL pattern
   - Application remains functional

### Fallback Chain (Parent Dashboard)

When Supabase is unavailable or returns empty data:

```
Supabase → localStorage → mock data → empty progress
```

1. **Try Supabase** (if configured)
2. **Try localStorage** (if data exists)
3. **Try mock data** (`/parent/mockDashboardData.json`)
4. **Return empty progress** (guaranteed non-null structure)

---

## Current Configuration Status

### Development Environment

- **`.env` file exists**: ✅ Yes (in `.gitignore`)
- **Configuration method**: Environment variables
- **Test configuration**: Mocks (no real connection)

### Production Environment

- **Configuration**: Set via hosting platform environment variables
- **Variables required**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## Security Notes

### Never Commit .env File

The `.env` file contains sensitive credentials and is in `.gitignore`:

```gitignore
# .gitignore
.env
```

### Production Deployment

When deploying to production:

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Other platforms: Check their documentation

2. **Do NOT** commit `.env` to git

3. **Use different Supabase projects** for:
   - Development (local `.env`)
   - Staging (staging environment variables)
   - Production (production environment variables)

---

## Troubleshooting

### Issue: "No Supabase client available"

**Cause**: `.env` file missing or incorrect

**Solution**:
1. Check if `.env` file exists in project root
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Restart development server after changes

### Issue: Tests fail with Supabase errors

**Cause**: Tests should use mocks, not real connections

**Solution**: 
- Tests are already configured with mocks
- If you see real Supabase errors in tests, check that mocks are properly set up
- Tests should never connect to real Supabase

### Issue: Dashboard shows empty data

**Possible Causes**:
1. Supabase not configured → Uses fallback (expected behavior)
2. Supabase configured but no data → Uses localStorage/mock fallback
3. Supabase error → Uses error fallback

**Solution**: Check browser console for logs indicating which fallback was used

---

## Files Related to Supabase Configuration

### Source Files
- `config.js` - Reads environment variables
- `parent/dashboard-services.js` - Uses Supabase for progress data
- `stories/quiz-routing.js` - Uses Supabase for user profile

### Test Files
- `parent/dashboard-services.test.js` - Mocks Supabase
- `stories/quiz-routing.test.js` - Mocks Supabase

### Configuration Files
- `.env` - Environment variables (not committed)
- `.gitignore` - Excludes `.env` from git

---

## Summary

- **Tests**: Use mocks, no real Supabase connection
- **Development**: Uses `.env` file (not committed)
- **Production**: Uses hosting platform environment variables
- **Fallbacks**: Application works even without Supabase configured
- **Security**: `.env` file is never committed to git

---

**Last Updated**: 2025-01-15  
**Status**: Configuration documented, tests use mocks

