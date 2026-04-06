import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, "..", "Questions all.csv");
const outputPath = path.resolve(__dirname, "..", "src", "data", "questions.generated.json");

const csvText = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(csvText);

fs.writeFileSync(outputPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputPath)} from ${path.relative(process.cwd(), csvPath)} with ${rows.length} rows.`);

function parseCsv(text) {
  const normalizedText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const next = normalizedText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  const [header = [], ...dataRows] = rows;

  return dataRows.map((dataRow) => {
    const record = {};

    header.forEach((column, columnIndex) => {
      record[column] = dataRow[columnIndex] ?? "";
    });

    return record;
  });
}
