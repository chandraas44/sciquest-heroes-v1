/**
 * Supabase Edge Function: generate-panel
 * 
 * This function handles AI-powered comic panel generation:
 * 1. Generate image prompts using GPT-4o based on topic/grade
 * 2. Generate images using Fal.ai Flux-pro/kontext/multi (image-to-image)
 * 3. Save generated images to Supabase Storage
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: For GPT-4o prompt generation
 * - FAL_API_KEY: For Fal.ai image generation
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: For storage operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const FAL_API_KEY = Deno.env.get('FAL_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Fal.ai endpoints
const FAL_KONTEXT_MULTI_URL = 'https://fal.run/fal-ai/flux-pro/kontext/multi'

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// Panel Templates (embedded for performance)
// ============================================================================

const SCENE_TEMPLATES: Record<string, Record<string, { vocabulary: string[], concepts: string[], scenes: any[] }>> = {
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
        { title: 'Sharing Oxygen', description: 'Fresh oxygen bubbles float out of the leaf into the air' }
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
        { title: 'Oxygen Release', description: 'O2 molecules released as a byproduct, animals breathing it' }
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
        { title: 'The Complete Picture', description: 'Overview showing both stages working together' }
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
        { title: 'Space Exploration', description: 'Looking out at the vast universe beyond' }
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
        { title: 'Comets and Beyond', description: 'A comet with its tail, pointing to the Kuiper Belt' }
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
        { title: 'Exoplanets and Beyond', description: 'Looking at planets around other stars' }
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
        { title: 'Round and Round', description: 'Complete cycle shown with arrows connecting all stages' }
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
        { title: 'Collection Complete', description: 'Water collecting in oceans, lakes, groundwater' }
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
        { title: 'Climate Connections', description: 'How the water cycle affects and is affected by climate' }
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
        { title: 'Team Body', description: 'All systems working together harmoniously' }
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
        { title: 'Systems Connected', description: 'How all systems depend on each other' }
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
        { title: 'Integrated Systems', description: 'Complex interactions between all systems' }
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
        { title: 'Electricity Everywhere', description: 'All the things powered by electricity in daily life' }
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
        { title: 'Building Circuits', description: 'Child building a simple circuit' }
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
        { title: 'Power Grid', description: 'How electricity reaches our homes' }
      ]
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate image prompts using GPT-4o
 */
async function generatePromptsWithGPT(
  topic: string,
  gradeLevel: string,
  panelCount: number,
  guideCharacter: any,
  studentCharacter: string
): Promise<{ prompts: string[], sceneDescriptions: string[] }> {
  
  const template = SCENE_TEMPLATES[topic]?.[gradeLevel]
  if (!template) {
    throw new Error(`No template found for topic: ${topic}, grade: ${gradeLevel}`)
  }

  const scenes = template.scenes.slice(0, panelCount)
  const vocabulary = template.vocabulary.join(', ')
  const concepts = template.concepts.join('; ')

  const systemPrompt = `You are an expert at creating image generation prompts for educational comic panels.
Your prompts will be used with Fal.ai Flux image generation to create Pixar-style educational comics.

Important guidelines:
1. Create vivid, detailed descriptions that will generate consistent, high-quality images
2. Always include the guide character (${guideCharacter.name}) and student character (${studentCharacter})
3. Use bright, vibrant colors suitable for children
4. Include specific Pixar-style animation cues
5. Keep the educational content age-appropriate for ${gradeLevel}
6. Ensure characters maintain consistent appearance across all panels
7. Focus on clear visual storytelling`

  const userPrompt = `Create ${panelCount} detailed image generation prompts for an educational comic about ${topic} for grade ${gradeLevel}.

Topic vocabulary: ${vocabulary}
Key concepts: ${concepts}

Guide character: ${guideCharacter.name} - ${guideCharacter.description}
Student character: ${studentCharacter}

Scene descriptions to base prompts on:
${scenes.map((s: any, i: number) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

For each scene, create a detailed prompt that:
- Describes the visual scene in detail (setting, lighting, mood)
- Positions the characters naturally in the scene
- Includes relevant scientific imagery for the concept
- Uses Pixar-style animation descriptors
- Is 2-3 sentences long

Return your response as a JSON object with two arrays:
1. "prompts": Array of image generation prompts
2. "sceneDescriptions": Array of brief narration texts for each panel (what the characters might say)`

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
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`GPT-4o error: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const content = JSON.parse(data.choices[0].message.content)
  
  return {
    prompts: content.prompts || [],
    sceneDescriptions: content.sceneDescriptions || content.prompts.map(() => '')
  }
}

/**
 * Generate image using Fal.ai Flux-pro/kontext/multi (image-to-image)
 */
async function generateImageWithFal(
  prompt: string,
  guideImageUrl: string,
  avatarImageUrl: string,
  panelIndex: number
): Promise<{ imageUrl?: string, imageBase64?: string }> {
  
  // Prepare the request for Flux kontext/multi
  // This model takes reference images and generates new images based on them
  const requestBody = {
    prompt: `${prompt}. Pixar-style 3D animation, bright colors, expressive characters, educational children's comic panel, high quality, detailed.`,
    image_urls: [guideImageUrl, avatarImageUrl].filter(url => url && url.length > 0),
    num_images: 1,
    image_size: 'square_hd', // 1024x1024
    output_format: 'png',
    guidance_scale: 7.5,
    num_inference_steps: 28,
    seed: panelIndex * 1000 + Date.now() % 1000 // Consistent but varied seeds
  }

  console.log(`Generating panel ${panelIndex + 1} with Fal.ai...`)
  console.log(`Reference images: ${requestBody.image_urls.length}`)

  const response = await fetch(FAL_KONTEXT_MULTI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Fal.ai error:', error)
    throw new Error(`Fal.ai error: ${error}`)
  }

  const result = await response.json()
  
  // Handle different response formats from Fal.ai
  if (result.images && result.images.length > 0) {
    return { imageUrl: result.images[0].url }
  } else if (result.image) {
    return { imageUrl: result.image.url }
  } else if (result.output) {
    return { imageUrl: result.output }
  }
  
  throw new Error('No image returned from Fal.ai')
}

/**
 * Save generated panel to Supabase Storage
 */
async function savePanelToStorage(
  supabase: any,
  topic: string,
  gradeLevel: string,
  panelIndex: number,
  imageUrl: string,
  imageBase64?: string
): Promise<{ storagePath: string, publicUrl: string }> {
  
  const fileName = `panel-${String(panelIndex + 1).padStart(2, '0')}.png`
  const storagePath = `${topic}/${gradeLevel}/${fileName}`
  
  let imageBuffer: ArrayBuffer
  
  if (imageBase64) {
    // Convert base64 to buffer
    const binaryString = atob(imageBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    imageBuffer = bytes.buffer
  } else if (imageUrl) {
    // Fetch image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    imageBuffer = await imageResponse.arrayBuffer()
  } else {
    throw new Error('No image data provided')
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('generated_panels')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    })
  
  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Storage error: ${error.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('generated_panels')
    .getPublicUrl(storagePath)
  
  return { storagePath, publicUrl }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify environment variables
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
    if (!FAL_API_KEY) throw new Error('FAL_API_KEY not configured')
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL not configured')
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    const body = await req.json()
    const { action } = body

    console.log(`Processing action: ${action}`)

    switch (action) {
      case 'generate-prompts': {
        const { topic, gradeLevel, panelCount, guideCharacter, studentCharacter } = body
        
        if (!topic || !gradeLevel || !panelCount) {
          throw new Error('Missing required fields: topic, gradeLevel, panelCount')
        }

        const result = await generatePromptsWithGPT(
          topic,
          gradeLevel,
          panelCount,
          guideCharacter,
          studentCharacter
        )

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'generate-image': {
        const { prompt, guideImageUrl, avatarImageUrl, panelIndex } = body
        
        if (!prompt) {
          throw new Error('Missing required field: prompt')
        }

        const result = await generateImageWithFal(
          prompt,
          guideImageUrl || '',
          avatarImageUrl || '',
          panelIndex || 0
        )

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'save-panel': {
        const { topic, gradeLevel, panelIndex, imageBase64, imageUrl } = body
        
        if (!topic || !gradeLevel || panelIndex === undefined) {
          throw new Error('Missing required fields: topic, gradeLevel, panelIndex')
        }

        const result = await savePanelToStorage(
          supabase,
          topic,
          gradeLevel,
          panelIndex,
          imageUrl,
          imageBase64
        )

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

