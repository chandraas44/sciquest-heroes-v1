import {
  getStoryById,
  getStoryProgressSummary,
  logAnalyticsEvent,
  getLatestGeneratedComicForStory,
  generateComicForStory
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

let latestGeneratedComic = null;

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
    const search = new URLSearchParams();
    if (storyId) search.set('storyId', storyId);
    search.set('panel', String(panelIdx));
    if (latestGeneratedComic?.id) {
      search.set('comicId', latestGeneratedComic.id);
    }
    const readerUrl = `/stories/reader.html?${search.toString()}`;
    window.location.href = readerUrl;
    // After page loads, reader.html will update the URL using history API
  };

  startBtn.addEventListener('click', async () => {
    console.log('[story-detail] Start Story clicked', {
      storyId,
      hasLatestGeneratedComic: Boolean(latestGeneratedComic?.id)
    });

    const hadProgress = Boolean(progress?.lastPanelIndex > 0);

    // If we already have a generated comic, just navigate
    if (latestGeneratedComic?.id) {
      goToReader(0);
      return;
    }

    // Try to generate (or reuse) a comic via Edge Function
    const originalLabel = startBtn.textContent;
    startBtn.disabled = true;
    startBtn.textContent = 'Preparing your adventure...';

    try {
      const generationResult = await generateComicForStory(storyId);
      console.log('[story-detail] generateComicForStory result', {
        storyId,
        hasResult: Boolean(generationResult),
        comicId: generationResult?.comicId,
        reused: generationResult?.reused
      });

      // In mock mode or on soft failure, fall back to static panels
      if (!generationResult || !generationResult.comicId) {
        goToReader(0);
        return;
      }

      latestGeneratedComic = {
        id: generationResult.comicId,
        pdf_path: generationResult.pdfPath,
        panel_count: generationResult.panelCount,
        panels_json: {
          panels: generationResult.panels || panels
        }
      };

      const previewPanels = latestGeneratedComic.panels_json.panels || panels;
      if (previewPanels?.length) {
        renderPanelPreview(previewPanels);
      }

      goToReader(0);
    } catch (error) {
      console.error('[story-detail] Comic generation failed, falling back to reader', error);
      goToReader(0);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = hadProgress ? 'Restart Story' : 'Start Story';
    }
  });

  resumeBtn.addEventListener('click', () => goToReader(resumePanel));

  const currentPanelTopic = panels[resumePanel]?.chatTopicId || panels[0]?.chatTopicId;
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
    console.log('[story-detail] Hydrating story page with storyId:', storyId);

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

    const basePanels = story.panels || [];

    console.log('[story-detail] Loaded story metadata', {
      storyId,
      title: story.title,
      hasPanels: basePanels.length > 0,
      panelCount: basePanels.length
    });

    // If a generated comic exists for this user + story, prefer its panels for preview
    try {
      latestGeneratedComic = await getLatestGeneratedComicForStory(storyId);
      if (latestGeneratedComic) {
        console.log('[story-detail] Using latest generated comic for preview', {
          storyId,
          comicId: latestGeneratedComic.id,
          panelCount: latestGeneratedComic.panel_count
        });
      }
    } catch (error) {
      console.warn('[story-detail] Failed to load latest generated comic, using base panels', error);
    }

    const previewPanels =
      latestGeneratedComic?.panels_json?.panels?.length
        ? latestGeneratedComic.panels_json.panels
        : basePanels;

    console.log('[story-detail] Rendering panel preview', {
      storyId,
      previewPanelCount: previewPanels.length
    });

    renderPanelPreview(previewPanels);

    const progress = getStoryProgressSummary(storyId);
    const totalPanels = previewPanels.length || basePanels.length || 6;
    updateProgressUI(progress, totalPanels);
    wireButtons(previewPanels.length ? previewPanels : basePanels, progress);

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

