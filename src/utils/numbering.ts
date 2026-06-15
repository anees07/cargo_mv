import type { NumberingSequence } from "../types";

export function sequenceFromNumber(value?: string) {
  const match = value?.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function formatSequenceNumber(
  sequence: NumberingSequence,
  nextSequence: number,
  destCode?: string,
) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const padded = String(nextSequence).padStart(sequence.padding, "0");

  return sequence.formatTemplate
    .replace("{YYYY}", String(year))
    .replace("{MM}", month)
    .replace("{DEST}", destCode || "GEN")
    .replace("{000000}", padded);
}
