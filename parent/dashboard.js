import {
  getParentChildren,
  getChildProgress,
  getChildBadges,
  logAnalyticsEvent,
  getCurrentUser
} from './dashboard-services.js';
import {
  getBadgeById,
  getBadgeProgress
} from '../badges/badge-services.js';

// Mock parent ID for now (will be from auth in future)
// MOCK_PARENT_ID removed - using real auth


const state = {
  selectedChildId: null,
  children: [],
  progress: null,
  badges: null,
  activeTab: 'overview'
};

const childrenListEl = document.getElementById('childrenList');
const emptyStateEl = document.getElementById('emptyState');
const childDetailEl = document.getElementById('childDetail');
const childHeaderEl = document.getElementById('childHeader');
const learningSnapshotEl = document.getElementById('learningSnapshot');
const tabOverviewEl = document.getElementById('tabOverview');
const tabStoriesEl = document.getElementById('tabStories');
const tabQuizzesEl = document.getElementById('tabQuizzes');
const badgesSectionEl = document.getElementById('badgesSection');
const badgesSummaryEl = document.getElementById('badgesSummary');
const badgesContainerEl = document.getElementById('badgesContainer');

// Check URL params for childId
const params = new URLSearchParams(window.location.search);
const childIdFromUrl = params.get('childId');

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

function calculateChildStatus(child) {
  if (!child.lastActive) return 'Needs Attention';
  const lastActive = new Date(child.lastActive);
  const daysSince = (new Date() - lastActive) / (1000 * 60 * 60 * 24);
  return daysSince <= 7 ? 'On Track' : 'Needs Attention';
}

function renderChildCard(child) {
  const card = document.createElement('div');
  const isSelected = state.selectedChildId === child.id;
  const status = child.status || calculateChildStatus(child);

  card.className = `bg-gradient-to-br from-purple-50 to-pink-50 border-2 ${isSelected ? 'border-purple-500 shadow-[0_0_30px_rgba(139,92,246,0.4)]' : 'border-purple-200'
    } rounded-3xl p-4 mb-4 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition cursor-pointer`;

  // Get stats from progress (only for selected child, otherwise show defaults)
  let stats = { completed: 0, inProgress: 0 };
  let quizAttempts = 0;
  if (isSelected && state.progress) {
    stats = state.progress.stories || stats;
    quizAttempts = state.progress.quizzes?.attempts || 0;
  }

  card.innerHTML = `
    <div class="flex items-center gap-4 mb-3">
      <img
        src="${child.avatarUrl || '/avatars/child1.png'}"
        alt="${child.firstName}"
        class="w-16 h-16 rounded-full border-4 border-purple-200 object-cover"
        onerror="this.src='/avatars/child1.png'"
      />
      <div class="flex-1">
        <h3 class="font-fredoka text-xl font-bold text-slate-700 mb-1">${child.firstName || child.username}</h3>
        <p class="text-slate-600 text-sm">${child.gradeLevel || 'Grade N/A'} · Age ${child.age || 'N/A'}</p>
      </div>
    </div>
    <p class="text-slate-600 text-xs font-semibold mb-3">
      Stories: ${stats.completed} · Quizzes: ${quizAttempts}
    </p>
    <div class="flex items-center justify-between mb-3">
      <span class="px-3 py-1 rounded-full text-xs font-bold ${status === 'On Track'
      ? 'bg-green-500/30 text-green-100 border border-green-400/50'
      : 'bg-amber-500/30 text-amber-100 border border-amber-400/50'
    }">
        ${status}
      </span>
    </div>
    <button class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg">
      View Progress
    </button>
  `;

  card.querySelector('button').addEventListener('click', () => {
    selectChild(child.id);
  });

  return card;
}

function renderChildrenList() {
  childrenListEl.innerHTML = '';
  if (!state.children.length) {
    childrenListEl.innerHTML = '<p class="text-slate-500 text-sm">No children found.</p>';
    return;
  }

  state.children.forEach((child) => {
    childrenListEl.appendChild(renderChildCard(child));
  });
}

async function selectChild(childId) {
  state.selectedChildId = childId;

  // Update URL
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('childId', childId);
  window.history.pushState({ childId }, '', newUrl);

  // Log analytics
  await logAnalyticsEvent('parent_child_switch', { childId });

  // Load child data
  await loadChildData(childId);

  // Re-render children list to show selection
  renderChildrenList();

  // Show child detail, hide empty state
  emptyStateEl.classList.add('hidden');
  childDetailEl.classList.remove('hidden');
}

async function loadChildData(childId) {
  try {
    // Load progress and badges in parallel
    const [progress, badges] = await Promise.all([
      getChildProgress(childId),
      getChildBadges(childId)
    ]);

    state.progress = progress;
    state.badges = badges;

    // Re-render all sections
    renderChildHeader();
    renderLearningSnapshot();
    renderProgressTabs();
    renderBadges();

    await logAnalyticsEvent('child_progress_viewed', { childId });
  } catch (error) {
    console.error('[dashboard] Failed to load child data', error);
    childDetailEl.innerHTML = `
      <div class="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center">
        <p class="text-red-600 font-semibold">Unable to load progress data. Please try again.</p>
      </div>
    `;
  }
}

function renderChildHeader() {
  if (!state.selectedChildId || !state.children.length) return;

  const child = state.children.find((c) => c.id === state.selectedChildId);
  if (!child) return;

  const lastActiveRelative = formatRelativeTime(child.lastActive);
  const currentTopic = child.currentTopic || 'None';

  childHeaderEl.innerHTML = `
    <div class="flex items-center gap-4">
      <img
        src="${child.avatarUrl || '/avatars/child1.png'}"
        alt="${child.firstName}"
        class="w-16 h-16 rounded-full border-4 border-purple-200 object-cover"
        onerror="this.src='/avatars/child1.png'"
      />
      <div>
        <h2 class="font-fredoka text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${child.firstName || child.username}</h2>
        <p class="text-slate-600 text-sm mt-1">
          Last active: ${lastActiveRelative} · Current topic: ${currentTopic}
        </p>
      </div>
    </div>
  `;
}

function renderLearningSnapshot() {
  if (!state.progress) return;

  const stories = state.progress.stories || { completed: 0, inProgress: 0 };
  const quizzes = state.progress.quizzes || { averageScore: 0 };
  const chat = state.progress.chat || { questionsThisWeek: 0 };
  const streak = state.progress.streak || { days: 0 };

  learningSnapshotEl.innerHTML = `
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">📚</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${stories.completed} / ${stories.inProgress}</div>
      <p class="text-slate-600 text-xs font-medium">Stories completed: ${stories.completed} / In progress: ${stories.inProgress}</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">🏆</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${quizzes.averageScore}%</div>
      <p class="text-slate-600 text-xs font-medium">Average quiz score: ${quizzes.averageScore}%</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">💬</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${chat.questionsThisWeek}</div>
      <p class="text-slate-600 text-xs font-medium">Questions asked this week: ${chat.questionsThisWeek}</p>
    </div>
    <div class="metric-card bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
        <span class="text-2xl">🔥</span>
      </div>
      <div class="font-fredoka text-2xl font-bold text-slate-700 mb-1">${streak.days}</div>
      <p class="text-slate-600 text-xs font-medium">Learning streak: ${streak.days} days</p>
    </div>
  `;
}

function renderProgressTabs() {
  // Render active tab
  if (state.activeTab === 'overview') {
    renderOverviewTab();
  } else if (state.activeTab === 'stories') {
    renderStoriesTab();
  } else if (state.activeTab === 'quizzes') {
    renderQuizzesTab();
  }
}

function renderOverviewTab() {
  if (!state.progress) return;

  const activity = state.progress.activity || { last7Days: [], topicsExplored: [] };
  const child = state.children.find((c) => c.id === state.selectedChildId);
  const childName = child?.firstName || 'Your child';

  // Calculate summary
  const topicCount = activity.topicsExplored?.length || 0;
  const storyCount = state.progress.stories?.completed || 0;

  // Simple line chart (placeholder - can be enhanced with Chart.js later)
  const maxSessions = Math.max(...activity.last7Days.map((d) => d.sessions), 1);
  const chartHeight = 192; // h-48 = 192px

  let lineChartSvg = `
    <svg viewBox="0 0 300 ${chartHeight}" class="w-full h-full">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.1" />
        </linearGradient>
      </defs>
  `;

  // Draw grid lines and bars
  activity.last7Days.forEach((day, index) => {
    const x = (index * 300) / 7 + 20;
    const barHeight = (day.sessions / maxSessions) * (chartHeight - 40);
    const y = chartHeight - 20 - barHeight;

    lineChartSvg += `
      <rect x="${x}" y="${y}" width="30" height="${barHeight}" fill="url(#lineGradient)" rx="4" />
      <text x="${x + 15}" y="${chartHeight - 5}" text-anchor="middle" fill="#475569" font-size="10" opacity="0.7">
        ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
      </text>
    `;
  });

  lineChartSvg += '</svg>';

  // Bar chart for topics
  const maxTopicCount = Math.max(...(activity.topicsExplored.map((t) => t.count) || [1]), 1);
  let barChartSvg = `
    <svg viewBox="0 0 300 ${chartHeight}" class="w-full h-full">
  `;

  activity.topicsExplored.slice(0, 5).forEach((topic, index) => {
    const x = (index * 300) / 5 + 20;
    const barHeight = (topic.count / maxTopicCount) * (chartHeight - 40);
    const y = chartHeight - 20 - barHeight;

    barChartSvg += `
      <rect x="${x}" y="${y}" width="40" height="${barHeight}" fill="url(#lineGradient)" rx="4" />
      <text x="${x + 20}" y="${chartHeight - 5}" text-anchor="middle" fill="#475569" font-size="8" opacity="0.7" transform="rotate(-45 ${x + 20} ${chartHeight - 5})">
        ${topic.topic.substring(0, 10)}
      </text>
    `;
  });

  barChartSvg += '</svg>';

  tabOverviewEl.innerHTML = `
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <div class="chart-container bg-white rounded-xl p-4 border-2 border-purple-200">
        <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Last 7 Days Activity</h4>
        <div class="h-48">${lineChartSvg}</div>
      </div>
      <div class="chart-container bg-white rounded-xl p-4 border-2 border-purple-200">
        <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Topics Explored</h4>
        <div class="h-48">${barChartSvg}</div>
      </div>
    </div>
    <p class="text-slate-600 text-sm font-medium bg-white rounded-xl p-4 border-2 border-purple-200">
      This week, ${childName} explored ${topicCount} topics and completed ${storyCount} new stories.
    </p>
  `;
}

function renderStoriesTab() {
  if (!state.progress?.stories?.byTopic) {
    tabStoriesEl.innerHTML = '<p class="text-slate-500 text-sm">No story progress data available.</p>';
    return;
  }

  const topics = state.progress.stories.byTopic;

  let storiesHtml = '<div class="stories-list space-y-3">';

  topics.forEach((topic) => {
    const completionPercent = topic.completionPercentage || 0;
    const lastOpenedRelative = formatRelativeTime(topic.lastOpened);

    storiesHtml += `
      <div class="topic-progress-row bg-white rounded-xl p-4 hover:bg-purple-50 transition border-2 border-purple-200">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center">
            <span class="text-xl">${topic.icon || '📚'}</span>
          </div>
          <h4 class="font-fredoka text-lg font-bold text-slate-700">${topic.topic}</h4>
        </div>
        <div class="mb-2">
          <div class="bg-purple-100 rounded-full h-3 mb-1">
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${completionPercent}%"></div>
          </div>
          <p class="text-slate-700 text-xs font-semibold">${completionPercent}%</p>
        </div>
        <p class="text-slate-600 text-xs">
          Stories read: ${topic.storiesRead || 0} · In progress: ${topic.inProgress || 0} · Last opened: ${lastOpenedRelative}
        </p>
      </div>
    `;
  });

  storiesHtml += '</div>';
  tabStoriesEl.innerHTML = storiesHtml;
}

function renderQuizzesTab() {
  if (!state.progress?.quizzes) {
    tabQuizzesEl.innerHTML = '<p class="text-slate-500 text-sm">No quiz data available.</p>';
    return;
  }

  const quizzes = state.progress.quizzes.byTopic || [];

  if (!quizzes.length) {
    tabQuizzesEl.innerHTML = '<p class="text-slate-500 text-sm">No quiz attempts yet.</p>';
    return;
  }

  // Bar chart for quiz performance
  const maxScore = Math.max(...quizzes.map((q) => q.averageScore || 0), 100);
  const chartHeight = 192;

  let quizChartSvg = `
    <svg viewBox="0 0 300 ${chartHeight}" class="w-full h-full">
      <defs>
        <linearGradient id="quizGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.3" />
        </linearGradient>
      </defs>
  `;

  quizzes.forEach((quiz, index) => {
    const x = (index * 300) / quizzes.length + 20;
    const barHeight = ((quiz.averageScore || 0) / maxScore) * (chartHeight - 40);
    const y = chartHeight - 20 - barHeight;

    quizChartSvg += `
      <rect x="${x}" y="${y}" width="40" height="${barHeight}" fill="url(#quizGradient)" rx="4" />
      <text x="${x + 20}" y="${chartHeight - 5}" text-anchor="middle" fill="#475569" font-size="8" opacity="0.7" transform="rotate(-45 ${x + 20} ${chartHeight - 5})">
        ${quiz.topic.substring(0, 10)}
      </text>
    `;
  });

  quizChartSvg += '</svg>';

  // Table
  let tableHtml = `
    <div class="bg-white rounded-xl p-4 overflow-x-auto border-2 border-purple-200">
      <table class="w-full">
        <thead>
          <tr class="border-b border-purple-200">
            <th class="text-left text-slate-700 font-bold text-sm py-2">Topic</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Attempts</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Best Score</th>
            <th class="text-left text-slate-700 font-bold text-sm py-2">Last Attempt</th>
          </tr>
        </thead>
        <tbody>
  `;

  quizzes.forEach((quiz) => {
    const lastAttemptRelative = formatRelativeTime(quiz.lastAttempt);
    tableHtml += `
      <tr class="border-b border-purple-100">
        <td class="text-slate-600 text-sm py-2">${quiz.topic}</td>
        <td class="text-slate-600 text-sm py-2">${quiz.attempts || 0}</td>
        <td class="text-slate-600 text-sm py-2">${quiz.bestScore || 0}%</td>
        <td class="text-slate-600 text-sm py-2">${lastAttemptRelative}</td>
      </tr>
    `;
  });

  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  tabQuizzesEl.innerHTML = `
    <div class="chart-container bg-white rounded-xl p-4 mb-4 border-2 border-purple-200">
      <h4 class="font-fredoka text-sm font-bold text-slate-700 mb-3">Quiz Performance by Topic</h4>
      <div class="h-48">${quizChartSvg}</div>
    </div>
    ${tableHtml}
  `;
}

function renderBadges() {
  if (!state.badges?.coreBadges) {
    badgesSectionEl.classList.add('hidden');
    return;
  }

  badgesSectionEl.classList.remove('hidden');

  const badges = state.badges.coreBadges;
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;

  const child = state.children.find((c) => c.id === state.selectedChildId);
  const childName = child?.firstName || 'Your child';

  badgesSummaryEl.textContent = `${childName} has unlocked ${unlockedCount} of ${totalCount} core curiosity badges.`;

  badgesContainerEl.innerHTML = '';

  badges.forEach((badge) => {
    const tile = document.createElement('div');
    tile.className = `badge-tile bg-white border-2 border-purple-200 rounded-2xl p-4 min-w-[180px] flex-shrink-0 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:border-purple-300 transition relative cursor-pointer`;
    tile.dataset.badgeId = badge.id;

    const iconClass = badge.unlocked
      ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]'
      : 'bg-purple-100 border-2 border-purple-200';

    const iconOpacity = badge.unlocked ? '' : 'opacity-70';

    tile.innerHTML = `
      <div class="badge-icon-container mb-3 flex justify-center relative">
        <div class="badge-icon w-16 h-16 rounded-full flex items-center justify-center ${iconClass}">
          <span class="text-3xl ${iconOpacity}">${badge.icon || '🏆'}</span>
        </div>
        ${badge.unlocked
        ? '<span class="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>'
        : '<span class="absolute top-0 right-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-xs">🔒</span>'}
      </div>
      <h4 class="font-fredoka text-base font-bold text-slate-700 mb-2 text-center">${badge.name}</h4>
      <p class="text-slate-600 text-xs text-center ${!badge.unlocked ? 'italic text-slate-500' : ''}">
        ${badge.unlocked ? `Earned on: ${badge.awardedAt ? new Date(badge.awardedAt).toLocaleDateString() : 'Recently'}` : `Hint: ${badge.hint || badge.description}`}
      </p>
    `;

    // Click handler to open badge detail modal
    tile.addEventListener('click', () => {
      showBadgeDetailModal(badge.id);
    });

    badgesContainerEl.appendChild(tile);
  });
}

async function showBadgeDetailModal(badgeId) {
  const badge = await getBadgeById(badgeId);
  if (!badge) {
    alert('Badge not found');
    return;
  }

  // Check if child has this badge unlocked
  const childBadges = state.badges?.coreBadges || [];
  const childBadge = childBadges.find((b) => b.id === badgeId);
  const isUnlocked = childBadge?.unlocked || false;

  // Get progress if locked
  let progress = null;
  if (!isUnlocked && state.selectedChildId) {
    progress = await getBadgeProgress(state.selectedChildId, badgeId);
  }

  // Create modal HTML
  const iconClass = isUnlocked
    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]'
    : 'bg-purple-100 border-2 border-purple-200';

  const iconOpacity = isUnlocked ? '' : 'opacity-70';

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

  const modalHtml = `
    <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white border-2 border-purple-200 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(139,92,246,0.3)] relative">
        <button
          id="closeBadgeModalBtn"
          class="absolute top-4 right-4 text-slate-600 hover:text-slate-900 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-50 transition"
        >
          ×
        </button>
        <div class="text-center">
          <div class="badge-icon-container mb-4 flex justify-center relative">
            <div class="badge-icon w-32 h-32 rounded-full flex items-center justify-center ${iconClass} mx-auto">
              <span class="text-6xl ${iconOpacity}">${badge.icon || '🏆'}</span>
            </div>
            ${isUnlocked
      ? '<span class="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>'
      : '<span class="absolute top-0 right-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 text-sm">🔒</span>'}
          </div>
          <h3 class="font-fredoka text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">${badge.name}</h3>
          <p class="text-slate-600 text-lg mb-4">${badge.description}</p>
          ${progressHtml}
          ${isUnlocked
      ? `<p class="text-slate-500 text-sm mb-4">Earned on: ${childBadge?.awardedAt ? new Date(childBadge.awardedAt).toLocaleDateString() : 'Recently'}</p>`
      : `<p class="text-slate-500 italic text-sm mb-4">Hint: ${badge.hint || badge.description}</p>`
    }
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('badgeDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modalEl = document.createElement('div');
  modalEl.id = 'badgeDetailModal';
  modalEl.innerHTML = modalHtml;
  document.body.appendChild(modalEl);

  // Close handlers
  const closeBtn = modalEl.querySelector('#closeBadgeModalBtn');
  closeBtn.addEventListener('click', () => {
    modalEl.remove();
  });

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      modalEl.remove();
    }
  });

  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape' && document.getElementById('badgeDetailModal')) {
      document.getElementById('badgeDetailModal')?.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  await logAnalyticsEvent('badge_detail_viewed', { badgeId, childId: state.selectedChildId });
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab;
    state.activeTab = tab;

    // Update active state
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.className = b.className.replace(/bg-gradient-to-r from-purple-500 to-pink-500 text-white/g, 'bg-purple-100 text-slate-600 hover:bg-purple-200');
      b.className = b.className.replace(/active/g, '');
    });
    btn.className = btn.className.replace(/bg-purple-100 text-slate-600 hover:bg-purple-200/g, 'bg-gradient-to-r from-purple-500 to-pink-500 text-white');
    btn.className += ' active';

    // Hide all tab contents
    tabOverviewEl.classList.add('hidden');
    tabStoriesEl.classList.add('hidden');
    tabQuizzesEl.classList.add('hidden');

    // Show active tab
    if (tab === 'overview') {
      tabOverviewEl.classList.remove('hidden');
    } else if (tab === 'stories') {
      tabStoriesEl.classList.remove('hidden');
    } else if (tab === 'quizzes') {
      tabQuizzesEl.classList.remove('hidden');
    }

    await logAnalyticsEvent('progress_tab_switched', { tab, childId: state.selectedChildId });
    renderProgressTabs();
  });
});

// Badge rules button
document.getElementById('viewBadgeRulesBtn')?.addEventListener('click', () => {
  alert('Badge rules will be available soon! 🏆');
  // Future: Open modal or navigate to badge rules page
});

// Initialize
async function loadDashboard() {
  try {
    // Get current user
    const user = await getCurrentUser();

    if (!user) {
      console.log('No user found, redirecting to login');
      window.location.href = '../auth/auth.html';
      return;
    }

    const parentId = user.id;

    // Load children list
    const children = await getParentChildren(parentId);
    state.children = children;
    renderChildrenList();

    // If childId in URL, select that child
    if (childIdFromUrl) {
      const child = children.find((c) => c.id === childIdFromUrl);
      if (child) {
        await selectChild(childIdFromUrl);
      }
    }

    await logAnalyticsEvent('dashboard_viewed', { parentId });
  } catch (error) {
    console.error('[dashboard] Failed to load dashboard', error);
    childrenListEl.innerHTML = '<p class="text-red-600 text-sm">Unable to load dashboard data.</p>';
  }
}

loadDashboard();

