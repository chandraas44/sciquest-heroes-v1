# Quiz Routing Validation URLs

## Overview
Quiz routing functionality routes users to grade-appropriate quizzes for Photosynthesis stories based on their age/grade level.

**Routing Logic:**
- **K-2 (Ages 5-7)** → `/quizzes/photosynthesis-quiz-beginner.html`
- **3-4 (Ages 8-9)** → `/quizzes/photosynthesis-quiz-intermediate.html`
- **5-6 (Ages 10-12)** → `/quizzes/photosynthesis-quiz-advanced.html`

---

## ✅ Validation Test URLs

**📧 Test Credentials:** Team members can use their own test users with appropriate age/grade levels. If you need the test users created for this validation, please contact Anpu for credentials.

### Test 1: Beginner User (K-2, Age 6)

**Test User:**
- Email: `test.beginner@example.com`
- Password: *[Contact Anpu for credentials]*
- Age: 6
- Expected Quiz: Beginner

**Validation Steps:**
1. **Login URL:** `http://localhost:3000/auth/auth.html`
   - Login with: `test.beginner@example.com` / *[Password - contact Anpu if needed]*
   
2. **Story Reader URL:** `http://localhost:3000/stories/rainforest-rescue/read`
   - Navigate to this URL after login
   - Story: "Rainforest Rescue Patrol" (Plant Science topic)
   
3. **Click "Take Quiz" Button**
   - Located at the bottom of the story reader page
   
4. **Expected Result:** 
   - Should navigate to: `http://localhost:3000/quizzes/photosynthesis-quiz-beginner.html`
   - Quiz page shows: "Grade Level: K-2", "Difficulty Level: Beginner"

**✅ Status: VERIFIED**

---

### Test 2: Intermediate User (3-4, Age 8)

**Test User:**
- Email: `test.intermediate@example.com`
- Password: *[Contact Anpu for credentials]*
- Age: 8
- Expected Quiz: Intermediate

**Validation Steps:**
1. **Login URL:** `http://localhost:3000/auth/auth.html`
   - Login with: `test.intermediate@example.com` / *[Password - contact Anpu if needed]*
   
2. **Story Reader URL:** `http://localhost:3000/stories/rainforest-rescue/read`
   - Navigate to this URL after login
   - Story: "Rainforest Rescue Patrol" (Plant Science topic)
   
3. **Click "Take Quiz" Button**
   - Located at the bottom of the story reader page
   
4. **Expected Result:**
   - Should navigate to: `http://localhost:3000/quizzes/photosynthesis-quiz-intermediate.html`
   - Quiz page shows: "Grade Level: 3-4", "Difficulty Level: Intermediate"

**✅ Status: VERIFIED**

---

### Test 3: Advanced User (5-6, Age 10)

**Test User:**
- Email: `test.advanced@example.com`
- Password: *[Contact Anpu for credentials]*
- Age: 10
- Expected Quiz: Advanced

**Validation Steps:**
1. **Login URL:** `http://localhost:3000/auth/auth.html`
   - Login with: `test.advanced@example.com` / *[Password - contact Anpu if needed]*
   
2. **Story Reader URL:** `http://localhost:3000/stories/rainforest-rescue/read`
   - Navigate to this URL after login
   - Story: "Rainforest Rescue Patrol" (Plant Science topic)
   
3. **Click "Take Quiz" Button**
   - Located at the bottom of the story reader page
   
4. **Expected Result:**
   - Should navigate to: `http://localhost:3000/quizzes/photosynthesis-quiz-advanced.html`
   - Quiz page shows: "Grade Level: 5-6", "Difficulty Level: Advanced"

**✅ Status: VERIFIED**

---

## 📋 Quick Reference URLs

### Direct Quiz URLs (for verification)
- Beginner: `http://localhost:3000/quizzes/photosynthesis-quiz-beginner.html`
- Intermediate: `http://localhost:3000/quizzes/photosynthesis-quiz-intermediate.html`
- Advanced: `http://localhost:3000/quizzes/photosynthesis-quiz-advanced.html`

### Story URL (used for routing test)
- Plant Science Story: `http://localhost:3000/stories/rainforest-rescue/read`

---

## 🔍 Browser Console Verification

When clicking "Take Quiz", check the browser console (F12) for these logs:

```
[story-viewer] Take Quiz button clicked!
[quiz-routing] Fetching user profile...
[quiz-routing] User age: <AGE>
[quiz-routing] Mapping age to difficulty: <DIFFICULTY>
[story-viewer] Quiz URL determined: /quizzes/photosynthesis-quiz-<DIFFICULTY>.html
[story-viewer] Navigating to: /quizzes/photosynthesis-quiz-<DIFFICULTY>.html
```

---

## 📝 Notes

1. **Test Users:** Team members can use their own test users. Ensure users have correct `age` values in Supabase `user_profiles` table (Age 5-7 for Beginner, 8-9 for Intermediate, 10-12 for Advanced). If you need the test users created for this validation, contact Anpu for credentials.

2. **Story Selection:** Currently testing with "Rainforest Rescue Patrol" story which has `topicTag: "Plant Science"` - this triggers Photosynthesis quiz routing.

3. **Fallback Behavior:** If user profile is missing or age cannot be determined, defaults to Beginner quiz.

4. **Non-Photosynthesis Stories:** Stories without "photosynthesis" or "plant" in topicTag/title/ID will use default quiz route: `/stories/{storyId}/quiz`

---

## ✅ Success Criteria

- [x] Beginner user (age 6) routes to Beginner Quiz ✅ VERIFIED
- [x] Intermediate user (age 8) routes to Intermediate Quiz ✅ VERIFIED
- [x] Advanced user (age 10) routes to Advanced Quiz ✅ VERIFIED
- [x] Console logs show correct routing decisions ✅ VERIFIED
- [x] Quiz pages display correct grade level and difficulty ✅ VERIFIED

**All Tests Verified By:** Anpu  
**Status:** Ready for team review

---

**Last Updated:** 2025-01-21  
**Branch:** Anpu  
**Feature:** Grade-Based Quiz Routing for Photosynthesis Stories  
**Verification Status:** ✅ **ALL TESTS VERIFIED** - Ready for team review

