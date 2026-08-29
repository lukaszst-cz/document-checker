import { SAMPLE_CSV, checkRows, parseCsv, parseTextDocument, toCsv } from "./lib/document-engine.mjs";

const raw = document.querySelector("#raw");
const file = document.querySelector("#file");
const error = document.querySelector("#error");
const result = document.querySelector("#result");
let selectedFile = null;

const escapeHtml = (value) => String(value).replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character]);

async function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise((resolve, reject) => { const script = Object.assign(document.createElement("script"), { src, onload: resolve, onerror: () => reject(new Error("Nie udało się pobrać biblioteki do odczytu pliku.")) }); document.head.append(script); });
}

async function rowsFromFile(currentFile) {
  const extension = currentFile.name.split(".").pop().toLowerCase();
  if (extension === "csv") return parseCsv(await currentFile.text());
  if (["xlsx", "xls"].includes(extension)) {
    await loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
    const workbook = window.XLSX.read(await currentFile.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  }
  if (extension === "pdf") {
    const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: await currentFile.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) { const page = await pdf.getPage(pageNumber); const content = await page.getTextContent(); pages.push(content.items.map((item) => item.str).join(" ")); }
    return parseTextDocument(pages.join("\n"));
  }
  throw new Error("Obsługiwane są pliki CSV, XLS/XLSX oraz PDF.");
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = Object.assign(document.createElement("a"), { href: url, download: "dane-po-kontroli.csv" }); link.click(); URL.revokeObjectURL(url);
}

function showResult(checked) {
  const issueRows = checked.issues.length ? checked.issues.map((issue) => `<tr><td>${issue.row}</td><td><span class="badge ${issue.level === "Błąd" ? "error" : "warning"}">${issue.level}</span></td><td>${escapeHtml(issue.field)}</td><td>${escapeHtml(issue.message)}</td></tr>`).join("") : "<tr><td colspan=4>Nie znaleziono błędów ani ostrzeżeń w zakresie kontroli.</td></tr>";
  const rows = checked.rows.map((row) => `<tr><td>${row.__row}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.quantity)}</td><td>${escapeHtml(row.net)}</td><td>${escapeHtml(row.gross)}</td></tr>`).join("");
  result.innerHTML = `<section class="stats"><article class="card"><strong>${checked.summary.rows}</strong><span>wiersze</span></article><article class="card"><strong>${checked.summary.errors}</strong><span>błędy</span></article><article class="card"><strong>${checked.summary.warnings}</strong><span>ostrzeżenia</span></article><button class="primary" id="export">Eksportuj CSV</button></section><section class="card"><h2>Raport kontroli</h2><div class="table-wrap"><table><thead><tr><th>Wiersz</th><th>Typ</th><th>Pole</th><th>Informacja</th></tr></thead><tbody>${issueRows}</tbody></table></div></section><section class="card"><h2>Dane po normalizacji</h2><div class="table-wrap"><table><thead><tr><th>Wiersz</th><th>Nazwa</th><th>Ilość</th><th>Netto</th><th>Brutto</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  result.hidden = false;
  document.querySelector("#export").addEventListener("click", () => downloadCsv(checked.rows));
}

document.querySelector("#sample").addEventListener("click", () => { selectedFile = null; file.value = ""; raw.value = SAMPLE_CSV; });
file.addEventListener("change", () => { selectedFile = file.files[0] ?? null; raw.value = selectedFile ? `Wybrano plik: ${selectedFile.name}` : ""; });
document.querySelector("#check").addEventListener("click", async () => {
  error.textContent = "";
  try { const rows = selectedFile ? await rowsFromFile(selectedFile) : parseCsv(raw.value); showResult(checkRows(rows)); }
  catch (reason) { error.textContent = reason.message; }
});
