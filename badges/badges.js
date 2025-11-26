import {
  loadBadgeCatalog,
  getChildBadges,
  getBadgeById,
  getBadgeProgress,
  logBadgeEvent,
  isUsingBadgesMocks
} from './badge-services.js';

// Mock child ID (future: from auth)
const MOCK_CHILD_ID = 'child-akhil';

const state = {
  badges: [],
  selectedBadgeId: null
};

// Check URL params for badgeId
const params = new URLSearchParams(window.location.search);
const badgeIdFromUrl = params.get('badgeId');

const badgeGridEl = document.getElementById('badgeGrid');
const badgeSummaryEl = document.getElementById('badgeSummary');
const emptyStateEl = document.getElementById('emptyState');
const errorStateEl = document.getElementById('errorState');
const badgeModalEl = document.getElementById('badgeModal');
const modalContentEl = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModalBtn');
const retryBtn = document.getElementById('retryBtn');

// Badge ordering: unlocked → locked → rarity → alphabetical
function sortBadges(badges) {
  const rarityOrder = { rare: 0, uncommon: 1, common: 2 };
  
  return badges.sort((a, b) => {
    // First: unlocked badges first
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    
    // Second: by rarity (if both same unlock status)
    if (a.unlocked === b.unlocked) {
      const aRarity = rarityOrder[a.rarity] ?? 2;
      const bRarity = rarityOrder[b.rarity] ?? 2;
      if (aRarity !== bRarity) return aRarity - bRarity;
    }
    
    // Third: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return date.toLocaleDateString();
}

function renderBadgeTile(badge) {
  const tile = document.createElement('div');
  tile.className = `bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-6 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:border-purple-300 transition cursor-pointer`;
  tile.dataset.badgeId = badge.id;
  
  // Highlight if selected from URL
  if (badgeIdFromUrl === badge.id) {
    tile.classList.add('border-purple-500', 'shadow-[0_0_40px_rgba(139,92,246,0.4)]');
    // Scroll into view
    setTimeout(() => tile.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
  }
  
  const iconClass = badge.unlocked
    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]'
    : 'bg-purple-100 border-2 border-purple-200';
  
  const iconOpacity = badge.unlocked ? '' : 'opacity-70';
  
  const statusBadge = badge.unlocked
    ? '<span class="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>'
    : '<span class="absolute top-0 right-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-xs">🔒</span>';
  
  tile.innerHTML = `
    <div class="badge-icon-container mb-3 flex justify-center relative">
      <div class="badge-icon w-16 h-16 rounded-full flex items-center justify-center ${iconClass}">
        <span class="text-3xl ${iconOpacity}">${badge.icon || '🏆'}</span>
      </div>
      ${statusBadge}
    </div>
    <h4 class="font-fredoka text-xl font-bold text-slate-700 mb-2 text-center">${badge.name}</h4>
    <p class="text-slate-600 text-xs text-center ${!badge.unlocked ? 'italic text-slate-500' : ''}">
      ${badge.unlocked 
        ? `Earned: ${badge.awardedAt ? formatRelativeTime(badge.awardedAt) : 'Recently'}` 
        : `Hint: ${badge.hint || badge.description}`
      }
    </p>
  `;
  
  // Click handler to open modal
  tile.addEventListener('click', () => {
    showBadgeDetailModal(badge.id);
  });
  
  return tile;
}

async function showBadgeDetailModal(badgeId) {
  const badge = state.badges.find((b) => b.id === badgeId);
  if (!badge) return;
  
  state.selectedBadgeId = badgeId;
  
  // Log analytics
  await logBadgeEvent('badge_viewed', { badgeId, childId: MOCK_CHILD_ID });
  
  // Get progress if locked
  let progress = null;
  if (!badge.unlocked) {
    progress = await getBadgeProgress(MOCK_CHILD_ID, badgeId);
  }
  
  const iconClass = badge.unlocked
    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]'
    : 'bg-purple-100 border-2 border-purple-200';
  
  const iconOpacity = badge.unlocked ? '' : 'opacity-70';
  
  let progressHtml = '';
  if (progress) {
    const percentage = Math.round((progress.current / progress.required) * 100);
    progressHtml = `
      <div class="mb-4">
        <div class="bg-purple-100 rounded-full h-3 mb-2">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${percentage}%"></div>
        </div>
        <p class="text-slate-600 text-xs font-semibold">${progress.current} of ${progress.required} completed (${percentage}%)</p>
      </div>
    `;
  }
  
  let howToEarnHtml = '';
  if (!badge.unlocked) {
    let linkUrl = '';
    let linkText = '';
    
    if (badge.category === 'stories') {
      linkUrl = '../stories/index.html';
      linkText = 'Explore Stories';
    } else if (badge.category === 'chat') {
      linkUrl = '../chat/index.html';
      linkText = 'Start Chatting';
    } else if (badge.category === 'quizzes') {
      linkUrl = '../stories/index.html'; // Placeholder for future quiz feature
      linkText = 'Take Quizzes';
    }
    
    if (linkUrl) {
      howToEarnHtml = `
        <a 
          href="${linkUrl}" 
          class="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-fredoka font-bold px-8 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg text-center"
        >
          ${linkText}
        </a>
      `;
    }
  }
  
  modalContentEl.innerHTML = `
    <div class="text-center">
        <div class="badge-icon-container mb-4 flex justify-center relative">
          <div class="badge-icon w-32 h-32 rounded-full flex items-center justify-center ${iconClass} mx-auto">
            <span class="text-6xl ${iconOpacity}">${badge.icon || '🏆'}</span>
          </div>
          ${badge.unlocked
          ? '<span class="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>'
          : '<span class="absolute top-0 right-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-sm">🔒</span>'}
        </div>
        <h3 class="font-fredoka text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">${badge.name}</h3>
        <p class="text-slate-600 text-lg mb-4">${badge.description}</p>
        ${progressHtml}
        ${badge.unlocked 
          ? `<p class="text-slate-500 text-sm mb-4">Earned on: ${badge.awardedAt ? new Date(badge.awardedAt).toLocaleDateString() : 'Recently'}</p>`
          : `<p class="text-slate-500 italic text-sm mb-4">Hint: ${badge.hint || badge.description}</p>`
        }
      ${howToEarnHtml}
    </div>
  `;
  
  badgeModalEl.classList.remove('hidden');
}

function hideBadgeDetailModal() {
  badgeModalEl.classList.add('hidden');
  state.selectedBadgeId = null;
}

// Modal close handlers
closeModalBtn?.addEventListener('click', hideBadgeDetailModal);

badgeModalEl?.addEventListener('click', (e) => {
  if (e.target === badgeModalEl) {
    hideBadgeDetailModal();
  }
});

// ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !badgeModalEl.classList.contains('hidden')) {
    hideBadgeDetailModal();
  }
});

function renderBadgeSummary() {
  const unlockedCount = state.badges.filter((b) => b.unlocked).length;
  const totalCount = state.badges.length;
  
  badgeSummaryEl.innerHTML = `
    <p class="text-slate-700 text-lg font-medium">
      You've unlocked <span class="font-fredoka text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${unlockedCount}</span> of <span class="font-fredoka text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${totalCount}</span> badges!
    </p>
  `;
}

function renderBadgeGrid() {
  badgeGridEl.innerHTML = '';
  emptyStateEl.classList.add('hidden');
  errorStateEl.classList.add('hidden');
  
  if (!state.badges.length) {
    emptyStateEl.classList.remove('hidden');
    return;
  }
  
  // Sort badges: unlocked → locked → rarity → alphabetical
  const sortedBadges = sortBadges([...state.badges]);
  
  sortedBadges.forEach((badge) => {
    badgeGridEl.appendChild(renderBadgeTile(badge));
  });
  
  // If badgeId in URL, open modal after rendering
  if (badgeIdFromUrl) {
    const badge = sortedBadges.find((b) => b.id === badgeIdFromUrl);
    if (badge) {
      setTimeout(() => showBadgeDetailModal(badgeIdFromUrl), 300);
    }
  }
}

async function loadBadges() {
  try {
    badgeGridEl.innerHTML = '';
    emptyStateEl.classList.add('hidden');
    errorStateEl.classList.add('hidden');
    
    console.log('[badges] Loading badges for child:', MOCK_CHILD_ID);
    const badges = await getChildBadges(MOCK_CHILD_ID);
    console.log('[badges] Loaded badges:', badges);
    state.badges = badges;
    
    renderBadgeSummary();
    renderBadgeGrid();
    
    await logBadgeEvent('badge_gallery_viewed', { childId: MOCK_CHILD_ID, badgeCount: badges.length });
  } catch (error) {
    console.error('[badges] Failed to load badges', error);
    badgeGridEl.innerHTML = '';
    emptyStateEl.classList.add('hidden');
    errorStateEl.classList.remove('hidden');
  }
}

// Retry button handler
retryBtn?.addEventListener('click', () => {
  loadBadges();
});

// Initialize - verify script loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBadges);
} else {
  initializeBadges();
}

function initializeBadges() {
  console.log('[badges] Script loaded successfully');
  console.log('[badges] MOCK_CHILD_ID:', MOCK_CHILD_ID);
  console.log('[badges] DOM elements:', {
    badgeGridEl: !!badgeGridEl,
    emptyStateEl: !!emptyStateEl,
    errorStateEl: !!errorStateEl,
    badgeSummaryEl: !!badgeSummaryEl
  });

  if (!badgeGridEl || !emptyStateEl || !errorStateEl || !badgeSummaryEl) {
    console.error('[badges] Missing required DOM elements!', {
      badgeGridEl: !!badgeGridEl,
      emptyStateEl: !!emptyStateEl,
      errorStateEl: !!errorStateEl,
      badgeSummaryEl: !!badgeSummaryEl
    });
    return;
  }

  // Initialize
  loadBadges();
}

