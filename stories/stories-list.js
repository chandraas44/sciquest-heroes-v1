import {
  getStoryList,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks
} from './story-services.js';

const gridEl = document.getElementById('storiesGrid');
const emptyStateEl = document.getElementById('storyListEmpty');
// Offline banner removed - no longer needed
// const offlineBannerEl = document.getElementById('offlineBanner');
const storyTemplate = document.getElementById('storyCardTemplate');

// function setOfflineBannerVisibility() {
//   if (!offlineBannerEl) return;
//   const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
//   offlineBannerEl.classList.toggle('hidden', !shouldShow);
// }

async function buildStoryCard(story) {
  try {
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

    // Try to get progress, but don't fail if it errors
    let progress = { lastPanelIndex: 0, completedAt: null };
    try {
      progress = await getStoryProgressSummary(story.id);
    } catch (error) {
      console.warn('[stories] Failed to get progress for story', story.id, error);
      // Use default progress values
    }
    
    const panelCount = story.panels?.length ?? story.panel_count ?? 6;

    if (progress?.completedAt) {
      progressLabelEl.textContent = 'Completed';
    } else if (progress?.lastPanelIndex > 0) {
      const currentPanel = Math.min(progress.lastPanelIndex + 1, panelCount);
      progressLabelEl.textContent = `Panel ${currentPanel} of ${panelCount}`;
    } else {
      progressLabelEl.textContent = 'Not started';
    }

    if (!story.enabled) {
      openBtn.disabled = true;
      openBtn.textContent = 'Coming Soon';
    }

    openBtn.addEventListener('click', () => {
      if (!story.id) {
        console.error('[stories] Story ID is missing, cannot navigate', story);
        alert('Story data is incomplete. Please refresh the page.');
        return;
      }
      try {
        window.location.href = `./story.html?storyId=${encodeURIComponent(story.id)}`;
      } catch (error) {
        console.error('[stories] Navigation error', error);
        alert('Unable to open story. Please try again.');
      }
    });

    return clone;
  } catch (error) {
    console.error('[stories] Failed to build story card', story.id, error);
    // Return null so we can filter it out
    return null;
  }
}

async function renderStoryList(stories) {
  gridEl.innerHTML = '';
  if (!stories.length) {
    emptyStateEl.classList.remove('hidden');
    return;
  }
  emptyStateEl.classList.add('hidden');

  // Build all story cards in parallel, but handle failures gracefully
  const cardPromises = stories.map(story => buildStoryCard(story));
  const results = await Promise.allSettled(cardPromises);
  
  // Filter out failed cards and append successful ones
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      gridEl.appendChild(result.value);
    } else {
      console.warn('[stories] Failed to render story card', stories[index]?.id, result.reason);
    }
  });
  
  // If no cards were rendered, show empty state
  if (gridEl.children.length === 0) {
    emptyStateEl.classList.remove('hidden');
  }
}

async function loadStories() {
  try {
    // Show loading state
    if (gridEl) {
      gridEl.innerHTML = '<div class="col-span-2 text-center text-slate-500 font-medium py-8">Loading stories...</div>';
    }
    
    const stories = await getStoryList();
    
    if (!stories || stories.length === 0) {
      if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      if (gridEl) gridEl.innerHTML = '';
      return;
    }
    
    await renderStoryList(stories);
    
    // Log analytics, but don't fail if it errors
    try {
      await logAnalyticsEvent('stories_list_viewed', { storyCount: stories.length });
    } catch (error) {
      console.warn('[stories] Analytics logging failed', error);
    }
  } catch (error) {
    console.error('[stories] Unable to load stories', error);
    if (gridEl) {
      gridEl.innerHTML =
        '<div class="col-span-2 text-center text-red-500 font-semibold py-8">Unable to load stories right now. Please try refreshing the page.</div>';
    }
    if (emptyStateEl) {
      emptyStateEl.classList.add('hidden');
    }
  }
}

// Ensure DOM is ready before initializing
function initializeStoriesPage() {
  if (!gridEl || !storyTemplate) {
    console.error('[stories] Required DOM elements not found');
    // Retry after a short delay
    setTimeout(initializeStoriesPage, 100);
    return;
  }
  
  // Offline banner functionality removed
  // setOfflineBannerVisibility();
  // window.addEventListener('online', setOfflineBannerVisibility);
  // window.addEventListener('offline', setOfflineBannerVisibility);
  
  loadStories();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStoriesPage);
} else {
  initializeStoriesPage();
}



