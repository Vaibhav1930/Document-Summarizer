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

// choose model: "gemini-1.5-flash" or "gemini-1.5-pro"
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

// Summarize + Suggestions
app.post("/summarize", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  let text = "";

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text || "";
    } else {
      const result = await Tesseract.recognize(filePath, "eng");
      text = result.data.text || "";
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

    const summaryResult = await model.generateContent(summaryPrompt);
    const improvementsResult = await model.generateContent(improvementPrompt);

    // safe result extraction
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

    res.json({ summary, improvements, summaryType });
  } catch (err) {
    console.error("Error in summarization:", err);
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