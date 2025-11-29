# Photosynthesis Quiz Testing Plan

## Overview
This document provides a comprehensive testing plan for the three Photosynthesis quiz levels (Beginner, Intermediate, Advanced) to ensure all functionality works correctly.

## Prerequisites

1. **Start Development Server**
   ```bash
   cd sciquest-heroes-v1
   npm run dev
   ```
   Server should start at `http://localhost:3000`

2. **Database Setup**
   - Ensure Supabase is configured and connected
   - Run the migration: `supabase/migrations/20250115000000_create_quiz_results_table.sql`
   - Verify `quiz_results` table exists in your Supabase database

3. **Test Accounts**
   - Create test student accounts with different grade levels:
     - Grade K or 1 or 2 (for Beginner quiz)
     - Grade 3 or 4 (for Intermediate quiz)
     - Grade 5 or 6 (for Advanced quiz)

## Test Scenarios

### Scenario 1: Direct Quiz Access (No Authentication)

**Purpose:** Test quiz pages work standalone without login

#### Test Steps:
1. Open browser in incognito/private mode
2. Navigate directly to each quiz:
   - `http://localhost:3000/quizzes/photosynthesis-quiz-beginner.html`
   - `http://localhost:3000/quizzes/photosynthesis-quiz-intermediate.html`
   - `http://localhost:3000/quizzes/photosynthesis-quiz-advanced.html`

#### Expected Results:
- ✅ Quiz page loads with all 10 questions
- ✅ Questions are displayed clearly
- ✅ Options are clickable
- ✅ Can select answers
- ✅ Submit button works
- ✅ Score is calculated correctly
- ✅ Answer key is displayed
- ⚠️ Results may not save to database (expected if not logged in)
- ✅ "Back to Dashboard" button appears (may redirect to auth if not logged in)

---

### Scenario 2: Beginner Quiz (Grades K-2)

**Purpose:** Test beginner quiz routing and functionality for elementary students

#### Test Steps:

**2.1 Create Test Account**
1. Go to `http://localhost:3000/auth/auth.html`
2. Sign up as a student
3. Set grade level to: **K, 1, or 2**
4. Complete signup and avatar selection

**2.2 Access Quiz via Dashboard**
1. Log in with the test account
2. Navigate to Student Dashboard: `http://localhost:3000/dashboards/student-dashboard.html`
3. Scroll to "Quizzes" section
4. Click on "Photosynthesis Quiz" card

**2.3 Verify Routing**
- ✅ Should automatically route to: `photosynthesis-quiz-beginner.html`
- ✅ URL should be: `/quizzes/photosynthesis-quiz-beginner.html`

**2.4 Test Quiz Functionality**
1. Read Question 1
2. Click on an option (select wrong answer first)
3. Verify option highlights
4. Click on correct answer
5. Verify only one option is selected per question
6. Repeat for all 10 questions
7. Click "Submit Quiz"

**2.5 Verify Results**
- ✅ Score is calculated (should show X/10)
- ✅ Correct answers are highlighted in green
- ✅ Incorrect selected answers are highlighted in red
- ✅ Answer key section appears
- ✅ Encouraging message displays based on score:
  - 10/10: "Perfect! You're a photosynthesis expert! 🌟"
  - 7-9: "Excellent work! You understand photosynthesis well! 🌱"
  - 5-6: "Good job! Keep learning about plants! 🌿"
  - 0-4: "Nice try! Review the answers and try again! 💪"

**2.6 Verify Database Save**
1. Check browser console for: "Quiz results saved successfully"
2. Check Supabase database `quiz_results` table:
   - Should have new record with:
     - `quiz_topic`: "photosynthesis"
     - `quiz_level`: "beginner"
     - `score`: (your score)
     - `user_id`: (your user ID)

**2.7 Test Navigation**
1. Click "Back to Dashboard" button
2. ✅ Should return to student dashboard
3. ✅ Should remain logged in

---

### Scenario 3: Intermediate Quiz (Grades 3-4)

**Purpose:** Test intermediate quiz routing and functionality for middle elementary students

#### Test Steps:

**3.1 Create Test Account**
1. Create a new student account
2. Set grade level to: **3 or 4**
3. Complete signup

**3.2 Access Quiz via Dashboard**
1. Log in with the test account
2. Go to Student Dashboard
3. Click "Photosynthesis Quiz" card

**3.3 Verify Routing**
- ✅ Should automatically route to: `photosynthesis-quiz-intermediate.html`
- ✅ URL should be: `/quizzes/photosynthesis-quiz-intermediate.html`

**3.4 Test Quiz Content**
1. Verify questions are appropriate for grades 3-4:
   - Should include terms like "chlorophyll", "carbon dioxide", "glucose"
   - More detailed than beginner level
   - Still age-appropriate
2. Answer all 10 questions
3. Submit quiz

**3.5 Verify Results**
- ✅ Score displays correctly
- ✅ Answer key shows correct answers
- ✅ Results saved to database with `quiz_level`: "intermediate"

---

### Scenario 4: Advanced Quiz (Grades 5-6)

**Purpose:** Test advanced quiz routing and functionality for upper elementary students

#### Test Steps:

**4.1 Create Test Account**
1. Create a new student account
2. Set grade level to: **5 or 6**
3. Complete signup

**4.2 Access Quiz via Dashboard**
1. Log in with the test account
2. Go to Student Dashboard
3. Click "Photosynthesis Quiz" card

**4.3 Verify Routing**
- ✅ Should automatically route to: `photosynthesis-quiz-advanced.html`
- ✅ URL should be: `/quizzes/photosynthesis-quiz-advanced.html`

**4.4 Test Quiz Content**
1. Verify questions are appropriate for grades 5-6:
   - Should include concepts like "chloroplasts", "light-dependent reactions"
   - More complex than intermediate level
   - Real-world applications (deforestation, farming, climate change)
2. Answer all 10 questions
3. Submit quiz

**4.5 Verify Results**
- ✅ Score displays correctly
- ✅ Answer key shows correct answers
- ✅ Results saved to database with `quiz_level`: "advanced"

---

### Scenario 5: Grade Level Edge Cases

**Purpose:** Test routing logic with edge cases and invalid grade levels

#### Test Cases:

**5.1 Grade K (Kindergarten)**
- Create account with grade: **K** or **0**
- ✅ Should route to beginner quiz

**5.2 Grade 2**
- Create account with grade: **2**
- ✅ Should route to beginner quiz

**5.3 Grade 3**
- Create account with grade: **3**
- ✅ Should route to intermediate quiz

**5.4 Grade 4**
- Create account with grade: **4**
- ✅ Should route to intermediate quiz

**5.5 Grade 5**
- Create account with grade: **5**
- ✅ Should route to advanced quiz

**5.6 Grade 6**
- Create account with grade: **6**
- ✅ Should route to advanced quiz

**5.7 No Grade Level**
- Create account without setting grade level (null/empty)
- ✅ Should default to beginner quiz (fallback)

**5.8 Invalid Grade**
- Create account with grade: **7, 8, 9, etc.** (outside K-6 range)
- ✅ Should default to beginner quiz (fallback)

---

### Scenario 6: UI/UX Testing

**Purpose:** Verify user interface and user experience

#### Test Steps:

**6.1 Visual Design**
- ✅ Colors match existing design (purple-pink gradients)
- ✅ Fonts are correct (Fredoka for headings, Inter for body)
- ✅ Icons display correctly (Font Awesome)
- ✅ Layout is responsive on mobile devices
- ✅ Cards have hover effects
- ✅ Buttons have proper styling

**6.2 Interaction**
- ✅ Options highlight on hover
- ✅ Selected option is clearly indicated
- ✅ Submit button is disabled after submission
- ✅ Smooth scrolling to results
- ✅ Loading states work correctly

**6.3 Accessibility**
- ✅ Text is readable
- ✅ Contrast is sufficient
- ✅ Buttons are large enough to click
- ✅ Navigation is intuitive

---

### Scenario 7: Multiple Quiz Attempts

**Purpose:** Test that users can retake quizzes

#### Test Steps:
1. Complete a quiz and submit
2. Go back to dashboard
3. Click "Photosynthesis Quiz" again
4. ✅ Should be able to retake the quiz
5. ✅ New attempt should save as separate record in database
6. ✅ Previous scores should be preserved

---

### Scenario 8: Database Verification

**Purpose:** Verify quiz results are properly stored

#### Test Steps:

**8.1 Check Database Records**
1. Complete quizzes at all three levels
2. Go to Supabase dashboard
3. Check `quiz_results` table

**8.2 Verify Data Integrity**
- ✅ Each quiz attempt creates a new record
- ✅ `user_id` matches the logged-in user
- ✅ `quiz_topic` is "photosynthesis"
- ✅ `quiz_level` is correct (beginner/intermediate/advanced)
- ✅ `score` is between 0-10
- ✅ `total_questions` is always 10
- ✅ `completed_at` timestamp is set
- ✅ `created_at` timestamp is set

**8.3 Query Test**
Run this SQL query in Supabase to verify:
```sql
SELECT 
    quiz_level,
    COUNT(*) as attempts,
    AVG(score) as avg_score,
    MAX(score) as max_score
FROM quiz_results
WHERE quiz_topic = 'photosynthesis'
GROUP BY quiz_level
ORDER BY quiz_level;
```

---

## Test Checklist

### Beginner Quiz (K-2)
- [ ] Direct URL access works
- [ ] Dashboard routing works for grades K, 1, 2
- [ ] All 10 questions display correctly
- [ ] Questions are age-appropriate (simple language)
- [ ] Answer selection works
- [ ] Score calculation is correct
- [ ] Answer key displays
- [ ] Results save to database
- [ ] Back to dashboard works

### Intermediate Quiz (3-4)
- [ ] Direct URL access works
- [ ] Dashboard routing works for grades 3, 4
- [ ] All 10 questions display correctly
- [ ] Questions are age-appropriate (more detailed)
- [ ] Answer selection works
- [ ] Score calculation is correct
- [ ] Answer key displays
- [ ] Results save to database
- [ ] Back to dashboard works

### Advanced Quiz (5-6)
- [ ] Direct URL access works
- [ ] Dashboard routing works for grades 5, 6
- [ ] All 10 questions display correctly
- [ ] Questions are age-appropriate (complex concepts)
- [ ] Answer selection works
- [ ] Score calculation is correct
- [ ] Answer key displays
- [ ] Results save to database
- [ ] Back to dashboard works

### General Functionality
- [ ] Grade level routing logic works correctly
- [ ] Fallback to beginner works for invalid grades
- [ ] Multiple quiz attempts work
- [ ] Database records are created correctly
- [ ] UI is responsive on mobile
- [ ] All navigation links work
- [ ] Error handling works (if not logged in)

---

## Quick Test Script

For quick testing, you can use this sequence:

1. **Test Beginner:**
   - Create account with grade 1
   - Login → Dashboard → Click Quiz
   - Verify routes to beginner quiz
   - Answer all questions → Submit
   - Check database for record

2. **Test Intermediate:**
   - Create account with grade 3
   - Login → Dashboard → Click Quiz
   - Verify routes to intermediate quiz
   - Answer all questions → Submit
   - Check database for record

3. **Test Advanced:**
   - Create account with grade 5
   - Login → Dashboard → Click Quiz
   - Verify routes to advanced quiz
   - Answer all questions → Submit
   - Check database for record

---

## Troubleshooting

### Issue: Quiz doesn't route correctly
- Check browser console for errors
- Verify `determineQuizLevel()` function is imported correctly
- Verify grade_level is set in user profile

### Issue: Results don't save
- Check browser console for errors
- Verify Supabase connection
- Check if user is authenticated
- Verify `quiz_results` table exists

### Issue: Quiz page doesn't load
- Check file paths are correct
- Verify server is running
- Check browser console for 404 errors

---

## Notes

- All three quiz levels use the same UI/UX design
- Questions follow the format: 10 questions, 4 options each
- 30-50% of questions include real-world examples
- Answer keys are always displayed after submission
- Scores are saved for progress tracking

