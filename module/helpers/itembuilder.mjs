/**
 * [Round 97] Item constructor: weapons, armour and shields, accessories, gear and spells.
 * A small form per kind — numbers and pick-lists, the description is typed by hand — and the
 * created item is filed into its own folder of the Items directory (Armour / Shields / Rank A …).
 * Nothing here comes from a rulebook: the GM types what they need.
 */
import { L2 } from "./monstergen-i18n.mjs";
import { STATS, statLabel, statById, buildEffects, describeRows, checkBonusKey } from "./effecttext.mjs";

const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const loc = (k) => game.i18n.localize(k);
const N = (v, d = 0) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : d; };
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ *
 *  Vocabulary (labels are resolved at render time)
 * ------------------------------------------------------------------ */
const KINDS = [
  ["weapon", "fa-solid fa-khanda", ["Оружие", "Weapon"]],
  ["armor", "fa-solid fa-shield-halved", ["Броня и щиты", "Armour & shields"]],
  ["accessory", "fa-solid fa-ring", ["Аксессуар", "Accessory"]],
  ["item", "fa-solid fa-flask", ["Предмет", "Item"]],
  ["spell", "fa-solid fa-wand-sparkles", ["Заклинание", "Spell"]],
  ["alchemy", "fa-solid fa-vial", ["Приворот алхимика", "Alchemist evocation"]],
  ["song", "fa-solid fa-music", ["Мелодия барда", "Bard song"]],
];
const NOTES = [["up", "↑"], ["down", "↓"], ["charm", "♡"]];
const SONG_SIDES = [["", ["никого (только ритм)", "nobody (rhythm only)"]], ["foe", ["врагов в 30 м (штраф)", "foes within 30 m (penalty)"]], ["ally", ["союзников в 30 м (бонус)", "allies within 30 m (bonus)"]]];
const CARD_COLORS = [["red", ["Красные", "Red"]], ["green", ["Зелёные", "Green"]], ["black", ["Чёрные", "Black"]], ["white", ["Белые", "White"]], ["gold", ["Золотые", "Gold"]]];
const EV_TYPES = [["-", ["ничего", "nothing"]], ["time", ["длительность эффекта, раундов", "effect duration, rounds"]], ["value", ["величину бонуса", "the size of the bonus"]]];
const kindLabel = (k) => { const e = KINDS.find((x) => x[0] === k); return L2(e[2][0], e[2][1]); };

/** Schools of magic: key -> words the GM may type (any language). The first Russian / English word is shown as a hint. */
const SCHOOLS = {
  sorcerer: ["речь истины", "истинн", "чародей", "truespeech", "true speech", "sorcerer", "真語"],
  conjurer: ["духовная", "духов", "призыватель", "spiritualism", "spirit magic", "conjurer", "操霊"],
  wizard: ["глубинная", "глубин", "волшебник", "deep magic", "wizard", "深智"],
  priest: ["божественная", "божеств", "святая", "святой", "свят", "священ", "жрец", "жреч", "divine", "holy", "sacred", "priest", "cleric", "神聖"],
  magitech: ["магитех", "магитек", "техно", "конструктор", "magitech", "artificer", "tech", "魔動機"],
  fairy: ["фея", "феи", "фей", "магия фей", "fairy", "fae", "妖精"],
  druid: ["природная", "природ", "друид", "nature", "druid", "森羅"],
  daemon: ["призыв демон", "демон", "демонолог", "summoning", "daemon", "demon", "召異"],
  abyssal: ["бездна", "бездны", "abyssal", "abyss", "奈落"],
  bibliomancer: ["тайнопись", "secrets", "bibliomancer", "秘奥"],
};
/** Typed school text -> system key (undefined when nothing matches). */
export function schoolKey(text) {
  const t = norm(text);
  if (!t) return undefined;
  const types = CONFIG.SW25?.spellTypes ?? {};
  for (const [key, lk] of Object.entries(types)) if (norm(loc(lk)) === t || key === t) return key;
  for (const [key, words] of Object.entries(SCHOOLS)) if (words.some((w) => t === w || t.includes(w) || (t.length >= 3 && w.startsWith(t)))) return key;
  for (const [key, lk] of Object.entries(types)) if (norm(loc(lk)).includes(t) && t.length >= 3) return key;
  return undefined;
}
const schoolLabel = (key) => loc(CONFIG.SW25?.spellTypes?.[key] ?? key);

const SHAPES = [
  ["target", ["Одна цель", "Single target"]],
  ["shot", ["Выстрел (одна цель)", "Shot (single target)"]],
  ["self", ["На себя", "Self"]],
  ["touch", ["Касание", "Touch"]],
  ["line", ["Линия от заклинателя", "Line from the caster"]],
  ["area", ["Область в точке (сфера)", "Area at a point (sphere)"]],
  ["selfarea", ["Область вокруг себя", "Area around the caster"]],
];
const TIMES = [
  ["instant", ["Мгновенно", "Instant"]],
  ["rounds", ["Раунды", "Rounds"]],
  ["minutes", ["Минуты", "Minutes"]],
  ["hours", ["Часы", "Hours"]],
  ["days", ["Дни", "Days"]],
  ["permanent", ["Постоянно", "Permanent"]],
  ["text", ["Своё (текстом)", "Custom text"]],
];
const SPELL_DOES = [
  ["", ["только эффект / описание", "effect / description only"]],
  ["damage", ["урон по мощности", "damage by power"]],
  ["heal", ["лечит ОЖ по мощности", "heals HP by power"]],
  ["mheal", ["восстанавливает ОМ по мощности", "restores MP by power"]],
  ["flat", ["лечит ОЖ: мощь магии + N", "heals HP: Magic Power + N"]],
  ["regen", ["регенерация: +N ОЖ в конце каждого хода", "regeneration: +N HP at the end of each turn"]],
  ["mregen", ["регенерация: +N ОМ в конце каждого хода", "regeneration: +N MP at the end of each turn"]],
];
/** Which «apply» button a power roll gets: pd / md / cd (damage), hr / mr (HP / MP recovery). */
const PW = (on) => Object.fromEntries(["pd", "md", "cd", "hr", "mr"].map((k) => [`pw${k}bt`, k === on]));
const RESIST_TYPES = [["", ["нет", "none"]], ["Vitres", ["Стойкость", "Fortitude"]], ["Mndres", ["Воля", "Willpower"]]];
const WEAPON_TYPE_BY_CAT = { mace: "blow", flail: "blow", warhammer: "blow", staff: "blow", grapple: "blow", gun: "other" };

/** Data strings that spellcast.mjs reads back (it understands both the Russian and the English keywords). */
export function spellShape(f) {
  const m = L2("м", "m"), range = Math.max(0, N(f.range));
  const one = `1 ${L2("Персонаж", "character")}`;
  const area = `1 ${L2("область", "area")} (${L2("радиус", "radius")} ${Math.max(1, N(f.radius, 3))} ${m})/${N(f.max) > 0 ? N(f.max) : L2("Все", "All")}`;
  const self = L2("Заклинатель", "Caster"), touch = L2("Касание", "Touch");
  switch (f.shape) {
    case "self": return { target: self, rangeshape: `${self}/-` };
    case "touch": return { target: touch, rangeshape: `${touch}/-` };
    case "shot": return { target: one, rangeshape: `${range} ${m}/${L2("Выстрел", "Shot")}` };
    case "line": return { target: L2("Все на линии", "Everyone on the line"), rangeshape: `${range} ${m}/${L2("Линия", "Line")}` };
    case "area": return { target: area, rangeshape: `${range} ${m}/${L2("Цель", "Target")}` };
    case "selfarea": return { target: area, rangeshape: `${self}/-` };
    default: return { target: one, rangeshape: `${range} ${m}/${L2("Цель", "Target")}` };
  }
}
/** -> { text, rounds } */
export function spellTime(f) {
  const n = Math.max(1, Math.round(N(f.timeN, 1)));
  const rd = L2("р.", "rd.");
  switch (f.time) {
    case "rounds": return { text: L2(`${n * 10} секунд (${n} ${rd})`, `${n * 10} seconds (${n} ${rd})`), rounds: n };
    case "minutes": return { text: L2(`${n} мин. (${n * 6} ${rd})`, `${n} min. (${n * 6} ${rd})`), rounds: n * 6 };
    case "hours": return { text: L2(`${n} ч.`, `${n} h`), rounds: n * 360 };
    case "days": return { text: L2(`${n} дн.`, `${n} d.`), rounds: null };
    case "permanent": return { text: L2("Постоянно", "Permanent"), rounds: null };
    case "text": return { text: String(f.timeText ?? "").trim(), rounds: null };
    default: return { text: L2("Мгновенно", "Instant"), rounds: null };
  }
}

/* ------------------------------------------------------------------ *
 *  Bonus picker: type a few letters in any language ("ev", "укл", "скрыт") and pick
 * ------------------------------------------------------------------ */
/** Extra words people type for a bonus (besides its two labels). */
const BONUS_WORDS = {
  hit: "попадание меткость attack hit to-hit", dodge: "уворот увернуться dodge evade", pp: "броня armor armour protection", mpp: "магброня маг.броня",
  dmg: "урон оружия damage dmg", mdmg: "урон магии spell dmg", cast: "колдовство сотворение каст casting", mgp: "маг сила magic power",
  vitres: "стойкость спас тела fort", mndres: "воля спас разума will", init: "инициатива первый ход", mknow: "знание монстров monster lore",
  allck: "все проверки всё all checks", move: "скорость движение бег speed", regenhp: "регенерация реген regen regeneration", regenmp: "регенмп regenmp",
  hpmax: "здоровье жизнь хп ож hp health", mpmax: "мана мп ом mp mana", crit: "крит критический crit critical", spcrit: "крит заклинаний spell crit",
  mpsave: "экономия маны скидка ом mp cost cheaper", dreduce: "снижение урона damage reduction dr",
  dex: "ловкость dex", agi: "подвижность проворство agi", str: "сила str", vit: "живучесть vit", int: "интеллект int ум", mnd: "дух mnd spirit",
};
/** Names of the check items known to this world (world items, then the checks compendium). */
function checkNames() {
  const set = new Set(game.items.filter((i) => i.type === "check").map((i) => i.name));
  try { for (const e of game.sw25?.starter?.pack?.("checks")?.index ?? []) set.add(e.name); } catch (_e) { /* no pack */ }
  return [...set].sort((a, b) => a.localeCompare(b));
}
const checkOption = (n) => L2(`Проверка: ${n}`, `Check: ${n}`);
/**
 * Everything the picker offers: one line per bonus in the client's language, then the named checks.
 * `search` holds both languages and the extra words, so "ev", "укл" and "dodge" all find Evasion.
 */
function bonusChoices() {
  const out = STATS.map((s) => ({ label: statLabel(s), search: norm(`${s.label[0]} ${s.label[1]} ${BONUS_WORDS[s.id] ?? ""}`) }));
  for (const n of checkNames()) out.push({ label: checkOption(n), search: norm(`проверка check ${n}`) });
  return out;
}
/**
 * Typed text -> { key, label } (null when nothing fits). Order: exact label in either language,
 * a named check, a label that starts with / contains the text, the stat's own word pattern.
 */
export function resolveBonus(text) {
  const t = norm(text);
  if (!t) return null;
  const hit = (s) => ({ key: s.key, id: s.id, label: statLabel(s) });
  const exact = STATS.find((s) => s.label.some((l) => norm(l) === t));
  if (exact) return hit(exact);
  const ck = t.match(/^(?:проверка|check)\s*:\s*(.+)$/);
  const names = checkNames();
  const byName = (q) => names.find((n) => norm(n) === q) ?? (q.length >= 3 ? names.find((n) => norm(n).startsWith(q)) : undefined);
  if (ck) { const n = byName(norm(ck[1])); if (n) return { key: checkBonusKey(n), label: checkOption(n) }; return null; }
  const words = (s) => norm(BONUS_WORDS[s.id] ?? "").split(" ");
  const exactWord = STATS.find((s) => words(s).includes(t));
  if (exactWord) return hit(exactWord);
  const starts = STATS.find((s) => s.label.some((l) => norm(l).startsWith(t)));
  if (starts) return hit(starts);
  const has = t.length >= 3 ? STATS.find((s) => s.label.some((l) => norm(l).includes(t))) : null;
  if (has) return hit(has);
  const word = t.length >= 3 ? STATS.find((s) => words(s).some((w) => w.startsWith(t))) : null;
  if (word) return hit(word);
  const re = STATS.find((s) => new RegExp(`^(?:${s.re.source})`).test(t));
  if (re) return hit(re);
  const n = byName(t);
  return n ? { key: checkBonusKey(n), label: checkOption(n) } : null;
}

/* ------------------------------------------------------------------ *
 *  Form -> Item data
 * ------------------------------------------------------------------ */
const html = (text) => String(text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
const rankOf = (f) => (["B", "A", "S", "SS"].includes(f.rank) ? f.rank : "B");
const rankFolder = (r) => L2(`Ранг ${r}`, `Rank ${r}`);

/**
 * @param {string} kind  "weapon" | "armor" | "accessory" | "item" | "spell" | "alchemy"
 * @param {object} f     raw form values
 * @param {Array<{id:string,value:number}>} rows  effect rows
 * @returns {{data: object, folder: string[], notes: string[]}}  folder = path in the Items directory
 */
export function buildItem(kind, f, rows = []) {
  const notes = [];
  const name = String(f.name ?? "").trim();
  if (!name) throw new Error(L2("Нужно название.", "A name is required."));
  const C = CONFIG.SW25 ?? {};
  const fxRows = rows.map((r) => ({ ...r, key: r.key ?? statById(r.id)?.key })).filter((r) => r.key && N(r.value));
  const base = { description: html(f.description), quantity: Math.max(1, Math.round(N(f.quantity, 1))), price: f.price === "" || f.price == null ? "" : N(f.price), equip: false };
  let type = kind, system, folder, effects = [], schoolText = "", songSide = "";

  if (kind === "weapon") {
    const category = f.category in (C.weaponCategories ?? {}) ? f.category : "";
    const wtype = f.wtype || WEAPON_TYPE_BY_CAT[category] || "blade";
    const power = f.power === "" ? null : N(f.power);
    system = { ...base, category, rank: rankOf(f), type: wtype, usage: f.usage ?? "", reqstr: Math.max(1, N(f.reqstr, 1)), hit: N(f.hit), dmod: N(f.dmod), range: String(f.wrange ?? "").trim(),
      usepower: power !== null, power: power ?? 0, cvalue: N(f.cvalue, 10) || 10, applypower: "on", checkskill: "adv", checkabi: "dex" };
    folder = [L2("Оружие", "Weapons"), category ? loc(C.weaponCategories[category]) : L2("Прочее", "Other"), rankFolder(system.rank)];
    effects = buildEffects(name, "weapon", fxRows, { transfer: true });
  } else if (kind === "armor") {
    const category = f.acategory in (C.armorCategorys ?? {}) ? f.acategory : "other";
    system = { ...base, category, rank: rankOf(f), reqstr: Math.max(1, N(f.reqstr, 1)), pp: N(f.pp), dodge: N(f.dodge), mpp: N(f.mpp), usage: "" };
    const catName = category === "shield" ? L2("Щиты", "Shields") : loc(C.armorCategorys[category]);
    folder = [L2("Броня", "Armour"), catName, rankFolder(system.rank)];
    effects = buildEffects(name, "armor", fxRows, { transfer: true });
  } else if (kind === "accessory") {
    const accpart = f.accpart in (C.accparts ?? {}) ? f.accpart : "other";
    system = { ...base, accpart };
    folder = [L2("Аксессуары", "Accessories"), loc(C.accparts[accpart])];
    effects = buildEffects(name, "accessory", fxRows, { transfer: true });
  } else if (kind === "item") {
    const itype = f.itype in (C.itemTypes ?? {}) ? f.itype : "";
    const worn = !!f.worn;
    const rounds = N(f.fxRounds) > 0 ? Math.round(N(f.fxRounds)) : null;
    effects = buildEffects(name, "item", fxRows, { transfer: worn, rounds });
    system = { ...base, type: itype, ...(effects.length && !worn ? { useeffect: true } : {}) };
    if (f.heals === "hp" || f.heals === "mp") Object.assign(system, { usepower: true, power: Math.max(0, N(f.power)), cvalue: 13, applypower: "on", ...PW(f.heals === "mp" ? "mr" : "hr") });
    folder = [L2("Предметы", "Items"), itype ? loc(C.itemTypes[itype]) : L2("Разное", "Miscellaneous")];
  } else if (kind === "spell") {
    const typed = String(f.school ?? "").trim();
    let school = schoolKey(typed);
    if (!school) { school = "sorcerer"; if (typed) notes.push(L2(`школа «${typed}» не из списка системы — на листе заклинание попадёт в «${schoolLabel(school)}»`, `school "${typed}" is not in the system list — on the sheet the spell goes under "${schoolLabel(school)}"`)); }
    const level = Math.max(1, Math.round(N(f.level, 1)));
    const { target, rangeshape } = spellShape(f);
    const t = spellTime(f);
    const does = SPELL_DOES.some(([k]) => k === f.does) ? f.does : (f.power !== "" && f.power != null ? "damage" : "");
    const amount = Math.max(0, N(f.amount));
    const power = ["damage", "heal", "mheal"].includes(does) ? Math.max(0, N(f.power)) : null;
    const prop = f.prop in (C.spellProps ?? {}) ? f.prop : "";
    const act = { main: !!f.actMain, aux: !!f.actAux, prep: !!f.actPrep, constant: !!f.actConst, decla: false };
    if (!act.main && !act.aux && !act.prep && !act.constant) act.main = true;
    system = { description: html(f.description), overview: String(f.overview ?? "").trim(), type: school, level, basempcost: Math.max(0, N(f.mp)), target, rangeshape, time: t.text, prop,
      resist: "", resistinfo: { type: f.resistType ?? "", result: f.resistType ? (f.resistResult || "halving") : "none" }, ...act };
    const helpful = ["heal", "mheal", "flat", "regen", "mregen"].includes(does);
    // a helpful spell without a save works on willing targets only (hostile ones are skipped)
    if (helpful && !f.resistType) system.resistinfo = { type: "", result: "any" };
    if (does === "damage") Object.assign(system, { usepower: true, power, cvalue: N(f.cvalue, 10) || 10, applypower: "custom", ...PW("md") });
    else if (does === "heal" || does === "mheal") Object.assign(system, { usepower: true, power, cvalue: 13, applypower: "custom", ...PW(does === "mheal" ? "mr" : "hr") });
    if ((does === "regen" || does === "mregen") && amount) fxRows.push({ id: does === "regen" ? "regenhp" : "regenmp", key: statById(does === "regen" ? "regenhp" : "regenmp").key, value: amount });
    if (school === "fairy") {
      const FP = { earth: "fairyearth", ice: "fairyice", fire: "fairyfire", wind: "fairywind" };
      if (FP[prop]) { system.fairytype = "propfairy"; system.fairyprop = FP[prop]; }
    }
    const fxRounds = N(f.fxRounds) > 0 ? Math.round(N(f.fxRounds)) : t.rounds;
    effects = buildEffects(name, "spell", fxRows, { transfer: false, rounds: fxRounds });
    folder = [L2("Заклинания", "Spells"), schoolKey(typed) || !typed ? schoolLabel(school) : typed, L2(`Круг ${level}`, `Level ${level}`)];
    if (typed && !schoolKey(typed)) schoolText = typed;
  } else if (kind === "alchemy") {
    // [2026-10-07] Alchemist evocation: paid with material cards, the card rank (B/A/S/SS) sets a number
    type = "alchemytech";
    const { target, rangeshape } = spellShape(f);
    const t = spellTime(f);
    const cards = Object.fromEntries(CARD_COLORS.map(([c]) => [c, Math.max(0, Math.round(N(f[c])))]));
    if (!Object.values(cards).some((n) => n > 0)) notes.push(L2("карты не указаны — приворот применяется бесплатно", "no cards set — the evocation costs nothing"));
    const evType = EV_TYPES.some(([k]) => k === f.evType) ? f.evType : "-";
    const ev = { type: evType, b: null, a: null, s: null, ss: null };
    if (evType !== "-") for (const r of ["b", "a", "s", "ss"]) ev[r] = f[`ev_${r}`] === "" || f[`ev_${r}`] == null ? null : N(f[`ev_${r}`]);
    if (evType !== "-" && !fxRows.length) notes.push(L2("значение ранга ни к чему не привязано — добавь строку бонуса ниже", "the rank value is not tied to anything — add a bonus row below"));
    system = { description: html(f.description), overview: String(f.overview ?? "").trim(), level: 1, target, rangeshape, time: t.text, ...cards, effectvalue: ev,
      resist: "", // no save: the evocation simply works on whoever it is aimed at
      resistinfo: { type: f.resistType ?? "", result: f.resistType ? (f.resistResult || "halving") : "none" },
      main: !f.actAux, aux: !!f.actAux, usedice: true };
    effects = buildEffects(name, "spell", fxRows, { transfer: false, rounds: t.rounds });
    folder = [L2("Привороты алхимика", "Alchemist evocations")];
  } else if (kind === "song") {
    // [2026-10-07] Bard: a song builds rhythm (↑ ↓ ♡), a finale spends it
    type = "magicalsong";
    const final = f.songType === "final";
    const n3 = (suffix) => Object.fromEntries(NOTES.map(([k]) => [`${k}${suffix}`, Math.max(0, Math.round(N(f[`${k}${suffix}`])))]));
    const side = !final && SONG_SIDES.some(([k]) => k === f.side) ? f.side : "";
    system = { description: html(f.description), overview: String(f.overview ?? "").trim(), level: Math.max(1, Math.round(N(f.level, 1))), type: final ? "final" : "song",
      singpoint: final ? 0 : Math.max(0, Math.round(N(f.singpoint))), ...n3("get"), ...n3("add"), ...n3("cond"), ...n3("cost"),
      resist: "", // no save: a song against foes just lands; one for allies works on those who accept it
      resistinfo: { type: f.resistType ?? "", result: f.resistType ? (f.resistResult || "none") : (side === "ally" ? "any" : "none") }, main: true, usedice: true };
    if (final) {
      Object.assign(system, n3("get"), { upget: 0, downget: 0, charmget: 0, upadd: 0, downadd: 0, charmadd: 0, upcond: 0, downcond: 0, charmcond: 0 });
      const { target, rangeshape } = spellShape(f);
      Object.assign(system, { target, rangeshape });
      const power = f.power === "" || f.power == null ? null : Math.max(0, N(f.power));
      if (f.does === "damage" && power !== null) Object.assign(system, { usepower: true, power, cvalue: N(f.cvalue, 10) || 10, applypower: "custom", ...PW("md") });
      else if (f.does === "heal" && power !== null) Object.assign(system, { usepower: true, power, cvalue: 13, applypower: "custom", ...PW("hr") });
      effects = buildEffects(name, "spell", fxRows, { transfer: false, rounds: N(f.fxRounds) > 0 ? Math.round(N(f.fxRounds)) : 1 });
    } else {
      Object.assign(system, { upcost: 0, downcost: 0, charmcost: 0 });
      // a song lasts while the bard keeps playing: its effect is renewed every round
      effects = buildEffects(name, "spell", fxRows, { transfer: false, rounds: 1 }).map((e) => ({ ...e, flags: foundry.utils.mergeObject(e.flags ?? {}, { sw25: { songFx: true } }) }));
      if (fxRows.length && !side) notes.push(L2("есть бонус, но не выбрано, на кого действует мелодия — эффект не наложится", "there is a bonus but no side chosen for the song — the effect will not be applied"));
      if (side && !fxRows.length) notes.push(L2("выбрано, на кого действует, но нет строки бонуса", "a side is chosen but there is no bonus row"));
    }
    songSide = side;
    folder = [L2("Мелодии барда", "Bard songs"), final ? L2("Финальные аккорды", "Finales") : L2("Мелодии", "Songs")];
  } else throw new Error(`unknown kind: ${kind}`);

  if (effects.length) notes.push(L2(`эффект: ${describeRows(fxRows)}`, `effect: ${describeRows(fxRows)}`));
  const extraFlags = kind === "spell" && f.does === "flat" ? { flatHeal: Math.max(0, N(f.amount)) } : {};
  return { data: { name, type, system, effects, flags: { sw25: { builder: true, ...(schoolText ? { schoolText } : {}), ...(songSide ? { songSide } : {}), ...extraFlags } }, ...(f.img ? { img: f.img } : {}) }, folder, notes };
}

/** Find or create a folder path in a sidebar directory ("Item", "Actor"); returns the deepest Folder. */
export async function ensureFolder(type, path) {
  let parent = null;
  for (const raw of (path ?? []).slice(0, 4)) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    let f = game.folders.find((x) => x.type === type && x.name === name && (x.folder?.id ?? null) === (parent?.id ?? null));
    if (!f) f = await Folder.implementation.create({ name, type, folder: parent?.id ?? null, sorting: "a" });
    parent = f;
  }
  return parent;
}
export const ensureItemFolder = (path) => ensureFolder("Item", path);

/**
 * Folder path for ANY item data of the five kinds (used by the importers too), from its own fields:
 * Weapons / <category> / Rank X, Armour / Shields / Rank X, Accessories / <slot>, Items / <kind>,
 * Spells / <school> / Level N. Returns null for other item types.
 */
export function folderPathForItem(d) {
  const C = CONFIG.SW25 ?? {}, s = d?.system ?? {};
  const rank = (r) => rankFolder(["B", "A", "S", "SS"].includes(r) ? r : "B");
  switch (d?.type) {
    case "weapon": return [L2("Оружие", "Weapons"), C.weaponCategories?.[s.category] ? loc(C.weaponCategories[s.category]) : L2("Прочее", "Other"), rank(s.rank)];
    case "armor": return [L2("Броня", "Armour"), s.category === "shield" ? L2("Щиты", "Shields") : loc(C.armorCategorys?.[s.category] ?? C.armorCategorys?.other ?? "Other"), rank(s.rank)];
    case "accessory": return [L2("Аксессуары", "Accessories"), loc(C.accparts?.[s.accpart] ?? C.accparts?.other ?? "Other")];
    case "item": return [L2("Предметы", "Items"), C.itemTypes?.[s.type] ? loc(C.itemTypes[s.type]) : L2("Разное", "Miscellaneous")];
    case "spell": { const lv = Math.max(1, Math.round(N(s.level, 1))); return [L2("Заклинания", "Spells"), d.flags?.sw25?.schoolText || schoolLabel(s.type || "sorcerer"), L2(`Круг ${lv}`, `Level ${lv}`)]; }
    default: return null;
  }
}

/** Create the item in the world (GM). Returns the Item. */
export async function createBuiltItem(kind, f, rows = [], actor = null) {
  const built = buildItem(kind, f, rows);
  // [2026-10-07] a player builds straight onto a character of theirs (no world items, no folders)
  if (actor) {
    const [item] = await actor.createEmbeddedDocuments("Item", [built.data]);
    return { item, folder: [actor.name], notes: built.notes };
  }
  const folder = await ensureItemFolder(built.folder);
  const item = await Item.implementation.create({ ...built.data, folder: folder?.id ?? null });
  return { item, folder: built.folder, notes: built.notes };
}

/* ------------------------------------------------------------------ *
 *  Window
 * ------------------------------------------------------------------ */
const opt = (v, label, cur) => `<option value="${esc(v)}"${String(v) === String(cur ?? "") ? " selected" : ""}>${esc(label)}</option>`;
const cfgOpts = (obj, cur, blank) => (blank != null ? opt("", blank, cur) : "") + Object.entries(obj ?? {}).map(([k, lk]) => opt(k, loc(lk), cur)).join("");
const pairOpts = (list, cur) => list.map(([v, l]) => opt(v, L2(l[0], l[1]), cur)).join("");
const fld = (label, inner, span = 1, cls = "") => `<label class="ib-f ${cls}" style="grid-column:span ${span}"><span>${esc(label)}</span>${inner}</label>`;
const num = (name, val = "", extra = "") => `<input type="number" name="${name}" value="${esc(val)}" step="1" ${extra}>`;
const rankSel = () => `<select name="rank">${["B", "A", "S", "SS"].map((r) => opt(r, r, "B")).join("")}</select>`;
const fxRow = (r = {}) => `<tr class="ib-fxrow"><td><input type="text" name="fxname" autocomplete="off" value="${esc(r.label ?? "")}" placeholder="${L2("начни печатать: укл, сила, ev…", "start typing: eva, str, укл…")}"><small class="ib-fxhint"></small></td>`
  + `<td><input type="number" name="fxval" value="${N(r.value)}" step="1" style="width:5em"></td><td><a class="ib-fxdel" data-tooltip="${L2("Убрать", "Remove")}"><i class="fas fa-trash"></i></a></td></tr>`;

function formHtml(kind) {
  const C = CONFIG.SW25 ?? {};
  const common = fld(L2("Название", "Name"), `<input type="text" name="name" autocomplete="off" placeholder="${esc(kindLabel(kind))}">`, 4);
  let body = "";
  if (kind === "weapon") {
    body = fld(L2("Категория", "Category"), `<select name="category">${cfgOpts(C.weaponCategories, "sword", L2("— прочее —", "— other —"))}</select>`, 2)
      + fld(L2("Ранг", "Rank"), rankSel()) + fld(L2("Хват", "Usage"), `<select name="usage">${cfgOpts(C.weaponUsages, "1H", "—")}</select>`)
      + fld(L2("Тип урона", "Damage type"), `<select name="wtype">${opt("", L2("по категории", "by category"), "")}${cfgOpts(C.weaponTypes, "")}</select>`, 2)
      + fld(L2("Мин. Сила", "Min. Strength"), num("reqstr", 1, 'min="1"')) + fld(L2("Дальность", "Range"), `<input type="text" name="wrange" placeholder="${L2("напр. 20 м", "e.g. 20 m")}">`)
      + fld(L2("Точность ±", "Accuracy ±"), num("hit", 0)) + fld(L2("Мощность", "Power"), num("power", 10, 'min="0"'))
      + fld(L2("Крит", "Crit"), num("cvalue", 10, 'min="2" max="13"')) + fld(L2("Доп. урон ±", "Extra damage ±"), num("dmod", 0));
  } else if (kind === "armor") {
    body = fld(L2("Вид", "Kind"), `<select name="acategory">${cfgOpts(C.armorCategorys, "nonmetalarmor")}</select>`, 2)
      + fld(L2("Ранг", "Rank"), rankSel()) + fld(L2("Мин. Сила", "Min. Strength"), num("reqstr", 1, 'min="1"'))
      + fld(L2("Защита", "Defense"), num("pp", 0)) + fld(L2("Уклонение ±", "Evasion ±"), num("dodge", 0)) + fld(L2("Маг. защита", "Magic defense"), num("mpp", 0));
  } else if (kind === "accessory") {
    body = fld(L2("Куда надевается", "Slot"), `<select name="accpart">${cfgOpts(C.accparts, "other")}</select>`, 2);
  } else if (kind === "item") {
    body = fld(L2("Вид", "Kind"), `<select name="itype">${cfgOpts(C.itemTypes, "", L2("разное", "miscellaneous"))}</select>`, 2)
      + fld(L2("Количество", "Quantity"), num("quantity", 1, 'min="1"'))
      + fld(L2("При использовании", "On use"), `<select name="heals">${opt("", L2("ничего не лечит", "no healing"), "")}${opt("hp", L2("лечит ОЖ по мощности", "heals HP by power"), "")}${opt("mp", L2("восстанавливает ОМ по мощности", "restores MP by power"), "")}</select>`, 2)
      + fld(L2("Мощность", "Power"), num("power", 10, 'min="0"'), 1, "ib-power");
  } else if (kind === "spell") {
    const dl = Object.keys(C.spellTypes ?? {}).map((k) => `<option value="${esc(schoolLabel(k))}">`).join("");
    body = fld(L2("Тип магии (пиши сам)", "School of magic (type it)"), `<input type="text" name="school" list="ib-schools" autocomplete="off" placeholder="${L2("фея, магитех, жрец…", "fairy, magitech, priest…")}"><datalist id="ib-schools">${dl}</datalist><small class="ib-school"></small>`, 2)
      + fld(L2("Круг", "Level"), num("level", 1, 'min="1"')) + fld(L2("ОМ", "MP"), num("mp", 3, 'min="0"'))
      + fld(L2("Форма", "Shape"), `<select name="shape">${pairOpts(SHAPES, "target")}</select>`, 2)
      + fld(L2("Дальность, м", "Range, m"), num("range", 10, 'min="0"'), 1, "ib-range")
      + fld(L2("Радиус, м", "Radius, m"), num("radius", 3, 'min="1"'), 1, "ib-area")
      + fld(L2("Макс. целей (0 — все)", "Max targets (0 — all)"), num("max", 0, 'min="0"'), 2, "ib-area")
      + fld(L2("Длительность", "Duration"), `<select name="time">${pairOpts(TIMES, "instant")}</select>`, 2)
      + fld(L2("Сколько", "How many"), num("timeN", 3, 'min="1"'), 1, "ib-timen") + fld(L2("Текст длительности", "Duration text"), `<input type="text" name="timeText">`, 2, "ib-timetext")
      + fld(L2("Спас", "Save"), `<select name="resistType">${pairOpts(RESIST_TYPES, "")}</select>`)
      + fld(L2("При успехе спаса", "On a successful save"), `<select name="resistResult">${cfgOpts(C.resistResult, "halving")}</select>`, 2, "ib-resist")
      + fld(L2("Стихия", "Element"), `<select name="prop">${cfgOpts(C.spellProps, "", "—")}</select>`)
      + fld(L2("Что делает", "What it does"), `<select name="does">${pairOpts(SPELL_DOES, "")}</select>`, 2)
      + fld(L2("Мощность", "Power"), num("power", 10, 'min="0"'), 1, "ib-power") + fld(L2("Крит", "Crit"), num("cvalue", 10, 'min="2" max="13"'), 1, "ib-crit")
      + fld(L2("Сколько (N)", "Amount (N)"), num("amount", 3, 'min="0"'), 1, "ib-amount")
      + `<div class="ib-f ib-checks" style="grid-column:span 4"><span>${L2("Действие", "Action")}</span><div>`
      + [["actMain", ["основное", "main"], true], ["actAux", ["вспомогательное", "minor"]], ["actPrep", ["подготовка", "setup"]], ["actConst", ["постоянное", "passive"]]]
        .map(([n, l, on]) => `<label><input type="checkbox" name="${n}"${on ? " checked" : ""}> ${L2(l[0], l[1])}</label>`).join(" ") + `</div></div>`
      + fld(L2("Коротко (одна строка)", "Summary (one line)"), `<input type="text" name="overview">`, 4)
      + `<div class="ib-preview" style="grid-column:span 4"></div>`;
  }
  else if (kind === "alchemy") {
    body = `<div class="ib-f" style="grid-column:span 4"><span>${L2("Сколько карт каждого цвета тратится за применение", "Cards of each colour spent per use")}</span><div style="display:flex;gap:8px;flex-wrap:wrap">`
      + CARD_COLORS.map(([c, l]) => `<label style="display:flex;gap:4px;align-items:center">${L2(l[0], l[1])} <input type="number" name="${c}" value="0" min="0" step="1" style="width:4em"></label>`).join("") + `</div></div>`
      + fld(L2("Форма", "Shape"), `<select name="shape">${pairOpts(SHAPES, "target")}</select>`, 2)
      + fld(L2("Дальность, м", "Range, m"), num("range", 10, 'min="0"'), 1, "ib-range")
      + fld(L2("Радиус, м", "Radius, m"), num("radius", 3, 'min="1"'), 1, "ib-area")
      + fld(L2("Макс. целей (0 — все)", "Max targets (0 — all)"), num("max", 0, 'min="0"'), 2, "ib-area")
      + fld(L2("Длительность", "Duration"), `<select name="time">${pairOpts(TIMES, "instant")}</select>`, 2)
      + fld(L2("Сколько", "How many"), num("timeN", 3, 'min="1"'), 1, "ib-timen") + fld(L2("Текст длительности", "Duration text"), `<input type="text" name="timeText">`, 2, "ib-timetext")
      + fld(L2("Спас", "Save"), `<select name="resistType">${pairOpts(RESIST_TYPES, "")}</select>`)
      + fld(L2("При успехе спаса", "On a successful save"), `<select name="resistResult">${cfgOpts(C.resistResult, "halving")}</select>`, 2, "ib-resist")
      + fld(L2("Ранг карт задаёт", "The card rank sets"), `<select name="evType">${pairOpts(EV_TYPES, "-")}</select>`, 4)
      + ["b", "a", "s", "ss"].map((r) => fld(L2(`Ранг ${r.toUpperCase()}`, `Rank ${r.toUpperCase()}`), num(`ev_${r}`, ""), 1, "ib-ev")).join("")
      + `<label class="ib-f" style="grid-column:span 4"><span><input type="checkbox" name="actAux"> ${L2("вспомогательное действие (иначе основное)", "minor action (otherwise main)")}</span></label>`
      + fld(L2("Коротко (одна строка)", "Summary (one line)"), `<input type="text" name="overview">`, 4)
      + `<small style="grid-column:span 4;opacity:.75">${L2("Карты — это ресурсы на листе персонажа; они появляются сами, когда персонажу добавляют класс Алхимик или приворот. Проверка идёт от класса Алхимик и Интеллекта.", "Cards are resources on the character sheet; they appear by themselves when the Alchemist class or an evocation is added. The check uses the Alchemist class and Intelligence.")}</small>`
      + `<div class="ib-preview" style="grid-column:span 4"></div>`;
  }
  else if (kind === "song") {
    const trio = (suffix) => `<div style="display:flex;gap:6px">` + NOTES.map(([k, sym]) => `<label style="display:flex;gap:3px;align-items:center">${sym}<input type="number" name="${k}${suffix}" value="0" min="0" step="1" style="width:3.5em"></label>`).join("") + `</div>`;
    const wrap = (label, inner, cls, span = 2) => `<div class="ib-f ${cls}" style="grid-column:span ${span}"><span>${label}</span>${inner}</div>`;
    body = fld(L2("Что это", "What it is"), `<select name="songType">${opt("song", L2("Мелодия (копит ритм)", "Song (builds rhythm)"), "song")}${opt("final", L2("Финальный аккорд (тратит ритм)", "Finale (spends rhythm)"), "song")}</select>`, 2)
      + fld(L2("Уровень", "Level"), num("level", 1, 'min="1"'))
      + fld(L2("Взлёт (порог проверки)", "Flourish (check threshold)"), num("singpoint", 0, 'min="0"'), 1, "ib-song")
      + wrap(L2("Ритм за исполнение", "Rhythm per performance"), trio("get"), "ib-song")
      + wrap(L2("Ещё ритм при взлёте", "Extra rhythm on a flourish"), trio("add"), "ib-song")
      + wrap(L2("Нужно ритма, чтобы эффект сработал", "Rhythm needed for the effect"), trio("cond"), "ib-song")
      + fld(L2("На кого действует", "Whom it reaches"), `<select name="side">${pairOpts(SONG_SIDES, "")}</select>`, 2, "ib-song")
      + wrap(L2("Стоимость в ритме", "Rhythm cost"), trio("cost"), "ib-final")
      + fld(L2("Форма", "Shape"), `<select name="shape">${pairOpts(SHAPES, "target")}</select>`, 2, "ib-final")
      + fld(L2("Дальность, м", "Range, m"), num("range", 10, 'min="0"'), 1, "ib-final ib-range")
      + fld(L2("Радиус, м", "Radius, m"), num("radius", 3, 'min="1"'), 1, "ib-final ib-area")
      + fld(L2("Макс. целей (0 — все)", "Max targets (0 — all)"), num("max", 0, 'min="0"'), 2, "ib-final ib-area")
      + fld(L2("Что делает", "What it does"), `<select name="does">${opt("", L2("только эффект", "effect only"), "")}${opt("damage", L2("урон по мощности", "damage by power"), "")}${opt("heal", L2("лечение по мощности", "healing by power"), "")}</select>`, 2, "ib-final")
      + fld(L2("Мощность", "Power"), num("power", 10, 'min="0"'), 1, "ib-final ib-power") + fld(L2("Крит", "Crit"), num("cvalue", 10, 'min="2" max="13"'), 1, "ib-final ib-crit")
      + fld(L2("Спас", "Save"), `<select name="resistType">${pairOpts(RESIST_TYPES, "")}</select>`)
      + fld(L2("При успехе спаса", "On a successful save"), `<select name="resistResult">${cfgOpts(C.resistResult, "none")}</select>`, 2, "ib-resist")
      + fld(L2("Коротко (одна строка)", "Summary (one line)"), `<input type="text" name="overview">`, 4)
      + `<small style="grid-column:span 4;opacity:.75">${L2("Счётчики ритма ↑ ↓ ♡ появляются на листе барда сами при первом исполнении. Проверка идёт от класса Бард и Духа.", "The rhythm counters ↑ ↓ ♡ appear on the bard's sheet by themselves at the first performance. The check uses the Bard class and Spirit.")}</small>`;
  }
  const price = ["spell", "alchemy", "song"].includes(kind) ? "" : fld(L2("Цена, G", "Price, G"), `<input type="number" name="price" value="" min="0" step="1">`);
  const fxExtra = kind === "song" ? `<small class="ib-song" style="grid-column:span 4;opacity:.75">${L2("Бонус мелодии действует 1 раунд и обновляется каждым исполнением. Штраф пишется отрицательным числом.", "A song's bonus lasts 1 round and is renewed by each performance. A penalty is a negative number.")}</small>`
      + fld(L2("Длительность эффекта, р.", "Effect duration, rd."), `<input type="number" name="fxRounds" value="" min="0">`, 2, "ib-final")
    : kind === "alchemy" ? `<small style="grid-column:span 4;opacity:.75">${L2("Если ранг карт задаёт величину бонуса — число в строке заменится значением ранга (впиши любое, например 1). Если длительность — эффект продлится столько раундов.", "If the card rank sets the size of the bonus, the number in the row is replaced by the rank value (type any, e.g. 1). If it sets the duration, the effect lasts that many rounds.")}</small>`
    : kind === "spell" ? fld(L2("Длительность эффекта, р. (пусто — как у заклинания)", "Effect duration, rd. (empty — same as the spell)"), `<input type="number" name="fxRounds" value="" min="0">`, 3)
    : kind === "item" ? fld(L2("Длительность эффекта, р.", "Effect duration, rd."), `<input type="number" name="fxRounds" value="" min="0">`, 2) + `<label class="ib-f" style="grid-column:span 2"><span>&nbsp;</span><span><input type="checkbox" name="worn"> ${L2("действует, пока предмет при себе", "works while carried")}</span></label>`
    : `<small style="grid-column:span 4;opacity:.75">${L2("Бонусы действуют, пока предмет надет.", "Bonuses apply while the item is equipped.")}</small>`;
  return `<div class="ib-grid">${common}${body}${price}</div>
    <label class="ib-f"><span>${L2("Описание (пишется руками)", "Description (typed by hand)")}</span><textarea name="description" rows="4"></textarea></label>
    <details class="ib-fx"><summary><b>${L2("Числовые бонусы и штрафы", "Numeric bonuses and penalties")}</b> <small>${L2("необязательно", "optional")}</small></summary>
      <table><tbody class="ib-fxrows">${fxRow()}</tbody></table><p><a class="ib-fxadd"><i class="fas fa-plus"></i> ${L2("Добавить строку", "Add row")}</a></p>
      <div class="ib-grid">${fxExtra}</div></details>`;
}

const STYLE = `
.sw25-ib{max-height:74vh;overflow:auto;padding-right:6px}
.sw25-ib .ib-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.sw25-ib .ib-tabs button{width:auto;flex:1 1 auto;white-space:nowrap}
.sw25-ib .ib-tabs button.on{outline:2px solid var(--color-warm-2,#c9593f);font-weight:700}
.sw25-ib .ib-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 8px;margin-bottom:6px}
.sw25-ib .ib-f{display:flex;flex-direction:column;gap:2px;font-size:.9em;min-width:0}
.sw25-ib .ib-f>span{opacity:.8}
.sw25-ib .ib-f input[type=text],.sw25-ib .ib-f input[type=number],.sw25-ib .ib-f select,.sw25-ib .ib-f textarea{width:100%}
.sw25-ib .ib-checks>div{display:flex;gap:12px;flex-wrap:wrap}
.sw25-ib .ib-preview{font-size:.85em;opacity:.85;border-left:3px solid #8886;padding-left:6px}
.sw25-ib .ib-foot{display:flex;gap:8px;align-items:center;margin-top:8px}
.sw25-ib .ib-foot button{width:auto}
.sw25-ib .ib-log{max-height:110px;overflow:auto;font-size:.85em;margin-top:6px}
.sw25-ib .ib-log div{padding:1px 0}
.sw25-ib a{cursor:pointer}
.sw25-ib .ib-fx table{width:100%}
.sw25-ib .ib-fx td:first-child{width:70%}
.sw25-ib .ib-fxhint{display:block;opacity:.75;font-size:.85em;min-height:1em}
.sw25-ib-pop{position:fixed;z-index:100000;margin:0;padding:2px 0;list-style:none;max-height:240px;overflow-y:auto;background:#1c1b22;color:#eee;border:1px solid #8888;border-radius:4px;box-shadow:0 4px 14px #000a;font-size:13px}
.sw25-ib-pop li{padding:3px 8px;cursor:pointer;white-space:nowrap}
.sw25-ib-pop li.on,.sw25-ib-pop li:hover{background:#c9593f;color:#fff}
.sw25-ib-pop li.none{opacity:.6;cursor:default;background:none;color:inherit}
`;
/** DialogV2 drops <style> from its content, so the rules live in <head>. */
function ensureStyle() {
  if (document.getElementById("sw25-ib-style")) return;
  const el = document.createElement("style");
  el.id = "sw25-ib-style"; el.textContent = STYLE;
  document.head.appendChild(el);
}

/**
 * Type-ahead list for the bonus field (replaces <datalist>, whose native popup showed every
 * bonus twice and could not be scrolled inside the dialog). One scrollable list, arrows + Enter.
 */
function attachBonusPicker(root, onPick) {
  const pop = document.createElement("ul");
  pop.className = "sw25-ib-pop";
  pop.style.display = "none";
  document.body.appendChild(pop);
  let input = null, choices = [], shown = [], cur = -1;
  const hide = () => { pop.style.display = "none"; cur = -1; };
  const mark = () => {
    pop.querySelectorAll("li").forEach((li, i) => li.classList.toggle("on", i === cur));
    pop.querySelector("li.on")?.scrollIntoView({ block: "nearest" });
  };
  const pick = (label) => {
    if (!input) return;
    input.value = label;
    hide();
    onPick();
  };
  const show = (el) => {
    input = el;
    if (!choices.length) choices = bonusChoices();
    const q = norm(el.value);
    shown = q ? choices.filter((c) => c.search.includes(q) || norm(c.label).includes(q)) : choices;
    // labels that start with the typed text first
    if (q) shown = [...shown].sort((a, b) => Number(!norm(a.label).startsWith(q)) - Number(!norm(b.label).startsWith(q)));
    pop.innerHTML = shown.length ? shown.map((c) => `<li>${esc(c.label)}</li>`).join("") : `<li class="none">${L2("ничего не найдено", "nothing found")}</li>`;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom, h = Math.min(240, Math.max(60, shown.length * 24 + 6));
    pop.style.left = `${r.left}px`;
    pop.style.minWidth = `${r.width}px`;
    pop.style.top = below >= h + 4 || below >= r.top ? `${r.bottom + 2}px` : `${Math.max(4, r.top - h - 2)}px`;
    pop.style.maxHeight = `${Math.max(60, Math.min(240, (below >= h + 4 || below >= r.top ? below : r.top) - 8))}px`;
    pop.style.display = "";
    cur = -1;
  };
  const isFx = (t) => t?.name === "fxname";
  root.addEventListener("focusin", (ev) => { if (isFx(ev.target)) { choices = bonusChoices(); show(ev.target); } });
  root.addEventListener("input", (ev) => { if (isFx(ev.target)) show(ev.target); });
  root.addEventListener("focusout", (ev) => { if (isFx(ev.target)) setTimeout(hide, 150); });
  root.addEventListener("click", (ev) => { if (isFx(ev.target) && pop.style.display === "none") show(ev.target); });
  root.addEventListener("keydown", (ev) => {
    if (!isFx(ev.target) || pop.style.display === "none") return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!shown.length) return;
      cur = (cur + (ev.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
      mark();
    } else if (ev.key === "Enter" && cur >= 0 && shown[cur]) {
      ev.preventDefault(); ev.stopPropagation();
      pick(shown[cur].label);
    } else if (ev.key === "Escape") {
      ev.stopPropagation();
      hide();
    }
  }, true);
  // mousedown: before the field loses focus
  pop.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest("li");
    if (!li || li.classList.contains("none")) return;
    ev.preventDefault();
    pick(li.textContent);
  });
  return () => pop.remove();
}

let _open = null;
export async function openItemBuilder(startKind = "weapon") {
  // players build onto their own characters; the GM builds into the Items directory
  const mine = game.user.isGM ? [] : game.actors.filter((a) => a.type === "character" && a.isOwner);
  if (!game.user.isGM && !mine.length) return ui.notifications.warn(L2("У вас нет персонажа, на лист которого можно создать предмет.", "You have no character to build the item onto."));
  if (_open?.rendered) { _open.bringToFront?.(); return _open; }
  const { DialogV2 } = foundry.applications.api;
  let kind = KINDS.some((k) => k[0] === startKind) ? startKind : "weapon";
  ensureStyle();
  const content = `<div class="sw25-ib">
    <div class="ib-tabs">${KINDS.map(([k, ic, l]) => `<button type="button" data-kind="${k}"><i class="${ic}"></i> ${L2(l[0], l[1])}</button>`).join("")}</div>
    <div class="ib-form"></div>
    <div class="ib-foot"><button type="button" class="ib-create"><i class="fa-solid fa-plus"></i> ${L2("Создать", "Create")}</button>
      ${mine.length ? `<label>${L2("на лист", "onto")} <select class="ib-actor">${mine.map((a) => `<option value="${a.id}"${a.id === game.user.character?.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>` : ""}
      <label><input type="checkbox" class="ib-opensheet"> ${L2("открыть лист после создания", "open the sheet afterwards")}</label>
      <span class="ib-where" style="margin-left:auto;opacity:.8;font-size:.85em"></span></div>
    <div class="ib-log"></div></div>`;
  const dlg = new DialogV2({ window: { title: L2("Конструктор предметов", "Item constructor"), resizable: true }, position: { width: 640 }, content, buttons: [{ action: "close", label: L2("Закрыть", "Close") }] });
  await dlg.render(true);
  _open = dlg;
  const root = dlg.element.querySelector(".sw25-ib");
  const form = root.querySelector(".ib-form");

  const read = () => {
    const f = {};
    form.querySelectorAll("[name]").forEach((el) => { if (el.name === "fxname" || el.name === "fxval") return; f[el.name] = el.type === "checkbox" ? el.checked : el.value; });
    const rows = [];
    form.querySelectorAll(".ib-fxrow").forEach((tr) => {
      const typed = tr.querySelector("[name=fxname]").value, b = resolveBonus(typed), hint = tr.querySelector(".ib-fxhint");
      if (hint) hint.textContent = !typed.trim() ? "" : b ? (norm(b.label) === norm(typed) ? "" : `→ ${b.label}`) : L2("не понял — выбери из списка", "not recognised — pick from the list");
      const value = N(tr.querySelector("[name=fxval]").value);
      if (b && value) rows.push({ key: b.key, id: b.id, value });
    });
    return { f, rows };
  };
  const refresh = () => {
    const { f, rows } = read();
    if (kind === "spell") {
      const area = f.shape === "area" || f.shape === "selfarea";
      form.querySelectorAll(".ib-area").forEach((el) => (el.style.display = area ? "" : "none"));
      form.querySelectorAll(".ib-range").forEach((el) => (el.style.display = ["self", "touch", "selfarea"].includes(f.shape) ? "none" : ""));
      form.querySelectorAll(".ib-timen").forEach((el) => (el.style.display = ["rounds", "minutes", "hours", "days"].includes(f.time) ? "" : "none"));
      form.querySelectorAll(".ib-timetext").forEach((el) => (el.style.display = f.time === "text" ? "" : "none"));
      form.querySelectorAll(".ib-resist").forEach((el) => (el.style.display = f.resistType ? "" : "none"));
      form.querySelectorAll(".ib-power").forEach((el) => (el.style.display = ["damage", "heal", "mheal"].includes(f.does) ? "" : "none"));
      form.querySelectorAll(".ib-crit").forEach((el) => (el.style.display = f.does === "damage" ? "" : "none"));
      form.querySelectorAll(".ib-amount").forEach((el) => (el.style.display = ["flat", "regen", "mregen"].includes(f.does) ? "" : "none"));
      const key = schoolKey(f.school), hint = form.querySelector(".ib-school");
      if (hint) hint.textContent = !String(f.school ?? "").trim() ? "" : key ? `→ ${schoolLabel(key)}` : L2("нет в списке системы: на листе будет «Речь Истины», папка — как написано", "not in the system list: the sheet shows it under Truespeech, the folder keeps your text");
      const sh = spellShape(f), t = spellTime(f), pv = form.querySelector(".ib-preview");
      if (pv) pv.textContent = [sh.target, sh.rangeshape, t.text].filter(Boolean).join(" · ");
    }
    if (kind === "alchemy") {
      const area = f.shape === "area" || f.shape === "selfarea";
      form.querySelectorAll(".ib-area").forEach((el) => (el.style.display = area ? "" : "none"));
      form.querySelectorAll(".ib-range").forEach((el) => (el.style.display = ["self", "touch", "selfarea"].includes(f.shape) ? "none" : ""));
      form.querySelectorAll(".ib-timen").forEach((el) => (el.style.display = ["rounds", "minutes", "hours", "days"].includes(f.time) ? "" : "none"));
      form.querySelectorAll(".ib-timetext").forEach((el) => (el.style.display = f.time === "text" ? "" : "none"));
      form.querySelectorAll(".ib-resist").forEach((el) => (el.style.display = f.resistType ? "" : "none"));
      form.querySelectorAll(".ib-ev").forEach((el) => (el.style.display = f.evType && f.evType !== "-" ? "" : "none"));
      const sh = spellShape(f), t = spellTime(f), pv = form.querySelector(".ib-preview");
      const cost = CARD_COLORS.filter(([c]) => N(f[c]) > 0).map(([c, l]) => `${L2(l[0], l[1])} ×${N(f[c])}`).join(", ");
      if (pv) pv.textContent = [cost || L2("без карт", "no cards"), sh.target, sh.rangeshape, t.text].filter(Boolean).join(" · ");
    }
    if (kind === "song") {
      const final = f.songType === "final", area = f.shape === "area" || f.shape === "selfarea";
      form.querySelectorAll(".ib-song").forEach((el) => (el.style.display = final ? "none" : ""));
      form.querySelectorAll(".ib-final").forEach((el) => (el.style.display = final ? "" : "none"));
      if (final) {
        form.querySelectorAll(".ib-area").forEach((el) => (el.style.display = area ? "" : "none"));
        form.querySelectorAll(".ib-range").forEach((el) => (el.style.display = ["self", "touch", "selfarea"].includes(f.shape) ? "none" : ""));
        form.querySelectorAll(".ib-power").forEach((el) => (el.style.display = f.does ? "" : "none"));
        form.querySelectorAll(".ib-crit").forEach((el) => (el.style.display = f.does === "damage" ? "" : "none"));
      }
      form.querySelectorAll(".ib-resist").forEach((el) => (el.style.display = f.resistType ? "" : "none"));
    }
    if (kind === "item") form.querySelectorAll(".ib-power").forEach((el) => (el.style.display = f.heals ? "" : "none"));
    let where = "";
    try { where = buildItem(kind, { ...f, name: f.name || "?" }, rows).folder.join(" / "); } catch (_e) { /* incomplete form */ }
    root.querySelector(".ib-where").textContent = where ? `${L2("папка", "folder")}: ${where}` : "";
  };
  const setKind = (k) => {
    kind = k;
    root.querySelectorAll(".ib-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.kind === k));
    form.innerHTML = formHtml(k);
    refresh();
    form.querySelector("[name=name]")?.focus();
  };

  let busy = false;
  const create = async () => {
    if (busy) return;
    busy = true;
    try {
      const { f, rows } = read();
      const onto = game.user.isGM ? null : game.actors.get(root.querySelector(".ib-actor")?.value);
      if (!game.user.isGM && !onto?.isOwner) throw new Error(L2("Выберите своего персонажа.", "Pick a character of yours."));
      const { item, folder, notes } = await createBuiltItem(kind, f, rows, onto);
      const line = document.createElement("div");
      line.innerHTML = `<i class="fa-solid fa-check"></i> <a data-uuid="${item.uuid}"><b>${esc(item.name)}</b></a> → ${esc(folder.join(" / "))}${notes.length ? ` <i>(${esc(notes.join("; "))})</i>` : ""}`;
      root.querySelector(".ib-log").prepend(line);
      if (root.querySelector(".ib-opensheet").checked) item.sheet.render(true);
      const nameEl = form.querySelector("[name=name]");
      nameEl.value = ""; nameEl.focus();
      refresh();
    } catch (err) {
      ui.notifications.warn(err?.message ?? String(err));
    } finally { busy = false; }
  };

  root.addEventListener("click", (ev) => {
    const b = ev.target.closest("button, a");
    if (!b) return;
    if (b.dataset.kind) return setKind(b.dataset.kind);
    if (b.classList.contains("ib-create")) return create();
    if (b.classList.contains("ib-fxadd")) return form.querySelector(".ib-fxrows").insertAdjacentHTML("beforeend", fxRow());
    if (b.classList.contains("ib-fxdel")) { b.closest("tr").remove(); return refresh(); }
    if (b.dataset.uuid) return fromUuid(b.dataset.uuid).then((d) => d?.sheet?.render(true));
  });
  root.addEventListener("input", refresh);
  root.addEventListener("change", refresh);
  // Enter in a field creates the item instead of pressing the dialog's Close button
  root.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" || ev.target.tagName === "TEXTAREA") return;
    ev.preventDefault(); ev.stopPropagation();
    if (ev.target.name === "name" && ev.target.value.trim()) create();
  }, true);
  const dropPicker = attachBonusPicker(root, refresh);
  dlg.addEventListener?.("close", dropPicker);
  setKind(kind);
  return dlg;
}

export function registerItemBuilder() {
  game.sw25 = Object.assign(game.sw25 ?? {}, { itemBuilder: { open: openItemBuilder, build: buildItem, create: createBuiltItem, schoolKey, resolveBonus, folderPathForItem, ensureFolder } });
  Hooks.on("renderItemDirectory", (app, htmlEl) => {
    const root = htmlEl instanceof HTMLElement ? htmlEl : htmlEl?.[0];
    if (!root || root.querySelector(".sw25-itembuilder")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-itembuilder";
    btn.innerHTML = `<i class="fa-solid fa-hammer"></i> ${L2("Конструктор предметов", "Item constructor")}`;
    btn.addEventListener("click", () => openItemBuilder());
    (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).appendChild(btn);
  });
}
