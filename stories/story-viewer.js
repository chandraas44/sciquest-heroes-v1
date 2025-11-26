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
const panelImageContainer = document.getElementById('panelImageContainer');
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
// Offline banner removed - no longer needed
// const offlineBanner = document.getElementById('viewerOfflineBanner');

const state = {
  story: null,
  panels: [],
  currentPanelIndex: 0,
  panelCount: 0
};

// Glossary definitions for Photosynthesis story (kid-friendly)
const GLOSSARY_DEFINITIONS = {
  'leaf': 'The flat, green part of a plant that catches sunlight and makes food.',
  'plant': 'A living thing that grows in soil and makes its own food using sunlight.',
  'photosynthesis': 'The amazing process where plants use sunlight, water, and air to make food and oxygen!',
  'sunlight': 'Bright light from the sun that gives plants energy to grow.',
  'sunbeams': 'Rays of light from the sun that shine on plants.',
  'leaves': 'The green parts of plants that catch sunlight and help make food.',
  'roots': 'The part of a plant that grows underground and drinks water from the soil.',
  'stem': 'The long part of a plant that holds up the leaves and carries water from roots to leaves.',
  'water': 'A clear liquid that plants drink through their roots to help them grow.',
  'soil': 'The dirt where plants grow and get water and nutrients.',
  'carbon dioxide': 'A gas in the air that plants breathe in to help make food. We breathe it out!',
  'CO₂': 'The short name for carbon dioxide - a gas plants need.',
  'stomata': 'Tiny openings on leaves that let plants "breathe" air in and out.',
  'air': 'The invisible stuff around us that we breathe. Plants use it too!',
  'process': 'The steps or way something happens, like how plants make food.',
  'combine': 'To mix things together, like when plants mix sunlight, water, and air.',
  'chlorophyll': 'The green stuff in leaves that helps plants catch sunlight.',
  'sugar': 'Sweet food that plants make for themselves during photosynthesis.',
  'oxygen': 'A gas in the air that we need to breathe. Plants make it for us!',
  'food': 'What living things eat to get energy. Plants make their own food!',
  'plant food': 'The sugar that plants make for themselves using photosynthesis.'
};

// Offline banner functionality removed
// function showOfflineBannerIfNeeded() {
//   if (!offlineBanner) return;
//   const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
//   offlineBanner.classList.toggle('hidden', !shouldShow);
// }

/**
 * Gets the current user's display name from their profile
 * @returns {Promise<string>} User's display name or 'Hero' as fallback
 */
async function getCurrentUserName() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    const { supabaseConfig } = await import('../config.js');
    
    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      return 'Hero'; // Fallback name
    }
    
    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return 'Hero';
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, full_name, username')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (profile) {
      return profile.first_name || profile.full_name || profile.username || 'Hero';
    }
    
    return 'Hero';
  } catch (error) {
    console.warn('[story-viewer] Failed to get user name:', error);
    return 'Hero';
  }
}

/**
 * Formats narration text with colored dialogue
 * - Descriptive narration on one line
 * - Mr. Chloro's dialogue on separate line in green (text-green-600)
 * - Child's dialogue on separate line in purple (text-purple-600)
 * - Replaces "Child:" with the actual child's name
 * @param {string} narrationText - The raw narration text
 * @param {string} childName - The child's display name
 * @returns {string} Formatted HTML string with colored dialogue
 */
function formatNarrationWithDialogue(narrationText, childName) {
  if (!narrationText) return '';
  
  // Replace "Child:" with the actual child's name
  let text = narrationText.replace(/Child:/g, `${childName}:`);
  
  // Extract descriptive narration (everything before the first dialogue)
  // Pattern to find first dialogue: "Mr. Chloro:" or speaker name followed by colon and quote
  // Look for pattern like "Speaker: \"..." or "Speaker: '...'"
  const firstDialogueMatch = text.match(/(Mr\. Chloro|Hero|Child|[A-Za-z\s]+?):\s*["']/);
  let descriptiveNarration = '';
  let dialoguePart = text;
  
  if (firstDialogueMatch) {
    const dialogueIndex = text.indexOf(firstDialogueMatch[0]);
    descriptiveNarration = text.substring(0, dialogueIndex).trim();
    dialoguePart = text.substring(dialogueIndex);
  } else {
    // No dialogue found, return as-is
    return text;
  }
  
  // Split dialogue part into individual dialogue lines
  // Pattern to match: "Speaker: \"...\"" or "Speaker: '...'"
  // Updated pattern to handle apostrophes within dialogue (like "It's", "That's")
  // Match everything between quotes, including apostrophes
  // Pattern: Speaker name, colon, space, quote, content (including apostrophes), closing quote
  const dialoguePattern = /(Mr\. Chloro|[A-Za-z\s]+?):\s*(["'])((?:(?!\2).)*?)\2/g;
  const dialogues = [];
  let match;
  
  // Reset regex lastIndex to ensure we start from the beginning
  dialoguePattern.lastIndex = 0;
  
  while ((match = dialoguePattern.exec(dialoguePart)) !== null) {
    const speaker = match[1].trim();
    const quoteChar = match[2]; // The quote character used (" or ')
    const dialogue = match[3]; // The dialogue content (handles apostrophes correctly)
    
    // Determine color based on speaker
    let colorClass = 'text-slate-800'; // default
    if (speaker === 'Mr. Chloro') {
      colorClass = 'text-green-600';
    } else if (speaker === childName || speaker === 'Hero' || speaker === 'Child') {
      colorClass = 'text-purple-600';
    }
    
    dialogues.push({
      speaker: speaker,
      dialogue: dialogue,
      colorClass: colorClass,
      quoteChar: quoteChar
    });
  }
  
  // Build formatted HTML
  let formatted = '';
  
  // Add descriptive narration on first line
  if (descriptiveNarration) {
    formatted += `<div class="mb-2">${descriptiveNarration}</div>`;
  }
  
  // Add each dialogue on its own line
  dialogues.forEach((item) => {
    const quote = item.quoteChar || '"';
    formatted += `<div class="mt-2"><span class="font-semibold">${item.speaker}:</span> <span class="${item.colorClass} font-semibold">${quote}${item.dialogue}${quote}</span></div>`;
  });
  
  return formatted;
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
    const termContainer = document.createElement('div');
    termContainer.className = 'w-full';
    
    const pill = document.createElement('button');
    pill.className = 'glossary-pill w-full text-left px-4 py-3 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-200 transition cursor-pointer';
    pill.textContent = term;
    
    const definition = GLOSSARY_DEFINITIONS[term.toLowerCase()] || GLOSSARY_DEFINITIONS[term] || `A word from this story.`;
    const definitionEl = document.createElement('div');
    definitionEl.className = 'hidden mt-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-slate-700 text-sm leading-relaxed';
    definitionEl.innerHTML = `<span class="font-semibold text-purple-700">${term}:</span> ${definition}`;
    
    // Toggle definition on click
    pill.addEventListener('click', () => {
      const isExpanded = !definitionEl.classList.contains('hidden');
      // Close all other definitions
      glossaryList.querySelectorAll('[data-definition]').forEach(el => {
        if (el !== definitionEl) {
          el.classList.add('hidden');
          el.previousElementSibling.classList.remove('bg-indigo-300');
        }
      });
      // Toggle current definition
      definitionEl.classList.toggle('hidden', isExpanded);
      pill.classList.toggle('bg-indigo-300', !isExpanded);
    });
    
    definitionEl.setAttribute('data-definition', 'true');
    termContainer.appendChild(pill);
    termContainer.appendChild(definitionEl);
    glossaryList.appendChild(termContainer);
  });
}

async function updatePanelUI() {
  const panel = state.panels[state.currentPanelIndex];
  if (!panel) {
    console.warn('[story-viewer] No panel found at index', state.currentPanelIndex);
    return;
  }

  // Normalize image URL - convert relative paths to absolute if needed
  let imageUrl = panel.imageUrl || '/images/placeholder-story.png';
  if (imageUrl.startsWith('../')) {
    // Convert relative path to absolute from root
    imageUrl = imageUrl.replace('../', '/');
  } else if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
    // If it's a relative path without .., make it absolute
    imageUrl = '/' + imageUrl;
  }
  
  panelImageEl.src = imageUrl;
  
  // Adjust image positioning for specific panels that need refocusing
  // Panel 3 (index 2) needs to show faces better - use object-position to focus on bottom/center
  if (state.currentPanelIndex === 2 && panel.panelId === 'panel-03') {
    panelImageEl.style.objectPosition = 'center bottom';
  } else {
    panelImageEl.style.objectPosition = 'center center';
  }
  panelTagEl.textContent = panel.panelId || `Panel ${state.currentPanelIndex + 1}`;
  
  // Get child name and format narration with colored dialogue
  const childName = await getCurrentUserName();
  const formattedNarration = formatNarrationWithDialogue(panel.narration, childName);
  panelNarrationEl.innerHTML = formattedNarration;
  
  // Match narration height to panel image height (4:3 aspect ratio)
  const matchHeights = () => {
    if (panelImageContainer && panelNarrationEl) {
      const panelHeight = panelImageContainer.offsetHeight;
      panelNarrationEl.style.height = `${panelHeight}px`;
    }
  };
  
  // Match heights after image loads and on resize
  if (panelImageEl.complete) {
    setTimeout(matchHeights, 0);
  } else {
    panelImageEl.addEventListener('load', () => {
      setTimeout(matchHeights, 0);
    }, { once: true });
  }
  
  // Store resize handler to avoid duplicates
  if (!window._storyViewerResizeHandler) {
    window._storyViewerResizeHandler = matchHeights;
    window.addEventListener('resize', matchHeights);
  }
  
  panelPositionLabelEl.textContent = `Panel ${state.currentPanelIndex + 1} of ${state.panelCount}`;
  helperTitleEl.textContent = panel.ctaLabel || 'Ask a question';
  helperTextEl.textContent = 'Use the chat companion to dig deeper into this scene.';
  progressSummaryEl.textContent = `Panel ${state.currentPanelIndex + 1}/${state.panelCount}`;
  chatCtaBtn.textContent = panel.ctaLabel || 'Ask Mr. Chloro about Photosynthesis';

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
  await updatePanelUI();
  
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

  console.log('[story-viewer] Story loaded:', {
    storyId,
    title: story.title,
    panelCount: state.panelCount,
    firstPanel: state.panels[0]
  });

  if (!state.panelCount) {
    console.error('[story-viewer] Story has no panels', { storyId, story });
    throw new Error('story has no panels');
  }

  storyTitleEl.textContent = story.title;

  const savedProgress = await getStoryProgressSummary(storyId);
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
    // Offline banner functionality removed
    // showOfflineBannerIfNeeded();
    // window.addEventListener('online', showOfflineBannerIfNeeded);
    // window.addEventListener('offline', showOfflineBannerIfNeeded);

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
    await updatePanelUI();
    
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

