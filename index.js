import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash'; // You can change to 'gemini-pro' if flash is unstable
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// --- Retry wrapper ---
async function retryFetch(apiUrl, payload, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) return response;

    console.warn(`Retry ${i + 1}/${retries} - Status: ${response.status}`);
    if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Gemini API request failed after ${retries} attempts.`);
}

// --- API Route ---
app.post('/api/generate-tutorial', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ message: 'A topic is required to generate a tutorial.' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'API key is not configured on the server.' });
  }

  const prompt = `Generate a concise tutorial and a quiz for the topic: "${topic}". Return the output as a single JSON object with two keys: "tutorial" and "quiz". The "tutorial" key should have a string value containing the tutorial content. The "quiz" key should have an array of question objects. Each object must have "question" (string), "options" (array of strings), and "correctAnswer" (string that matches one of the options).`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  try {
    const geminiResponse = await retryFetch(apiUrl, payload);
    const result = await geminiResponse.json();

    const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('Failed to parse valid content from the AI response.');
    }

    const generatedJson = JSON.parse(textContent);
    res.status(200).json(generatedJson);
  } catch (error) {
    console.error('Error in /api/generate-tutorial:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
