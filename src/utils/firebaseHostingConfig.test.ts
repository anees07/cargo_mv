import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type FirebaseHeader = {
  key: string;
  value: string;
};

type FirebaseHeaderRule = {
  source: string;
  headers: FirebaseHeader[];
};

test("app update manifest is served without cache and with CORS for native apps", () => {
  const config = JSON.parse(fs.readFileSync("firebase.json", "utf8")) as {
    hosting?: {
      headers?: FirebaseHeaderRule[];
    };
  };
  const updateRule = config.hosting?.headers?.find(rule => rule.source === "/app-update.json");
  const headers = new Map(updateRule?.headers.map(header => [header.key.toLowerCase(), header.value]));

  assert.equal(headers.get("cache-control"), "no-cache, no-store, must-revalidate");
  assert.equal(headers.get("access-control-allow-origin"), "*");
  assert.match(headers.get("access-control-allow-methods") || "", /\bGET\b/);
});
