# Routing Troubleshooting Guide

## Quick Fix for Story Reader 404

If you're getting a 404 on `/stories/mystery-moon/read`, follow these steps:

### Step 1: Restart Dev Server
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Wait for "VITE ready" message

### Step 2: Check Terminal Console
When you access `http://localhost:3000/stories/mystery-moon/read`, you should see in the terminal:
```
[Vite Middleware] GET /stories/mystery-moon/read?panel=0 -> path: "/stories/mystery-moon/read", query: "?panel=0"
[Vite] ✓ Rewrote /stories/mystery-moon/read to /stories/reader.html?storyId=mystery-moon&panel=0
```

### Step 3: If Still 404, Check These:

**A. Verify vite.config.js has the middleware:**
- Open `vite.config.js`
- Look for `configureServer` function
- Verify story rewrite rule is present (lines 61-71)

**B. Verify stories/reader.html exists:**
- File should exist at: `stories/reader.html`
- If missing, check git status

**C. Check browser console:**
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab - what status code is returned?

**D. Try direct access:**
- Try: `http://localhost:3000/stories/reader.html?storyId=mystery-moon`
- If this works, the rewrite rule isn't firing
- If this doesn't work, the file itself has issues

### Step 4: Alternative Testing (If Rewrite Doesn't Work)

**For Reviewers - Use Direct URLs:**
Instead of: `http://localhost:3000/stories/mystery-moon/read`
Use: `http://localhost:3000/stories/reader.html?storyId=mystery-moon`

This bypasses the rewrite rule and tests the actual functionality.

## All Test URLs (Fallback Direct URLs)

If rewrite rules don't work, use these direct URLs for testing:

### Routing Tests
- Badges: `http://localhost:3000/badges/badges.html` (not `/child/badges`)
- Dashboard: `http://localhost:3000/parent/dashboard.html` (not `/parent/dashboard`)
- Story Reader: `http://localhost:3000/stories/reader.html?storyId=mystery-moon&panel=0`

### Visual/Functionality Tests
- Stories List: `http://localhost:3000/stories/index.html`
- Story Detail: `http://localhost:3000/stories/story.html?storyId=mystery-moon`
- Comic Viewer: `http://localhost:3000/stories/reader.html?storyId=mystery-moon&panel=0`

These direct URLs will work regardless of rewrite rules.

## Common Issues

### Issue: Middleware not logging
**Solution:** Dev server needs restart after vite.config.js changes

### Issue: 404 on all routes
**Solution:** Check if dev server is actually running on port 3000

### Issue: Routes work in terminal but not browser
**Solution:** Hard refresh browser (Ctrl+Shift+R) or clear cache

### Issue: File not found errors
**Solution:** Verify file paths match exactly (case-sensitive on some systems)

## For Reviewers

If routing doesn't work after restart, use the **direct URLs** above. The functionality is the same - only the URL format differs. The fixes themselves (white background, panel highlighting, etc.) work regardless of URL format.

