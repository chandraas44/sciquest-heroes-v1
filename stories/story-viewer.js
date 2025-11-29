import {
  getStoryById,
  getPanelsForStory,
  saveStoryProgress,
  getStoryProgressSummary,
  logAnalyticsEvent,
  isUsingStoryMocks
} from './story-services.js';
import {
  evaluateBadgeRules,
  getBadgeById
} from '../badges/badge-services.js';
import {
  showBadgeCelebration
} from '../shared/badge-celebration.js';
import {
  getQuizUrl
} from './quiz-routing.js';

const params = new URLSearchParams(window.location.search);
// Extract storyId from query params, or fallback to pathname: /stories/{storyId}/read
let storyId = params.get('storyId');
if (!storyId) {
  const pathMatch = window.location.pathname.match(/^\/stories\/([^/]+)\/read$/);
  if (pathMatch) {
    storyId = pathMatch[1];
  }
}
const panelParam = Number(params.get('panel')) || 0;

const storyTitleEl = document.getElementById('viewerStoryTitle');
const panelImageEl = document.getElementById('panelImage');
const panelImageContainer = document.getElementById('panelImageContainer');
const panelTagEl = document.getElementById('panelTag');
const panelNarrationEl = document.getElementById('panelNarration');
const panelPositionLabelEl = document.getElementById('panelPositionLabel');
const progressDotsEl = document.getElementById('progressDots');
const helperTitleEl = document.getElementById('helperTitle');
const helperTextEl = document.getElementById('helperText');
const progressSummaryEl = document.getElementById('progressSummary');
const chatCtaBtn = document.getElementById('chatCtaBtn');
const prevBtn = document.getElementById('prevPanelBtn');
const nextBtn = document.getElementById('nextPanelBtn');
const glossaryBtn = document.getElementById('openGlossaryBtn');
const glossaryDialog = document.getElementById('glossaryDialog');
const glossaryList = document.getElementById('glossaryList');
const glossaryCloseBtn = document.getElementById('closeGlossaryBtn');
const readWithVoiceBtn = document.getElementById('readWithVoiceBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
// Offline banner removed - no longer needed
// const offlineBanner = document.getElementById('viewerOfflineBanner');

const state = {
  story: null,
  panels: [],
  currentPanelIndex: 0,
  panelCount: 0
};

// Text-to-Speech (TTS) state - replaced audio playback
let currentUtterance = null;
let utteranceQueue = []; // Queue for expressive multi-utterance speech
let currentUtteranceIndex = 0;
let isSpeaking = false;
let speechSynthesis = null;
let voicesLoaded = false;
let bestVoice = null;

// Audio playback state (for Supabase audio files)
let currentAudio = null;
let isAudioPlaying = false;

// Initialize Speech Synthesis
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis = window.speechSynthesis;
}

/**
 * Check if browser supports Speech Synthesis
 */
function isSpeechSynthesisSupported() {
  return speechSynthesis !== null;
}

/**
 * Get Supabase storage public URL for audio file
 * @param {string} audioPath - Path to audio file (e.g., "@L1P1Photosynthesis.mp3" or "L1P1Photosynthesis.mp3")
 * @returns {Promise<string|null>} Public URL or null if Supabase not available
 */
async function getSupabaseAudioUrl(audioPath) {
  try {
    console.log('[story-viewer] Getting Supabase audio URL for:', audioPath);
    
    // Import Supabase client dynamically
    const { getSupabaseClient } = await import('./story-services.js');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      console.warn('[story-viewer] Supabase not available, cannot get audio URL');
      return null;
    }
    
    // Remove leading @ if present
    let cleanPath = audioPath.startsWith('@') ? audioPath.substring(1) : audioPath;
    
    // Remove any leading 'audio/' since we're already specifying the bucket
    // Supabase getPublicUrl expects just the file path within the bucket
    cleanPath = cleanPath.replace(/^audio\//, '');
    
    // Remove any leading slashes
    cleanPath = cleanPath.replace(/^\//, '');
    
    console.log('[story-viewer] Cleaned file path:', cleanPath);
    
    // Get public URL from Supabase storage bucket 'audio'
    // getPublicUrl expects just the filename/path within the bucket, not 'audio/'
    const { data, error } = supabase.storage.from('audio').getPublicUrl(cleanPath);
    
    if (error) {
      console.error('[story-viewer] Error getting public URL:', error);
      return null;
    }
    
    const publicUrl = data?.publicUrl;
    console.log('[story-viewer] Got public URL:', publicUrl);
    
    return publicUrl || null;
  } catch (error) {
    console.error('[story-viewer] Error getting Supabase audio URL:', error);
    return null;
  }
}

/**
 * Get clean narration text for TTS (remove HTML tags, format dialogue)
 */
function getCleanNarrationText(panel) {
  if (!panel?.narration) return '';
  
  // Remove HTML tags if any
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = panel.narration;
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalize whitespace first (collapse multiple spaces to single space)
  // This helps catch CO2 variations that might have been split by HTML/text extraction
  text = text.replace(/\s+/g, ' ').trim();
  
  // Convert "Mr." to "Mister" for proper TTS pronunciation (before other processing)
  // Handle all patterns: "Mr. " (with space), "Mr." (without space), "Mr.Chloro", etc.
  // Must be case-insensitive and handle various contexts
  text = text.replace(/\bMr\.\s+/g, 'Mister '); // "Mr. " -> "Mister " (word boundary ensures we don't match mid-word)
  text = text.replace(/\bMr\.([A-Z])/g, 'Mister $1'); // "Mr.Chloro" -> "Mister Chloro" (word boundary)
  text = text.replace(/\bMr\./g, 'Mister '); // Any remaining "Mr." -> "Mister " (fallback)
  
  // Convert CO2 to "Carbon dioxide" for proper TTS pronunciation
  // Handle all variations: CO₂ (subscript), CO2, C O 2 (spaced), etc.
  // Use case-insensitive matching and handle various spacing
  // Order matters: match most specific patterns first
  // Match subscript first (most specific)
  text = text.replace(/CO₂/gi, 'Carbon dioxide');
  text = text.replace(/C\s*O\s*₂/gi, 'Carbon dioxide'); // C O₂ or CO₂ with spaces
  // Match spaced versions before non-spaced (to catch "C O 2" before it becomes "CO2")
  text = text.replace(/C\s+O\s+2/gi, 'Carbon dioxide'); // C O 2 (with one or more spaces)
  text = text.replace(/C\s+O\s*2/gi, 'Carbon dioxide'); // C O2 (space between C and O)
  text = text.replace(/C\s*O\s+2/gi, 'Carbon dioxide'); // CO 2 (space between O and 2)
  // Match non-spaced versions
  text = text.replace(/CO\s*2/gi, 'Carbon dioxide'); // CO2 or CO 2 (with optional space)
  // Final catch-all: any C, O, 2 sequence with any whitespace (very aggressive)
  text = text.replace(/\bC\s*O\s*2\b/gi, 'Carbon dioxide');
  
  // Replace dialogue markers for better TTS pronunciation
  // Change "Mister Chloro" to "MisterChloro" (no space) for energetic voice detection
  text = text.replace(/Mister Chloro/g, 'MisterChloro');
  text = text.replace(/MisterChloro:/g, 'MisterChloro says:');
  text = text.replace(/Child:/g, 'The child says:');
  
  return text.trim();
}

/**
 * Split text into segments with punctuation for expressive TTS
 * Returns array of {text, type, isMrChloro, isPause} where type is 'question', 'exclamation', or 'normal'
 * and isMrChloro indicates if segment contains Mr.Chloro dialogue
 * isPause indicates if this is a pause segment (created from hyphens)
 * Note: Text should already have "Mr." converted to "Mister" at this point
 */
function splitTextWithExpression(text) {
  if (!text) return [];
  
  // Split by sentence-ending punctuation and hyphens, keeping the punctuation
  // Pattern: split on . ! ? - but keep the punctuation with the sentence
  const segments = [];
  let currentSegment = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    const prevChar = text[i - 1];
    
    // Check for hyphens (em dash, en dash, or regular hyphen)
    // Hyphens create pause segments
    if (char === '-' || char === '—' || char === '–') {
      // Add current segment before the hyphen
      if (currentSegment.trim()) {
        const isMrChloro = currentSegment.includes('MisterChloro') || 
                          currentSegment.includes('MisterChloro says:') ||
                          currentSegment.includes('Mr.Chloro') ||
                          currentSegment.includes('Mr.Chloro says:') ||
                          currentSegment.toLowerCase().includes('misterchloro') ||
                          currentSegment.toLowerCase().includes('mr.chloro');
        
        segments.push({
          text: currentSegment.trim(),
          type: 'normal',
          isMrChloro: isMrChloro,
          isPause: false
        });
      }
      
      // Create a pause segment (empty text, will be handled as pause in TTS)
      segments.push({
        text: '',
        type: 'pause',
        isMrChloro: false,
        isPause: true
      });
      
      currentSegment = '';
      
      // Skip space after hyphen if present
      if (nextChar === ' ') {
        i++;
      }
      continue;
    }
    
    currentSegment += char;
    
    // Check for sentence-ending punctuation
    if (char === '?' || char === '!' || char === '.') {
      // Skip if it's an ellipsis (...)
      if (char === '.' && (prevChar === '.' || nextChar === '.')) {
        continue;
      }
      
      // Skip if it's an abbreviation (but allow "MisterChloro" - no space after "Mister")
      // Skip if it's "MisterChloro" - we want to keep that together
      if (char === '.' && nextChar && nextChar !== ' ' && nextChar !== '\n' && nextChar !== '?' && !currentSegment.includes('MisterChloro')) {
        // Check if it's actually "MisterChloro" (no space) - but "Mister" doesn't have a period
        // Actually, after conversion, it's "MisterChloro" not "Mr.Chloro", so we need different logic
        // Skip abbreviations like "Dr.", "Mrs.", etc. but not "MisterChloro"
        if (!currentSegment.includes('Mister') && !(currentSegment.includes('Mr.') && nextChar === 'C')) {
          continue;
        }
      }
      
      // Determine segment type
      let type = 'normal';
      if (char === '?') {
        type = 'question';
      } else if (char === '!') {
        type = 'exclamation';
      }
      
      // Check if this segment contains Mr.Chloro dialogue (after conversion it's "MisterChloro")
      const isMrChloro = currentSegment.includes('MisterChloro') || 
                        currentSegment.includes('MisterChloro says:') ||
                        currentSegment.includes('Mr.Chloro') ||
                        currentSegment.includes('Mr.Chloro says:') ||
                        currentSegment.toLowerCase().includes('misterchloro') ||
                        currentSegment.toLowerCase().includes('mr.chloro');
      
      segments.push({
        text: currentSegment.trim(),
        type: type,
        isMrChloro: isMrChloro,
        isPause: false
      });
      
      currentSegment = '';
      
      // Skip space after punctuation
      if (nextChar === ' ') {
        i++;
      }
    }
  }
  
  // Add any remaining text
  if (currentSegment.trim()) {
    const isMrChloro = currentSegment.includes('MisterChloro') || 
                      currentSegment.includes('MisterChloro says:') ||
                      currentSegment.includes('Mr.Chloro') ||
                      currentSegment.includes('Mr.Chloro says:') ||
                      currentSegment.toLowerCase().includes('misterchloro') ||
                      currentSegment.toLowerCase().includes('mr.chloro');
    
    segments.push({
      text: currentSegment.trim(),
      type: 'normal',
      isMrChloro: isMrChloro,
      isPause: false
    });
  }
  
  return segments.filter(s => s.text.length > 0 || s.isPause);
}

/**
 * Remove punctuation marks from text but keep expression type
 * Removes: ! ? " ' 
 */
function removePunctuationFromText(text) {
  if (!text) return text;
  
  // Remove quotes (both single and double)
  text = text.replace(/["']/g, '');
  
  // Remove question marks and exclamation marks (but keep periods for sentence structure)
  text = text.replace(/[!?]/g, '');
  
  // Clean up multiple spaces
  text = text.replace(/\s+/g, ' ').trim();
  
  // Convert CO2 to "Carbon dioxide" (after punctuation removal, in case it was split)
  // Handle all variations: CO₂ (subscript), CO2, C O 2 (spaced), etc.
  // Order matters: match most specific patterns first
  // Match subscript first (most specific)
  text = text.replace(/CO₂/gi, 'Carbon dioxide');
  text = text.replace(/C\s*O\s*₂/gi, 'Carbon dioxide'); // C O₂ or CO₂ with spaces
  // Match spaced versions before non-spaced (to catch "C O 2" before it becomes "CO2")
  text = text.replace(/C\s+O\s+2/gi, 'Carbon dioxide'); // C O 2 (with one or more spaces)
  text = text.replace(/C\s+O\s*2/gi, 'Carbon dioxide'); // C O2 (space between C and O)
  text = text.replace(/C\s*O\s+2/gi, 'Carbon dioxide'); // CO 2 (space between O and 2)
  // Match non-spaced versions
  text = text.replace(/CO\s*2/gi, 'Carbon dioxide'); // CO2 or CO 2 (with optional space)
  // Final catch-all: any C, O, 2 sequence with any whitespace (very aggressive)
  text = text.replace(/\bC\s*O\s*2\b/gi, 'Carbon dioxide');
  
  return text;
}

/**
 * Create expressive utterances from text segments
 * Adjusts pitch and rate based on punctuation and Mr.Chloro dialogue
 * Removes punctuation from spoken text but keeps expression
 */
function createExpressiveUtterances(text, voice, baseRate = 0.9, basePitch = 1.0) {
  const segments = splitTextWithExpression(text);
  const utterances = [];
  
  segments.forEach((segment, index) => {
    // Handle pause segments (from hyphens) - create a pause utterance with empty text
    if (segment.isPause) {
      // Create a very short silent utterance to create a pause
      const pauseUtterance = new SpeechSynthesisUtterance(' ');
      pauseUtterance.voice = voice;
      pauseUtterance.pitch = 1.0;
      pauseUtterance.rate = 0.1; // Very slow to create pause effect
      pauseUtterance.volume = 0; // Silent
      // Mark as pause for detection in onend handler
      pauseUtterance._isPause = true;
      utterances.push(pauseUtterance);
      return; // Skip to next segment
    }
    
    // Remove punctuation from the text that will be spoken
    let cleanText = removePunctuationFromText(segment.text);
    
    // Ensure "MisterChloro" is pronounced correctly (add space for TTS: "Mister Chloro")
    // Text should already have "Mr." converted to "Mister" from getCleanNarrationText
    cleanText = cleanText.replace(/MisterChloro/g, 'Mister Chloro');
    // Also handle any remaining "Mr.Chloro" patterns (backward compatibility)
    cleanText = cleanText.replace(/Mr\.Chloro/g, 'Mister Chloro');
    
    // Final CO2 conversion (safety check - should already be converted, but ensure it)
    // Order matters: match most specific patterns first
    // Match subscript first (most specific)
    cleanText = cleanText.replace(/CO₂/gi, 'Carbon dioxide');
    cleanText = cleanText.replace(/C\s*O\s*₂/gi, 'Carbon dioxide'); // C O₂ or CO₂ with spaces
    // Match spaced versions before non-spaced (to catch "C O 2" before it becomes "CO2")
    cleanText = cleanText.replace(/C\s+O\s+2/gi, 'Carbon dioxide'); // C O 2 (with one or more spaces)
    cleanText = cleanText.replace(/C\s+O\s*2/gi, 'Carbon dioxide'); // C O2 (space between C and O)
    cleanText = cleanText.replace(/C\s*O\s+2/gi, 'Carbon dioxide'); // CO 2 (space between O and 2)
    // Match non-spaced versions
    cleanText = cleanText.replace(/CO\s*2/gi, 'Carbon dioxide'); // CO2 or CO 2 (with optional space)
    // Final catch-all: any C, O, 2 sequence with any whitespace (very aggressive)
    cleanText = cleanText.replace(/\bC\s*O\s*2\b/gi, 'Carbon dioxide');
    
    if (!cleanText || cleanText.length === 0) {
      return; // Skip empty segments
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = voice;
    
    // Determine base adjustments based on punctuation type
    let pitchAdjustment = 0;
    let rateAdjustment = 0;
    
    switch (segment.type) {
      case 'question':
        // Questions: higher pitch and faster rate for excitement and engagement
        // Questions in stories are often exciting invitations or curious prompts
        // Higher pitch creates rising intonation + excitement
        pitchAdjustment = 0.5; // Increased from 0.45 for more excitement (same as exclamations)
        rateAdjustment = 0.12; // Increased from 0.08 for more energy and enthusiasm
        break;
      
      case 'exclamation':
        // Exclamations: much higher pitch and faster for excitement and emotion
        pitchAdjustment = 0.5; // Increased from 0.3 for more excitement
        rateAdjustment = 0.15; // Increased from 0.1 for more energy
        break;
      
      default:
        // Normal sentences: base settings
        pitchAdjustment = 0;
        rateAdjustment = 0;
        break;
    }
    
    // Add extra energy and fun for Mr.Chloro segments
    if (segment.isMrChloro) {
      // Mr.Chloro gets a more energetic, fun voice:
      // - Higher pitch (more enthusiastic)
      // - Faster rate (more energetic)
      // - Full volume
      pitchAdjustment += 0.4; // Much higher pitch for fun, energetic character
      rateAdjustment += 0.15; // Faster rate for energy
      
      console.log('[TTS] Mr.Chloro segment detected - applying energetic voice settings');
    }
    
    // Apply final settings
    utterance.pitch = Math.min(basePitch + pitchAdjustment, 2.0); // Cap at 2.0
    utterance.rate = Math.min(baseRate + rateAdjustment, 2.0); // Cap at 2.0
    utterance.volume = 1.0; // Full volume
    
    utterances.push(utterance);
  });
  
  return utterances;
}

/**
 * Get the best available natural-sounding voice
 * Prioritizes high-quality, non-robotic voices
 */
function getBestNaturalVoice() {
  if (!speechSynthesis) return null;
  
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  // Strategy 1: First, filter for American English (en-US) voices only
  const usEnglishVoices = voices.filter(v => 
    v.lang === 'en-US' || 
    v.lang.startsWith('en-US') ||
    v.lang === 'en' && (v.name.includes('US') || v.name.includes('United States'))
  );
  
  if (usEnglishVoices.length === 0) {
    console.warn('[TTS] No American English voices found, falling back to any English voice');
  } else {
    console.log('[TTS] Found', usEnglishVoices.length, 'American English voices');
  }
  
  // Priority list: Most natural-sounding American English voices first
  // These are typically neural/neural-network voices that sound human-like
  const preferredVoices = [
    // Chrome/Edge - Google US English voices (very natural, American accent)
    'Google US English Female',
    'Google US English Male',
    
    // Windows - Microsoft US English voices (natural, American accent)
    'Microsoft Zira Desktop - English (United States)',
    'Microsoft David Desktop - English (United States)',
    'Microsoft Aria Desktop - English (United States)',
    
    // macOS/iOS - Apple US English voices (very natural, American accent)
    'Samantha',  // US English
    'Alex',      // US English
    'Victoria',  // US English
  ];

  // Strategy 1a: Try to find exact match from preferred list in US English voices only
  const voiceListToSearch = usEnglishVoices.length > 0 ? usEnglishVoices : voices;
  
  for (const preferredName of preferredVoices) {
    const voice = voiceListToSearch.find(v => 
      v.name === preferredName || 
      v.name.includes(preferredName)
    );
    if (voice) {
      console.log('[TTS] Selected preferred US voice:', voice.name, 'lang:', voice.lang);
      return voice;
    }
  }

  // Strategy 2: Look for "Neural" voices with American English (usually most natural)
  if (usEnglishVoices.length > 0) {
    const neuralVoiceUS = usEnglishVoices.find(v => 
      v.name.toLowerCase().includes('neural') || 
      v.voiceURI.toLowerCase().includes('neural')
    );
    if (neuralVoiceUS) {
      console.log('[TTS] Selected US neural voice:', neuralVoiceUS.name, 'lang:', neuralVoiceUS.lang);
      return neuralVoiceUS;
    }
  }
  
  // Fallback to any neural voice (only if no US voices found)
  if (usEnglishVoices.length === 0) {
    const neuralVoice = voices.find(v => 
      v.name.toLowerCase().includes('neural') ||
      v.voiceURI.toLowerCase().includes('neural')
    );
    if (neuralVoice) {
      console.log('[TTS] Selected neural voice (fallback):', neuralVoice.name);
      return neuralVoice;
    }
  }

  // Strategy 3: Prefer American English female voices (often sound more natural for storytelling)
  if (usEnglishVoices.length > 0) {
    const femaleVoiceUS = usEnglishVoices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('victoria')
    );
    if (femaleVoiceUS) {
      console.log('[TTS] Selected US female voice:', femaleVoiceUS.name, 'lang:', femaleVoiceUS.lang);
      return femaleVoiceUS;
    }
  }
  
  // Fallback to any English female voice (only if no US voices found)
  if (usEnglishVoices.length === 0) {
    const femaleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('zira') ||
       v.name.toLowerCase().includes('samantha') ||
       v.name.toLowerCase().includes('karen'))
    );
    if (femaleVoice) {
      console.log('[TTS] Selected female voice (fallback):', femaleVoice.name);
      return femaleVoice;
    }
  }

  // Strategy 4: Filter out obviously robotic voices, prefer American English
  const avoidRobotic = ['SAPI', 'eSpeak', 'Festival'];
  
  // First try American English voices (allow Microsoft voices like Zira and David)
  if (usEnglishVoices.length > 0) {
    const naturalVoiceUS = usEnglishVoices.find(v => {
      // Avoid voices with robotic-sounding names (but allow Microsoft Zira and David)
      const isRobotic = avoidRobotic.some(term => v.name.includes(term));
      return !isRobotic;
    });

    if (naturalVoiceUS) {
      console.log('[TTS] Selected natural-sounding US voice:', naturalVoiceUS.name, 'lang:', naturalVoiceUS.lang);
      return naturalVoiceUS;
    }
    
    // If no non-robotic US voice found, just take the first US voice
    if (usEnglishVoices.length > 0) {
      console.log('[TTS] Selected first available US voice:', usEnglishVoices[0].name, 'lang:', usEnglishVoices[0].lang);
      return usEnglishVoices[0];
    }
  }
  
  // Fallback to any English voice (only if no US voices found)
  if (usEnglishVoices.length === 0) {
    const naturalVoice = voices.find(v => {
      if (!v.lang.startsWith('en')) return false;
      // Avoid voices with robotic-sounding names (but allow Zira and David)
      const isRobotic = avoidRobotic.some(term => 
        v.name.includes(term) && !v.name.includes('Zira') && !v.name.includes('David')
      );
      return !isRobotic;
    });

    if (naturalVoice) {
      console.log('[TTS] Selected natural-sounding voice (fallback):', naturalVoice.name);
      return naturalVoice;
    }
    
    // Last resort: any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log('[TTS] Selected fallback English voice:', englishVoice.name);
      return englishVoice;
    }
  }

  // Last resort: first available voice
  console.warn('[TTS] Using default voice:', voices[0].name);
  return voices[0];
}

/**
 * Load and cache available voices
 */
function loadVoices() {
  if (voicesLoaded || !speechSynthesis) return;
  
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
    
    // Try to load saved preference first
    const saved = localStorage.getItem('sqh_preferred_voice');
    if (saved) {
      const voice = voices.find(v => v.name === saved);
      if (voice) {
        bestVoice = voice;
        console.log('[TTS] Loaded saved voice preference:', voice.name);
        return;
      }
    }
    
    // Otherwise, find best natural voice
    bestVoice = getBestNaturalVoice();
    
    // Log available voices for debugging
    console.log('[TTS] Available voices:', voices.map(v => ({
      name: v.name,
      lang: v.lang,
      default: v.default
    })));
    
    if (bestVoice) {
      console.log('[TTS] Best voice selected:', bestVoice.name, bestVoice.lang);
    }
  }
}

// Initialize voice loading
if (isSpeechSynthesisSupported()) {
  loadVoices();
  // Some browsers need this event
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Glossary definitions for Photosynthesis story (kid-friendly)
const GLOSSARY_DEFINITIONS = {
  'leaf': 'The flat, green part of a plant that catches sunlight and makes food.',
  'plant': 'A living thing that grows in soil and makes its own food using sunlight.',
  'photosynthesis': 'The amazing process where plants use sunlight, water, and air to make food and oxygen!',
  'sunlight': 'Bright light from the sun that gives plants energy to grow.',
  'sunbeams': 'Rays of light from the sun that shine on plants.',
  'leaves': 'The green parts of plants that catch sunlight and help make food.',
  'roots': 'The part of a plant that grows underground and drinks water from the soil.',
  'stem': 'The long part of a plant that holds up the leaves and carries water from roots to leaves.',
  'water': 'A clear liquid that plants drink through their roots to help them grow.',
  'soil': 'The dirt where plants grow and get water and nutrients.',
  'carbon dioxide': 'A gas in the air that plants breathe in to help make food. We breathe it out!',
  'CO₂': 'The short name for carbon dioxide - a gas plants need.',
  'stomata': 'Tiny openings on leaves that let plants "breathe" air in and out.',
  'air': 'The invisible stuff around us that we breathe. Plants use it too!',
  'process': 'The steps or way something happens, like how plants make food.',
  'combine': 'To mix things together, like when plants mix sunlight, water, and air.',
  'chlorophyll': 'The green stuff in leaves that helps plants catch sunlight.',
  'sugar': 'Sweet food that plants make for themselves during photosynthesis.',
  'oxygen': 'A gas in the air that we need to breathe. Plants make it for us!',
  'food': 'What living things eat to get energy. Plants make their own food!',
  'plant food': 'The sugar that plants make for themselves using photosynthesis.'
};

// Offline banner functionality removed
// function showOfflineBannerIfNeeded() {
//   if (!offlineBanner) return;
//   const shouldShow = isUsingStoryMocks() || navigator.onLine === false;
//   offlineBanner.classList.toggle('hidden', !shouldShow);
// }

/**
 * Gets the current user's display name from their profile
 * @returns {Promise<string>} User's display name or 'Hero' as fallback
 */
async function getCurrentUserName() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    const { supabaseConfig } = await import('../config.js');
    
    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      return 'Hero'; // Fallback name
    }
    
    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return 'Hero';
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, full_name, username')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (profile) {
      return profile.first_name || profile.full_name || profile.username || 'Hero';
    }
    
    return 'Hero';
  } catch (error) {
    console.warn('[story-viewer] Failed to get user name:', error);
    return 'Hero';
  }
}

/**
 * Load image and convert to base64 data URL for PDF
 * @param {string} imageUrl - URL of the image to load
 * @returns {Promise<string|null>} Base64 data URL or null if failed
 */
async function loadImageAsBase64(imageUrl) {
  return new Promise((resolve) => {
    try {
      // Normalize image URL
      let normalizedUrl = imageUrl;
      if (imageUrl.startsWith('../')) {
        normalizedUrl = imageUrl.replace('../', '/');
      } else if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        normalizedUrl = '/' + imageUrl;
      }
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          console.error('[story-viewer] Error converting image to base64:', error);
          resolve(null);
        }
      };
      
      img.onerror = (error) => {
        console.error('[story-viewer] Error loading image:', normalizedUrl, error);
        resolve(null);
      };
      
      img.src = normalizedUrl;
    } catch (error) {
      console.error('[story-viewer] Error in loadImageAsBase64:', error);
      resolve(null);
    }
  });
}

/**
 * Parse narration text into colored segments for PDF
 * Returns array of {text, color} objects
 * @param {string} narrationText - The raw narration text
 * @param {string} childName - The child's display name
 * @returns {Array<{text: string, color: string}>} Array of text segments with colors
 */
function parseColoredNarration(narrationText, childName) {
  if (!narrationText) return [];
  
  const segments = [];
  let text = narrationText;
  
  // Convert CO₂ to "Carbon dioxide" for PDF readability (avoid subscript issues)
  text = text.replace(/CO₂/gi, 'Carbon dioxide');
  text = text.replace(/CO\s*2/gi, 'Carbon dioxide');
  text = text.replace(/C\s*O\s*₂/gi, 'Carbon dioxide');
  text = text.replace(/C\s*O\s*2/gi, 'Carbon dioxide');
  
  // Convert "Mr. Chloro" to "Mr.Chloro" for consistency
  text = text.replace(/Mr\. Chloro/g, 'Mr.Chloro');
  
  // Replace "Child:" with actual child name (do this after Mr.Chloro conversion)
  text = text.replace(/Child:/g, `${childName}:`);
  
  // Normalize whitespace - ensure single spaces only
  text = text.replace(/\s+/g, ' ').trim();
  
  // Extract descriptive narration (everything before first dialogue)
  // Pattern should match: Mr.Chloro, Hero, Child, or the actual childName
  const escapedChildName = childName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstDialoguePattern = new RegExp(`(Mr\\.Chloro|Hero|Child|${escapedChildName}):\\s*["']`);
  const firstDialogueMatch = text.match(firstDialoguePattern);
  let descriptiveNarration = '';
  let dialoguePart = text;
  
  if (firstDialogueMatch) {
    const dialogueIndex = text.indexOf(firstDialogueMatch[0]);
    descriptiveNarration = text.substring(0, dialogueIndex).trim();
    dialoguePart = text.substring(dialogueIndex);
  } else {
    // No dialogue, just descriptive narration
    return [{ text: text.trim(), color: 'black' }];
  }
  
  // Add descriptive narration as black text
  if (descriptiveNarration) {
    segments.push({ text: descriptiveNarration, color: 'black' });
  }
  
  // Parse dialogue parts - include childName in pattern
  const escapedChildNameForPattern = childName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dialoguePattern = new RegExp(`(Mr\\.Chloro|Hero|Child|${escapedChildNameForPattern}|[A-Za-z\\s]+?):\\s*(["'])((?:(?!\\2).)*?)\\2`, 'g');
  let match;
  
  while ((match = dialoguePattern.exec(dialoguePart)) !== null) {
    const speaker = match[1].trim();
    const dialogue = match[3];
    
    // Determine color based on speaker
    let color = 'black';
    if (speaker === 'Mr.Chloro' || speaker === 'Mr. Chloro') {
      color = 'green'; // rgb(22, 163, 74) - green-600
    } else if (speaker === childName || speaker === 'Hero' || speaker === 'Child') {
      color = 'purple'; // rgb(147, 51, 234) - purple-600
    }
    
    // Format: "Speaker: dialogue"
    const dialogueText = `${speaker}: "${dialogue}"`;
    segments.push({ text: dialogueText, color: color });
  }
  
  return segments;
}

/**
 * Add colored narration text to PDF with consistent styling
 * @param {object} pdf - jsPDF instance
 * @param {Array<{text: string, color: string}>} segments - Text segments with colors
 * @param {number} x - X position
 * @param {number} y - Starting Y position
 * @param {number} maxWidth - Maximum width for text wrapping
 * @returns {number} Final Y position after text
 */
function addColoredNarrationToPDF(pdf, segments, x, y, maxWidth) {
  let currentY = y;
  const lineHeight = 5.5; // mm - consistent line height
  const fontSize = 10; // Consistent font size throughout
  
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'normal'); // Consistent font family
  
  segments.forEach(segment => {
    // Clean and normalize text - ensure no extra spaces or encoding issues
    let cleanText = segment.text || '';
    
    // Remove any zero-width spaces or special characters that might cause spacing issues
    cleanText = cleanText.replace(/\u200B/g, ''); // Zero-width space
    cleanText = cleanText.replace(/\u200C/g, ''); // Zero-width non-joiner
    cleanText = cleanText.replace(/\u200D/g, ''); // Zero-width joiner
    cleanText = cleanText.replace(/\uFEFF/g, ''); // Zero-width no-break space
    
    // Normalize whitespace - ensure single spaces only, no multiple spaces
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // Ensure text is a proper string (not array or object)
    if (typeof cleanText !== 'string') {
      cleanText = String(cleanText);
    }
    
    // Set text color
    if (segment.color === 'green') {
      pdf.setTextColor(22, 163, 74); // green-600
    } else if (segment.color === 'purple') {
      pdf.setTextColor(147, 51, 234); // purple-600
    } else {
      pdf.setTextColor(0, 0, 0); // black
    }
    
    // Split text to fit width using jsPDF's splitTextToSize
    // This should return an array of lines (strings), not individual characters
    let lines = [];
    try {
      if (cleanText && cleanText.length > 0) {
        lines = pdf.splitTextToSize(cleanText, maxWidth);
        
        // Safety check: ensure we got an array of strings
        if (!Array.isArray(lines)) {
          lines = [cleanText];
        }
        
        // Additional check: if result looks wrong (too many single-char items), try alternative
        if (lines.length > cleanText.length * 0.8 && lines.every(line => line.length === 1)) {
          // Something went wrong - fallback to manual word wrapping
          console.warn('[story-viewer] splitTextToSize returned character array, using fallback');
          lines = wrapTextManually(cleanText, maxWidth, pdf);
        }
      }
    } catch (error) {
      console.error('[story-viewer] Error splitting text:', error, cleanText);
      lines = [cleanText];
    }
    
    // Add each line to PDF
    lines.forEach(line => {
      if (line && typeof line === 'string' && line.trim().length > 0) {
        try {
          pdf.text(line.trim(), x, currentY);
          currentY += lineHeight;
        } catch (error) {
          console.error('[story-viewer] Error adding text line to PDF:', error, line);
        }
      }
    });
    
    // Add small space between segments
    currentY += 1.5;
  });
  
  return currentY;
}

/**
 * Manual text wrapping fallback if splitTextToSize fails
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in mm
 * @param {object} pdf - jsPDF instance
 * @returns {Array<string>} Array of wrapped lines
 */
function wrapTextManually(text, maxWidth, pdf) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = pdf.getTextWidth(testLine);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
}

/**
 * Draw page border and header
 * @param {object} pdf - jsPDF instance
 * @param {string} storyTitle - Story title for header
 */
function drawPageBorderAndHeader(pdf, storyTitle) {
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const borderMargin = 10; // mm from edge
  
  // Draw border
  pdf.setDrawColor(100, 100, 100); // Gray border
  pdf.setLineWidth(0.5);
  pdf.rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2));
  
  // Draw header
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const headerText = `SCIQUEST HEROES - ${storyTitle}`;
  pdf.text(headerText, pageWidth / 2, borderMargin + 8, { align: 'center' });
  
  // Draw line under header
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(borderMargin + 5, borderMargin + 12, pageWidth - borderMargin - 5, borderMargin + 12);
  
  return borderMargin + 18; // Return Y position below header
}

/**
 * Formats narration text with colored dialogue
 * - Descriptive narration on one line
 * - Mr.Chloro's dialogue on separate line in green (text-green-600)
 * - Child's dialogue on separate line in purple (text-purple-600)
 * - Replaces "Child:" with the actual child's name
 * @param {string} narrationText - The raw narration text
 * @param {string} childName - The child's display name
 * @returns {string} Formatted HTML string with colored dialogue
 */
function formatNarrationWithDialogue(narrationText, childName) {
  if (!narrationText) return '';
  
  // Replace "Child:" with the actual child's name
  let text = narrationText.replace(/Child:/g, `${childName}:`);
  
  // Convert "Mr. Chloro" to "Mr.Chloro" (no space) for display
  text = text.replace(/Mr\. Chloro/g, 'Mr.Chloro');
  
  // Extract descriptive narration (everything before the first dialogue)
  // Pattern to find first dialogue: "Mr.Chloro:" or "Mr. Chloro:" (backward compatibility) or speaker name followed by colon and quote
  // Look for pattern like "Speaker: \"..." or "Speaker: '...'"
  const firstDialogueMatch = text.match(/(Mr\.Chloro|Mr\. Chloro|Hero|Child|[A-Za-z\s]+?):\s*["']/);
  let descriptiveNarration = '';
  let dialoguePart = text;
  
  if (firstDialogueMatch) {
    const dialogueIndex = text.indexOf(firstDialogueMatch[0]);
    descriptiveNarration = text.substring(0, dialogueIndex).trim();
    dialoguePart = text.substring(dialogueIndex);
  } else {
    // No dialogue found, convert and return as-is
    return text.replace(/Mr\. Chloro/g, 'Mr.Chloro');
  }
  
  // Convert descriptive narration to use "Mr.Chloro" (no space)
  descriptiveNarration = descriptiveNarration.replace(/Mr\. Chloro/g, 'Mr.Chloro');
  
  // Split dialogue part into individual dialogue lines
  // Pattern to match: "Speaker: \"...\"" or "Speaker: '...'"
  // Updated pattern to handle apostrophes within dialogue (like "It's", "That's")
  // Match everything between quotes, including apostrophes
  // Pattern: Speaker name, colon, space, quote, content (including apostrophes), closing quote
  // Match both "Mr.Chloro" and "Mr. Chloro" for backward compatibility
  const dialoguePattern = /(Mr\.Chloro|Mr\. Chloro|[A-Za-z\s]+?):\s*(["'])((?:(?!\2).)*?)\2/g;
  const dialogues = [];
  let match;
  
  // Reset regex lastIndex to ensure we start from the beginning
  dialoguePattern.lastIndex = 0;
  
  while ((match = dialoguePattern.exec(dialoguePart)) !== null) {
    let speaker = match[1].trim();
    // Normalize speaker name to "Mr.Chloro" (no space)
    if (speaker === 'Mr. Chloro') {
      speaker = 'Mr.Chloro';
    }
    const quoteChar = match[2]; // The quote character used (" or ')
    const dialogue = match[3]; // The dialogue content (handles apostrophes correctly)
    
    // Determine color based on speaker
    let colorClass = 'text-slate-800'; // default
    if (speaker === 'Mr.Chloro' || speaker === 'Mr. Chloro') {
      colorClass = 'text-green-600';
    } else if (speaker === childName || speaker === 'Hero' || speaker === 'Child') {
      colorClass = 'text-purple-600';
    }
    
    dialogues.push({
      speaker: speaker,
      dialogue: dialogue,
      colorClass: colorClass,
      quoteChar: quoteChar
    });
  }
  
  // Build formatted HTML
  let formatted = '';
  
  // Add descriptive narration on first line
  if (descriptiveNarration) {
    formatted += `<div class="mb-2">${descriptiveNarration}</div>`;
  }
  
  // Add each dialogue on its own line
  dialogues.forEach((item) => {
    const quote = item.quoteChar || '"';
    formatted += `<div class="mt-2"><span class="font-semibold">${item.speaker}:</span> <span class="${item.colorClass} font-semibold">${quote}${item.dialogue}${quote}</span></div>`;
  });
  
  return formatted;
}

function renderProgressDots() {
  progressDotsEl.innerHTML = '';
  state.panels.forEach((_, idx) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (idx === state.currentPanelIndex ? ' active' : '');
    dot.title = `Panel ${idx + 1}: ${state.panels[idx]?.narration?.substring(0, 50)}...` || `Panel ${idx + 1}`;
    dot.addEventListener('click', () => {
      // Highlight the clicked dot and show narration
      jumpToPanel(idx);
      // Temporarily highlight the narration area
      highlightNarration();
    });
    progressDotsEl.appendChild(dot);
  });
}

function highlightNarration() {
  // Add a brief highlight animation to the narration element
  if (panelNarrationEl) {
    panelNarrationEl.classList.add('animate-pulse');
    setTimeout(() => {
      panelNarrationEl.classList.remove('animate-pulse');
    }, 600);
  }
}

function updateGlossary(terms = []) {
  glossaryList.innerHTML = '';
  if (!terms.length) {
    glossaryList.innerHTML = '<p class="text-slate-500 text-sm">No glossary terms on this panel.</p>';
    return;
  }
  
  terms.forEach((term) => {
    const termContainer = document.createElement('div');
    termContainer.className = 'w-full';
    
    const pill = document.createElement('button');
    pill.className = 'glossary-pill w-full text-left px-4 py-3 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-200 transition cursor-pointer';
    pill.textContent = term;
    
    const definition = GLOSSARY_DEFINITIONS[term.toLowerCase()] || GLOSSARY_DEFINITIONS[term] || `A word from this story.`;
    const definitionEl = document.createElement('div');
    definitionEl.className = 'hidden mt-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-slate-700 text-sm leading-relaxed';
    definitionEl.innerHTML = `<span class="font-semibold text-purple-700">${term}:</span> ${definition}`;
    
    // Toggle definition on click
    pill.addEventListener('click', () => {
      const isExpanded = !definitionEl.classList.contains('hidden');
      // Close all other definitions
      glossaryList.querySelectorAll('[data-definition]').forEach(el => {
        if (el !== definitionEl) {
          el.classList.add('hidden');
          el.previousElementSibling.classList.remove('bg-indigo-300');
        }
      });
      // Toggle current definition
      definitionEl.classList.toggle('hidden', isExpanded);
      pill.classList.toggle('bg-indigo-300', !isExpanded);
    });
    
    definitionEl.setAttribute('data-definition', 'true');
    termContainer.appendChild(pill);
    termContainer.appendChild(definitionEl);
    glossaryList.appendChild(termContainer);
  });
}

async function updatePanelUI() {
  const panel = state.panels[state.currentPanelIndex];
  if (!panel) {
    console.warn('[story-viewer] No panel found at index', state.currentPanelIndex);
    return;
  }

  // Normalize image URL - convert relative paths to absolute if needed
  let imageUrl = panel.imageUrl || '/images/placeholder-story.png';
  if (imageUrl.startsWith('../')) {
    // Convert relative path to absolute from root
    imageUrl = imageUrl.replace('../', '/');
  } else if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
    // If it's a relative path without .., make it absolute
    imageUrl = '/' + imageUrl;
  }
  
  panelImageEl.src = imageUrl;
  
  // Adjust image positioning for specific panels that need refocusing
  // Panel 3 (index 2) needs to show faces better - use object-position to focus on bottom/center
  if (state.currentPanelIndex === 2 && panel.panelId === 'panel-03') {
    panelImageEl.style.objectPosition = 'center bottom';
  } else {
    panelImageEl.style.objectPosition = 'center center';
  }
  panelTagEl.textContent = panel.panelId || `Panel ${state.currentPanelIndex + 1}`;
  
  // Get child name and format narration with colored dialogue
  const childName = await getCurrentUserName();
  const formattedNarration = formatNarrationWithDialogue(panel.narration, childName);
  panelNarrationEl.innerHTML = formattedNarration;
  
  // Match narration height to panel image height (4:3 aspect ratio)
  const matchHeights = () => {
    if (panelImageContainer && panelNarrationEl) {
      const panelHeight = panelImageContainer.offsetHeight;
      panelNarrationEl.style.height = `${panelHeight}px`;
    }
  };
  
  // Match heights after image loads and on resize
  if (panelImageEl.complete) {
    setTimeout(matchHeights, 0);
  } else {
    panelImageEl.addEventListener('load', () => {
      setTimeout(matchHeights, 0);
    }, { once: true });
  }
  
  // Store resize handler to avoid duplicates
  if (!window._storyViewerResizeHandler) {
    window._storyViewerResizeHandler = matchHeights;
    window.addEventListener('resize', matchHeights);
  }
  
  panelPositionLabelEl.textContent = `Panel ${state.currentPanelIndex + 1} of ${state.panelCount}`;
  helperTitleEl.textContent = panel.ctaLabel || 'Ask a question';
  helperTextEl.textContent = 'Use the chat companion to dig deeper into this scene.';
  progressSummaryEl.textContent = `Panel ${state.currentPanelIndex + 1}/${state.panelCount}`;
  chatCtaBtn.textContent = panel.ctaLabel || 'Ask Mr.Chloro about Photosynthesis';

  chatCtaBtn.onclick = () => {
    const chatUrl = new URL('../chat/index.html', window.location.origin);
    if (panel.chatTopicId) chatUrl.searchParams.set('topicId', panel.chatTopicId);
    chatUrl.searchParams.set('storyRef', storyId);
    chatUrl.searchParams.set('panelId', panel.panelId ?? `panel-${state.currentPanelIndex + 1}`);
    window.location.href = `${chatUrl.pathname}${chatUrl.search}`;
  };

  prevBtn.disabled = state.currentPanelIndex === 0;
  nextBtn.disabled = state.currentPanelIndex === state.panelCount - 1;

  // Update Read with Voice button based on audioUrl or TTS availability
  if (readWithVoiceBtn) {
    // Reset to default state (not active)
    readWithVoiceBtn.classList.remove('bg-gradient-to-r', 'from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
    readWithVoiceBtn.classList.add('bg-gradient-to-r', 'from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    
    if (panel.narration && (panel.audioUrl || isSpeechSynthesisSupported())) {
      readWithVoiceBtn.disabled = false;
      readWithVoiceBtn.title = panel.audioUrl 
        ? 'Click to play audio narration' 
        : 'Click to hear the narration read aloud';
      readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
    } else if (!isSpeechSynthesisSupported() && !panel.audioUrl) {
      readWithVoiceBtn.disabled = true;
      readWithVoiceBtn.title = 'Text-to-speech not supported in your browser';
      readWithVoiceBtn.innerHTML = '🔊 Read with Voice (Not Supported)';
    } else {
      readWithVoiceBtn.disabled = true;
      readWithVoiceBtn.title = 'No narration available for this panel';
      readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
    }
  }
  
  // Enable Download PDF button when story is loaded
  if (downloadPdfBtn && state.story && state.panels.length > 0) {
    downloadPdfBtn.disabled = false;
  }

  renderProgressDots();
  updateGlossary(panel.glossaryTerms || []);
}

async function persistProgress(completed = false) {
  await saveStoryProgress({
    storyId,
    lastPanelIndex: state.currentPanelIndex,
    completed
  });
}

async function jumpToPanel(targetIndex) {
  if (targetIndex < 0 || targetIndex >= state.panelCount) return;
  
  // Stop speech and audio if playing when navigating to different panel
  stopSpeech();
  stopAudio();
  
  state.currentPanelIndex = targetIndex;
  await updatePanelUI();
  
  // Update URL to show current panel
  if (storyId) {
    const cleanUrl = `/stories/${storyId}/read?panel=${targetIndex}`;
    window.history.replaceState({ storyId, panel: targetIndex }, '', cleanUrl);
  }
  
  await persistProgress(targetIndex === state.panelCount - 1);
  await logAnalyticsEvent('panel_viewed', {
    storyId,
    panelId: state.panels[targetIndex]?.panelId,
    panelIndex: targetIndex
  });
}

async function goToNextPanel() {
  if (state.currentPanelIndex >= state.panelCount - 1) {
    await persistProgress(true);
    await logAnalyticsEvent('story_completed', { storyId });
    
    // Evaluate badges on story completion
    const MOCK_CHILD_ID = 'child-akhil'; // Future: from auth
    try {
      const newlyAwarded = await evaluateBadgeRules(MOCK_CHILD_ID, 'story_completed', {
        storyId,
        topicTag: state.story?.topicTag || null,
        sourceFeature: 'story_viewer'
      });
      
      // Show celebration for each newly awarded badge (queued)
      for (const award of newlyAwarded) {
        const badge = await getBadgeById(award.badgeId);
        if (badge) {
          showBadgeCelebration(award.badgeId, badge.name, badge.icon);
        }
      }
    } catch (error) {
      console.warn('[story-viewer] Badge evaluation failed', error);
    }
    
    nextBtn.disabled = true;
    return;
  }
  await jumpToPanel(state.currentPanelIndex + 1);
}

async function goToPreviousPanel() {
  if (state.currentPanelIndex === 0) return;
  await jumpToPanel(state.currentPanelIndex - 1);
}

async function loadStory() {
  if (!storyId) throw new Error('storyId missing');
  const [story, panels] = await Promise.all([getStoryById(storyId), getPanelsForStory(storyId)]);
  if (!story) throw new Error('story not found');
  state.story = story;
  state.panels = panels.length ? panels : story.panels || [];
  state.panelCount = state.panels.length;

  console.log('[story-viewer] Story loaded:', {
    storyId,
    title: story.title,
    panelCount: state.panelCount,
    firstPanel: state.panels[0]
  });
  console.log('[story-viewer] First panel audioUrl:', state.panels[0]?.audioUrl);
  console.log('[story-viewer] All panels:', state.panels.map(p => ({ panelId: p.panelId, hasAudioUrl: !!p.audioUrl, audioUrl: p.audioUrl })));

  if (!state.panelCount) {
    console.error('[story-viewer] Story has no panels', { storyId, story });
    throw new Error('story has no panels');
  }

  storyTitleEl.textContent = story.title;

  const savedProgress = await getStoryProgressSummary(storyId);
  const resumeIndex =
    Number.isFinite(panelParam) && panelParam >= 0 ? panelParam : savedProgress?.lastPanelIndex || 0;
  state.currentPanelIndex = Math.min(resumeIndex, state.panelCount - 1);
}

/**
 * Stop audio playback and reset state
 */
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  isAudioPlaying = false;
  if (readWithVoiceBtn) {
    readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
    // Reset to default color (only if not speaking)
    if (!isSpeaking) {
      readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    }
  }
}

/**
 * Play audio from Supabase storage
 * @param {string} audioUrl - Public URL of audio file
 */
async function playAudioFromUrl(audioUrl) {
  return new Promise((resolve, reject) => {
    // Stop any existing audio or speech
    stopAudio();
    stopSpeech();
    
    console.log('[story-viewer] Creating audio element with URL:', audioUrl);
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    
    // Set preload to ensure audio loads
    audio.preload = 'auto';
    
    // Set crossOrigin to allow CORS (important for Supabase storage)
    audio.crossOrigin = 'anonymous';
    
    let playAttempted = false;
    
    const attemptPlay = () => {
      if (playAttempted) return;
      playAttempted = true;
      
      console.log('[story-viewer] Attempting to play audio');
      console.log('[story-viewer] Audio element state:', {
        src: audio.src,
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused
      });
      
      audio.play().then(() => {
        console.log('[story-viewer] Audio play() succeeded');
      }).catch(err => {
        console.error('[story-viewer] Error calling audio.play():', err);
        console.error('[story-viewer] Error name:', err.name);
        console.error('[story-viewer] Error message:', err.message);
        isAudioPlaying = false;
        currentAudio = null;
        if (readWithVoiceBtn) {
          readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
          // Reset to default color on error
          readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
          readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
        }
        reject(err);
      });
    };
    
    // Try to play when enough data is loaded
    audio.addEventListener('canplay', () => {
      console.log('[story-viewer] Audio can play event fired');
      if (!playAttempted) {
        attemptPlay();
      }
    });
    
    // Also try when fully loaded and can play through (more reliable)
    audio.addEventListener('canplaythrough', () => {
      console.log('[story-viewer] Audio can play through - attempting playback');
      if (!playAttempted) {
        attemptPlay();
      }
    });
    
    // Fallback: try when data is loaded
    audio.addEventListener('loadeddata', () => {
      console.log('[story-viewer] Audio loaded, starting playback');
      console.log('[story-viewer] Audio element ready:', {
        src: audio.src,
        duration: audio.duration,
        readyState: audio.readyState
      });
      // Wait a bit to ensure audio is ready, but only if not already attempted
      if (!playAttempted) {
        setTimeout(attemptPlay, 200);
      }
    });
    
    // Add more event listeners for debugging
    audio.addEventListener('loadstart', () => {
      console.log('[story-viewer] Audio load started');
    });
    
    audio.addEventListener('stalled', () => {
      console.warn('[story-viewer] Audio loading stalled');
    });
    
    audio.addEventListener('suspend', () => {
      console.warn('[story-viewer] Audio loading suspended');
    });
    
    audio.addEventListener('stalled', () => {
      console.warn('[story-viewer] Audio loading stalled');
    });
    
    audio.addEventListener('suspend', () => {
      console.warn('[story-viewer] Audio loading suspended');
    });
    
    audio.addEventListener('play', () => {
      isAudioPlaying = true;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '⏸️ Pause';
        readWithVoiceBtn.disabled = false;
        // Change to active/playing color (green gradient)
        readWithVoiceBtn.classList.remove('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
        readWithVoiceBtn.classList.add('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      }
      highlightNarration();
    });
    
    audio.addEventListener('pause', () => {
      isAudioPlaying = false;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '▶️ Resume';
        // Keep active color when paused (still in active state)
      }
    });
    
    audio.addEventListener('ended', () => {
      console.log('[story-viewer] Audio playback completed');
      isAudioPlaying = false;
      currentAudio = null;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
        // Reset to default color
        readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
        readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
      }
      
      // Play fanfare if this was the last panel
      if (state.currentPanelIndex === state.panelCount - 1) {
        setTimeout(() => {
          playCompletionFanfare();
        }, 200);
      }
      
      resolve();
    });
    
    audio.addEventListener('error', (e) => {
      const error = audio.error;
      let errorMessage = 'Failed to play audio';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback aborted by user';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio - check CORS settings';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error - file may be corrupted or unsupported format';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported or source not found';
            break;
          default:
            errorMessage = `Audio error code: ${error.code}`;
        }
        console.error('[story-viewer] Audio playback error:', {
          code: error.code,
          message: errorMessage,
          audioSrc: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState,
          errorObject: error
        });
      } else {
        console.error('[story-viewer] Audio playback error (no error code):', e);
        console.error('[story-viewer] Audio element state:', {
          src: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState,
          paused: audio.paused,
          ended: audio.ended,
          error: audio.error
        });
      }
      
      // Don't reject immediately - try to get more info
      // The error might be recoverable or we need to check CORS
      console.error('[story-viewer] Full audio element:', audio);
      console.error('[story-viewer] Testing if URL is accessible...');
      
      // Test if the URL is accessible via fetch
      fetch(audioUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          console.log('[story-viewer] URL is accessible (HEAD request succeeded)');
        })
        .catch(fetchErr => {
          console.error('[story-viewer] URL accessibility test failed:', fetchErr);
        });
      
      isAudioPlaying = false;
      currentAudio = null;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
        // Reset to default color on error
        readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
        readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
      }
      reject(new Error(errorMessage));
    });
    
    // Also try to play immediately if audio is already loaded (for cached audio)
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
      console.log('[story-viewer] Audio already has data, attempting immediate play');
      setTimeout(attemptPlay, 50);
    }
    
    // Force load the audio
    audio.load();
  });
}

/**
 * Stop speech playback and reset state
 */
function stopSpeech() {
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  currentUtterance = null;
  utteranceQueue = [];
  currentUtteranceIndex = 0;
  isSpeaking = false;
  
  // Also stop audio if playing
  stopAudio();
  
  if (readWithVoiceBtn) {
    readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
    // Reset to default color
    readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
    readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
  }
}

/**
 * Handle Read with Voice button click
 * Uses Supabase audio files if available, otherwise falls back to TTS
 */
async function handleReadWithVoice() {
  const panel = state.panels[state.currentPanelIndex];
  if (!panel || !panel.narration) {
    console.warn('[story-viewer] No narration available for current panel');
    return;
  }
  
  console.log('[story-viewer] handleReadWithVoice called for panel:', state.currentPanelIndex);
  console.log('[story-viewer] Panel audioUrl:', panel.audioUrl);
  console.log('[story-viewer] Full panel object:', JSON.stringify(panel, null, 2));

  // If audio is playing, handle pause/resume
  if (isAudioPlaying && currentAudio) {
    if (currentAudio.paused) {
      currentAudio.play();
      isAudioPlaying = true;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '⏸️ Pause';
        // Ensure active color when playing
        readWithVoiceBtn.classList.remove('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
        readWithVoiceBtn.classList.add('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      }
    } else {
      currentAudio.pause();
      isAudioPlaying = false;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '▶️ Resume';
        // Keep active color when paused
      }
    }
    return;
  }

  // If TTS is speaking, handle pause/resume
  if (isSpeaking && speechSynthesis.speaking) {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      isSpeaking = true;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '⏸️ Pause';
        // Ensure active color when speaking
        readWithVoiceBtn.classList.remove('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
        readWithVoiceBtn.classList.add('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      }
    } else {
      speechSynthesis.pause();
      isSpeaking = false;
      if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '▶️ Resume';
        // Keep active color when paused
      }
    }
    return;
  }

  // Stop any existing playback
  stopAudio();
  stopSpeech();

  // Priority 1: Check for audioUrl and use Supabase audio if available
  if (panel.audioUrl) {
    try {
      console.log('[story-viewer] Found audioUrl:', panel.audioUrl);
      console.log('[story-viewer] Panel data:', panel);
      
      // Get Supabase storage URL
      const audioUrl = await getSupabaseAudioUrl(panel.audioUrl);
      
      if (audioUrl) {
        console.log('[story-viewer] Playing audio from Supabase:', audioUrl);
        try {
          await playAudioFromUrl(audioUrl);
          return; // Successfully playing audio, exit
        } catch (playError) {
          console.error('[story-viewer] Error playing audio file:', playError);
          // Fall through to TTS
        }
      } else {
        console.warn('[story-viewer] Could not get Supabase audio URL, falling back to TTS');
        console.warn('[story-viewer] This might be because:');
        console.warn('[story-viewer] 1. Supabase is not configured');
        console.warn('[story-viewer] 2. Audio bucket does not exist or is not public');
        console.warn('[story-viewer] 3. Audio file does not exist in storage');
        // Fall through to TTS
      }
    } catch (error) {
      console.error('[story-viewer] Error getting/playing audio from Supabase:', error);
      console.error('[story-viewer] Error details:', error.message, error.stack);
      // Fall through to TTS
    }
  } else {
    console.log('[story-viewer] No audioUrl found for panel, using TTS');
  }

  // Priority 2: Fall back to TTS if no audioUrl or audio failed
  console.log('[story-viewer] Using TTS for narration');
  
  // Check browser support
  if (!isSpeechSynthesisSupported()) {
    alert('Your browser does not support text-to-speech. Please use a modern browser like Chrome, Firefox, or Safari.');
    return;
  }

  // Ensure voices are loaded
  if (!voicesLoaded) {
    loadVoices();
  }

  // Get clean narration text
  const text = getCleanNarrationText(panel);
  if (!text) {
    console.warn('[story-viewer] No text to speak');
    return;
  }

  // Get the best voice
  let voice = bestVoice;
  if (!voice) {
    voice = getBestNaturalVoice();
    if (voice) {
      bestVoice = voice; // Cache it
    } else {
      console.warn('[TTS] No natural voice found, using default');
    }
  }

  if (voice) {
    console.log('[TTS] Using voice:', voice.name);
  }

  // Create expressive utterances with pitch/rate variations based on punctuation
  utteranceQueue = createExpressiveUtterances(text, voice, 0.9, 1.0);
  currentUtteranceIndex = 0;

  if (utteranceQueue.length === 0) {
    console.warn('[story-viewer] No utterances created');
    return;
  }

  // Start speaking the first utterance
  speakNextUtterance();
}

/**
 * Play a celebratory fanfare sound when story narration completes
 * Uses Web Audio API to generate a triumphant fanfare (ascending notes: C-E-G-C)
 */
function playCompletionFanfare() {
  // Check for Web Audio API support
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.warn('[story-viewer] Web Audio API not supported, skipping fanfare');
    return;
  }

  try {
    const audioContext = new AudioContext();
    
    // Fanfare melody: ascending notes (C4, E4, G4, C5) - classic triumphant pattern
    const notes = [
      { frequency: 261.63, time: 0.0, duration: 0.3 },    // C4
      { frequency: 329.63, time: 0.2, duration: 0.3 },    // E4
      { frequency: 392.00, time: 0.4, duration: 0.3 },  // G4
      { frequency: 523.25, time: 0.6, duration: 0.5 }    // C5 (held longer)
    ];

    // Play each note with slight overlap for fanfare effect
    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Use different oscillator types for richer sound
      oscillator.type = index === notes.length - 1 ? 'sine' : 'triangle'; // Last note is sine, others triangle
      oscillator.frequency.setValueAtTime(note.frequency, audioContext.currentTime);
      
      // Create envelope: quick attack, sustain, then release
      const startTime = audioContext.currentTime + note.time;
      const endTime = startTime + note.duration;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05); // Quick attack
      gainNode.gain.setValueAtTime(0.4, endTime - 0.1); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, endTime); // Release
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });

    // Close audio context after fanfare completes (cleanup)
    setTimeout(() => {
      audioContext.close().catch(err => {
        console.warn('[story-viewer] Error closing audio context:', err);
      });
    }, 1500); // Close after 1.5 seconds (fanfare is ~1.1 seconds)
    
    console.log('[story-viewer] Playing completion fanfare');
  } catch (error) {
    console.warn('[story-viewer] Failed to play fanfare:', error);
    // Fail silently - fanfare is optional
  }
}

/**
 * Speak the next utterance in the queue
 * Handles sequential playback with expressive variations
 */
function speakNextUtterance() {
  if (currentUtteranceIndex >= utteranceQueue.length) {
    // All utterances complete
    isSpeaking = false;
    currentUtterance = null;
    utteranceQueue = [];
    currentUtteranceIndex = 0;
    if (readWithVoiceBtn) {
      readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
      // Reset to default color
      readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    }
    
    // Play fanfare if this was the last panel
    if (state.currentPanelIndex === state.panelCount - 1) {
      // Play fanfare after a short delay for natural transition
      setTimeout(() => {
        playCompletionFanfare();
      }, 200);
    }
    
    return;
  }

  currentUtterance = utteranceQueue[currentUtteranceIndex];
  
  // Event handlers for current utterance
  currentUtterance.onstart = () => {
    if (currentUtteranceIndex === 0) {
      // First utterance starting - update UI
      isSpeaking = true;
    if (readWithVoiceBtn) {
        readWithVoiceBtn.innerHTML = '⏸️ Pause';
        readWithVoiceBtn.disabled = false;
        // Change to active/playing color (green gradient)
        readWithVoiceBtn.classList.remove('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
        readWithVoiceBtn.classList.add('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      }
      // Highlight narration while speaking
      highlightNarration();
    }
  };

  currentUtterance.onend = () => {
    // Move to next utterance
    currentUtteranceIndex++;
    
    // Check if next utterance is a pause segment (from hyphen)
    const nextUtterance = utteranceQueue[currentUtteranceIndex];
    const isPauseSegment = nextUtterance && nextUtterance._isPause === true;
    
    // Longer delay for pause segments (hyphens), shorter for normal transitions
    const delay = isPauseSegment ? 400 : 50; // 400ms pause for hyphens, 50ms for normal
    
    setTimeout(() => {
      if (isSpeaking && !speechSynthesis.paused) {
        speakNextUtterance();
      }
    }, delay);
  };

  currentUtterance.onerror = (event) => {
    console.error('[story-viewer] Speech synthesis error:', event);
    const queueLength = utteranceQueue.length;
    const wasLastUtterance = currentUtteranceIndex >= queueLength - 1;
    
    // Continue with next utterance even if one fails
    currentUtteranceIndex++;
    if (currentUtteranceIndex < queueLength) {
      setTimeout(() => {
        if (isSpeaking && !speechSynthesis.paused) {
          speakNextUtterance();
        }
      }, 50);
    } else {
      // All done or error on last utterance
      isSpeaking = false;
      currentUtterance = null;
      utteranceQueue = [];
      currentUtteranceIndex = 0;
    if (readWithVoiceBtn) {
      readWithVoiceBtn.innerHTML = '🔊 Read with Voice';
      readWithVoiceBtn.disabled = false;
      // Reset to default color
      readWithVoiceBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
      readWithVoiceBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    }
      
      // Play fanfare if this was the last panel (even on error, if we got through most of it)
      if (state.currentPanelIndex === state.panelCount - 1 && wasLastUtterance) {
        setTimeout(() => {
          playCompletionFanfare();
        }, 200);
      }
      
      // Only show error if this was the only utterance or a critical error
      if (wasLastUtterance && queueLength === 1) {
        alert('Sorry, the voice narration encountered an error. Please try again.');
      }
    }
  };

  // Start speaking current utterance
  speechSynthesis.speak(currentUtterance);
}

/**
 * Add curious questions to PDF
 * @param {object} pdf - jsPDF instance
 * @param {Array} panels - All story panels
 */
function addCuriousQuestionsToPDF(pdf, panels) {
  pdf.addPage();
  const startY = drawPageBorderAndHeader(pdf, state.story.title);
  
  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Curious Questions to Explore', 105, startY + 10, { align: 'center' });
  
  let y = startY + 20;
  const margin = 20;
  const maxWidth = 170;
  const lineHeight = 7;
  const questionFontSize = 11;
  const answerFontSize = 10;
  
  // Collect questions from panels (CTA labels)
  const questions = panels
    .map(panel => panel.ctaLabel)
    .filter(q => q && q.trim().length > 0);
  
  // Add some additional curious questions
  const additionalQuestions = [
    'Why do some plants have bigger leaves than others?',
    'What happens to plants at night when there\'s no sunlight?',
    'Can plants grow without soil?',
    'How do plants help keep our planet healthy?',
    'What would happen if all plants disappeared?'
  ];
  
  const allQuestions = [...questions, ...additionalQuestions];
  
  pdf.setFontSize(questionFontSize);
  pdf.setFont('helvetica', 'bold');
  
  allQuestions.forEach((question, index) => {
    // Check if we need a new page
    if (y > 280) {
      pdf.addPage();
      y = drawPageBorderAndHeader(pdf, state.story.title);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Curious Questions to Explore (continued)', 105, y + 10, { align: 'center' });
      y += 20;
    }
    
    // Question number and text
    pdf.setTextColor(22, 163, 74); // Green for questions
    pdf.text(`${index + 1}. ${question}`, margin, y);
    y += lineHeight + 2;
    
    // Add space for answers (kids can write their thoughts)
    pdf.setFontSize(answerFontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Your thoughts: ________________________________', margin + 5, y);
    y += lineHeight + 5;
  });
}

/**
 * Add glossary terms to PDF
 * @param {object} pdf - jsPDF instance
 * @param {Array} allGlossaryTerms - Array of unique glossary terms from all panels
 */
function addGlossaryToPDF(pdf, allGlossaryTerms) {
  if (!allGlossaryTerms || allGlossaryTerms.length === 0) {
    return; // No glossary to add
  }
  
  pdf.addPage();
  const startY = drawPageBorderAndHeader(pdf, state.story.title);
  
  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Glossary', 105, startY + 10, { align: 'center' });
  
  // Terms
  let y = startY + 20;
  const margin = 20;
  const maxWidth = 170;
  const lineHeight = 6;
  const termFontSize = 11;
  const defFontSize = 10;
  
  allGlossaryTerms.forEach(term => {
    // Check if we need a new page
    if (y > 280) {
      pdf.addPage();
      y = drawPageBorderAndHeader(pdf, state.story.title);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Glossary (continued)', 105, y + 10, { align: 'center' });
      y += 20;
    }
    
    const definition = GLOSSARY_DEFINITIONS[term.toLowerCase()] || 
                      GLOSSARY_DEFINITIONS[term] || 
                      'Definition not available';
    
    // Term in bold
    pdf.setFontSize(termFontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(term + ':', margin, y);
    
    // Definition
    y += 5;
    pdf.setFontSize(defFontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);
    const defLines = pdf.splitTextToSize(definition, maxWidth);
    defLines.forEach(line => {
      pdf.text(line, margin + 5, y);
      y += lineHeight;
    });
    
    y += 4; // Space between terms
  });
}

/**
 * Generate PDF with all comic panels in storybook format
 * Features: Borders, header, 2 panels per page, consistent styling, curious questions, glossary, coloring book
 */
async function generateStoryPDF() {
  if (!state.story || !state.panels || state.panels.length === 0) {
    alert('Story not loaded yet. Please wait for the story to finish loading.');
    return;
  }
  
  // Show loading state
  if (downloadPdfBtn) {
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.textContent = '⏳ Generating PDF...';
    // Change to generating color (amber/yellow gradient)
    downloadPdfBtn.classList.remove('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    downloadPdfBtn.classList.add('from-amber-500', 'to-yellow-500', 'hover:from-amber-600', 'hover:to-yellow-600');
  }
  
  try {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      throw new Error('jsPDF library not loaded. Please refresh the page.');
    }
    
    const { jsPDF } = window.jspdf || window;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const borderMargin = 10;
    const contentMargin = 20; // Margin for content inside border
    const headerHeight = 18;
    
    // Storybook panel dimensions (2 panels per page, side by side)
    const availableWidth = pageWidth - (contentMargin * 2) - (borderMargin * 2);
    const gapX = 8; // Gap between two panels
    const panelWidth = (availableWidth - gapX) / 2; // Each panel width
    const panelHeight = 90; // mm - storybook size (maintains good aspect ratio)
    const narrationHeight = 35; // Space for narration below each panel
    const totalRowHeight = panelHeight + narrationHeight + 5; // Total height per row
    
    // Get child name for narration
    const childName = await getCurrentUserName();
    
    // Load all panel images first
    console.log('[story-viewer] Loading panel images...');
    const imagePromises = state.panels.map(panel => {
      const imageUrl = panel.imageUrl || '/images/placeholder-story.png';
      return loadImageAsBase64(imageUrl).then(base64 => ({
        panel,
        base64
      }));
    });
    
    const panelImages = await Promise.all(imagePromises);
    
    // Process panels - 2 per page
    for (let i = 0; i < state.panels.length; i += 2) {
      // Add new page with border and header
      if (i > 0) {
        pdf.addPage();
      }
      
      const startY = drawPageBorderAndHeader(pdf, state.story.title);
      let currentY = startY;
      
      // Process up to 2 panels on this page (side by side)
      const panelFinalYs = [];
      
      for (let j = 0; j < 2 && (i + j) < state.panels.length; j++) {
        const panel = state.panels[i + j];
        const panelImage = panelImages[i + j];
        
        // Calculate panel position (left or right)
        const x = borderMargin + contentMargin + (j * (panelWidth + gapX));
        const imageY = currentY;
        
        // Add panel image with proper sizing
        if (panelImage.base64) {
          try {
            // Use fixed panel dimensions for consistent layout
            // Images will be scaled to fit while maintaining aspect ratio
            pdf.addImage(panelImage.base64, 'PNG', x, imageY, panelWidth, panelHeight, undefined, 'FAST');
          } catch (error) {
            console.error('[story-viewer] Error adding image to PDF:', error);
            // Add placeholder
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(150, 150, 150);
            pdf.text('Image not available', x + panelWidth / 2, imageY + panelHeight / 2, { align: 'center' });
          }
        } else {
          // Add placeholder if image failed to load
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text('Image not available', x + panelWidth / 2, imageY + panelHeight / 2, { align: 'center' });
        }
        
        // Add narration text below image with spacing
        const narrationY = imageY + panelHeight + 8; // Increased spacing from 3mm to 8mm
        const narrationWidth = panelWidth;
        const coloredSegments = parseColoredNarration(panel.narration, childName);
        const finalY = addColoredNarrationToPDF(pdf, coloredSegments, x, narrationY, narrationWidth);
        
        panelFinalYs.push(finalY);
      }
      
      // Update Y position to the maximum of both panels' final Y positions
      if (panelFinalYs.length > 0) {
        currentY = Math.max(...panelFinalYs, currentY + panelHeight + narrationHeight);
      }
    }
    
    // Add curious questions section
    console.log('[story-viewer] Adding curious questions...');
    addCuriousQuestionsToPDF(pdf, state.panels);
    
    // Collect all glossary terms from all panels
    const allGlossaryTerms = new Set();
    state.panels.forEach(panel => {
      if (panel.glossaryTerms && Array.isArray(panel.glossaryTerms)) {
        panel.glossaryTerms.forEach(term => allGlossaryTerms.add(term));
      }
    });
    
    // Add glossary if terms available
    if (allGlossaryTerms.size > 0) {
      console.log('[story-viewer] Adding glossary...');
      addGlossaryToPDF(pdf, Array.from(allGlossaryTerms));
    }
    
    // Add coloring book page
    console.log('[story-viewer] Adding coloring book page...');
    pdf.addPage();
    const coloringStartY = drawPageBorderAndHeader(pdf, state.story.title);
    
    // Title for coloring book
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Color This Page!', pageWidth / 2, coloringStartY + 10, { align: 'center' });
    
    // Load coloring book image
    const coloringBookUrl = '/images/ColoringBookPhotosynthesis.png';
    const coloringBookBase64 = await loadImageAsBase64(coloringBookUrl);
    
    if (coloringBookBase64) {
      try {
        // Add image centered, fit to page with margins
        const imgMargin = borderMargin + contentMargin;
        const imgWidth = pageWidth - (imgMargin * 2);
        const imgHeight = (imgWidth * 0.75); // Maintain aspect ratio
        const imgY = coloringStartY + 20;
        pdf.addImage(coloringBookBase64, 'PNG', imgMargin, imgY, imgWidth, imgHeight, undefined, 'FAST');
      } catch (error) {
        console.error('[story-viewer] Error adding coloring book image:', error);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text('Coloring book image not available', pageWidth / 2, coloringStartY + 50, { align: 'center' });
      }
    } else {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Coloring book image not available', pageWidth / 2, coloringStartY + 50, { align: 'center' });
    }
    
    // Save PDF
    const filename = `${state.story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-storybook.pdf`;
    pdf.save(filename);
    
    console.log('[story-viewer] PDF generated successfully');
    
  } catch (error) {
    console.error('[story-viewer] Error generating PDF:', error);
    alert(`Failed to generate PDF: ${error.message}. Please try again.`);
  } finally {
    // Re-enable button
    if (downloadPdfBtn) {
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.textContent = '📥 Download PDF';
      // Reset to default color
      downloadPdfBtn.classList.remove('from-amber-500', 'to-yellow-500', 'hover:from-amber-600', 'hover:to-yellow-600');
      downloadPdfBtn.classList.add('from-purple-500', 'to-pink-500', 'hover:from-purple-600', 'hover:to-pink-600');
    }
  }
}

function wireControls() {
  nextBtn.addEventListener('click', goToNextPanel);
  prevBtn.addEventListener('click', goToPreviousPanel);
  glossaryBtn.addEventListener('click', () => {
    if (glossaryDialog) glossaryDialog.showModal();
  });
  glossaryCloseBtn.addEventListener('click', () => glossaryDialog?.close());
  
  // Wire up Read with Voice button
  if (readWithVoiceBtn) {
    readWithVoiceBtn.addEventListener('click', handleReadWithVoice);
  }
  
  // Wire up Download PDF button
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', generateStoryPDF);
  }
  
  // Wire up action buttons
  const takeQuizBtn = document.getElementById('takeQuizBtn');
  console.log('[story-viewer] Take Quiz button found:', !!takeQuizBtn);
  if (takeQuizBtn) {
    takeQuizBtn.addEventListener('click', async () => {
      console.log('[story-viewer] Take Quiz button clicked!');
      console.log('[story-viewer] storyId:', storyId);
      console.log('[story-viewer] state.story:', state.story);
      
      if (!storyId || !state.story) {
        console.warn('[story-viewer] Cannot navigate to quiz: missing storyId or story', {
          storyId,
          hasStory: !!state.story
        });
        alert('Story not loaded yet. Please wait for the story to finish loading.');
        return;
      }

      try {
        console.log('[story-viewer] Getting quiz URL for story:', state.story);
        // Get the appropriate quiz URL based on grade level and story topic
        const quizUrl = await getQuizUrl(state.story);
        console.log('[story-viewer] Quiz URL determined:', quizUrl);
        console.log('[story-viewer] Navigating to:', quizUrl);
        window.location.href = quizUrl;
      } catch (error) {
        console.error('[story-viewer] Failed to get quiz URL:', error);
        alert(`Error getting quiz URL: ${error.message}`);
        // Fallback to default quiz route if routing fails
        window.location.href = `/stories/${storyId}/quiz`;
      }
    });
    console.log('[story-viewer] Take Quiz button handler attached successfully');
  } else {
    console.error('[story-viewer] Take Quiz button NOT FOUND in DOM!');
  }
}

async function init() {
  try {
    // Offline banner functionality removed
    // showOfflineBannerIfNeeded();
    // window.addEventListener('online', showOfflineBannerIfNeeded);
    // window.addEventListener('offline', showOfflineBannerIfNeeded);

    // Verify storyId is available before proceeding
    if (!storyId) {
      // Try one more time to extract from pathname
      const pathMatch = window.location.pathname.match(/^\/stories\/([^/]+)\/read$/);
      if (pathMatch) {
        storyId = pathMatch[1];
      } else {
        throw new Error('Story ID not found. Please navigate from the story list.');
      }
    }

    await loadStory();
    console.log('[story-viewer] Story loaded, wiring controls...');
    console.log('[story-viewer] State after loadStory:', { story: state.story?.title, panels: state.panels.length });
    wireControls();
    await updatePanelUI();
    
    // Update URL to show /stories/{storyId}/read format (clean URL)
    if (storyId && window.location.pathname !== `/stories/${storyId}/read`) {
      const cleanUrl = `/stories/${storyId}/read?panel=${state.currentPanelIndex}`;
      window.history.replaceState({ storyId, panel: state.currentPanelIndex }, '', cleanUrl);
    }
    
    await persistProgress();
    await logAnalyticsEvent('story_viewer_opened', {
      storyId,
      panelIndex: state.currentPanelIndex
    });
  } catch (error) {
    console.error('[story-viewer] Failed to initialize viewer', error);
    if (panelNarrationEl) {
      panelNarrationEl.textContent = 'Unable to load this story. Please head back to the story list.';
    }
    if (nextBtn) nextBtn.disabled = true;
    if (prevBtn) prevBtn.disabled = true;
    
    // Show error message to user
    const errorMsg = document.createElement('div');
    errorMsg.className = 'max-w-5xl mx-auto px-6 mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800';
    errorMsg.innerHTML = `
      <p class="font-semibold mb-2">⚠️ Error loading story</p>
      <p class="text-sm">${error.message || 'Please check the story URL and try again.'}</p>
      <a href="./index.html" class="text-sm underline mt-2 inline-block">← Back to Stories</a>
    `;
    document.querySelector('main')?.insertBefore(errorMsg, document.querySelector('main')?.firstChild);
  }
}

init();

