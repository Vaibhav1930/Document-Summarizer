// server.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/", limits: { fileSize: 25 * 1024 * 1024 } });

// Health check
app.get("/health", (_, res) => res.json({ ok: true, model: MODEL_NAME }));

// Summarize route
app.post("/summarize", upload.single("file"), async (req, res) => {
  const start = Date.now();
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  let extractedText = "";

  try {
    // Case 1: PDF parsing
    if (mimeType === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text || "";

      // Fallback to OCR if no text
      if (!extractedText.trim()) {
        console.log("No text in PDF, running OCR...");
        const ocrResult = await Tesseract.recognize(filePath, "eng");
        extractedText = ocrResult.data.text || "";
      }
    } else {
      // Case 2: Image file → OCR
      console.log("Image detected, running OCR...");
      const ocrResult = await Tesseract.recognize(filePath, "eng");
      extractedText = ocrResult.data.text || "";
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No text extracted from file" });
    }

    // Summary length option
    const { summaryType } = req.body || {};
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    // Prompt (single call for both summary + improvements)
    const prompt = `
      You are a document summarizer assistant.
      Analyze the following text and return output strictly in JSON.

      Text:
      ${extractedText}

      JSON schema:
      {
        "summary": "<${lengthInstruction} of the document, highlight key points>",
        "improvements": "<practical improvements or actions>"
      }

      Rules:
      - Do not include markdown or code fences
      - Only output pure JSON
    `;

    const result = await model.generateContent(prompt);
    let outputText = result.response?.text() || "";

    // Try to parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const match = outputText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { summary: outputText, improvements: "" };
    }

    res.json({
      summary: parsed.summary || "",
      improvements: parsed.improvements || "",
      summaryType: summaryType || "short",
    });

    console.log(`Request completed in ${(Date.now() - start) / 1000}s`);
  } catch (err) {
    console.error("Error in /summarize:", err.message);
    res.status(500).json({ error: "Failed to summarize document" });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
