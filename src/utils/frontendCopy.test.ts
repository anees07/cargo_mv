import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const userFacingFiles = [
  "src/screens/AuthScreens.tsx",
  "src/screens/ManagementScreens.tsx",
  "src/screens/MasterScreens.tsx",
  "src/components/ui.tsx",
];

test("user-facing frontend copy does not mention backend providers", () => {
  const source = userFacingFiles
    .map(file => readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /Demo Firebase account/);
  assert.doesNotMatch(source, /Connected to Firebase/);
  assert.doesNotMatch(source, /Firebase realtime active/);
  assert.doesNotMatch(source, /Firestore permissions/);
  assert.doesNotMatch(source, /stored in Firestore/);
  assert.doesNotMatch(source, /backend records/);
});
