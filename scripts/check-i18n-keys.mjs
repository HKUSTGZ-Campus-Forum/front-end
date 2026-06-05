import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const zhPath = path.join(root, "i18n", "locales", "zh.json");
const enPath = path.join(root, "i18n", "locales", "en.json");

function flattenKeys(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) =>
      flattenKeys(nested, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [prefix];
}

const zh = JSON.parse(fs.readFileSync(zhPath, "utf8"));
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

const zhKeys = new Set(flattenKeys(zh));
const enKeys = new Set(flattenKeys(en));

const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key));
const extraInEn = [...enKeys].filter((key) => !zhKeys.has(key));

if (missingInEn.length || extraInEn.length) {
  if (missingInEn.length) {
    console.error("Missing keys in en.json:");
    missingInEn.forEach((key) => console.error(`  - ${key}`));
  }

  if (extraInEn.length) {
    console.error("Extra keys in en.json:");
    extraInEn.forEach((key) => console.error(`  - ${key}`));
  }

  process.exit(1);
}

console.log(`i18n key check passed (${zhKeys.size} keys).`);
