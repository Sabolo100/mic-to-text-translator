import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Decode base64 to Uint8Array
function decodeBase64(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, inputLang, outputLang } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    // Skip very short audio (likely empty WebM headers with no real audio)
    const binaryAudio = decodeBase64(audio);
    if (binaryAudio.length < 1000) {
      console.log('Audio too short, skipping:', binaryAudio.length, 'bytes');
      return new Response(
        JSON.stringify({ transcription: '', translation: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing audio for translation from', inputLang, 'to', outputLang, 'size:', binaryAudio.length);
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', inputLang);

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcribedText = transcriptionResult.text;

    console.log('Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ translation: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Translate using Lovable AI
    const translationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${inputLang} to ${outputLang}. Only return the translation, nothing else. Maintain the tone and meaning of the original text.`
          },
          {
            role: 'user',
            content: transcribedText
          }
        ],
      }),
    });

    if (!translationResponse.ok) {
      const errorText = await translationResponse.text();
      console.error('Translation API error:', errorText);
      throw new Error(`Translation failed: ${errorText}`);
    }

    const translationResult = await translationResponse.json();
    const translation = translationResult.choices[0].message.content;

    console.log('Translation:', translation);

    return new Response(
      JSON.stringify({ 
        transcription: transcribedText,
        translation: translation 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-speech function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
