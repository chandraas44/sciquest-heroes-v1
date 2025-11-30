import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const welcomeMessage = document.getElementById('welcomeMessage');
const avatarDisplay = document.getElementById('avatarDisplay');
const currentGrade = document.getElementById('currentGrade');

async function checkAuth() {
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

    if (profile.account_type !== 'student') {
        if (profile.account_type === 'parent') {
            window.location.href = '../parent/dashboard.html';
        } else if (profile.account_type === 'teacher') {
            window.location.href = 'teacher-dashboard.html';
        } else {
            window.location.href = '../index.html';
        }
        return;
    }

    loadChildProfile(profile);
}

async function loadChildProfile(profile) {
    try {
        const displayName = profile.first_name || profile.full_name || profile.username || 'Hero';
        if (profile.avatar_url) {
            avatarDisplay.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
        } else if (profile.first_name) {
            const initial = profile.first_name.charAt(0).toUpperCase();
            // Update avatar display with initial in a styled div
            avatarDisplay.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea, #764ba2); font-size: 36px; font-weight: 800; color: white; border-radius: 50%;">${initial}</div>`;
        } else {
            avatarDisplay.innerHTML = '<i class="fas fa-user text-slate-400 text-4xl"></i>';
        }

        if (profile.grade_level) {
            currentGrade.textContent = profile.grade_level;
        }

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}



checkAuth();
