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
        parentDashboard: resolve(__dirname, 'dashboards/parent-dashboard.html'),
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
    cors: true
  },
  configureServer(server) {
    // Add middleware to catch routes before Vite's HTML fallback
    // With appType: 'mpa', Vite won't fallback to index.html for unmatched routes
    server.middlewares.use((req, res, next) => {
      // Parse URL path and query separately
      const [path, queryString] = req.url.split('?');
      const query = queryString ? `?${queryString}` : '';
      
      // Log badge requests for debugging
      if (path.includes('/child/badges')) {
        console.log(`[Vite Middleware] ${req.method} ${req.url} -> path: ${path}, query: ${query}`);
      }
      
      // Rewrite /child/badges to /badges/badges.html (check this FIRST)
      if (path === '/child/badges' || path.startsWith('/child/badges/')) {
        req.url = `/badges/badges.html${query}`;
        console.log(`[Vite] ✓ Rewrote /child/badges to ${req.url}`);
        next();
        return;
      }
      
      // Rewrite /stories/{storyId}/read to /stories/reader.html with storyId in query
      const storyMatch = path.match(/^\/stories\/([^/]+)\/read$/);
      if (storyMatch) {
        const storyId = storyMatch[1];
        const params = new URLSearchParams(queryString || '');
        params.set('storyId', storyId);
        req.url = `/stories/reader.html?${params.toString()}`;
        console.log(`[Vite] ✓ Rewrote /stories/${storyId}/read to ${req.url}`);
        next();
        return;
      }
      
      // Rewrite /parent/dashboard to /parent/dashboard.html
      if (path === '/parent/dashboard' || path.startsWith('/parent/dashboard/')) {
        req.url = `/parent/dashboard.html${query}`;
        console.log(`[Vite] ✓ Rewrote /parent/dashboard to ${req.url}`);
        next();
        return;
      }
      
      next();
    });
  },
  preview: {
    port: 3000,
    open: true
  }
});
