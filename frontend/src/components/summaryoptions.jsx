// src/components/SummaryOptions.jsx
export default function SummaryOptions({ summaryType, setSummaryType }) {
  return (
    <div className="my-4 w-full max-w-md">
      <label className="block mb-2 text-gray-700 font-semibold">
        Select Summary Length:
      </label>
      <select
        value={summaryType}
        onChange={(e) => setSummaryType(e.target.value)}
        className="border rounded-lg p-2 w-full"
      >
        <option value="short">Short</option>
        <option value="medium">Medium</option>
        <option value="long">Long</option>
      </select>
    </div>
  );
}
