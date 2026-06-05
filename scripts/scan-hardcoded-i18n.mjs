import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowlist = JSON.parse(
  fs.readFileSync(path.join(root, "scripts", "i18n-scan-allowlist.json"), "utf8")
);
const scanDirs = ["pages", "components", "composables"];
const codeExtensions = new Set([".vue", ".ts", ".js"]);

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ":::DOUBLE_STAR:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE_STAR:::/g, ".*");
  return new RegExp(`^${escaped}$`);
}

const allowPatterns = allowlist.allowedPaths.map((pattern) => globToRegExp(pattern));

function isAllowed(relativePath) {
  return allowPatterns.some((pattern) => pattern.test(relativePath));
}

function walk(dirPath, output = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }

    if (codeExtensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
  return output;
}

const hanRegex = /[\p{Script=Han}]/u;
const findings = [];

for (const dir of scanDirs) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) continue;

  for (const filePath of walk(fullDir)) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    if (isAllowed(relativePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (hanRegex.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

if (findings.length) {
  console.error("Found hardcoded CJK text outside the i18n allowlist:");
  findings.forEach((finding) => {
    console.error(`  - ${finding.file}:${finding.line} ${finding.text}`);
  });
  process.exit(1);
}

console.log("Hardcoded i18n scan passed.");
