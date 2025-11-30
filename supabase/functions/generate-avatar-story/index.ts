// Supabase Edge Function: generate-avatar-story
// Generates a 6-panel, kid-friendly story for a given seed story + avatar context.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
// This key is used for fal.ai Nano Banana image generation.
// For backward compatibility we keep the env name `NANO_BANANA_API_KEY`.
const NANO_BANANA_API_KEY = Deno.env.get('NANO_BANANA_API_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const ANTHROPIC_STORY_MODEL = Deno.env.get('ANTHROPIC_STORY_MODEL') ?? 'claude-sonnet-4-20250514';

// Forced global avatar configuration:
// For now, ALL generated avatar stories will star this single avatar,
// regardless of the avatar passed in the request body or stored in the user profile.
// If you ever want to make this configurable, you can move these into env vars.
const FORCED_AVATAR_NAME = 'Aria';
const FORCED_AVATAR_URL =
  'https://mojtgwvpexgfawkeofwl.supabase.co/storage/v1/object/public/avatars/Aria.png';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[generate-avatar-story] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type AvatarInfo = {
  name?: string | null;
  imageUrl?: string | null;
};

type AudienceInfo = {
  ageRange?: string | null;
  gradeLevel?: string | null;
};

type GenerateAvatarStoryRequest = {
  storyId: string;
  storySummary: string;
  topicTag?: string | null;
  avatar?: AvatarInfo | null;
  audience?: AudienceInfo | null;
};

type SpeechBubble = {
  speaker: string;
  text: string;
  tone?: string;
};

type GeneratedPanel = {
  panelId: string;
  imageUrl: string | null;
  imagePrompt: string;
  narration: string;
  speechBubbles: SpeechBubble[];
  glossaryTerms: string[];
  chatTopicId?: string | null;
  ctaLabel?: string | null;
};

type GenerateAvatarStoryResponse = {
  storyId: string;
  title: string;
  panels: GeneratedPanel[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('[generate-avatar-story] Incoming request');

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');

    let userId: string | null = null;

    if (jwt) {
      const {
        data: { user },
        error: userError
      } = await supabaseAdmin.auth.getUser(jwt);

      if (userError || !user) {
        console.warn('[generate-avatar-story] Failed to resolve user from JWT, continuing without user context', userError);
      } else {
        userId = user.id;
      }
    } else {
      console.warn('[generate-avatar-story] Missing Authorization header, continuing in anonymous mode');
    }

    const body = (await req.json()) as GenerateAvatarStoryRequest;

    const storyId = body?.storyId;
    const storySummary = (body?.storySummary ?? '').trim();
    let topicTag = body?.topicTag ?? null;
    let avatar = body?.avatar ?? null;
    let audience = body?.audience ?? null;

    if (!storyId) {
      console.warn('[generate-avatar-story] Missing storyId in request body');
      return jsonResponse({ error: 'storyId is required' }, 400);
    }

    if (!storySummary) {
      console.warn('[generate-avatar-story] Missing storySummary in request body');
      return jsonResponse({ error: 'storySummary is required' }, 400);
    }

    // Load base story metadata (title/topic) for better prompts
    let storyTitle = 'Your Adventure';
    try {
      const { data: storyRow, error: storyError } = await supabaseAdmin
        .from('stories')
        .select('id, title, topic_tag')
        .eq('id', storyId)
        .maybeSingle();

      if (storyError) {
        console.warn('[generate-avatar-story] Failed to load base story', storyError);
      } else if (storyRow) {
        storyTitle = storyRow.title || storyTitle;
        topicTag = topicTag || storyRow.topic_tag || null;
      }
    } catch (error) {
      console.warn('[generate-avatar-story] Error loading story metadata', error);
    }

    // If we have a user, try to enrich avatar + audience from profile
    let avatarName: string = avatar?.name || 'Hero';
    let avatarImageUrl: string | null = avatar?.imageUrl ?? null;
    let gradeLevel: string | null = audience?.gradeLevel ?? null;

    if (userId) {
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('first_name, full_name, username, avatar_url, grade_level')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('[generate-avatar-story] Failed to load user profile', profileError);
        } else if (profile) {
          avatarName = avatar?.name || profile.first_name || profile.full_name || profile.username || avatarName;
          avatarImageUrl = avatar?.imageUrl ?? profile.avatar_url ?? avatarImageUrl;
          gradeLevel = gradeLevel || profile.grade_level || null;
        }
      } catch (error) {
        console.warn('[generate-avatar-story] Error loading user profile', error);
      }
    }

    // Force global avatar (Aria) for all generated stories, regardless of user/profile input.
    // This keeps the visual character consistent across the experience.
    avatarName = FORCED_AVATAR_NAME;
    avatarImageUrl = FORCED_AVATAR_URL;

    const ageRange = audience?.ageRange ?? 'Ages 7–9';
    const effectiveTopic = topicTag || 'science adventure';

    console.log('[generate-avatar-story] Generating avatar story', {
      storyId,
      storyTitle,
      topic: effectiveTopic,
      avatarName,
      hasAvatarImage: Boolean(avatarImageUrl),
      ageRange,
      gradeLevel,
      hasAnthropic: Boolean(ANTHROPIC_API_KEY),
      hasNanoBanana: Boolean(NANO_BANANA_API_KEY)
    });

    // Generate story using Anthropic Claude 3.5 Sonnet if available, otherwise use template
    let panels: GeneratedPanel[];
    if (ANTHROPIC_API_KEY) {
      try {
        panels = await generateStoryWithAnthropic({
          storyId,
          storyTitle,
          storySummary,
          topic: effectiveTopic,
          avatarName,
          avatarImageUrl,
          ageRange,
          gradeLevel
        });
      } catch (error) {
        console.error('[generate-avatar-story] Anthropic generation failed, falling back to template', error);
        panels = buildAvatarPanels({
          storyId,
          storyTitle,
          storySummary,
          topic: effectiveTopic,
          avatarName,
          ageRange
        });
      }
    } else {
      console.warn('[generate-avatar-story] ANTHROPIC_API_KEY not set, using template');
      panels = buildAvatarPanels({
        storyId,
        storyTitle,
        storySummary,
        topic: effectiveTopic,
        avatarName,
        ageRange
      });
    }

    // Generate images using Nano Banana if available
    if (NANO_BANANA_API_KEY && userId) {
      try {
        await generateImagesWithNanoBanana({
          panels,
          userId,
          storyId,
          avatarName,
          avatarImageUrl
        });
      } catch (error) {
        console.error('[generate-avatar-story] Nano Banana image generation failed, continuing without images', error);
        // Continue without images - panels will have imageUrl: null
      }
    } else {
      console.warn('[generate-avatar-story] NANO_BANANA_API_KEY not set or no userId, skipping image generation');
    }

    const responseBody: GenerateAvatarStoryResponse = {
      storyId,
      title: storyTitle,
      panels
    };

    return jsonResponse(responseBody, 200);
  } catch (error) {
    console.error('[generate-avatar-story] Unexpected error', error);
    return jsonResponse({ error: 'Unexpected error generating avatar story' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });
}

async function generateStoryWithAnthropic(args: {
  storyId: string;
  storyTitle: string;
  storySummary: string;
  topic: string;
  avatarName: string;
  avatarImageUrl: string | null;
  ageRange: string;
  gradeLevel: string | null;
}): Promise<GeneratedPanel[]> {
  const { storyTitle, storySummary, topic, avatarName, avatarImageUrl, ageRange, gradeLevel } = args;

  // Build avatar description
  let avatarDescription = avatarName;
  if (avatarImageUrl) {
    // Try to extract avatar name from URL (e.g., "Bolt.png" -> "Bolt")
    const urlParts = avatarImageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1]?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || '';
    if (fileName) {
      avatarDescription = `${avatarName} (a character that looks like ${fileName})`;
    }
  }

  const systemPrompt = `You are a creative children's story writer for kids. Generate a 6-panel, kid-friendly comic-style story that:
- Is safe, uplifting, and educational
- Has exactly 6 panels with a clear beginning, middle, and end
- Includes the avatar character "${avatarName}" as the main character, appearing in every panel
- Uses short, kid-friendly narration (1–3 sentences per panel)
- May include short quoted lines of what characters say INSIDE the narration (for example: Aria whispered, "This is amazing!").
- Does NOT use dialogue labels or script formatting like "Aria:" or "Guide:" and does NOT reference speech bubbles.
- Uses clear American English with correct spelling and simple grammar at roughly Grade 3–4 reading level.
- Is appropriate for ${ageRange}${gradeLevel ? ` (Grade ${gradeLevel})` : ''}
- Focuses on the topic: ${topic}
- Reuses glossary terms across panels when it makes sense, to reinforce learning

Return ONLY valid JSON in this exact format and ensure there are exactly 6 items in the panels array. For imagePrompt, clearly describe the scene, characters, and setting, and explicitly avoid mentioning any text, letters, words, signs, or speech bubbles in the image:
{
  "title": "Story Title",
  "panels": [
    {
      "panelId": "panel-01",
      "imagePrompt": "Detailed description for comic art showing the scene with the main character, with no text or speech bubbles in the image",
      "narration": "Narration text for this panel (1–3 kid-friendly sentences, may include short quoted speech inside the description, but no script-style labels)",
      "glossaryTerms": ["term1", "term2"],
      "chatTopicId": "topic-id",
      "ctaLabel": "Call to action text"
    }
  ]
}`;

  const userPrompt = `Create a 6-panel comic-style story about: ${storyTitle}

Story Summary: ${storySummary}

Topic: ${topic}

Main Character: ${avatarDescription} - This character should be featured prominently in every panel.

Make it adventurous, engaging, and kid-friendly for ${ageRange}. Keep narration for each panel to 1–3 simple sentences that describe what is happening in the scene. You can include a few short quoted lines of what characters say inside the narration, but do not format them as script-style \"Name: ...\" lines.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_STORY_MODEL,
        max_tokens: 2600,
        temperature: 0.4,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const contentBlock = Array.isArray(data.content) && data.content[0] && typeof data.content[0].text === 'string'
      ? data.content[0].text
      : null;

    if (!contentBlock) {
      throw new Error('No content in Anthropic response');
    }

    const parsed = JSON.parse(contentBlock);
    if (!parsed.panels || !Array.isArray(parsed.panels) || parsed.panels.length !== 6) {
      throw new Error('Invalid panel structure from Anthropic');
    }

    // Ensure all panels have required fields
    return parsed.panels.map((panel: any, index: number) => ({
      panelId: panel.panelId || `panel-${String(index + 1).padStart(2, '0')}`,
      imageUrl: null, // Will be filled by image generation
      imagePrompt: panel.imagePrompt || '',
      narration: panel.narration || '',
      // Speech bubbles are no longer used in the UI; we keep the field for compatibility but leave it empty.
      speechBubbles: [],
      glossaryTerms: Array.isArray(panel.glossaryTerms) ? panel.glossaryTerms : [],
      chatTopicId: panel.chatTopicId || null,
      ctaLabel: panel.ctaLabel || null
    }));
  } catch (error) {
    console.error('[generate-avatar-story] OpenAI generation error', error);
    throw error;
  }
}

async function generateImagesWithNanoBanana(args: {
  panels: GeneratedPanel[];
  userId: string;
  storyId: string;
  avatarName: string;
  avatarImageUrl: string | null;
}): Promise<void> {
  const { panels, userId, storyId, avatarName, avatarImageUrl } = args;

  // Build avatar description for image prompts
  let avatarVisualDescription = avatarName;
  if (avatarImageUrl) {
    const urlParts = avatarImageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1]?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || '';
    if (fileName) {
      avatarVisualDescription = `${avatarName}, a character styled like ${fileName}`;
    }
  }

  // Generate images for each panel
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    
    // Add delay between panels to avoid rate limits (especially for accounts with < $5 credit)
    // Free/low-credit accounts: 6 requests/minute with burst of 1
    if (i > 0) {
      const delayMs = 12000; // 12 seconds between requests (5 requests per minute, safe margin)
      console.log(`[generate-avatar-story] Waiting ${delayMs}ms before generating panel ${i + 1} to avoid rate limits`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // Enhance image prompt with avatar and overall scene description.
    // Important: we explicitly ask for NO text or speech bubbles in the image.
    const enhancedPrompt = `Kid-friendly comic-style illustration panel: ${panel.imagePrompt}. 
Character: ${avatarVisualDescription} should be prominently featured.
Style: Bright, colorful, animated cartoon style, comic book illustration.
No text, no letters, no words, no captions, and no speech bubbles anywhere in the image.
Safe for children, educational, engaging.`;

    try {
      // Retry logic for rate limits and transient errors
      let generateResponse: Response | null = null;
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        // Call fal.ai Nano Banana model
        generateResponse = await fetch('https://fal.run/fal-ai/nano-banana', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // IMPORTANT: fal.ai expects `Key` auth here, not Bearer
            Authorization: `Key ${NANO_BANANA_API_KEY}`
          },
          body: JSON.stringify({
            // For fal-ai/nano-banana, parameters are expected at the top level,
            // not nested under an `input` field. The 422 error you saw
            // ("Field required: body.prompt") indicated this structure.
            prompt: enhancedPrompt,
            negative_prompt:
              'text, speech bubbles, captions, subtitles, UI, watermarks, logos, letters, words',
            image_size: 'square_hd',
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
            output_format: 'png'
          })
        });

        if (generateResponse.ok) {
          break; // Success, exit retry loop
        }

        const errorText = await generateResponse.text();
        let retryAfterSeconds = 0;

        if (generateResponse.status === 429) {
          const retryAfterHeader = generateResponse.headers.get('Retry-After');
          retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 10 : 10;
          console.warn(
            `[generate-avatar-story] fal.ai rate limit hit for panel ${i + 1}. Waiting ${retryAfterSeconds}s before retry ${retries + 1}/${maxRetries}`
          );
        } else if (generateResponse.status >= 500 && generateResponse.status < 600) {
          retryAfterSeconds = 5;
          console.warn(
            `[generate-avatar-story] fal.ai server error for panel ${i + 1} (status ${generateResponse.status}). Retrying in ${retryAfterSeconds}s...`
          );
        } else {
          console.error(
            `[generate-avatar-story] fal.ai request failed for panel ${i + 1} with status ${generateResponse.status}:`,
            errorText
          );
          break; // Non-retryable error
        }

        if (retries < maxRetries && retryAfterSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
          retries++;
          continue;
        } else {
          console.error(
            `[generate-avatar-story] fal.ai request failed for panel ${i + 1} after ${maxRetries} retries. Skipping image generation.`
          );
          break;
        }
      }

      if (!generateResponse || !generateResponse.ok) {
        console.warn(`[generate-avatar-story] Skipping image generation for panel ${i + 1}`);
        continue; // Skip this panel, continue with others
      }

      const json = await generateResponse.json();
      let imageUrl: string | null = null;

      // fal.ai responses typically look like: { images: [{ url: 'https://...' }, ...], ... }
      const images = (json && (json.images || json.output?.images)) || [];
      if (Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];
        if (typeof firstImage === 'string') {
          imageUrl = firstImage;
        } else if (firstImage && typeof firstImage.url === 'string') {
          imageUrl = firstImage.url;
        }
      }

      if (!imageUrl) {
        console.warn(
          `[generate-avatar-story] fal.ai response did not contain an image URL for panel ${i + 1}`
        );
        continue;
      }

      // Download image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error(`[generate-avatar-story] Failed to download image for panel ${i + 1}`);
        continue;
      }

      const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());

      // Upload to Supabase Storage
      const storagePath = `avatar-stories/${userId}/${storyId}/${panel.panelId}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('comic-images')
        .upload(storagePath, imageBytes, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.statusCode === '404' || uploadError.message?.includes('Bucket not found')) {
          console.error(
            `[generate-avatar-story] Storage bucket 'comic-images' not found. Please run the migration: 20250128000001_create_comic_images_bucket.sql`
          );
        } else {
          console.error(
            `[generate-avatar-story] Failed to upload image for panel ${i + 1}`,
            uploadError
          );
        }
        continue;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('comic-images')
        .getPublicUrl(storagePath);

      panel.imageUrl = urlData.publicUrl;
      console.log(`[generate-avatar-story] Generated and uploaded image for ${panel.panelId}`);
    } catch (error) {
      console.error(`[generate-avatar-story] Error generating image for panel ${i + 1}`, error);
      // Continue with next panel
    }
  }
}

function firstSentence(text: string, maxChars = 140): string {
  if (!text) return '';
  const trimmed = text.trim();
  const periodIndex = trimmed.indexOf('.');
  if (periodIndex > 0 && periodIndex < maxChars) {
    return trimmed.slice(0, periodIndex + 1);
  }
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).replace(/\s+\S*$/, '') + '...';
}

function buildAvatarPanels(args: {
  storyId: string;
  storyTitle: string;
  storySummary: string;
  topic: string;
  avatarName: string;
  ageRange: string;
}): GeneratedPanel[] {
  const { storyTitle, storySummary, topic, avatarName, ageRange } = args;

  const summarySnippet = firstSentence(storySummary, 160);
  const friendlyTopic = topic.toLowerCase();

  const glossaryBase =
    friendlyTopic.includes('photosynthesis') || friendlyTopic.includes('plant')
      ? ['leaf', 'sunlight', 'plant']
      : friendlyTopic.includes('space')
      ? ['planet', 'gravity', 'orbit']
      : friendlyTopic.includes('history')
      ? ['timeline', 'culture', 'tradition']
      : ['curiosity', 'adventure', 'discovery'];

  const baseChatTopicId =
    friendlyTopic.includes('photosynthesis') || friendlyTopic.includes('plant')
      ? 'photosynthesis'
      : friendlyTopic.includes('space')
      ? 'space-science'
      : friendlyTopic.includes('history')
      ? 'history-adventure'
      : 'science-adventure';

  const panels: GeneratedPanel[] = [
    {
      panelId: 'panel-01',
      imageUrl: null,
      imagePrompt: `Kid-friendly comic panel of ${avatarName} arriving in the world of "${storyTitle}", excited to explore a ${friendlyTopic} adventure. Bright colors, big smiles, safe for ${ageRange}.`,
      narration: `${avatarName} steps into a brand-new adventure. Today, they are curious about ${friendlyTopic} and ready to explore!`,
      speechBubbles: [],
      glossaryTerms: glossaryBase.slice(0, 2),
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask a question about this adventure'
    },
    {
      panelId: 'panel-02',
      imageUrl: null,
      imagePrompt: `${avatarName} meets a friendly guide character who explains the main idea using simple objects and gestures, in a fun, cozy environment.`,
      narration: `A friendly guide appears and shows ${avatarName} an easy way to picture the big idea. They turn tricky facts into a simple story that makes sense.`,
      speechBubbles: [],
      glossaryTerms: glossaryBase.slice(1, 3),
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask the guide to explain more'
    },
    {
      panelId: 'panel-03',
      imageUrl: null,
      imagePrompt: `${avatarName} trying a hands-on mini experiment or imaginative activity to explore ${friendlyTopic}, with the guide cheering them on.`,
      narration: `${avatarName} tries a small experiment, changing one thing and watching what happens. Each tiny change helps them understand the adventure more clearly.`,
      speechBubbles: [],
      glossaryTerms: ['experiment', 'observe'],
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask what changed in the experiment'
    },
    {
      panelId: 'panel-04',
      imageUrl: null,
      imagePrompt: `Close-up of ${avatarName} pointing at a simple chart or scene that shows a clear pattern or cause-and-effect about the topic.`,
      narration: `Together, they spot patterns and connections. ${avatarName} begins to say, "Ohhh, I get it now!" as the pieces of the story click together.`,
      speechBubbles: [],
      glossaryTerms: ['pattern', 'cause and effect'],
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask about the pattern they found'
    },
    {
      panelId: 'panel-05',
      imageUrl: null,
      imagePrompt: `${avatarName} confidently explaining the idea to a new friend, with warm colors and encouraging expressions.`,
      narration: `Now ${avatarName} can explain the idea in their own words. Teaching it to a new friend makes the adventure feel real and exciting.`,
      speechBubbles: [],
      glossaryTerms: ['explain', 'share'],
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask how to explain this to a friend'
    },
    {
      panelId: 'panel-06',
      imageUrl: null,
      imagePrompt: `${avatarName} and the guide celebrating under a bright sky, thinking about the next fun question to explore.`,
      narration: `The adventure ends with a big smile. ${avatarName} feels proud, and the guide reminds them that every question can lead to another fun journey.`,
      speechBubbles: [],
      glossaryTerms: ['celebrate', 'curiosity'],
      chatTopicId: baseChatTopicId,
      ctaLabel: 'Ask what to explore next'
    }
  ];

  // Lightly weave in the summary snippet in the first panel for extra context.
  if (summarySnippet) {
    panels[0].narration = `${panels[0].narration} In this adventure: ${summarySnippet}`;
  }

  return panels;
}


