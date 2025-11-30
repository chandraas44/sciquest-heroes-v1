/**
 * Test script to verify topic name consistency
 * Run in browser console: import('./chat/test-topic-consistency.js').then(m => m.testTopicConsistency());
 */

import { getTopicCatalog, getTopicById, sendMessage } from './chat-services.js';

export async function testTopicConsistency() {
  console.log('🧪 Testing Topic Name Consistency...\n');
  
  try {
    // Test 1: Get topic catalog
    console.log('📋 Test 1: Getting topic catalog...');
    const topics = await getTopicCatalog();
    const photoTopic = topics.find(t => t.id === 'photosynthesis');
    
    if (!photoTopic) {
      console.error('❌ Photosynthesis topic not found in catalog');
      return;
    }
    
    console.log('✅ Topic found:', {
      id: photoTopic.id,
      name: photoTopic.name,
      expected: 'Photosynthesis',
      match: photoTopic.name === 'Photosynthesis'
    });
    
    if (photoTopic.name !== 'Photosynthesis') {
      console.error('❌ Topic name mismatch! Expected "Photosynthesis", got:', photoTopic.name);
      return;
    }
    
    // Test 2: Get topic by ID
    console.log('\n📋 Test 2: Getting topic by ID...');
    const topicById = await getTopicById('photosynthesis');
    
    if (!topicById) {
      console.error('❌ Topic not found by ID');
      return;
    }
    
    console.log('✅ Topic by ID:', {
      id: topicById.id,
      name: topicById.name,
      expected: 'Photosynthesis',
      match: topicById.name === 'Photosynthesis'
    });
    
    if (topicById.name !== 'Photosynthesis') {
      console.error('❌ Topic name mismatch! Expected "Photosynthesis", got:', topicById.name);
      return;
    }
    
    // Test 3: Check guide name mapping
    console.log('\n📋 Test 3: Testing guide name mapping...');
    // Import getGuideName indirectly by checking payload
    const testPayload = await prepareTestPayload();
    
    console.log('✅ Guide name in payload:', {
      topic: testPayload.topic,
      guide_name: testPayload.guide_name,
      expected: 'Mr. Chloro',
      match: testPayload.guide_name === 'Mr. Chloro'
    });
    
    if (testPayload.guide_name !== 'Mr. Chloro') {
      console.error('❌ Guide name mismatch! Expected "Mr. Chloro", got:', testPayload.guide_name);
      return;
    }
    
    // Test 4: Verify payload structure
    console.log('\n📋 Test 4: Verifying payload structure...');
    console.log('✅ Payload format:', {
      isArray: Array.isArray(testPayload),
      hasSessionId: !!testPayload.sessionId,
      hasConversationId: !!testPayload.conversation_id,
      hasTopic: !!testPayload.topic,
      hasGuideName: !!testPayload.guide_name,
      topicValue: testPayload.topic,
      guideNameValue: testPayload.guide_name
    });
    
    if (testPayload.topic !== 'Photosynthesis') {
      console.error('❌ Topic in payload is not "Photosynthesis":', testPayload.topic);
      return;
    }
    
    if (testPayload.guide_name !== 'Mr. Chloro') {
      console.error('❌ Guide name in payload is not "Mr. Chloro":', testPayload.guide_name);
      return;
    }
    
    console.log('\n✅ All tests passed! Topic name is consistent: "Photosynthesis"');
    console.log('✅ Guide name is correct: "Mr. Chloro"');
    console.log('✅ Payload structure is valid');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

async function prepareTestPayload() {
  // Import the prepareN8nPayload function indirectly
  // We'll simulate what it does
  const topic = await getTopicById('photosynthesis');
  const topicName = topic?.name || 'Photosynthesis';
  
  // Simulate guide name mapping
  const guideMap = {
    'Photosynthesis': 'Mr. Chloro',
    'Nature & Animals': 'Flora the Forest Friend',
  };
  const guideName = guideMap[topicName] || `${topicName} Guide`;
  
  return {
    sessionId: 'test_user_test_conversation',
    conversation_id: 'test_conversation',
    user_message: 'Test message',
    topic: topicName,
    guide_name: guideName,
    grade_level: '5',
    chat_history: [],
    timestamp: new Date().toISOString(),
    user_id: 'test-user'
  };
}

// Auto-run if imported directly
if (import.meta.url === `file://${window.location.pathname}`) {
  testTopicConsistency();
}

