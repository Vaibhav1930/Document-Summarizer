// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Fast multimodal model
const MODEL_NAME = "gemini-2.5-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
console.log("🔎 Using Gemini model:", MODEL_NAME);

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

// 🔥 Single API call for both summary & improvements
app.post("/summarize", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const startTime = Date.now();

  try {
    // Convert file to Base64 for Gemini
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString("base64");

    // Summary length instruction
    const { summaryType } = req.body;
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    // Single prompt with JSON response
    const prompt = `
      You are a Document Summarizer Assistant. 
      Analyze this document and respond strictly in JSON format:

      {
        "summary": "<${lengthInstruction} highlighting key points>",
        "improvements": "<suggest improvements or possible actions such as adding charts, metrics, references, restructuring, etc.>"
      }
    `;

    console.time("⏱ Gemini call");
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64, mimeType: req.file.mimetype } },
    ]);
    console.timeEnd("⏱ Gemini call");

    let output = {};
    try {
      // Try parsing JSON response
      output = JSON.parse(result.response.text());
    } catch (e) {
      console.warn("⚠️ Model did not return valid JSON, falling back to raw text");
      output = {
        summary: result.response?.text() || "",
        improvements: "",
      };
    }

    console.log(`✅ Total request handled in ${(Date.now() - startTime) / 1000}s`);
    res.json({
      summary: output.summary || "",
      improvements: output.improvements || "",
      summaryType,
    });
  } catch (err) {
    console.error("❌ Error in summarization:", err);
    res.status(500).json({ error: "Failed to process document" });
  } finally {
    // cleanup uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}
  }
});

app.listen(5000, () => console.log("✅ Backend running on port 5000"));
