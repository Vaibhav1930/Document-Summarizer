import { useState } from "react";

function App() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSummarize() {
    setSummary("");
    setLoading(true);

    try {
      const res = await fetch("https://document-summarizer-pvzn.onrender.com/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input }), // ✅ Fixed
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setSummary(result);
      }
    } catch (err) {
      console.error("Error summarizing:", err);
      setSummary("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📄 Document Summarizer</h1>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows="6"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text here..."
      />
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "Summarizing..." : "Summarize"}
      </button>
      <div className="mt-4 p-3 border rounded bg-gray-50">
        <h2 className="font-semibold">Summary:</h2>
        <p>{summary}</p>
      </div>
    </div>
  );
}

export default App;
