import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (silently fail if .env doesn't exist)
let supabaseUrl, supabaseAnonKey, supabaseServiceKey;

try {
  const envPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: envPath });
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
} catch (error) {
  // .env file might not exist, that's okay for test discovery
  // Variables will be undefined, functions will throw when called
  supabaseUrl = undefined;
  supabaseAnonKey = undefined;
  supabaseServiceKey = undefined;
}

// Test data constants
export const TEST_DATA = {
  PARENT_EMAIL: 'Latha03@msn.com',
  PARENT_PASSWORD: 'TestParent123!',
  STUDENTS: [
    { name: 'Kiddo1', age: 5 },
    { name: 'kiddo2', age: 6 },
    { name: 'Kiddo3', age: 7 },
    { name: 'Kiddo4', age: 8 },
    { name: 'Kiddo5', age: 9 },
    { name: 'Kiddo6', age: 10 },
    { name: 'Kiddo7', age: 11 },
    { name: 'Kiddo8', age: 12 }
  ],
  STUDENT_EMAIL_BASE: 'kiddosmath@gmail.com'
};

// Create Supabase client for test operations
export function getSupabaseClient(useServiceKey = false) {
  const key = useServiceKey && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;
  if (!supabaseUrl || !key) {
    // Throw error only when actually called, not during module load
    throw new Error('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
  }
  return createClient(supabaseUrl, key);
}

// Clear localStorage safely
export async function clearLocalStorage(page) {
  try {
    const url = page.url();
    if (url && url !== 'about:blank' && !url.startsWith('chrome-extension://')) {
      await page.evaluate(() => {
        try {
          localStorage.clear();
        } catch (e) {
          console.warn('Could not clear localStorage:', e.message);
        }
      });
    }
  } catch (error) {
    console.warn('clearLocalStorage skipped:', error.message);
  }
}

// Wait for page load with timeout handling
export async function waitForPageLoad(page, timeout = 30000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10000) }).catch(() => {
      console.warn('networkidle timeout - page may have continuous network activity');
    });
  } catch (error) {
    console.warn('Page load timeout:', error.message);
  }
}

// Log error with student information
export function logError(context, studentInfo = null, error) {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    context,
    student: studentInfo ? {
      name: studentInfo.name,
      age: studentInfo.age,
      email: studentInfo.email
    } : null,
    error: {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name
    }
  };
  
  console.error('=== TEST ERROR ===');
  console.error(JSON.stringify(errorDetails, null, 2));
  
  return errorDetails;
}

// Verify parent profile exists in database
export async function verifyParentProfile(email) {
  try {
    const supabase = getSupabaseClient(true); // Use service key for admin access
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .eq('account_type', 'parent')
      .maybeSingle();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!data) {
      return { success: false, error: 'Parent profile not found' };
    }
    
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify student profile exists and is linked to parent
export async function verifyStudentProfile(studentEmail, parentEmail) {
  try {
    const supabase = getSupabaseClient(true);
    
    // Get parent profile
    const { data: parentProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', parentEmail)
      .eq('account_type', 'parent')
      .maybeSingle();
    
    if (!parentProfile) {
      return { success: false, error: 'Parent profile not found' };
    }
    
    // Get student profile
    const { data: studentProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', studentEmail)
      .eq('account_type', 'student')
      .maybeSingle();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!studentProfile) {
      return { success: false, error: 'Student profile not found' };
    }
    
    // Verify parent-child relationship
    const isLinked = studentProfile.parent_id === parentProfile.id || 
                     studentProfile.parent_email === parentEmail;
    
    return {
      success: isLinked,
      student: studentProfile,
      parent: parentProfile,
      isLinked,
      error: isLinked ? null : 'Student not linked to parent'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get all students for a parent
export async function getParentStudents(parentEmail) {
  try {
    const supabase = getSupabaseClient(true);
    
    // Get parent profile
    const { data: parentProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', parentEmail)
      .eq('account_type', 'parent')
      .maybeSingle();
    
    if (!parentProfile) {
      return { success: false, error: 'Parent profile not found', students: [] };
    }
    
    // Get all students linked to this parent
    const { data: students, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('parent_id', parentProfile.id)
      .eq('account_type', 'student');
    
    if (error) {
      return { success: false, error: error.message, students: [] };
    }
    
    return { success: true, students: students || [], parentId: parentProfile.id };
  } catch (error) {
    return { success: false, error: error.message, students: [] };
  }
}

// Clean up test data (delete parent and all linked students)
export async function cleanupTestData(parentEmail) {
  try {
    const supabase = getSupabaseClient(true);
    
    // Get parent profile
    const { data: parentProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', parentEmail)
      .eq('account_type', 'parent')
      .maybeSingle();
    
    if (!parentProfile) {
      return { success: true, message: 'No parent profile to clean up' };
    }
    
    // Delete all students linked to this parent
    const { error: studentsError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('parent_id', parentProfile.id)
      .eq('account_type', 'student');
    
    if (studentsError) {
      console.warn('Error deleting students:', studentsError);
    }
    
    // Delete parent profile
    const { error: parentError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', parentProfile.id);
    
    if (parentError) {
      return { success: false, error: parentError.message };
    }
    
    // Delete auth user
    const { data: { user } } = await supabase.auth.admin.getUserByEmail(parentEmail);
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
    
    return { success: true, message: 'Test data cleaned up' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate unique student email
export function generateStudentEmail(studentName, index) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${studentName.toLowerCase()}${index}${timestamp}${random}@test.sciquest.app`;
}

// Wait for element with detailed error logging
export async function waitForElement(page, selector, options = {}) {
  const { timeout = 30000, errorContext = 'Element' } = options;
  
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return { success: true, element: await page.locator(selector) };
  } catch (error) {
    const errorDetails = {
      selector,
      errorContext,
      error: error.message,
      pageUrl: page.url(),
      pageTitle: await page.title().catch(() => 'Unknown')
    };
    
    console.error(`Failed to find ${errorContext}:`, errorDetails);
    return { success: false, error: error.message, details: errorDetails };
  }
}

// Fill form field with error handling
export async function fillField(page, selector, value, fieldName = 'Field') {
  try {
    const element = await waitForElement(page, selector, { errorContext: fieldName });
    if (!element.success) {
      return element;
    }
    
    await element.element.fill(value);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      fieldName,
      selector,
      value
    };
  }
}

// Click button with error handling
export async function clickButton(page, selector, buttonName = 'Button') {
  try {
    const element = await waitForElement(page, selector, { errorContext: buttonName });
    if (!element.success) {
      return element;
    }
    
    await element.element.click();
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      buttonName,
      selector
    };
  }
}

