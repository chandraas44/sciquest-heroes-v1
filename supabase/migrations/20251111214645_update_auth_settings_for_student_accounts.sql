/*
  # Update Authentication Settings for Student Accounts

  ## Summary
  This migration documents the required Supabase authentication configuration changes
  for student accounts to work properly. Student accounts use a special email pattern
  since students authenticate with username/password rather than real email addresses.

  ## Important Configuration Required

  To enable student signups without email validation errors, you MUST configure
  the following settings in your Supabase Dashboard:

  ### Step 1: Disable Email Confirmation
  1. Go to: Supabase Dashboard > Authentication > Providers > Email
  2. Find the "Confirm email" toggle
  3. Turn OFF "Confirm email"
  4. Click "Save" to apply changes

  ### Step 2: Configure Site URL (if not already set)
  1. Go to: Supabase Dashboard > Authentication > URL Configuration
  2. Set "Site URL" to your application's URL (e.g., http://localhost:5173 for local dev)
  3. Add any redirect URLs needed for avatar selection page

  ## How Student Authentication Works

  1. **Signup**: Students provide a username (e.g., "Shannu4j")
  2. **Email Generation**: System creates email: `{username}@student.sciquest.app`
  3. **Auth Creation**: Supabase auth account is created with this email
  4. **Login**: Students can log in with just their username (auto-converted to email)
  5. **Parent Email**: Real parent email is stored separately in user_profiles.parent_email

  ## Database Schema Notes

  - Student accounts have account_type = 'student' in user_profiles table
  - Parent email is stored in user_profiles.parent_email (not in auth.users)
  - Username is stored in user_profiles.username (unique constraint)
  - Students authenticate using the generated email pattern, not their real email

  ## Technical Details

  Email Pattern: `{username}@student.sciquest.app`
  - Example: Username "Shannu4j" → Email "shannu4j@student.sciquest.app"
  - This email is only used for authentication, not for sending actual emails
  - Valid TLD (.app) passes basic email format validation
  - Parent receives notifications at their real email address

  ## Security Notes

  - Students still require username and password authentication
  - Parent email is mandatory and validated during signup
  - Account_type constraint ensures data integrity
  - Row Level Security (RLS) policies protect user data
  - Username uniqueness is enforced at database level

  ## No Database Changes

  This migration makes NO changes to the database schema. It serves as
  documentation for the required Supabase Dashboard configuration.

  If email confirmation cannot be disabled, the following alternative approaches
  can be considered:
  1. Use phone-based authentication for students
  2. Implement custom authentication flow
  3. Use a custom SMTP provider that accepts the email domain
*/

-- This migration creates no database changes, only documentation
-- All changes must be made in the Supabase Dashboard as described above

SELECT 'Student authentication configuration documented. Please configure Supabase Dashboard settings as described in migration comments.' as notice;
