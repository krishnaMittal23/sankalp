import { createClient } from '@deepgram/sdk';
import 'dotenv/config';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_VOICE = process.env.DEEPGRAM_VOICE || 'alloy';
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || 'aura-2';

export async function synthesizeSpeech(text) {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY is missing");

  const deepgram = createClient(DEEPGRAM_API_KEY);

  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: DEEPGRAM_MODEL,
        voice: DEEPGRAM_VOICE,
        encoding: 'linear16',
        container: 'wav',
      }
    );
    const stream = await response.getStream();
    const buffer = await streamToBuffer(stream);
    return buffer;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw new Error('Failed to synthesize speech');
  }
}

async function streamToBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
}
