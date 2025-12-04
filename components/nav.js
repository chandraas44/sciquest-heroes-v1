/**
 * Shared Navigation Component Loader
 * Dynamically loads and injects navigation into pages
 */

// Cache for navigation HTML
let navCache = null;

/**
 * Calculate relative path from current page to target
 */
function getRelativePath(targetPath) {
  const currentPath = window.location.pathname;
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

  // If target starts with /, it's absolute
  if (targetPath.startsWith('/')) {
    return targetPath;
  }

  // Calculate relative path
  const targetParts = targetPath.split('/');
  const currentParts = currentDir.split('/').filter(p => p);

  // Remove filename from current parts
  if (currentParts.length > 0 && currentParts[currentParts.length - 1].includes('.')) {
    currentParts.pop();
  }

  // Build relative path
  let relativePath = '';
  let commonDepth = 0;

  // Find common path depth
  for (let i = 0; i < Math.min(currentParts.length, targetParts.length); i++) {
    if (currentParts[i] === targetParts[i]) {
      commonDepth++;
    } else {
      break;
    }
  }

  // Go up directories
  const upLevels = currentParts.length - commonDepth;
  relativePath = '../'.repeat(upLevels);

  // Add target path
  relativePath += targetParts.slice(commonDepth).join('/');

  return relativePath || './';
}

/**
 * Get base path for navigation links based on current page location
 */
function getBasePath() {
  const path = window.location.pathname;

  // Root level pages
  if (path === '/' || path === '/index.html') {
    return '';
  }

  // Pages in subdirectories
  const depth = path.split('/').filter(p => p && !p.includes('.html')).length - 1;
  return '/';
}

/**
 * Get the correct path to config.js based on current page location
 */
function getConfigPath() {
  return '/config.js';
}

/**
 * Check if user is authenticated
 */
async function checkAuth() {
  try {
    const configPath = getConfigPath();
    const { createSupabaseClientAsync } = await import(configPath);
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    
    // createSupabaseClientAsync already waits for Netlify config and handles null
    const supabase = await createSupabaseClientAsync(createClient);
    if (!supabase) return false;
    
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.warn('[nav] Auth check failed, assuming not authenticated:', error);
    return false;
  }
}

/**
 * Get current page identifier for active link highlighting
 */
function getCurrentPage() {
  const path = window.location.pathname;

  if (path.includes('/stories/')) {
    if (path.includes('/reader.html') || path.includes('/read')) {
      return 'stories-reader';
    }
    if (path.includes('/story.html')) {
      return 'stories-detail';
    }
    return 'stories';
  }

  if (path.includes('/chat/')) {
    return 'chat';
  }

  if (path.includes('/profile.html')) {
    return 'profile';
  }

  if (path.includes('/parent/dashboard')) {
    return 'parent-dashboard';
  }





  if (path.includes('/badges/') || path.includes('/child/badges')) {
    return 'badges';
  }

  if (path === '/' || path.includes('/index.html')) {
    return 'home';
  }

  return 'unknown';
}

/**
 * Load user profile data for dropdown
 */
async function loadUserProfile(userId, basePath) {
  try {
    const configPath = getConfigPath();
    const { createSupabaseClientAsync } = await import(configPath);
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    
    // createSupabaseClientAsync already waits for Netlify config and handles null
    const supabase = await createSupabaseClientAsync(createClient);
    if (!supabase) return null;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('username, first_name, email, avatar_url, account_type')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return profile;
  } catch (error) {
    console.warn('[nav] Failed to load user profile:', error);
    return null;
  }
}

/**
 * Update user menu dropdown with profile data
 */
function updateUserMenu(profile, basePath) {
  const userAvatarNav = document.getElementById('userAvatarNav');
  const userNameNav = document.getElementById('userNameNav');
  const profileLink = document.getElementById('profileLink');
  const homeLink = document.getElementById('homeLink');

  if (!userAvatarNav || !userNameNav || !profileLink) {
    return;
  }

  // Set avatar
  if (profile?.avatar_url) {
    userAvatarNav.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
  } else {
    // Fallback: first letter of username → first_name → email
    const initial = (profile?.username?.charAt(0) ||
      profile?.first_name?.charAt(0) ||
      profile?.email?.charAt(0) ||
      'U').toUpperCase();
    userAvatarNav.textContent = initial;
  }

  // Set display name
  const displayName = profile?.first_name || profile?.username || profile?.email || 'User';
  userNameNav.textContent = displayName;

  // Set dropdown links
  profileLink.href = `${basePath}profile.html`;
  if (homeLink) {
    homeLink.href = `${basePath}index.html`;
  }
}

/**
 * Setup user menu dropdown event handlers
 */
function setupUserMenuDropdown() {
  const userMenuTrigger = document.getElementById('userMenuTrigger');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');

  if (!userMenuTrigger || !dropdownMenu) {
    return;
  }

  // Toggle dropdown on trigger click
  userMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userMenuTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });

  // Handle logout from dropdown
  if (logoutBtnDropdown) {
    logoutBtnDropdown.addEventListener('click', handleLogout);
  }
}

/**
 * Build navigation links based on page context
 */
function buildNavLinks(isAuthenticated, basePath, currentPage, profile) {
  const links = [];

  if (isAuthenticated) {
    // Authenticated navigation (no logout button - it's in dropdown)
    const homeActive = (currentPage === 'parent-dashboard' || currentPage === 'student-dashboard') ? 'text-purple-600 font-bold' : 'text-slate-700 hover:text-purple-600 transition font-bold';
    const storiesActive = currentPage === 'stories' || currentPage === 'stories-reader' || currentPage === 'stories-detail' ? 'text-purple-600 font-bold' : 'text-slate-700 hover:text-purple-600 transition font-bold';
    const chatActive = currentPage === 'chat' ? 'text-purple-600 font-bold' : 'text-slate-700 hover:text-purple-600 transition font-bold';
    const badgesActive = currentPage === 'badges' ? 'text-purple-600 font-bold' : 'text-slate-700 hover:text-purple-600 transition font-bold';

    // Determine Home link based on account type
    let homeLink = `${basePath}index.html`; // Default fallback
    if (profile?.account_type === 'parent') {
      homeLink = `${basePath}parent/dashboard.html`;
    } else if (profile?.account_type === 'student') {
      homeLink = `${basePath}stories/index.html`;
    } else if (profile?.account_type === 'teacher') {
      homeLink = `${basePath}dashboards/teacher-dashboard.html`;
    }

    // Only show navigation links for non-parent and non-student accounts
    // Parents don't need these links on their dashboard as requested
    // Students also don't need Home link as requested
    // Only show navigation links for non-parent accounts
    // Parents don't need these links on their dashboard as requested
    if (profile?.account_type !== 'parent') {
      let navItems = '';

      // Only show Home link if NOT a student
      if (profile?.account_type !== 'student') {
        navItems += `
        <a href="${homeLink}" class="font-fredoka ${homeActive}">
          Home
        </a>`;
      }

      // Show other links for all non-parent accounts (including students)
      navItems += `
        <a href="${basePath}stories/index.html" class="font-fredoka ${storiesActive}">
          Stories
        </a>
        <a href="${basePath}chat/index.html" class="font-fredoka ${chatActive}">
          Chat
        </a>
        <a href="${basePath}badges/badges.html" class="font-fredoka ${badgesActive}">
          Badges
        </a>
      `;

      links.push(navItems);
    }
  } else {
    // Public navigation (home page)
    links.push(`
      <a href="/index.html#how-it-works" class="font-fredoka text-slate-700 hover:text-purple-600 transition font-bold text-lg">
        How It Works
      </a>
      <a href="/index.html#for-parents" class="font-fredoka text-slate-700 hover:text-purple-600 transition font-bold text-lg">
        For Parents
      </a>
      <button class="btn-3d mr-4" onclick="window.location.href='${basePath}auth/auth.html?type=parent&mode=signup'">
        Join For Free
      </button>
      <button class="btn-3d bg-white text-purple-600" onclick="window.location.href='${basePath}auth/auth.html?mode=login'">
        Log In
      </button>
    `);
  }

  return links.join('');
}

/**
 * Handle logout functionality
 */
async function handleLogout() {
  try {
    const configPath = getConfigPath();
    const { createSupabaseClientAsync } = await import(configPath);
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    
    // createSupabaseClientAsync already waits for Netlify config and handles null
    const supabase = await createSupabaseClientAsync(createClient);
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  } catch (error) {
    console.log('[nav] Supabase logout skipped (mock mode or not configured)');
  }

  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();

  // Redirect to auth page
  const basePath = getBasePath();
  window.location.href = `${basePath}auth/auth.html?mode=login`;
}

/**
 * Get the correct path to nav.html based on current page location
 */
function getNavHtmlPath() {
  return '/components/nav.html';
}

/**
 * Load and inject navigation
 */
async function loadNavigation() {
  const container = document.getElementById('nav-container');
  if (!container) {
    console.warn('[nav] Navigation container not found');
    return;
  }

  try {
    // Load navigation HTML
    if (!navCache) {
      const navPath = getNavHtmlPath();
      const response = await fetch(navPath);
      if (!response.ok) {
        throw new Error(`Failed to load navigation: ${response.status}`);
      }
      navCache = await response.text();
    }

    // Inject navigation HTML
    container.innerHTML = navCache;

    // Get context
    const isAuthenticated = await checkAuth();
    const basePath = getBasePath();
    const currentPage = getCurrentPage();

    // Load profile if authenticated
    let profile = null;
    if (isAuthenticated) {
      try {
        const configPath = getConfigPath();
        const { createSupabaseClientAsync } = await import(configPath);
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
        
        // createSupabaseClientAsync already waits for Netlify config and handles null
        const supabase = await createSupabaseClientAsync(createClient);
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            profile = await loadUserProfile(session.user.id, basePath);
          }
        }
      } catch (error) {
        console.warn('[nav] Could not load user profile:', error);
      }
    }

    // Set brand link
    const brandLink = document.getElementById('navBrandLink');
    if (brandLink) {
      if (isAuthenticated && profile) {
        // Use the same logic as buildNavLinks to determine home
        let homeLink = `${basePath}index.html`;
        if (profile.account_type === 'parent') {
          homeLink = `${basePath}parent/dashboard.html`;
        } else if (profile.account_type === 'student') {
          homeLink = `${basePath}stories/index.html`;
        } else if (profile.account_type === 'teacher') {
          homeLink = `${basePath}dashboards/teacher-dashboard.html`;
        }
        brandLink.href = homeLink;
      } else {
        brandLink.href = '/index.html';
      }
    }

    // Build and inject navigation links
    const navLinksContainer = document.getElementById('navDesktopLinks');
    if (navLinksContainer) {
      navLinksContainer.innerHTML = buildNavLinks(isAuthenticated, basePath, currentPage, profile);
    }

    // Handle authenticated state UI
    if (isAuthenticated) {
      if (profile) {
        updateUserMenu(profile, basePath);
      }

      // Show user menu dropdown (desktop only)
      const userMenuContainer = document.getElementById('userMenuContainer');
      if (userMenuContainer) {
        userMenuContainer.style.display = 'block';
      }

      // Setup dropdown event handlers
      setupUserMenuDropdown();

      // Show mobile logout button (only on mobile viewports - lg:hidden class handles desktop hiding)
      const mobileLogoutBtn = document.getElementById('logoutBtnMobile');
      if (mobileLogoutBtn) {
        // Remove inline display:none to allow lg:hidden class to work
        mobileLogoutBtn.style.display = '';
        mobileLogoutBtn.classList.remove('hidden');
        mobileLogoutBtn.classList.add('lg:hidden');
        mobileLogoutBtn.addEventListener('click', handleLogout);
      }
    } else {
      // Hide user menu and mobile logout button for unauthenticated users
      const userMenuContainer = document.getElementById('userMenuContainer');
      if (userMenuContainer) {
        userMenuContainer.style.display = 'none';
      }

      const mobileLogoutBtn = document.getElementById('logoutBtnMobile');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.style.display = 'none';
        mobileLogoutBtn.classList.add('hidden');
      }
    }

    // Dispatch event that nav is loaded
    window.dispatchEvent(new CustomEvent('navLoaded', { detail: { isAuthenticated, currentPage, profile } }));

  } catch (error) {
    console.error('[nav] Failed to load navigation:', error);
    // Fallback: show basic navigation
    if (container) {
      container.innerHTML = `
        <nav class="fixed w-full z-50 backdrop-blur-xl bg-white/95 border-b border-purple-200 shadow-lg">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
              <div class="flex items-center space-x-4">
                <div class="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-pink-600 rounded-3xl flex items-center justify-center border-4 border-purple-200 shadow-lg">
                  <span class="text-3xl">🚀</span>
                </div>
                <a href="${getBasePath()}index.html" class="font-fredoka text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  SciQuest Heroes
                </a>
              </div>
            </div>
          </div>
        </nav>
      `;
    }
  }
}

// Auto-load navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
  loadNavigation();
}

