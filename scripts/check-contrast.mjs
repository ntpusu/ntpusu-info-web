// 讀取 src/styles/theme.css 內的色彩變數，驗證 WCAG 對比（亮色與暗色皆檢查）。
// 色彩只在 theme.css 定義一份，此腳本不另存色碼。用法：pnpm check:contrast
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/theme.css", import.meta.url), "utf8");

// 解析 --name: value;（取第一次定義）
const vars = new Map();
for (const m of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
  if (!vars.has(m[1])) vars.set(m[1], m[2].replace(/\s+/g, " ").trim());
}

function splitTop(str) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function resolve(value, mode) {
  value = value.trim();
  const v = value.match(/^var\((--[\w-]+)\)$/);
  if (v) {
    if (!vars.has(v[1])) throw new Error(`找不到變數 ${v[1]}`);
    return resolve(vars.get(v[1]), mode);
  }
  const ld = value.match(/^light-dark\((.*)\)$/);
  if (ld) {
    const [light, dark] = splitTop(ld[1]);
    return resolve(mode === "light" ? light : dark, mode);
  }
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return "#" + [...value.slice(1)].map((c) => c + c).join("").toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  throw new Error(`無法解析色彩：${value}`);
}

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const AAA = 7, NON_TEXT = 3;
const surfaces = [
  "--pico-background-color",
  "--pico-card-background-color",
  "--pico-card-sectioning-background-color",
  "--pico-table-row-stripped-background-color",
];
const textVars = [
  "--pico-color", "--pico-muted-color", "--pico-primary", "--pico-primary-hover",
  "--pico-h6-color", "--ok", "--warn", "--danger",
];

const checks = [];
for (const fg of textVars) for (const bg of surfaces) checks.push([fg, bg, AAA]);
checks.push(
  ["--pico-primary-inverse", "--pico-primary-background", AAA],
  ["--pico-primary-inverse", "--pico-primary-hover-background", AAA],
  ["--pico-form-element-color", "--pico-form-element-background-color", AAA],
  ["--pico-form-element-placeholder-color", "--pico-form-element-background-color", AAA],
  ["--pico-code-color", "--pico-code-background-color", AAA],
  ["--pico-mark-color", "--pico-mark-background-color", AAA],
  // 非文字元件
  ["--pico-form-element-border-color", "--pico-form-element-background-color", NON_TEXT],
  ["--pico-form-element-border-color", "--pico-background-color", NON_TEXT],
  ["--focus-ring", "--pico-background-color", NON_TEXT],
  ["--focus-ring", "--pico-card-background-color", NON_TEXT],
  // 麵包屑橫條：文字一律用 --breadcrumb-color 與 hover 色
  ["--breadcrumb-color", "--breadcrumb-background", AAA],
  ["--pico-primary-hover", "--breadcrumb-background", AAA],
  ["--focus-ring", "--breadcrumb-background", NON_TEXT],
  // dropdown 選單：背景同卡片底色；hover 底色只放 --pico-dropdown-color 的文字，
  // 不納入 surfaces（深色模式 800 底色放次要文字會 < 7:1）
  ["--pico-dropdown-color", "--pico-dropdown-background-color", AAA],
  ["--pico-dropdown-color", "--pico-dropdown-hover-background-color", AAA],
  ["--pico-dropdown-border-color", "--pico-background-color", NON_TEXT],
  ["--pico-dropdown-border-color", "--pico-dropdown-background-color", NON_TEXT],
  ["--focus-ring", "--pico-dropdown-background-color", NON_TEXT],
  ["--focus-ring", "--pico-dropdown-hover-background-color", NON_TEXT],
);

let failed = 0;
for (const mode of ["light", "dark"]) {
  for (const [fg, bg, min] of checks) {
    const r = ratio(resolve(`var(${fg})`, mode), resolve(`var(${bg})`, mode));
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${mode}] ${fg} on ${bg}: ${r.toFixed(2)} (需 ≥ ${min})`);
  }
}
if (failed) {
  console.error(`\n${failed} 項未達標準`);
  process.exit(1);
}
console.log("\n全部達標");
