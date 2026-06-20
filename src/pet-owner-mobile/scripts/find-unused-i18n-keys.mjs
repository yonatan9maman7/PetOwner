import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

const i18n = fs.readFileSync(path.join(root, "src/i18n/index.ts"), "utf8");

function extractKeys(blockStart) {
  const start = i18n.indexOf(blockStart);
  if (start < 0) return [];
  let depth = 0;
  let started = false;
  const keys = [];
  for (let i = start; i < i18n.length; i++) {
    const c = i18n[i];
    if (c === "{") {
      depth++;
      started = true;
      continue;
    }
    if (!started) continue;
    if (c === "}") {
      depth--;
      if (depth === 0) break;
      continue;
    }
    if (depth === 1) {
      const rest = i18n.slice(i);
      const m = rest.match(/^\s{2}([a-zA-Z][a-zA-Z0-9_]*):/);
      if (m) keys.push(m[1]);
    }
  }
  return keys;
}

const heKeys = extractKeys("const he = {");
const enKeys = extractKeys("const en:");
const heSet = new Set(heKeys);
const enSet = new Set(enKeys);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", "android", "ios", "__tests__", "e2e", ".expo", "scripts"].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk(path.join(root, "src"));
for (const f of ["App.tsx", "index.ts"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) files.push(p);
}

let corpus = "";
for (const f of files) corpus += fs.readFileSync(f, "utf8") + "\n";

const cmHe = JSON.parse(fs.readFileSync(path.join(root, "src/screens/community/i18n/he.json"), "utf8"));
const cmEn = JSON.parse(fs.readFileSync(path.join(root, "src/screens/community/i18n/en.json"), "utf8"));

const mainKeys = [...new Set([...heKeys, ...enKeys])];
const cmKeys = [...new Set([...Object.keys(cmHe), ...Object.keys(cmEn)])];

function isKeyUsed(k) {
  const quoted = [`"${k}"`, `'${k}'`];
  for (const q of quoted) {
    if (
      corpus.includes(`t(${q})`) ||
      corpus.includes(`t(${q},`) ||
      corpus.includes(`translate(${q})`) ||
      corpus.includes(`translate(${q},`)
    ) {
      return true;
    }
  }
  return false;
}

const unusedMain = mainKeys.filter((k) => !isKeyUsed(k)).sort();
const unusedCm = cmKeys.filter((k) => !isKeyUsed(k)).sort();
const onlyHe = heKeys.filter((k) => !enSet.has(k));
const onlyEn = enKeys.filter((k) => !heSet.has(k));

console.log(JSON.stringify({ onlyHe, onlyEn, unusedMain, unusedCm, counts: {
  he: heKeys.length, en: enKeys.length, cm: cmKeys.length,
  unusedMain: unusedMain.length, unusedCm: unusedCm.length,
}}, null, 2));
