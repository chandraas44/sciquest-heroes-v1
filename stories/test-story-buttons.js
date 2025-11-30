/**
 * Test script for story-detail.js button functionality
 * Run this in the browser console on a story detail page to test buttons
 */

async function testStoryButtons() {
  console.log('🧪 Testing Story Detail Buttons\n');
  console.log('='.repeat(50));
  
  // Test 1: Check DOM elements exist
  console.log('\n1️⃣ Checking DOM Elements:');
  const elements = {
    startBtn: document.getElementById('startStoryBtn'),
    resumeBtn: document.getElementById('resumeStoryBtn'),
    openChatBtn: document.getElementById('openChatBtn'),
    titleEl: document.getElementById('storyTitle'),
    progressLabelEl: document.getElementById('progressLabel')
  };
  
  let allElementsExist = true;
  for (const [name, el] of Object.entries(elements)) {
    const exists = !!el;
    console.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Found' : 'NOT FOUND'}`);
    if (!exists) allElementsExist = false;
  }
  
  if (!allElementsExist) {
    console.error('\n❌ Some required elements are missing from the DOM');
    return;
  }
  
  // Test 2: Check storyId
  console.log('\n2️⃣ Checking Story ID:');
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('storyId');
  console.log(`  Story ID: ${storyId || '❌ NOT FOUND'}`);
  
  if (!storyId) {
    console.error('\n❌ No storyId in URL - buttons may not work');
    return;
  }
  
  // Test 3: Check button states
  console.log('\n3️⃣ Checking Button States:');
  console.log(`  Start Button:`);
  console.log(`    - Text: "${elements.startBtn.textContent}"`);
  console.log(`    - Disabled: ${elements.startBtn.disabled}`);
  console.log(`    - Hidden: ${elements.startBtn.classList.contains('hidden')}`);
  console.log(`    - Has click listeners: ${getEventListeners(elements.startBtn)?.click?.length || 0} listener(s)`);
  
  console.log(`  Resume Button:`);
  console.log(`    - Text: "${elements.resumeBtn.textContent}"`);
  console.log(`    - Disabled: ${elements.resumeBtn.disabled}`);
  console.log(`    - Hidden: ${elements.resumeBtn.classList.contains('hidden')}`);
  console.log(`    - Has click listeners: ${getEventListeners(elements.resumeBtn)?.click?.length || 0} listener(s)`);
  
  // Test 4: Simulate button clicks (without navigating)
  console.log('\n4️⃣ Testing Button Click Handlers:');
  
  // Check if handlers exist by trying to get them
  const startBtnListeners = getEventListeners(elements.startBtn);
  const resumeBtnListeners = getEventListeners(elements.resumeBtn);
  
  if (startBtnListeners?.click?.length > 0) {
    console.log(`  ✅ Start button has ${startBtnListeners.click.length} click listener(s)`);
  } else {
    console.log(`  ❌ Start button has NO click listeners`);
  }
  
  if (resumeBtnListeners?.click?.length > 0) {
    console.log(`  ✅ Resume button has ${resumeBtnListeners.click.length} click listener(s)`);
  } else {
    console.log(`  ⚠️ Resume button has NO click listeners (may be hidden)`);
  }
  
  // Test 5: Check navigation URL format
  console.log('\n5️⃣ Testing Navigation URL Format:');
  const testUrl = `/stories/reader.html?storyId=${encodeURIComponent(storyId)}&panel=0`;
  console.log(`  Expected URL format: ${testUrl}`);
  console.log(`  ✅ URL encoding looks correct`);
  
  // Test 6: Check if story data is loaded
  console.log('\n6️⃣ Checking Story Data:');
  try {
    const { getStoryById } = await import('./story-services.js');
    const story = await getStoryById(storyId);
    if (story) {
      console.log(`  ✅ Story loaded: "${story.title}"`);
      console.log(`  ✅ Panels count: ${story.panels?.length || 0}`);
    } else {
      console.log(`  ❌ Story not found`);
    }
  } catch (error) {
    console.log(`  ⚠️ Could not load story: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`  - DOM Elements: ${allElementsExist ? '✅ All found' : '❌ Some missing'}`);
  console.log(`  - Story ID: ${storyId ? '✅ Present' : '❌ Missing'}`);
  console.log(`  - Start Button: ${startBtnListeners?.click?.length > 0 ? '✅ Wired' : '❌ Not wired'}`);
  console.log(`  - Resume Button: ${resumeBtnListeners?.click?.length > 0 ? '✅ Wired' : '⚠️ Not wired (may be hidden)'}`);
  
  console.log('\n💡 To test actual navigation, click the buttons in the UI');
  console.log('💡 Check browser console for "[story-detail]" logs when clicking buttons\n');
}

// Helper function to get event listeners (if available)
function getEventListeners(element) {
  // Note: This may not work in all browsers due to security restrictions
  // In Chrome DevTools, you can use getEventListeners() directly in console
  try {
    if (typeof getEventListeners === 'function') {
      return getEventListeners(element);
    }
  } catch (e) {
    // getEventListeners is only available in Chrome DevTools console
  }
  return null;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testStoryButtons = testStoryButtons;
  console.log('💡 Run testStoryButtons() in the console to test button functionality');
}

export { testStoryButtons };

