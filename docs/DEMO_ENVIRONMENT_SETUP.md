# Demo Environment Setup Guide

## Complete Setup Checklist for Live Demo

This guide ensures everything is ready for a flawless demo presentation to AI enthusiasts.

---

## PRE-DEMO PREPARATION (1-2 days before)

### 1. Test Accounts Setup

#### Child Account (Primary Demo)
- **Name:** Emma (or another clear, memorable name)
- **Grade Level:** 3 (for intermediate level features)
- **Avatar:** Select engaging, friendly avatar
- **Email:** `demo.emma@sciquest.test` (or actual test email)
- **Password:** Set a simple password for demo

**Action Items:**
- [ ] Create account via signup flow
- [ ] Complete profile setup
- [ ] Select grade level: 3
- [ ] Choose avatar
- [ ] Verify account works in all sections

#### Parent Account (For Dashboard Demo)
- **Name:** Demo Parent
- **Email:** `demo.parent@sciquest.test`
- **Child Linked:** Link Emma's account as child
- **Password:** Set simple password

**Action Items:**
- [ ] Create parent account
- [ ] Link Emma's child account
- [ ] Verify parent dashboard access
- [ ] Test child switching functionality

#### Backup Accounts
- [ ] Create Grade 1 account (for beginner quiz demo)
- [ ] Create Grade 5 account (for advanced quiz demo)
- [ ] Keep credentials in secure notes

---

### 2. Browser Setup

#### Primary Browser (Chrome/Edge Recommended)
**Profile:** Create dedicated "Demo" browser profile

**Extensions:**
- [ ] Disable ad blockers (may interfere with assets)
- [ ] Disable password managers (for smooth demo flow)
- [ ] Enable React DevTools (if applicable)
- [ ] Enable Redux DevTools (if applicable)

**Settings:**
- [ ] Clear all browsing data
- [ ] Disable "Ask before closing" dialogs
- [ ] Set zoom level to 100%
- [ ] Enable "Always show bookmarks bar"
- [ ] Disable autofill/predictions

**Window Configuration:**
- [ ] Full-screen mode (F11)
- [ ] Developer console docked to bottom
- [ ] Console errors/warnings visible
- [ ] Network tab ready to show

#### Second Monitor (If Available)
- [ ] Supabase dashboard open
- [ ] Database tables visible
- [ ] Analytics/logs visible
- [ ] Alternative: Split screen on single monitor

---

### 3. Bookmark Setup

Create bookmark folder: "SciQuest Demo"

**Essential Bookmarks:**
- [ ] Landing Page: `http://localhost:3000/` (or production URL)
- [ ] Stories List: `http://localhost:3000/stories/index.html`
- [ ] Photosynthesis Story: `http://localhost:3000/stories/photosynthesis-adventure/read`
- [ ] Chat Lobby: `http://localhost:3000/chat/index.html`
- [ ] Chat Session (Photosynthesis): `http://localhost:3000/chat/index.html?topicId=photosynthesis`
- [ ] Badges: `http://localhost:3000/badges/badges.html`
- [ ] Student Dashboard: `http://localhost:3000/dashboards/student-dashboard.html`
- [ ] Photosynthesis Quiz: `http://localhost:3000/quizzes/photosynthesis-quiz-intermediate.html`
- [ ] Parent Dashboard: `http://localhost:3000/parent/dashboard.html`
- [ ] Supabase Dashboard: `https://app.supabase.com/project/[project-id]`

**Quick Access:**
- [ ] Pin bookmark bar
- [ ] Test all links work
- [ ] Verify authentication persists

---

### 4. Demo Data Preparation

#### Story Progress (For Emma Account)
- [ ] Complete "Photosynthesis Adventure" story (all 6 panels)
- [ ] Leave one story incomplete (to show progress tracking)
- [ ] Verify progress saved in localStorage and Supabase

#### Chat Sessions
- [ ] Create 2-3 chat sessions on Photosynthesis topic
- [ ] Include varied questions (simple to complex)
- [ ] Verify chat history loads correctly
- [ ] Check context from story appears

#### Quiz Results
- [ ] Complete intermediate quiz (score 8/10 or higher)
- [ ] Verify results saved in database
- [ ] Check parent dashboard shows score

#### Badges
- [ ] Ensure "First Curious Question" badge is unlocked
- [ ] Verify "Photosynthesis Explorer" badge is unlocked (if applicable)
- [ ] Leave some badges locked (to show progress indicators)
- [ ] Test badge celebration animation works

#### Parent Dashboard Data
- [ ] Verify all child activities visible
- [ ] Check timeline shows recent activities
- [ ] Verify progress metrics display correctly
- [ ] Test child switching works

---

### 5. Technical Checks

#### Development Server
- [ ] Start server: `npm run dev`
- [ ] Verify server runs on correct port (usually 3000)
- [ ] Check for console errors/warnings
- [ ] Verify hot reload works

#### Supabase Connection
- [ ] Verify `.env` file configured
- [ ] Test Supabase connection works
- [ ] Check authentication flows
- [ ] Verify database queries return data
- [ ] Test RLS policies working

#### Browser Console
- [ ] Clear console before demo
- [ ] Verify no errors on page load
- [ ] Check network requests succeed
- [ ] Verify localStorage has demo data
- [ ] Test analytics queue has events

#### Voice Narration
- [ ] Test TTS on story narration
- [ ] Verify child's name pronounced correctly
- [ ] Check voice selection works
- [ ] Test pause/play controls
- [ ] Verify audio doesn't lag

#### Animations & Performance
- [ ] Check page load times (<2s)
- [ ] Verify animations smooth (60fps)
- [ ] Test responsive design (if showing mobile)
- [ ] Check hover effects work
- [ ] Verify transitions smooth

---

### 6. Backup Materials

#### Screenshots
Create folder: `demo-backup-screenshots/`

**Screenshots to Capture:**
- [ ] Landing page (full screen)
- [ ] Stories list with stories visible
- [ ] Story panel showing personalized name
- [ ] Chat interface with conversation
- [ ] Badge gallery (unlocked + locked)
- [ ] Quiz interface (intermediate level)
- [ ] Quiz results page
- [ ] Parent dashboard overview
- [ ] Parent dashboard progress timeline
- [ ] Supabase database tables (if showing)

**Action Items:**
- [ ] Use high-resolution captures
- [ ] Name files descriptively
- [ ] Store in accessible location
- [ ] Test screenshots display correctly

#### Video Recording (Optional but Recommended)
- [ ] Record full demo walkthrough
- [ ] Save as backup if live demo fails
- [ ] Keep file size reasonable
- [ ] Test video plays smoothly

#### Alternative Demo Path
- [ ] Prepare shorter 5-minute version
- [ ] Prepare extended 20-minute version
- [ ] Identify "must-show" vs "nice-to-show" features
- [ ] Practice cutting features if running long

---

### 7. Presentation Tools

#### Screen Sharing
- [ ] Test screen sharing software (Zoom, Teams, etc.)
- [ ] Verify audio works
- [ ] Check screen resolution looks good
- [ ] Test pointer/cursor visibility
- [ ] Practice screen sharing shortcuts

#### Timer Setup
- [ ] Open timer app/website
- [ ] Set for 20 minutes
- [ ] Position where visible but not distracting
- [ ] Test alarm/notification (muted)

#### Notes/Teleprompter
- [ ] Open demo script in second window
- [ ] Make font large enough to read
- [ ] Position below/above main screen
- [ ] Practice glancing without losing flow

#### Backup Internet
- [ ] Have mobile hotspot ready
- [ ] Test hotspot connection
- [ ] Verify can switch quickly
- [ ] Keep hotspot device charged

---

## DAY-OF DEMO CHECKLIST (30 minutes before)

### Final Verification

#### Environment Check
- [ ] All test accounts logged in
- [ ] All bookmarks tested and working
- [ ] Browser console clear
- [ ] Network tab ready
- [ ] Supabase dashboard accessible
- [ ] Development server running
- [ ] No console errors

#### Feature Testing (Quick Run-Through)
- [ ] Landing page loads correctly
- [ ] Story viewer shows personalized name
- [ ] Voice narration works
- [ ] Chat loads and responds
- [ ] Badges display correctly
- [ ] Quiz routing works
- [ ] Parent dashboard shows data

#### Data Verification
- [ ] Demo child account has progress data
- [ ] Chat history exists
- [ ] Quiz results visible
- [ ] Badges unlocked appropriately
- [ ] Parent dashboard has data

#### Presentation Setup
- [ ] Screen sharing tested
- [ ] Audio working
- [ ] Timer set
- [ ] Demo script open
- [ ] Backup screenshots accessible
- [ ] Notes visible

---

## DURING DEMO PROCEDURES

### If Something Breaks

**Quick Recovery Steps:**
1. **Stay Calm** - "Ah, the reality of live demos!"
2. **Acknowledge** - "Let me show you how graceful degradation works..."
3. **Pivot** - Switch to backup screenshot or alternative feature
4. **Continue** - Don't let one issue derail entire demo

**Common Issues & Solutions:**

**Issue:** Page won't load
- **Solution:** Refresh once, if still fails, show screenshot
- **Talking Point:** "This demonstrates our offline-first architecture..."

**Issue:** Voice narration doesn't work
- **Solution:** Skip voice, point out name in text instead
- **Talking Point:** "The personalization works in text too..."

**Issue:** Chat doesn't respond
- **Solution:** Show chat interface, mention it's AI-powered
- **Talking Point:** "The chat uses n8n workflows for AI responses..."

**Issue:** Badges don't show
- **Solution:** Show badge gallery screenshot
- **Talking Point:** "Here's the badge system in action..."

### Time Management

**If Running Over Time:**
- Skip Step 7 (Parent Dashboard) - mention it briefly
- Condense technical deep dive
- Focus on core features: stories, chat, badges

**If Running Under Time:**
- Expand technical deep dive
- Show parent dashboard in detail
- Demonstrate grade-level differences
- Show code structure briefly

---

## POST-DEMO ACTIONS

### Immediate Follow-Up
- [ ] Save demo session recording (if recorded)
- [ ] Note any issues that occurred
- [ ] Collect questions asked
- [ ] Save any console logs/errors

### Follow-Up Materials to Prepare
- [ ] GitHub repository link
- [ ] Technical architecture document
- [ ] Demo account access credentials
- [ ] Feature status document
- [ ] Roadmap/vision document

### Documentation Updates
- [ ] Update demo script based on what worked/didn't
- [ ] Note common questions for future Q&A prep
- [ ] Document any bugs/issues discovered
- [ ] Update setup guide with learnings

---

## DEMO ACCOUNT CREDENTIALS (Store Securely)

### Test Accounts

**Child Account - Emma:**
```
Email: demo.emma@sciquest.test
Password: [SET SECURE PASSWORD]
Grade: 3
Name: Emma
```

**Parent Account:**
```
Email: demo.parent@sciquest.test
Password: [SET SECURE PASSWORD]
Linked Child: Emma
```

**Backup Accounts:**
```
Grade 1: demo.grade1@sciquest.test
Grade 5: demo.grade5@sciquest.test
```

### Supabase Access
```
Project URL: [YOUR SUPABASE URL]
API Key: [YOUR ANON KEY]
Dashboard: https://app.supabase.com/project/[project-id]
```

### Development Server
```
URL: http://localhost:3000
Command: npm run dev
```

---

## TROUBLESHOOTING GUIDE

### Common Issues

**Issue:** Authentication not working
- Check `.env` file has correct Supabase credentials
- Verify Supabase project is active
- Clear browser cache and localStorage
- Check browser console for errors

**Issue:** Stories not loading
- Verify mockStories.json file exists
- Check Supabase stories table has data
- Verify `VITE_USE_STORY_MOCKS` setting
- Check network tab for failed requests

**Issue:** Voice narration not working
- Verify browser supports Web Speech API
- Check browser permissions for audio
- Test in Chrome/Edge (best TTS support)
- Verify voices are loaded (check console)

**Issue:** Badges not showing
- Verify badge data exists in localStorage
- Check badge-services.js loads correctly
- Verify badge evaluation rules loaded
- Check console for badge-related errors

**Issue:** Quiz routing incorrect
- Verify user profile has grade_level set
- Check quiz-routing.js logic
- Verify quiz files exist (beginner/intermediate/advanced)
- Test with different grade levels

---

## FINAL CHECKLIST (5 Minutes Before Demo)

- [ ] All accounts logged in and tested
- [ ] All bookmarks work
- [ ] Browser console clear
- [ ] Supabase dashboard accessible
- [ ] Server running smoothly
- [ ] Voice narration tested
- [ ] Screen sharing working
- [ ] Timer set
- [ ] Demo script visible
- [ ] Backup screenshots accessible
- [ ] Internet connection stable
- [ ] Mobile hotspot ready as backup
- [ ] Confident and ready!

**Remember:** Even if something goes wrong, you know the platform inside and out. Use it as an opportunity to show your technical knowledge and problem-solving skills. The demo is about showing the vision and impact, not perfection. 🚀

