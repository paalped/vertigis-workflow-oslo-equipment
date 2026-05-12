# vertigis-workflow-oslo-equipment

VertiGIS Studio Workflow activity pack: **hovedfeatures** + **tilleggsfeatures** til én DV/SOAP **`<Equipment>`**-liste (Oslo VA), med fast EXTERNREF / FCODE+LSID eller FCODE+PSID.

## Activity: **Slå sammen ledning og kum utstyrskoder** (pakke **v2.2.0**)

### Hardkodede attributter (kun store bokstaver)

**EXTERNREF**, ellers **FCODE** + **LSID** (ledning) eller **FCODE** + **PSID** (kum/brann). Ingen skilletegn mellom FCODE og id. **Tilleggsfeatures** bruker alltid **PSID**-regelen.

### Inputs

| Nøkkel | Designer (kort) |
|--------|-----------------|
| **`mainFeatures`** | *Hovedfeatures* — tabell av features **eller** f.eks. `$selectedFeatureSet`, `.featureSet`, `.featureSet.features` (aktiviteten pakker ut via `attributes` / `features` / `featureSet`) |
| **`includedFeatures`** | *Tilleggsfeatures* — samme utpakking; ved ledning kun hvis spyling er sann |
| **`mainFeatureType`** | *Hovedtype* fra meny: **`ledning`**, **`kum`** eller **`brann`** |
| **`spylingInkluderKummer`** | *Inkluder kummer ved spyling* — bare når typen er **ledning**; må være **sann** for tillegg |
| **`uniqueEquipmentCodes`** | *Unike utstyrskoder for Equipment* — **sann** (standard): én oppføring per kode; **usann**: behold alle |

Verdi som ikke er **`kum`** eller **`brann`** (etter trim) behandles som **ledning**.

Tom **`mainFeatures`** (etter utpakking) → tomme outputs.

### Outputs

- `equipmentCodes` (`string[]`)
- `equipmentCodesCsv`

### Merk

«Catchments» er ikke kum.

## Build (lokalt)

```bash
npm install
npm run build
```

Output: `build/main.js` og `build/activitypack.json`.

## GitHub Pages (automatisk)

Ved push til **`main`** bygger [GitHub Actions](.github/workflows/deploy-pages.yml) og publiserer **`build/`**.

### Engangsoppsett i GitHub-repoet

1. **Settings** → **Pages** → **Source: GitHub Actions**
2. Første kjøring kan kreve godkjenning av «github-pages»-miljøet

Manifest (eksempel):  
`https://paalped.github.io/vertigis-workflow-oslo-equipment/activitypack.json`

### Registrer i Portal (VertiGIS)

1. **Mitt innhold** → **Legg til element** → **Applikasjon**
2. **Webkart** → URL til **`activitypack.json`**
3. Tag **`geocortex-workflow-activity-pack`**
4. Del med workflow-forfattere; **oppfrisk** Workflow Designer

Se tidligere detaljer om Oslo `kartportal` i git-historikk om nødvendig.

## Development

```bash
npm start
```

## Requirements

VertiGIS Studio Workflow **5.31+**

## License

MIT
