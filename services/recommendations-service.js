// services/recommendations-service.js
require("dotenv").config();
const OpenAI = require("openai");

// ---------- Client (lazy initialization) ----------
let client;

function __setClientForTest(mockClient) {
  client = mockClient;
}

function getClient() {
  if (client) return client;
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
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `
You are a recommendation assistant.
Return exactly 5 recommendations as a JSON object only — no markdown, no code fences, no extra text before or after.

The JSON format to use depends on the user's request:
- For movies:  { "recommendations": [{ "title": "...", "year": 2000, "director": "...", "reason": "...", "tags": ["..."] }] }
- For music:   { "recommendations": [{ "title": "...", "artist": "...", "album": "...", "year": 2000, "reason": "...", "tags": ["..."] }] }
- For books:   { "recommendations": [{ "title": "...", "author": "...", "year": 2000, "reason": "...", "tags": ["..."] }] }

Rules:
- Use the format that matches what the user is asking for.
- Keep reason to 1-2 sentences.
- Include 2-3 tags per item.
- Do NOT include any text outside the JSON object.
- If your output would be truncated, stop at the last complete item and close the JSON properly.
          `.trim(),
        },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response?.choices?.[0]?.message?.content;

    if (!raw) {
      console.error("No content returned from AI.", response);
      return [];
    }

    // Strip accidental markdown fences if model ignores instructions
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: truncate to last valid closing brace
      const lastBrace = cleaned.lastIndexOf("}");
      if (lastBrace !== -1) {
        try {
          parsed = JSON.parse(cleaned.slice(0, lastBrace + 1));
        } catch (err) {
          console.warn("Fallback JSON parse failed.", err);
          parsed = null;
        }
      }
    }

    return parsed?.recommendations || [];
  } catch (err) {
    console.error("AI request failed:", err);
    return [];
  }
}

module.exports = {
  getRecommendations,
  __setClientForTest,
};
