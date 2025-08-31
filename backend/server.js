// server.js (fixed schema)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/", limits: { fileSize: 25 * 1024 * 1024 } });

app.get("/health", (_, res) => res.json({ ok: true, model: MODEL_NAME }));

app.post("/summarize", upload.single("file"), async (req, res) => {
  const start = Date.now();
  if (!req.file) return res.status(400).json({ error: "No file received" });

  const filePath = req.file.path;
  const mime = req.file.mimetype || "application/octet-stream";

  try {
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString("base64");

    const { summaryType } = req.body || {};
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    const systemPrompt = `
You are a precise Document Summarizer.
Analyze the document (PDF or image) and respond STRICTLY as valid JSON.

JSON schema:
{
  "summary": string,        // ${lengthInstruction}; bullets allowed
  "improvements": string    // practical, actionable suggestions
}

Rules:
- No backticks, no markdown.
- Only return pure JSON.
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { inlineData: { data: base64, mimeType: mime } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            improvements: { type: "string" },
          },
          required: ["summary", "improvements"],
        },
      },
    });

    let payloadText = "";
    if (typeof result.response?.text === "function") {
      payloadText = result.response.text();
    } else if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      payloadText = result.response.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Empty response from model");
    }

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      const match = payloadText.match(/\{[\s\S]*\}/);
      if (match) {
        payload = JSON.parse(match[0]);
      } else {
        throw new Error("Model did not return valid JSON");
      }
    }

    res.json({
      summary: String(payload.summary || "").trim(),
      improvements: String(payload.improvements || "").trim(),
      summaryType: summaryType || "short",
    });

    console.log(`/summarize done in ${((Date.now() - start) / 1000).toFixed(2)}s`);
  } catch (err) {
    console.error("Error in /summarize:", err?.message || err);
    res.status(500).json({ error: "Failed to process document" });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} (model: ${MODEL_NAME})`);
});
