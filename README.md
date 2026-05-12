# vertigis-workflow-oslo-equipment

VertiGIS Studio Workflow activity pack: **hovedfeatures** + **tilleggsfeatures** til én DV/SOAP **`<Equipment>`**-liste (Oslo VA), med fast EXTERNREF / FCODE+LSID eller FCODE+PSID.

## Activity: **Slå sammen ledning og kum utstyrskoder** (pakke **v2.0.0**)

Ingen bakoverkompatibilitet med eldre feltnavn — bruk bare tabellen under.

### Hardkodede attributter

**EXTERNREF** (og vanlige varianter), ellers **FCODE** + **LSID** på **ledning**, **FCODE** + **PSID** på **kum** og **brann**. Ingen skilletegn mellom FCODE og id. **Tilleggsfeatures** enkodes alltid med **PSID**-regelen.

### Inputs

| Nøkkel | Designer (kort) |
|--------|-----------------|
| **`mainFeatures`** | *Hovedfeatures* — typ. `selectedFeatureSet.featureSet.features` |
| **`includedFeatures`** | *Tilleggsfeatures* — valgfritt; ved ledning kun hvis spyling er sann |
| **`mainFeatureType`** | *Hovedtype*: **`ledning`**, **`kum`**, **`brann`** (alias: `line`, `manhole`, `brannkum`, …) |
| **`spylingInkluderKummer`** | *Inkluder kummer ved spyling* — bare relevant når typen er **ledning**; må være **sann** for at tillegg skal brukes |
| **`deduplicate`** | *Fjern duplikater* (standard sann) |

Mangler **hovedtype**, behandles det som **ledning**.

Tom **`mainFeatures`** → `equipmentCodes` / `equipmentCodesCsv` er tomme.

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
