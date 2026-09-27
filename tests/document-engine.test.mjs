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


test("CSV ze średnikiem jest obsługiwany", () => {
  const rows = parseCsv("nazwa;ilość;netto;brutto\nSerwis;1;100;123");
  const checked = checkRows(rows);
  assert.equal(checked.rows[0].name, "Serwis");
  assert.equal(checked.summary.errors, 0);
});

test("kontrola zgłasza błędny e-mail i datę", () => {
  const rows = parseCsv(
    "name,quantity,net,gross,vat,nip,date,email\nUsługa,1,100,123,23,5250000000,31-XX-2026,zly-adres"
  );
  const checked = checkRows(rows);
  assert.ok(checked.issues.some((issue) => issue.field === "date"));
  assert.ok(checked.issues.some((issue) => issue.field === "email"));
});

test("eksport CSV bezpiecznie podwaja cudzysłowy", () => {
  const csv = toCsv([{ name: 'Usługa "Premium"', quantity: "1", net: "100", gross: "123", vat: "23", nip: "", date: "", email: "" }]);
  assert.match(csv, /"Usługa ""Premium"""/);
});


test("kontrola odrzuca nieistniejącą datę kalendarzową", () => {
  const rows = parseCsv(
    "name,quantity,net,gross,vat,nip,date,email\nUsługa,1,100,123,23,5250000000,31-02-2026,biuro@firma.pl"
  );
  const checked = checkRows(rows);
  assert.ok(checked.issues.some((issue) => issue.field === "date"));
});

test("CSV zachowuje przecinek i cudzysłów wewnątrz pola", () => {
  const rows = parseCsv(
    'name,quantity,net,gross\n"Serwis, pakiet ""Premium""",1,100,123'
  );
  const checked = checkRows(rows);
  assert.equal(checked.rows[0].name, 'Serwis, Pakiet "Premium"');
  assert.equal(checked.summary.errors, 0);
});
