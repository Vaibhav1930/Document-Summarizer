// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 📌 Route: Summarize PDF text
app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Combined summarization + improvement in ONE call
    const prompt = `
    Summarize the following document in clear, concise language.
    Then refine the summary so it is professional, readable, and well-structured.

    Document:
    ${text}
    `;

    // ✅ Streaming response
    const response = await model.generateContentStream([prompt]);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of response.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(chunkText);
      }
    }

    res.end();
  } catch (err) {
    console.error("Error in /summarize:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
