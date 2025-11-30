// Supabase Edge Function: generate-story-structure
// Generates a kid-friendly story structure (title, summary, topicTag, etc.) from a user idea.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

type GenerateStoryStructureRequest = {
  idea: string;
};

type GenerateStoryStructureResponse = {
  title: string;
  summary: string;
  topicTag: string;
  readingLevel: string;
  estimatedTime: string;
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
    const body = (await req.json()) as GenerateStoryStructureRequest;
    const rawIdea = (body?.idea ?? '').trim();

    if (!rawIdea) {
      return jsonResponse({ error: 'idea is required' }, 400);
    }

    // If OpenAI is not configured, return a simple deterministic structure.
    if (!OPENAI_API_KEY) {
      console.warn('[generate-story-structure] OPENAI_API_KEY not set, using fallback generator');
      const fallback: GenerateStoryStructureResponse = {
        title: buildFallbackTitle(rawIdea),
        summary:
          'A curious hero explores this topic and discovers fun facts along the way. This is a simple starting point for your comic.',
        topicTag: 'Science',
        readingLevel: 'Ages 7-9',
        estimatedTime: '5 min'
      };
      return jsonResponse(fallback, 200);
    }

    const structure = await generateWithOpenAI(rawIdea);
    return jsonResponse(structure, 200);
  } catch (error) {
    console.error('[generate-story-structure] Unexpected error', error);
    return jsonResponse(
      {
        error: 'Unexpected error generating story structure'
      },
      500
    );
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

function buildFallbackTitle(idea: string): string {
  const trimmed = idea.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'My Custom Adventure';
  if (trimmed.length <= 40) {
    // Capitalize first letter
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed.slice(0, 37) + '...';
}

async function generateWithOpenAI(idea: string): Promise<GenerateStoryStructureResponse> {
  const systemPrompt =
    'You are a helpful assistant that creates kid-friendly comic story outlines for children ages 7-9. ' +
    'You will receive a short idea from a child or parent and turn it into a safe, uplifting science or history adventure outline. ' +
    'Return ONLY valid JSON with the required fields. Avoid scary or unsafe content.';

  const userPrompt = `Create a kid-friendly comic story outline for this idea:\n\n"${idea}"\n\nReturn JSON with:\n- title (fun, short, kid-friendly)\n- summary (2-4 sentences, simple language, present tense)\n- topicTag (1-3 words, like "Space", "US History", "India History", "Plants", "Earth Science")\n- readingLevel (like "Ages 7-9")\n- estimatedTime (like "5 min")`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generate-story-structure] OpenAI error', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Missing content from OpenAI response');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('[generate-story-structure] Failed to parse JSON from OpenAI', error, content);
    throw error;
  }

  const result: GenerateStoryStructureResponse = {
    title: (parsed.title || buildFallbackTitle(idea)).toString(),
    summary:
      (parsed.summary ||
        'A curious hero explores this topic and discovers fun facts along the way.').toString(),
    topicTag: (parsed.topicTag || 'Science').toString(),
    readingLevel: (parsed.readingLevel || 'Ages 7-9').toString(),
    estimatedTime: (parsed.estimatedTime || '5 min').toString()
  };

  return result;
}


