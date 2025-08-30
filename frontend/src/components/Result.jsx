// src/components/Results.jsx
import React from "react";

export default function Results({ summary, improvements }) {
  if (!summary) {
    return (
      <div className="p-4 text-gray-500 text-center mt-6">
        No summary yet. Upload a file to get started.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-xl space-y-6 mt-6 max-w-3xl w-full">
      <div>
        <h2 className="text-xl font-bold mb-2">Gemini Summary</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
      </div>

      {improvements && (
        <div>
          <h2 className="text-xl font-bold mb-2">Suggested Improvements</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{improvements}</p>
        </div>
      )}
    </div>
  );
}
