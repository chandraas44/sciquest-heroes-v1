// Environment configuration with runtime fetching from Netlify function
// Falls back to build-time VITE_ variables for local development

let cachedEnvVars = null;
let isFetching = false;

/**
 * Fetch environment variables from Netlify function
 * Caches the result for the session
 */
async function fetchEnvFromNetlify() {
  // Return cached value if available
  if (cachedEnvVars !== null) {
    return cachedEnvVars;
  }

  // Prevent concurrent fetches
  if (isFetching) {
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 100));
    if (cachedEnvVars !== null) {
      return cachedEnvVars;
    }
    return {};
  }

  isFetching = true;

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
  } finally {
    isFetching = false;
  }

  // Mark as attempted (empty object) so we don't keep retrying
  cachedEnvVars = {};
  return cachedEnvVars;
}

/**
 * Get environment variable value
 * Priority: Cached Netlify vars > build-time VITE_ > process.env (Node)
 */
function getEnvVar(key) {
  // First, try cached runtime variables from Netlify function
  if (cachedEnvVars && cachedEnvVars[key]) {
    return cachedEnvVars[key];
  }

  // Fallback to build-time VITE_ variables (for local dev and build-time)
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // Try process.env for Node.js environments
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  return undefined;
}

// Initialize: try to fetch from Netlify function on load (non-blocking)
if (typeof window !== 'undefined') {
  // Fetch in background - don't block page load
  fetchEnvFromNetlify().catch(() => {
    // Silent fail - we'll use build-time vars
  });
}

// Export configuration object with getters
export const supabaseConfig = {
    get url() {
        return getEnvVar('VITE_SUPABASE_URL');
    },
    get anonKey() {
        return getEnvVar('VITE_SUPABASE_ANON_KEY');
    }
};

// Export helper function to refresh env vars from Netlify
export async function refreshEnvVars() {
    cachedEnvVars = null;
    isFetching = false;
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

// Log configuration status (non-blocking)
if (typeof window !== 'undefined') {
    setTimeout(() => {
        console.log('[config] Supabase URL:', supabaseConfig.url ? '✅ Set' : '❌ Not set');
        console.log('[config] Supabase Key:', supabaseConfig.anonKey ? '✅ Set' : '❌ Not set');
    }, 100);
}
