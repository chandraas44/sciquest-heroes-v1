# Instructions for Manually Creating Playwright Test Files

## Overview
Due to file system sync issues, the test files need to be created manually. Follow these instructions to set up the complete parent enrollment test suite.

## Step 1: Verify Helper File Exists

First, verify that the helper file exists and is correct:

**File:** `tests/utils/parent-test-helpers.js`

**Expected size:** ~8,610 bytes

**Verification command:**
```powershell
cd C:\Users\Latha\.cursor\worktrees\sciquest-heroes-v1_Latha\osHiv
node -e "const fs = require('fs'); console.log('Helper file size:', fs.readFileSync('tests/utils/parent-test-helpers.js', 'utf8').length);"
```

If the file is 0 bytes or missing, you'll need to recreate it (see Step 3).

## Step 2: Create the Main Test File

**File:** `tests/parent-enrollment-comprehensive.spec.js`

**Expected size:** ~20,000+ bytes

**Method 1: Using PowerShell (Recommended)**

1. Open PowerShell in the project root directory:
   ```powershell
   cd C:\Users\Latha\.cursor\worktrees\sciquest-heroes-v1_Latha\osHiv
   ```

2. Copy the complete test file content (provided below) into a PowerShell here-string and write it:
   ```powershell
   $testContent = @'
   [PASTE FULL TEST CONTENT HERE]
   '@
   $testContent | Set-Content -Path tests\parent-enrollment-comprehensive.spec.js -Encoding utf8
   ```

**Method 2: Using a Text Editor**

1. Create a new file: `tests/parent-enrollment-comprehensive.spec.js`
2. Copy and paste the complete test file content (provided below)
3. Save the file with UTF-8 encoding

**Method 3: Using Node.js Script**

1. Create a file `create-test-file.js` in the project root
2. Copy the test content into it (see template below)
3. Run: `node create-test-file.js`

## Step 3: Verify Test Discovery

After creating the file, verify Playwright can discover the tests:

```powershell
npx playwright test parent-enrollment-comprehensive.spec.js --list
```

**Expected output:** Should show ~16 tests:
- PATH 1.1 through PATH 1.5 (5 tests)
- PATH 2.1 and PATH 2.2 (2 tests)
- PATH 3.1 through PATH 3.8 (8 tests - one for each student)
- PATH 4.1 and PATH 4.2 (2 tests)

**Total: 17 tests** (5 + 2 + 8 + 2)

## Step 4: Test File Structure

The test file should contain:

1. **Imports** - Playwright and helper functions
2. **Test Data** - Constants from TEST_DATA
3. **Test Results Storage** - Object to track passed/failed tests
4. **Helper Function** - `recordTestResult()` for tracking
5. **Test Suite** - `test.describe()` block with:
   - `beforeEach` hook for setup
   - `afterAll` hook for cleanup
   - All PATH tests (1.1 through 4.2)
6. **Export** - `export { testResults }` for report generation

## Troubleshooting

### Issue: "No tests found"
**Solution:** 
- Verify file exists: `Test-Path tests\parent-enrollment-comprehensive.spec.js`
- Check file size: Should be > 20,000 bytes
- Verify file encoding is UTF-8
- Check for syntax errors: `node -c tests/parent-enrollment-comprehensive.spec.js`

### Issue: "Module not found: './utils/parent-test-helpers.js'"
**Solution:**
- Verify helper file exists: `Test-Path tests\utils\parent-test-helpers.js`
- Check helper file size: Should be ~8,610 bytes
- Verify exports in helper file include: `TEST_DATA`, `clearLocalStorage`, `waitForPageLoad`, etc.

### Issue: File shows 0 bytes after creation
**Solution:**
- Use PowerShell's `Set-Content` with `-Encoding utf8`
- Or use a text editor and save as UTF-8
- Avoid using `Out-File` without `-NoNewline` for code files

## File Locations

- **Test file:** `tests/parent-enrollment-comprehensive.spec.js`
- **Helper file:** `tests/utils/parent-test-helpers.js`
- **Config file:** `playwright.config.js` (should already exist)

## Next Steps After File Creation

1. Verify test discovery: `npx playwright test --list`
2. Run a single test: `npx playwright test parent-enrollment-comprehensive.spec.js -g "PATH 1.1"`
3. Run all tests: `npx playwright test parent-enrollment-comprehensive.spec.js`
4. Generate report: Tests will automatically generate results in `test-results/` folder

