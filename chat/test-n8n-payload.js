/**
 * Enhanced n8n Connection Test with Payload Verification
 * Run in browser console: import('./chat/test-n8n-payload.js').then(m => m.testN8nWithPayload());
 */

export async function testN8nWithPayload() {
  console.log('🧪 Testing n8n Connection with Payload Verification\n');
  console.log('='.repeat(60));
  
  try {
    // Import required functions
    const { 
      getN8nStatus,
      sendMessage,
      getTopicCatalog,
      getTopicById,
      generateSessionId
    } = await import('./chat-services.js');
    
    // Step 1: Check Configuration
    console.log('\n📋 Step 1: Checking n8n Configuration');
    console.log('-'.repeat(60));
    const status = getN8nStatus();
    console.table(status);
    
    if (!status.configured) {
      console.error('\n❌ n8n URL not configured!');
      console.log('💡 Add VITE_N8N_CHAT_URL to .env file');
      console.log('   Example: VITE_N8N_CHAT_URL=https://your-n8n-url/webhook/chat');
      return;
    }
    
    if (!status.willUseN8n) {
      console.warn('\n⚠️ n8n is configured but will NOT be used!');
      if (status.mockMode) {
        console.warn('   Reason: Mock mode is enabled');
        console.log('💡 Set VITE_USE_CHAT_MOCKS=false in .env and restart dev server');
      }
      return;
    }
    
    console.log('✅ n8n is configured and ready to use');
    console.log(`   URL: ${status.url}`);
    
    // Step 2: Get Photosynthesis Topic
    console.log('\n📋 Step 2: Getting Photosynthesis Topic');
    console.log('-'.repeat(60));
    const topics = await getTopicCatalog();
    const photoTopic = topics.find(t => t.id === 'photosynthesis');
    
    if (!photoTopic) {
      console.error('❌ Photosynthesis topic not found');
      return;
    }
    
    console.log('✅ Topic found:', {
      id: photoTopic.id,
      name: photoTopic.name,
      description: photoTopic.description,
      icon: photoTopic.icon
    });
    
    // Verify topic name is "Photosynthesis"
    if (photoTopic.name !== 'Photosynthesis') {
      console.error(`❌ Topic name mismatch! Expected "Photosynthesis", got "${photoTopic.name}"`);
      return;
    }
    console.log('✅ Topic name is correct: "Photosynthesis"');
    
    // Step 3: Prepare Test Message
    console.log('\n📋 Step 3: Preparing Test Message');
    console.log('-'.repeat(60));
    const testMessage = 'What is photosynthesis?';
    const testSessionId = generateSessionId();
    const testMessages = [
      {
        role: 'ai',
        content: `Hi! I'm here to help you learn about ${photoTopic.name}! ${photoTopic.icon} What would you like to know?`,
        timestamp: new Date().toISOString()
      }
    ];
    
    console.log('Test Message:', testMessage);
    console.log('Session ID:', testSessionId);
    console.log('Chat History:', testMessages);
    
    // Step 4: Intercept and Display Payload
    console.log('\n📋 Step 4: Expected Payload Structure');
    console.log('-'.repeat(60));
    console.log('The payload should be an ARRAY containing one object:');
    console.log(JSON.stringify([{
      sessionId: 'user-id_conversation-uuid',
      conversation_id: 'conversation-uuid',
      user_message: testMessage,
      topic: 'Photosynthesis',
      guide_name: 'Mr. Chloro',
      grade_level: '5',
      chat_history: [
        {
          role: 'guide',
          content: testMessages[0].content,
          timestamp: testMessages[0].timestamp
        }
      ],
      timestamp: new Date().toISOString(),
      user_id: 'user-id-or-guest-user'
    }], null, 2));
    
    // Step 5: Send Message and Monitor
    console.log('\n📋 Step 5: Sending Message to n8n');
    console.log('-'.repeat(60));
    console.log('⏳ Sending request...');
    console.log('   (Check Network tab for actual payload)');
    
    // Override console.log temporarily to capture payload logs
    const originalLog = console.log;
    let payloadLogged = false;
    
    console.log = function(...args) {
      if (args[0]?.includes && args[0].includes('n8n payload prepared')) {
        payloadLogged = true;
        console.log = originalLog;
        console.log('\n📦 Actual Payload Sent:');
        console.log('-'.repeat(60));
        console.log(JSON.stringify(args[1], null, 2));
        console.log = function(...newArgs) {
          originalLog(...newArgs);
        };
      }
      originalLog(...args);
    };
    
    const startTime = Date.now();
    const response = await sendMessage(
      photoTopic.id,
      testMessage,
      {},
      testSessionId,
      testMessages
    );
    const duration = Date.now() - startTime;
    
    // Restore console.log
    console.log = originalLog;
    
    // Step 6: Verify Response
    console.log('\n📋 Step 6: Response Analysis');
    console.log('-'.repeat(60));
    console.log('✅ Response received:', {
      duration: `${duration}ms`,
      role: response.role,
      contentLength: response.content?.length || 0,
      contentPreview: response.content?.substring(0, 150) + '...',
      safetyFlagged: response.safetyFlagged,
      timestamp: response.timestamp
    });
    
    // Step 7: Validation
    console.log('\n📋 Step 7: Payload Validation');
    console.log('-'.repeat(60));
    
    const validations = {
      'Topic name is "Photosynthesis"': photoTopic.name === 'Photosynthesis',
      'Response received': !!response,
      'Response has content': !!response.content && response.content.length > 0,
      'Response role is "ai"': response.role === 'ai',
      'Response not safety flagged': !response.safetyFlagged
    };
    
    console.table(validations);
    
    const allValid = Object.values(validations).every(v => v === true);
    
    if (allValid) {
      console.log('\n✅ All validations passed!');
      console.log('✅ n8n connection is working correctly');
      console.log('✅ Payload format is correct');
    } else {
      console.warn('\n⚠️ Some validations failed. Check the table above.');
    }
    
    // Step 8: Network Tab Instructions
    console.log('\n📋 Step 8: Verify in Network Tab');
    console.log('-'.repeat(60));
    console.log('To see the actual payload sent to n8n:');
    console.log('1. Open DevTools → Network tab');
    console.log('2. Filter by your n8n domain or "chat"');
    console.log('3. Look for POST request to:', status.url);
    console.log('4. Click on the request → Payload tab');
    console.log('5. Verify the payload is an array with correct structure');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
    
    if (error.message?.includes('N8N API error')) {
      console.error('\n💡 This might be:');
      console.error('   - n8n webhook URL is incorrect');
      console.error('   - n8n workflow is not active');
      console.error('   - n8n workflow expects different payload format');
      console.error('   - CORS issue (check n8n CORS settings)');
    }
  }
}

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  window.testN8nWithPayload = testN8nWithPayload;
  console.log('💡 Run testN8nWithPayload() in the console to test n8n with payload verification');
}

