/**
 * Netlify Function to expose safe environment variables to the frontend
 * Only exposes VITE_ prefixed variables (which are meant to be public)
 * 
 * This allows runtime configuration without rebuilding the app
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  try {
    // Collect all VITE_ prefixed environment variables
    // These are safe to expose to the frontend
    const publicEnvVars = {};
    
    // Get all environment variables
    const allEnvVars = process.env;
    
    // Filter for VITE_ prefixed variables only
    for (const key in allEnvVars) {
      if (key.startsWith('VITE_')) {
        publicEnvVars[key] = allEnvVars[key];
      }
    }

    // Return the public environment variables
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
      body: JSON.stringify({
        success: true,
        env: publicEnvVars,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in api-values function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch environment variables',
        message: error.message
      })
    };
  }
};

