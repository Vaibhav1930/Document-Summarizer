// src/components/UploadBox.jsx
import { useDropzone } from "react-dropzone";
import { useState, useEffect } from "react";

export default function UploadBox({ onFileSelect, onFileRemove }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    },
    multiple: false,
  });

  // keep local selectedFile in sync if parent clears via onFileRemove
  useEffect(() => {
    if (!selectedFile && onFileRemove == null) return;
    // no-op; parent will call onFileRemove which should clear selectedFile via this component's handler if needed
  }, [selectedFile, onFileRemove]);

  const handleRemove = () => {
    setSelectedFile(null);
    if (onFileRemove) onFileRemove();
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600">Drop the file here...</p>
        ) : (
          <p className="text-gray-600">
            Drag & drop a PDF or Image, or click to upload
          </p>
        )}
      </div>

      {selectedFile && (
        <div className="p-3 border rounded-lg bg-gray-50 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedFile.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="preview"
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <span className="text-red-600 font-bold">📄 PDF</span>
            )}
            <span className="truncate">{selectedFile.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRemove}
              className="px-3 py-1 text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
