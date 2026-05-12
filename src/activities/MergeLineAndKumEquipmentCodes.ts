import type { IActivityContext, IActivityHandler } from "@vertigis/workflow/IActivityHandler";

export interface MergeLineAndKumEquipmentCodesInputs {
    /**
     * @displayName Line features
     * @description Pipe / line features (graphics). One equipment code per feature: EXTERNREF, or FCODE + line segment id (default LSID).
     */
    lineFeatures?: unknown[];

    /**
     * @displayName Manhole features
     * @description Manhole (kum) point features. One equipment code per feature: EXTERNREF, or FCODE + PSID. Omit or pass an empty list to exclude manholes.
     */
    manholeFeatures?: unknown[];

    /**
     * @displayName Extern reference field names
     * @description Attribute names for external reference, in order of preference (case-insensitive match). Used for both line and manhole features.
     */
    externRefFieldNames?: string[];

    /**
     * @displayName FCODE field name
     * @description Used when building codes from FCODE + line segment id or FCODE + point id.
     */
    fcodeFieldName?: string;

    /**
     * @displayName Line segment id field name
     * @description Line features: attribute used with FCODE when EXTERNREF is missing (default LSID).
     */
    lineSegmentIdFieldName?: string;

    /**
     * @displayName FCODE and line segment id separator
     * @description Joins FCODE and line segment id when EXTERNREF is absent. Empty string means no separator.
     */
    lineFcodeSegmentSeparator?: string;

    /**
     * @displayName Manhole point id field name
     * @description Manhole features: attribute used with FCODE when EXTERNREF is missing (default PSID).
     */
    manholePointIdFieldName?: string;

    /**
     * @displayName FCODE and manhole point id separator
     * @description Joins FCODE and manhole point id when EXTERNREF is absent. Empty string means no separator.
     */
    manholeFcodePointSeparator?: string;

    /**
     * @displayName Deduplicate
     * @description Remove duplicate codes while preserving first-seen order.
     */
    deduplicate?: boolean;
}

type LegacyMergeInputs = {
    lineEquipmentCodes?: string | string[];
    kumFeatures?: unknown[];
    includeKummer?: boolean;
    psidFieldName?: string;
    fcodePsidSeparator?: string;
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

function pickString(attrs: Record<string, unknown>, names: string[]): string | undefined {
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

function codeFromExternOrFcodePair(
    attrs: Record<string, unknown>,
    externNames: string[],
    fcodeName: string,
    secondIdName: string,
    separator: string
): string | undefined {
    const ext = pickString(attrs, externNames);
    if (ext) {
        return ext;
    }
    const fcode = pickString(attrs, [fcodeName]);
    const second = pickString(attrs, [secondIdName]);
    if (fcode && second) {
        return `${fcode}${separator}${second}`;
    }
    return undefined;
}

function codesFromFeatureList(
    features: unknown[],
    externNames: string[],
    fcodeName: string,
    secondFieldName: string,
    separator: string
): string[] {
    const out: string[] = [];
    for (const feature of features) {
        const attrs = getAttributes(feature);
        if (!attrs) {
            continue;
        }
        const code = codeFromExternOrFcodePair(attrs, externNames, fcodeName, secondFieldName, separator);
        if (code) {
            out.push(code);
        }
    }
    return out;
}

/**
 * @displayName Merge Line and Manhole Equipment Codes
 * @description Builds one equipment code list for DV SOAP-style payloads from line features and manhole features (EXTERNREF or FCODE+ids). Same pattern as Oslo VA sid / psid_fcode lists.
 * @category Oslo VA
 */
export class MergeLineAndKumEquipmentCodes implements IActivityHandler {
    async execute(
        inputs: MergeLineAndKumEquipmentCodesInputs,
        _context: IActivityContext
    ): Promise<MergeLineAndKumEquipmentCodesOutputs> {
        const legacy = inputs as MergeLineAndKumEquipmentCodesInputs & LegacyMergeInputs;

        const deduplicate = legacy.deduplicate !== false;
        const externRefFieldNames = legacy.externRefFieldNames?.length
            ? legacy.externRefFieldNames
            : ["EXTERNREF", "ExternRef", "externref"];
        const fcodeFieldName = legacy.fcodeFieldName ?? "FCODE";
        const lineSegField = legacy.lineSegmentIdFieldName ?? "LSID";
        const lineSep = legacy.lineFcodeSegmentSeparator ?? "";
        const manholePointField = legacy.manholePointIdFieldName ?? legacy.psidFieldName ?? "PSID";
        const manholeSep = legacy.manholeFcodePointSeparator ?? legacy.fcodePsidSeparator ?? "";

        let linePart: string[] = [];
        if (legacy.lineFeatures?.length) {
            linePart = codesFromFeatureList(
                legacy.lineFeatures,
                externRefFieldNames,
                fcodeFieldName,
                lineSegField,
                lineSep
            );
        } else if (legacy.lineEquipmentCodes != null) {
            linePart = normalizeLineCodes(legacy.lineEquipmentCodes);
        }

        const manholeList = legacy.manholeFeatures ?? legacy.kumFeatures ?? [];
        const includeManholes = legacy.includeKummer !== false;
        let manholePart: string[] = [];
        if (includeManholes && manholeList.length > 0) {
            manholePart = codesFromFeatureList(
                manholeList,
                externRefFieldNames,
                fcodeFieldName,
                manholePointField,
                manholeSep
            );
        }

        const merged = [...linePart, ...manholePart];
        const equipmentCodes = deduplicate ? uniqueOrdered(merged) : merged;
        return {
            equipmentCodes,
            equipmentCodesCsv: equipmentCodes.join(","),
        };
    }
}
