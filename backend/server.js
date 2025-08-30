// server.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Always use the correct model
const MODEL_NAME = "gemini-2.5-flash";
console.log("🔎 Using Gemini model:", MODEL_NAME);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

// Summarize + Suggestions
app.post("/summarize", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  let text = "";

  const startTime = Date.now();

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text || "";

      console.log(`⏱ PDF parsing took ${(Date.now() - startTime) / 1000}s`);

      // ✅ Only use OCR if no text extracted
      if (!text.trim()) {
        console.log("⚠️ No text found, falling back to OCR...");
        const result = await Tesseract.recognize(filePath, "eng");
        text = result.data.text || "";
        console.log(`⏱ OCR took ${(Date.now() - startTime) / 1000}s`);
      }
    } else {
      console.log("📄 Non-PDF file, using OCR directly...");
      const result = await Tesseract.recognize(filePath, "eng");
      text = result.data.text || "";
      console.log(`⏱ OCR took ${(Date.now() - startTime) / 1000}s`);
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "No text extracted from file" });
    }

    const { summaryType } = req.body;
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    const summaryPrompt = `Please provide ${lengthInstruction} of the following document. Highlight key points clearly:\n\n${text}`;
    const improvementPrompt = `Here is a document:\n\n${text}\n\nPlease suggest improvements or possible actions that can be taken (e.g., add charts, expand introduction, highlight key metrics, restructure, add references).`;

    console.time("⏱ Gemini summary call");
    const summaryResult = await model.generateContent(summaryPrompt);
    console.timeEnd("⏱ Gemini summary call");

    console.time("⏱ Gemini improvement call");
    const improvementsResult = await model.generateContent(improvementPrompt);
    console.timeEnd("⏱ Gemini improvement call");

    // Safe result extraction
    let summary = "";
    if (summaryResult.response && typeof summaryResult.response.text === "function") {
      summary = summaryResult.response.text();
    } else if (summaryResult.response?.candidates?.length) {
      summary = summaryResult.response.candidates[0].content.parts[0].text || "";
    }

    let improvements = "";
    if (improvementsResult.response && typeof improvementsResult.response.text === "function") {
      improvements = improvementsResult.response.text();
    } else if (improvementsResult.response?.candidates?.length) {
      improvements = improvementsResult.response.candidates[0].content.parts[0].text || "";
    }

    console.log(`✅ Total request handled in ${(Date.now() - startTime) / 1000}s`);

    res.json({ summary, improvements, summaryType });
  } catch (err) {
    console.error("❌ Error in summarization:", err);
    res.status(500).json({ error: "Failed to process document" });
  } finally {
    // cleanup uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // ignore
    }
  }
});

app.listen(5000, () => console.log("✅ Backend running on port 5000"));
