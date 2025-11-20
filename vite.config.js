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
    
    // CRITICAL: Create rewrite middleware function that runs FIRST
    const rewriteMiddleware = (req, res, next) => {
      const originalUrl = req.url || '';
      const method = req.method || 'GET';
      
      // FORCE LOG ALL /child/badges requests to see if middleware is hit
      if (originalUrl.includes('/child/badges') || originalUrl === '/child/badges') {
        originalConsoleError(`\n🔍🔍🔍 MIDDLEWARE HIT: ${method} "${originalUrl}"\n`);
      }
      
      // EARLY CHECK: If URL contains /child/badges, rewrite immediately (before any parsing)
      if (originalUrl.includes('/child/badges')) {
        const [path, queryString] = originalUrl.split('?');
        const query = queryString ? `?${queryString}` : '';
        req.url = `/badges/badges.html${query}`;
        originalConsoleError(`\n✅✅✅ ROUTE REWRITE SUCCESS: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // Parse URL: split path and query
      const [path, queryString] = originalUrl.split('?');
      const query = queryString ? `?${queryString}` : '';
      
      // Normalize path: remove trailing slash (except root)
      const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
      
      // ROUTE REWRITES - Check in priority order
      
      // 1. /child/badges -> /badges/badges.html (HIGHEST PRIORITY - redundant check for safety)
      if (normalizedPath === '/child/badges' || 
          path === '/child/badges' || 
          path === '/child/badges/' ||
          path.startsWith('/child/badges/') ||
          path.startsWith('/child/badges?')) {
        req.url = `/badges/badges.html${query}`;
        originalConsoleError(`\n✅ ROUTE REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // 2. /parent/dashboard -> /parent/dashboard.html
      if (normalizedPath === '/parent/dashboard' || path.startsWith('/parent/dashboard/')) {
        req.url = `/parent/dashboard.html${query}`;
        originalConsoleError(`\n✅ ROUTE REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // 3. /stories/{storyId}/read -> /stories/reader.html
      const storyMatch = normalizedPath.match(/^\/stories\/([^/]+)\/read$/);
      if (storyMatch) {
        const storyId = storyMatch[1];
        const params = new URLSearchParams(queryString || '');
        params.set('storyId', storyId);
        req.url = `/stories/reader.html?${params.toString()}`;
        originalConsoleError(`\n✅ ROUTE REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // 4. /stories -> /stories/index.html
      if (normalizedPath === '/stories') {
        req.url = `/stories/index.html${query}`;
        originalConsoleError(`\n✅ ROUTE REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // 5. /chat -> /chat/index.html
      if (normalizedPath === '/chat') {
        req.url = `/chat/index.html${query}`;
        originalConsoleError(`\n✅ ROUTE REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
        next();
        return;
      }
      
      // Continue to next middleware (Vite's static file handler)
      next();
    };
    
    // Register middleware - this should run before Vite's static file handler
    // In Vite, middleware registered in configureServer runs before static file serving
    server.middlewares.use(rewriteMiddleware);
    
    // Log that middleware is registered
    originalConsoleError('\n✅✅✅ REWRITE MIDDLEWARE REGISTERED - Will handle /child/badges, /parent/dashboard, etc.\n');
  },
  preview: {
    port: 3000,
    open: true
  }
});
