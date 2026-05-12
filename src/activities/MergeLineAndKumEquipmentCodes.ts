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
     * @displayName Ledningsfeatures
     * @description Rør-/ledningsfeatures. Én utstyrskode per feature: EXTERNREF, eller FCODE+LSID (faste feltnavn).
     */
    lineFeatures?: unknown[];

    /**
     * @displayName Kum-features
     * @description Kum (manhole)-punkter. Én kode per feature: EXTERNREF, eller FCODE+PSID. Tom liste = ingen kummer.
     */
    kumFeatures?: unknown[];

    /**
     * @displayName Inkluder kummer
     * @description Når usann brukes ikke kum-lista (kun ledning). Standard sann.
     */
    inkluderKummer?: boolean;

    /**
     * @displayName Fjern duplikater
     * @description Fjerner like koder; første rekkefølge beholdes.
     */
    deduplicate?: boolean;
}

type LegacyMergeInputs = {
    lineEquipmentCodes?: string | string[];
    /** v1.1.0 property name */
    manholeFeatures?: unknown[];
    /** Eldre stavemåte */
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

/**
 * @displayName Slå sammen ledning og kum utstyrskoder
 * @description Bygger én utstyrskodeliste for DV/SOAP. Faste attributter: EXTERNREF (eller varianter), ellers FCODE+LSID / FCODE+PSID. Pakke v1.2.0.
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
        if (raw.lineFeatures?.length) {
            linePart = codesFromFeatureList(raw.lineFeatures, FIELD_LSID);
        } else if (raw.lineEquipmentCodes != null) {
            linePart = normalizeLineCodes(raw.lineEquipmentCodes);
        }

        const kumList = raw.kumFeatures ?? raw.manholeFeatures ?? [];
        const inkluderKummer =
            raw.inkluderKummer !== false && raw.includeKummer !== false;

        let kumPart: string[] = [];
        if (inkluderKummer && kumList.length > 0) {
            kumPart = codesFromFeatureList(kumList, FIELD_PSID);
        }

        const merged = [...linePart, ...kumPart];
        const equipmentCodes = deduplicate ? uniqueOrdered(merged) : merged;
        return {
            equipmentCodes,
            equipmentCodesCsv: equipmentCodes.join(","),
        };
    }
}
