import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src");
const skipRe = /node_modules/;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (skipRe.test(p)) continue;
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function fixContent(s) {
  const re = /import \{\r?\nimport \{ showGlobalAlertCompat \} from "([^"]+)";\r?\n/g;
  let changed = false;
  let out = s;
  let m;
  while ((m = re.exec(out)) !== null) {
    const inner = `import { showGlobalAlertCompat } from "${m[1]}";`;
    const start = m.index;
    const fullLen = m[0].length;
    out = out.slice(0, start) + "import {\n" + out.slice(start + fullLen);

    const fromPos = start + "import {\n".length;
    const closeRe = /\r?\n\} from ["'][^"']+["'];/g;
    closeRe.lastIndex = fromPos;
    const cm = closeRe.exec(out);
    if (!cm) {
      throw new Error(`Could not find import close after broken block at index ${start}`);
    }
    const ins = cm.index + cm[0].length;
    out = `${out.slice(0, ins)}\n${inner}${out.slice(ins)}`;
    changed = true;
    re.lastIndex = start + inner.length + 20;
  }
  return changed ? out : null;
}

let fixed = 0;
for (const f of walk(root)) {
  const raw = fs.readFileSync(f, "utf8");
  const next = fixContent(raw);
  if (next != null) {
    fs.writeFileSync(f, next);
    fixed++;
  }
}
console.log("fixed files", fixed);
