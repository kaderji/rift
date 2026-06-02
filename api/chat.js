module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, image, mimeType } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_KEY not set in environment variables' });

  try {
    const parts = [];
    if (image) parts.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: image } });
    parts.push({ text: prompt });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      // Return Gemini's actual error so we can see what's wrong
      return res.status(502).json({ 
        error: 'Gemini API error', 
        status: geminiRes.status,
        detail: data 
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
