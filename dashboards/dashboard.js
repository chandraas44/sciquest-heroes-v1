import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { createSupabaseClientAsync } from '../config.js';

let supabase = null;

async function getSupabaseClient() {
  if (!supabase) {
    supabase = await createSupabaseClientAsync(createClient);
  }
  return supabase;
}

const userMenuTrigger = document.getElementById('userMenuTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

let currentAccountType = null;

async function checkAuth() {
    const supabase = await getSupabaseClient();
    if (!supabase) {
        window.location.href = '../auth/auth.html';
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = '../auth/auth.html';
        return;
    }

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

    if (error) {
        console.error('Error loading profile:', error);
        return;
    }

    if (!profile) {
        window.location.href = '../auth/auth.html';
        return;
    }

    const currentPage = window.location.pathname;

    if (currentPage.includes('parent-dashboard.html') && profile.account_type !== 'parent') {
        if (profile.account_type === 'student') {
            window.location.href = '../stories/index.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }

    // Store account type for logout redirect
    currentAccountType = profile.account_type;

    loadUserProfile(session.user.id);
}

async function loadUserProfile(userId) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
            console.error('Failed to connect to database');
            return;
        }
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        if (profile) {
            let displayName;
            if (profile.account_type === 'parent') {
                displayName = profile.email;
            } else {
                displayName = profile.first_name || profile.full_name || profile.username || profile.email;
            }
            userName.textContent = displayName;

            if (profile.avatar_url) {
                userAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
            } else if (profile.email && (profile.account_type === 'parent')) {
                userAvatar.textContent = profile.email.charAt(0).toUpperCase();
            } else if (profile.first_name) {
                userAvatar.textContent = profile.first_name.charAt(0).toUpperCase();
            } else if (profile.username) {
                userAvatar.textContent = profile.username.charAt(0).toUpperCase();
            } else {
                const initial = profile.account_type.charAt(0).toUpperCase();
                userAvatar.textContent = initial;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

userMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!userMenuTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../auth/auth.html?type=' + currentAccountType + '&mode=login';
            return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        localStorage.clear();
        sessionStorage.clear();

        // Redirect to auth page with account type and mode query parameters
        const redirectUrl = currentAccountType
            ? `../auth/auth.html?type=${currentAccountType}&mode=login`
            : '../auth/auth.html';
        window.location.href = redirectUrl;
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
});

checkAuth();
