/*
  # Fix Student Signup Email Availability Check

  ## Summary
  This migration fixes the student signup issue where the error "This email is already registered"
  appears even for new email addresses. The root cause is that anonymous users cannot query the
  user_profiles table due to RLS policies, and the frontend doesn't check auth.users table.

  ## Changes Made

  1. **Create Public Email Availability Check Function**
     - Creates a SECURITY DEFINER function that can check both auth.users and user_profiles
     - Safe for anonymous users to call during signup
     - Returns boolean indicating if email is available
     - Checks both authentication and profile tables

  2. **Grant Permissions**
     - Grant EXECUTE permission to anonymous users
     - Grant EXECUTE permission to authenticated users
     - Required for signup flow to work

  ## Security Notes

  - Function is SECURITY DEFINER but safe because:
    * Only returns boolean (available/not available)
    * Does not expose any user data
    * Does not allow any write operations
    * Only checks email existence, not other sensitive info
  
  - This is a read-only check that's necessary for user registration
  - No PII or sensitive data is returned

  ## How It Works

  The function checks:
  1. If email exists in auth.users table (Supabase auth)
  2. If email exists in user_profiles table (our app data)
  3. Returns true if email is available (not found in either)
  4. Returns false if email is already taken (found in either)
*/

-- Create function to check email availability (accessible by anon users)
CREATE OR REPLACE FUNCTION check_email_availability(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = check_email
  ) THEN
    RETURN false;
  END IF;

  -- Check if email exists in user_profiles
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE email = check_email
  ) THEN
    RETURN false;
  END IF;

  -- Email is available
  RETURN true;
END;
$$;

-- Grant execute permission to anonymous users (needed for signup)
GRANT EXECUTE ON FUNCTION check_email_availability(text) TO anon;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_availability(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION check_email_availability(text) IS 'Checks if an email address is available for registration. Returns true if available, false if taken. Safe for anonymous users during signup.';

SELECT 'Email availability check function created successfully' as notice;
