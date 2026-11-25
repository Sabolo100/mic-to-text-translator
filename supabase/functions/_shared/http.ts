import { GatewayError } from 'npm:@lovable.dev/ai-gateway@0.1.13';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function aiFailure(error: unknown) {
  if (error instanceof GatewayError) {
    console.error('AI request failed', error.code, error.httpStatus, error.ids);
    return { code: error.code, error: error.code === 'payment_required'
      ? 'A fordításhoz szükséges AI-egyenleg elfogyott. Töltse fel a Lovable Cloud AI-egyenlegét.'
      : error.code === 'rate_limited' ? 'A fordítási szolgáltatás túlterhelt. Próbálja újra később.'
      : 'Az AI-feldolgozás nem sikerült. Próbálja újra később.', status: error.httpStatus ?? 503 };
  }
  console.error('Processing failed', error instanceof Error ? error.message : 'Unknown error');
  return { code: 'processing_failed', error: 'A feldolgozás nem sikerült. Próbálja újra.', status: 500 };
}