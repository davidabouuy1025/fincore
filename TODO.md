**TODO**

***PROBLEM***
1. It will automatically shows duplicated quarter report, but reporting period is annual. Review again "Ingest tab\Revisit saved records", and fix the issue.
  - It should show reporting period: quarterly, if the uploaded pdf is quarterly report.
  - It should show reporting period: annual, if the uploaded pdf is annual report.
2. Add this feature to the main page: what's new. Telling this new feature.
3. The shareholder matrix in last tab fincore, should be reviewed again, as we've added quarter report. 

---

### Suggestions for Improvement:

1. **Automated Currency Conversion Integration**:
   - Currently, reports are displayed in their native reported currencies (MYR, USD, CNY, JPY, EUR). Implementing an exchange rate converter API (e.g., using open-exchange-rates or currencyapi) would enable users to convert and compare financials of peer companies reporting in different currencies under a single standardized denomination.

2. **Dynamic WACC & Cost of Capital CAPM Model**:
   - The FinCore™ engine currently uses a static 8.5% benchmark cost of capital to calculate the Economic Value Added (EVA). Creating a dynamic CAPM (Capital Asset Pricing Model) calculator using sector-specific betas, risk-free interest rates, and equity risk premiums would make the EVA output institutional-grade.

3. **Human In-The-Loop Audit Trails**:
   - Keep track of the original AI/OCR parsed values alongside the user's manual review overrides in the XML structure. Highlight user-edited cells inside the matrix dashboard and tables to build an audit history of data edits.

4. **Multi-Format Export Engine**:
   - Add export buttons to download statements (Overview, Matrix, Comparison) and the FinCore™ executive scoring report as standard Excel spreadsheets (`.xlsx`) or professional print-ready PDFs. 