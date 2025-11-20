import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'images',
  appType: 'mpa', // Multi-page app - disable SPA fallback to index.html
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        accountSelection: resolve(__dirname, 'auth/account-type-selection.html'),
        auth: resolve(__dirname, 'auth/auth.html'),
        studentSignup: resolve(__dirname, 'auth/student-signup.html'),
        avatarSelection: resolve(__dirname, 'avatar-selection.html'),
        studentDashboard: resolve(__dirname, 'dashboards/student-dashboard.html'),
        parentDashboardOld: resolve(__dirname, 'dashboards/parent-dashboard.html'),
        teacherDashboard: resolve(__dirname, 'dashboards/teacher-dashboard.html'),
        profile: resolve(__dirname, 'profile.html'),
        mrChloroGuide: resolve(__dirname, 'mr-chloro-guide.html'),
        stellaGradeSelector: resolve(__dirname, 'stella-grade-selector.html'),
        stellaPhotosynthesisAdventure: resolve(__dirname, 'stella-photosynthesis-adventure.html'),
        stellaSpaceGuide: resolve(__dirname, 'stella-space-guide.html'),
        storiesHub: resolve(__dirname, 'stories/index.html'),
        storyDetail: resolve(__dirname, 'stories/story.html'),
        storyReader: resolve(__dirname, 'stories/reader.html'),
        chat: resolve(__dirname, 'chat/index.html'),
        parentDashboard: resolve(__dirname, 'parent/dashboard.html'),
        badges: resolve(__dirname, 'badges/badges.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    // Suppress public directory warnings that flood the terminal
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  // Suppress warnings in console
  logLevel: 'error', // Only show errors, suppress warnings
  clearScreen: false, // Don't clear screen to preserve logs
  configureServer(server) {
    // Store original console methods before overriding
    const originalConsoleError = console.error.bind(console);
    const originalConsoleLog = console.log.bind(console);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    
    // Override process.stderr.write to filter out image warnings
    process.stderr.write = function(chunk, encoding, callback) {
      const message = chunk.toString();
      // Suppress Vite's public directory warnings
      if (message.includes('Instead of /images/avatars') || 
          message.includes('Files in the public directory') ||
          message.includes('use /avatars/')) {
        return true; // Suppress - return true to indicate it was handled
      }
      // Allow everything else through
      return originalStderrWrite(chunk, encoding, callback);
    };
    
    // Override console.error to filter warnings but show our important logs
    console.error = function(...args) {
      const message = args.join(' ');
      // Always show our middleware logs
      if (message.includes('🚨') || message.includes('✅') || message.includes('ROUTE REWRITE') || message.includes('MIDDLEWARE')) {
        originalConsoleError(...args);
      } else {
        // Suppress image warnings
        if (!message.includes('Instead of /images/avatars') && 
            !message.includes('Files in the public directory') &&
            !message.includes('use /avatars/')) {
          originalConsoleError(...args);
        }
      }
    };
    
    // CRITICAL: Add rewrite middleware FIRST before any other processing
    // This MUST run before Vite's static file handler
    server.middlewares.use((req, res, next) => {
        // Capture ORIGINAL URL before ANY processing or normalization
        const originalUrl = req.url || '';
        const method = req.method || 'GET';
        
        // FORCE LOG every request to /child/badges (with or without trailing slash)
        if (originalUrl.includes('/child/badges')) {
          originalConsoleError(`\n🔍 [MIDDLEWARE] ${method} ${originalUrl}\n`);
        }
        
        // ROUTE REWRITES - Check in priority order
        // 1. /child/badges -> /badges/badges.html (HIGHEST PRIORITY)
        // Handle: /child/badges, /child/badges/, /child/badges?, /child/badges/?
        if (originalUrl === '/child/badges' || 
            originalUrl === '/child/badges/' ||
            originalUrl.startsWith('/child/badges/') || 
            originalUrl.startsWith('/child/badges?')) {
          const query = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
          req.url = `/badges/badges.html${query}`;
          originalConsoleError(`\n✅✅✅ ROUTE REWRITE SUCCESS: "${originalUrl}" -> "/badges/badges.html${query}"\n`);
          next();
          return;
        }
        
        // 2. /parent/dashboard -> /parent/dashboard.html
        if (originalUrl === '/parent/dashboard' || originalUrl.startsWith('/parent/dashboard/')) {
          const query = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
          req.url = `/parent/dashboard.html${query}`;
          next();
          return;
        }
        
        next();
    });
    
    // Add general middleware for other routes
    server.middlewares.use((req, res, next) => {
        
        // Parse URL path and query separately
        const [path, queryString] = req.url.split('?');
        const query = queryString ? `?${queryString}` : '';
        
        // Normalize path: remove trailing slash (except root)
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
        
        // Enhanced logging for all routes being processed
        console.log(`[Vite Middleware] ${req.method} ${req.url} -> path: "${path}", normalized: "${normalizedPath}"`);
        
        // Double-check /child/badges after normalization
        if (normalizedPath === '/child/badges' || normalizedPath.startsWith('/child/badges/')) {
          req.url = `/badges/badges.html${query}`;
          console.log(`[Vite] ✓✓✓ REWROTE /child/badges (normalized: "${normalizedPath}") to ${req.url}`);
          next();
          return;
        }
        
        // Rewrite /parent/dashboard to /parent/dashboard.html
        if (normalizedPath === '/parent/dashboard' || normalizedPath.startsWith('/parent/dashboard/')) {
          req.url = `/parent/dashboard.html${query}`;
          console.log(`[Vite] ✓ Rewrote /parent/dashboard to ${req.url}`);
          next();
          return;
        }
      
      // Rewrite /stories/{storyId}/read to /stories/reader.html with storyId in query
      // Match pattern: /stories/{any-non-slash-chars}/read
      const storyMatch = normalizedPath.match(/^\/stories\/([^/]+)\/read$/);
      if (storyMatch) {
        const storyId = storyMatch[1];
        const params = new URLSearchParams(queryString || '');
        // Preserve existing query params (like panel) and add storyId
        params.set('storyId', storyId);
        req.url = `/stories/reader.html?${params.toString()}`;
        console.log(`[Vite] ✓ Rewrote /stories/${storyId}/read to ${req.url}`);
        next();
        return;
      }
      
      // Rewrite /stories (with or without trailing slash) to /stories/index.html
      // Check both original path and normalized path
      if (path === '/stories' || path === '/stories/' || normalizedPath === '/stories') {
        req.url = `/stories/index.html${query}`;
        console.log(`[Vite] ✓ Rewrote /stories to ${req.url}`);
        next();
        return;
      }
      
      // Rewrite /chat (with or without trailing slash) to /chat/index.html
      // Check both original path and normalized path
      if (path === '/chat' || path === '/chat/' || normalizedPath === '/chat') {
        req.url = `/chat/index.html${query}`;
        console.log(`[Vite] ✓ Rewrote /chat to ${req.url}`);
        next();
        return;
      }
      
      // Log unmatched routes for debugging
      if (!normalizedPath.endsWith('.html') && !normalizedPath.startsWith('/assets') && !normalizedPath.startsWith('/@vite') && !normalizedPath.startsWith('/node_modules') && normalizedPath !== '/' && !normalizedPath.startsWith('/images')) {
        console.log(`[Vite] ⚠ Unmatched route: ${normalizedPath}`);
      }
      
      next();
    });
  },
  preview: {
    port: 3000,
    open: true
  }
});
