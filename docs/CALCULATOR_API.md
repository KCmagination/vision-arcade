# Use the Vi$ion calculator

`POST https://vision-financial-map.rettke75.chatgpt.site/api/vision/calculate`

The experimental endpoint is public and requires no key. It returns four independent current and scenario corner signals. It does not provide its implementation. Web clients may call it directly; the bundled app forwards through its own server route.

Send `Content-Type: application/json`. Use a JSON body with exactly `current` and `scenario`, containing all fields below. Values are USD; income, living expenses and debt payments are monthly. Avoid counting the same spending in both living expenses and debt payments. Example data is fictional.

```json
{
  "current": {
    "monthlyIncome": 4250,
    "monthlyDebtPayments": 400,
    "monthlyLivingExpenses": 1300,
    "totalDebt": 98000,
    "assetValue": 140000,
    "liquidReserves": 5250,
    "creditScore": 760
  },
  "scenario": {
    "upfrontCash": 3000,
    "newMonthlyPayment": 350,
    "newDebt": 25000,
    "acquiredAssetValue": 32000,
    "monthlyIncomeChange": 0
  }
}
```

`assetValue` is the resale value of material assets; `totalDebt` is total outstanding debt, separate from monthly payments. `liquidReserves` is available liquid money. `creditScore: null` represents unknown credit. Scenario entries represent changes; hypothetical credit is not predicted.

The response is the `Comparison` interface in `lib/vision-contract.d.ts`: `current`, `scenario`, and per-corner `deltas`. Each snapshot includes a scoring version and `cashFlow`, `capital`, `collateral`, `credit` signals. Each signal provides `status`, `strength` (0–1 or null), raw results and separate pressure where applicable. Render unknown values as unknown. Do not interpret null as a low credit score. Clients receive results, not a calibration schedule.

## Request limits and errors

- Maximum body: 4,096 bytes, including requests without a content-length header.
- Finite JSON numbers only. Amounts may be zero, otherwise their magnitude must be at least one cent and no more than $1 trillion.
- Current reserves: minimum −$1,000. Scenario income changes can be signed. Other amounts are nonnegative.
- Credit: whole number from 0 through 850, or null. This transport range is not a grading scale.
- Missing fields, extra fields and numeric strings are rejected.
- `400`: invalid input; `413`: body too large; `415`: wrong content type; `405`: unsupported method; `503`: service unavailable.

Responses use `Cache-Control: no-store, private`; no cookies are needed. Cross-origin POST and OPTIONS requests are permitted. This is an open endpoint, not an authenticated financial account connection. No durable per-user rate limiting or SLA is currently provided. Debounce edits, cancel obsolete requests and back off on failures rather than polling.

Use the public `requestComparison` helper for response checks, abort support and no-cookie requests. The app waits up to ten seconds and offers retry. Send only the required aggregate figures, never bank credentials, transaction descriptions, account numbers or identity documents.

The application does not save or log calculation payloads; provider infrastructure still processes them. Obtain informed user consent before sending someone else's financial information. API access does not grant permission to publish the private calculator source.
