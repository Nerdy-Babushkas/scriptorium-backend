// services/recommendations-service.js
require("dotenv").config();
const OpenAI = require("openai");

// ---------- Client (lazy initialization) ----------
let client;

// ---------- Helper for testing ----------
function __setClientForTest(mockClient) {
  client = mockClient;
}

// ---------- Get or create client ----------
function getClient() {
  if (client) return client; // use mock if set

  client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  return client;
}

// ================= GET AI RECOMMENDATIONS =================
async function getRecommendations(userPrompt) {
  try {
    const response = await getClient().chat.completions.create({
      model: process.env.AI_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
      temperature: 0.2, // low for consistent JSON
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `
You are a recommendation assistant.
Return exactly 5 recommendations in JSON only, in this format:

{
  "recommendations": [
    {
      "title": "...",
      "year": 2000,
      "director": "...",
      "reason": "...",
      "tags": ["..."]
    }
  ]
}

Rules:
- Keep reason 1-2 sentences max.
- Include 2-3 tags.
- Fill in year and director if known.
- Do not include extra text outside JSON.
- If output is truncated, return only valid JSON.
          `,
        },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response?.choices?.[0]?.message?.content;

    if (!raw) {
      console.error("No content returned from AI.", response);
      return [];
    }

    // Attempt strict JSON parse first
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: parse up to last closing brace
      const lastBrace = raw.lastIndexOf("}");
      if (lastBrace !== -1) {
        try {
          parsed = JSON.parse(raw.slice(0, lastBrace + 1));
        } catch (err) {
          console.warn("Fallback JSON parse failed.", err);
          parsed = null;
        }
      } else {
        parsed = null;
      }
    }

    return parsed?.recommendations || [];
  } catch (err) {
    console.error("AI request failed:", err);
    return [];
  }
}

// ===== CommonJS export =====
module.exports = {
  getRecommendations,
  __setClientForTest, // for testing only
};
