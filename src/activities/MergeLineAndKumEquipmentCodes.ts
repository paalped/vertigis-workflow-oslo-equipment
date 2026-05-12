import type { IActivityContext, IActivityHandler } from "@vertigis/workflow/IActivityHandler";

/**
 * Oslo VA / DV feature attributes used when EXTERNREF is missing / for FCODE pairs.
 * Fixed in code — not Workflow inputs.
 */
const EXTERNREF_LOOKUP_NAMES = ["EXTERNREF", "ExternRef", "externref"] as const;
const FIELD_FCODE = "FCODE";
const FIELD_LSID = "LSID";
const FIELD_PSID = "PSID";
const FCODE_ID_SEPARATOR = "";

export interface MergeLineAndKumEquipmentCodesInputs {
    /**
     * @displayName Hovedfeatures
     * @description Brukerens hovedutvalg — typisk `selectedFeatureSet.featureSet.features` (eller tilsvarende).
     */
    mainFeatures?: unknown[];

    /**
     * @displayName Tilleggsfeatures
     * @description Ekstra features i samme utstyrsliste. Ved **ledning** brukes de bare når **Inkluder kummer ved spyling** er sann. Ved **kum** eller **brann** brukes de når lista ikke er tom.
     */
    includedFeatures?: unknown[];

    /**
     * @displayName Hovedtype
     * @description **ledning** (FCODE+LSID), **kum** eller **brann** (FCODE+PSID). Alias: `line`, `manhole`, `brannkum`, osv.
     */
    mainFeatureType?: string;

    /**
     * @displayName Inkluder kummer ved spyling
     * @description Gjelder når **Hovedtype** er **ledning**: **sann** = ta med **Tilleggsfeatures** (tilknyttede kummer). Ellers **usann** eller utelatt.
     */
    spylingInkluderKummer?: boolean;

    /**
     * @displayName Unike utstyrskoder for Equipment
     * @description **Sann** (standard): samme utstyrskode bare én gang i lista som sendes til DV/SOAP **Equipment** — hvis flere features ga samme kode, beholdes første rekkefølge. **Usann**: alle koder fra features tas med, også ved duplikater.
     */
    uniqueEquipmentCodes?: boolean;
}

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

function normalizeMainFeatureType(v: unknown): "ledning" | "kum" | "brann" | null {
    if (v == null) {
        return null;
    }
    const s = String(v).trim().toLowerCase();
    if (s === "ledning" || s === "line" || s === "pipe" || s === "rør") {
        return "ledning";
    }
    if (s === "kum" || s === "manhole" || s === "manholes") {
        return "kum";
    }
    if (s === "brann" || s === "brannkum" || s === "fire" || s === "hydrant") {
        return "brann";
    }
    return null;
}

function idFieldForMainType(t: "ledning" | "kum" | "brann"): typeof FIELD_LSID | typeof FIELD_PSID {
    return t === "ledning" ? FIELD_LSID : FIELD_PSID;
}

function resolveIncludedToEncode(
    mainType: "ledning" | "kum" | "brann",
    included: unknown[] | undefined,
    spylingInkluderKummer: boolean | undefined
): unknown[] {
    if (!Array.isArray(included) || included.length === 0) {
        return [];
    }
    if (mainType === "ledning") {
        return spylingInkluderKummer === true ? included : [];
    }
    return included;
}

/**
 * @displayName Slå sammen ledning og kum utstyrskoder
 * @description DV/SOAP utstyrskoder fra **hovedfeatures** + valgfrie **tilleggsfeatures**. **ledning** → LSID, **kum** / **brann** → PSID. Tillegg enkodes alltid med PSID-regel. Pakke v2.1.0.
 * @category Oslo VA
 */
export class MergeLineAndKumEquipmentCodes implements IActivityHandler {
    async execute(
        inputs: MergeLineAndKumEquipmentCodesInputs,
        _context: IActivityContext
    ): Promise<MergeLineAndKumEquipmentCodesOutputs> {
        const collapseDuplicates = inputs.uniqueEquipmentCodes !== false;
        const main = inputs.mainFeatures;
        if (!Array.isArray(main) || main.length === 0) {
            return { equipmentCodes: [], equipmentCodesCsv: "" };
        }

        const mainType = normalizeMainFeatureType(inputs.mainFeatureType) ?? "ledning";
        const mainField = idFieldForMainType(mainType);
        const mainCodes = codesFromFeatureList(main, mainField);

        let linePart: string[] = [];
        let pointPart: string[] = [];

        if (mainType === "ledning") {
            linePart = mainCodes;
        } else {
            pointPart = mainCodes;
        }

        const extra = resolveIncludedToEncode(
            mainType,
            inputs.includedFeatures,
            inputs.spylingInkluderKummer
        );
        if (extra.length > 0) {
            pointPart = [...pointPart, ...codesFromFeatureList(extra, FIELD_PSID)];
        }

        const merged = [...linePart, ...pointPart];
        const equipmentCodes = collapseDuplicates ? uniqueOrdered(merged) : merged;
        return {
            equipmentCodes,
            equipmentCodesCsv: equipmentCodes.join(","),
        };
    }
}
