const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

// ━━━ YOUR API KEYS — ADD THESE ━━━
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const ELEVEN_KEY = process.env.ELEVEN_KEY;
const ELEVEN_VOICE = process.env.ELEVEN_VOICE;
const DID_KEY = process.env.DID_KEY;
// ━━━ HEALTH CHECK ━━━
app.get('/', (req, res) => {
  res.json({ status: 'SHIFT Backend is running', athena: 'ready' });
});

// ━━━ ATHENA — ANTHROPIC API ━━━
app.post('/api/athena', async (req, res) => {
  try {
    const { system, messages } = req.body;
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system,
      messages,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Athena error:', error.message);
    res.status(500).json({ error: 'Athena is unavailable right now.' });
  }
});

// ━━━ VOICE — ELEVENLABS API ━━━
app.post('/api/voice', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_KEY,
      },
      body: JSON.stringify({
        text: text.substring(0, 500),
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    const audioBuffer = await response.buffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Voice error:', error);
    res.status(500).json({ error: 'Voice unavailable right now.' });
  }
});

// ━━━ AVATAR — D-ID API ━━━
app.post('/api/avatar', async (req, res) => {
  try {
    const { text, imageUrl } = req.body;
    const createResponse = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${DID_KEY}`,
      },
      body: JSON.stringify({
        source_url: imageUrl,
        script: {
          type: 'text',
          input: text.substring(0, 400),
          provider: {
            type: 'elevenlabs',
            voice_id: ELEVEN_VOICE,
          },
        },
        config: { fluent: true },
      }),
    });
    const createData = await createResponse.json();
    res.json({ talkId: createData.id });
  } catch (error) {
    console.error('Avatar error:', error);
    res.status(500).json({ error: 'Avatar unavailable right now.' });
  }
});

// ━━━ AVATAR STATUS — POLL D-ID ━━━
app.get('/api/avatar/:talkId', async (req, res) => {
  try {
    const { talkId } = req.params;
    const response = await fetch(`https://api.d-id.com/talks/${talkId}`, {
      headers: { 'Authorization': `Basic ${DID_KEY}` },
    });
    const data = await response.json();
    res.json({ status: data.status, videoUrl: data.result_url });
  } catch (error) {
    console.error('Avatar status error:', error);
    res.status(500).json({ error: 'Could not get avatar status.' });
  }
});

// ━━━ START SERVER ━━━
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SHIFT Backend running on port ${PORT}`);
  console.log('Athena is ready.');
});