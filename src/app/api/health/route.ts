export const runtime = 'nodejs';

/** One glance at which integrations are live vs. running on mock data. */
export async function GET() {
  const on = (k: string) => Boolean(process.env[k]);
  return Response.json({
    ok: true,
    services: {
      gemini: on('GEMINI_API_KEY'),
      exa: on('EXA_API_KEY'),
      apify: on('APIFY_TOKEN'),
      vapi: on('VAPI_API_KEY') && on('VAPI_PHONE_NUMBER_ID'),
      elevenlabs: on('ELEVENLABS_API_KEY'),
      resend: on('RESEND_API_KEY'),
    },
  });
}
