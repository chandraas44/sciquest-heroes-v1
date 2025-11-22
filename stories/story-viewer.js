import {
  getStoryById,
  getPanelsForStory,
  saveStoryProgress,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks
} from './story-services.js';
import {
  evaluateBadgeRules,
  getBadgeById
} from '../badges/badge-services.js';
import {
  showBadgeCelebration
} from '../shared/badge-celebration.js';
import {
  getQuizUrl
} from './quiz-routing.js';

const params = new URLSearchParams(window.location.search);
// Extract storyId from query params, or fallback to pathname: /stories/{storyId}/read
let storyId = params.get('storyId');
if (!storyId) {
  const pathMatch = window.location.pathname.match(/^\/stories\/([^/]+)\/read$/);
  if (pathMatch) {
    storyId = pathMatch[1];
  }
}
const panelParam = Number(params.get('panel')) || 0;

const storyTitleEl = document.getElementById('viewerStoryTitle');
const panelImageEl = document.getElementById('panelImage');
const panelTagEl = document.getElementById('panelTag');
const panelNarrationEl = document.getElementById('panelNarration');
const panelPositionLabelEl = document.getElementById('panelPositionLabel');
const progressDotsEl = document.getElementById('progressDots');
const helperTitleEl = document.getElementById('helperTitle');
const helperTextEl = document.getElementById('helperText');
const progressSummaryEl = document.getElementById('progressSummary');
const chatCtaBtn = document.getElementById('chatCtaBtn');
const prevBtn = document.getElementById('prevPanelBtn');
const nextBtn = document.getElementById('nextPanelBtn');
const glossaryBtn = document.getElementById('openGlossaryBtn');
const glossaryDialog = document.getElementById('glossaryDialog');
const glossaryList = document.getElementById('glossaryList');
const glossaryCloseBtn = document.getElementById('closeGlossaryBtn');
const offlineBanner = document.getElementById('viewerOfflineBanner');

const state = {
  story: null,
  panels: [],
  currentPanelIndex: 0,
  panelCount: 0
};

function showOfflineBannerIfNeeded() {
  if (!offlineBanner) return;
  const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
  offlineBanner.classList.toggle('hidden', !shouldShow);
}

function renderProgressDots() {
  progressDotsEl.innerHTML = '';
  state.panels.forEach((_, idx) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (idx === state.currentPanelIndex ? ' active' : '');
    dot.title = `Panel ${idx + 1}: ${state.panels[idx]?.narration?.substring(0, 50)}...` || `Panel ${idx + 1}`;
    dot.addEventListener('click', () => {
      // Highlight the clicked dot and show narration
      jumpToPanel(idx);
      // Temporarily highlight the narration area
      highlightNarration();
    });
    progressDotsEl.appendChild(dot);
  });
}

function highlightNarration() {
  // Add a brief highlight animation to the narration element
  if (panelNarrationEl) {
    panelNarrationEl.classList.add('animate-pulse');
    setTimeout(() => {
      panelNarrationEl.classList.remove('animate-pulse');
    }, 600);
  }
}

function updateGlossary(terms = []) {
  glossaryList.innerHTML = '';
  if (!terms.length) {
    glossaryList.innerHTML = '<p class="text-slate-500 text-sm">No glossary terms on this panel.</p>';
    return;
  }
  terms.forEach((term) => {
    const pill = document.createElement('span');
    pill.className = 'glossary-pill px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold';
    pill.textContent = term;
    glossaryList.appendChild(pill);
  });
}

function updatePanelUI() {
  const panel = state.panels[state.currentPanelIndex];
  if (!panel) return;

  panelImageEl.src = panel.imageUrl || '/images/placeholder-story.png';
  panelTagEl.textContent = panel.panelId || `Panel ${state.currentPanelIndex + 1}`;
  panelNarrationEl.textContent = panel.narration;
  panelPositionLabelEl.textContent = `Panel ${state.currentPanelIndex + 1} of ${state.panelCount}`;
  helperTitleEl.textContent = panel.ctaLabel || 'Ask a question';
  helperTextEl.textContent = 'Use the chat companion to dig deeper into this scene.';
  progressSummaryEl.textContent = `Panel ${state.currentPanelIndex + 1}/${state.panelCount}`;
  chatCtaBtn.textContent = panel.ctaLabel || 'Ask the AI about this panel';

  chatCtaBtn.onclick = () => {
    const chatUrl = new URL('../chat/index.html', window.location.origin);
    if (panel.chatTopicId) chatUrl.searchParams.set('topicId', panel.chatTopicId);
    chatUrl.searchParams.set('storyRef', storyId);
    chatUrl.searchParams.set('panelId', panel.panelId ?? `panel-${state.currentPanelIndex + 1}`);
    window.location.href = `${chatUrl.pathname}${chatUrl.search}`;
  };

  prevBtn.disabled = state.currentPanelIndex === 0;
  nextBtn.disabled = state.currentPanelIndex === state.panelCount - 1;

  renderProgressDots();
  updateGlossary(panel.glossaryTerms || []);
}

async function persistProgress(completed = false) {
  await saveStoryProgress({
    storyId,
    lastPanelIndex: state.currentPanelIndex,
    completed
  });
}

async function jumpToPanel(targetIndex) {
  if (targetIndex < 0 || targetIndex >= state.panelCount) return;
  state.currentPanelIndex = targetIndex;
  updatePanelUI();
  
  // Update URL to show current panel
  if (storyId) {
    const cleanUrl = `/stories/${storyId}/read?panel=${targetIndex}`;
    window.history.replaceState({ storyId, panel: targetIndex }, '', cleanUrl);
  }
  
  await persistProgress(targetIndex === state.panelCount - 1);
  await logAnalyticsEvent('panel_viewed', {
    storyId,
    panelId: state.panels[targetIndex]?.panelId,
    panelIndex: targetIndex
  });
}

async function goToNextPanel() {
  if (state.currentPanelIndex >= state.panelCount - 1) {
    await persistProgress(true);
    await logAnalyticsEvent('story_completed', { storyId });
    
    // Evaluate badges on story completion
    const MOCK_CHILD_ID = 'child-akhil'; // Future: from auth
    try {
      const newlyAwarded = await evaluateBadgeRules(MOCK_CHILD_ID, 'story_completed', {
        storyId,
        topicTag: state.story?.topicTag || null,
        sourceFeature: 'story_viewer'
      });
      
      // Show celebration for each newly awarded badge (queued)
      for (const award of newlyAwarded) {
        const badge = await getBadgeById(award.badgeId);
        if (badge) {
          showBadgeCelebration(award.badgeId, badge.name, badge.icon);
        }
      }
    } catch (error) {
      console.warn('[story-viewer] Badge evaluation failed', error);
    }
    
    nextBtn.disabled = true;
    return;
  }
  await jumpToPanel(state.currentPanelIndex + 1);
}

async function goToPreviousPanel() {
  if (state.currentPanelIndex === 0) return;
  await jumpToPanel(state.currentPanelIndex - 1);
}

async function loadStory() {
  if (!storyId) throw new Error('storyId missing');
  const [story, panels] = await Promise.all([getStoryById(storyId), getPanelsForStory(storyId)]);
  if (!story) throw new Error('story not found');
  state.story = story;
  state.panels = panels.length ? panels : story.panels || [];
  state.panelCount = state.panels.length;

  if (!state.panelCount) throw new Error('story has no panels');

  storyTitleEl.textContent = story.title;

  const savedProgress = getStoryProgressSummary(storyId);
  const resumeIndex =
    Number.isFinite(panelParam) && panelParam >= 0 ? panelParam : savedProgress?.lastPanelIndex || 0;
  state.currentPanelIndex = Math.min(resumeIndex, state.panelCount - 1);
}

function wireControls() {
  nextBtn.addEventListener('click', goToNextPanel);
  prevBtn.addEventListener('click', goToPreviousPanel);
  glossaryBtn.addEventListener('click', () => {
    if (glossaryDialog) glossaryDialog.showModal();
  });
  glossaryCloseBtn.addEventListener('click', () => glossaryDialog?.close());
  
  // Wire up action buttons
  const takeQuizBtn = document.getElementById('takeQuizBtn');
  console.log('[story-viewer] Take Quiz button found:', !!takeQuizBtn);
  if (takeQuizBtn) {
    takeQuizBtn.addEventListener('click', async () => {
      console.log('[story-viewer] Take Quiz button clicked!');
      console.log('[story-viewer] storyId:', storyId);
      console.log('[story-viewer] state.story:', state.story);
      
      if (!storyId || !state.story) {
        console.warn('[story-viewer] Cannot navigate to quiz: missing storyId or story', {
          storyId,
          hasStory: !!state.story
        });
        alert('Story not loaded yet. Please wait for the story to finish loading.');
        return;
      }

      try {
        console.log('[story-viewer] Getting quiz URL for story:', state.story);
        // Get the appropriate quiz URL based on grade level and story topic
        const quizUrl = await getQuizUrl(state.story);
        console.log('[story-viewer] Quiz URL determined:', quizUrl);
        console.log('[story-viewer] Navigating to:', quizUrl);
        window.location.href = quizUrl;
      } catch (error) {
        console.error('[story-viewer] Failed to get quiz URL:', error);
        alert(`Error getting quiz URL: ${error.message}`);
        // Fallback to default quiz route if routing fails
        window.location.href = `/stories/${storyId}/quiz`;
      }
    });
    console.log('[story-viewer] Take Quiz button handler attached successfully');
  } else {
    console.error('[story-viewer] Take Quiz button NOT FOUND in DOM!');
  }
}

async function init() {
  try {
    showOfflineBannerIfNeeded();
    window.addEventListener('online', showOfflineBannerIfNeeded);
    window.addEventListener('offline', showOfflineBannerIfNeeded);

    // Verify storyId is available before proceeding
    if (!storyId) {
      // Try one more time to extract from pathname
      const pathMatch = window.location.pathname.match(/^\/stories\/([^/]+)\/read$/);
      if (pathMatch) {
        storyId = pathMatch[1];
      } else {
        throw new Error('Story ID not found. Please navigate from the story list.');
      }
    }

    await loadStory();
    console.log('[story-viewer] Story loaded, wiring controls...');
    console.log('[story-viewer] State after loadStory:', { story: state.story?.title, panels: state.panels.length });
    wireControls();
    updatePanelUI();
    
    // Update URL to show /stories/{storyId}/read format (clean URL)
    if (storyId && window.location.pathname !== `/stories/${storyId}/read`) {
      const cleanUrl = `/stories/${storyId}/read?panel=${state.currentPanelIndex}`;
      window.history.replaceState({ storyId, panel: state.currentPanelIndex }, '', cleanUrl);
    }
    
    await persistProgress();
    await logAnalyticsEvent('story_viewer_opened', {
      storyId,
      panelIndex: state.currentPanelIndex
    });
  } catch (error) {
    console.error('[story-viewer] Failed to initialize viewer', error);
    if (panelNarrationEl) {
      panelNarrationEl.textContent = 'Unable to load this story. Please head back to the story list.';
    }
    if (nextBtn) nextBtn.disabled = true;
    if (prevBtn) prevBtn.disabled = true;
    
    // Show error message to user
    const errorMsg = document.createElement('div');
    errorMsg.className = 'max-w-5xl mx-auto px-6 mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800';
    errorMsg.innerHTML = `
      <p class="font-semibold mb-2">⚠️ Error loading story</p>
      <p class="text-sm">${error.message || 'Please check the story URL and try again.'}</p>
      <a href="./index.html" class="text-sm underline mt-2 inline-block">← Back to Stories</a>
    `;
    document.querySelector('main')?.insertBefore(errorMsg, document.querySelector('main')?.firstChild);
  }
}

init();

