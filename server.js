const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Parse the port as an integer to avoid typos in .env causing crashes
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve the frontend static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Secure API Route to handle Gemini requests using the official Google API
app.post('/api/analyze', async (req, res) => {
    try {
        const { prompt, isJson } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'your_api_key_goes_here') {
            return res.status(500).json({ error: "Server Configuration Error: Your Google Gemini API key is missing in the .env file." });
        }

        // Updated to gemini-2.5-flash on the v1beta endpoint
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        // Standard payload using camelCase (v1beta requirement)
        const payload = {
            contents: [{ 
                parts: [{ text: prompt }] 
            }],
            systemInstruction: {
                parts: [{ text: "You are an expert educational AI assistant. Provide high-quality, accurate, and perfectly formatted responses based on the instructions." }]
            }
        };

        if (isJson) {
            // Correct camelCase fields for JSON mode in v1beta
            payload.generationConfig = { 
                responseMimeType: "application/json" 
            };
        }

        // Native fetch request to Google Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Google API Error ${response.status}: ${errBody}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
            // Send the AI's response back to the frontend
            res.json({ result: result.candidates[0].content.parts[0].text });
        } else {
            throw new Error("Unexpected API response structure from Google");
        }
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n🍝 Noodle Server is running!`);
    console.log(`Local link: http://localhost:${PORT}\n`);
});