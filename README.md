# Lexington Contract Desk

Texas real-estate deal intake, reusable templates, partial field population on the **official TREC 20-19 (effective July 1, 2026)**, and DocuSign **draft envelope creation**.

## Workflow
1. Enter parties/property and financial terms.
2. Open Documents & Signature, download the current original 12-page TREC 20-19 from [TREC](https://www.trec.texas.gov/forms/one-four-family-residential-contract-resale).
3. Select the original PDF and click **Auto-fill & download**. The tool overlays selected buyer/seller/property/price/escrow fields. It **does not** complete all contract fields.
4. Open and carefully review every page; manually complete all omitted fields, elections, addenda, initials, and disclosures. Do not treat the output as ready to sign merely because it is generated.
5. Select the completed PDF and mark the review checkbox. The DocuSign API route creates a **draft**, with proposed signature tabs on page 10 for buyer and seller. Review the tabs and send within DocuSign.
6. Keep signed PDF and completion certificate.

## Required DocuSign server configuration
On the hosting service, add the following **server-side** environment variables. Never commit these values or put them in client-side code:
- `APP_ACCESS_KEY`: long random website API password; enter this in website form when creating an envelope.
- `DOCUSIGN_INTEGRATION_KEY`: DocuSign OAuth integration key.
- `DOCUSIGN_USER_ID`: DocuSign API user's GUID.
- `DOCUSIGN_ACCOUNT_ID`: DocuSign account GUID.
- `DOCUSIGN_PRIVATE_KEY`: RSA private key PEM for registered integration (escape newlines as `\n` if needed).
- `DOCUSIGN_ENV`: `demo` or `production`.
- `DOCUSIGN_BASE_URI`: API base URI from DocuSign's userinfo endpoint, e.g. `https://demo.docusign.net`. 

Before JWT token requests, grant the integration **signature impersonation consent** through DocuSign. Production usage requires production integration setup and go-live approval where applicable.

## Security and operational status
The DocuSign ChatGPT connector is independent of the website's server API. A connected ChatGPT account does **not** supply API keys or permission to a hosted third-party app. Without the server configuration, the website returns 503 and cannot create envelopes. Access key is checked using timing-safe comparison, but the starter app does not include individual user accounts, rate limiting, team audit logging, or persistent deal database. It should not be exposed publicly with sensitive real-estate records until authenticated access and abuse controls are added.

PDF population uses `pdf-lib` loaded from a CDN. The overlay supports a small set of high-confidence form positions; the generated PDF is a **partially filled draft**, not an automatically completed TREC contract. Coordinates and display require user review on the exact PDF revision. Uploaded PDF bytes are processed inside the user's browser for PDF filling, and only uploaded to your own server when creating a DocuSign draft. Deal templates are saved to local browser storage.

The API deliberately creates DocuSign envelopes with `status: created` (draft) rather than sending automatically, because the initial/signature tab mapping and contract completeness must be verified.

## Deploy
This is a zero-build static site with Vercel Node serverless endpoint at `api/envelope.js`. Deploy `index.html` and `api/envelope.js` to Vercel, configure environment variables, redeploy, test with DocuSign demo, and confirm draft envelope appears before using production documents.
