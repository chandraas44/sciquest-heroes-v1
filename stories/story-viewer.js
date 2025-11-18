import {
  getStoryById,
  getPanelsForStory,
  saveStoryProgress,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks
} from './story-services.js';

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
    dot.addEventListener('click', () => jumpToPanel(idx));
    progressDotsEl.appendChild(dot);
  });
}

function updateGlossary(terms = []) {
  glossaryList.innerHTML = '';
  if (!terms.length) {
    glossaryList.innerHTML = '<p class="text-white/60 text-sm">No glossary terms on this panel.</p>';
    return;
  }
  terms.forEach((term) => {
    const pill = document.createElement('span');
    pill.className = 'glossary-pill px-3 py-1 rounded-full bg-indigo-600/30 border border-white/20 text-white font-semibold';
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
}

async function init() {
  try {
    showOfflineBannerIfNeeded();
    window.addEventListener('online', showOfflineBannerIfNeeded);
    window.addEventListener('offline', showOfflineBannerIfNeeded);

    await loadStory();
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
    panelNarrationEl.textContent = 'Unable to load this story. Please head back to the story list.';
    nextBtn.disabled = true;
    prevBtn.disabled = true;
  }
}

init();

