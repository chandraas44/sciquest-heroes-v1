/**
 * Test script for n8n chat integration
 * Run this in the browser console on /chat/index.html to test the integration
 */

async function testN8nIntegration() {
  console.log('🧪 Testing n8n Chat Integration\n');
  
  // Import chat services
  const { 
    getN8nStatus, 
    isN8nConfigured,
    sendMessage,
    getTopicCatalog,
    generateSessionId
  } = await import('./chat-services.js');
  
  // 1. Check n8n configuration
  console.log('1️⃣ Checking n8n Configuration:');
  const status = getN8nStatus();
  console.table(status);
  
  if (!status.configured) {
    console.error('❌ n8n URL not configured. Add VITE_N8N_CHAT_URL to .env');
    return;
  }
  
  if (!status.willUseN8n) {
    console.warn('⚠️ n8n is configured but will not be used because:');
    if (status.mockMode) {
      console.warn('   - Mock mode is enabled (VITE_USE_CHAT_MOCKS=true)');
      console.warn('   - Set VITE_USE_CHAT_MOCKS=false to use n8n');
    }
    return;
  }
  
  console.log('✅ n8n is configured and will be used\n');
  
  // 2. Get a topic for testing
  console.log('2️⃣ Getting topics:');
  const topics = await getTopicCatalog();
  console.log(`Found ${topics.length} topics`);
  const testTopic = topics[0] || topics.find(t => t.id === 'photosynthesis');
  if (!testTopic) {
    console.error('❌ No topics found');
    return;
  }
  console.log(`Using topic: ${testTopic.name} (${testTopic.id})\n`);
  
  // 3. Test sending a message
  console.log('3️⃣ Testing message send:');
  const testMessage = 'What is photosynthesis?';
  const testSessionId = generateSessionId();
  const testMessages = [
    {
      role: 'ai',
      content: `Hi! I'm here to help you learn about ${testTopic.name}! ${testTopic.icon} What would you like to know?`,
      timestamp: new Date().toISOString()
    }
  ];
  
  console.log(`Sending: "${testMessage}"`);
  console.log(`Session ID: ${testSessionId}`);
  console.log(`Topic ID: ${testTopic.id}`);
  console.log('⏳ Waiting for response...\n');
  
  try {
    const startTime = Date.now();
    const response = await sendMessage(
      testTopic.id,
      testMessage,
      {},
      testSessionId,
      testMessages
    );
    const duration = Date.now() - startTime;
    
    console.log('✅ Response received:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Role: ${response.role}`);
    console.log(`   Content: ${response.content.substring(0, 100)}...`);
    console.log(`   Safety Flagged: ${response.safetyFlagged}`);
    console.log(`   Timestamp: ${response.timestamp}`);
    
    // Check if response looks like it came from n8n
    if (response.content && response.content.length > 50) {
      console.log('\n✅ Response appears to be from n8n (longer than mock responses)');
    } else {
      console.log('\n⚠️ Response might be from fallback (short response)');
    }
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
  
  console.log('\n✅ Test complete! Check the console logs above for n8n API calls.');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testN8nIntegration = testN8nIntegration;
  console.log('💡 Run testN8nIntegration() in the console to test n8n integration');
}

export { testN8nIntegration };

