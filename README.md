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

VertiGIS oppdager aktivitetspakka som et **Portal-element** som peker på manifestet (`activitypack.json`). Du skal **ikke** gå via OAuth-/utviklerflyten for denne typen innhold.

**Manifest-URL (produksjon):**  
`https://paalped.github.io/vertigis-workflow-oslo-equipment/activitypack.json`

#### 1. Start i Portal / ArcGIS Online

1. Gå til **Mitt innhold** / **My Content**.
2. **Legg til** / **Add** → **Legg til element** / **New item** (ordlyden varierer litt med språk og versjon).
3. Velg kategorien **Applikasjon** / **Application** (ikke «kart», «fil» eller «geoobjektlag»).

#### 2. Velg riktig *under*type av applikasjon

Veiviseren for **applikasjon** har flere spor. For en VertiGIS-aktivitetspakke gjelder:

| Velg **ikke** dette | Hvorfor |
|---------------------|--------|
| **Utviklerlegitimasjon** / **Developer credentials** (OAuth, API-nøkkel, registrering av klient-app) | Det er for apper som skal logge brukere inn i plattformen og utstede egne tokens. Aktivitetspakka er bare en **HTTPS-referanse** til en JSON-fil. |

Du skal i stedet bruke flyten som tilsvarer Esri-hjelpen **«Add an app from a URL»** / legge til app **fra URL** (referanse, uten å registrere OAuth for selve lenken).

##### Applikasjonstype i ArcGIS Enterprise (eksempel Oslo `kartportal`)

I «Nytt element» → **Applikasjon** visas en liste som likner på denne:

| Valg | Bruk for VertiGIS-aktivitetspakke? |
|------|-------------------------------------|
| **Webkart** | Vanligvis **nei** — typisk for apper koblet til et «vanlig» webkart-element, ikke for `activitypack.json`. |
| **Skrivebord** | **Nei**. |
| **Mobil** | **Nei**. |
| **Applikasjonsutvidelse (AppBuilder)** | **Nei** — det er for **ArcGIS Web AppBuilder**-utvidelser og deres manifest-skjema. VertiGIS Workflow sin `activitypack.json` er **ikke** en AppBuilder-manifest. Velg derfor **ikke** denne selv om feltet heter «Manifest-URL». |
| **Experience Builder-miniprogram** | **Nei** — gjelder Experience Builder. |
| **Annen applikasjon** | **Ja — dette er valget vi mener.** Her registrerer dere en generisk app som peker til en URL (i praksis samme mønster som Esri omtaler som *Other application*). Lim inn URL til `activitypack.json` i det URL-/applikasjonsfeltet veiviseren ber om. |

Om **Annen applikasjon** av en eller annen grunn ikke finnes eller ikke lar dere fullføre: avklar med GIS-/Portal-administrator i kommunen før dere bruker en annen applikasjonstype (da kan det være tilpasset skjema i deres miljø).

#### 3. Fyll inn detaljer

1. **URL** (kan hete **Applikasjons-URL**, **Manifest-URL** e.l.): lim inn manifestet — hele adressen må slutte på **`activitypack.json`**.  
2. **Tittel** og evt. **mapper** som for andre elementer.  
3. **Tag / nøkkelord (obligatorisk for VertiGIS):** legg inn nøyaktig **`geocortex-workflow-activity-pack`**. Uten denne taggen **registreres ikke** pakka i Workflow Designer.  
4. Lagre (f.eks. **Legg til element** / **Add item**).

#### 4. Deling

Del elementet med **gruppe** eller **organisasjon** slik at alle som skal bygge workflows i **VertiGIS Studio Workflow Designer** har tilgang. Sluttbrukere av kart-app trenger normalt **ikke** tilgang til dette elementet — det styrer bare hvilke egendefinerte aktiviteter som vises i Designer.

**Referanse (Esri):** [Add an app from a URL](https://doc.arcgis.com/en/arcgis-online/manage-data/add-app-url.htm) (engelsk, samme mønster i Portal for enkel kopling fra URL).  
**Referanse (VertiGIS):** [Register the activity pack](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/#register-the-activity-pack).

VertiGIS krever **HTTPS**. GitHub Pages oppfyller det. Ved CORS-problemer mot deres VertiGIS-/Portal-domene, se [VertiGIS deployment](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/#deployment).

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
