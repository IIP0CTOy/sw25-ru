/**
 * [Round 91] ytsheet (yutorize.work) spell JSON -> sw25 "spell" item.
 * Files the GM downloads by hand (…&mode=json) — nothing is fetched from the site here.
 * Mapping verified against the 308 spells of the world (type / prop / rangeshape / resistinfo values).
 */

import { L2 } from "./monstergen-i18n.mjs";
import { parseEffectText, buildEffects, describeRows } from "./effecttext.mjs";
import { folderPathForItem, ensureFolder } from "./itembuilder.mjs";

/** [Round 97] imported items are filed like the constructor files them (Spells / school / level, Armour / Shields / rank …). */
async function folderIdFor(data) {
  try { const path = folderPathForItem(data); return path ? (await ensureFolder("Item", path))?.id ?? null : null; }
  catch (err) { console.warn("SW25 | import folder:", err); return null; }
}
const N = (x) => String(x ?? "").normalize("NFKC");

const SCHOOLS = {
  "真語魔法": "sorcerer", "操霊魔法": "conjurer", "深智魔法": "wizard", "神聖魔法": "priest",
  "魔動機術": "magitech", "妖精魔法": "fairy", "森羅魔法": "druid", "召異魔法": "daemon",
  "奈落魔法": "abyssal", "秘奥魔法": "bibliomancer",
};
const ELEMENTS = {
  "炎": "fire", "火": "fire", "水・氷": "ice", "氷": "ice", "水": "ice", "雷": "thunder", "衝撃": "impact",
  "毒": "poison", "呪い": "curse", "精神": "mental", "純エネルギー": "energy", "エネルギー": "energy", "切断": "cut",
  "土": "earth", "地": "earth", "風": "wind", "病気": "disease", "断空": "cut", "回復": "healing",
};
/** «精神効果», «精神効果（弱）», «呪い+精神効果» … -> system prop key ("" when unknown). */
const elementOf = (raw) => {
  const e = N(raw).trim();
  if (ELEMENTS[e]) return ELEMENTS[e];
  if (/精神効果.*[（(]弱[）)]/.test(e)) return "mentalw";
  if (/呪い/.test(e)) return "curse";
  if (/精神効果/.test(e)) return "mental";
  return "";
};
/* target / rangeshape are DATA read by spellcast.mjs, which understands both the Russian and the English keywords */
const forms = () => ({ "起点指定": L2("Цель", "Target"), "射撃": L2("Выстрел", "Shot"), "貫通": L2("Линия", "Line"), "突破": L2("Прорыв", "Breakthrough") });

export const isYtSpell = (o) => !!o && typeof o === "object" && "magicName" in o;
export const isYtSkillArts = (o) => !!o && typeof o === "object" && "skillName" in o && !("magicName" in o);

const unesc = (s) => String(s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&");
const safeUrl = (u) => (/^https?:\/\//i.test(String(u ?? "").trim()) ? String(u).trim() : "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (s) => unesc(s).split(/<br\s*\/?>\s*(?:<br\s*\/?>)?/i).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join("");

export function ytDuration(s) {
  s = N(s).trim();
  if (!s) return "";
  if (/^(一瞬|瞬間|即時)/.test(s)) return L2("Мгновенно", "Instant");
  if (/永続|恒久/.test(s)) return L2("Постоянно", "Permanent");
  return s.replace(/(\d+)\s*ラウンド/g, (m, n) => `${n} ${L2("р.", "rounds")}`).replace(/(\d+)\s*秒/g, (m, n) => `${n} ${L2("сек.", "sec.")}`)
    .replace(/(\d+)\s*分/g, (m, n) => `${n} ${L2("мин.", "min.")}`).replace(/(\d+)\s*時間/g, (m, n) => `${n} ${L2("ч.", "h")}`).replace(/(\d+)\s*日/g, (m, n) => `${n} ${L2("дн.", "days")}`)
    .replace(/\s+/g, " ").replace(/(\S)\(/g, "$1 (").trim();
}
const ytRange = (r, form) => {
  r = N(r).trim();
  if (/術者/.test(r)) return `${L2("Заклинатель", "Caster")}/-`;
  if (/接触/.test(r)) return `${L2("Касание", "Touch")}/-`;
  if (!r) return "";
  const f = forms()[N(form).trim()] ?? "-";
  return `${r.replace(/m/g, L2("м", "m"))}/${f}`;
};
const ytTarget = (t) => {
  t = N(t).trim();
  if (/^術者$/.test(t)) return L2("Заклинатель", "Caster");
  if (/^接触$/.test(t)) return L2("Касание", "Touch");
  return t.replace(/(\d+)\s*体/g, `$1 ${L2("Персонаж", "character")}`).replace(/(\d+)\s*エリア/g, `$1 ${L2("область", "area")}`).replace(/半径\s*(\d+)\s*m/g, `${L2("радиус", "radius")} $1 ${L2("м", "m")}`).replace(/(\d+)\s*m(?![a-z])/g, `$1 ${L2("м", "m")}`);
};
export function ytResist(s) {
  s = String(s ?? "").trim();
  const type = /生命/.test(s) ? "Vitres" : /精神/.test(s) ? "Mndres" : "";
  if (/^(なし|必中|無し|-|―|－)?$/.test(s) || /必中/.test(s)) return { type: "", result: "none" };
  if (/任意/.test(s)) return { type: "", result: "any" };
  if (/消滅/.test(s)) return { type: type || "Mndres", result: "disappear" };
  if (/半減/.test(s)) return { type: type || "Mndres", result: "halving" };
  if (/短縮/.test(s)) return { type: type || "Mndres", result: "shortening" };
  return { type, result: "decide" };
}

/** "威力10", "威力10 C値9" in the effect text -> {power, cvalue}. Ignores powers of a weapon the spell creates ("…威力70C値10の武器"). */
export function ytPower(text) {
  const t = unesc(text).replace(/<br\s*\/?>/gi, "\n").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const re = /威力\s*[:：]?\s*(\d+)(?:\s*[、,，]?\s*(?:C値|Ｃ値|クリティカル値)\s*[:：]?\s*(\d+))?(?!\d)([^\n]{0,6})/g;
  let m;
  while ((m = re.exec(t))) {
    if (/^\s*の?(?:武器|装備|剣|鎌|刃|武装)/.test(m[3])) continue;
    return { power: Number(m[1]), cvalue: m[2] ? Number(m[2]) : 10 };
  }
  return null;
}

/** Simple numeric modifiers found in the text -> [ActiveEffect data] (see effecttext.mjs); the GM checks them with the «Эффекты» button. */
function ytEffects(name, type, text, durationText, warnings, skip = []) {
  const p = parseEffectText(toHtml(text), N(durationText));
  const rows = p.rows.filter((r) => !skip.includes(r.id));
  const list = buildEffects(name, type, rows, { rounds: p.rounds, choice: p.choice });
  if (!list.length) return [];
  warnings.push(L2(`эффект из текста: ${describeRows(rows)}${list[0].duration ? `, ${list[0].duration.value} р.` : ""} — проверь кнопкой «Эффекты» на листе предмета`, `effect from text: ${describeRows(rows)}${list[0].duration ? `, ${list[0].duration.value} rd.` : ""} — check it with the Effects button on the item sheet`));
  p.notes.forEach((n) => warnings.push(n));
  return list;
}

/** -> { name, system, effects, flags, warnings[] } ready for Item.create */
export function parseYtSpell(o) {
  const warnings = [];
  const school = String(o.magicClass ?? "").trim();
  let type = SCHOOLS[school];
  if (!type) { type = "sorcerer"; warnings.push(L2(`школа «${school || "?"}» неизвестна — поставлена «Речь Истины», поправь вручную`, `school "${school || "?"}" is unknown — set to Truespeech, fix it by hand`)); }
  const lvRaw = N(o.magicLevel).trim();
  const level = /^超$/.test(lvRaw) ? 16 : parseInt(lvRaw, 10);
  const costDigits = N(o.magicCost).match(/\d+/);
  const prop = elementOf(o.magicElement);
  if (o.magicElement && !prop && !/^[―－-]$/.test(String(o.magicElement).trim())) warnings.push(L2(`стихия «${o.magicElement}» не из списка системы — оставлена пустой`, `element "${o.magicElement}" is not in the system list — left empty`));
  const target = ytTarget(o.magicTarget), rangeshape = ytRange(o.magicRange, o.magicForm), time = ytDuration(o.magicDuration);
  const summary = unesc(o.magicSummary ?? "");
  const src = safeUrl(o.sheetURL) ? ` <a href="${esc(safeUrl(o.sheetURL))}">ytsheet${o.author ? ` · ${esc(o.author)}` : ""}</a>` : "";
  const description = `<div class="sw25-spellcard"><p class="sw25-sc-sum">${esc(summary)}</p>`
    + `<p class="sw25-sc-meta">${esc([target, rangeshape, time].filter(Boolean).join(" · "))}</p>`
    + `<details class="sw25-sc-full"><summary>${L2("Полное описание", "Full description")}</summary><div class="sw25-sc-full-body">${toHtml(o.magicEffect)}<p><i>${L2("Источник", "Source")}:${src}</i></p></div></details></div>`;
  const flag = (k) => !!o[k];
  // real ytsheet keys (edit-arts.pl): magicActionTypePassive / Major / Minor / Setup — there is no «Declare» key
  const constant = flag("magicActionTypePassive");
  const decla = flag("magicActionTypeDeclare") || flag("magicActionTypeDecla");
  const prep = flag("magicActionTypeSetup");
  const aux = flag("magicActionTypeMinor");
  const main = flag("magicActionTypeMajor") || (!constant && !decla && !prep && !aux);
  const system = {
    description, overview: summary, level: Number.isFinite(level) ? level : 1, type,
    basempcost: costDigits ? Number(costDigits[0]) : 0, target, rangeshape, time, prop,
    resist: "", resistinfo: ytResist(o.magicResist), main, aux, decla, prep, constant,
  };
  const pw = ytPower(`${o.magicEffect ?? ""}\n${o.magicSummary ?? ""}`);
  if (pw) { Object.assign(system, { usepower: true, power: pw.power, cvalue: pw.cvalue, applypower: "custom" }); warnings.push(L2(`сила ${pw.power} (C${pw.cvalue}) взята из текста — проверь`, `power ${pw.power} (C${pw.cvalue}) was taken from the text — check it`)); }
  if (type === "fairy") {   // elemental fairy spells: the cast dialog filters by fairytype/fairyprop
    const FP = { "土": "fairyearth", "地": "fairyearth", "水・氷": "fairyice", "氷": "fairyice", "水": "fairyice", "炎": "fairyfire", "火": "fairyfire", "風": "fairywind", "光": "fairylight", "闇": "fairydark" };
    const fp = FP[String(o.magicElement ?? "").normalize("NFKC").trim()];
    if (fp) { system.fairytype = "propfairy"; system.fairyprop = fp; }
  }
  if (!costDigits && o.magicCost) warnings.push(L2(`стоимость «${o.magicCost}» без числа MP — поставлено 0`, `cost "${o.magicCost}" has no MP number — set to 0`));
  const name = String(o.magicName ?? "").trim() || L2("Заклинание без названия", "Unnamed spell");
  const effects = ytEffects(name, "spell", `${o.magicEffect ?? ""}\n${o.magicSummary ?? ""}`, o.magicDuration, warnings);
  return { name, system, effects, flags: { sw25: { ytsheet: { id: o.id ?? "", author: o.author ?? "" } } }, warnings };
}

/** Create world items for every spell found in `objs`. Returns {created, warnings, skippedSkills}. */
export async function importYtSpells(objs) {
  const spells = objs.filter(isYtSpell);
  const out = { created: [], warnings: [], skippedSkills: objs.filter(isYtSkillArts).length };
  for (const o of spells) {
    const p = parseYtSpell(o);
    try { out.created.push(await Item.create({ name: p.name, type: "spell", system: p.system, effects: p.effects, flags: p.flags, folder: await folderIdFor({ type: "spell", system: p.system }) })); }
    catch (err) { console.error(err); out.warnings.push(L2(`${p.name}: не создано — ${err?.message ?? err}`, `${p.name}: not created — ${err?.message ?? err}`)); continue; }
    p.warnings.forEach((w) => out.warnings.push(`${p.name}: ${w}`));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  Items: weapons / armour & shields / accessories / misc  (type "i")
 * ------------------------------------------------------------------ */
const WCAT = { "ソード": "sword", "アックス": "axe", "スピア": "spear", "メイス": "mace", "ウォーハンマー": "warhammer", "スタッフ": "staff", "フレイル": "flail", "格闘": "grapple", "投擲": "throw", "ボウ": "bow", "クロスボウ": "crossbow", "ガン": "gun" };
const ACCPART = { "頭": "head", "耳": "ear", "顔": "face", "首": "neck", "背中": "back", "右手": "rhand", "左手": "lhand", "腰": "waist", "足": "leg", "その他": "other", "任意": "other" };
export const isYtItem = (o) => !!o && typeof o === "object" && "itemName" in o;
const num = (v) => { const m = N(v).replace(/[−–]/g, "-").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/(\d)[,，](?=\d{3})/g, "$1").match(/-?\d+/); return m ? Number(m[0]) : null; };
const itemHtml = (o, extra = []) => {
  const parts = [];
  if (o.summary) parts.push(`<p><b>${esc(unesc(o.summary))}</b></p>`);
  if (o.shape) parts.push(`<p><i>${esc(unesc(o.shape))}</i></p>`);
  if (o.description) parts.push(toHtml(o.description));
  if (o.effects) parts.push(toHtml(o.effects));
  extra.filter(Boolean).forEach((x) => parts.push(`<p>${esc(x)}</p>`));
  if (safeUrl(o.sheetURL)) parts.push(`<p><i>${L2("Источник", "Source")}: <a href="${esc(safeUrl(o.sheetURL))}">ytsheet${o.author ? ` · ${esc(o.author)}` : ""}</a></i></p>`);
  return parts.join("");
};

/** -> { name, type, system, flags, warnings[] } */
export function parseYtItem(o) {
  const warnings = [], extra = [];
  const cat = unesc(o.category ?? "").trim();
  const price = num(o.price) ?? 0;
  if (o.price && num(o.price) === null) extra.push(`${L2("Цена", "Price")}: ${unesc(o.price)}`);
  const base = { quantity: 1, price, equip: false };
  const flags = { sw25: { ytsheet: { id: o.id ?? "", author: o.author ?? "" } } };
  const name = String(o.itemName ?? "").trim() || L2("Предмет без названия", "Unnamed item");
  const fxText = `${o.effects ?? ""}\n${o.description ?? ""}`;

  const isWeapon = ["weapon1Usage", "weapon1Rate", "weapon1Crit", "weapon1Reqd", "weapon1Acc"].some((k) => o[k] != null && o[k] !== "");
  const isArmor = !isWeapon && ["armour1Def", "armour1Eva", "armour1Reqd", "armour1Usage"].some((k) => o[k] != null && o[k] !== "");

  if (["weapon2Usage", "weapon2Rate", "weapon2Acc", "armour2Def", "armour2Usage"].some((k) => o[k] != null && o[k] !== "")) warnings.push(L2("в листе есть вторая строка оружия/брони — она не импортирована, перенеси вручную", "the sheet has a second weapon/armour row — it was not imported, copy it by hand"));
  if (isWeapon) {
    const ncat = N(cat);
    const m = ncat.match(/[〈<]([^〉>]+)[〉>]\s*(?:\/\s*(SS|[SAB]))?/) ?? (() => { const k = Object.keys(WCAT).find((w) => ncat.includes(w)); return k ? [k, k, ncat.split(k)[1]?.match(/SS|[SAB]/)?.[0]] : null; })();
    const category = WCAT[(m?.[1] ?? "").trim()] ?? "";
    if (!category) warnings.push(L2(`категория оружия «${cat}» неизвестна — поле «категория» пустое`, `weapon category "${cat}" is unknown — the category field is empty`));
    const note = unesc(o.weapon1Note ?? "");
    const type = /\[刃\]|刃/.test(note) && /\[打\]|打/.test(note) ? "both" : /\[刃\]/.test(note) ? "blade" : /\[打\]/.test(note) ? "blow" : (category === "gun" ? "other" : ["mace", "flail", "warhammer", "staff", "grapple"].includes(category) ? "blow" : "blade");
    const rate = num(o.weapon1Rate), crit = num(o.weapon1Crit), hit = num(o.weapon1Acc), dmod = num(o.weapon1Dmg);
    if (o.weapon1Rate && rate === null) extra.push(`${L2("Мощность", "Power")}: ${o.weapon1Rate}`);
    if (o.weapon1Acc && hit === null && !/^[-―ー－—\s]*$/.test(String(o.weapon1Acc))) extra.push(`${L2("Попадание", "Accuracy")}: ${o.weapon1Acc}`);
    if (note) extra.push(`${L2("Примечание", "Note")}: ${note}`);
    const USAGE = { "1H": "1H", "1H#": "1H#", "1H投": "1HT", "1H拳": "1HN", "1H両": "1HB", "2H": "2H", "2H#": "2H#", "振2H": "S2H", "突2H": "P2H", "2H投": "2HT" };
    const rawUsage = String(o.weapon1Usage ?? "").normalize("NFKC").trim(), usage = USAGE[rawUsage] ?? "";
    if (rawUsage && !(rawUsage in USAGE)) { warnings.push(L2(`способ хвата «${rawUsage}» неизвестен — поле пустое, значение в описании`, `usage "${rawUsage}" is unknown — the field is empty, the value is in the description`)); extra.push(`${L2("Хват", "Usage")}: ${rawUsage}`); }
    if (/\d\s*[\/／]\s*\d/.test(N(o.weapon1Rate))) { warnings.push(L2(`сила «${o.weapon1Rate}» — два значения, взято первое`, `power "${o.weapon1Rate}" has two values — the first is used`)); extra.push(`${L2("Мощность", "Power")}: ${o.weapon1Rate}`); }
    if (o.weapon1Crit && crit === null && !/^[-―ー－—\s]*$/.test(String(o.weapon1Crit))) warnings.push(L2(`крит «${o.weapon1Crit}» не число — поставлено 10`, `crit "${o.weapon1Crit}" is not a number — set to 10`));
    if (rate === null) warnings.push(L2("сила не числовая — usepower выключен, значение в описании", "power is not a number — usepower is off, the value is in the description"));
    // accuracy / damage written in the text of a weapon are usually its own columns (already in hit / dmod)
    return { name, type: "weapon", flags, warnings, effects: ytEffects(name, "weapon", fxText, "", warnings, [hit ? "hit" : "", dmod ? "dmg" : ""]), system: {
      ...base, description: itemHtml(o, extra), type, category, rank: (m?.[2] ?? "").replace(/Ｓ/g, "S").replace(/Ａ/g, "A").replace(/Ｂ/g, "B"),
      usage, reqstr: num(o.weapon1Reqd) ?? 1, hit: hit ?? 0, dmod: dmod ?? 0, range: String(o.weapon1Range ?? ""),
      usepower: rate !== null, power: rate ?? 0, cvalue: crit ?? 10, applypower: "on", checkskill: "adv", checkabi: "dex",
    } };
  }
  if (isArmor) {
    const m = cat.match(/〈([^〉]+?)([SABＳＡＢ]{0,2})〉/);
    const kind = m?.[1] ?? "";
    const category = /盾/.test(kind) ? "shield" : /非金属/.test(kind) ? "nonmetalarmor" : /金属/.test(kind) ? "metalarmor" : "";
    if (!category) warnings.push(L2(`категория брони «${cat}» неизвестна`, `armour category "${cat}" is unknown`));
    const defRaw = String(o.armour1Def ?? "");
    const pp = num(defRaw.split("+")[0]) ?? 0;
    if (/[{｛]/.test(defRaw)) extra.push(`${L2("Защита (формула)", "Defense (formula)")}: ${defRaw}`);
    if (/[{｛]/.test(defRaw)) warnings.push(L2("защита задана формулой — в pp только числовая часть", "defense is a formula — only the numeric part went into pp"));
    const mm = unesc(o.effects ?? "").match(/魔法耐性\s*[＝=]\s*(\d+)/);
    const dodgeCol = num(o.armour1Eva) ?? 0;
    return { name, type: "armor", flags, warnings, effects: ytEffects(name, "armor", fxText, "", warnings, ["pp", mm ? "mpp" : "", dodgeCol ? "dodge" : ""]), system: {
      ...base, description: itemHtml(o, extra), category, rank: N(m?.[2] || cat.match(/[\/／]\s*(SS|[SABＳＡＢ]{1,2})/)?.[1] || ""),
      usage: String(o.armour1Usage ?? "").trim(), reqstr: num(o.armour1Reqd) ?? 1, pp, mpp: mm ? Number(mm[1]) : 0, dodge: num(o.armour1Eva) ?? 0,
    } };
  }
  if (/^装飾品/.test(cat)) {
    const part = cat.split(/[：:]/)[1]?.trim() ?? "";
    const accpart = ACCPART[part] ?? "other";
    if (!(part in ACCPART)) warnings.push(L2(`часть тела «${part}» неизвестна — «другое»`, `body part "${part}" is unknown — set to "other"`));
    return { name, type: "accessory", flags, warnings, effects: ytEffects(name, "accessory", fxText, "", warnings), system: { ...base, description: itemHtml(o, extra), accpart } };
  }
  const effects = ytEffects(name, "item", fxText, "", warnings);
  return { name, type: "item", flags, warnings, effects, system: { ...base, description: itemHtml(o, extra), type: "", ...(effects.length ? { useeffect: true } : {}) } };
}

/** GM-only chat note: what was created, which effects were read from the text and what needs a look. */
async function reportImport(out) {
  if (!out.created.length && !out.warnings.length) return;
  const li = out.created.map((it) => {
    const fx = it.effects.filter((e) => e.flags?.sw25?.fromText);
    return `<li>@UUID[${it.uuid}]{${esc(it.name)}}${fx.length ? ` — <b>${L2("эффект", "effect")}</b>: ${esc(fx.map((e) => e.name.split(": ").slice(1).join(": ")).join(" / "))}` : ""}</li>`;
  }).join("");
  const warn = out.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
  const content = `<div class="sw25-import-report"><p><b>ytsheet: ${L2("создано", "created")} ${out.created.length}</b></p>${li ? `<ul>${li}</ul>` : ""}`
    + (warn ? `<details><summary>${L2("Проверь вручную", "Check by hand")}: ${out.warnings.length}</summary><ul>${warn}</ul></details>` : "")
    + `<p class="hint">${L2("Эффекты прочитаны из текста автоматически. Поправить — кнопка «Эффекты» в шапке листа предмета.", "Effects were read from the text automatically. To correct them use the Effects button in the item sheet header.")}</p></div>`;
  try { await ChatMessage.create({ content, whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id), speaker: { alias: "ytsheet" } }); } catch (err) { console.warn("SW25 | import report:", err); }
}

/** Create world items for every spell and item found in `objs`. */
export async function importYtSheets(objs) {
  const out = await importYtSpells(objs);
  for (const o of objs.filter(isYtItem)) {
    const p = parseYtItem(o);
    try { out.created.push(await Item.create({ name: p.name, type: p.type, system: p.system, effects: p.effects ?? [], flags: p.flags, folder: await folderIdFor({ type: p.type, system: p.system }) })); }
    catch (err) { console.error(err); out.warnings.push(L2(`${p.name}: не создано — ${err?.message ?? err}`, `${p.name}: not created — ${err?.message ?? err}`)); continue; }
    p.warnings.forEach((w) => out.warnings.push(`${p.name}: ${w}`));
  }
  await reportImport(out);
  return out;
}
