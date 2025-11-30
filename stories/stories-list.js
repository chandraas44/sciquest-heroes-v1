import {
  getStoryList,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks,
  getStoryById,
  generateAvatarStory,
  generateStoryStructure,
  createUserStory,
  getUserGeneratedComics
} from './story-services.js';

const gridEl = document.getElementById('storiesGrid');
const emptyStateEl = document.getElementById('storyListEmpty');
const predefinedGridEl = document.getElementById('predefinedStoriesGrid');
const predefinedEmptyEl = document.getElementById('predefinedStoriesEmpty');
// Offline banner removed - no longer needed
// const offlineBannerEl = document.getElementById('offlineBanner');
const storyTemplate = document.getElementById('storyCardTemplate');
const storyTileTemplate = document.getElementById('storyTileTemplate');

// Story Prompt DOM elements
const storyPromptSectionEl = document.getElementById('storyPromptSection');
const storyPromptTitleEl = document.getElementById('storyPromptTitle');
const storyPromptTextareaEl = document.getElementById('storyPromptTextarea');
const startAdventureBtnEl = document.getElementById('startAdventureBtn');

// User-created story UI elements
const userStoryIdeaInputEl = document.getElementById('userStoryIdeaInput');
const generateStoryStructureBtnEl = document.getElementById('generateStoryStructureBtn');
const userStoryPreviewSectionEl = document.getElementById('userStoryPreviewSection');
const userStoryTitleInputEl = document.getElementById('userStoryTitleInput');
const userStoryTopicInputEl = document.getElementById('userStoryTopicInput');
const userStorySummaryInputEl = document.getElementById('userStorySummaryInput');
const saveUserStoryBtnEl = document.getElementById('saveUserStoryBtn');
const userStoryStatusEl = document.getElementById('userStoryStatus');

// Generated story DOM elements
const generatedStorySectionEl = document.getElementById('generatedStorySection');
const generatedStoryTitleEl = document.getElementById('generatedStoryTitle');
const panelImageEl = document.getElementById('panelImage');
const panelImagePlaceholderEl = document.getElementById('panelImagePlaceholder');
const panelSpeechBubblesEl = document.getElementById('panelSpeechBubbles');
const panelNarrationEl = document.getElementById('panelNarration');
const panelGlossaryEl = document.getElementById('panelGlossary');
const prevPanelBtnEl = document.getElementById('prevPanelBtn');
const nextPanelBtnEl = document.getElementById('nextPanelBtn');
const currentPanelNumEl = document.getElementById('currentPanelNum');
const totalPanelsEl = document.getElementById('totalPanels');
const panelDotsContainerEl = document.getElementById('panelDots');

// User stories (My Stories) section
const userStoriesSectionEl = document.getElementById('userStoriesSection');
const userStoriesListEl = document.getElementById('userStoriesList');
const userStoriesEmptyEl = document.getElementById('userStoriesEmpty');

// Generated comics history section
const generatedComicsSectionEl = document.getElementById('generatedComicsSection');
const generatedComicsListEl = document.getElementById('generatedComicsList');
const generatedComicsEmptyEl = document.getElementById('generatedComicsEmpty');

// Local state for selected story
let selectedStoryId = null;
let selectedStoryTileEl = null;
let selectedStoryMeta = null;
let generatedPanelsState = [];
let currentPanelIndex = 0;

// function setOfflineBannerVisibility() {
//   if (!offlineBannerEl) return;
//   const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
//   offlineBannerEl.classList.toggle('hidden', !shouldShow);
// }

async function buildStoryTile(story) {
  try {
    if (!storyTileTemplate) {
      console.warn('[stories] Story tile template not found');
      return null;
    }

    const clone = storyTileTemplate.content.cloneNode(true);
    const tileArticle = clone.querySelector('article');
    const coverImg = clone.querySelector('[data-tile-cover]');
    const topicPill = clone.querySelector('[data-tile-topic]');
    const titleEl = clone.querySelector('[data-tile-title]');
    const timeEl = clone.querySelector('[data-tile-time]');
    const badgeEl = clone.querySelector('[data-tile-badge]');

    // Set story ID on the article for click handling
    if (tileArticle) {
      tileArticle.setAttribute('data-story-id', story.id || '');
    }

    // Set image
    coverImg.src = story.coverUrl || '/images/placeholder-story.png';
    coverImg.alt = story.title || 'Story cover';

    // Set topic tag
    const topicText = story.topicTag || 'Science';
    if (topicPill) topicPill.textContent = topicText;

    // Set title
    const titleText = story.title || 'Untitled Story';
    if (titleEl) titleEl.textContent = titleText;

    // Set estimated time
    if (timeEl) {
      timeEl.textContent = story.estimatedTime || '5 min';
    }

    // Show badge for user-created stories
    if (badgeEl) {
      if (story.userId) {
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Add click handler to select story and populate Story Prompt
    if (tileArticle) {
      tileArticle.addEventListener('click', async () => {
        if (!story.id) {
          console.error('[stories] Story ID is missing, cannot select', story);
          alert('Story data is incomplete. Please refresh the page.');
          return;
        }

        try {
          await populateStoryPrompt(story);

          // Highlight selected tile
          if (selectedStoryTileEl && selectedStoryTileEl !== tileArticle) {
            selectedStoryTileEl.classList.remove('selected');
          }
          tileArticle.classList.add('selected');
          selectedStoryTileEl = tileArticle;
        } catch (error) {
          console.error('[stories] Failed to populate story prompt', error);
          alert('Unable to load this story. Please try again.');
        }
      });
    }

    return clone;
  } catch (error) {
    console.error('[stories] Failed to build story tile', story.id, error);
    return null;
  }
}

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

async function populateStoryPrompt(story) {
  if (!storyPromptSectionEl || !storyPromptTextareaEl || !startAdventureBtnEl) {
    console.warn('[stories] Story prompt elements not found; skipping prompt population');
    return;
  }

  const storyId = story?.id;
  if (!storyId) {
    throw new Error('Story ID is required to populate prompt');
  }

  selectedStoryId = storyId;
  selectedStoryMeta = story;

  // Show loading state in textarea
  storyPromptTextareaEl.value = 'Loading story prompt...';
  startAdventureBtnEl.disabled = true;

  let fullStory = story;
  try {
    // Fetch full story details (may include richer summary/panels)
    fullStory = await getStoryById(storyId);
  } catch (error) {
    console.warn('[stories] Failed to fetch full story details, falling back to list data', error);
  }

  const summaryText = fullStory?.summary || story.summary || 'An exciting science adventure awaits!';
  const titleText = fullStory?.title || story.title || 'Your adventure prompt';
  const topicTag = fullStory?.topicTag || story.topicTag || null;

  selectedStoryMeta = {
    ...fullStory,
    topicTag
  };

  if (storyPromptTitleEl) {
    storyPromptTitleEl.textContent = titleText;
  }

  storyPromptTextareaEl.value = summaryText;
  startAdventureBtnEl.disabled = false;

  // Reveal the prompt section
  storyPromptSectionEl.classList.remove('hidden');

  // Smooth scroll into view for better UX
  try {
    storyPromptSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    // Older browsers: ignore scroll errors
  }
}

function updatePanelViewer() {
  if (!generatedStorySectionEl) return;
  if (!Array.isArray(generatedPanelsState) || generatedPanelsState.length === 0) {
    generatedStorySectionEl.classList.add('hidden');
    return;
  }

  const total = generatedPanelsState.length;
  if (total <= 0) {
    generatedStorySectionEl.classList.add('hidden');
    return;
  }

  // Clamp index
  if (currentPanelIndex < 0) currentPanelIndex = 0;
  if (currentPanelIndex > total - 1) currentPanelIndex = total - 1;

  const panel = generatedPanelsState[currentPanelIndex];

  // Update counters
  if (currentPanelNumEl) currentPanelNumEl.textContent = String(currentPanelIndex + 1);
  if (totalPanelsEl) totalPanelsEl.textContent = String(total);

  // Dots
  if (panelDotsContainerEl) {
    panelDotsContainerEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className =
        'w-2 h-2 rounded-full cursor-pointer ' +
        (i === currentPanelIndex ? 'bg-purple-600' : 'bg-slate-300');
      dot.addEventListener('click', () => {
        currentPanelIndex = i;
        updatePanelViewer();
      });
      panelDotsContainerEl.appendChild(dot);
    }
  }

  // Image / placeholder
  if (panelImageEl && panelImagePlaceholderEl) {
    if (panel.imageUrl) {
      panelImageEl.src = panel.imageUrl;
      panelImageEl.classList.remove('hidden');
      panelImagePlaceholderEl.classList.add('hidden');
    } else {
      panelImageEl.classList.add('hidden');
      panelImagePlaceholderEl.classList.remove('hidden');
    }
  }

  // Speech bubbles are no longer used; hide and clear the container for all panels
  if (panelSpeechBubblesEl) {
    panelSpeechBubblesEl.innerHTML = '';
    panelSpeechBubblesEl.classList.add('hidden');
  }

  // Narration
  if (panelNarrationEl) {
    panelNarrationEl.textContent = panel.narration || '';
  }

  // Glossary
  if (panelGlossaryEl) {
    panelGlossaryEl.innerHTML = '';
    const terms = Array.isArray(panel.glossaryTerms) ? panel.glossaryTerms : [];
    terms.forEach((term) => {
      const pill = document.createElement('span');
      pill.className =
        'px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[0.7rem] font-semibold text-indigo-700';
      pill.textContent = term;
      panelGlossaryEl.appendChild(pill);
    });
  }

  // Buttons
  if (prevPanelBtnEl) prevPanelBtnEl.disabled = currentPanelIndex === 0;
  if (nextPanelBtnEl) nextPanelBtnEl.disabled = currentPanelIndex === total - 1;

  generatedStorySectionEl.classList.remove('hidden');

  try {
    generatedStorySectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    // Ignore scroll errors
  }
}

function renderGeneratedStory(panels, title) {
  if (!generatedStorySectionEl) {
    console.warn('[stories] Generated story section not found; skipping render');
    return;
  }

  if (!Array.isArray(panels) || panels.length === 0) {
    if (panelNarrationEl) {
      panelNarrationEl.textContent =
        'We could not generate a custom adventure right now. Please try again later.';
    }
    generatedPanelsState = [];
    currentPanelIndex = 0;
    generatedStorySectionEl.classList.remove('hidden');
    return;
  }

  generatedPanelsState = panels;
  currentPanelIndex = 0;

  if (generatedStoryTitleEl) {
    generatedStoryTitleEl.textContent = title || 'Your custom adventure';
  }

  updatePanelViewer();
}

async function handleGenerateStoryStructure() {
  if (!generateStoryStructureBtnEl || !userStoryIdeaInputEl) return;

  const idea = userStoryIdeaInputEl.value.trim();
  if (!idea) {
    alert('Please enter a story idea first.');
    return;
  }

  generateStoryStructureBtnEl.disabled = true;
  generateStoryStructureBtnEl.textContent = 'Creating your story...';
  userStoryStatusEl && (userStoryStatusEl.textContent = '');

  try {
    const outline = await generateStoryStructure(idea);

    if (userStoryTitleInputEl) userStoryTitleInputEl.value = outline.title || '';
    if (userStoryTopicInputEl) userStoryTopicInputEl.value = outline.topicTag || '';
    if (userStorySummaryInputEl) userStorySummaryInputEl.value = outline.summary || '';

    if (userStoryPreviewSectionEl) {
      userStoryPreviewSectionEl.classList.remove('hidden');
    }

    if (userStoryStatusEl) {
      userStoryStatusEl.textContent = 'Story outline created. You can edit it before saving.';
      userStoryStatusEl.classList.remove('text-red-500');
      userStoryStatusEl.classList.add('text-slate-500');
    }
  } catch (error) {
    console.error('[stories] Failed to generate story structure', error);
    if (userStoryStatusEl) {
      userStoryStatusEl.textContent =
        'We could not create a story outline right now. Please try again in a moment.';
      userStoryStatusEl.classList.remove('text-slate-500');
      userStoryStatusEl.classList.add('text-red-500');
    }
  } finally {
    generateStoryStructureBtnEl.disabled = false;
    generateStoryStructureBtnEl.textContent = 'Generate story outline with AI';
  }
}

async function handleSaveUserStory() {
  if (!saveUserStoryBtnEl || !userStoryTitleInputEl || !userStorySummaryInputEl) return;

  const title = userStoryTitleInputEl.value.trim();
  const summary = userStorySummaryInputEl.value.trim();
  const topicTag = userStoryTopicInputEl?.value.trim() || null;

  if (!title || !summary) {
    alert('Please make sure the story has a title and summary.');
    return;
  }

  saveUserStoryBtnEl.disabled = true;
  saveUserStoryBtnEl.textContent = 'Saving your story...';
  if (userStoryStatusEl) {
    userStoryStatusEl.textContent = '';
    userStoryStatusEl.classList.remove('text-red-500');
    userStoryStatusEl.classList.add('text-slate-500');
  }

  try {
    const created = await createUserStory({
      title,
      summary,
      topicTag
    });

    if (userStoryStatusEl) {
      userStoryStatusEl.textContent = 'Story saved! Look for it in the tiles with the "Your Story" badge.';
      userStoryStatusEl.classList.remove('text-red-500');
      userStoryStatusEl.classList.add('text-emerald-600');
    }

    // Clear idea input to encourage new ideas
    if (userStoryIdeaInputEl) userStoryIdeaInputEl.value = '';

    // Reload stories so the new one appears in the grid
    await loadStories();
  } catch (error) {
    console.error('[stories] Failed to save user story', error);
    if (userStoryStatusEl) {
      userStoryStatusEl.textContent =
        'We could not save your story right now. Please make sure you are logged in and try again.';
      userStoryStatusEl.classList.remove('text-slate-500');
      userStoryStatusEl.classList.add('text-red-500');
    }
  } finally {
    saveUserStoryBtnEl.disabled = false;
    saveUserStoryBtnEl.textContent = 'Save story and add to tiles';
  }
}

async function startAvatarAdventure(storyId, promptText) {
  if (!storyId) {
    throw new Error('storyId is required to start avatar adventure');
  }

  const originalLabel = startAdventureBtnEl?.textContent || 'Start your adventure';
  if (startAdventureBtnEl) {
    startAdventureBtnEl.disabled = true;
    startAdventureBtnEl.textContent = 'Generating your adventure...';
  }

  try {
    const topicTag = selectedStoryMeta?.topicTag || null;

    const result = await generateAvatarStory({
      storyId,
      storySummary: promptText || '',
      topicTag
    });

    if (!result || !Array.isArray(result.panels)) {
      throw new Error('No panels returned from avatar story generator');
    }

    await logAnalyticsEvent('avatar_story_generated', {
      storyId,
      panelCount: result.panels.length,
      topicTag: topicTag || null
    });

    renderGeneratedStory(result.panels, result.title);
  } catch (error) {
    console.error('[stories] Failed to generate avatar story', error);
    alert(
      'We could not generate a custom adventure right now. Starting the original story instead.'
    );

    try {
      const url = `./story.html?storyId=${encodeURIComponent(storyId)}`;
      window.location.href = url;
    } catch (navError) {
      console.error('[stories] Fallback navigation failed', navError);
    }
  } finally {
    if (startAdventureBtnEl) {
      startAdventureBtnEl.disabled = false;
      startAdventureBtnEl.textContent = originalLabel;
    }
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

async function renderPredefinedStories(stories) {
  if (!predefinedGridEl) {
    console.warn('[stories] Predefined stories grid element not found');
    return;
  }

  predefinedGridEl.innerHTML = '';
  
  if (!stories || stories.length === 0) {
    if (predefinedEmptyEl) predefinedEmptyEl.classList.remove('hidden');
    return;
  }

  if (predefinedEmptyEl) predefinedEmptyEl.classList.add('hidden');

  // Build all story tiles in parallel
  const tilePromises = stories.map(story => buildStoryTile(story));
  const results = await Promise.allSettled(tilePromises);
  
  // Filter out failed tiles and append successful ones
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      predefinedGridEl.appendChild(result.value);
    } else {
      console.warn('[stories] Failed to render story tile', stories[index]?.id, result.reason);
    }
  });
  
  // If no tiles were rendered, show empty state
  if (predefinedGridEl.children.length === 0) {
    if (predefinedEmptyEl) predefinedEmptyEl.classList.remove('hidden');
  }
}

function renderUserStories(stories) {
  if (!userStoriesSectionEl || !userStoriesListEl) {
    return;
  }

  userStoriesListEl.innerHTML = '';

  const userStories = Array.isArray(stories)
    ? stories.filter((story) => story.userId)
    : [];

  if (!userStories.length) {
    userStoriesSectionEl.classList.add('hidden');
    if (userStoriesEmptyEl) {
      userStoriesEmptyEl.classList.remove('hidden');
    }
    return;
  }

  userStoriesSectionEl.classList.remove('hidden');
  if (userStoriesEmptyEl) {
    userStoriesEmptyEl.classList.add('hidden');
  }

  userStories.forEach((story) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'w-full text-left bg-white border-2 border-purple-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 hover:border-purple-300 hover:bg-purple-50 transition';

    const textContainer = document.createElement('div');
    textContainer.className = 'flex-1 min-w-0';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center justify-between gap-2';

    const titleEl = document.createElement('h3');
    titleEl.className = 'font-fredoka text-sm md:text-base font-semibold text-slate-800 truncate';
    titleEl.textContent = story.title || 'Untitled Story';

    const timeEl = document.createElement('span');
    timeEl.className = 'text-[0.7rem] text-slate-500 whitespace-nowrap';
    timeEl.textContent = story.estimatedTime || '5 min';

    titleRow.appendChild(titleEl);
    titleRow.appendChild(timeEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'flex items-center gap-2 mt-1';

    const topicPill = document.createElement('span');
    topicPill.className =
      'inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[0.7rem] font-semibold text-purple-700';
    topicPill.textContent = story.topicTag || 'Science';

    const badge = document.createElement('span');
    badge.className =
      'inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[0.65rem] font-bold uppercase';
    badge.textContent = 'Your Story';

    metaRow.appendChild(topicPill);
    metaRow.appendChild(badge);

    textContainer.appendChild(titleRow);
    textContainer.appendChild(metaRow);

    button.appendChild(textContainer);

    button.addEventListener('click', async () => {
      if (!story.id) {
        console.error('[stories] User story ID is missing, cannot select', story);
        alert('Story data is incomplete. Please refresh the page.');
        return;
      }

      try {
        await populateStoryPrompt(story);

        // Try to also highlight the corresponding tile in the predefined stories row
        if (predefinedGridEl) {
          const matchingTile = predefinedGridEl.querySelector(
            `[data-story-id="${story.id}"]`
          );
          if (matchingTile instanceof HTMLElement) {
            if (selectedStoryTileEl && selectedStoryTileEl !== matchingTile) {
              selectedStoryTileEl.classList.remove('selected');
            }
            matchingTile.classList.add('selected');
            selectedStoryTileEl = matchingTile;
          }
        }
      } catch (error) {
        console.error('[stories] Failed to populate story prompt from user stories list', error);
        alert('Unable to load this story. Please try again.');
      }
    });

    userStoriesListEl.appendChild(button);
  });
}

async function renderGeneratedComics(stories) {
  if (!generatedComicsSectionEl || !generatedComicsListEl) {
    return;
  }

  generatedComicsListEl.innerHTML = '';

  // Load all comics for current user from Supabase
  let comics = [];
  try {
    comics = await getUserGeneratedComics();
  } catch (error) {
    console.warn('[stories] Failed to load user generated comics', error);
    comics = [];
  }

  if (!Array.isArray(comics) || comics.length === 0) {
    generatedComicsSectionEl.classList.add('hidden');
    if (generatedComicsEmptyEl) {
      generatedComicsEmptyEl.classList.remove('hidden');
    }
    return;
  }

  generatedComicsSectionEl.classList.remove('hidden');
  if (generatedComicsEmptyEl) {
    generatedComicsEmptyEl.classList.add('hidden');
  }

  const storyIndex = new Map();
  if (Array.isArray(stories)) {
    stories.forEach((story) => {
      if (story?.id) {
        storyIndex.set(story.id, story);
      }
    });
  }

  comics.forEach((comic) => {
    const storyMeta = storyIndex.get(comic.story_id) || null;
    const title = storyMeta?.title || `Story ${comic.story_id}`;
    const topic = storyMeta?.topicTag || 'Science';
    const createdAt = comic.created_at ? new Date(comic.created_at) : null;
    const createdLabel = createdAt
      ? createdAt.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      'w-full text-left bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 hover:border-purple-300 hover:bg-purple-50 transition';

    const textContainer = document.createElement('div');
    textContainer.className = 'flex-1 min-w-0';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center justify-between gap-2';

    const titleEl = document.createElement('h3');
    titleEl.className = 'font-fredoka text-sm md:text-base font-semibold text-slate-800 truncate';
    titleEl.textContent = title;

    const metaEl = document.createElement('span');
    metaEl.className = 'text-[0.7rem] text-slate-500 whitespace-nowrap';
    metaEl.textContent =
      (comic.panel_count ? `${comic.panel_count} panels` : '') +
      (createdLabel ? ` · ${createdLabel}` : '');

    titleRow.appendChild(titleEl);
    titleRow.appendChild(metaEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'flex items-center gap-2 mt-1';

    const topicPill = document.createElement('span');
    topicPill.className =
      'inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[0.7rem] font-semibold text-purple-700';
    topicPill.textContent = topic;

    const badge = document.createElement('span');
    badge.className =
      'inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500 text-white text-[0.65rem] font-bold uppercase';
    badge.textContent = 'Generated';

    metaRow.appendChild(topicPill);
    metaRow.appendChild(badge);

    textContainer.appendChild(titleRow);
    textContainer.appendChild(metaRow);

    const actionEl = document.createElement('span');
    actionEl.className =
      'inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[0.7rem] font-semibold shadow-sm';
    actionEl.textContent = 'Load in reader';

    button.appendChild(textContainer);
    button.appendChild(actionEl);

    button.addEventListener('click', () => {
      try {
        const panelsJson = comic.panels_json || {};
        const rawPanels = Array.isArray(panelsJson.panels) ? panelsJson.panels : [];

        if (!rawPanels.length) {
          alert('This generated comic does not have any panels saved yet.');
          return;
        }

        const mappedPanels = rawPanels.map((p, idx) => ({
          panelId: `generated-${comic.id}-${idx + 1}`,
          imageUrl: null,
          imagePrompt: '',
          narration: p.narration || '',
          speechBubbles: Array.isArray(p.speech_bubbles)
            ? p.speech_bubbles.map((b) => ({
                speaker: b.speaker || 'Character',
                text: b.text || ''
              }))
            : [],
          glossaryTerms: p.science_fact ? [p.science_fact] : []
        }));

        renderGeneratedStory(mappedPanels, title);
      } catch (error) {
        console.error('[stories] Failed to load generated comic into reader', error);
        alert('Unable to load this generated comic. Please try again later.');
      }
    });

    generatedComicsListEl.appendChild(button);
  });
}

async function loadStories() {
  try {
    // Show loading state
    if (gridEl) {
      gridEl.innerHTML = '<div class="col-span-2 text-center text-slate-500 font-medium py-8">Loading stories...</div>';
    }
    if (predefinedGridEl) {
      predefinedGridEl.innerHTML = '<div class="col-span-4 text-center text-slate-500 font-medium py-8">Loading stories...</div>';
    }
    
    const stories = await getStoryList();
    
    if (!stories || stories.length === 0) {
      if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      if (gridEl) gridEl.innerHTML = '';
      if (predefinedEmptyEl) predefinedEmptyEl.classList.remove('hidden');
      if (predefinedGridEl) predefinedGridEl.innerHTML = '';
      return;
    }
    
    // Render predefined stories in tiles section
    await renderPredefinedStories(stories);
    
    // Render full story cards in the existing section
    await renderStoryList(stories);

    // Render "Your Stories" section for user-created stories
    renderUserStories(stories);

    // Render history of generated comics (from Supabase) into the reader panel
    await renderGeneratedComics(stories);
    
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
    if (predefinedGridEl) {
      predefinedGridEl.innerHTML =
        '<div class="col-span-4 text-center text-red-500 font-semibold py-8">Unable to load stories right now. Please try refreshing the page.</div>';
    }
    if (emptyStateEl) {
      emptyStateEl.classList.add('hidden');
    }
    if (predefinedEmptyEl) {
      predefinedEmptyEl.classList.add('hidden');
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
  
  // Predefined stories grid and template are optional (for graceful degradation)
  if (!predefinedGridEl) {
    console.warn('[stories] Predefined stories grid not found, skipping tile rendering');
  }

  // Wire Create Your Own Story AI outline button
  if (generateStoryStructureBtnEl) {
    generateStoryStructureBtnEl.addEventListener('click', () => {
      handleGenerateStoryStructure();
    });
  }

  // Wire Save User Story button
  if (saveUserStoryBtnEl) {
    saveUserStoryBtnEl.addEventListener('click', () => {
      handleSaveUserStory();
    });
  }

  // Wire Start your adventure button if present
  if (startAdventureBtnEl) {
    startAdventureBtnEl.addEventListener('click', async () => {
      if (!selectedStoryId) {
        alert('Please select a story from the tiles above to start your adventure.');
        return;
      }

      const promptText = storyPromptTextareaEl?.value || '';
      await startAvatarAdventure(selectedStoryId, promptText);
    });
  }

  // Wire panel navigation buttons
  if (prevPanelBtnEl) {
    prevPanelBtnEl.addEventListener('click', () => {
      if (!Array.isArray(generatedPanelsState) || generatedPanelsState.length === 0) return;
      if (currentPanelIndex <= 0) return;
      currentPanelIndex -= 1;
      updatePanelViewer();
    });
  }

  if (nextPanelBtnEl) {
    nextPanelBtnEl.addEventListener('click', () => {
      if (!Array.isArray(generatedPanelsState) || generatedPanelsState.length === 0) return;
      if (currentPanelIndex >= generatedPanelsState.length - 1) return;
      currentPanelIndex += 1;
      updatePanelViewer();
    });
  }

  // Keyboard navigation for panels
  document.addEventListener('keydown', (event) => {
    if (generatedStorySectionEl?.classList.contains('hidden')) return;
    if (!Array.isArray(generatedPanelsState) || generatedPanelsState.length === 0) return;

    if (event.key === 'ArrowRight') {
      if (currentPanelIndex < generatedPanelsState.length - 1) {
        currentPanelIndex += 1;
        updatePanelViewer();
        event.preventDefault();
      }
    } else if (event.key === 'ArrowLeft') {
      if (currentPanelIndex > 0) {
        currentPanelIndex -= 1;
        updatePanelViewer();
        event.preventDefault();
      }
    } else if (event.key === 'Home') {
      currentPanelIndex = 0;
      updatePanelViewer();
      event.preventDefault();
    } else if (event.key === 'End') {
      currentPanelIndex = generatedPanelsState.length - 1;
      updatePanelViewer();
      event.preventDefault();
    }
  });
  
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



