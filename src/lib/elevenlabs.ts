export const hasEleven = () => Boolean(process.env.ELEVENLABS_API_KEY);

/**
 * The tenant hears the whole case in their own language. Immigrant renters
 * lose the most deposit money and read the least English legalese — this is
 * the point of the audio, not decoration.
 */
export async function tts(text: string): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;

  const voice = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text.slice(0, 4500),
      model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.15 },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const buf = Buffer.from(await res.arrayBuffer());
  return `data:audio/mpeg;base64,${buf.toString('base64')}`;
}
