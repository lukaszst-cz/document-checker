# Document Checker

**Problem:** przed wysłaniem oferty, zamówienia lub zestawienia łatwo pominąć NIP, datę, e-mail, pozycję albo rozbieżność kwot. Taki błąd kosztuje czas i obniża zaufanie klienta.

**Rozwiązanie:** narzędzie do wstępnej kontroli danych z CSV, Excel i PDF przed wysłaniem.

[Otwórz działające demo](https://document-checker-zm.pages.dev/)

## Co sprawdza

- wymagane pola i podstawowe dane pozycji;
- normalizację nazw oraz wartości;
- rozbieżności netto, brutto i VAT;
- NIP, datę, e-mail i prawdopodobne duplikaty;
- eksport znormalizowanego CSV.

## Wartość biznesowa

- mniej błędów wychodzących do klienta;
- krótsza kontrola przed wysłaniem dokumentu;
- powtarzalny standard danych dla biura, handlu, warsztatu, druku i usług;
- punkt wyjścia do przyszłej automatyzacji obiegu dokumentów.

## Ważne ograniczenie

To narzędzie do kontroli operacyjnej. Nie zastępuje systemu księgowego, porady prawnej ani integracji KSeF. Każdy raport wymaga weryfikacji osoby odpowiedzialnej.

## Prywatność demonstracji

Dane są przetwarzane lokalnie w przeglądarce. Plik nie jest wysyłany do aplikacji ani zapisywany na serwerze.

## Testy

```bash
npm test
```
