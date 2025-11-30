/**
 * n8n Connection Diagnostic Tool
 * Run this in browser console to diagnose why n8n isn't connecting
 */

export async function diagnoseN8n() {
  console.group('🔍 n8n Connection Diagnostics');
  
  // 1. Check environment variables
  console.group('1️⃣ Environment Variables');
  const n8nUrl = import.meta.env?.VITE_N8N_CHAT_URL;
  const useMocks = import.meta.env?.VITE_USE_CHAT_MOCKS;
  console.log('VITE_N8N_CHAT_URL:', n8nUrl || '❌ NOT SET');
  console.log('VITE_USE_CHAT_MOCKS:', useMocks || '❌ NOT SET (defaults to true)');
  console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  console.groupEnd();
  
  // 2. Check chat-services configuration
  console.group('2️⃣ Chat Services Configuration');
  try {
    const { getN8nStatus, isN8nConfigured } = await import('./chat-services.js');
    const status = getN8nStatus();
    console.table(status);
    
    if (!status.configured) {
      console.error('❌ n8n URL not configured');
      console.log('💡 Add VITE_N8N_CHAT_URL to .env file');
    } else if (!status.willUseN8n) {
      console.error('❌ n8n configured but will NOT be used');
      if (status.mockMode) {
        console.error('   Reason: Mock mode is enabled');
        console.log('💡 Set VITE_USE_CHAT_MOCKS=false in .env and restart dev server');
      }
    } else {
      console.log('✅ n8n is configured and will be used');
    }
  } catch (error) {
    console.error('Error loading chat-services:', error);
  }
  console.groupEnd();
  
  // 3. Test n8n connection
  console.group('3️⃣ Test n8n Connection');
  if (n8nUrl) {
    try {
      const testPayload = {
        sessionId: 'test-diagnostic',
        conversation_id: 'test',
        user_message: 'test',
        topic: 'Test',
        topic_id: 'test',
        guide_name: 'Test Guide',
        grade_level: '5',
        chat_history: [],
        timestamp: new Date().toISOString(),
        user_id: 'test-user'
      };
      
      console.log('Sending test request to:', n8nUrl);
      console.log('Payload:', testPayload);
      
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ n8n connection successful!');
        console.log('Response:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ n8n connection failed');
        console.error('Error:', errorText);
      }
    } catch (error) {
      console.error('❌ n8n connection error:', error);
      console.error('This could be:');
      console.error('  - CORS issue (n8n needs to allow your origin)');
      console.error('  - Network issue');
      console.error('  - Invalid URL');
    }
  } else {
    console.warn('⚠️ Cannot test - n8n URL not configured');
  }
  console.groupEnd();
  
  // 4. Recommendations
  console.group('4️⃣ Recommendations');
  if (!n8nUrl) {
    console.log('📝 Add to .env file:');
    console.log('   VITE_N8N_CHAT_URL=https://your-n8n-url/webhook/chat');
  }
  if (useMocks === 'true' || useMocks === undefined) {
    console.log('📝 Add to .env file:');
    console.log('   VITE_USE_CHAT_MOCKS=false');
  }
  if (!n8nUrl || useMocks === 'true' || useMocks === undefined) {
    console.log('🔄 After updating .env:');
    console.log('   1. Stop dev server (Ctrl+C)');
    console.log('   2. Restart: npm run dev');
    console.log('   3. Hard refresh browser (Ctrl+Shift+R)');
  }
  console.groupEnd();
  
  console.groupEnd();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.diagnoseN8n = diagnoseN8n;
  console.log('💡 Run diagnoseN8n() in console to diagnose n8n connection');
}

