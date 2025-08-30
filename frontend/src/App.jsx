// src/App.jsx
import { useState, useCallback } from "react";
import axios from "axios";
import UploadBox from "./components/uploads";
import SummaryOptions from "./components/summaryoptions";
import Results from "./components/Result";

function App() {
  const [file, setFile] = useState(null);
  const [summaryType, setSummaryType] = useState("short");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [improvements, setImprovements] = useState("");

  // When a new file is selected, clear previous summary/improvements automatically
  const handleFileSelect = useCallback(
    (f) => {
      setFile(f);
      setSummary("");
      setImprovements("");
    },
    [setFile]
  );

  // Remove file action (from UploadBox)
  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setSummary("");
    setImprovements("");
  }, []);

  const handleSummarize = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("summaryType", summaryType);

      const res = await axios.post("https://document-summarizer-pvzn.onrender.com/summarize", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSummary(res.data.summary || "");
      setImprovements(res.data.improvements || "");
    } catch (err) {
      console.error(err);
      alert("Error processing file. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">📑 Document Summarizer (Gemini AI)</h1>

      <div className="w-full max-w-md">
        <UploadBox onFileSelect={handleFileSelect} onFileRemove={handleRemoveFile} />

        <SummaryOptions summaryType={summaryType} setSummaryType={setSummaryType} />

        <div className="space-y-3">
          <button
            onClick={handleSummarize}
            disabled={loading || !file}
            className="mt-2 w-full px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Summarize & Suggest"}
          </button>

          
        </div>
      </div>

      <Results summary={summary} improvements={improvements} />
    </div>
  );
}

export default App;
