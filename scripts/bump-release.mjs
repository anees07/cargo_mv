import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Map(
  process.argv.slice(2).map(arg => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.length ? value.join("=") : "true"];
  }),
);

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function writeText(file, value) {
  fs.writeFileSync(path.join(root, file), value);
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function writeJson(file, value) {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function bumpVersion(version, mode) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Expected semantic version x.y.z, got ${version}`);
  }

  if (mode === "major") return `${parts[0] + 1}.0.0`;
  if (mode === "minor") return `${parts[0]}.${parts[1] + 1}.0`;
  if (mode === "patch") return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  if (mode === "build") return version;

  throw new Error(`Unknown bump mode: ${mode}`);
}

function replaceRequired(file, pattern, replacement) {
  const source = readText(file);
  const next = source.replace(pattern, replacement);
  if (next === source) {
    throw new Error(`No replacement made in ${file}`);
  }
  writeText(file, next);
}

const packageJson = readJson("package.json");
const appVersionSource = readText("src/appVersion.ts");
const appBuildMatch = appVersionSource.match(/APP_BUILD = "(\d+)"/);
const currentBuild = appBuildMatch ? Number(appBuildMatch[1]) : undefined;

if (!Number.isInteger(currentBuild)) {
  throw new Error("Could not read current APP_BUILD from src/appVersion.ts");
}

const mode = args.get("mode") || "patch";
const nextVersion = args.get("version") || bumpVersion(packageJson.version, mode);
const nextBuild = Number(args.get("build") || currentBuild + 1);
const repository = args.get("repo") || process.env.GITHUB_REPOSITORY || "anees07/cargo_mv";
const releaseTag = `v${nextVersion}`;
const apkFileName = `maldives-cargo-${nextVersion}-build${nextBuild}.apk`;
const apkUrl = args.get("apk-url") || `https://github.com/${repository}/releases/download/${releaseTag}/${apkFileName}`;
const mandatory = args.has("mandatory") ? args.get("mandatory") === "true" : true;
const checkIntervalMs = Number(args.get("check-interval-ms") || 60000);
const releasedAt = args.get("released-at") || new Date().toISOString();
const notes = args.has("notes")
  ? args.get("notes").split("|").map(note => note.trim()).filter(Boolean)
  : [
      `Release ${nextVersion} build ${nextBuild}`,
      "Automatic APK update delivery for installed Android apps",
    ];

packageJson.version = nextVersion;
writeJson("package.json", packageJson);

const packageLock = readJson("package-lock.json");
packageLock.version = nextVersion;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = nextVersion;
}
writeJson("package-lock.json", packageLock);

replaceRequired("src/appVersion.ts", /APP_VERSION = "[^"]+"/, `APP_VERSION = "${nextVersion}"`);
replaceRequired("src/appVersion.ts", /APP_BUILD = "\d+"/, `APP_BUILD = "${nextBuild}"`);

replaceRequired("android/app/build.gradle", /versionCode \d+/, `versionCode ${nextBuild}`);
replaceRequired("android/app/build.gradle", /versionName "[^"]+"/, `versionName "${nextVersion}"`);

for (const file of ["public/app-update.json", "dist/app-update.json"]) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const manifest = readJson(file);
  manifest.latest = {
    ...manifest.latest,
    versionName: nextVersion,
    buildNumber: nextBuild,
    releasedAt,
    notes,
  };
  manifest.mandatory = mandatory;
  manifest.checkIntervalMs = checkIntervalMs;
  manifest.targets = manifest.targets || {};
  manifest.targets.android = {
    ...(manifest.targets.android || {}),
    enabled: true,
    apkUrl,
  };
  writeJson(file, manifest);
}

console.log(`Bumped release to ${nextVersion} build ${nextBuild}`);
console.log(`APK file: ${apkFileName}`);
console.log(`APK URL: ${apkUrl}`);
