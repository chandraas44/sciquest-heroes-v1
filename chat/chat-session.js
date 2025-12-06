import {
  getTopicCatalog,
  getTopicById,
  sendMessage,
  saveTranscript,
  loadTranscript,
  generateSessionId,
  logChatEvent,
  isUsingChatMocks
} from './chat-services.js';
import {
  evaluateBadgeRules,
  getBadgeById
} from '/badges/badge-services.js';
import {
  showBadgeCelebration
} from '/shared/badge-celebration.js';
import {
  formatChatMessage
} from './chat-message-formatter.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '/config.js';

const params = new URLSearchParams(window.location.search);
const topicId = params.get('topicId');
const storyRef = params.get('storyRef');
const panelId = params.get('panelId');

const state = {
  topicId: null,
  topic: null,
  messages: [],
  isLoading: false,
  context: { storyRef: storyRef || null, panelId: panelId || null },
  sessionId: null,
  storyTitle: null
};

const topicPickerEl = document.getElementById('topicPicker');
const chatSessionEl = document.getElementById('chatSession');
const chatHeaderEl = document.getElementById('chatHeader');
const topicNameEl = document.getElementById('topicName');
const contextBadgeEl = document.getElementById('contextBadge');
const chatWindowEl = document.getElementById('chatWindow');
const messageInputEl = document.getElementById('messageInput');
const sendBtnEl = document.getElementById('sendBtn');
const quickPromptsEl = document.getElementById('quickPrompts');
const safetyBannerEl = document.getElementById('safetyBanner');
const escalationBtnEl = document.getElementById('escalationBtn');
const backBtnEl = document.getElementById('backBtn');
// Offline banner removed - no longer needed
// const offlineBannerEl = document.getElementById('offlineBanner');

// function showOfflineBannerIfNeeded() {
//   if (!offlineBannerEl) return;
//   const shouldShow = isUsingChatMocks() || navigator.onLine === false;
//   offlineBannerEl.classList.toggle('hidden', !shouldShow);
// }

function renderTopicPicker(topics) {
  topicPickerEl.innerHTML = '';
  topics.forEach((topic) => {
    const card = document.createElement('div');
    card.className =
      'bg-white border-2 border-purple-200 rounded-3xl p-6 cursor-pointer hover:border-purple-300 transition shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]';
    card.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="bg-purple-100 p-4 rounded-full border-2 border-purple-200">
          <div class="text-6xl">${topic.icon}</div>
        </div>
      </div>
      <h3 class="font-fredoka text-2xl text-slate-700 mb-2 text-center">${topic.name}</h3>
      <p class="text-slate-600 text-sm mb-4 text-center">${topic.description}</p>
      <button class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg">
        Start Chat
      </button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      window.location.href = `./index.html?topicId=${topic.id}`;
    });
    topicPickerEl.appendChild(card);
  });
}

function renderMessage(message, isLoading = false) {
  const messageEl = document.createElement('div');
  const isUser = message.role === 'user';
  messageEl.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
  if (isLoading && !isUser) {
    messageEl.innerHTML = `
      <div class="max-w-[80%] bg-[#E8D9FF] border-2 border-[#C8AFFF] text-slate-800 rounded-3xl px-5 py-3 shadow-lg">
        <div class="flex items-center gap-2">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
          </div>
          <span class="text-sm text-purple-700 font-semibold">Thinking...</span>
        </div>
      </div>
    `;
  } else {
    // Format AI messages with bullet points on separate lines
    const messageContent = !isUser && message.content 
      ? formatChatMessage(message.content)
      : escapeHtml(message.content);
    
    messageEl.innerHTML = `
      <div class="max-w-[80%] ${isUser ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold' : 'bg-[#E8D9FF] border-2 border-[#C8AFFF] text-slate-800'} rounded-3xl px-5 py-3 shadow-lg">
        <div class="text-sm leading-relaxed">${messageContent}</div>
      </div>
    `;
  }
  return messageEl;
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMessages() {
  chatWindowEl.innerHTML = '';
  state.messages.forEach((message, index) => {
    const isLastLoading = state.isLoading && index === state.messages.length - 1 && message.role === 'ai' && message.content === '...';
    chatWindowEl.appendChild(renderMessage(message, isLastLoading));
  });
  chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
}

function renderQuickPrompts() {
  if (!state.topic?.quickPrompts) {
    quickPromptsEl.innerHTML = '';
    return;
  }
  quickPromptsEl.innerHTML = '';
  state.topic.quickPrompts.forEach((prompt, idx) => {
    const btn = document.createElement('button');
    btn.className =
      'px-4 py-2 bg-purple-100 border-2 border-purple-200 text-slate-700 rounded-full text-sm font-semibold hover:bg-purple-200 transition';
    btn.textContent = prompt;
    btn.addEventListener('click', async () => {
      messageInputEl.value = prompt;
      await logChatEvent('quick_prompt_used', { topicId: state.topicId, promptIndex: idx });
      handleSendMessage();
    });
    quickPromptsEl.appendChild(btn);
  });
}

function updateContextBadge() {
  if (!state.context.storyRef) {
    contextBadgeEl.classList.add('hidden');
    return;
  }
  contextBadgeEl.classList.remove('hidden');
  let panelText = '';
  if (state.context.panelId) {
    const panelNum = state.context.panelId.replace(/^panel-?/i, '').replace(/^panel/i, '');
    if (panelNum) {
      panelText = ` - Panel ${panelNum}`;
    }
  }
  const badgeText = state.storyTitle
    ? `From: ${state.storyTitle}${panelText}`
    : `From story: ${state.context.storyRef}${panelText}`;
  contextBadgeEl.textContent = badgeText;
  contextBadgeEl.onclick = () => {
    if (state.context.storyRef) {
      let panelParam = '';
      if (state.context.panelId) {
        const panelId = state.context.panelId ? Number(state.context.panelId.replace(/^panel-?/i, '').replace(/^panel/i, '')) - 1 : 0;
        panelParam = `panel=${panelId}`;
      }
      window.location.href = `/stories/reader.html?storyId=${state.context.storyRef}&${panelParam}`;
    }
  };
}

async function handleSendMessage() {
  const messageText = messageInputEl.value.trim();
  if (!messageText || state.isLoading) return;

  const userMessage = {
    role: 'user',
    content: messageText,
    timestamp: new Date().toISOString()
  };

  state.messages.push(userMessage);
  renderMessages();
  messageInputEl.value = '';
  sendBtnEl.disabled = true;
  state.isLoading = true;

  const loadingMessage = { role: 'ai', content: '...', timestamp: new Date().toISOString() };
  state.messages.push(loadingMessage);
  renderMessages();

  await logChatEvent('message_sent', {
    topicId: state.topicId,
    messageLength: messageText.length,
    hasContext: Boolean(state.context.storyRef)
  });

  const aiResponse = await sendMessage(state.topicId, messageText, state.context, state.sessionId, state.messages);
  state.messages.pop();
  state.messages.push(aiResponse);
  renderMessages();
  state.isLoading = false;
  sendBtnEl.disabled = false;

  await saveTranscript(state.sessionId, {
    topicId: state.topicId,
    messages: state.messages,
    context: state.context,
    createdAt: state.messages[0]?.timestamp || new Date().toISOString()
  });
  
  // Evaluate badges on chat message (after transcript is saved)
  const MOCK_CHILD_ID = 'child-akhil'; // Future: from auth
  try {
    const newlyAwarded = await evaluateBadgeRules(MOCK_CHILD_ID, 'chat_message', {
      topicId: state.topicId,
      messageCount: state.messages.filter((m) => m.role === 'user').length,
      storyRef: state.context.storyRef || null,
      sourceFeature: 'chat_session'
    });
    
    // Show celebration for each newly awarded badge (queued)
    for (const award of newlyAwarded) {
      const badge = await getBadgeById(award.badgeId);
      if (badge) {
        showBadgeCelebration(award.badgeId, badge.name, badge.icon);
      }
    }
  } catch (error) {
    console.warn('[chat] Badge evaluation failed', error);
  }
}

async function loadStoryTitle(storyId) {
  if (!storyId) return;
  try {
    const { getStoryById } = await import('/stories/story-services.js');
    const story = await getStoryById(storyId);
    if (story) {
      state.storyTitle = story.title;
      updateContextBadge();
    }
  } catch (error) {
    console.warn('[chat] Could not load story title', error);
  }
}

async function initChatSession() {
  if (!topicId) {
    const topics = await getTopicCatalog();
    renderTopicPicker(topics);
    topicPickerEl.classList.remove('hidden');
    chatSessionEl.classList.add('hidden');
    return;
  }

  topicPickerEl.classList.add('hidden');
  chatSessionEl.classList.remove('hidden');

  const topic = await getTopicById(topicId);
  if (!topic || !topic.name) {
    chatWindowEl.innerHTML = `
      <div class="text-center py-12">
        <p class="text-slate-700 text-lg mb-4">Topic not found. Please go back and select a topic.</p>
        <button onclick="window.location.href='./index.html'" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-600 transition">
          Go to Topic List
        </button>
      </div>
    `;
    return;
  }

  state.topicId = topicId;
  state.topic = topic;
  state.sessionId = generateSessionId();
  topicNameEl.textContent = topic.name || topicId;

  const savedTranscript = loadTranscript(state.sessionId);
  if (savedTranscript && savedTranscript.messages) {
    state.messages = savedTranscript.messages;
  } else {
    // Get icon from topic or use default
    const topicIcon = topic.icon || '🔬';
    const welcomeMessage = {
      role: 'ai',
      content: `Hi! I'm here to help you learn about ${topic.name}! ${topicIcon} What would you like to know?`,
      timestamp: new Date().toISOString()
    };
    state.messages = [welcomeMessage];
  }

  renderMessages();
  renderQuickPrompts();
  updateContextBadge();

  if (state.context.storyRef) {
    await loadStoryTitle(state.context.storyRef);
  }

  await logChatEvent('chat_started', {
    topicId: state.topicId,
    storyRef: state.context.storyRef,
    panelId: state.context.panelId
  });

  await saveTranscript(state.sessionId, {
    topicId: state.topicId,
    messages: state.messages,
    context: state.context,
    createdAt: state.messages[0]?.timestamp || new Date().toISOString()
  });
}

sendBtnEl.addEventListener('click', handleSendMessage);
messageInputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

backBtnEl.addEventListener('click', async () => {
  if (state.sessionId && state.topicId) {
    await logChatEvent('chat_session_ended', {
      topicId: state.topicId,
      messageCount: state.messages.length
    });
  }
  if (state.context.storyRef) {
    const panelId = state.context.panelId ? Number(state.context.panelId.replace(/^panel-?/i, '').replace(/^panel/i, '')) - 1 : 0;
    const panelParam = state.context.panelId ? `&panel=${panelId}` : '';
    const path = state.context.panelId ? "reader.html" : "story.html";
    window.location.href = `/stories/${path}?storyId=${state.context.storyRef}${panelParam}`;
  } else {
    window.location.href = '/stories/index.html';
  }
});

escalationBtnEl.addEventListener('click', () => {
  logChatEvent('escalation_clicked', { topicId: state.topicId });
  alert("That's a great question! You can ask a parent or teacher for help with this. They'll be happy to explain it to you! 👨‍👩‍👧‍👦");
});

// Offline banner functionality removed
// showOfflineBannerIfNeeded();
// window.addEventListener('online', showOfflineBannerIfNeeded);
// window.addEventListener('offline', showOfflineBannerIfNeeded);

/**
 * Check if user is authenticated before allowing access to chat
 */
async function checkAuth() {
  try {
    const supabaseUrl = supabaseConfig.url;
    const supabaseAnonKey = supabaseConfig.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[chat] Supabase config not available, skipping auth check');
      return true; // Allow access if config not available (for development)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '../auth/auth.html?mode=login';
      return false;
    }

    // Verify user profile exists
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('[chat] Error loading profile:', error);
      // Still allow access if there's an error, but log it
      return true;
    }

    if (!profile) {
      window.location.href = '../auth/auth.html?mode=login';
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chat] Auth check failed:', error);
    // In case of error, redirect to auth for safety
    window.location.href = '../auth/auth.html?mode=login';
    return false;
  }
}

// Check authentication before initializing chat
checkAuth().then((isAuthenticated) => {
  if (isAuthenticated) {
    initChatSession();
  }
});

