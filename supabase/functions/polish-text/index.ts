import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function polishText(text: string, lang: string, apiKey: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Írd át az alábbi beszélt nyelvi szöveget olvasmányos, összefüggő szöveggé. A szöveg nyelve: ${lang}. Tartsd meg az eredeti értelmet, de szüntesd meg az ismétléseket, töltelékszavakat, és tedd folyékonnyá. Csak az átírt szöveget add vissza, semmi mást.`
        },
        { role: 'user', content: text }
      ],
    }),
  });

  if (!response.ok) {
    console.error('AI polish error:', response.status, await response.text());
    return text;
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { originalText, translatedText, inputLang, outputLang } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const [polishedOriginal, polishedTranslation] = await Promise.all([
      polishText(originalText, inputLang, apiKey),
      polishText(translatedText, outputLang, apiKey),
    ]);

    return new Response(
      JSON.stringify({ polishedOriginal, polishedTranslation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('polish-text error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
