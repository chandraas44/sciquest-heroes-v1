// Supabase Edge Function: generate-comic
// Generates (or reuses) a 6-panel comic for a given story and user,
// saves a placeholder PDF into the `comic-pdfs` bucket, and tracks
// metadata in the `generated_comics` table.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type GenerateComicRequest = {
  storyId: string;
};

type Panel = {
  index: number;
  narration: string;
  science_fact: string;
  speech_bubbles: {
    speaker: string;
    text: string;
    tone?: string;
  }[];
};

type PanelsJson = {
  storyId: string;
  avatar?: {
    url?: string | null;
    name?: string | null;
  };
  panels: Panel[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('[generate-comic] Incoming request');

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('[generate-comic] Failed to resolve user from JWT', userError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as GenerateComicRequest;
    const storyId = body?.storyId;

    if (!storyId) {
      console.warn('[generate-comic] Missing storyId in request body');
      return jsonResponse({ error: 'storyId is required' }, 400);
    }

    const userId = user.id;

    console.log('[generate-comic] Resolved user and story', { userId, storyId });

    // 1. Check for an existing ready comic for this user + story
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('generated_comics')
      .select('id, pdf_path, panel_count, panels_json')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.warn('[generate-comic] Failed to check existing comics', existingError);
    }

    if (existing) {
      const existingPanelsJson = (existing.panels_json as PanelsJson) ?? null;
      console.log('[generate-comic] Reusing existing generated comic', {
        userId,
        storyId,
        comicId: existing.id,
        panelCount: existing.panel_count
      });
      return jsonResponse({
        reused: true,
        comicId: existing.id,
        pdfPath: existing.pdf_path,
        panelCount: existing.panel_count,
        panels: existingPanelsJson?.panels ?? []
      });
    }

    // 2. Load base story metadata (optional but helpful for prompts)
    const { data: storyRow, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('id, title, topic_tag, summary')
      .eq('id', storyId)
      .maybeSingle();

    if (storyError) {
      console.warn('[generate-comic] Failed to load base story', storyError);
    } else {
      console.log('[generate-comic] Loaded base story metadata', {
        storyId,
        title: storyRow?.title,
        topic: storyRow?.topic_tag
      });
    }

    // 3. Load avatar info for personalization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('first_name, full_name, username, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('[generate-comic] Failed to load user profile', profileError);
    } else {
      console.log('[generate-comic] Loaded user profile for personalization', {
        userId,
        hasAvatar: Boolean(profile?.avatar_url)
      });
    }

    const avatarName =
      profile?.first_name || profile?.full_name || profile?.username || 'Hero';

    // 4. Generate stub 6-panel content (placeholder for real AI pipeline)
    const panels: Panel[] = buildStubPanels({
      storyId,
      storyTitle: storyRow?.title ?? 'Science Adventure',
      topic: storyRow?.topic_tag ?? 'science',
      summary: storyRow?.summary ?? '',
      avatarName
    });

    const panelsJson: PanelsJson = {
      storyId,
      avatar: {
        url: profile?.avatar_url ?? null,
        name: avatarName
      },
      panels
    };

    // 5. Create a simple placeholder "PDF" and upload to comic-pdfs bucket
    const pdfPath = buildPdfPath(userId, storyId);
    const pdfContent = buildPlaceholderPdfContent({
      storyTitle: storyRow?.title ?? 'Science Adventure',
      avatarName,
      panels
    });

    const pdfBytes = new TextEncoder().encode(pdfContent);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('comic-pdfs')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[generate-comic] Failed to upload PDF', uploadError);
      return jsonResponse({ error: 'Failed to upload comic PDF' }, 500);
    }

    console.log('[generate-comic] Uploaded placeholder PDF', { pdfPath });

    // 6. Insert generated_comics row
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('generated_comics')
      .insert({
        user_id: userId,
        story_id: storyId,
        pdf_path: pdfPath,
        panel_count: panels.length,
        panels_json: panelsJson,
        status: 'ready'
      })
      .select('id, pdf_path, panel_count, panels_json')
      .single();

    if (insertError || !inserted) {
      console.error('[generate-comic] Failed to insert generated_comics row', insertError);
      return jsonResponse({ error: 'Failed to save generated comic' }, 500);
    }

    const insertedPanelsJson = (inserted.panels_json as PanelsJson) ?? panelsJson;

    console.log('[generate-comic] Created new generated comic', {
      userId,
      storyId,
      comicId: inserted.id,
      panelCount: inserted.panel_count
    });

    return jsonResponse({
      reused: false,
      comicId: inserted.id,
      pdfPath: inserted.pdf_path,
      panelCount: inserted.panel_count,
      panels: insertedPanelsJson.panels
    });
  } catch (error) {
    console.error('[generate-comic] Unexpected error', error);
    return jsonResponse({ error: 'Unexpected error generating comic' }, 500);
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

function buildPdfPath(userId: string, storyId: string): string {
  const safeStoryId = storyId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `user-comics/${userId}/${safeStoryId}/${timestamp}.pdf`;
}

function buildStubPanels(args: {
  storyId: string;
  storyTitle: string;
  topic: string;
  summary: string;
  avatarName: string;
}): Panel[] {
  const { storyTitle, topic, avatarName } = args;

  const panels: Panel[] = [
    {
      index: 0,
      narration: `${avatarName} is curious about ${topic} and starts a new adventure.`,
      science_fact:
        'Science helps us ask questions and find answers about the world around us.',
      speech_bubbles: [
        {
          speaker: avatarName,
          text: 'I wonder how this really works...',
          tone: 'curious'
        },
        {
          speaker: 'Guide',
          text: "Great question! Let's explore it together.",
          tone: 'friendly'
        }
      ]
    },
    {
      index: 1,
      narration: `The guide shows ${avatarName} a simple model to explain the idea.`,
      science_fact:
        'Scientists use models, like pictures and diagrams, to explain big ideas in simple ways.',
      speech_bubbles: [
        {
          speaker: 'Guide',
          text: 'Imagine this picture is a tiny world we can zoom into.',
          tone: 'encouraging'
        }
      ]
    },
    {
      index: 2,
      narration: `${avatarName} looks closely and starts to notice patterns.`,
      science_fact:
        'Looking for patterns is a powerful way to understand how things behave.',
      speech_bubbles: [
        {
          speaker: avatarName,
          text: "I see the same thing happening again and again!",
          tone: 'excited'
        }
      ]
    },
    {
      index: 3,
      narration:
        'They test a simple idea by changing one thing and watching what happens.',
      science_fact:
        'In an experiment, scientists change one thing at a time so they know what caused the result.',
      speech_bubbles: [
        {
          speaker: 'Guide',
          text: "Let's change just one thing and see what happens.",
          tone: 'teaching'
        }
      ]
    },
    {
      index: 4,
      narration: `${avatarName} explains what they discovered in their own words.`,
      science_fact:
        'Explaining an idea to someone else is a great way to check if you truly understand it.',
      speech_bubbles: [
        {
          speaker: avatarName,
          text: "So if this changes, then that changes too. Now it makes sense!",
          tone: 'confident'
        }
      ]
    },
    {
      index: 5,
      narration:
        'They celebrate what they learned and think about new questions to ask next.',
      science_fact:
        'Science never really ends. Each answer can lead to new and exciting questions.',
      speech_bubbles: [
        {
          speaker: 'Guide',
          text: 'You did amazing science thinking today!',
          tone: 'supportive'
        },
        {
          speaker: avatarName,
          text: 'I wonder what we can explore next!',
          tone: 'curious'
        }
      ]
    }
  ];

  // Ensure narration is short and kid-friendly
  return panels.map((panel) => ({
    ...panel,
    narration: panel.narration.replace('Science', storyTitle)
  }));
}

function buildPlaceholderPdfContent(args: {
  storyTitle: string;
  avatarName: string;
  panels: Panel[];
}): string {
  const { storyTitle, avatarName, panels } = args;
  const header = `SciQuest Heroes Comic\nStory: ${storyTitle}\nHero: ${avatarName}\n\n`;
  const body = panels
    .map(
      (panel) =>
        `Panel ${panel.index + 1}\nNarration: ${panel.narration}\n` +
        panel.speech_bubbles
          .map((b) => `${b.speaker}: "${b.text}"`)
          .join('\n') +
        '\n\n'
    )
    .join('');

  // This is a text-based placeholder. In a real implementation, replace
  // this with a proper PDF generator library.
  return header + body;
}


