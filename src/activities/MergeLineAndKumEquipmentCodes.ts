import type { IActivityContext, IActivityHandler } from "@vertigis/workflow/IActivityHandler";

export interface MergeLineAndKumEquipmentCodesInputs {
    /**
     * @displayName Line equipment codes
     * @description Equipment codes already computed for selected lines (.externref or FCODE+LSID style tokens). Pass a single comma-separated string or an array of codes.
     */
    lineEquipmentCodes?: string | string[];

    /**
     * @displayName Kum / point features
     * @description Features from e.g. a query for manholes tied to lines. Each item may be a graphic ({ attributes }) or a plain attribute object.
     */
    kumFeatures?: unknown[];

    /**
     * @displayName Include kummer
     * @description When false, only line codes are returned (no feature expansion).
     */
    includeKummer?: boolean;

    /**
     * @displayName Extern ref field names
     * @description Attribute names to use for external reference, in order of preference (case-insensitive match).
     */
    externRefFieldNames?: string[];

    /**
     * @displayName FCODE field name
     */
    fcodeFieldName?: string;

    /**
     * @displayName PSID field name
     */
    psidFieldName?: string;

    /**
     * @displayName FCODE / PSID separator
     * @description Joins FCODE and PSID when EXTERNREF is absent. Use empty string for concatenation without separator.
     */
    fcodePsidSeparator?: string;

    /**
     * @displayName Deduplicate
     * @description Remove duplicate codes while preserving first-seen order.
     */
    deduplicate?: boolean;
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

function codeFromKum(
    attrs: Record<string, unknown>,
    externNames: string[],
    fcodeName: string,
    psidName: string,
    separator: string
): string | undefined {
    const ext = pickString(attrs, externNames);
    if (ext) {
        return ext;
    }
    const fcode = pickString(attrs, [fcodeName]);
    const psid = pickString(attrs, [psidName]);
    if (fcode && psid) {
        return `${fcode}${separator}${psid}`;
    }
    return undefined;
}

/**
 * @displayName Merge Line and Kum Equipment Codes
 * @description Builds one ordered equipment code list for DV SOAP-style payloads by combining existing line codes with manhole (kum) codes (EXTERNREF or FCODE+PSID), matching the pattern used in Oslo VA workflows.
 * @category Oslo VA
 */
export class MergeLineAndKumEquipmentCodes implements IActivityHandler {
    async execute(
        inputs: MergeLineAndKumEquipmentCodesInputs,
        _context: IActivityContext
    ): Promise<MergeLineAndKumEquipmentCodesOutputs> {
        const includeKummer = inputs.includeKummer !== false;
        const deduplicate = inputs.deduplicate !== false;
        const externRefFieldNames = inputs.externRefFieldNames?.length
            ? inputs.externRefFieldNames
            : ["EXTERNREF", "ExternRef", "externref"];
        const fcodeFieldName = inputs.fcodeFieldName ?? "FCODE";
        const psidFieldName = inputs.psidFieldName ?? "PSID";
        const fcodePsidSeparator = inputs.fcodePsidSeparator ?? "";

        const linePart = normalizeLineCodes(inputs.lineEquipmentCodes);
        const kumPart: string[] = [];

        if (includeKummer && inputs.kumFeatures?.length) {
            for (const feature of inputs.kumFeatures) {
                const attrs = getAttributes(feature);
                if (!attrs) {
                    continue;
                }
                const code = codeFromKum(attrs, externRefFieldNames, fcodeFieldName, psidFieldName, fcodePsidSeparator);
                if (code) {
                    kumPart.push(code);
                }
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
