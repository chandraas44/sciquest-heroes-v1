import {
  getStoryById,
  getStoryProgressSummary,
  logAnalyticsEvent
} from './story-services.js';

const params = new URLSearchParams(window.location.search);
const storyId = params.get('storyId');

const titleEl = document.getElementById('storyTitle');
const summaryEl = document.getElementById('storySummary');
const longSummaryEl = document.getElementById('storyLongSummary');
const coverEl = document.getElementById('storyCover');
const topicEl = document.getElementById('storyTopic');
const readingLevelEl = document.getElementById('storyReadingLevel');
const timeEl = document.getElementById('storyTime');
const progressLabelEl = document.getElementById('progressLabel');
const startBtn = document.getElementById('startStoryBtn');
const resumeBtn = document.getElementById('resumeStoryBtn');
const panelPreviewEl = document.getElementById('panelPreview');
const panelPreviewTemplate = document.getElementById('panelPreviewTemplate');
const openChatBtn = document.getElementById('openChatBtn');

function renderPanelPreview(panels) {
  panelPreviewEl.innerHTML = '';
  panels.slice(0, 4).forEach((panel, idx) => {
    const clone = panelPreviewTemplate.content.cloneNode(true);
    clone.querySelector('[data-panelId]').textContent = `#${idx + 1}`;
    clone.querySelector('[data-panelText]').textContent = panel.narration;
    panelPreviewEl.appendChild(clone);
  });
}

function updateProgressUI(progress, totalPanels) {
  const hasProgress = progress?.lastPanelIndex > 0;
  const isComplete = Boolean(progress?.completedAt);

  if (isComplete) {
    progressLabelEl.textContent = 'Completed – great job!';
  } else if (hasProgress) {
    progressLabelEl.textContent = `You paused at panel ${Math.min(progress.lastPanelIndex + 1, totalPanels)}.`;
  } else {
    progressLabelEl.textContent = 'You have not started this adventure yet.';
  }

  resumeBtn.classList.toggle('hidden', !hasProgress);
  startBtn.textContent = hasProgress ? 'Restart Story' : 'Start Story';
}

function wireButtons(panels, progress) {
  const resumePanelIndex = progress?.lastPanelIndex ?? 0;
  const resumePanel = Math.min(resumePanelIndex, panels.length - 1);

  const goToReader = (panelIdx = 0) => {
    // Navigate to reader.html with query params, then update URL to show /stories/{storyId}/read
    const readerUrl = `/stories/reader.html?storyId=${storyId}&panel=${panelIdx}`;
    window.location.href = readerUrl;
    // After page loads, reader.html will update the URL using history API
  };

  startBtn.addEventListener('click', () => goToReader(0));
  resumeBtn.addEventListener('click', () => goToReader(resumePanel));

  const currentPanelTopic = panels[resumePanel]?.chatTopicId || panels[0]?.chatTopicId;
  
  // Update chat button label with character name
  (async () => {
    if (currentPanelTopic && openChatBtn) {
      try {
        const { getChatButtonLabel } = await import('./topic-characters.js');
        openChatBtn.textContent = getChatButtonLabel(currentPanelTopic);
      } catch (error) {
        console.warn('[story-detail] Failed to load character name:', error);
        openChatBtn.textContent = 'Launch Topic Chat';
      }
    }
  })();
  
  openChatBtn.addEventListener('click', () => {
    const chatUrl = new URL('../chat/index.html', window.location.origin);
    if (currentPanelTopic) chatUrl.searchParams.set('topicId', currentPanelTopic);
    chatUrl.searchParams.set('storyRef', storyId);
    window.location.href = `${chatUrl.pathname}${chatUrl.search}`;
  });
}

async function hydrateStoryPage() {
  if (!storyId) {
    titleEl.textContent = 'Story not found';
    summaryEl.textContent = 'Missing story reference. Please return to the story list.';
    startBtn.disabled = true;
    return;
  }

  try {
    const story = await getStoryById(storyId);
    if (!story) throw new Error('Story not found');

    titleEl.textContent = story.title;
    summaryEl.textContent = story.summary;
    longSummaryEl.textContent = story.summary;
    topicEl.textContent = story.topicTag || 'Science';
    readingLevelEl.textContent = story.readingLevel || 'Ages 7-10';
    timeEl.textContent = story.estimatedTime || '6 min read';
    coverEl.src = story.coverUrl || '/images/placeholder-story.png';
    coverEl.alt = story.title;

    const panels = story.panels || [];
    renderPanelPreview(panels);

    const progress = getStoryProgressSummary(storyId);
    updateProgressUI(progress, panels.length || 6);
    wireButtons(panels, progress);

    await logAnalyticsEvent('story_detail_opened', {
      storyId,
      lastPanelIndex: progress?.lastPanelIndex ?? 0
    });
  } catch (error) {
    console.error('[story-detail] Unable to load story', error);
    titleEl.textContent = 'Story unavailable';
    summaryEl.textContent = 'We could not load this adventure. Please try again later.';
    startBtn.disabled = true;
    resumeBtn.disabled = true;
  }
}

hydrateStoryPage();

