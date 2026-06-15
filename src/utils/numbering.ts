import type { NumberingSequence } from "../types";

const ignoredVesselPrefixes = new Set(["MV", "M", "V", "MS", "MT", "FV"]);

export function vesselCodeFromName(vesselName: string, fallback = "VES") {
  const words = vesselName
    .toUpperCase()
    .match(/[A-Z0-9]+/g) ?? [];
  const meaningfulWords = words.filter(word => !ignoredVesselPrefixes.has(word));
  const sourceWords = meaningfulWords.length > 0 ? meaningfulWords : words;
  const firstReadableWord = sourceWords.find(word => word.length >= 3);

  if (firstReadableWord) return firstReadableWord.slice(0, 3);

  const compact = sourceWords.join("");
  if (compact) return compact.padEnd(3, fallback).slice(0, 3);

  return fallback.slice(0, 3).toUpperCase().padEnd(3, "X");
}

export function sequenceFromNumber(value?: string) {
  const match = value?.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function formatSequenceNumber(
  sequence: NumberingSequence,
  nextSequence: number,
  options: { destCode?: string; vesselName?: string } = {},
) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const padded = String(nextSequence).padStart(sequence.padding, "0");

  return sequence.formatTemplate
    .replace("{YYYY}", String(year))
    .replace("{MM}", month)
    .replace("{DEST}", options.destCode || "GEN")
    .replace("{VESSEL}", vesselCodeFromName(options.vesselName || ""))
    .replace("{000000}", padded);
}
