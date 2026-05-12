# vertigis-workflow-oslo-equipment

VertiGIS Studio Workflow activity pack: merge **ledning** equipment codes with **kum** (manhole) codes for DV/SOAP-style `<Equipment>` payloads. This centralizes the pattern that was spread across Evaluate steps (`sid_array` + `psid_fcode_array`) in Oslo VA workflows.

## Activity: **Slå sammen ledning og kum utstyrskoder** (pakke **v1.4.0**)

Verktøynavn og feltetiketter i Designer er **norske** der det gir mening; tekniske nøkler (`selectedFeatures`, …) er stabile for JSON.

- **Hardkodede attributter** — **EXTERNREF** (varianter), ellers **FCODE+LSID** på ledning og **FCODE+PSID** på kum, uten skilletegn.

### Anbefalt: ett hovedutvalg (addWorkOrders-mønster)

Bind samme feature-liste uansett om brukeren valgte **ledning** eller **kum** — typisk `selectedFeatureSet.featureSet.features` (tilpass til deres uttrykk).

| Nøkkel | Designer / bruksområde |
|--------|-------------------------|
| **`selectedFeatures`** | *Valgte features (hovedutvalg)* |
| **`selectedFeatureKind`** | *Hovedutvalg: ledning eller kum* — **`ledning`** (`line` m.fl.) eller **`kum`** (`manhole`). |
| **`linkedKumFeatures`** | *Tilknyttede kum-features (spyling)* — valgfri liste; hvis tom og spyling er sann, brukes `kumFeatures` som reserve. |
| **`spylingInkluderKummer`** | *Inkluder kummer ved spyling* (v1.3-semantikk). |
| **`deduplicate`** | *Fjern duplikater*. |

Når **`selectedFeatures`** har innhold, **prioriteres** denne veien; `lineFeatures` / `kumFeatures` brukes da ikke som hovedkilde.

### Eldre mønster

Uten innhold i **`selectedFeatures`**: bruk **`lineFeatures`** og **`kumFeatures`** som før.

### Bakoverkompatibilitet

`spylingInkluderKummer` utelatt → `inkluderKummer` / `includeKummer`. `lineEquipmentCodes`, `manholeFeatures` støttes.

- **Merk** — «Catchments» er ikke kum.

- **Outputs** — `equipmentCodes`, `equipmentCodesCsv`

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

Du skal i stedet bruke flyten som tilsvarer Esri-hjelpen **«Add an app from a URL»** / legge til app **fra URL** (referanse til `activitypack.json` på HTTPS).

##### Applikasjonstype i ArcGIS Enterprise (verifisert: Oslo `kartportal`)

I «Nytt element» → **Applikasjon** kommer flere undertyper. **I deres miljø** er denne rekkefølgen fungerende og enklest:

1. **Applikasjon** → **Webkart** («Web mapping» i engelsk dokumentasjon).  
2. Lim inn **URL** til manifestet (hele adressen må slutte på **`activitypack.json`**).  
3. Legg inn tag / nøkkelord: **`geocortex-workflow-activity-pack`** (obligatorisk for VertiGIS).  
4. **Lagre** elementet (tittel, mappe osv. som for andre Portal-elementer) og **del** det med alle som bruker Designer.  
5. **Oppfrisk** nettleseren i **VertiGIS Studio Workflow Designer** (eller logg ut og inn). Da dukker aktivitetene under riktig kategori i verktøykassa.

Alternative rader i Portal-menyen:

| Valg | Merknad |
|------|---------|
| **Skrivebord** / **Mobil** | Ikke relevant her. |
| **Applikasjonsutvidelse (AppBuilder)** | For AppBuilder-utvidelser — **ikke** VertiGIS sin `activitypack.json`. |
| **Experience Builder-miniprogram** | Ikke relevant her. |
| **Annen applikasjon** | Kan i noen Portal-oppsett **tvinge** OAuth-/utvikler­flyt. Velg **Webkart** hvis den oppførselen blir i veien (som i Oslo). |

Portal kan uansett vise **OAuth- / omdirigeringsinnstillinger** på elementet (f.eks. `urn:ietf:wg:oauth:2.0:oob`); det hindrer ikke VertiGIS i å hente manifestet over HTTPS.

#### 3. Deling

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
