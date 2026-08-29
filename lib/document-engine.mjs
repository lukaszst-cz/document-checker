const REQUIRED = ["name", "quantity", "net", "gross"];

export const SAMPLE_CSV = `name,quantity,net,gross,vat,nip,date,email
Montaż mebli,1,1000,1230,23,5250000000,2026-09-12,biuro@firma.pl
Transport palet,2,450,1107,23,123456789,12/09/2026,logistyka@firma.pl
montaż  mebli,1,1000,1230,23,5250000000,2026-09-12,biuro@firma.pl`;

const aliases = {
  name: ["name", "nazwa", "produkt", "usługa", "usluga", "pozycja", "towar"],
  quantity: ["quantity", "ilość", "ilosc", "qty", "liczba"],
  net: ["net", "netto", "wartość netto", "wartosc netto"],
  gross: ["gross", "brutto", "wartość brutto", "wartosc brutto"],
  vat: ["vat", "stawka vat"],
  nip: ["nip", "tax id"],
  date: ["date", "data", "termin"],
  email: ["email", "e-mail", "mail"]
};

const clean = (value = "") => String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const key = (value) => clean(value).toLowerCase();
const money = (value) => Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));

export function parseCsv(input) {
  const lines = String(input).replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Plik CSV musi zawierać nagłówek i co najmniej jeden wiersz.");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const split = (line) => {
    const values = []; let current = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') { if (quoted && line[index + 1] === '"') { current += '"'; index += 1; } else quoted = !quoted; }
      else if (char === delimiter && !quoted) { values.push(clean(current)); current = ""; }
      else current += char;
    }
    values.push(clean(current)); return values;
  };
  const headers = split(lines[0]);
  return lines.slice(1).map((line, rowIndex) => ({ ...Object.fromEntries(headers.map((header, index) => [header, split(line)[index] ?? ""])), __row: rowIndex + 2 }));
}

export function normalizeRows(rows) {
  return rows.map((row, index) => {
    const normalized = { __row: row.__row ?? index + 2 };
    for (const [target, options] of Object.entries(aliases)) {
      const source = Object.entries(row).find(([field]) => options.includes(key(field)));
      normalized[target] = source ? clean(source[1]) : "";
    }
    normalized.name = normalized.name.replace(/\b\w/g, (letter) => letter.toUpperCase());
    return normalized;
  });
}

function validNip(nip) {
  const digits = nip.replace(/\D/g, "");
  if (!digits) return true;
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum = weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0) % 11;
  return checksum === Number(digits[9]);
}

function validateDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value);
}

export function checkRows(inputRows) {
  const rows = normalizeRows(inputRows);
  const issues = [];
  const seen = new Map();
  rows.forEach((row) => {
    REQUIRED.forEach((field) => { if (!row[field]) issues.push({ row: row.__row, level: "Błąd", field, message: `Brak pola: ${field}.` }); });
    if (row.quantity && (!Number.isFinite(money(row.quantity)) || money(row.quantity) <= 0)) issues.push({ row: row.__row, level: "Błąd", field: "quantity", message: "Ilość musi być liczbą większą od zera." });
    if (row.net && !Number.isFinite(money(row.net))) issues.push({ row: row.__row, level: "Błąd", field: "net", message: "Nieprawidłowa kwota netto." });
    if (row.gross && !Number.isFinite(money(row.gross))) issues.push({ row: row.__row, level: "Błąd", field: "gross", message: "Nieprawidłowa kwota brutto." });
    if (row.net && row.gross && row.vat && Number.isFinite(money(row.net)) && Number.isFinite(money(row.gross))) {
      const expected = money(row.net) * (1 + money(row.vat) / 100);
      if (Math.abs(expected - money(row.gross)) > 0.02) issues.push({ row: row.__row, level: "Ostrzeżenie", field: "gross", message: `Brutto nie zgadza się z netto i VAT (${expected.toFixed(2)}).` });
    }
    if (!validNip(row.nip)) issues.push({ row: row.__row, level: "Ostrzeżenie", field: "nip", message: "NIP ma nieprawidłową długość lub sumę kontrolną." });
    if (!validateDate(row.date)) issues.push({ row: row.__row, level: "Ostrzeżenie", field: "date", message: "Data ma nieczytelny format." });
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) issues.push({ row: row.__row, level: "Ostrzeżenie", field: "email", message: "Adres e-mail ma nieprawidłowy format." });
    const duplicateKey = [key(row.name), row.quantity, row.net, row.gross].join("|");
    if (row.name && seen.has(duplicateKey)) issues.push({ row: row.__row, level: "Ostrzeżenie", field: "name", message: `Prawdopodobny duplikat wiersza ${seen.get(duplicateKey)}.` });
    else if (row.name) seen.set(duplicateKey, row.__row);
  });
  return { rows, issues, summary: { rows: rows.length, errors: issues.filter((issue) => issue.level === "Błąd").length, warnings: issues.filter((issue) => issue.level === "Ostrzeżenie").length } };
}

export function parseTextDocument(text) {
  const record = { __row: 1 };
  const labels = "nazwa|usługa|usluga|towar|ilość|ilosc|quantity|netto|wartość netto|wartosc netto|brutto|wartość brutto|wartosc brutto|vat|nip|data|termin|e-?mail";
  const grab = (names) => String(text).match(new RegExp(`(?:${names})\\s*[:\\-]\\s*(.*?)(?=\\s+(?:${labels})\\s*[:\\-]|$)`, "i"))?.[1]?.trim() ?? "";
  record.name = grab("nazwa|usługa|usluga|towar");
  record.quantity = grab("ilość|ilosc|quantity");
  record.net = grab("netto|wartość netto|wartosc netto");
  record.gross = grab("brutto|wartość brutto|wartosc brutto");
  record.vat = grab("vat");
  record.nip = grab("nip");
  record.date = grab("data|termin");
  record.email = grab("e-?mail");
  return [record];
}

export function toCsv(rows) {
  const headers = ["name", "quantity", "net", "gross", "vat", "nip", "date", "email"];
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => quote(row[header])).join(","))].join("\n");
}
