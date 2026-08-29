import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_CSV, checkRows, normalizeRows, parseCsv, parseTextDocument, toCsv } from "../lib/document-engine.mjs";

test("CSV jest parsowany i nazwy są normalizowane", () => {
  const rows = normalizeRows(parseCsv(SAMPLE_CSV));
  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, "Montaż Mebli");
});

test("kontrola wychwytuje kwotę, NIP i duplikat", () => {
  const checked = checkRows(parseCsv(SAMPLE_CSV));
  assert.equal(checked.summary.rows, 3);
  assert.ok(checked.issues.some((issue) => issue.field === "gross"));
  assert.ok(checked.issues.some((issue) => issue.field === "nip"));
  assert.ok(checked.issues.some((issue) => issue.message.includes("duplikat")));
});

test("tekst z PDF/oferty jest zamieniany w kontrolowany rekord", () => {
  const rows = parseTextDocument("Usługa: Transport palet Ilość: 2 Netto: 450 Brutto: 1107 VAT: 23 NIP: 5250000000");
  const checked = checkRows(rows);
  assert.equal(checked.rows[0].name, "Transport Palet");
  assert.equal(checked.summary.errors, 0);
  assert.match(toCsv(checked.rows), /Transport Palet/);
});
