import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm': '@supabase/supabase-js'
    }
  }
});

