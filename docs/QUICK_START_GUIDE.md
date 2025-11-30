# Quick Start Guide: Creating Test Files Manually

## Prerequisites
- Node.js and npm installed
- Playwright installed (`npm install @playwright/test`)
- Project located at: `C:\Users\Latha\.cursor\worktrees\sciquest-heroes-v1_Latha\osHiv`

## Step-by-Step Instructions

### Step 1: Navigate to Project Directory
```powershell
cd C:\Users\Latha\.cursor\worktrees\sciquest-heroes-v1_Latha\osHiv
```

### Step 2: Verify Helper File
Check if the helper file exists and has content:
```powershell
node -e "const fs = require('fs'); const size = fs.readFileSync('tests/utils/parent-test-helpers.js', 'utf8').length; console.log('Helper file size:', size, 'bytes'); if (size < 8000) { console.log('ERROR: Helper file is too small or empty!'); }"
```

**Expected:** Helper file size should be ~8,610 bytes

### Step 3: Create Test File Using Your Preferred Method

#### Method A: Using VS Code or Any Text Editor (Easiest)

1. Open your text editor (VS Code, Notepad++, etc.)
2. Create a new file: `tests/parent-enrollment-comprehensive.spec.js`
3. Open the file: `docs/PARENT_ENROLLMENT_TEST_FILE_COMPLETE.js`
4. Copy ALL content from that file (starting from `import { test, expect }...`)
5. Paste into `tests/parent-enrollment-comprehensive.spec.js`
6. **IMPORTANT:** Save with UTF-8 encoding (not UTF-8 with BOM)
7. Verify file size is > 20,000 bytes

#### Method B: Using PowerShell

1. Open PowerShell in project root
2. Run this command (copy the entire block):
```powershell
$content = Get-Content docs\PARENT_ENROLLMENT_TEST_FILE_COMPLETE.js -Raw
# Remove the header comments (first 6 lines)
$lines = $content -split "`n"
$testCode = ($lines[6..($lines.Length-1)] -join "`n")
$testCode | Set-Content -Path tests\parent-enrollment-comprehensive.spec.js -Encoding utf8
Write-Host "Test file created. Size: $((Get-Item tests\parent-enrollment-comprehensive.spec.js).Length) bytes"
```

#### Method C: Using Node.js Script

1. Create file `create-test.js` in project root:
```javascript
const fs = require('fs');
const path = require('path');

// Read the complete test file
const sourceFile = path.join(__dirname, 'docs', 'PARENT_ENROLLMENT_TEST_FILE_COMPLETE.js');
const targetFile = path.join(__dirname, 'tests', 'parent-enrollment-comprehensive.spec.js');

let content = fs.readFileSync(sourceFile, 'utf8');

// Remove header comments (lines starting with // until the import statement)
const lines = content.split('\n');
let startIdx = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('import { test')) {
    startIdx = i;
    break;
  }
}
content = lines.slice(startIdx).join('\n');

// Write to target
fs.writeFileSync(targetFile, content, 'utf8');
console.log(`✅ Test file created: ${targetFile}`);
console.log(`File size: ${fs.readFileSync(targetFile, 'utf8').length} bytes`);
```

2. Run: `node create-test.js`

### Step 4: Verify Test Discovery

Run this command to verify Playwright can find all tests:
```powershell
npx playwright test parent-enrollment-comprehensive.spec.js --list
```

**Expected Output:**
```
Listing tests:
  [chromium] › parent-enrollment-comprehensive.spec.js:67:3 › Parent Enrollment Comprehensive Tests › PATH 1.1: Parent Signup - Landing Page to Account Selection
  [chromium] › parent-enrollment-comprehensive.spec.js:125:3 › Parent Enrollment Comprehensive Tests › PATH 1.2: Parent Signup - Account Selection to Signup Form
  [chromium] › parent-enrollment-comprehensive.spec.js:173:3 › Parent Enrollment Comprehensive Tests › PATH 1.3: Parent Signup - Complete Signup with Email/Password
  [chromium] › parent-enrollment-comprehensive.spec.js:245:3 › Parent Enrollment Comprehensive Tests › PATH 1.4: Parent Signup - Form Validation (Empty Fields)
  [chromium] › parent-enrollment-comprehensive.spec.js:297:3 › Parent Enrollment Comprehensive Tests › PATH 1.5: Parent Signup - Form Validation (Short Password)
  [chromium] › parent-enrollment-comprehensive.spec.js:354:3 › Parent Enrollment Comprehensive Tests › PATH 2.1: Parent Login - Direct Navigation to Login
  [chromium] › parent-enrollment-comprehensive.spec.js:385:3 › Parent Enrollment Comprehensive Tests › PATH 2.2: Parent Login - Complete Login with Email/Password
  [chromium] › parent-enrollment-comprehensive.spec.js:441:3 › Parent Enrollment Comprehensive Tests › PATH 3.1: Student Enrollment - Kiddo1 (Age 5)
  [chromium] › parent-enrollment-comprehensive.spec.js:441:3 › Parent Enrollment Comprehensive Tests › PATH 3.2: Student Enrollment - kiddo2 (Age 6)
  ... (and so on for all 8 students)
  [chromium] › parent-enrollment-comprehensive.spec.js:573:3 › Parent Enrollment Comprehensive Tests › PATH 4.1: Multiple Student Enrollment - Verify All Linked to Parent
  [chromium] › parent-enrollment-comprehensive.spec.js:610:3 › Parent Enrollment Comprehensive Tests › PATH 4.2: Parent Dashboard - View Enrolled Students
Total: 17 tests in 1 file
```

### Step 5: Run Tests (Optional)

Once verified, you can run the tests:
```powershell
# Run all tests
npx playwright test parent-enrollment-comprehensive.spec.js

# Run a specific test
npx playwright test parent-enrollment-comprehensive.spec.js -g "PATH 1.1"

# Run with UI mode (interactive)
npx playwright test parent-enrollment-comprehensive.spec.js --ui
```

## Troubleshooting

### "No tests found"
- **Check file exists:** `Test-Path tests\parent-enrollment-comprehensive.spec.js`
- **Check file size:** Should be > 20,000 bytes
- **Check encoding:** Must be UTF-8 (not UTF-8 with BOM)
- **Check syntax:** `node -c tests/parent-enrollment-comprehensive.spec.js`

### "Module not found: './utils/parent-test-helpers.js'"
- **Verify helper file exists:** `Test-Path tests\utils\parent-test-helpers.js`
- **Check helper file size:** Should be ~8,610 bytes
- **Verify directory structure:** `tests/utils/` folder must exist

### File shows 0 bytes after creation
- Use `Set-Content` with `-Encoding utf8` in PowerShell
- Or use a text editor and explicitly save as UTF-8
- Avoid `Out-File` without proper encoding flags

## File Checklist

Before running tests, verify:
- [ ] `tests/utils/parent-test-helpers.js` exists (~8,610 bytes)
- [ ] `tests/parent-enrollment-comprehensive.spec.js` exists (>20,000 bytes)
- [ ] `playwright.config.js` exists in project root
- [ ] `.env` file exists with Supabase credentials (for test execution)
- [ ] All files are saved with UTF-8 encoding

## Test Structure Summary

The test file contains:
- **PATH 1:** Parent Signup Flow (5 tests: 1.1-1.5)
- **PATH 2:** Parent Login Flow (2 tests: 2.1-2.2)
- **PATH 3:** Student Enrollment (8 tests: 3.1-3.8, one per student)
- **PATH 4:** Multiple Student Enrollment (2 tests: 4.1-4.2)

**Total: 17 tests**

## Next Steps

After creating the file:
1. Verify test discovery works
2. Run a single test to ensure execution works
3. Review test results and fix any application bugs found
4. Generate comprehensive test report

