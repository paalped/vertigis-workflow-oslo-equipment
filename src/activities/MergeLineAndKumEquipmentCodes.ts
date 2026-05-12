import type { IActivityContext, IActivityHandler } from "@vertigis/workflow/IActivityHandler";

const FIELD_EXTERNREF = "EXTERNREF";
const FIELD_FCODE = "FCODE";
const FIELD_LSID = "LSID";
const FIELD_PSID = "PSID";
const FCODE_ID_SEPARATOR = "";

export interface MergeLineAndKumEquipmentCodesInputs {
    /**
     * @displayName Hovedfeatures
     * @description Features fra utvalg / query. Du kan sende f.eks. `$selectedFeatureSet`, `$selectedFeatureSet.featureSet` eller `$selectedFeatureSet.featureSet.features` — aktiviteten finner `attributes`, eller `features`, eller `featureSet` og pakker ut til en liste.
     */
    mainFeatures?: unknown;

    /**
     * @displayName Tilleggsfeatures
     * @description Samme utpakking som **Hovedfeatures**. Ved **ledning** brukes lista bare når **Inkluder kummer ved spyling** er sann. Ved **kum** eller **brann** brukes den når den ikke er tom.
     */
    includedFeatures?: unknown;

    /**
     * @displayName Hovedtype
     * @description Verdi fra nedtrekksmeny: **`ledning`**, **`kum`** eller **`brann`** (én av disse tre).
     */
    mainFeatureType?: string;

    /**
     * @displayName Inkluder kummer ved spyling
     * @description Gjelder når **Hovedtype** er **ledning**: **sann** = ta med **Tilleggsfeatures**. Ellers **usann** eller utelatt.
     */
    spylingInkluderKummer?: boolean;

    /**
     * @displayName Unike utstyrskoder for Equipment
     * @description **Sann** (standard): samme utstyrskode bare én gang i lista til DV/SOAP **Equipment**. **Usann**: behold alle koder, også duplikater.
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

/**
 * VertiGIS / ArcGIS: ett enkelt objekt kan være wrapper (`featureSet`, `features`) eller et feature med `attributes`.
 * Rekkefølge: `attributes` → `features` → `featureSet`.
 */
function unwrapToFeatureList(input: unknown): unknown[] {
    if (input == null) {
        return [];
    }
    if (Array.isArray(input)) {
        return input.flatMap((item) => unwrapToFeatureList(item));
    }
    if (typeof input !== "object") {
        return [];
    }
    const o = input as Record<string, unknown>;

    const attrs = o.attributes;
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
        return [input];
    }

    if (Array.isArray(o.features)) {
        return unwrapToFeatureList(o.features);
    }

    if (o.featureSet != null) {
        return unwrapToFeatureList(o.featureSet);
    }

    return [];
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

function attrString(attrs: Record<string, unknown>, field: string): string | undefined {
    const v = attrs[field];
    if (v != null && String(v).trim() !== "") {
        return String(v).trim();
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
    const ext = attrString(attrs, FIELD_EXTERNREF);
    if (ext) {
        return ext;
    }
    const fcode = attrString(attrs, FIELD_FCODE);
    const second = attrString(attrs, secondIdField);
    if (fcode && second) {
        return `${fcode}${FCODE_ID_SEPARATOR}${second}`;
    }
    return undefined;
}

function codesFromFeatures(features: unknown[], secondIdField: typeof FIELD_LSID | typeof FIELD_PSID): string[] {
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

function normalizeMainFeatureType(v: unknown): "ledning" | "kum" | "brann" {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "kum") {
        return "kum";
    }
    if (s === "brann") {
        return "brann";
    }
    return "ledning";
}

function idFieldForMainType(t: "ledning" | "kum" | "brann"): typeof FIELD_LSID | typeof FIELD_PSID {
    return t === "ledning" ? FIELD_LSID : FIELD_PSID;
}

function resolveIncludedToEncode(
    mainType: "ledning" | "kum" | "brann",
    included: unknown[],
    spylingInkluderKummer: boolean | undefined
): unknown[] {
    if (included.length === 0) {
        return [];
    }
    if (mainType === "ledning") {
        return spylingInkluderKummer === true ? included : [];
    }
    return included;
}

/**
 * @displayName Slå sammen ledning og kum utstyrskoder
 * @description Utstyrskoder til DV/SOAP **Equipment** fra features (**EXTERNREF**, ellers **FCODE**+**LSID** på ledning og **FCODE**+**PSID** på kum/brann). Tilleggsfeatures enkodes med **PSID**. Pakke v2.2.0.
 * @category Oslo VA
 */
export class MergeLineAndKumEquipmentCodes implements IActivityHandler {
    async execute(
        inputs: MergeLineAndKumEquipmentCodesInputs,
        _context: IActivityContext
    ): Promise<MergeLineAndKumEquipmentCodesOutputs> {
        const collapseDuplicates = inputs.uniqueEquipmentCodes !== false;
        const mainList = unwrapToFeatureList(inputs.mainFeatures);
        if (mainList.length === 0) {
            return { equipmentCodes: [], equipmentCodesCsv: "" };
        }

        const mainType = normalizeMainFeatureType(inputs.mainFeatureType);
        const mainField = idFieldForMainType(mainType);
        const mainCodes = codesFromFeatures(mainList, mainField);

        let linePart: string[] = [];
        let pointPart: string[] = [];

        if (mainType === "ledning") {
            linePart = mainCodes;
        } else {
            pointPart = mainCodes;
        }

        const includedFlat = unwrapToFeatureList(inputs.includedFeatures);
        const extra = resolveIncludedToEncode(mainType, includedFlat, inputs.spylingInkluderKummer);
        if (extra.length > 0) {
            pointPart = [...pointPart, ...codesFromFeatures(extra, FIELD_PSID)];
        }

        const merged = [...linePart, ...pointPart];
        const equipmentCodes = collapseDuplicates ? uniqueOrdered(merged) : merged;
        return {
            equipmentCodes,
            equipmentCodesCsv: equipmentCodes.join(","),
        };
    }
}
