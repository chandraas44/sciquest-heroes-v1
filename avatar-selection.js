import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { createSupabaseClientAsync } from './config.js';

let supabase = null;

async function getSupabaseClient() {
  if (!supabase) {
    supabase = await createSupabaseClientAsync(createClient);
  }
  return supabase;
}



const avatarGrid = document.getElementById('avatarGrid');
const confirmBtn = document.getElementById('confirmBtn');
const confirmBtnText = document.getElementById('confirmBtnText');
const skipBtn = document.getElementById('skipBtn');
const errorMessage = document.getElementById('errorMessage');

let selectedAvatar = null;
let avatars = [];

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
    errorMessage.classList.remove('show');
}

async function fetchAvatarsFromStorage() {
    try {
        const { data, error } = await supabase
            .storage
            .from('avatars')
            .list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        console.log('Supabase Storage List Response:', { data, error });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn('No avatars found in storage bucket "avatars".');
            return [];
        }

        // Filter for image files and map to avatar objects
        const avatarFiles = data.filter(file =>
            file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)
        );

        return avatarFiles.map(file => {
            const { data: publicUrlData } = supabase
                .storage
                .from('avatars')
                .getPublicUrl(file.name);

            // Create a display name from the filename (e.g., "Bolt.png" -> "Bolt")
            const name = file.name.split('.')[0];
            // Create an ID from the name (e.g., "Bolt" -> "bolt")
            const id = name.toLowerCase();

            return {
                id: id,
                name: name,
                image: publicUrlData.publicUrl
            };
        });

    } catch (error) {
        console.error('Error fetching avatars:', error);
        showError('Failed to load avatars. Please refresh the page.');
        return [];
    }
}

async function renderAvatars() {
    // Show loading state
    avatarGrid.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';

    avatars = await fetchAvatarsFromStorage();

    avatarGrid.innerHTML = ''; // Clear loading spinner

    if (avatars.length === 0) {
        avatarGrid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No avatars available.</p>';
        return;
    }

    avatars.forEach(avatar => {
        const card = document.createElement('div');
        card.className = 'avatar-card';
        card.dataset.avatarId = avatar.id;

        card.innerHTML = `
            <div class="avatar-image-wrapper">
                <img src="${avatar.image}" alt="${avatar.name}" onerror="this.src='assets/avatars/Bolt.png'">
            </div>
            <div class="avatar-name">${avatar.name}</div>
        `;

        card.addEventListener('click', () => selectAvatar(avatar.id));
        avatarGrid.appendChild(card);
    });
}

function selectAvatar(avatarId) {
    hideError();

    document.querySelectorAll('.avatar-card').forEach(card => {
        card.classList.remove('selected');
    });

    const selectedCard = document.querySelector(`[data-avatar-id="${avatarId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedAvatar = avatars.find(a => a.id === avatarId);
        confirmBtn.disabled = false;
    }
}

async function saveAvatar(avatarImage) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
            throw new Error('Failed to connect to database');
        }
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No active session. Please log in again.');
        }

        const { error } = await supabase
            .from('user_profiles')
            .update({ avatar_url: avatarImage })
            .eq('id', session.user.id);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error saving avatar:', error);
        throw error;
    }
}

confirmBtn.addEventListener('click', async () => {
    if (!selectedAvatar) {
        showError('Please select an avatar');
        return;
    }

    confirmBtn.disabled = true;
    confirmBtnText.innerHTML = '<span class="loading-spinner"></span>Saving...';

    try {
        await saveAvatar(selectedAvatar.image);

        localStorage.removeItem('newStudentSignup');

        setTimeout(() => {
            window.location.href = 'stories/index.html';
        }, 500);
    } catch (error) {
        showError('Failed to save avatar. Please try again.');
        confirmBtn.disabled = false;
        confirmBtnText.textContent = 'Confirm Selection';
    }
});

skipBtn.addEventListener('click', () => {
    window.location.href = 'stories/index.html';
});

async function checkAuth() {
    const supabase = await getSupabaseClient();
    if (!supabase) {
        window.location.href = 'auth/auth.html';
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'auth/auth.html';
        return;
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('account_type')
        .eq('id', session.user.id)
        .maybeSingle();

    if (profile && profile.account_type !== 'student') {
        window.location.href = 'index.html';
        return;
    }
}

// Initialize
(async () => {
    await checkAuth();
    await renderAvatars();
})();
