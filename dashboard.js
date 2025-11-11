import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from './config.js';

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userMenuTrigger = document.getElementById('userMenuTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'auth.html';
        return;
    }

    loadUserProfile(session.user.id);
}

async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        if (profile) {
            const displayName = profile.first_name || profile.full_name || profile.username || profile.email;
            userName.textContent = displayName;

            if (profile.avatar_url) {
                userAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
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
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        localStorage.clear();
        sessionStorage.clear();

        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
});

checkAuth();
