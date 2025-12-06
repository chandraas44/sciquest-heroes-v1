/**
 * Comic Panel Generator
 * 
 * This module handles AI-powered comic panel generation using:
 * 1. GPT-4o for generating image prompts based on topic/grade
 * 2. Fal.ai Flux-pro/kontext/multi for image-to-image generation
 * 3. Supabase Storage for saving generated panels
 * 
 * API Keys are loaded from .env file (VITE_ prefix required):
 * - VITE_OPENAI_API_KEY
 * - VITE_FAL_API_KEY
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

// ============================================================================
// Configuration
// ============================================================================

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// API Keys from .env (must have VITE_ prefix to be exposed to frontend)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const FAL_API_KEY = import.meta.env.VITE_FAL_API_KEY;

// Fal.ai endpoint for Flux-pro/kontext/multi
const FAL_KONTEXT_MULTI_URL = 'https://fal.run/fal-ai/flux-pro/kontext/multi';

// Available topic guides with filename mappings
// Filenames will be matched to images in the topic_guide bucket
const TOPIC_GUIDES = {
  'mr-chloro': {
    name: 'Mr. Chloro',
    filename: 'Chloro.png', // Filename in Supabase storage
    description: 'A friendly green leaf character who teaches plant science'
  },
  'solaris': {
    name: 'Solaris',
    filename: 'Solaris.png', // Filename in Supabase storage (note: actual file is Solaris.png)
    description: 'A curious space explorer who teaches astronomy'
  }
};

// Filename to guide ID mapping (for reverse lookup when discovering files)
const FILENAME_TO_GUIDE = {
  'chloro.png': 'mr-chloro',
  'solaris.png': 'solaris'
};

// Scene templates for each topic and grade level
const SCENE_TEMPLATES = {
  'photosynthesis': {
    'K-2': {
      vocabulary: ['leaf', 'sun', 'water', 'plant', 'food', 'grow'],
      concepts: ['Plants need sunlight', 'Plants drink water', 'Leaves are important'],
      scenes: [
        { title: 'Meet the Plant Friend', description: 'A friendly leaf character greets a curious child in a sunny garden' },
        { title: 'Sunshine Power', description: 'Bright sun rays shine down on happy plants' },
        { title: 'Drinking Water', description: 'Water droplets travel up from roots to leaves' },
        { title: 'Breathing Air', description: 'Tiny doors on leaves open to let air in' },
        { title: 'Making Food', description: 'Inside the leaf, everything mixes together with magic sparkles' },
        { title: 'Sharing Oxygen', description: 'Fresh oxygen bubbles float out of the leaf into the air' },
        { title: 'Happy Plants', description: 'Plants growing strong and healthy thanks to photosynthesis' },
        { title: 'Thank You Sun', description: 'Child and plant friend wave goodbye to the sun' }
      ]
    },
    '3-4': {
      vocabulary: ['photosynthesis', 'chlorophyll', 'carbon dioxide', 'oxygen', 'glucose', 'energy'],
      concepts: ['Chlorophyll captures light', 'CO2 + H2O = sugar + O2', 'Energy transformation'],
      scenes: [
        { title: 'The Green Mystery', description: 'A science guide shows a curious student why leaves are green' },
        { title: 'Capturing Sunlight', description: 'Chlorophyll molecules absorbing light energy' },
        { title: 'The Ingredient Gathering', description: 'Water from roots and CO2 from air arriving at the leaf' },
        { title: 'The Chemical Kitchen', description: 'Inside the chloroplast, the ingredients combine' },
        { title: 'Sugar Creation', description: 'Glucose molecules forming from the reaction' },
        { title: 'Oxygen Release', description: 'O2 molecules released as a byproduct, animals breathing it' },
        { title: 'Energy Storage', description: 'Plant storing glucose for growth and energy' },
        { title: 'The Cycle Continues', description: 'Overview of the continuous photosynthesis cycle' }
      ]
    },
    '5-6': {
      vocabulary: ['chloroplast', 'stomata', 'ATP', 'glucose', 'light reactions', 'Calvin cycle'],
      concepts: ['Light-dependent reactions', 'Light-independent reactions', 'Energy currency (ATP)'],
      scenes: [
        { title: 'Inside the Chloroplast', description: 'Detailed view of chloroplast structure with thylakoids' },
        { title: 'Light Reactions Begin', description: 'Light hitting photosystems and exciting electrons' },
        { title: 'Water Splitting', description: 'Water molecules being split to release electrons and oxygen' },
        { title: 'ATP Production', description: 'ATP synthase creating ATP molecules' },
        { title: 'Calvin Cycle', description: 'CO2 being fixed into organic compounds in the stroma' },
        { title: 'The Complete Picture', description: 'Overview showing both stages working together' },
        { title: 'Energy Flow', description: 'How ATP powers cellular processes' },
        { title: 'Global Impact', description: 'Photosynthesis role in Earths ecosystem' }
      ]
    }
  },
  'solar-system': {
    'K-2': {
      vocabulary: ['sun', 'planet', 'moon', 'Earth', 'star', 'space'],
      concepts: ['Sun is a star', 'Earth orbits the Sun', 'Moon orbits Earth'],
      scenes: [
        { title: 'Our Space Neighborhood', description: 'A space explorer introduces the solar system to a child' },
        { title: 'The Mighty Sun', description: 'The Sun at the center, glowing bright and warm' },
        { title: 'Planet Parade', description: 'Planets orbiting around the Sun in their paths' },
        { title: 'Our Home Earth', description: 'Earth highlighted as our beautiful blue planet' },
        { title: 'Moon Friend', description: 'The Moon orbiting Earth, showing phases' },
        { title: 'Space Exploration', description: 'Looking out at the vast universe beyond' },
        { title: 'Starry Night', description: 'Millions of stars twinkling in the night sky' },
        { title: 'Space Dreams', description: 'Child dreaming of future space adventures' }
      ]
    },
    '3-4': {
      vocabulary: ['orbit', 'gravity', 'asteroid', 'comet', 'atmosphere', 'rotation'],
      concepts: ['Gravity keeps planets in orbit', 'Inner vs outer planets', 'Asteroid belt'],
      scenes: [
        { title: 'The Force of Gravity', description: 'Demonstrating how gravity keeps planets orbiting the Sun' },
        { title: 'Rocky Inner Planets', description: 'Mercury, Venus, Earth, and Mars shown as rocky worlds' },
        { title: 'The Asteroid Belt', description: 'Thousands of rocks floating between Mars and Jupiter' },
        { title: 'Gas Giants', description: 'Jupiter and Saturn as massive gas planets' },
        { title: 'Ice Giants', description: 'Uranus and Neptune in the outer reaches' },
        { title: 'Comets and Beyond', description: 'A comet with its tail, pointing to the Kuiper Belt' },
        { title: 'Planetary Rotation', description: 'How planets spin on their axes' },
        { title: 'Seasons on Earth', description: 'Earth tilted axis causing seasons' }
      ]
    },
    '5-6': {
      vocabulary: ['astronomical unit', 'dwarf planet', 'Kuiper Belt', 'heliocentric', 'terrestrial', 'Jovian'],
      concepts: ['Scale of the solar system', 'Formation theory', 'Planetary characteristics'],
      scenes: [
        { title: 'Solar System Formation', description: 'A nebula collapsing to form our solar system' },
        { title: 'The Suns Domain', description: 'Scale showing astronomical units and distances' },
        { title: 'Terrestrial Worlds', description: 'Comparing the four rocky planets characteristics' },
        { title: 'Jovian Giants', description: 'Detailed look at gas and ice giant composition' },
        { title: 'The Outer Reaches', description: 'Kuiper Belt, dwarf planets, and the heliosphere' },
        { title: 'Exoplanets and Beyond', description: 'Looking at planets around other stars' },
        { title: 'Space Missions', description: 'Spacecraft exploring our solar system' },
        { title: 'Future of Exploration', description: 'Humanitys plans to explore Mars and beyond' }
      ]
    }
  },
  'water-cycle': {
    'K-2': {
      vocabulary: ['rain', 'cloud', 'puddle', 'sun', 'water', 'sky'],
      concepts: ['Water goes up', 'Clouds make rain', 'Water goes round and round'],
      scenes: [
        { title: 'A Rainy Day', description: 'Child and guide watching rain fall from clouds' },
        { title: 'Puddle Magic', description: 'Sun shining on a puddle, water rising up' },
        { title: 'Making Clouds', description: 'Water vapor forming into fluffy clouds' },
        { title: 'Cloud Gets Heavy', description: 'Cloud filling up with water droplets' },
        { title: 'Rain Falls Down', description: 'Rain falling from clouds to water plants and fill streams' },
        { title: 'Round and Round', description: 'Complete cycle shown with arrows connecting all stages' },
        { title: 'Rivers Flow', description: 'Water flowing through rivers to the ocean' },
        { title: 'Ocean Waves', description: 'Vast ocean with sun beginning the cycle again' }
      ]
    },
    '3-4': {
      vocabulary: ['evaporation', 'condensation', 'precipitation', 'collection', 'vapor', 'cycle'],
      concepts: ['Heat causes evaporation', 'Cooling causes condensation', 'Gravity pulls water down'],
      scenes: [
        { title: 'The Water Adventure', description: 'Guide introduces the water cycle concept' },
        { title: 'Evaporation Station', description: 'Heat energy turning liquid water into vapor' },
        { title: 'Rising High', description: 'Water vapor rising into the atmosphere' },
        { title: 'Condensation Creation', description: 'Vapor cooling and forming water droplets on dust particles' },
        { title: 'Precipitation Types', description: 'Different forms: rain, snow, sleet, hail' },
        { title: 'Collection Complete', description: 'Water collecting in oceans, lakes, groundwater' },
        { title: 'Underground Water', description: 'Water seeping into the ground' },
        { title: 'The Endless Cycle', description: 'Continuous nature of the water cycle' }
      ]
    },
    '5-6': {
      vocabulary: ['transpiration', 'aquifer', 'watershed', 'humidity', 'dew point', 'runoff'],
      concepts: ['Transpiration from plants', 'Groundwater systems', 'Human impact on water cycle'],
      scenes: [
        { title: 'The Complex Cycle', description: 'Overview of the complete water cycle with all components' },
        { title: 'Plant Power', description: 'Transpiration from forests adding water to atmosphere' },
        { title: 'Underground Journey', description: 'Water seeping into soil and aquifers' },
        { title: 'Watershed Systems', description: 'How watersheds collect and channel water' },
        { title: 'Human Connections', description: 'How humans interact with the water cycle' },
        { title: 'Climate Connections', description: 'How the water cycle affects and is affected by climate' },
        { title: 'Water Conservation', description: 'Importance of protecting water resources' },
        { title: 'Global Water', description: 'Water cycle on a planetary scale' }
      ]
    }
  },
  'human-body': {
    'K-2': {
      vocabulary: ['heart', 'lungs', 'brain', 'bones', 'muscles', 'blood'],
      concepts: ['Heart pumps blood', 'Lungs help us breathe', 'Brain helps us think'],
      scenes: [
        { title: 'Body Adventure', description: 'Guide shrinks down to explore inside the body' },
        { title: 'The Beating Heart', description: 'Heart pumping blood through the body' },
        { title: 'Breathing Buddies', description: 'Lungs filling with air and releasing' },
        { title: 'Brain Boss', description: 'Brain sending signals throughout the body' },
        { title: 'Bones and Muscles', description: 'Skeleton and muscles working together to move' },
        { title: 'Team Body', description: 'All systems working together harmoniously' },
        { title: 'Healthy Habits', description: 'Eating well and exercising for a healthy body' },
        { title: 'Growing Strong', description: 'Body growing and developing over time' }
      ]
    },
    '3-4': {
      vocabulary: ['circulatory', 'respiratory', 'digestive', 'nervous', 'skeletal', 'organs'],
      concepts: ['Body systems work together', 'Blood carries oxygen', 'Digestion breaks down food'],
      scenes: [
        { title: 'System Overview', description: 'Introduction to body systems concept' },
        { title: 'Circulatory Highway', description: 'Blood vessels as roads carrying blood everywhere' },
        { title: 'Respiratory Exchange', description: 'Lungs exchanging oxygen and carbon dioxide' },
        { title: 'Digestive Journey', description: 'Food traveling through the digestive system' },
        { title: 'Nervous Network', description: 'Nerves sending messages throughout body' },
        { title: 'Systems Connected', description: 'How all systems depend on each other' },
        { title: 'Fighting Germs', description: 'Immune system protecting the body' },
        { title: 'Body Balance', description: 'Maintaining health through all systems' }
      ]
    },
    '5-6': {
      vocabulary: ['cardiovascular', 'alveoli', 'neurons', 'homeostasis', 'metabolism', 'immunity'],
      concepts: ['Cellular respiration', 'Immune response', 'Homeostasis maintenance'],
      scenes: [
        { title: 'Cellular Level', description: 'Zooming into the cellular level of body functions' },
        { title: 'Cardiovascular Detail', description: 'Heart chambers and blood flow mechanics' },
        { title: 'Cellular Respiration', description: 'Cells using oxygen to make energy' },
        { title: 'Immune Defense', description: 'White blood cells fighting pathogens' },
        { title: 'Homeostasis Balance', description: 'Body maintaining stable internal conditions' },
        { title: 'Integrated Systems', description: 'Complex interactions between all systems' },
        { title: 'Metabolism', description: 'How body converts food to energy' },
        { title: 'Amazing Human', description: 'Appreciation for the bodys complexity' }
      ]
    }
  },
  'electricity': {
    'K-2': {
      vocabulary: ['electricity', 'battery', 'light', 'switch', 'wire', 'power'],
      concepts: ['Electricity makes things work', 'Circuits need to be complete', 'Safety with electricity'],
      scenes: [
        { title: 'Magic Power', description: 'Lights turning on with the flip of a switch' },
        { title: 'Battery Power', description: 'A battery powering a toy' },
        { title: 'The Electric Road', description: 'Electricity flowing through wires like a road' },
        { title: 'Complete the Circle', description: 'A simple circuit that needs to be complete' },
        { title: 'Stay Safe', description: 'Safety rules about electricity' },
        { title: 'Electricity Everywhere', description: 'All the things powered by electricity in daily life' },
        { title: 'Light Bulb Moment', description: 'Understanding how light bulbs work' },
        { title: 'Power Heroes', description: 'Appreciating electricity in our lives' }
      ]
    },
    '3-4': {
      vocabulary: ['circuit', 'conductor', 'insulator', 'current', 'voltage', 'electrons'],
      concepts: ['Electrons flow in circuits', 'Conductors vs insulators', 'Series vs parallel'],
      scenes: [
        { title: 'Electron Adventure', description: 'Introduction to electrons as tiny particles' },
        { title: 'Conductor Highway', description: 'Electrons flowing easily through metal conductors' },
        { title: 'Insulator Walls', description: 'Insulators blocking electron flow' },
        { title: 'Series Circuit', description: 'Components connected in a single path' },
        { title: 'Parallel Circuit', description: 'Components with multiple paths' },
        { title: 'Building Circuits', description: 'Child building a simple circuit' },
        { title: 'Measuring Electricity', description: 'Using tools to measure current and voltage' },
        { title: 'Circuit Masters', description: 'Becoming experts at understanding circuits' }
      ]
    },
    '5-6': {
      vocabulary: ['ampere', 'ohm', 'resistance', 'static electricity', 'electromagnetic', 'generator'],
      concepts: ['Ohms Law basics', 'Static vs current electricity', 'Generating electricity'],
      scenes: [
        { title: 'Electric Properties', description: 'Introduction to voltage, current, and resistance' },
        { title: 'Static vs Current', description: 'Comparing static electricity to current electricity' },
        { title: 'Resistance Matters', description: 'How resistance affects current flow' },
        { title: 'Generating Power', description: 'How generators convert motion to electricity' },
        { title: 'Electromagnetic Connection', description: 'Relationship between electricity and magnetism' },
        { title: 'Power Grid', description: 'How electricity reaches our homes' },
        { title: 'Renewable Energy', description: 'Clean ways to generate electricity' },
        { title: 'Electric Future', description: 'Future of electrical technology' }
      ]
    }
  }
};

// ============================================================================
// State Management
// ============================================================================

let state = {
  topic: '',
  gradeLevel: '',
  panelCount: 6,
  selectedGuide: 'mr-chloro',
  selectedAvatar: null,
  avatarUrl: null,
  guideImageUrl: null,
  isGenerating: false,
  generatedPanels: [],
  savedStoryId: null,
  isPublished: false
};

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  topicSelect: document.getElementById('topicSelect'),
  gradeLevelSelect: document.getElementById('gradeLevelSelect'),
  panelCount: document.getElementById('panelCount'),
  topicGuideContainer: document.getElementById('topicGuideContainer'),
  studentAvatarContainer: document.getElementById('studentAvatarContainer'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnText: document.getElementById('generateBtnText'),
  progressSection: document.getElementById('progressSection'),
  logOutput: document.getElementById('logOutput'),
  panelGrid: document.getElementById('panelGrid'),
  panelStatus: document.getElementById('panelStatus'),
  saveSection: document.getElementById('saveSection'),
  saveToStoryBtn: document.getElementById('saveToStoryBtn'),
  publishBtn: document.getElementById('publishBtn'),
  publishStatus: document.getElementById('publishStatus'),
  // Progress steps
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
  step4: document.getElementById('step4'),
  progress1: document.getElementById('progress1'),
  progress2: document.getElementById('progress2'),
  progress3: document.getElementById('progress3')
};

// ============================================================================
// Logging Utilities
// ============================================================================

function log(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  logEntry.textContent = `[${timestamp}] ${message}`;
  elements.logOutput.appendChild(logEntry);
  elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function clearLogs() {
  elements.logOutput.innerHTML = '';
}

// ============================================================================
// Progress UI Updates
// ============================================================================

function updateProgress(step, progress = 100) {
  // Reset all steps
  [elements.step1, elements.step2, elements.step3, elements.step4].forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 < step) el.classList.add('completed');
    if (i + 1 === step) el.classList.add('active');
  });

  // Update progress bars
  if (step >= 1) elements.progress1.style.width = step > 1 ? '100%' : `${progress}%`;
  if (step >= 2) elements.progress2.style.width = step > 2 ? '100%' : `${progress}%`;
  if (step >= 3) elements.progress3.style.width = step > 3 ? '100%' : `${progress}%`;
}

// ============================================================================
// Avatar Loading
// ============================================================================

async function loadAvatars() {
  try {
    // Try to load from Supabase storage
    const { data: avatarFiles, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 20 });

    if (error) throw error;

    // Filter for image files
    const avatars = avatarFiles.filter(f => 
      f.name.match(/\.(png|jpg|jpeg|webp)$/i)
    );

    if (avatars.length === 0) {
      // Fallback to default avatars
      renderDefaultAvatars();
      return;
    }

    // Render avatars from storage
    elements.studentAvatarContainer.innerHTML = avatars.map(avatar => {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatar.name);
      
      return `
        <div class="character-card rounded-xl p-2 bg-purple-50 cursor-pointer" data-avatar="${avatar.name}" data-url="${publicUrl}">
          <img src="${publicUrl}" alt="${avatar.name}" class="w-full aspect-square object-cover rounded-lg" onerror="this.parentElement.style.display='none'" />
        </div>
      `;
    }).join('');

    setupAvatarSelection();

  } catch (error) {
    console.warn('Error loading avatars from storage:', error);
    renderDefaultAvatars();
  }
}

function renderDefaultAvatars() {
  // Default avatar options using DiceBear
  const defaultAvatars = [
    { id: 'aria', name: 'Aria', seed: 'aria-curious' },
    { id: 'max', name: 'Max', seed: 'max-explorer' },
    { id: 'luna', name: 'Luna', seed: 'luna-dreamer' },
    { id: 'leo', name: 'Leo', seed: 'leo-brave' },
    { id: 'nova', name: 'Nova', seed: 'nova-bright' },
    { id: 'finn', name: 'Finn', seed: 'finn-friendly' }
  ];

  elements.studentAvatarContainer.innerHTML = defaultAvatars.map(avatar => `
    <div class="character-card rounded-xl p-2 bg-purple-50 cursor-pointer" data-avatar="${avatar.id}" data-url="https://api.dicebear.com/7.x/adventurer/svg?seed=${avatar.seed}">
      <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${avatar.seed}" alt="${avatar.name}" class="w-full aspect-square object-cover rounded-lg" />
      <p class="text-center text-xs font-medium text-slate-600 mt-1">${avatar.name}</p>
    </div>
  `).join('');

  setupAvatarSelection();
}

function setupAvatarSelection() {
  const avatarCards = elements.studentAvatarContainer.querySelectorAll('.character-card');
  avatarCards.forEach(card => {
    card.addEventListener('click', () => {
      avatarCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedAvatar = card.dataset.avatar;
      state.avatarUrl = card.dataset.url;
      validateForm();
    });
  });
}

// ============================================================================
// Topic Guide Loading & Selection
// ============================================================================

/**
 * Load topic guides dynamically from Supabase storage bucket
 * Tries to discover images from bucket, falls back to predefined filenames
 */
async function loadTopicGuides() {
  const guideEntries = Object.entries(TOPIC_GUIDES);
  const guidesWithUrls = [];

  try {
    // Try to list files from the topic_guide bucket
    const { data: bucketFiles, error: listError } = await supabase.storage
      .from('topic_guide')
      .list('', { limit: 50 });

    if (!listError && bucketFiles && bucketFiles.length > 0) {
      // Filter for image files
      const imageFiles = bucketFiles.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|webp)$/i)
      );

      console.log(`Found ${imageFiles.length} images in topic_guide bucket:`, imageFiles.map(f => f.name));

      // Match bucket files to guide definitions
      for (const [guideId, guide] of guideEntries) {
        // Find matching file (case-insensitive)
        const matchingFile = imageFiles.find(f => 
          f.name.toLowerCase() === guide.filename.toLowerCase()
        );

        if (matchingFile) {
          // Get public URL (handles both public and signed URLs automatically)
          const { data: { publicUrl } } = supabase.storage
            .from('topic_guide')
            .getPublicUrl(matchingFile.name);

          guidesWithUrls.push({
            guideId,
            guide,
            imageUrl: publicUrl,
            found: true
          });
        } else {
          // File not found in bucket, try to generate URL anyway
          const { data: { publicUrl } } = supabase.storage
            .from('topic_guide')
            .getPublicUrl(guide.filename);

          guidesWithUrls.push({
            guideId,
            guide,
            imageUrl: publicUrl,
            found: false
          });
        }
      }
    } else {
      // Bucket listing failed, use predefined filenames
      console.warn('Could not list bucket files, using predefined filenames:', listError);
      
      for (const [guideId, guide] of guideEntries) {
        const { data: { publicUrl } } = supabase.storage
          .from('topic_guide')
          .getPublicUrl(guide.filename);

        guidesWithUrls.push({
          guideId,
          guide,
          imageUrl: publicUrl,
          found: false
        });
      }
    }
  } catch (error) {
    // Fallback: use predefined filenames
    console.warn('Error loading topic guides, using fallback:', error);
    
    for (const [guideId, guide] of guideEntries) {
      const { data: { publicUrl } } = supabase.storage
        .from('topic_guide')
        .getPublicUrl(guide.filename);

      guidesWithUrls.push({
        guideId,
        guide,
        imageUrl: publicUrl,
        found: false
      });
    }
  }

  // Render guides with discovered URLs
  elements.topicGuideContainer.innerHTML = guidesWithUrls.map(({ guideId, guide, imageUrl }, index) => {
    const isFirst = index === 0;
    
    return `
      <div class="character-card rounded-xl p-3 ${isFirst ? 'bg-purple-50 selected' : 'bg-pink-50'} cursor-pointer" data-guide="${guideId}" data-url="${imageUrl}">
        <img src="${imageUrl}" alt="${guide.name}" class="w-full aspect-square object-cover rounded-lg mb-2" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${guideId}'" />
        <p class="text-center text-sm font-medium text-slate-700">${guide.name}</p>
      </div>
    `;
  }).join('');

  // Set initial state from first guide
  if (guidesWithUrls.length > 0) {
    const first = guidesWithUrls[0];
    state.selectedGuide = first.guideId;
    state.guideImageUrl = first.imageUrl;
  }

  setupTopicGuideClickHandlers();
  console.log(`✓ Loaded ${guidesWithUrls.length} topic guides from Supabase storage`);
}

/**
 * Setup click handlers for topic guide cards
 */
function setupTopicGuideClickHandlers() {
  const guideCards = elements.topicGuideContainer.querySelectorAll('.character-card');
  guideCards.forEach(card => {
    card.addEventListener('click', () => {
      guideCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedGuide = card.dataset.guide;
      state.guideImageUrl = card.dataset.url;
      console.log('Selected guide:', state.selectedGuide, 'URL:', state.guideImageUrl);
      validateForm();
    });
  });
}

// ============================================================================
// Form Validation
// ============================================================================

function validateForm() {
  const isValid = state.topic && 
                  state.gradeLevel && 
                  state.selectedGuide && 
                  state.selectedAvatar &&
                  !state.isGenerating;
  
  elements.generateBtn.disabled = !isValid;
  return isValid;
}

// ============================================================================
// Panel Generation
// ============================================================================

async function generatePanels() {
  if (!validateForm()) return;

  // Validate API keys
  if (!OPENAI_API_KEY) {
    alert('Missing VITE_OPENAI_API_KEY in .env file');
    return;
  }
  if (!FAL_API_KEY) {
    alert('Missing VITE_FAL_API_KEY in .env file');
    return;
  }

  state.isGenerating = true;
  state.generatedPanels = [];
  elements.generateBtn.disabled = true;
  elements.generateBtnText.innerHTML = '<span class="loading-pulse">Generating...</span>';
  elements.progressSection.classList.remove('hidden');
  elements.saveSection.classList.add('hidden');
  clearLogs();

  const panelCount = parseInt(elements.panelCount.value);

  try {
    // Get the current user session (for storage uploads)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Please log in to generate panels');

    log(`Starting generation: ${state.topic} for ${state.gradeLevel}`, 'info');
    log(`Characters: ${TOPIC_GUIDES[state.selectedGuide].name} + ${state.selectedAvatar}`, 'info');

    // Step 1: Generate prompts using GPT-4o (direct API call)
    updateProgress(1, 0);
    log('Step 1: Generating image prompts with GPT-4o...', 'info');

    const { prompts, sceneDescriptions } = await generatePromptsWithGPT(
      state.topic,
      state.gradeLevel,
      panelCount,
      TOPIC_GUIDES[state.selectedGuide],
      state.selectedAvatar
    );

    log(`✓ Generated ${prompts.length} scene prompts`, 'success');
    updateProgress(1, 100);

    // Step 2: Generate images for each panel using Fal.ai (direct API call)
    updateProgress(2, 0);
    log('Step 2: Generating images with Fal.ai Flux...', 'info');

    const generatedImages = [];
    
    for (let i = 0; i < prompts.length; i++) {
      log(`  Generating panel ${i + 1}/${prompts.length}...`, 'info');
      
      try {
        const imageResult = await generateImageWithFal(
          prompts[i],
          state.guideImageUrl,
          state.avatarUrl,
          i
        );

        generatedImages.push({ 
          index: i, 
          imageUrl: imageResult.imageUrl,
          prompt: prompts[i],
          description: sceneDescriptions[i]
        });
        
        log(`  ✓ Panel ${i + 1} generated`, 'success');
        
        // Show preview immediately
        renderPanelPreview(i, imageResult.imageUrl, sceneDescriptions[i]);
      } catch (err) {
        log(`  ✗ Panel ${i + 1} failed: ${err.message}`, 'error');
      }
      
      updateProgress(2, ((i + 1) / prompts.length) * 100);
    }

    // Step 3: Upload to Supabase Storage
    updateProgress(3, 0);
    log('Step 3: Saving panels to storage...', 'info');

    const savedPanels = [];
    
    for (let i = 0; i < generatedImages.length; i++) {
      const panel = generatedImages[i];
      log(`  Uploading panel ${i + 1}...`, 'info');

      try {
        const { storagePath, publicUrl } = await savePanelToStorage(
          state.topic,
          state.gradeLevel,
          panel.index,
          panel.imageUrl
        );

        savedPanels.push({
          panelId: `panel-${String(panel.index + 1).padStart(2, '0')}`,
          imageUrl: publicUrl,
          narration: panel.description || '', // Ensure narration is always a string, never undefined
          storagePath
        });

        log(`  ✓ Panel ${i + 1} saved`, 'success');
      } catch (err) {
        log(`  ✗ Upload failed for panel ${i + 1}: ${err.message}`, 'error');
      }
      
      updateProgress(3, ((i + 1) / generatedImages.length) * 100);
    }

    // Step 4: Generate glossary terms and definitions
    updateProgress(4, 0);
    log('Step 4: Generating glossary terms and definitions...', 'info');
    
    let glossaryDefinitions = {};
    
    try {
      // Extract glossary terms from all panel narrations
      const allNarrations = savedPanels.map(p => p.narration).join('\n\n');
      const glossaryTerms = await generateGlossaryTerms(allNarrations, state.topic, state.gradeLevel);
      
      log(`  ✓ Extracted ${glossaryTerms.length} glossary terms`, 'success');
      
      // Generate definitions for all terms
      if (glossaryTerms.length > 0) {
        glossaryDefinitions = await generateGlossaryDefinitions(glossaryTerms, state.topic, state.gradeLevel);
        log(`  ✓ Generated definitions for ${Object.keys(glossaryDefinitions).length} terms`, 'success');
        
        // Assign glossary terms to each panel based on narration content
        savedPanels.forEach((panel, index) => {
          const panelTerms = glossaryTerms.filter(term => {
            const lowerNarration = panel.narration.toLowerCase();
            const lowerTerm = term.toLowerCase();
            return lowerNarration.includes(lowerTerm);
          });
          panel.glossaryTerms = panelTerms.slice(0, 5); // Limit to 5 terms per panel
        });
      }
      
      // Store glossary definitions in state for saving
      state.glossaryDefinitions = glossaryDefinitions;
      
    } catch (err) {
      log(`  ⚠️ Glossary generation failed: ${err.message}`, 'warning');
      console.warn('Glossary generation error:', err);
      // Continue without glossary - not critical
    }
    
    updateProgress(4, 100);
    
    // Step 5: Complete
    updateProgress(5);
    state.generatedPanels = savedPanels;
    
    log('═══════════════════════════════════════', 'success');
    log(`✓ Successfully generated ${savedPanels.length} panels!`, 'success');
    log(`  Topic: ${state.topic}`, 'info');
    log(`  Grade: ${state.gradeLevel}`, 'info');
    log(`  Storage: generated_panels/${state.topic}/${state.gradeLevel}/`, 'info');
    if (Object.keys(glossaryDefinitions).length > 0) {
      log(`  Glossary: ${Object.keys(glossaryDefinitions).length} terms defined`, 'info');
    }

    elements.panelStatus.textContent = `${savedPanels.length} panels generated`;
    elements.saveSection.classList.remove('hidden');
    
    // Reset publish state when new panels are generated
    state.savedStoryId = null;
    state.isPublished = false;
    updatePublishButtonState();

  } catch (error) {
    log(`✗ Error: ${error.message}`, 'error');
    console.error('Generation error:', error);
  } finally {
    state.isGenerating = false;
    elements.generateBtn.disabled = false;
    elements.generateBtnText.textContent = 'Generate Comic Panels';
  }
}

// ============================================================================
// Direct API Calls (using .env keys)
// ============================================================================

/**
 * Generate image prompts using GPT-4o (direct API call)
 */
async function generatePromptsWithGPT(topic, gradeLevel, panelCount, guideCharacter, studentCharacter) {
  const template = SCENE_TEMPLATES[topic]?.[gradeLevel];
  if (!template) {
    throw new Error(`No template found for topic: ${topic}, grade: ${gradeLevel}`);
  }

  const scenes = template.scenes.slice(0, panelCount);
  const vocabulary = template.vocabulary.join(', ');
  const concepts = template.concepts.join('; ');

  const systemPrompt = `You are an expert at creating image generation prompts for educational comic panels.
Your prompts will be used with Fal.ai Flux image generation to create Pixar-style educational comics.

Important guidelines:
1. Create vivid, detailed descriptions that will generate consistent, high-quality images
2. Always include the guide character (${guideCharacter.name}) and student character (${studentCharacter})
3. Use bright, vibrant colors suitable for children
4. Include specific Pixar-style animation cues
5. Keep the educational content age-appropriate for ${gradeLevel}
6. Ensure characters maintain consistent appearance across all panels
7. Focus on clear visual storytelling`;

  const userPrompt = `Create ${panelCount} detailed image generation prompts for an educational comic about ${topic} for grade ${gradeLevel}.

Topic vocabulary: ${vocabulary}
Key concepts: ${concepts}

Guide character: ${guideCharacter.name} - ${guideCharacter.description}
Student character: ${studentCharacter}

Scene descriptions to base prompts on:
${scenes.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

For each scene, create a detailed prompt that:
- Describes the visual scene in detail (setting, lighting, mood)
- Positions the characters naturally in the scene
- Includes relevant scientific imagery for the concept
- Uses Pixar-style animation descriptors
- Is 2-3 sentences long

Return your response as a JSON object with two arrays:
1. "prompts": Array of image generation prompts
2. "sceneDescriptions": Array of brief narration texts for each panel (what the characters might say)`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GPT-4o error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  return {
    prompts: content.prompts || [],
    sceneDescriptions: content.sceneDescriptions || content.prompts.map(() => '')
  };
}

/**
 * Generate image using Fal.ai Flux-pro/kontext/multi (direct API call)
 */
async function generateImageWithFal(prompt, guideImageUrl, avatarImageUrl, panelIndex) {
  // Filter to only include valid publicly accessible URLs
  // Local paths (starting with /) won't work with Fal.ai - they need http/https URLs
  const validUrls = [guideImageUrl, avatarImageUrl].filter(url => {
    if (!url || url.length === 0) return false;
    // Only include URLs that start with http/https (publicly accessible)
    return url.startsWith('http://') || url.startsWith('https://');
  });

  // Prepare the request for Flux kontext/multi
  const requestBody = {
    prompt: `${prompt}. Pixar-style 3D animation, bright colors, expressive characters, educational children's comic panel, high quality, detailed.`,
    image_urls: validUrls,
    num_images: 1,
    image_size: 'square_hd',
    output_format: 'png',
    guidance_scale: 7.5,
    num_inference_steps: 28,
    seed: panelIndex * 1000 + Date.now() % 1000
  };

  console.log(`Generating panel ${panelIndex + 1} with Fal.ai...`);
  console.log(`Using ${validUrls.length} reference image(s):`, validUrls);

  if (validUrls.length === 0) {
    console.warn('⚠️ No valid reference images - generating without character references');
  }

  const response = await fetch(FAL_KONTEXT_MULTI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Fal.ai error:', errorText);
    throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // Handle different response formats from Fal.ai
  if (result.images && result.images.length > 0) {
    return { imageUrl: result.images[0].url };
  } else if (result.image) {
    return { imageUrl: result.image.url };
  } else if (result.output) {
    return { imageUrl: result.output };
  }
  
  throw new Error('No image returned from Fal.ai');
}

/**
 * Save generated panel to Supabase Storage
 */
async function savePanelToStorage(topic, gradeLevel, panelIndex, imageUrl) {
  const fileName = `panel-${String(panelIndex + 1).padStart(2, '0')}.png`;
  const storagePath = `${topic}/${gradeLevel}/${fileName}`;
  
  console.log(`[Storage] Uploading panel to: ${storagePath}`);
  
  // Verify bucket exists by trying to list it first
  const { data: bucketCheck, error: bucketError } = await supabase.storage
    .from('generated_panels')
    .list('', { limit: 1 });
  
  if (bucketError) {
    console.error('[Storage] Bucket check failed:', bucketError);
    if (bucketError.message.includes('not found') || bucketError.message.includes('Bucket')) {
      throw new Error('Bucket "generated_panels" does not exist. Please create it in Supabase Dashboard → Storage.');
    }
    throw new Error(`Bucket access error: ${bucketError.message}`);
  }
  
  // Fetch image from URL
  console.log(`[Storage] Fetching image from: ${imageUrl}`);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
  }
  const imageBlob = await imageResponse.blob();
  console.log(`[Storage] Image blob size: ${imageBlob.size} bytes`);
  
  // Upload to Supabase Storage
  console.log(`[Storage] Uploading to bucket: generated_panels, path: ${storagePath}`);
  const { data, error } = await supabase.storage
    .from('generated_panels')
    .upload(storagePath, imageBlob, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) {
    console.error('[Storage] Upload error details:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error
    });
    
    // Provide helpful error messages
    if (error.message.includes('row-level security') || error.message.includes('RLS')) {
      throw new Error(`RLS Policy Error: The bucket has Row-Level Security enabled. Please add a policy in Supabase Dashboard → Storage → generated_panels → Policies to allow INSERT for authenticated users.`);
    } else if (error.message.includes('not found') || error.message.includes('Bucket')) {
      throw new Error(`Bucket "generated_panels" not found. Please create it in Supabase Dashboard → Storage.`);
    } else {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }
  
  console.log(`[Storage] Upload successful:`, data);
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('generated_panels')
    .getPublicUrl(storagePath);
  
  console.log(`[Storage] Public URL: ${publicUrl}`);
  
  return { storagePath, publicUrl };
}

/**
 * Generate glossary terms from panel narrations using OpenAI
 * @param {string} narrations - Combined narration text from all panels
 * @param {string} topic - Science topic
 * @param {string} gradeLevel - Grade level (K-2, 3-4, 5-6)
 * @returns {Promise<string[]>} Array of glossary term strings
 */
async function generateGlossaryTerms(narrations, topic, gradeLevel) {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not available, skipping glossary generation');
    return [];
  }

  const systemPrompt = `You are an expert at identifying educational vocabulary terms for children's science stories.
Your task is to extract 8-15 key vocabulary terms from story narrations that are:
1. Age-appropriate for ${gradeLevel} students
2. Scientifically accurate
3. Important for understanding the topic: ${topic}
4. Not too common (avoid words like "the", "is", "and")
5. Educational value (help children learn science concepts)

Return ONLY a JSON array of term strings, nothing else.`;

  const userPrompt = `Extract key vocabulary terms from this educational story narration:

${narrations}

Return a JSON array of 8-15 important science terms that children should learn from this story.
Each term should be a single word or short phrase (2-3 words max).
Example format: ["photosynthesis", "chlorophyll", "carbon dioxide", "oxygen"]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    // Handle both array and object formats
    let terms = [];
    if (Array.isArray(content)) {
      terms = content;
    } else if (content.terms && Array.isArray(content.terms)) {
      terms = content.terms;
    } else if (content.glossaryTerms && Array.isArray(content.glossaryTerms)) {
      terms = content.glossaryTerms;
    }
    
    // Remove duplicates and filter empty strings
    return [...new Set(terms.filter(t => t && typeof t === 'string' && t.trim().length > 0))];
  } catch (error) {
    console.error('Glossary terms generation error:', error);
    return [];
  }
}

/**
 * Generate kid-friendly definitions for glossary terms using OpenAI
 * @param {string[]} terms - Array of glossary term strings
 * @param {string} topic - Science topic
 * @param {string} gradeLevel - Grade level (K-2, 3-4, 5-6)
 * @returns {Promise<Object>} Object mapping term to definition { term: definition }
 */
async function generateGlossaryDefinitions(terms, topic, gradeLevel) {
  if (!OPENAI_API_KEY || terms.length === 0) {
    return {};
  }

  const systemPrompt = `You are an expert at writing kid-friendly science definitions for ${gradeLevel} students.
Your definitions should be:
1. Age-appropriate and easy to understand
2. Scientifically accurate
3. Engaging and fun (use simple analogies when helpful)
4. 1-2 sentences long
5. Written in a warm, friendly tone

Return ONLY a JSON object where keys are terms and values are definitions.`;

  const userPrompt = `Create kid-friendly definitions for these science terms from a story about ${topic}:

${terms.join(', ')}

Return a JSON object with this format:
{
  "term1": "Definition for term1",
  "term2": "Definition for term2",
  ...
}

Make sure definitions are perfect for ${gradeLevel} students!`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const definitions = JSON.parse(data.choices[0].message.content);
    
    // Normalize keys to lowercase for consistent lookup
    const normalized = {};
    for (const [term, definition] of Object.entries(definitions)) {
      if (term && definition && typeof definition === 'string') {
        normalized[term.toLowerCase()] = definition;
        // Also add original case if different
        if (term.toLowerCase() !== term) {
          normalized[term] = definition;
        }
      }
    }
    
    return normalized;
  } catch (error) {
    console.error('Glossary definitions generation error:', error);
    return {};
  }
}

// ============================================================================
// Panel Preview Rendering
// ============================================================================

function renderPanelPreview(index, imageUrl, description) {
  // Remove empty state if this is the first panel
  if (index === 0) {
    elements.panelGrid.innerHTML = '';
  }

  const panelId = `panel-${index}`;
  const escapedDescription = (description || 'Scene description').replace(/"/g, '&quot;');

  const panelHtml = `
    <div class="panel-preview bg-white rounded-xl overflow-hidden shadow-lg border-2 border-purple-100 cursor-pointer transition-all duration-300" data-panel-index="${index}" data-expanded="false">
      <div class="relative aspect-square">
        <img src="${imageUrl}" alt="Panel ${index + 1}" class="w-full h-full object-cover" />
        <div class="absolute top-2 left-2 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
          ${index + 1}
        </div>
        <div class="absolute top-2 right-2 w-8 h-8 rounded-full bg-purple-100/90 backdrop-blur-sm flex items-center justify-center">
          <svg class="w-5 h-5 text-purple-600 expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div class="p-3">
        <p class="text-xs text-slate-600 narration-text line-clamp-2" data-full-text="${escapedDescription}">${description || 'Scene description'}</p>
        <button class="mt-2 text-xs text-purple-600 font-semibold hover:text-purple-800 view-full-btn hidden">
          View Full Narration →
        </button>
      </div>
    </div>
  `;

  elements.panelGrid.insertAdjacentHTML('beforeend', panelHtml);

  // Add click handler for expand/collapse
  const panelCard = elements.panelGrid.querySelector(`[data-panel-index="${index}"]`);
  if (panelCard) {
    setupPanelCardInteractions(panelCard, index, imageUrl, description);
  }
}

/**
 * Setup interactions for panel card (expand/collapse narration, view full modal)
 */
function setupPanelCardInteractions(panelCard, index, imageUrl, description) {
  const narrationText = panelCard.querySelector('.narration-text');
  const viewFullBtn = panelCard.querySelector('.view-full-btn');
  const expandIcon = panelCard.querySelector('.expand-icon');
  const fullText = narrationText?.dataset.fullText || description || '';

  // Toggle expand/collapse on card click
  panelCard.addEventListener('click', (e) => {
    // Don't toggle if clicking the "View Full" button
    if (e.target.closest('.view-full-btn')) {
      return;
    }

    const isExpanded = panelCard.dataset.expanded === 'true';
    
    if (isExpanded) {
      // Collapse
      panelCard.dataset.expanded = 'false';
      narrationText.classList.add('line-clamp-2');
      narrationText.classList.remove('line-clamp-none');
      viewFullBtn.classList.add('hidden');
      expandIcon.style.transform = 'rotate(0deg)';
    } else {
      // Expand
      panelCard.dataset.expanded = 'true';
      narrationText.classList.remove('line-clamp-2');
      narrationText.classList.add('line-clamp-none');
      viewFullBtn.classList.remove('hidden');
      expandIcon.style.transform = 'rotate(180deg)';
    }
  });

  // View Full button opens modal
  if (viewFullBtn) {
    viewFullBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNarrationModal(index, imageUrl, description);
    });
  }
}

/**
 * Open modal to view full narration with large image
 */
function openNarrationModal(panelIndex, imageUrl, narration) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('narrationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'narrationModal';
    modal.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="closeNarrationModal()"></div>
      <div class="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col z-10">
        <div class="flex items-center justify-between p-6 border-b border-purple-200">
          <h3 class="font-fredoka text-2xl font-bold text-slate-700">Panel ${panelIndex + 1} Narration</h3>
          <button onclick="closeNarrationModal()" class="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div class="mb-6">
            <img id="modalPanelImage" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Panel ${panelIndex + 1}" class="w-full rounded-2xl shadow-lg border-2 border-purple-100" />
          </div>
          <div class="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
            <p id="modalNarrationText" class="text-lg text-slate-700 leading-relaxed"></p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Update modal content
  const modalImage = document.getElementById('modalPanelImage');
  const modalText = document.getElementById('modalNarrationText');
  
  if (modalImage) modalImage.src = imageUrl;
  if (modalText) modalText.textContent = narration || 'No narration available.';

  // Show modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close narration modal
 */
function closeNarrationModal() {
  const modal = document.getElementById('narrationModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Make closeNarrationModal available globally for onclick handlers
window.closeNarrationModal = closeNarrationModal;

// Add keyboard support for closing modal (Escape key)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeNarrationModal();
  }
});

function renderEmptyState() {
  elements.panelGrid.innerHTML = `
    <div class="col-span-full text-center py-16">
      <div class="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
        <svg class="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-slate-500 font-medium">Your generated panels will appear here</p>
      <p class="text-slate-400 text-sm mt-2">Select options and click Generate to begin</p>
    </div>
  `;
}

// ============================================================================
// Save to Story
// ============================================================================

async function saveAsStory() {
  if (state.generatedPanels.length === 0) {
    alert('No panels to save. Please generate panels first.');
    log('✗ Cannot save: No panels generated', 'error');
    return;
  }

  if (!state.topic || !state.gradeLevel) {
    alert('Please select a topic and grade level before saving.');
    log('✗ Cannot save: Missing topic or grade level', 'error');
    return;
  }

  log('Creating story entry...', 'info');

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      log(`✗ Session error: ${sessionError.message}`, 'error');
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    if (!session) {
      log('✗ Not authenticated', 'error');
      throw new Error('Please log in to save stories.');
    }

    const storyId = `${state.topic}-${state.gradeLevel}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Create story data matching ai_stories table structure
    const storyData = {
      id: storyId,
      title: `${formatTopicName(state.topic)} Adventure`,
      cover_url: state.generatedPanels[0]?.imageUrl || '',
      topic: state.topic, // Original topic identifier (e.g., "photosynthesis")
      topic_tag: formatTopicName(state.topic), // Display name (e.g., "Photosynthesis")
      grade_level: state.gradeLevel, // Grade level (K-2, 3-4, 5-6)
      reading_level: getReadingLevel(state.gradeLevel), // Formatted reading level
      estimated_time: `${Math.ceil(state.generatedPanels.length * 1.5)} min`,
      summary: `An AI-generated adventure about ${formatTopicName(state.topic)} for ${state.gradeLevel} learners.`,
      panels: state.generatedPanels.map((panel) => {
        // Get character name for chat button label
        let ctaLabel = `Ask about ${formatTopicName(state.topic)}`;
        try {
          // Try to get character name (will be available after topic-characters.js is loaded)
          // For now, use a simple mapping
          const characterMap = {
            'photosynthesis': 'Mr. Chloro',
            'solar-system': 'Solaris',
            'water-cycle': 'Water Wizard',
            'human-body': 'Dr. Body',
            'electricity': 'Sparky',
            'magnetism': 'Magno'
          };
          const characterName = characterMap[state.topic] || null;
          if (characterName) {
            ctaLabel = `Ask ${characterName}`;
          }
        } catch (e) {
          // Fallback to default if character mapping fails
        }
        
        return {
          panelId: panel.panelId,
          imageUrl: panel.imageUrl,
          narration: panel.narration || '', // Ensure narration is always a string, never undefined
          glossaryTerms: panel.glossaryTerms || [],
          chatTopicId: state.topic,
          ctaLabel: ctaLabel
        };
      }),
      enabled: false, // Draft - not published yet
      created_by: session.user.id,
      created_at: timestamp
    };

    // Create comprehensive metadata for storage
    const metadata = {
      storyId: storyId,
      title: storyData.title,
      topic: state.topic,
      gradeLevel: state.gradeLevel,
      topicTag: storyData.topic_tag,
      readingLevel: storyData.reading_level,
      estimatedTime: storyData.estimated_time,
      summary: storyData.summary,
      coverUrl: storyData.cover_url,
      panels: storyData.panels,
      metadata: {
        generatedAt: timestamp,
        generatedBy: session.user.id,
        guideCharacter: TOPIC_GUIDES[state.selectedGuide]?.name || state.selectedGuide,
        studentAvatar: state.selectedAvatar,
        panelCount: state.generatedPanels.length,
        status: 'draft',
        glossaryDefinitions: state.glossaryDefinitions || {}
      }
    };
    
    // Store metadata in storyData for database (as JSONB)
    storyData.metadata = metadata.metadata;

    // Save to Supabase ai_stories table
    const { error: dbError } = await supabase
      .from('ai_stories')
      .insert([storyData]);

    if (dbError) {
      console.error('Database save error:', dbError);
      log(`✗ Database save failed: ${dbError.message}`, 'error');
      
      // Show user-friendly error message
      const errorMsg = dbError.message || 'Unknown error';
      alert(`Failed to save story to database:\n\n${errorMsg}\n\nPlease check the browser console for details.`);
      throw new Error(`Database save failed: ${errorMsg}`);
    }
    
    log('✓ Story saved to database', 'success');

    // Save metadata JSON to generated_panels storage
    const metadataPath = `${state.topic}/${state.gradeLevel}/story-metadata-${storyId}.json`;
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    
    const { error: storageError } = await supabase.storage
      .from('generated_panels')
      .upload(metadataPath, metadataBlob, {
        contentType: 'application/json',
        upsert: true
      });

    if (storageError) {
      console.warn('Could not save metadata to storage:', storageError);
      log('⚠️ Story saved to database but metadata file failed', 'warning');
    } else {
      log('✓ Metadata saved to storage', 'success');
    }

    // Store saved story ID for publish functionality
    state.savedStoryId = storyId;
    state.isPublished = false;

    log('✓ Story saved successfully!', 'success');
    log(`  Story ID: ${storyId}`, 'info');
    log(`  Status: Draft (not published)`, 'info');
    
    // Update UI to show publish button
    elements.saveSection.classList.remove('hidden');
    updatePublishButtonState();

    // Reload previous stories if on that tab
    const previousContent = document.getElementById('previousTabContent');
    if (previousContent && !previousContent.classList.contains('hidden')) {
      await loadPreviousStories();
    }

    alert(`Story saved as draft!\n\nStory ID: ${storyId}\n\nClick "Publish to Stories" to make it visible on the Stories page.`);

  } catch (error) {
    log(`✗ Save failed: ${error.message}`, 'error');
    console.error('Save error details:', error);
    
    // Show user-friendly error
    alert(`Failed to save story:\n\n${error.message}\n\nPlease check:\n1. You are logged in\n2. Database connection is working\n3. Browser console for more details`);
  }
}

/**
 * Open publish modal with topic/grade selection
 */
function openPublishModal() {
  if (!state.savedStoryId) {
    alert('Please save the story first before publishing.');
    return;
  }

  if (state.isPublished) {
    alert('This story is already published!');
    return;
  }

  const modal = document.getElementById('publishModal');
  const publishTopicSelect = document.getElementById('publishTopicSelect');
  const publishGradeSelect = document.getElementById('publishGradeSelect');
  const publishTopicCustom = document.getElementById('publishTopicCustom');
  const publishStoryTitle = document.getElementById('publishStoryTitle');
  const publishPanelCount = document.getElementById('publishPanelCount');

  if (!modal || !publishTopicSelect || !publishGradeSelect) return;

  // Set default values from current state
  publishTopicSelect.value = state.topic || 'photosynthesis';
  publishGradeSelect.value = state.gradeLevel || 'K-2';
  
  // Hide custom input initially
  if (publishTopicCustom) {
    publishTopicCustom.classList.add('hidden');
    publishTopicCustom.value = '';
  }
  
  // Update preview
  updatePublishPreview();

  modal.classList.remove('hidden');
}

/**
 * Update publish preview title based on selected topic
 */
function updatePublishPreview() {
  const publishTopicSelect = document.getElementById('publishTopicSelect');
  const publishTopicCustom = document.getElementById('publishTopicCustom');
  const publishStoryTitle = document.getElementById('publishStoryTitle');
  
  if (!publishTopicSelect || !publishStoryTitle) return;
  
  let topicName = '';
  if (publishTopicSelect.value === 'custom' && publishTopicCustom) {
    topicName = publishTopicCustom.value.trim() || 'Custom Topic';
  } else {
    topicName = formatTopicName(publishTopicSelect.value);
  }
  
  publishStoryTitle.textContent = `${topicName} Adventure`;
}

/**
 * Close publish modal
 */
function closePublishModal() {
  const modal = document.getElementById('publishModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Confirm and execute publish with selected topic/grade
 */
async function confirmPublish() {
  const publishTopicSelect = document.getElementById('publishTopicSelect');
  const publishGradeSelect = document.getElementById('publishGradeSelect');
  const publishTopicCustom = document.getElementById('publishTopicCustom');

  if (!publishTopicSelect || !publishGradeSelect) {
    alert('Error: Could not find publish form elements.');
    return;
  }

  let publishTopic = publishTopicSelect.value;
  const publishGrade = publishGradeSelect.value;

  // If custom topic is selected, use the custom input value
  if (publishTopic === 'custom') {
    if (!publishTopicCustom || !publishTopicCustom.value.trim()) {
      alert('Please enter a custom topic name.');
      return;
    }
    publishTopic = publishTopicCustom.value.trim();
  }

  if (!publishTopic || !publishGrade) {
    alert('Please select both topic and grade level.');
    return;
  }

  closePublishModal();
  await publishStory(publishTopic, publishGrade);
}

/**
 * Publish story to make it visible on stories page
 * @param {string} publishTopic - Topic selected for publishing (for categorization)
 * @param {string} publishGrade - Grade level selected for publishing (for categorization)
 */
async function publishStory(publishTopic = null, publishGrade = null) {
  if (!state.savedStoryId) {
    alert('Please save the story first before publishing.');
    return;
  }

  if (state.isPublished) {
    alert('This story is already published!');
    return;
  }

  log('Publishing story...', 'info');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const timestamp = new Date().toISOString();

    // Use selected topic/grade for categorization, or fallback to original
    const finalTopic = publishTopic || state.topic;
    const finalGrade = publishGrade || state.gradeLevel;

    // Format topic name - if it's a custom name (not in predefined list), use it as-is
    let topicTag = finalTopic;
    try {
      // Try to format it (will return as-is if not in predefined list)
      topicTag = formatTopicName(finalTopic);
      // If formatTopicName returns the same value and it's not a predefined topic, use it directly
      if (topicTag === finalTopic && !['photosynthesis', 'solar-system', 'water-cycle', 'human-body', 'electricity'].includes(finalTopic.toLowerCase())) {
        // It's a custom topic name, capitalize it properly
        topicTag = finalTopic.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      }
    } catch (e) {
      // If formatting fails, use the topic as-is with proper capitalization
      topicTag = finalTopic.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    // Update ai_stories table: set enabled = true, update topic, topic_tag, grade_level, and reading_level
    const updateData = {
      topic: finalTopic, // Update topic identifier
      topic_tag: topicTag, // Update display name
      grade_level: finalGrade, // Update grade level
      reading_level: getReadingLevel(finalGrade), // Update formatted reading level
      enabled: true,
      published_at: timestamp
    };

    const { error: dbError } = await supabase
      .from('ai_stories')
      .update(updateData)
      .eq('id', state.savedStoryId);

    if (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }

    // Update metadata JSON in storage
    const metadataPath = `${state.topic}/${state.gradeLevel}/story-metadata-${state.savedStoryId}.json`;
    
    // First, try to read existing metadata
    const { data: existingMetadata, error: readError } = await supabase.storage
      .from('generated_panels')
      .download(metadataPath);

    if (!readError && existingMetadata) {
      const text = await existingMetadata.text();
      const metadata = JSON.parse(text);
      metadata.metadata.status = 'published';
      metadata.metadata.published_at = timestamp;

      const updatedBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const { error: updateError } = await supabase.storage
        .from('generated_panels')
        .upload(metadataPath, updatedBlob, {
          contentType: 'application/json',
          upsert: true
        });

      if (updateError) {
        console.warn('Could not update metadata file:', updateError);
      }
    }

    // Create topic in topics table if it doesn't exist
    log('Creating/verifying topic in database...', 'info');
    const topicCreated = await createTopicIfNotExists(finalTopic, topicTag, TOPIC_DESCRIPTIONS[finalTopic] || `Learn about ${topicTag}`);
    if (topicCreated) {
      log(`✓ Topic "${topicTag}" is ready for chat`, 'success');
    } else {
      log('⚠️ Topic creation failed, but story is published', 'warning');
    }

    state.isPublished = true;
    updatePublishButtonState();

    log('✓ Story published successfully!', 'success');
    log('  The story will now appear in the Stories page.', 'info');

    // Reload previous stories if on that tab
    const previousContent = document.getElementById('previousTabContent');
    if (previousContent && !previousContent.classList.contains('hidden')) {
      await loadPreviousStories();
    }

    const publishMessage = `Story published!\n\nThe story "${topicTag} Adventure" is now visible on the Stories page.\n\nWould you like to view it now?`;
    
    if (confirm(publishMessage)) {
      window.location.href = '/stories/index.html';
    }

  } catch (error) {
    log(`✗ Publish failed: ${error.message}`, 'error');
    console.error('Publish error:', error);
    alert(`Failed to publish story: ${error.message}`);
  }
}

/**
 * Update publish button state based on current status
 */
function updatePublishButtonState() {
  if (!elements.publishBtn || !elements.publishStatus) {
    // Elements might not exist yet, try to find them
    elements.publishBtn = document.getElementById('publishBtn');
    elements.publishStatus = document.getElementById('publishStatus');
    if (!elements.publishBtn || !elements.publishStatus) return;
  }

  if (!state.savedStoryId) {
    elements.publishBtn.disabled = true;
    if (elements.publishStatus) {
      elements.publishStatus.textContent = '';
      elements.publishStatus.className = '';
    }
    return;
  }

  if (state.isPublished) {
    elements.publishBtn.disabled = true;
    if (elements.publishStatus) {
      elements.publishStatus.textContent = 'Published';
      elements.publishStatus.className = 'text-sm font-semibold text-green-600';
    }
  } else {
    elements.publishBtn.disabled = false;
    if (elements.publishStatus) {
      elements.publishStatus.textContent = 'Draft';
      elements.publishStatus.className = 'text-sm font-semibold text-amber-600';
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTopicName(topic) {
  const names = {
    'photosynthesis': 'Photosynthesis',
    'solar-system': 'Solar System',
    'water-cycle': 'Water Cycle',
    'human-body': 'Human Body',
    'electricity': 'Electricity'
  };
  return names[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
}

function getReadingLevel(gradeLevel) {
  const levels = {
    'K-2': 'Ages 5-7',
    '3-4': 'Ages 8-9',
    '5-6': 'Ages 10-11'
  };
  return levels[gradeLevel] || gradeLevel;
}

// ============================================================================
// Topic Management Functions
// ============================================================================

/**
 * Topic display names mapping
 */
const TOPIC_DISPLAY_NAMES = {
  'photosynthesis': 'Photosynthesis',
  'solar-system': 'Solar System',
  'water-cycle': 'Water Cycle',
  'human-body': 'Human Body',
  'electricity': 'Electricity',
  'magnetism': 'Magnetism'
};

/**
 * Topic descriptions mapping
 */
const TOPIC_DESCRIPTIONS = {
  'photosynthesis': 'Discover how plants make food from sunlight',
  'solar-system': 'Journey through space and learn about planets',
  'water-cycle': 'Explore the amazing journey of water on Earth',
  'human-body': 'Learn about the amazing systems inside your body',
  'electricity': 'Discover the power of electricity and how it works',
  'magnetism': 'Explore the invisible force of magnets'
};

/**
 * Create a topic in the topics table if it doesn't exist
 * @param {string} topicId - Topic identifier (e.g., "photosynthesis")
 * @param {string} topicName - Display name (e.g., "Photosynthesis")
 * @param {string} description - Topic description (optional)
 * @returns {Promise<boolean>} True if topic was created or already exists
 */
async function createTopicIfNotExists(topicId, topicName, description = null) {
  if (!topicId || !topicName) {
    console.warn('[comic-generator] Cannot create topic: missing topicId or topicName');
    return false;
  }

  try {
    // Check if topic already exists
    const { data: existingTopic, error: checkError } = await supabase
      .from('topics')
      .select('id, name')
      .eq('name', topicName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      console.error('[comic-generator] Error checking topic existence:', checkError);
      return false;
    }

    if (existingTopic) {
      console.log(`[comic-generator] Topic "${topicName}" already exists`);
      return true;
    }

    // Create topic
    const topicData = {
      name: topicName,
      description: description || TOPIC_DESCRIPTIONS[topicId] || `Learn about ${topicName}`,
      enabled: true
    };

    const { error: insertError } = await supabase
      .from('topics')
      .insert([topicData]);

    if (insertError) {
      // If it's a unique constraint violation, topic already exists (race condition)
      if (insertError.code === '23505') {
        console.log(`[comic-generator] Topic "${topicName}" was created by another process`);
        return true;
      }
      console.error('[comic-generator] Error creating topic:', insertError);
      return false;
    }

    console.log(`[comic-generator] ✓ Created topic: "${topicName}"`);
    return true;
  } catch (error) {
    console.error('[comic-generator] Exception creating topic:', error);
    return false;
  }
}

/**
 * Ensure all predefined topics exist in the topics table
 * This should be called on initialization or as a one-time migration
 */
async function ensureAllTopicsExist() {
  const topicsToCreate = [
    { id: 'photosynthesis', name: 'Photosynthesis', description: TOPIC_DESCRIPTIONS['photosynthesis'] },
    { id: 'solar-system', name: 'Solar System', description: TOPIC_DESCRIPTIONS['solar-system'] },
    { id: 'water-cycle', name: 'Water Cycle', description: TOPIC_DESCRIPTIONS['water-cycle'] },
    { id: 'human-body', name: 'Human Body', description: TOPIC_DESCRIPTIONS['human-body'] },
    { id: 'electricity', name: 'Electricity', description: TOPIC_DESCRIPTIONS['electricity'] },
    { id: 'magnetism', name: 'Magnetism', description: TOPIC_DESCRIPTIONS['magnetism'] }
  ];

  log('Ensuring all topics exist in database...', 'info');
  
  let createdCount = 0;
  let existingCount = 0;

  for (const topic of topicsToCreate) {
    const result = await createTopicIfNotExists(topic.id, topic.name, topic.description);
    if (result) {
      // Check if it was newly created or already existed
      const { data: checkTopic } = await supabase
        .from('topics')
        .select('created_at')
        .eq('name', topic.name)
        .maybeSingle();
      
      // If created_at is very recent (within last second), it was just created
      if (checkTopic) {
        const createdTime = new Date(checkTopic.created_at).getTime();
        const now = Date.now();
        if (now - createdTime < 1000) {
          createdCount++;
        } else {
          existingCount++;
        }
      }
    }
  }

  log(`✓ Topics check complete: ${createdCount} created, ${existingCount} already existed`, 'success');
  return { created: createdCount, existing: existingCount };
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Topic selection
  elements.topicSelect.addEventListener('change', (e) => {
    state.topic = e.target.value;
    validateForm();
  });

  // Grade level selection
  elements.gradeLevelSelect.addEventListener('change', (e) => {
    state.gradeLevel = e.target.value;
    validateForm();
  });

  // Panel count
  elements.panelCount.addEventListener('change', (e) => {
    state.panelCount = parseInt(e.target.value);
  });

  // Generate button
  elements.generateBtn.addEventListener('click', generatePanels);

  // Save to story button
  elements.saveToStoryBtn.addEventListener('click', saveAsStory);

  // Publish button
  if (elements.publishBtn) {
    elements.publishBtn.addEventListener('click', openPublishModal);
    
    // Modal event listeners
    const confirmPublishBtn = document.getElementById('confirmPublishBtn');
    const cancelPublishBtn = document.getElementById('cancelPublishBtn');
    const publishModal = document.getElementById('publishModal');
    
    if (confirmPublishBtn) {
      confirmPublishBtn.addEventListener('click', confirmPublish);
    }
    if (cancelPublishBtn) {
      cancelPublishBtn.addEventListener('click', closePublishModal);
    }
    // Close modal when clicking outside
    if (publishModal) {
      publishModal.addEventListener('click', (e) => {
        if (e.target === publishModal) {
          closePublishModal();
        }
      });
    }
    
    // Update preview when topic/grade changes
    const publishTopicSelect = document.getElementById('publishTopicSelect');
    const publishGradeSelect = document.getElementById('publishGradeSelect');
    const publishTopicCustom = document.getElementById('publishTopicCustom');
    const publishStoryTitle = document.getElementById('publishStoryTitle');
    
    if (publishTopicSelect) {
      publishTopicSelect.addEventListener('change', () => {
        // Show/hide custom input based on selection
        if (publishTopicCustom) {
          if (publishTopicSelect.value === 'custom') {
            publishTopicCustom.classList.remove('hidden');
            publishTopicCustom.focus();
          } else {
            publishTopicCustom.classList.add('hidden');
            publishTopicCustom.value = '';
          }
        }
        updatePublishPreview();
      });
    }
    
    // Update preview when custom topic name is typed
    if (publishTopicCustom) {
      publishTopicCustom.addEventListener('input', () => {
        updatePublishPreview();
      });
    }
  }
}

// ============================================================================
// Initialize
// ============================================================================

async function init() {
  console.log('🎨 Comic Panel Generator initialized');
  
  // Setup event listeners
  setupEventListeners();
  
  // Load topic guides from Supabase storage
  await loadTopicGuides();
  
  // Load student avatars from Supabase storage
  await loadAvatars();
  
  // Ensure all topics exist in database (for chat functionality)
  try {
    await ensureAllTopicsExist();
  } catch (error) {
    console.warn('[comic-generator] Failed to ensure topics exist:', error);
    // Don't block initialization if this fails
  }
  
  // Initialize publish button state
  updatePublishButtonState();
  
  // Initial validation
  validateForm();

  // Tab switching
  const generatorTab = document.getElementById('tabGenerator');
  const previousTab = document.getElementById('tabPrevious');
  
  if (generatorTab) {
    generatorTab.addEventListener('click', () => switchTab('generator'));
  }
  if (previousTab) {
    previousTab.addEventListener('click', () => switchTab('previous'));
  }
}

// ============================================================================
// Previously Generated Stories
// ============================================================================

/**
 * Load previously generated stories from database
 */
async function loadPreviousStories() {
  const grid = document.getElementById('previousStoriesGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400"><p class="text-sm">Loading...</p></div>';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400"><p class="text-sm">Please log in to view your generated stories.</p></div>';
      return;
    }

    // Load AI-generated stories for current user from ai_stories table
    const { data: stories, error } = await supabase
      .from('ai_stories')
      .select('id, title, cover_url, topic, topic_tag, grade_level, reading_level, created_at, enabled, metadata')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading from ai_stories:', error);
      throw error;
    }
    
    console.log(`Loaded ${stories?.length || 0} stories from ai_stories table`);

    if (error) throw error;

    if (!stories || stories.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-sm font-medium">No generated stories yet</p>
          <p class="text-xs mt-2">Generate your first story to see it here!</p>
        </div>
      `;
      return;
    }

    // Render story cards
    grid.innerHTML = stories.map(story => {
      // Handle enabled column - default to false (draft) if column doesn't exist
      const isPublished = story.enabled === true;
      const statusBadge = isPublished 
        ? '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Published</span>'
        : '<span class="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">Draft</span>';
      
      const createdDate = new Date(story.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      return `
        <div class="bg-white rounded-xl overflow-hidden shadow-lg border-2 border-purple-100 hover:border-purple-300 transition cursor-pointer" data-story-id="${story.id}">
          <div class="relative aspect-video bg-gradient-to-br from-purple-100 to-pink-100">
            ${story.cover_url ? `<img src="${story.cover_url}" alt="${story.title}" class="w-full h-full object-cover" />` : ''}
            <div class="absolute top-2 right-2">${statusBadge}</div>
          </div>
          <div class="p-4">
            <h3 class="font-fredoka font-bold text-slate-700 mb-1 line-clamp-1">${story.title}</h3>
            <p class="text-xs text-slate-500 mb-2">${story.topic_tag || 'No topic'} • ${story.reading_level || 'N/A'}</p>
            <p class="text-xs text-slate-400">Created: ${createdDate}</p>
            <div class="mt-3 flex gap-2">
              <button class="load-story-btn flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-semibold transition" data-story-id="${story.id}">
                Load
              </button>
              ${!isPublished ? `<button class="publish-story-btn px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-semibold transition" data-story-id="${story.id}">
                Publish
              </button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners
    document.querySelectorAll('.load-story-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = btn.getAttribute('data-story-id');
        console.log('Load button clicked, storyId:', storyId);
        if (!storyId) {
          alert('Error: Story ID not found');
          return;
        }
        await loadStoryForEditing(storyId);
      });
    });

    document.querySelectorAll('.publish-story-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = btn.getAttribute('data-story-id');
        await quickPublishStory(storyId);
      });
    });

  } catch (error) {
    console.error('Error loading previous stories:', error);
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-red-400">
        <p class="text-sm">Error loading stories: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Load a story for editing/viewing
 */
async function loadStoryForEditing(storyId) {
  try {
    log('Loading story for editing...', 'info');
    log(`  Looking for story ID: ${storyId}`, 'info');
    
    // Try ai_stories table first (new table)
    let { data: story, error } = await supabase
      .from('ai_stories')
      .select('*')
      .eq('id', storyId)
      .maybeSingle();

    // If not found in ai_stories, try stories table (for backward compatibility)
    if (error || !story) {
      log('  Not found in ai_stories, trying stories table...', 'info');
      const { data: oldStory, error: oldError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .maybeSingle();
      
      if (oldStory) {
        story = oldStory;
        error = null;
        log('  Found in stories table (legacy)', 'info');
      } else if (oldError) {
        error = oldError;
      }
    }

    if (error) {
      log(`  Database error: ${error.message}`, 'error');
      throw error;
    }
    
    if (!story) {
      log(`  Story not found in either table`, 'error');
      throw new Error(`Story not found: ${storyId}`);
    }
    
    log(`  Story found: ${story.title}`, 'success');

    // Load panels from story data
    const panels = story.panels || [];
    
    if (panels.length === 0) {
      alert('This story has no panels. Please generate a new story.');
      return;
    }

    log(`  Found ${panels.length} panels`, 'info');

    // Update state
    state.generatedPanels = panels.map((panel, index) => ({
      panelId: panel.panelId || `panel-${String(index + 1).padStart(2, '0')}`,
      imageUrl: panel.imageUrl,
      narration: panel.narration || '', // Ensure narration is always a string, never undefined
      glossaryTerms: panel.glossaryTerms || [],
      storagePath: null // We don't have this for loaded stories
    }));

    // Extract topic and grade from story
    // New ai_stories schema has topic and grade_level directly
    // Old stories table might have them in metadata
    if (story.topic) {
      // New schema (ai_stories)
      state.topic = story.topic;
      state.gradeLevel = story.grade_level || state.gradeLevel;
    } else if (story.metadata) {
      // Old schema (stories table) - check metadata
      state.topic = story.metadata.topic || (story.metadata.metadata && story.metadata.metadata.topic) || state.topic;
      state.gradeLevel = story.metadata.gradeLevel || (story.metadata.metadata && story.metadata.metadata.gradeLevel) || state.gradeLevel;
    }
    
    // Extract glossary definitions
    if (story.metadata) {
      if (story.metadata.glossaryDefinitions) {
        state.glossaryDefinitions = story.metadata.glossaryDefinitions;
      } else if (story.metadata.metadata && story.metadata.metadata.glossaryDefinitions) {
        state.glossaryDefinitions = story.metadata.metadata.glossaryDefinitions;
      }
    }
    
    log(`  Topic: ${state.topic}, Grade: ${state.gradeLevel}`, 'info');

    // Set saved story ID
    state.savedStoryId = storyId;
    state.isPublished = story.enabled === true;

    // Render panels
    elements.panelGrid.innerHTML = '';
    state.generatedPanels.forEach((panel, index) => {
      renderPanelPreview(index, panel.imageUrl, panel.narration);
    });

    // Update UI
    elements.panelStatus.textContent = `${panels.length} panels loaded`;
    elements.saveSection.classList.remove('hidden');
    updatePublishButtonState();

    // Switch to generator tab
    switchTab('generator');

    log('✓ Story loaded successfully!', 'success');
    log(`  Story ID: ${storyId}`, 'info');
    log(`  Status: ${state.isPublished ? 'Published' : 'Draft'}`, 'info');

  } catch (error) {
    log(`✗ Failed to load story: ${error.message}`, 'error');
    console.error('Load story error:', error);
    alert(`Failed to load story: ${error.message}`);
  }
}

/**
 * Quick publish a story (without modal, using existing topic/grade)
 */
async function quickPublishStory(storyId) {
  if (!confirm('Publish this story to make it visible on the Stories page?')) {
    return;
  }

  try {
    log('Publishing story...', 'info');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // First, get the story to find its topic
    const { data: story, error: storyError } = await supabase
      .from('ai_stories')
      .select('topic, topic_tag')
      .eq('id', storyId)
      .maybeSingle();

    if (storyError) throw storyError;
    if (!story) throw new Error('Story not found');

    const timestamp = new Date().toISOString();

    // Update story to published in ai_stories table
    const updateData = {
      enabled: true,
      published_at: timestamp
    };
    
    const { error: dbError } = await supabase
      .from('ai_stories')
      .update(updateData)
      .eq('id', storyId);

    if (dbError) throw dbError;

    // Create topic in topics table if it doesn't exist
    if (story.topic && story.topic_tag) {
      log('Creating/verifying topic in database...', 'info');
      await createTopicIfNotExists(story.topic, story.topic_tag, TOPIC_DESCRIPTIONS[story.topic] || `Learn about ${story.topic_tag}`);
    }

    log('✓ Story published successfully!', 'success');
    alert('Story published! It will now appear on the Stories page.');

    // Reload previous stories to update status
    await loadPreviousStories();

  } catch (error) {
    log(`✗ Publish failed: ${error.message}`, 'error');
    console.error('Publish error:', error);
    alert(`Failed to publish story: ${error.message}`);
  }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  const generatorTab = document.getElementById('tabGenerator');
  const previousTab = document.getElementById('tabPrevious');
  const generatorContent = document.getElementById('generatorTabContent');
  const previousContent = document.getElementById('previousTabContent');

  if (tabName === 'generator') {
    generatorTab?.classList.add('border-purple-600', 'text-purple-600');
    generatorTab?.classList.remove('border-transparent', 'text-slate-400');
    previousTab?.classList.remove('border-purple-600', 'text-purple-600');
    previousTab?.classList.add('border-transparent', 'text-slate-400');
    generatorContent?.classList.remove('hidden');
    previousContent?.classList.add('hidden');
  } else if (tabName === 'previous') {
    previousTab?.classList.add('border-purple-600', 'text-purple-600');
    previousTab?.classList.remove('border-transparent', 'text-slate-400');
    generatorTab?.classList.remove('border-purple-600', 'text-purple-600');
    generatorTab?.classList.add('border-transparent', 'text-slate-400');
    previousContent?.classList.remove('hidden');
    generatorContent?.classList.add('hidden');
    // Load stories when switching to previous tab
    loadPreviousStories();
  }
}

// Start the app
init();

