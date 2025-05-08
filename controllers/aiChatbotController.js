// backend/controllers/aiChatbotController.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai"); // Import Google's library and safety settings
const fs = require('fs').promises; // Using promise-based fs
const path = require('path');
// Ensure dotenv is configured early, ideally in your main server.js,
// but requiring it here provides a fallback. Point to root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// --- State Variables ---
let knowledgeBase = []; // Holds the loaded Q&A pairs
let isKbLoaded = false; // Flag to track if KB loading finished
let genAI = null; // Holds the initialized Google AI client
let generativeModel = null; // Holds the specific Gemini model instance
let initializationError = null; // Stores any error during setup

// --- Safety Settings for Google AI ---
// Adjust these based on your needs and Google's documentation
// Blocking thresholds for different potentially harmful content categories.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Initialization Function ---
const initializeChatbot = async () => {
    console.log("AI Chatbot (Google): Initializing...");

    // 1. Load Knowledge Base
    try {
        const filePath = path.join(__dirname, '..', 'data', 'teacher_qa.json');
        console.log(`AI Chatbot (Google): Loading knowledge base from ${filePath}`);
        const jsonData = await fs.readFile(filePath, 'utf-8');
        const parsedData = JSON.parse(jsonData);
        if (!Array.isArray(parsedData)) {
            throw new Error("Knowledge base file content is not a valid JSON array.");
        }
        knowledgeBase = parsedData;
        isKbLoaded = true; // Mark as loaded even if empty, handle empty check later
        console.log(`AI Chatbot (Google): Knowledge base loaded successfully (${knowledgeBase.length} items).`);
    } catch (error) {
        console.error("! AI Chatbot (Google): Failed to load knowledge base!", error.message);
        initializationError = "Knowledge base could not be loaded.";
        isKbLoaded = true; // Still mark as 'loaded' attempt complete
        knowledgeBase = []; // Ensure it's empty on error
    }

    // 2. Initialize Google Generative AI Client
    const apiKey = process.env.GEMINI_API_KEY; // Use the correct env variable name
    if (!apiKey) {
        console.error("! AI Chatbot (Google) FATAL ERROR: GEMINI_API_KEY environment variable is missing!");
        const errorMsg = "Google AI API Key is missing.";
        initializationError = (initializationError ? initializationError + " " : "") + errorMsg;
        genAI = null;
        generativeModel = null;
    } else {
        try {
            genAI = new GoogleGenerativeAI(apiKey);
            // *** USE A CURRENTLY SUPPORTED MODEL NAME ***
            const modelName = "gemini-1.5-pro-latest"; // Or "gemini-1.0-pro" if 1.5 isn't working
            console.log(`AI Chatbot (Google): Initializing model '${modelName}'...`);
            generativeModel = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: safetySettings // Apply safety settings
            });
            // ------------------------------------
            console.log("AI Chatbot (Google): Google AI client and model initialized.");
        } catch (error) {
            console.error("! AI Chatbot (Google): Failed to initialize Google AI client/model:", error.message);
            const errorMsg = `Failed to initialize Google AI Model (${error.message})`;
            initializationError = (initializationError ? initializationError + " " : "") + errorMsg;
            genAI = null;
            generativeModel = null;
        }
    }
    console.log("AI Chatbot (Google): Initialization complete.");
};

// Call initialization immediately when the module loads
initializeChatbot();

// --- Controller Function ---
// Renamed to askGoogleAI for clarity, ensure routes use this name
exports.askGoogleAI = async (req, res) => {
    const userQuery = req.body.query;

    // Validate Input Query
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
        return res.status(400).json({ message: 'Please provide a valid question.' });
    }

    // Check Initialization Status (Crucial before proceeding)
    if (initializationError) {
        console.error(`AI Chatbot (Google) request failed due to initialization error: ${initializationError}`);
        // Provide a slightly more user-friendly error message
        return res.status(500).json({ answer: `Sorry, the chatbot is unavailable due to a configuration issue.` });
    }
    if (!generativeModel) { // Check if the specific model instance is ready
        console.error("AI Chatbot (Google) request failed: Google AI model not initialized.");
        return res.status(500).json({ answer: "Sorry, the chatbot AI service could not be initialized." });
    }
    // Check if Knowledge Base finished loading attempt (even if empty)
     if (!isKbLoaded) {
         console.error("AI Chatbot (Google) request failed: Knowledge base load incomplete.");
         return res.status(500).json({ answer: "Sorry, the chatbot knowledge is not ready yet." });
     }
     // Check if Knowledge Base is empty AFTER loading attempt
     if (knowledgeBase.length === 0) {
         console.warn("AI Chatbot (Google): Knowledge base is empty. Cannot provide specific answers.");
         return res.status(200).json({ answer: "Sorry, I don't have specific website information loaded right now. I cannot answer questions about how to use the portal." });
     }


    console.log(`AI Chatbot (Google): Processing query: "${userQuery}"`);

    // --- Construct the Prompt for Google Gemini ---
    const knowledgeText = knowledgeBase.map((item, index) =>
        `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`
    ).join('\n\n');

    // Gemini prompt structure - often benefits from clear instruction blocks
    const fullPrompt = `TASK: You are a specialized Q&A assistant for teachers using the 'Student Management' website. Your ONLY knowledge source is the provided Q&A list. Do not use any external information.

INSTRUCTIONS:
1. Analyze the "Teacher's Question" below.
2. Find the *most relevant* question-answer pair from the "Q&A List".
3. If a relevant pair is found, provide ONLY its corresponding answer (the 'A' part).
4. If no relevant pair is found in the list to answer the teacher's question, respond with ONLY the following exact sentence: "Sorry, I don't have specific information on that topic. You could ask about adding classes, subjects, quizzes, or managing attendance."

Q&A List:
---
${knowledgeText}
---

Teacher's Question: "${userQuery}"

Answer:`; // Let the model generate the answer part

    // --- Call Google AI API ---
    try {
        console.log("AI Chatbot (Google): Sending request to Google AI...");
        // Optional: Log the prompt being sent for debugging
        // console.log("--- Prompt Sent ---:\n", fullPrompt, "\n--- End Prompt ---");

        // Use the initialized generativeModel
        const result = await generativeModel.generateContent(fullPrompt);
        const response = await result.response; // Await the response part

        // Check for safety blocks or other issues before getting text
        if (!response || response.promptFeedback?.blockReason) {
             console.warn('AI Chatbot (Google): Response blocked due to safety or other reasons.', response?.promptFeedback);
             const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason';
             const safetyRatings = response?.candidates?.[0]?.safetyRatings || []; // Get safety ratings if available
             console.warn('Safety Ratings:', safetyRatings);
             return res.status(200).json({ answer: `Sorry, I cannot provide an answer due to content restrictions (${blockReason}).` });
        }

        // Safely get the text, provide fallback
        const aiAnswer = response.text()?.trim() || "Sorry, I couldn't generate a valid response text.";

        console.log("AI Chatbot (Google): Received answer:", aiAnswer);

        res.json({ answer: aiAnswer });

    } catch (error) {
        // --- Handle Google AI Errors ---
        console.error("AI Chatbot (Google): Error calling Google AI API:", error);
        let errorMessage = "Sorry, there was an error communicating with the Google AI service.";
        let statusCode = 500;

        // Check for specific error messages or types if the SDK provides them
        if (error.message && error.message.includes('API key not valid')) {
             errorMessage = "Google AI Service Error: Invalid API Key.";
             statusCode = 401; // Unauthorized
        } else if (error.message && error.message.toLowerCase().includes('quota')) {
             errorMessage = "Google AI Service Error: Quota exceeded. Please check your usage limits.";
             statusCode = 429; // Too Many Requests
        } else if (error.message) {
            errorMessage = `Google AI Service Error: ${error.message}`;
        }

        res.status(statusCode).json({ answer: errorMessage });
    }
};