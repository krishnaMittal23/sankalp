import axios from "axios";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function transcribeAudio(audioBase64) {
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const response = await axios.post(
    "https://api.deepgram.com/v1/listen",
    audioBuffer,
    {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/wav",
      },
    }
  );
  return response.data.results.channels[0].alternatives[0].transcript;
}
