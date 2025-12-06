import { defineConfig } from 'vite';
import { resolve } from 'path';

// Vite plugin for route rewriting - more reliable than middleware
const routeRewritePlugin = () => {
  return {
    name: 'route-rewrite',
    configureServer(server) {
      // Register middleware FIRST in the plugin
      server.middlewares.use((req, res, next) => {
        const originalUrl = req.url || '';
        const method = req.method || 'GET';

        // Parse URL
        const [path, queryString] = originalUrl.split('?');
        const query = queryString ? `?${queryString}` : '';

        // Skip rewriting for asset files (JS, CSS, images, etc.)
        const isAssetFile = /\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(path);
        if (isAssetFile) {
          next();
          return;
        }

        // ABSOLUTE FIRST: /child/badges -> /badges/badges.html (exact match only, no trailing slash)
        if (path === '/child/badges' || path === '/child/badges/') {
          req.url = `/badges/badges.html${query}`;
          process.stdout.write(`\n🚨🚨🚨 PLUGIN REWRITE: ${method} "${originalUrl}" -> "${req.url}" 🚨🚨🚨\n`);
          next();
          return;
        }

        // Other routes...
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');

        // 2. /parent/dashboard -> /parent/dashboard.html
        if (normalizedPath === '/parent/dashboard' || path.startsWith('/parent/dashboard/')) {
          req.url = `/parent/dashboard.html${query}`;
          process.stdout.write(`\n✅ PLUGIN REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
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
          process.stdout.write(`\n✅ PLUGIN REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
          next();
          return;
        }

        // 4. /stories -> /stories/index.html
        if (normalizedPath === '/stories') {
          req.url = `/stories/index.html${query}`;
          process.stdout.write(`\n✅ PLUGIN REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
          next();
          return;
        }

        // 5. /chat -> /chat/index.html
        if (normalizedPath === '/chat') {
          req.url = `/chat/index.html${query}`;
          process.stdout.write(`\n✅ PLUGIN REWRITE: ${method} "${originalUrl}" -> "${req.url}"\n`);
          next();
          return;
        }

        next();
      });

      // Log that plugin is registered
      process.stdout.write('\n✅✅✅ ROUTE REWRITE PLUGIN REGISTERED ✅✅✅\n');
      process.stdout.write('Routes: /child/badges, /parent/dashboard, /stories/{id}/read, /chat, /stories\n\n');
    }
  };
};

export default defineConfig({
  root: '.',
  publicDir: 'images',
  appType: 'mpa', // Multi-page app - disable SPA fallback to index.html
  plugins: [
    routeRewritePlugin() // Add plugin FIRST for route rewriting
  ],
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

        parentDashboardOld: resolve(__dirname, 'dashboards/parent-dashboard.html'),

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
        badges: resolve(__dirname, 'badges/badges.html'),
        topics: resolve(__dirname, 'topics.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        about: resolve(__dirname, 'about.html'),
        blog: resolve(__dirname, 'blog.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        coppa: resolve(__dirname, 'coppa.html')
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

    // FORCE LOG to verify configureServer is running - use original to bypass any overrides
    originalConsoleError('\n🔧🔧🔧 CONFIGURE SERVER RUNNING 🔧🔧🔧\n');

    // Override process.stderr.write to filter out image warnings
    process.stderr.write = function (chunk, encoding, callback) {
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
    console.error = function (...args) {
      const message = args.join(' ');
      // Always show our middleware logs - check for ANY of our markers
      if (message.includes('🚨') || message.includes('✅') || message.includes('🔍') || message.includes('🔧') ||
        message.includes('ROUTE REWRITE') || message.includes('MIDDLEWARE') || message.includes('CONFIGURE') ||
        message.includes('REWRITE MIDDLEWARE') || message.includes('child/badges')) {
        originalConsoleError(...args);
        return;
      }
      // Suppress image warnings
      if (message.includes('Instead of /images/avatars') ||
        message.includes('Files in the public directory') ||
        message.includes('use /avatars/')) {
        return; // Suppress
      }
      // Allow everything else through
      originalConsoleError(...args);
    };

    // CRITICAL: Create rewrite middleware function that runs FIRST
    const rewriteMiddleware = (req, res, next) => {
      const originalUrl = req.url || '';
      const method = req.method || 'GET';

      // ABSOLUTE FIRST CHECK: /child/badges - check BEFORE any parsing
      // This MUST be the very first thing we check
      if (originalUrl && (originalUrl.startsWith('/child/badges') || originalUrl === '/child/badges')) {
        const query = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
        req.url = `/badges/badges.html${query}`;
        // Use process.stdout.write to bypass all console overrides
        process.stdout.write(`\n✅✅✅✅✅ ROUTE REWRITE SUCCESS: ${method} "${originalUrl}" -> "${req.url}" ✅✅✅✅✅\n`);
        originalConsoleError(`\n✅✅✅✅✅ ROUTE REWRITE SUCCESS: ${method} "${originalUrl}" -> "${req.url}" ✅✅✅✅✅\n`);
        next();
        return;
      }

      // Parse URL: split path and query
      const [path, queryString] = originalUrl.split('?');
      const query = queryString ? `?${queryString}` : '';

      // Normalize path: remove trailing slash (except root)
      const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');

      // ROUTE REWRITES - Check in priority order

      // 1. /child/badges -> /badges/badges.html (REDUNDANT CHECK FOR SAFETY)
      // Additional check after parsing in case first check missed it
      if (normalizedPath === '/child/badges' ||
        path === '/child/badges' ||
        path === '/child/badges/' ||
        path.startsWith('/child/badges/') ||
        path.startsWith('/child/badges?')) {
        req.url = `/badges/badges.html${query}`;
        process.stdout.write(`\n✅✅✅ ROUTE REWRITE (fallback): ${method} "${originalUrl}" -> "${req.url}"\n`);
        originalConsoleError(`\n✅✅✅ ROUTE REWRITE (fallback): ${method} "${originalUrl}" -> "${req.url}"\n`);
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

    // CRITICAL: Register middleware directly in configureServer
    // In Vite, middleware registered in configureServer runs before static file serving
    server.middlewares.use(rewriteMiddleware);

    // FORCE LOG using process.stdout.write to bypass all console overrides
    process.stdout.write('\n\n✅✅✅✅✅✅✅✅✅ REWRITE MIDDLEWARE REGISTERED ✅✅✅✅✅✅✅✅✅\n');
    process.stdout.write('Routes: /child/badges -> /badges/badges.html\n');
    process.stdout.write('        /parent/dashboard -> /parent/dashboard.html\n');
    process.stdout.write('        /stories/{id}/read -> /stories/reader.html\n');
    process.stdout.write('        /chat -> /chat/index.html\n');
    process.stdout.write('        /stories -> /stories/index.html\n\n');

    // Also log with console methods
    originalConsoleError('\n✅✅✅✅✅✅✅✅✅ REWRITE MIDDLEWARE REGISTERED ✅✅✅✅✅✅✅✅✅\n');
    originalConsoleError('Will handle: /child/badges, /parent/dashboard, /stories/{id}/read, /chat, /stories\n');
  },
  preview: {
    port: 3000,
    open: true
  }
});
