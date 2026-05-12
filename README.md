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

## Build

```bash
npm install
npm run build
```

Output: `build/main.js` and `build/activitypack.json`.

## Host (HTTPS + CORS)

Serve the `build` folder from a host that:

- Uses a valid HTTPS certificate.
- Allows CORS from your Workflow Designer origin (e.g. `https://apps.vertigisstudio.com` or your Portal/Web app host).

Examples: static site on Azure Blob/IIS, AWS S3 + CloudFront, nginx, or **GitHub Pages** (upload `build` contents or use Actions to publish artifacts).

## Register in ArcGIS Portal

1. **Add Item** → **An application**.
2. **URL**: `https://your-host/.../activitypack.json` (must end with `activitypack.json`).
3. Ensure the item has the tag **`geocortex-workflow-activity-pack`** (required).

Share the item with workflow authors via group/org as needed.

## Development

```bash
npm start
```

Dev manifest: `https://localhost:5000/activitypack.json` (register the same way; localhost only works on the same machine as the browser).

## Requirements

- VertiGIS Studio Workflow **5.31+** (see [SDK overview](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/)).

## License

MIT
