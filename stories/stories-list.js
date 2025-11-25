import {
  getStoryList,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks
} from './story-services.js';

const gridEl = document.getElementById('storiesGrid');
const emptyStateEl = document.getElementById('storyListEmpty');
const offlineBannerEl = document.getElementById('offlineBanner');
const storyTemplate = document.getElementById('storyCardTemplate');

function setOfflineBannerVisibility() {
  if (!offlineBannerEl) return;
  const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
  offlineBannerEl.classList.toggle('hidden', !shouldShow);
}

function buildStoryCard(story) {
  const clone = storyTemplate.content.cloneNode(true);
  const coverImg = clone.querySelector('[data-cover]');
  const topicPill = clone.querySelector('[data-topic]');
  const titleEl = clone.querySelector('[data-title]');
  const summaryEl = clone.querySelector('[data-summary]');
  const readingLevelEl = clone.querySelector('[data-readingLevel]');
  const timeEl = clone.querySelector('[data-estimatedTime]');
  const progressLabelEl = clone.querySelector('[data-progressLabel]');
  const openBtn = clone.querySelector('[data-openStory]');

  coverImg.src = story.coverUrl || '/images/placeholder-story.png';
  coverImg.alt = story.title;
  topicPill.textContent = story.topicTag || 'Science';
  titleEl.textContent = story.title;
  summaryEl.textContent = story.summary || 'Tap to open this adventure.';
  readingLevelEl.textContent = story.readingLevel || 'Mixed Ages';
  timeEl.textContent = story.estimatedTime || '5 min read';

  const progress = getStoryProgressSummary(story.id);
  const panelCount = story.panels?.length ?? story.panel_count ?? 6;

  if (progress?.completedAt) {
    progressLabelEl.textContent = 'Completed';
  } else if (progress?.lastPanelIndex > 0) {
    const currentPanel = Math.min(progress.lastPanelIndex + 1, panelCount);
    progressLabelEl.textContent = `Panel ${currentPanel} of ${panelCount}`;
  } else {
    progressLabelEl.textContent = 'Not started';
  }

  openBtn.addEventListener('click', () => {
    window.location.href = `./story.html?storyId=${encodeURIComponent(story.id)}`;
  });

  return clone;
}

function renderStoryList(stories) {
  gridEl.innerHTML = '';
  if (!stories.length) {
    emptyStateEl.classList.remove('hidden');
    return;
  }
  emptyStateEl.classList.add('hidden');

  stories.forEach((story) => {
    gridEl.appendChild(buildStoryCard(story));
  });
}

async function loadStories() {
  try {
    const stories = await getStoryList();
    renderStoryList(stories);
    await logAnalyticsEvent('stories_list_viewed', { storyCount: stories.length });
  } catch (error) {
    console.error('[stories] Unable to load stories', error);
    gridEl.innerHTML =
      '<div class="col-span-2 text-center text-red-500 font-semibold">Unable to load stories right now.</div>';
  }
}

setOfflineBannerVisibility();
window.addEventListener('online', setOfflineBannerVisibility);
window.addEventListener('offline', setOfflineBannerVisibility);

loadStories();



