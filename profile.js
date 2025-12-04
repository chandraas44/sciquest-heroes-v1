import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from './config.js';

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userAvatarSmall = document.getElementById('userAvatarSmall');
const userNameNav = document.getElementById('userNameNav');
const profileAvatar = document.getElementById('profileAvatar');
const profileTitle = document.getElementById('profileTitle');
const accountTypeBadge = document.getElementById('accountTypeBadge');
const profileForm = document.getElementById('profileForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const saveBtnText = document.getElementById('saveBtnText');
const studentFieldsRow = document.getElementById('studentFieldsRow');
const backToHomeBtn = document.getElementById('backToHomeBtn');

const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const gradeLevelInput = document.getElementById('gradeLevel');
const parentEmailInput = document.getElementById('parentEmail');
const emailInput = document.getElementById('email');
const fullNameInput = document.getElementById('fullName');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

let currentProfile = null;

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'auth/auth.html';
        return;
    }

    console.log('Session user:', session.user.email);
    loadUserProfile(session.user.id, session.user.email);
}

async function loadUserProfile(userId, sessionEmail) {
    try {
        console.log('Loading profile for user:', userId);
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Profile data fetched:', profile);

        if (profile) {
            currentProfile = profile;

            const displayName = profile.first_name || profile.full_name || profile.username || profile.email;
            if (userNameNav) userNameNav.textContent = displayName;
            if (profileTitle) profileTitle.textContent = `${displayName}'s Profile`;

            if (firstNameInput) firstNameInput.value = profile.first_name || '';
            if (lastNameInput) lastNameInput.value = profile.last_name || '';
            if (emailInput) emailInput.value = profile.email || sessionEmail || '';
            if (fullNameInput) fullNameInput.value = profile.full_name || '';

            console.log('Setting inputs:', {
                first: firstNameInput ? firstNameInput.value : 'N/A',
                last: lastNameInput ? lastNameInput.value : 'N/A',
                email: emailInput ? emailInput.value : 'N/A'
            });

            if (profile.account_type === 'student') {
                if (studentFieldsRow) studentFieldsRow.style.display = 'grid';
                if (gradeLevelInput) gradeLevelInput.value = profile.grade_level || '';
                if (parentEmailInput) parentEmailInput.value = profile.parent_email || '';
                if (accountTypeBadge) {
                    accountTypeBadge.className = 'badge badge-student';
                    accountTypeBadge.textContent = 'Student';
                }
            } else if (profile.account_type === 'parent') {
                if (accountTypeBadge) {
                    accountTypeBadge.className = 'badge badge-parent';
                    accountTypeBadge.textContent = 'Parent';
                }
                // Hide avatar edit button for parents
                const avatarEditBtn = document.querySelector('.avatar-edit-btn');
                if (avatarEditBtn) {
                    avatarEditBtn.style.display = 'none';
                }
            } else if (profile.account_type === 'teacher') {
                if (accountTypeBadge) {
                    accountTypeBadge.className = 'badge badge-teacher';
                    accountTypeBadge.textContent = 'Teacher';
                }
            }

            if (backToHomeBtn) {
                if (profile.account_type === 'parent') {
                    backToHomeBtn.href = '/parent/dashboard.html';
                } else if (profile.account_type === 'teacher') {
                    backToHomeBtn.href = 'dashboards/teacher-dashboard.html';
                } else if (profile.account_type === 'student') {
                    backToHomeBtn.href = 'stories/index.html';
                }
            }

            if (profile.avatar_url) {
                if (userAvatarSmall) userAvatarSmall.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
                if (profileAvatar) profileAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
            } else if (profile.first_name) {
                const initial = profile.first_name.charAt(0).toUpperCase();
                if (userAvatarSmall) userAvatarSmall.textContent = initial;
                if (profileAvatar) profileAvatar.textContent = initial;
            } else if (profile.username) {
                const initial = profile.username.charAt(0).toUpperCase();
                if (userAvatarSmall) userAvatarSmall.textContent = initial;
                if (profileAvatar) profileAvatar.textContent = initial;
            } else {
                // Fallback if no name/avatar
                const initial = (profile.email || 'U').charAt(0).toUpperCase();
                if (userAvatarSmall) userAvatarSmall.textContent = initial;
                if (profileAvatar) profileAvatar.textContent = initial;
            }
        } else {
            console.warn('No profile found for user:', userId);
            if (emailInput) emailInput.value = sessionEmail || '';
            if (userNameNav) userNameNav.textContent = sessionEmail || 'User';
            if (profileTitle) profileTitle.textContent = 'My Profile';

            if (sessionEmail) {
                const initial = sessionEmail.charAt(0).toUpperCase();
                if (userAvatarSmall) userAvatarSmall.textContent = initial;
                if (profileAvatar) profileAvatar.textContent = initial;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile data');
    }
}



profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!firstName && currentProfile.account_type === 'student') {
        showError('First name is required');
        return;
    }

    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
    }

    const updateData = {
        first_name: firstName || null,
        last_name: lastName || null
    };

    if (currentProfile.account_type === 'student') {
        const gradeLevel = gradeLevelInput.value.trim();
        const parentEmail = parentEmailInput.value.trim();

        if (!gradeLevel) {
            showError('Please select your grade level');
            return;
        }

        // Validate grade_level format (e.g., "1", "2", "3", "4", "5", "6" or "Grade 1", etc.)
        const validGrades = ['1', '2', '3', '4', '5', '6', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
        if (!validGrades.includes(gradeLevel) && !gradeLevel.match(/^(Grade\s?)?[1-6]$/i)) {
            showError('Please select a valid grade level (1-6)');
            return;
        }

        if (parentEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(parentEmail)) {
                showError('Please enter a valid parent email address');
                return;
            }
        }

        updateData.grade_level = gradeLevel;
        updateData.parent_email = parentEmail || null;
    }

    const submitBtn = profileForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    saveBtnText.innerHTML = '<span class="loading-spinner"></span>Saving...';

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No active session');
        }

        // Update profile data
        const { error: profileError } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', session.user.id);

        if (profileError) throw profileError;

        // Update password if provided
        if (newPassword) {
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;
        }

        showSuccess('Profile updated successfully!');

        // Clear password fields
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';

        await loadUserProfile(session.user.id);
    } catch (error) {
        console.error('Error updating profile:', error);
        showError(error.message || 'Failed to update profile. Please try again.');
    } finally {
        submitBtn.disabled = false;
        saveBtnText.textContent = 'Save Changes';
    }
});

checkAuth();
