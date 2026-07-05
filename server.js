const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const ELEVEN_KEY = process.env.ELEVEN_KEY;
const ELEVEN_VOICE = process.env.ELEVEN_VOICE;
const DID_KEY = process.env.DID_KEY;

app.get('/', (req, res) => {
  res.json({
    status: 'SHIFT Backend is running',
    athena: 'ready',
    elevenKeyStart: ELEVEN_KEY ? ELEVEN_KEY.substring(0, 8) : 'MISSING',
    elevenKeyLength: ELEVEN_KEY ? ELEVEN_KEY.length : 0,
  });
});

app.post('/api/athena', async (req, res) => {
  try {
    const { system, messages } = req.body;
    const response = await axios({
      method: 'post',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      data: {
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: messages,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Athena error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    }
    res.status(500).json({ error: 'Athena is unavailable right now.' });
  }
});
app.get('/api/voice-stream', async (req, res) => {
  try {
    const text = req.query.text || '';
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_KEY,
      },
      data: {
        text: text.substring(0, 2000),
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      responseType: 'arraybuffer',
    });
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    console.error('Voice stream error:', error.message);
    res.status(500).json({ error: 'Voice unavailable.' });
  }
});
app.post('/api/voice', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_KEY,
      },
      data: {
        text: text.substring(0, 500),
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      responseType: 'arraybuffer',
    });
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    console.error('Voice error:', error.message);
    res.status(500).json({ error: 'Voice unavailable.' });
  }
});

app.post('/api/avatar', async (req, res) => {
  try {
    const { text, imageUrl } = req.body;
    const response = await axios({
      method: 'post',
      url: 'https://api.d-id.com/talks',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${DID_KEY}`,
      },
      data: {
        source_url: imageUrl,
        script: {
          type: 'text',
          input: text.substring(0, 400),
          provider: { type: 'elevenlabs', voice_id: ELEVEN_VOICE },
        },
        config: { fluent: true },
      },
    });
    res.json({ talkId: response.data.id });
  } catch (error) {
    console.error('Avatar error:', error.message);
    res.status(500).json({ error: 'Avatar unavailable.' });
  }
});

app.get('/api/avatar/:talkId', async (req, res) => {
  try {
    const response = await axios({
      method: 'get',
      url: `https://api.d-id.com/talks/${req.params.talkId}`,
      headers: { 'Authorization': `Basic ${DID_KEY}` },
    });
    res.json({ status: response.data.status, videoUrl: response.data.result_url });
  } catch (error) {
    console.error('Avatar status error:', error.message);
    res.status(500).json({ error: 'Could not get avatar status.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SHIFT Backend running on port ${PORT}`);
  console.log('Athena is ready.');
});