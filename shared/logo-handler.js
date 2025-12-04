import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

/**
 * Immediately updates the logo link based on the current URL path.
 * This prevents the "flash" of the landing page by setting a reasonable default
 * before the async auth check completes.
 */
function updateLogoLinkSynchronous() {
    const currentPath = window.location.pathname;
    let target = '';

    // Heuristics based on current path
    if (currentPath.includes('/stories/') || currentPath.includes('student-dashboard')) {
        target = '/stories/index.html';
    } else if (currentPath.includes('/parent/')) {
        target = '/parent/dashboard.html';
    } else if (currentPath.includes('teacher-dashboard')) {
        target = '/dashboards/teacher-dashboard.html';
    }

    if (target) {
        applyLogoTarget(target);
    }
}

/**
 * Applies the target URL to the logo link.
 * Handles "same page" logic to prevent reload.
 */
function applyLogoTarget(target) {
    const logoLinks = document.querySelectorAll('a[href*="index.html"]');
    const currentPath = window.location.pathname;

    logoLinks.forEach(link => {
        // Check if it's the main logo (usually has the brand name)
        if (link.textContent.includes('SciQuest Heroes')) {

            // Check if we are already on the target page
            // Normalize paths: handle /stories/ vs /stories/index.html
            const isSamePage = currentPath.endsWith(target) ||
                (target.endsWith('index.html') && currentPath.endsWith('/stories/')) ||
                currentPath === target;

            if (isSamePage) {
                link.href = '#';
                // Ensure we don't add multiple listeners
                if (!link.hasAttribute('data-logo-handled')) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                    link.setAttribute('data-logo-handled', 'true');
                }
            } else {
                link.href = target;
                // If we previously added a listener (e.g. if we were on same page but target changed), 
                // we might want to remove it, but cloning/replacing is safer or just leaving it 
                // if we assume the heuristic won't flip-flop wildly. 
                // For now, simple href update is sufficient as the listener checks preventDefault only if href is #? 
                // No, the listener is attached to the element. 
                // If we change href from # to URL, the listener still fires.
                // So we should check href in the listener or remove it.
                // Simplest fix: If we change to a URL, clone and replace to strip listeners.
                if (link.getAttribute('href') !== '#' && link.hasAttribute('data-logo-handled')) {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                }
            }
        }
    });
}

async function initLogoHandler() {
    // 1. Run synchronous update immediately
    updateLogoLinkSynchronous();

    // 2. Run async auth check to verify/refine the target
    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) return;

    try {
        const { createSupabaseClientAsync } = await import('../config.js');
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
        const supabase = await createSupabaseClientAsync(createClient);
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('account_type')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile) {
                let target = '';
                if (profile.account_type === 'student') {
                    target = '/stories/index.html';
                } else if (profile.account_type === 'parent') {
                    target = '/parent/dashboard.html';
                } else if (profile.account_type === 'teacher') {
                    target = '/dashboards/teacher-dashboard.html';
                }

                if (target) {
                    applyLogoTarget(target);
                }
            }
        }
    } catch (err) {
        console.error('Error in logo handler:', err);
    }
}

// Run immediately
initLogoHandler();

// Also run on DOMContentLoaded to ensure elements exist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateLogoLinkSynchronous());
}
