// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-2.5-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
console.log("🔎 Using Gemini model:", MODEL_NAME);

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

app.post("/summarize", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const startTime = Date.now();

  try {
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString("base64");

    const { summaryType } = req.body;
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    const summaryPrompt = `Please provide ${lengthInstruction} of this document. Highlight key points clearly.`;
    const improvementPrompt = `Please suggest improvements or possible actions for this document (e.g., add charts, expand introduction, highlight key metrics, restructure, add references).`;

    console.time("⏱ Gemini calls");
    const [summaryResult, improvementsResult] = await Promise.all([
      model.generateContent([
        { text: summaryPrompt },
        { inlineData: { data: base64, mimeType: req.file.mimetype } },
      ]),
      model.generateContent([
        { text: improvementPrompt },
        { inlineData: { data: base64, mimeType: req.file.mimetype } },
      ]),
    ]);
    console.timeEnd("⏱ Gemini calls");

    const summary = summaryResult.response?.text() || "";
    const improvements = improvementsResult.response?.text() || "";

    console.log(`✅ Total request handled in ${(Date.now() - startTime) / 1000}s`);
    res.json({ summary, improvements, summaryType });
  } catch (err) {
    console.error("❌ Error in summarization:", err);
    res.status(500).json({ error: "Failed to process document" });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

app.listen(5000, () => console.log("✅ Backend running on port 5000"));
