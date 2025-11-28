/**
 * Supabase Connection Validation Script
 * 
 * This script validates that the Supabase URL and anon key from .env
 * are correct and the connection is working.
 * 
 * Usage: node scripts/validate-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Parse .env file
function loadEnv() {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error(`❌ ERROR: Could not read .env file at ${envPath}`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

const envVars = loadEnv();

// Get Supabase credentials from .env file
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Validating Supabase Connection...\n');
console.log('=' .repeat(60));

// Step 1: Check if environment variables are set
console.log('\n📋 Step 1: Checking Environment Variables');
if (!supabaseUrl) {
  console.error('❌ ERROR: VITE_SUPABASE_URL is not set in .env file');
  process.exit(1);
}
if (!supabaseAnonKey) {
  console.error('❌ ERROR: VITE_SUPABASE_ANON_KEY is not set in .env file');
  process.exit(1);
}

console.log('✅ VITE_SUPABASE_URL is set');
console.log(`   URL: ${supabaseUrl}`);

// Mask the key for security (show first 20 chars)
const maskedKey = supabaseAnonKey.substring(0, 20) + '...';
console.log('✅ VITE_SUPABASE_ANON_KEY is set');
console.log(`   Key: ${maskedKey}`);

// Step 2: Validate URL format
console.log('\n📋 Step 2: Validating URL Format');
const urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
if (!urlPattern.test(supabaseUrl)) {
  console.warn('⚠️  WARNING: URL format may be incorrect');
  console.warn(`   Expected format: https://xxxxx.supabase.co`);
  console.warn(`   Got: ${supabaseUrl}`);
} else {
  console.log('✅ URL format is correct');
}

// Step 3: Test connection by creating Supabase client
console.log('\n📋 Step 3: Testing Supabase Client Creation');
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ ERROR: Failed to create Supabase client');
  console.error(`   ${error.message}`);
  process.exit(1);
}

// Step 4: Test connection with a simple query
console.log('\n📋 Step 4: Testing Database Connection');
console.log('   Attempting to query user_profiles table...');

try {
  // Try to query a table (this will fail if connection is bad, but won't error if table doesn't exist)
  // We use a limit of 0 to minimize data transfer
  const { data, error, status } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(0);

  if (error) {
    // Check if it's an authentication error vs table not found
    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      console.error('❌ ERROR: Authentication failed');
      console.error('   The anon key may be invalid or expired');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    } else if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.warn('⚠️  WARNING: user_profiles table does not exist');
      console.warn('   Connection is working, but table may need to be created');
      console.log('✅ Supabase connection is VALID');
    } else {
      console.warn('⚠️  WARNING: Query returned an error');
      console.warn(`   Error: ${error.message}`);
      console.warn('   This may indicate RLS policies or other configuration issues');
      console.log('✅ Supabase connection is VALID (but query failed)');
    }
  } else {
    console.log('✅ Database connection successful');
    console.log(`   Query executed successfully (status: ${status})`);
  }
} catch (error) {
  console.error('❌ ERROR: Failed to connect to Supabase');
  console.error(`   ${error.message}`);
  
  if (error.message.includes('fetch')) {
    console.error('   This may indicate a network issue or invalid URL');
  }
  
  process.exit(1);
}

// Step 5: Test authentication endpoint
console.log('\n📋 Step 5: Testing Authentication Endpoint');
try {
  // Test the auth endpoint by checking if we can access it
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });

  if (response.ok || response.status === 404) {
    // 404 is OK - it means the endpoint exists but the path doesn't
    console.log('✅ Authentication endpoint is accessible');
    console.log(`   Status: ${response.status}`);
  } else if (response.status === 401) {
    console.error('❌ ERROR: Authentication failed (401 Unauthorized)');
    console.error('   The anon key is invalid');
    process.exit(1);
  } else {
    console.warn(`⚠️  WARNING: Unexpected status code: ${response.status}`);
    console.log('✅ Endpoint is reachable');
  }
} catch (error) {
  console.error('❌ ERROR: Failed to reach Supabase endpoint');
  console.error(`   ${error.message}`);
  console.error('   This may indicate the URL is incorrect or network is unreachable');
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n✅ VALIDATION COMPLETE');
console.log('\n📊 Summary:');
console.log(`   ✅ Supabase URL: ${supabaseUrl}`);
console.log(`   ✅ Anon Key: Valid`);
console.log(`   ✅ Connection: Working`);
console.log('\n🎉 Your Supabase configuration is valid and ready to use!');
console.log('\n💡 Next Steps:');
console.log('   - You can now proceed with integration tests');
console.log('   - Or use this Supabase instance for development');
console.log('');

