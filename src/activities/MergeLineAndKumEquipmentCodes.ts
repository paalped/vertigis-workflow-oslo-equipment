import type { IActivityContext, IActivityHandler } from "@vertigis/workflow/IActivityHandler";

/**
 * Oslo VA / DV feature attributes used when EXTERNREF is missing / for FCODE pairs.
 * Fixed for this activity version — not exposed as Workflow inputs.
 */
const EXTERNREF_LOOKUP_NAMES = ["EXTERNREF", "ExternRef", "externref"] as const;
const FIELD_FCODE = "FCODE";
const FIELD_LSID = "LSID";
const FIELD_PSID = "PSID";
/** Between FCODE and LSID / PSID when building codes from attributes (empty = concat). */
const FCODE_ID_SEPARATOR = "";

export interface MergeLineAndKumEquipmentCodesInputs {
    /**
     * @displayName Valgte features (hovedutvalg)
     * @description Samme feature-liste uansett om bruker har valgt **ledning** eller **kum** — typisk `selectedFeatureSet.featureSet.features` (eller tilsvarende) fra kartet.
     */
    selectedFeatures?: unknown[];

    /**
     * @displayName Hovedutvalg: ledning eller kum
     * @description Bruk strengen **ledning** (eller `line`) når hovedutvalget er rør/ledning (FCODE+LSID). Bruk **kum** (eller `manhole`) når hovedutvalget er kum (FCODE+PSID). Styrer hvordan `selectedFeatures` oversettes til utstyrskoder.
     */
    selectedFeatureKind?: string;

    /**
     * @displayName Tilknyttede kum-features (spyling)
     * @description Ekstra kumanlegg fra spørring el.l., typisk når hovedutvalget er **ledning** og **Inkluder kummer ved spyling** er sann. Valgfritt.
     */
    linkedKumFeatures?: unknown[];

    /**
     * @displayName Ledningsfeatures (eldre mønster)
     * @description Brukes bare om **Valgte features (hovedutvalg)** ikke er satt. Se `selectedFeatures`.
     */
    lineFeatures?: unknown[];

    /**
     * @displayName Kum-features (eldre mønster)
     * @description Brukes bare om **Valgte features (hovedutvalg)** ikke er satt. Se `selectedFeatures` + `linkedKumFeatures`.
     */
    kumFeatures?: unknown[];

    /**
     * @displayName Inkluder kummer ved spyling
     * @description Sett **sann** når arbeidet gjelder **spyling på valgt ledning**, slik at tilknyttede kummer tas med — da brukes **Tilknyttede kum-features** om det er oppgitt. I alle andre tilfeller **usann**. (Eldre workflows uten `spylingInkluderKummer` bruker `inkluderKummer` / `includeKummer`.)
     */
    spylingInkluderKummer?: boolean;

    /**
     * @displayName Fjern duplikater
     * @description Fjerner like koder; første rekkefølge beholdes.
     */
    deduplicate?: boolean;
}

type LegacyMergeInputs = {
    lineEquipmentCodes?: string | string[];
    manholeFeatures?: unknown[];
    inkluderKummer?: boolean;
    includeKummer?: boolean;
};

export interface MergeLineAndKumEquipmentCodesOutputs {
    /**
     * @description Ordered equipment codes suitable for SOAP Equipment lists.
     */
    equipmentCodes: string[];

    /**
     * @description Same codes as a comma-separated string (convenient for Evaluate/WebRequest).
     */
    equipmentCodesCsv: string;
}

function normalizeLineCodes(value: string | string[] | undefined | null): string[] {
    if (value == null) {
        return [];
    }
    if (Array.isArray(value)) {
        return value
            .filter((v) => v != null && String(v).trim().length > 0)
            .flatMap((v) => {
                const s = String(v).trim();
                return s.includes(",")
                    ? s
                          .split(",")
                          .map((x) => x.trim())
                          .filter((x) => x.length > 0)
                    : [s];
            });
    }
    const s = String(value).trim();
    if (!s) {
        return [];
    }
    return s
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
}

function getAttributes(feature: unknown): Record<string, unknown> | undefined {
    if (!feature || typeof feature !== "object") {
        return undefined;
    }
    const f = feature as Record<string, unknown>;
    const attrs = f.attributes;
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
        return attrs as Record<string, unknown>;
    }
    return f;
}

function pickString(attrs: Record<string, unknown>, names: readonly string[]): string | undefined {
    const keys = Object.keys(attrs);
    for (const name of names) {
        const direct = attrs[name];
        if (direct != null && String(direct).trim() !== "") {
            return String(direct).trim();
        }
        const found = keys.find((k) => k.toLowerCase() === name.toLowerCase());
        if (found != null && attrs[found] != null && String(attrs[found]).trim() !== "") {
            return String(attrs[found]).trim();
        }
    }
    return undefined;
}

function uniqueOrdered(codes: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of codes) {
        if (!seen.has(c)) {
            seen.add(c);
            out.push(c);
        }
    }
    return out;
}

function codeFromDvFeature(
    attrs: Record<string, unknown>,
    secondIdField: typeof FIELD_LSID | typeof FIELD_PSID
): string | undefined {
    const ext = pickString(attrs, EXTERNREF_LOOKUP_NAMES);
    if (ext) {
        return ext;
    }
    const fcode = pickString(attrs, [FIELD_FCODE]);
    const second = pickString(attrs, [secondIdField]);
    if (fcode && second) {
        return `${fcode}${FCODE_ID_SEPARATOR}${second}`;
    }
    return undefined;
}

function codesFromFeatureList(
    features: unknown[],
    secondIdField: typeof FIELD_LSID | typeof FIELD_PSID
): string[] {
    const out: string[] = [];
    for (const feature of features) {
        const attrs = getAttributes(feature);
        if (!attrs) {
            continue;
        }
        const code = codeFromDvFeature(attrs, secondIdField);
        if (code) {
            out.push(code);
        }
    }
    return out;
}

/** Map UI / workflow literals to internal kind. */
function normalizeMainKind(kind: unknown): "ledning" | "kum" | null {
    if (kind == null) {
        return null;
    }
    const s = String(kind).trim().toLowerCase();
    if (s === "ledning" || s === "line" || s === "pipe" || s === "rør") {
        return "ledning";
    }
    if (s === "kum" || s === "manhole" || s === "manholes") {
        return "kum";
    }
    return null;
}

function shouldIncludeKummer(raw: MergeLineAndKumEquipmentCodesInputs & LegacyMergeInputs): boolean {
    if (raw.spylingInkluderKummer === true) {
        return true;
    }
    if (raw.spylingInkluderKummer === false) {
        return false;
    }
    return raw.inkluderKummer !== false && raw.includeKummer !== false;
}

/**
 * @displayName Slå sammen ledning og kum utstyrskoder
 * @description Bygger én utstyrskodeliste for DV/SOAP. Støtter **ett hovedutvalg** (`selectedFeatures` + ledning/kum-valg) som i addWorkOrders-mønsteret, eller eldre `lineFeatures`/`kumFeatures`. Pakke v1.4.0.
 * @category Oslo VA
 */
export class MergeLineAndKumEquipmentCodes implements IActivityHandler {
    async execute(
        inputs: MergeLineAndKumEquipmentCodesInputs,
        _context: IActivityContext
    ): Promise<MergeLineAndKumEquipmentCodesOutputs> {
        const raw = inputs as MergeLineAndKumEquipmentCodesInputs & LegacyMergeInputs;

        const deduplicate = raw.deduplicate !== false;
        let linePart: string[] = [];
        let kumPart: string[] = [];

        const selected = raw.selectedFeatures;
        const hasSelectedMain = Array.isArray(selected) && selected.length > 0;

        if (hasSelectedMain) {
            const kind = normalizeMainKind(raw.selectedFeatureKind) ?? "ledning";
            if (kind === "ledning") {
                linePart = codesFromFeatureList(selected, FIELD_LSID);
                if (shouldIncludeKummer(raw)) {
                    const linked = raw.linkedKumFeatures ?? [];
                    const legacyKum = raw.kumFeatures ?? raw.manholeFeatures ?? [];
                    const extraKum = linked.length > 0 ? linked : legacyKum;
                    if (extraKum.length > 0) {
                        kumPart = codesFromFeatureList(extraKum, FIELD_PSID);
                    }
                }
            } else {
                kumPart = codesFromFeatureList(selected, FIELD_PSID);
            }
        } else {
            if (raw.lineFeatures?.length) {
                linePart = codesFromFeatureList(raw.lineFeatures, FIELD_LSID);
            } else if (raw.lineEquipmentCodes != null) {
                linePart = normalizeLineCodes(raw.lineEquipmentCodes);
            }

            const kumList = raw.kumFeatures ?? raw.manholeFeatures ?? [];
            const inkluderKummer = shouldIncludeKummer(raw);
            if (inkluderKummer && kumList.length > 0) {
                kumPart = codesFromFeatureList(kumList, FIELD_PSID);
            }
        }

        const merged = [...linePart, ...kumPart];
        const equipmentCodes = deduplicate ? uniqueOrdered(merged) : merged;
        return {
            equipmentCodes,
            equipmentCodesCsv: equipmentCodes.join(","),
        };
    }
}
