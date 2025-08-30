// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // <-- Important to parse JSON body

const PORT = process.env.PORT || 5000;

app.post("/summarize", async (req, res) => {
  try {
    console.log("Incoming body:", req.body); // Debugging

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Call OpenAI API (use 2.5 Flash)
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // or "gpt-4.1" / "gpt-4.1-mini"
        input: `Summarize this text:\n\n${text}`,
        stream: true,
      }),
    });

    // Stream data to frontend
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    response.body.on("data", (chunk) => {
      res.write(chunk);
    });

    response.body.on("end", () => {
      res.end();
    });

    response.body.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).end("Error in streaming");
    });

  } catch (err) {
    console.error("Error in /summarize:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
