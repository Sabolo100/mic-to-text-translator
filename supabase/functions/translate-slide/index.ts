import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function ensureString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.title) parts.push(String(obj.title));
    if (Array.isArray(obj.bullet_points)) {
      obj.bullet_points.forEach((bp: unknown) => parts.push(`• ${bp}`));
    }
    if (Array.isArray(obj.bullets)) {
      obj.bullets.forEach((bp: unknown) => parts.push(`• ${bp}`));
    }
    if (obj.notes) parts.push(`\n${String(obj.notes)}`);
    if (parts.length > 0) return parts.join('\n');
    // Generic object: join all values
    const vals = Object.values(obj).map(v => typeof v === 'string' ? v : Array.isArray(v) ? v.map(i => `• ${i}`).join('\n') : String(v));
    if (vals.length > 0) return vals.join('\n');
  }
  try { return JSON.stringify(val, null, 2); }
  catch { return String(val); }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, outputLang } = await req.json();

    if (!image || !outputLang) {
      return new Response(
        JSON.stringify({ error: 'Missing image or outputLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing slide image for translation to ${outputLang}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are analyzing a presentation slide image. Extract all visible text from the slide, then translate it to: ${outputLang}. Respond ONLY with valid JSON: {"original": "plain text here", "translated": "plain text here"}. CRITICAL: The "original" and "translated" values MUST be plain strings with newlines (\\n) for structure. Use bullet points (• ) for list items. Do NOT use nested objects or arrays inside these fields.`
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: 'Please extract and translate this presentation slide.' }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parse fails, use raw content
      console.warn('Failed to parse JSON, using raw content');
      parsed = { original: content, translated: content };
    }

    console.log('Slide processed successfully');

    return new Response(
      JSON.stringify({
        originalSlideText: ensureString(parsed.original),
        translatedSlideText: ensureString(parsed.translated),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('translate-slide error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
