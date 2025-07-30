// server.js

// --- Setup Instructions ---
// 1. Create a new folder for your backend project.
// 2. Save this file as server.js in that folder.
// 3. In your terminal, navigate to the folder and run `npm init -y` to create a package.json file.
// 4. Install the necessary dependencies by running:
//    npm install express cors dotenv node-fetch
// 5. Create a file named .env in the same folder.
// 6. In the .env file, add your Gemini API key like this:
//    GEMINI_API_KEY=YOUR_API_KEY_HERE
// 7. Run the server from your terminal with the command: `node server.js`
//    The server will start on http://localhost:5001.

import express from 'express';
import cors from 'cors';
import 'dotenv/config'; // To load environment variables from .env file
import fetch from 'node-fetch'; // To make HTTP requests to the Gemini API

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing to allow requests from your React app
app.use(express.json()); // Enable the express server to parse JSON request bodies

// --- API Route ---
app.post('/api/generate-tutorial', async (req, res) => {
  // Destructure the 'topic' from the request body
  const { topic } = req.body;

  // Validate that a topic was provided
  if (!topic) {
    return res.status(400).json({ message: 'A topic is required to generate a tutorial.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'API key is not configured on the server.' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  // The prompt to generate a structured JSON response
  const prompt = `Generate a concise tutorial and a quiz for the topic: "${topic}". Return the output as a single JSON object with two keys: "tutorial" and "quiz". The "tutorial" key should have a string value containing the tutorial content. The "quiz" key should have an array of question objects. Each object must have "question" (string), "options" (array of strings), and "correctAnswer" (string that matches one of the options).`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  try {
    // Make the request to the Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      // If the API returns an error, forward it to the client
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API request failed with status ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();

    // Extract and send the generated content back to the client
    if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
      const generatedJson = JSON.parse(result.candidates[0].content.parts[0].text);
      res.status(200).json(generatedJson);
    } else {
      throw new Error('Failed to parse valid content from the AI response.');
    }
  } catch (error) {
    console.error('Error in /api/generate-tutorial:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
