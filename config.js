/**
 * Environment configuration with runtime fetching from Netlify function
 * Falls back to build-time VITE_ variables for local development
 * 
 * USAGE PATTERNS:
 * 
 * 1. Synchronous access (immediate, uses fallback if fetch not ready):
 *    const url = supabaseConfig.url; // ✅ Works immediately
 * 
 * 2. Async access (waits for fetch to complete):
 *    const config = await waitForConfig();
 *    const url = config.url; // ✅ Guaranteed to have Netlify values if available
 * 
 * 3. Creating Supabase client (use async for guaranteed values):
 *    import { waitForConfig } from '/config.js';
 *    const config = await waitForConfig();
 *    const supabase = createClient(config.url, config.anonKey);
 * 
 * NOTE: The sync access will work immediately using build-time values,
 * then automatically use Netlify values once the fetch completes (getters check cache first).
 */

let cachedEnvVars = null;
let fetchPromise = null;
let fetchStarted = false;

/**
 * Fetch environment variables from Netlify function
 * Caches the result for the session
 */
async function fetchEnvFromNetlify() {
  // Return cached value if available
  if (cachedEnvVars !== null) {
    return cachedEnvVars;
  }

  // Return existing promise if fetch is in progress
  if (fetchPromise) {
    return fetchPromise;
  }

  // Create new fetch promise
  fetchPromise = (async () => {
    try {
      // Determine the function URL
      // In production: /.netlify/functions/api-values
      // In local dev with netlify dev: http://localhost:8888/.netlify/functions/api-values
      const isLocalDev = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      const functionUrl = isLocalDev 
        ? 'http://localhost:8888/.netlify/functions/api-values'
        : '/.netlify/functions/api-values';

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.env) {
          cachedEnvVars = data.env;
          console.log('[config] ✅ Loaded environment variables from Netlify function');
          return cachedEnvVars;
        }
      }
    } catch (error) {
      // Silent fail - will use build-time vars as fallback
      console.debug('[config] Netlify function not available, using build-time vars');
    }

    // Mark as attempted (empty object) so we don't keep retrying
    cachedEnvVars = {};
    return cachedEnvVars;
  })();

  return fetchPromise;
}

/**
 * Get environment variable value (synchronous - uses fallback if fetch not ready)
 * Priority: Cached Netlify vars > build-time VITE_ > process.env (Node)
 * 
 * Note: This is synchronous and will use build-time fallbacks immediately.
 * For guaranteed Netlify values, use getEnvVarAsync() or waitForConfig()
 */
export function getEnvVar(key) {
  // First, try cached runtime variables from Netlify function
  if (cachedEnvVars && cachedEnvVars[key]) {
    return cachedEnvVars[key];
  }

  // Fallback to build-time VITE_ variables (for local dev and build-time)
  // This ensures immediate availability even if fetch hasn't completed
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // Try process.env for Node.js environments
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  return undefined;
}

// Start fetching immediately (non-blocking) when in browser
let initPromise = null;
if (typeof window !== 'undefined') {
  fetchStarted = true;
  initPromise = fetchEnvFromNetlify().catch(() => {
    // Silent fail - we'll use build-time vars
  });
} else {
  // In Node.js, resolve immediately
  initPromise = Promise.resolve({});
}

// Export initialization promise - await this to ensure config is ready
export const configReady = initPromise;

// Export configuration object with getters
// These work synchronously and use build-time values immediately (safe fallback)
// Once Netlify fetch completes, it will automatically use those values
// For guaranteed Netlify values, use waitForConfig() or getSupabaseConfigAsync()
export const supabaseConfig = {
    get url() {
        // Always check cached first, then fallback to build-time
        return getEnvVar('VITE_SUPABASE_URL');
    },
    get anonKey() {
        // Always check cached first, then fallback to build-time
        return getEnvVar('VITE_SUPABASE_ANON_KEY');
    },
    /**
     * Wait for config to be ready and return values
     * Use this when you need guaranteed Netlify values
     */
    async ready() {
        await configReady;
        return {
            url: this.url,
            anonKey: this.anonKey
        };
    }
};

// Export async version of config that guarantees fetch has completed
export async function getSupabaseConfigAsync() {
    await configReady;
    return {
        url: supabaseConfig.url,
        anonKey: supabaseConfig.anonKey
    };
}

// Export helper function to refresh env vars from Netlify
export async function refreshEnvVars() {
    cachedEnvVars = null;
    fetchPromise = null;
    fetchStarted = false;
    if (typeof window !== 'undefined') {
        fetchStarted = true;
    }
    return await fetchEnvFromNetlify();
}

// Export helper function to get any environment variable (async, waits for Netlify fetch)
export async function getEnvVarAsync(key) {
    await fetchEnvFromNetlify();
    return getEnvVar(key);
}

// Export helper to get all env vars (async, waits for Netlify fetch)
export async function getAllEnvVars() {
    await fetchEnvFromNetlify();
    return cachedEnvVars || {};
}

// Export a function to wait for config to be ready and return it
export async function waitForConfig() {
    await configReady;
    return {
        url: supabaseConfig.url,
        anonKey: supabaseConfig.anonKey
    };
}

// Helper to create Supabase client with guaranteed config
export async function createSupabaseClientAsync(createClient) {
    const config = await getSupabaseConfigAsync();
    if (!config.url || !config.anonKey) {
        console.warn('[config] Supabase config not available');
        return null;
    }
    return createClient(config.url, config.anonKey);
}

// Log configuration status after fetch completes
if (typeof window !== 'undefined') {
    configReady.then(() => {
        console.log('[config] Configuration ready');
        console.log('[config] Supabase URL:', supabaseConfig.url ? '✅ Set' : '❌ Not set');
        console.log('[config] Supabase Key:', supabaseConfig.anonKey ? '✅ Set' : '❌ Not set');
    }).catch(() => {
        // Silent fail
    });
}
