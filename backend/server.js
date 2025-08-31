// server.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const tesseract = require("node-tesseract-ocr");
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

// OCR config
const ocrConfig = {
  lang: "eng",
  oem: 1,
  psm: 3,
};

app.post("/summarize", upload.single("file"), async (req, res) => {
  const start = Date.now();
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  let extractedText = "";

  try {
    // PDF handling
    if (mimeType === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text || "";

      if (!extractedText.trim()) {
        console.log("No text in PDF, running OCR...");
        extractedText = await tesseract.recognize(filePath, ocrConfig);
      }
    } else {
      // Image → OCR
      console.log("Image detected, running OCR...");
      extractedText = await tesseract.recognize(filePath, ocrConfig);
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No text extracted from file" });
    }

    // Summary length option
    const { summaryType } = req.body || {};
    let lengthInstruction = "a short summary";
    if (summaryType === "medium") lengthInstruction = "a medium summary";
    if (summaryType === "long") lengthInstruction = "a detailed long summary";

    // Streaming Gemini response
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const stream = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: `Summarize this document:\n${extractedText}\n\nProvide ${lengthInstruction} and suggest improvements.` }] }]
    });

    let fullResponse = "";
    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        // Send partial results to frontend
        res.write(JSON.stringify({ partial: chunkText }) + "\n");
      }
    }

    res.end(JSON.stringify({ final: fullResponse, summaryType: summaryType || "short" }));

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
