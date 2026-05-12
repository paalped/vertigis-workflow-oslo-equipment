# vertigis-workflow-oslo-equipment

VertiGIS Studio Workflow activity pack: merge **ledning** equipment codes with **kum** (manhole) codes for DV/SOAP-style `<Equipment>` payloads. This centralizes the pattern that was spread across Evaluate steps (`sid_array` + `psid_fcode_array`) in Oslo VA workflows.

## Activity: **Merge Line and Kum Equipment Codes**

- **Inputs**
  - `lineEquipmentCodes` — Tokens you already built for lines (comma-separated string or `string[]`).
  - `kumFeatures` — Query results / graphics: `{ attributes }` or plain attribute objects.
  - `includeKummer` — Default `true`. Set `false` to return only line codes.
  - `externRefFieldNames`, `fcodeFieldName`, `psidFieldName`, `fcodePsidSeparator` — Optional; defaults match common EXTERNREF / FCODE / PSID usage.
  - `deduplicate` — Default `true` (first occurrence wins).
- **Outputs**
  - `equipmentCodes` — `string[]`
  - `equipmentCodesCsv` — Same list joined with `,` for Evaluate/WebRequest.

## Build (lokalt)

```bash
npm install
npm run build
```

Output: `build/main.js` and `build/activitypack.json`.

## GitHub Pages (automatisk)

Ved hver push til **`main`** bygger [GitHub Actions](.github/workflows/deploy-pages.yml) pakka og publiserer **`build/`** til **GitHub Pages**.

### Engangsoppsett i GitHub-repoet

1. Gå til **Settings** → **Pages** → **Build and deployment**.
2. Under **Source**, velg **GitHub Actions** (ikke «Deploy from a branch»).
3. Første gang workflow kjører kan GitHub be om å **godkjenne** «github-pages»-miljøet (sjekk **Actions**-fanen hvis deploy henger).

Etter et vellykket kjørsel ligger manifestet her (bytt eier/repo om du har forket):

**`https://paalped.github.io/vertigis-workflow-oslo-equipment/activitypack.json`**

`main.js` lastes fra samme rot (relativt til manifestet).

### Registrer i ArcGIS (VertiGIS Workflow)

1. I **ArcGIS Online** eller **Portal**: **Legg til element** → **Et program**.
2. **URL:** lim inn Pages-URL over (må slutte på **`activitypack.json`**).
3. Legg til tag / nøkkelordet **`geocortex-workflow-activity-pack`** (påkrevd av VertiGIS).
4. Del elementet med gruppe/org slik at **workflow-forfattere** ser aktivitetspakka i Designer.

VertiGIS krever **HTTPS**. GitHub Pages oppfyller det. Om CORS mot deres miljø gir problemer, se [VertiGIS deployment](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/#deployment).

## Annen hosting (HTTPS + CORS)

Du kan også legge ut `build/` på egen statisk hosting (Azure, S3+CloudFront, IIS, nginx) med gyldig sertifikat og CORS mot Workflow Designer-opprinnelsen.

## Development

```bash
npm start
```

Dev manifest: `https://localhost:5000/activitypack.json` (bare på samme maskin som nettleseren).

## Requirements

- VertiGIS Studio Workflow **5.31+** (se [SDK overview](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/)).

## License

MIT
