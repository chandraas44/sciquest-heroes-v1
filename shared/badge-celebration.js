// Badge Celebration Component - Reusable celebration animation

let celebrationQueue = [];
let isCelebrating = false;
const DEFAULT_CHILD_ID = 'guest-child';

function createConfetti() {
  const confettiCount = 30;
  const colors = ['#a855f7', '#ec4899', '#fbbf24']; // purple, pink, gold
  const confettiContainer = document.createElement('div');
  confettiContainer.className = 'fixed inset-0 pointer-events-none z-[60]';
  confettiContainer.id = 'badge-confetti';
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 3 + Math.random() * 2;
    
    confetti.className = 'absolute w-3 h-3 rounded-full';
    confetti.style.left = `${left}%`;
    confetti.style.backgroundColor = color;
    confetti.style.top = '-10px';
    confetti.style.animation = `confetti-fall ${duration}s ease-out ${delay}s forwards`;
    confettiContainer.appendChild(confetti);
  }
  
  // Add confetti animation styles if not already present
  if (!document.getElementById('badge-confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'badge-confetti-styles';
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
      @keyframes badge-glow-pulse {
        0%, 100% { box-shadow: 0 0 40px rgba(155, 55, 255, 0.6); }
        50% { box-shadow: 0 0 60px rgba(155, 55, 255, 0.9); }
      }
      @keyframes badge-icon-bounce {
        0% { transform: scale(0.5) rotate(0deg); opacity: 0; }
        50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        100% { transform: scale(1) rotate(360deg); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  return confettiContainer;
}

function createCelebrationOverlay(badgeId, badgeName, badgeIcon) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
  overlay.id = 'badge-celebration-overlay';
  
  const card = document.createElement('div');
  card.className = 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_60px_rgba(155,55,255,0.8)] rounded-3xl p-8 text-center max-w-md w-full relative animate-[badge-glow-pulse_2s_ease-in-out_3]';
  
  // Icon container with animation
  const iconContainer = document.createElement('div');
  iconContainer.className = 'w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl border-4 border-white/30 mx-auto mb-4 flex items-center justify-center animate-[badge-icon-bounce_1s_ease-out]';
  iconContainer.innerHTML = `<span class="text-6xl">${badgeIcon || '🏆'}</span>`;
  
  // Title
  const title = document.createElement('h2');
  title.className = 'font-fredoka text-4xl font-bold text-white mb-2';
  title.textContent = 'Badge Unlocked!';
  
  // Badge name
  const name = document.createElement('p');
  name.className = 'font-fredoka text-2xl font-bold text-white mb-6';
  name.textContent = badgeName || 'New Badge';
  
  // View Badge button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'bg-white/20 backdrop-blur-xl border-2 border-white/30 text-white font-fredoka font-bold px-8 py-3 rounded-2xl hover:bg-white/30 transition shadow-lg mb-4';
  viewBtn.textContent = 'View Badge';
  viewBtn.onclick = () => {
    window.location.href = `/badges/badges.html?badgeId=${badgeId}`;
  };
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => {
    dismissCelebration();
  };
  
  card.appendChild(closeBtn);
  card.appendChild(iconContainer);
  card.appendChild(title);
  card.appendChild(name);
  card.appendChild(viewBtn);
  
  overlay.appendChild(card);
  
  // Click outside to dismiss
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      dismissCelebration();
    }
  };
  
  // ESC key to dismiss
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      dismissCelebration();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  return overlay;
}

function dismissCelebration() {
  const overlay = document.getElementById('badge-celebration-overlay');
  const confetti = document.getElementById('badge-confetti');
  
  if (overlay) {
    overlay.remove();
  }
  if (confetti) {
    setTimeout(() => confetti.remove(), 3000); // Wait for animation to finish
  }
  
  isCelebrating = false;
  
  // Process next in queue
  processCelebrationQueue();
}

function processCelebrationQueue() {
  if (isCelebrating || celebrationQueue.length === 0) {
    return;
  }
  
  const next = celebrationQueue.shift();
  showBadgeCelebrationImmediate(next.badgeId, next.badgeName, next.badgeIcon);
}

function showBadgeCelebrationImmediate(badgeId, badgeName, badgeIcon) {
  if (isCelebrating) {
    // Queue it
    celebrationQueue.push({ badgeId, badgeName, badgeIcon });
    return;
  }
  
  isCelebrating = true;
  
  // Create confetti
  const confetti = createConfetti();
  document.body.appendChild(confetti);
  
  // Create overlay
  const overlay = createCelebrationOverlay(badgeId, badgeName, badgeIcon);
  document.body.appendChild(overlay);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissCelebration();
  }, 5000);
}

export function showBadgeCelebration(badgeId, badgeName, badgeIcon) {
  // Add to queue or show immediately
  if (isCelebrating) {
    celebrationQueue.push({ badgeId, badgeName, badgeIcon });
  } else {
    showBadgeCelebrationImmediate(badgeId, badgeName, badgeIcon);
  }
}

// Export queue management functions for testing
export function getCelebrationQueue() {
  return [...celebrationQueue];
}

export function clearCelebrationQueue() {
  celebrationQueue = [];
  isCelebrating = false;
  dismissCelebration();
}



