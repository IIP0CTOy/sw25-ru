/**
 * [Round 91] GM monster generator — «Генератор монстров».
 *
 * One window, two ways to fill it:
 *   1. «Импорт из текста»: paste a stat block (Russian / English; Japanese is a stub for later)
 *      -> parseStatBlock() fills the form -> the GM checks/edits -> «Создать».
 *   2. «Конструктор»: fill by hand; abilities are added from templates.
 * Creates a normal `monster` actor with default «Сопротивление» + «Атака» items, one weapon per
 * section (multi-section monsters get flags.sw25.sections like helpers/sections.mjs), and
 * monsterability items with the R89 automation data (dice1.resist, flags.sw25.shape / dmgType).
 *
 * No book data is stored here: only dictionaries of field names for parsing.
 * Entry points: Actors directory button (GM) and `game.sw25.monsterGen()`.
 */

/** Split pasted text into one chunk per monster (starts one line above «Intelligence:»). */
function splitBlocks(text) {
  const lines = String(text).split("\n");
  const starts = [];
  lines.forEach((l, i) => { if (/^\s*(intelligence|интеллект|知能)\s*[:：]/i.test(l)) starts.push(i); });
  return starts.map((s, k) => lines.slice(Math.max(0, s - 2), k + 1 < starts.length ? starts[k + 1] - 2 : lines.length).join("\n"));
}
import { lang, L2, tr, watchDom, ja, magicData } from "./monstergen-i18n.mjs";
import { isYtSpell, isYtItem, isYtSkillArts, importYtSheets } from "./ytspell.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const notify = { info: (s) => ui.notifications.info(tr(s)), warn: (s) => ui.notifications.warn(tr(s)), error: (s) => ui.notifications.error(tr(s)) };
const num = (v, d = 0) => { const n = parseInt(String(v).replace(/[−–]/g, "-"), 10); return Number.isFinite(n) ? n : d; };

/* ------------------------------------------------------------------ *
 *  Dictionaries (lower-case). Add a language = add a key here.
 * ------------------------------------------------------------------ */
const L = {
  en: {
    intelligence: /intelligence:\s*([^\n]*?)(?=\s+perception:|$)/i,
    perception: /perception:\s*([^\n]*?)(?=\s+disposition:|$)/i,
    disposition: /disposition:\s*([^\n]*?)(?=\s+soulscars?:|$)/i,
    impurity: /soulscars?:\s*(\d+)/i,
    language: /language:\s*([^\n]*?)(?=\s+habitat:|$)/i,
    habitat: /habitat:\s*([^\n]*)/i,
    rep: /rep(?:utation)?\s*\/\s*weak(?:ness)?:\s*(\d+)\s*\/\s*(\d+)/i,
    weak: /weak(?:\s*point|ness):\s*(?!\s*\d+\s*\/)([^\n]*?)(?=\s+initiative:|$)/im,
    initiative: /initiative:\s*(\d+)/i,
    move: /movement\s*speed:\s*([^\s]+(?:\s*\([^)]*\))?)/i,
    vit: /fortitude:\s*(\d+)\s*\(\s*(\d+)\s*\)/i,
    mnd: /willpower:\s*(\d+)\s*\(\s*(\d+)\s*\)/i,
    level: /^\s*(\d{1,2})(?:\s*\+|\s*[-–]\s*\d+)?\s+(\S.*)$/,
    skillsStart: /^\s*unique\s*skills\s*$/i,
    lootStart: /^\s*loot\s*$/i,
    none: /^\s*none\.?\s*$/i,
    sections: /sections?:\s*(\d+)(?:\s*\(([^)]*)\))?(?:.*main(?:\s*section)?:\s*([^\n]+))?/i,
  },
  ru: {
    intelligence: /интеллект:\s*([^\n]*?)(?=\s+восприятие:|$)/i,
    perception: /восприятие:\s*([^\n]*?)(?=\s+(?:реакция|отношение|нрав):|$)/i,
    disposition: /(?:реакция|отношение|нрав):\s*([^\n]*?)(?=\s+(?:загрязн\S*|шрамы\S*|скверна):|$)/i,
    impurity: /(?:загрязн\S*|шрамы\S*|скверна):\s*(\d+)/i,
    language: /язык\S*:\s*([^\n]*?)(?=\s+(?:среда обитания|ареал|место обитания):|$)/i,
    habitat: /(?:среда обитания|ареал|место обитания):\s*([^\n]*)/i,
    rep: /(?:известность|репутация)\s*\/\s*слаб\S*(?:\s*место)?:\s*(\d+)\s*\/\s*(\d+)/i,
    weak: /(?:слаб\S*\s*место|слабость|уязвимост\S*):\s*(?!\s*\d+\s*\/)([^\n]*?)(?=\s+инициатив\S*:|$)/im,
    initiative: /инициатив\S*:\s*(\d+)/i,
    move: /(?:скорость\s*передвижения|передвижение|скорость):\s*([^\s]+(?:\s*\([^)]*\))?)/i,
    vit: /стойкость:\s*(\d+)\s*\(\s*(\d+)\s*\)/i,
    mnd: /воля:\s*(\d+)\s*\(\s*(\d+)\s*\)/i,
    level: /^\s*(?:ур(?:овень|\.)?\s*)?(\d{1,2})(?:\s*\+|\s*[-–]\s*\d+)?\s+(\S.*)$/i,
    skillsStart: /^\s*уникальные\s*умения\s*$/i,
    lootStart: /^\s*(?:трофеи|добыча)\s*$/i,
    none: /^\s*(?:нет|отсутствуют?)\.?\s*$/i,
    sections: /секци[ия]:\s*(\d+)(?:\s*\(([^)]*)\))?(?:.*основная:\s*([^\n)]+))?/i,
  },
  // ja: TODO — Japanese books (レベル / 知能 / 知覚 / 反応 / 穢れ / 言語 / 生息地 / 知名度/弱点値 / 弱点 / 先制値 / 移動速度 / 生命抵抗力 / 精神抵抗力 / 部位数).
  //     Waiting for sample pages from the user.
};

const RESIST_WORDS = [
  [/fortitude|vitality|стойкост|生命抵抗/i, "Vitres"],
  [/willpower|mental|воля|воли|精神抵抗/i, "Mndres"],
  [/evasion|dodge|уклон|回避/i, "Dodge"],
];
const RESULT_WORDS = [
  [/half|половин|半減/i, "halving"],
  [/can'?t|cannot|impossible|невозможн|不可/i, "decide"],
  [/optional|any|на выбор|по желани|任意/i, "any"],
  [/neg|отриц|消滅/i, "none"],
  [/short|сокращ|短縮/i, "shortening"],
  [/半減/i, "halving"], [/消滅/i, "none"], [/不可/i, "decide"], [/任意/i, "any"],
  [/disappear|снима|消滅/i, "disappear"],
];
const pick = (table, s) => (table.find(([re]) => re.test(s)) ?? [])[1] ?? "";

/* ------------------------------------------------------------------ *
 *  Parser
 * ------------------------------------------------------------------ */
export function detectLang(text) {
  if (/[぀-ヿ一-鿿]{4,}/.test(text) && /レベル|知能|生命抵抗/.test(text)) return "ja";
  if (/[а-яё]{4,}/i.test(text)) return "ru";
  return "en";
}

/** Guess shape/damage from an ability's free text. Best effort — the GM reviews it. */
export function guessAbility(a) {
  const t = a.text;
  const sh = { kind: "", radius: 0, max: 0, range: 0, self: false };
  const radius = t.match(/(?:radius|радиус[\p{L}]*|半径)\s*(\d+)\s*(?:m|м|ｍ)/iu);
  const line = /(?<![\p{L}])(?:line|лини[яиею])(?![\p{L}])|貫通/iu.test(t);
  if (radius || line) {
    sh.kind = line && !radius ? "line" : "area";
    sh.radius = radius ? num(radius[1]) : 0;
    const mx = t.match(/\(\s*(?:radius|радиус)[^)]*\)\s*\/\s*(\d+)/i);
    const mxj = t.match(/半径\s*\d+\s*[mｍ]\s*[／/]\s*(\d+)/);
    sh.max = mx ? num(mx[1]) : mxj ? num(mxj[1]) : 0;
    const rg = t.match(/range[^:]*:\s*(\d+)\s*\((\d+)\s*m\)|дальность[^:]*:\s*(\d+)\s*\((\d+)\s*м\)/i);
    sh.range = rg ? num(rg[2] ?? rg[4]) : 0;
    sh.self = /around (?:itself|self|the caster)|range[^:]*:\s*caster|вокруг себя|дальность[^:]*:\s*заклинатель/i.test(t) || /射程\s*[／/]\s*形状\s*[:：]\s*自身/.test(t);
  }
  // magical damage only when the text says so («魔法ダメージ», «magic damage», «магический урон», a spell power, a curse); «魔法の武器として…» is just a weapon note
  const mag = /魔力\s*\d|魔法ダメージ|魔法による|呪い|magic(?:al)?\s+(?:damage|power)|curse|магическ[\p{L}]*\s+урон|мощност[\p{L}]*\s*магии|проклят/iu.test(t) ? "md" : "pd";
  let dmg = null;
  const d = t.match(/(\d+)d6?\s*([+-]\s*\d+)?\s*(?:points?\s+of\s+)?(?:[a-zа-я]+\s+){0,3}?(?:damage|урон|ダメージ)/i);
  const dj = t.match(/(\d+)d\s*([+-]\s*\d+)?\s*[」』)]?\s*点[^。]{0,14}?ダメージ/);
  const fj = t.match(/(\d+)\s*点の[^。]{0,14}?ダメージ/);
  if (d) dmg = { dice: true, mod: num((d[2] || "0").replace(/\s/g, "")) };
  else if (dj) dmg = { dice: true, mod: num((dj[2] || "0").replace(/\s/g, "")) };
  else if (fj) dmg = { dice: false, flat: num(fj[1]) };
  else {
    const f = t.match(/(\d+)\s*(?:points?\s+of\s+)?(?:[a-zа-я]+\s+){0,3}?(?:damage|урон)/i);
    if (f) dmg = { dice: false, flat: num(f[1]) };
  }
  return { shape: sh, dmgType: mag, dmg };
}

/** «Wind type damage +3 points» / «Магический урон +2» -> {weakKind, weakValue}. */
export function guessWeakness(t) {
  const v = num((String(t).match(/\+?\s*(\d+)/) ?? [])[1]);
  const table = [
    [/wind|ветр|風/i, "wind"], [/fire|flame|огн|пламен|炎/i, "fire"], [/earth|земл|土|地/i, "earth"], [/ice|water|frost|cold|лёд|лед|вод|холод|水|氷/i, "ice"],
    [/thunder|lightning|electric|молни|雷/i, "thunder"], [/energy|энерг|エネルギー/i, "energy"], [/magic|магическ|魔法/i, "magic"], [/physical|физическ|bludgeon|slash|pierc|物理/i, "physical"],
  ];
  const k = (table.find(([re]) => re.test(t)) ?? [])[1] ?? "";
  return { weakKind: k, weakValue: k ? v : 0 };
}

/** Weakness choices: key -> [label, decay path]. Effect is created DISABLED; monster knowledge turns it on. */
const WEAK_OPTS = [["", "— нет / только текстом —"], ["magic", "Магический урон (любой) +N"], ["physical", "Физический урон (любой) +N"],
  ["fire", "Огонь +N"], ["ice", "Лёд/Вода +N"], ["wind", "Ветер +N"], ["earth", "Земля +N"], ["thunder", "Молния +N"], ["energy", "Энергия +N"]];
const WEAK_LABEL = { magic: "Магический урон", physical: "Физический урон", fire: "Огонь", ice: "Лёд/Вода", wind: "Ветер", earth: "Земля", thunder: "Молния", energy: "Энергия" };
function weaknessEffect(m) {
  if (!m.weakKind || !num(m.weakValue)) return null;
  const k = m.weakKind, n = num(m.weakValue);
  // keys as in config.mjs / damagesupport.calcDamage: «…decay.<magic|physical>.flat» (whole category) and «…decay.<cat>.element.magic.<elem>» (an element hits both categories)
  const keys = k === "magic" || k === "physical" ? [`system.attributes.decay.${k}.flat`]
    : [`system.attributes.decay.magic.element.magic.${k}`, `system.attributes.decay.physical.element.magic.${k}`];
  return { name: `${tr("Слабое место")}: ${tr(WEAK_LABEL[k])} +${n}`, icon: "icons/svg/downgrade.svg", disabled: true, transfer: false, changes: keys.map((key) => ({ key, mode: 2, value: String(-n) })) };
}

/** Text pasted from a two-column layout -> left column first, then the right one. */
export function unColumn(lines) {
  const cut = (l) => { const m = l.match(/\S\s{3,}(?=\S)/); return m ? m.index + m[0].length : -1; };
  const cuts = lines.map(cut).filter((x) => x > 0).sort((a, b) => a - b);
  if (cuts.length < 2) return lines;
  const bound = cuts[Math.floor(cuts.length / 2)];
  const left = [], right = [];
  for (const l of lines) {
    const c = cut(l);
    if (c > 0 && Math.abs(c - bound) <= 6) { left.push(l.slice(0, c).trim()); right.push(l.slice(c).trim()); }
    else if (l.trim() && l.search(/\S/) >= bound - 4) right.push(l.trim());
    else left.push(l.trim());
  }
  return [...left, ...right];
}

/** Spellcasting lines («Divine Magic Level 10 / Magic Power 15(22)», «神聖魔法9レベル/魔力11(18)») are not abilities:
 *  they switch on «Использует заклинания» and are kept as text in the GM info — the same way the world's other casters are stored. */
const MAGIC_RE = /(魔力\s*\d+|magic\s*power\s*\d+|мощност[\p{L}]*\s*магии\s*\d+|мощь\s*магии\s*\d+)/iu;
export function extractMagic(m) {
  m.magic = m.magic ?? [];
  m.abilities = m.abilities.filter((a) => {
    const head = `${a.head ?? ""} ${a.name}`;
    if (!MAGIC_RE.test(head)) return true;
    if (!magicData(a.head || a.name, a.text ?? "")) return true;   // «魔力N» without a known school (a breath, a rider) stays a normal ability
    const hd = ja.magicLine(a.head || a.name) ?? String(a.head || a.name).replace(/\s+/g, " ").trim();
    const txt = ja.elementsSentence(a.text ?? "") ?? a.text;
    m.magic.push(`${hd}${txt ? " — " + txt : ""}`);
    const md = magicData(a.head || a.name, a.text ?? "");
    if (md) (m.magicItems ??= []).push({ name: hd.replace(/\s*—.*$/, "").trim(), data: md, text: a.text ?? "" });
    return false;
  });
  if (m.magic.length) m.usespell = true;
  return m;
}

export function parseStatBlock(raw, lang, opts = {}) {
  lang = lang && L[lang] ? lang : detectLang(raw);
  const D = L[lang] ?? L.en;
  const text = String(raw).replace(/\r/g, "").replace(/ /g, " ");
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
  const out = {
    lang, warnings: [],
    name: "", level: 1, intelligence: "", perception: "", disposition: "", impurity: 0, language: "", habitat: "",
    popularity: 0, weakpoint: 0, weakness: "", weakKind: "", weakValue: 0, initiative: 0, move: "", vit: 0, mnd: 0,
    rows: [], coreName: "", abilities: [], loot: "", description: "",
  };
  const g = (re, i = 1) => (text.match(re) ?? [])[i]?.trim() ?? "";

  // level + name: the line right above «Intelligence:»
  const ii = lines.findIndex((l) => D.intelligence.test(l));
  for (let k = ii - 1; k >= Math.max(0, ii - 3); k--) {
    const m = lines[k]?.match(D.level);
    if (m && !/\d{3,}/.test(lines[k])) { out.level = num(m[1], 1); out.name = m[2].trim(); break; }
  }
  if (!out.name) out.warnings.push("Не нашёл строку «Уровень + Название» — введи вручную");
  out.intelligence = g(D.intelligence); out.perception = g(D.perception); out.disposition = g(D.disposition);
  out.impurity = num(g(D.impurity));
  out.language = g(D.language); out.habitat = g(D.habitat);
  const rep = text.match(D.rep); if (rep) { out.popularity = num(rep[1]); out.weakpoint = num(rep[2]); }
  out.weakness = g(D.weak);
  Object.assign(out, guessWeakness(out.weakness));
  out.initiative = num(g(D.initiative)); out.move = g(D.move);
  const vit = text.match(D.vit); if (vit) out.vit = num(vit[1]);
  const mnd = text.match(D.mnd); if (mnd) out.mnd = num(mnd[1]);
  if (!vit || !mnd) out.warnings.push("Стойкость/Воля не найдены");

  // combat table rows: [name] hit(fix) dmg dodge(fix) def hp mp
  const rowRe = /^\s*(.*?)\s*(\d+)\s*\(\s*(\d+)\s*\)\s+(\d+d\s*[+\-−–]?\s*\d*|\d+d)\s+(\d+)\s*\(\s*(\d+)\s*\)\s+(\d+)\s+(\d+)\s+(\d+|-|—)\s*$/i;
  const secLine = text.match(D.sections);
  for (const l of lines) {
    const m = l.match(rowRe);
    if (!m) continue;
    const dm = m[4].replace(/\s|−|–/g, (c) => (c === " " ? "" : "-")).match(/^(\d+)d([+-]\d+)?$/i);
    out.rows.push({
      name: m[1].trim() || tr("Оружие"), hit: num(m[2]), dmgMod: dm ? num(dm[2] ?? 0) : 0,
      dodge: num(m[5]), pp: num(m[7]), hp: num(m[8]), mp: num(m[9], 0),
    });
  }
  if (!out.rows.length) out.warnings.push("Строка таблицы «Точн./Урон/Уклон./Защ./ОЖ/ОМ» не распознана — заполни ниже");
  if (secLine) out.coreName = (secLine[3] ?? "").trim();

  // unique skills: from «Unique Skills» header to «Loot» header
  const s0 = lines.findIndex((l) => D.skillsStart.test(l));
  const s1 = lines.findIndex((l, i) => i > s0 && D.lootStart.test(l));
  if (s0 >= 0) {
    const rawBody = lines.slice(s0 + 1, s1 > s0 ? s1 : undefined);
    const body = opts.ordered ? rawBody.filter((l) => l.trim()) : unColumn(rawBody);
    // [2026-10-08] a header whose save part wrapped onto the next line:
    // «►Дыхание света / 11(18) / Стойкость / По-» + «ловина», «… / Стой-» + «кость / Отриц.», «… / Стойкость /» + «Отриц.»
    const HEAD = /^\s*[►▶◯○🗨●💬≫△]+/u, CHECK = /\/\s*\d+\s*\(\s*\d+\s*\)/;
    for (let k = 0; k < body.length - 1; k++) {
      for (let pass = 0; pass < 2; pass++) {
        const cur = body[k], next = body[k + 1];
        if (next === undefined || !HEAD.test(cur) || !CHECK.test(cur) || HEAD.test(next)) break;
        const parts = cur.split("/").map((x) => x.trim());
        const hyph = /[-‐­]\s*$/.test(cur), open = /\/\s*$/.test(cur);
        const short = next.trim().length <= 40;
        // the continuation is «/ …», a lowercase word part, or a short save word on its own
        const looksSave = /^\s*(?:\/|[a-zа-яё])/u.test(next) ||
          (next.trim().length <= 20 && [...RESIST_WORDS, ...RESULT_WORDS].some(([re]) => re.test(next)));
        if (!(hyph || open || (parts.length < 4 && short && looksSave))) break;
        body[k] = hyph ? cur.replace(/[-‐­]\s*$/, "") + next.trim() : `${cur.trim()} ${next.trim()}`;
        body.splice(k + 1, 1);
        if (body[k].split("/").length >= 4 && !/[-‐­/]\s*$/.test(body[k])) break;
      }
    }
    // a header whose name wrapped onto the next line: «►Hammer Throw & Pull» + «Back/5(12)/Evasion/Neg»
    for (let k = 0; k < body.length - 1; k++) {
      if (/^\s*[►▶◯○🗨●💬]+/u.test(body[k]) && !body[k].includes("/") && !/^\s*[►▶◯○🗨●💬]/u.test(body[k + 1]) && /^\s*[^\s/][^/]{0,25}\/(\d+\s*\(\d+\)|can.?t|optional)/i.test(body[k + 1])) {
        body[k] = `${body[k].trim()} ${body[k + 1].trim()}`; body.splice(k + 1, 1);
      }
    }
    let cur = null, section = "";
    const flush = () => {
      if (cur) {
        cur.text = cur.text.replace(/\s+/g, " ").trim();
        // a bare marker line («►» + the text below): name it after the start of its text
        if (!cur.name) cur.name = cur.text.replace(/[[\]]/g, "").slice(0, 40).trim() || "—";
        // «◯Poison Immunity» needs no description of its own
        if (!cur.text && /иммунитет|immunity|無効/i.test(cur.name)) cur.text = cur.name;
        Object.assign(cur, guessAbility(cur)); out.abilities.push(cur);
      }
      cur = null;
    };
    // markers inside a name («◯Poison Immunity, ◯Disease Immunity», «Mechanical Body ◯», «◯ ►Magic»): drop them
    const cleanName = (n) => n.replace(/^\[|\]$/g, "").replace(/[►▶◯○≫△🗨💬]/gu, " ").replace(/\s+/g, " ").replace(/[\s,]+$/, "").trim();
    for (const raw2 of body) {
      const l = raw2.trim();
      if (!l || D.none.test(l)) continue;
      const sec = l.match(/^●\s*(.+)$/);
      if (sec) { flush(); section = sec[1].trim(); continue; }
      // the name of the previous header wrapped with a hyphen: «◯Иммунитет к бо-» + «лезням …»
      if (cur && !cur.text && !cur.head.includes("/") && /\p{L}[-‐­]$/u.test(cur.name)) {
        const w = l.match(/^(\p{Ll}+)[,.]?\s*(.*)$/u);
        if (w) { cur.name = cur.name.replace(/[-‐­]$/, "") + w[1]; if (w[2]) cur.text = w[2]; continue; }
      }
      const h = l.match(/^((?:[►▶◯○🗨●💬≫△]\s*)+)(.*)$/u);
      if (h) {
        flush();
        const kind = /[►▶]/u.test(h[1]) ? "main" : /[≫»]/u.test(h[1]) ? "aux" : /[△]/u.test(h[1]) ? "prep" : /[◯○]/u.test(h[1]) ? "constant" : /[🗨💬□]/u.test(h[1]) ? "decla" : "main";
        const parts = h[2].split("/").map((x) => x.trim());
        cur = { name: cleanName(parts[0]), head: h[2], kind, section, text: "", check: 0, resist: "", result: "" };
        const chk = parts[1]?.match(/^(\d+)\s*\(\s*(\d+)\s*\)$/);
        if (chk) { cur.check = num(chk[1]); cur.resist = pick(RESIST_WORDS, parts[2] ?? ""); cur.result = pick(RESULT_WORDS, parts[3] ?? ""); }
        else if (/can'?t|невозможн/i.test(parts[1] ?? "")) { cur.result = "decide"; }
        const rest = h[2].split("/").slice(chk ? 4 : 2).join("/").trim();
        if (rest) cur.text = rest;
      } else if (cur) cur.text += " " + l;
    }
    flush();
  } else out.warnings.push("Блок «Unique Skills / Уникальные умения» не найден");
  if (s1 >= 0) out.loot = lines.slice(s1 + 1).filter((l) => l.trim()).join("\n");
  out.description = "";
  extractMagic(out);
  if (out.abilities.some((a) => a.text.length < 4)) out.warnings.push("У части способностей пустое описание — столбцы текста могли перемешаться, проверь тексты");
  return out;
}

/* ------------------------------------------------------------------ *
 *  Ability templates for the constructor
 * ------------------------------------------------------------------ */
const blankAbility = (o = {}) => ({
  name: "Новая способность", kind: "main", section: "", text: "", check: 0, resist: "", result: "",
  shape: { kind: "", radius: 0, max: 0, range: 0, self: false }, dmgType: "pd", dmg: null, ...o,
});
const localAbility = (o = {}) => { const a = blankAbility(o); a.name = tr(a.name); a.text = tr(a.text); return a; };
export const TEMPLATES = {
  melee: { label: "Особая атака (Уклонение)", make: () => localAbility({ name: "Особая атака", check: 0, resist: "Dodge", result: "none", dmg: { dice: true, mod: 0 }, text: "Атака с проверкой Уклонения; при уклонении — промах." }) },
  save: { label: "Удар со спасброском (Стойкость, половина)", make: () => localAbility({ name: "Удар", check: 10, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 0 }, dmgType: "md", text: "Одна цель. Спасбросок Стойкости: при успехе половина урона." }) },
  willsave: { label: "Ментальное (Воля, отрицает)", make: () => localAbility({ name: "Взгляд", check: 10, resist: "Mndres", result: "none", text: "Цель делает спасбросок Воли; при успехе эффект отсутствует. Статус навешивается вручную." }) },
  aoe: { label: "Область вокруг себя", make: () => localAbility({ name: "Взрыв", check: 10, resist: "Vitres", result: "halving", dmgType: "md", dmg: { dice: true, mod: 0 }, text: "Область радиусом 6 м вокруг себя. Каждая цель в области делает спасбросок Стойкости; при успехе получает половину урона.", shape: { kind: "area", radius: 6, max: 20, range: 0, self: true } }) },
  point: { label: "Область в точке (выбор на карте)", make: () => localAbility({ name: "Огненный шар", check: 10, resist: "Vitres", result: "halving", dmgType: "md", dmg: { dice: true, mod: 0 }, text: "Область радиусом 3 м в выбранной точке (дальность 20 м). Каждая цель делает спасбросок Стойкости; при успехе — половина урона.", shape: { kind: "area", radius: 3, max: 10, range: 20, self: false } }) },
  line: { label: "Линия", make: () => localAbility({ name: "Луч", check: 10, resist: "Vitres", result: "halving", dmgType: "md", dmg: { dice: true, mod: 0 }, text: "Линия длиной 20 м. Каждая цель на линии делает спасбросок Стойкости; при успехе — половина урона.", shape: { kind: "line", radius: 0, max: 0, range: 20, self: false } }) },
  passive: { label: "Постоянная (◯, текст)", make: () => localAbility({ name: "Пассивка", kind: "constant" }) },
  buff: { label: "Самоусиление (текст)", make: () => localAbility({ name: "Усиление", kind: "main", text: "Накладывается вручную на N раундов." }) },
  regen: { label: "Регенерация (текст)", make: () => localAbility({ name: "Регенерация", kind: "constant", text: "В начале хода монстр восстанавливает N ОЖ (вручную)." }) },
  blank: { label: "Пустая", make: () => localAbility() },
};

/* ------------------------------------------------------------------ *
 *  Actor creation
 * ------------------------------------------------------------------ */
const T = () => ({
  res: game.i18n.localize("SW25.Config.MonRes"), vit: game.i18n.localize("SW25.Config.MonResVit"), mnd: game.i18n.localize("SW25.Config.MonResMnd"),
  wp: game.i18n.localize("SW25.Config.MonWp"), hit: game.i18n.localize("SW25.Config.MonHit"), dmg: game.i18n.localize("SW25.Config.MonDmg"), dge: game.i18n.localize("SW25.Config.MonDge"),
});

function weaponItem(t, name, row) {
  return {
    name, type: "monsterability",
    system: {
      description: "", usedice1: true, label1: t.hit, usefix1: true, applycheck1: "-", checkbasemod1: row.hit,
      usedice2: true, label2: t.dmg, usefix2: false, applycheck2: "on", checkbasemod2: row.dmgMod,
      usedice3: true, label3: t.dge, usefix3: true, applycheck3: "-", checkbasemod3: row.dodge,
    },
  };
}

function abilityItem(a) {
  const ks = new Set(a.kinds?.length ? a.kinds : [a.kind]);
  const sys = { description: "", overview: a.text, remark: "", constant: ks.has("constant"), main: ks.has("main"), aux: ks.has("aux"), prep: ks.has("prep"), decla: ks.has("decla") };
  const flags = { sw25: { generated: "r91" } };
  if (a.resist && a.result && a.check !== "") {
    sys.usedice1 = true; sys.label1 = tr("Бросок"); sys.usefix1 = true; sys.checkbasemod1 = num(a.check);
    sys.dice1 = { resist: { type: a.resist, result: a.result } };
  }
  if (a.dmg) {
    sys.usedice2 = true; sys.label2 = tr("Урон"); sys.usefix2 = false; sys.applycheck2 = "on";
    if (a.dmg.dice) sys.checkbasemod2 = num(a.dmg.mod);
    else { sys.customdice2 = true; sys.customformula2 = String(num(a.dmg.flat)); }
    if (!sys.usedice1) { sys.usedice1 = true; sys.label1 = tr("Бросок"); sys.usefix1 = true; sys.checkbasemod1 = num(a.check); }
  }
  if (a.sectionId) flags.sw25.section = a.sectionId;
  if (a.shape?.kind) flags.sw25.shape = { ...a.shape };
  if (a.dmg && a.dmgType === "md") flags.sw25.dmgType = "md";
  return { name: a.name, type: "monsterability", system: sys, flags };
}

export async function createMonster(m, { open = true, folder = null, pack = null } = {}) {
  const t = T();
  const rows = m.rows.length ? m.rows : [{ name: "", hit: 0, dmgMod: 0, dodge: 0, pp: 0, hp: 1, mp: 0 }];
  const multi = rows.length > 1;
  const core = (multi && m.coreName && rows.find((r) => r.name.toLowerCase().includes(m.coreName.toLowerCase()))) || rows[0];
  const items = [];
  items.push({
    name: t.res, type: "monsterability",
    system: { description: "", usedice1: true, label1: t.vit, usefix1: true, applycheck1: "-", checkbasemod1: num(m.vit), usedice2: true, label2: t.mnd, usefix2: true, applycheck2: "-", checkbasemod2: num(m.mnd) },
  });
  rows.forEach((r, i) => {
    const w = weaponItem(t, multi ? `${t.wp} (${r.name || i + 1})` : t.wp, r);
    if (multi) w.flags = { sw25: { section: `s${i}` } };   // explicit binding: the name suffix breaks on names with brackets
    items.push(w);
  });
  for (const mi of m.magicItems ?? []) {
    items.push({ name: mi.name, type: "monsterability", system: { description: "", overview: mi.text, remark: "", main: true }, flags: { sw25: { generated: "r91", magic: mi.data } } });
  }
  m.abilities.forEach((a) => {
    if (multi && a.section) {
      const sec = String(a.section).toLowerCase().trim(), names = rows.map((r) => String(r.name).toLowerCase().trim());
      let hit = names.map((n, k) => [n, k]).filter(([n]) => n === sec);   // exact name first, then a unique substring either way
      if (hit.length !== 1) hit = names.map((n, k) => [n, k]).filter(([n]) => n && sec && (n.includes(sec) || sec.includes(n)));
      if (hit.length === 1) a = { ...a, sectionId: `s${hit[0][1]}` };
    }
    items.push(abilityItem(a));
  });

  const gm = [];
  gm.push(`<p><b>${esc(m.name)}</b> — ${L2("ур.", "lv.")} ${num(m.level, 1)}</p>`);
  if (m.description) gm.push(`<p>${esc(m.description).replace(/\n/g, "<br>")}</p>`);
  if (m.magic?.length) gm.push(`<h3>${tr("Магия")}</h3><p>${m.magic.map((x) => esc(x)).join("<br>")}</p>`);
  if (m.loot) gm.push(`<h3>${tr("Трофеи")}</h3><p>${esc(m.loot).replace(/\n/g, "<br>")}</p>`);

  const data = {
    name: m.name || tr("Новый монстр"), type: "monster", img: "icons/svg/mystery-man.svg",
    system: {
      classType: m.classType || "Other", monlevel: num(m.level, 1), intelligence: m.intelligence, perception: m.perception, reaction: m.disposition,
      impurity: num(m.impurity), language: m.language, habitat: m.habitat, popularity: num(m.popularity), weakpoint: num(m.weakpoint),
      weakness: m.weakness, preemptive: num(m.initiative), move: m.move,
      hpbase: core.hp, mpbase: core.mp, ppbase: core.pp, mppbase: 0,
      hp: { value: core.hp, max: core.hp }, mp: { value: core.mp, max: core.mp },
      part: multi ? String(rows.length) : 0, gminfo: gm.join(""), loot: m.loot, usespell: !!m.usespell,
    },
    items,
    flags: { sw25: { generated: "r91" } },
  };
  const we = weaknessEffect(m);
  if (we) data.effects = [we];
  if (multi) {
    const secs = rows.map((r, k) => ({
      id: `s${k}`, name: (r.name || `${tr("Секция")} ${k + 1}`).replace(/^\w/, (c) => c.toUpperCase()), core: r === core,
      hp: { value: r.hp, max: r.hp }, mp: { value: r.mp, max: r.mp }, hit: r.hit, dmg: `2d${r.dmgMod >= 0 ? "+" : ""}${r.dmgMod}`, dodge: r.dodge, pp: r.pp, down: false,
    }));
    data.flags.sw25.sections = secs;
    data.flags.sw25.activeSection = secs.find((s) => s.core).id;
  }
  // [Round 97] monsters are filed by class: Monsters / Undead, Monsters / Animals …
  if (folder) data.folder = folder;
  if (!data.folder && !pack) {
    try {
      const { ensureFolder } = await import("./itembuilder.mjs");
      const cls = CLASS_OPTS.find(([k]) => k === (data.system?.classType || "Other"))?.[1] ?? "Прочее";
      data.folder = (await ensureFolder("Actor", [L2("Монстры", "Monsters"), tr(cls)]))?.id ?? null;
    } catch (err) { console.warn("SW25 | monster folder:", err); }
  }
  // [2026-10-09] `pack`: create straight into a compendium (its folder id comes in `folder`)
  const actor = await Actor.create(data, pack ? { pack } : {});
  // verify the R89 data model survived (dice1.resist is read by castMonsterAbility)
  const need = m.abilities.filter((a) => a.resist && a.result).length;
  if (need) {
    const bad = actor.items.filter((i) => i.flags?.sw25?.generated === "r91" && i.system.usedice1 && !i.system.dice1?.resist && m.abilities.find((a) => a.name === i.name)?.resist);
    if (bad.length) notify.warn(L2(`Генератор: у ${bad.length} способностей не сохранилась схема сопротивления (dice1.resist) — сообщи разработчику.`, `Generator: ${bad.length} abilities lost the save schema (dice1.resist) — please report it.`));
  }
  if (open && !pack) actor.sheet?.render(true);
  return actor;
}

/* ------------------------------------------------------------------ *
 *  UI
 * ------------------------------------------------------------------ */
const FIELDS = [
  ["name", "Название", "text"], ["level", "Уровень", "number"], ["initiative", "Инициатива", "number"], ["move", "Скорость", "text"],
  ["intelligence", "Интеллект", "text"], ["perception", "Восприятие", "text"], ["disposition", "Реакция", "text"], ["impurity", "Загрязнение", "number"],
  ["language", "Язык", "text"], ["habitat", "Среда обитания", "text"], ["popularity", "Известность", "number"], ["weakpoint", "Слабое место (порог)", "number"],
  ["weakness", "Слабое место (текст)", "text"], ["vit", "Стойкость (бонус)", "number"], ["mnd", "Воля (бонус)", "number"], ["coreName", "Основная секция", "text"],
];
const CLASS_OPTS = [["Barbarous", "Варвары"], ["Animal", "Животные"], ["Plant", "Растения"], ["Undead", "Нежить"], ["MagicCreature", "Конструкты"], ["Machine", "Магитехи"],
  ["Eidolon", "Мифозвери"], ["Fairie", "Феи"], ["Daemon", "Демоны"], ["Human", "Гуманоиды"], ["Other", "Прочее"]];
const YT_CLASS = { "蛮族": "Barbarous", "動物": "Animal", "植物": "Plant", "アンデッド": "Undead", "魔法生物": "MagicCreature", "魔動機": "Machine", "幻獣": "Eidolon", "妖精": "Fairie", "魔神": "Daemon", "人族": "Human", "その他": "Other" };
const RES_OPTS = [["", "— без броска —"], ["Vitres", "Стойкость"], ["Mndres", "Воля"], ["Dodge", "Уклонение"]];
const RESULT_OPTS = [["", "—"], ["halving", "Половина"], ["none", "Отриц."], ["decide", "Невозможно"], ["any", "На выбор"], ["shortening", "Сокращ."], ["disappear", "Снимается"]];
const KIND_OPTS = [["main", "► основное"], ["aux", "≫ вспомогательное"], ["prep", "△ подготовка"], ["constant", "◯ постоянное"], ["decla", "🗨 заявляемое"]];
const SHAPE_OPTS = [["", "цель(и)"], ["area", "область"], ["line", "линия"]];
const sel = (opts, v) => opts.map(([k, l]) => `<option value="${k}"${k === v ? " selected" : ""}>${l}</option>`).join("");

function abilityRow(a, i) {
  const dm = a.dmg;
  return `<fieldset class="mg-ab" data-i="${i}" style="margin:4px 0;padding:4px 6px;border:1px solid #8886">
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
      <input data-a="name" value="${esc(a.name)}" style="flex:2;min-width:140px" data-ph="Название">
      <select data-a="kind">${sel(KIND_OPTS, a.kind)}</select>
      <input data-a="section" value="${esc(a.section)}" data-ph="секция" style="width:80px" title="секция (для многочастных)">
      <button type="button" data-del="${i}" title="Удалить">✕</button>
    </div>
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:3px">
      Бросок <input data-a="check" type="number" value="${a.check}" style="width:48px">
      <select data-a="resist">${sel(RES_OPTS, a.resist)}</select>
      <select data-a="result">${sel(RESULT_OPTS, a.result ?? "")}</select>
      Урон <select data-a="dmgk"><option value=""${!dm ? " selected" : ""}>нет</option><option value="dice"${dm?.dice ? " selected" : ""}>2d+N</option><option value="flat"${dm && !dm.dice ? " selected" : ""}>фикс.</option></select>
      <input data-a="dmgv" type="number" value="${dm ? (dm.dice ? dm.mod : dm.flat) : 0}" style="width:48px">
      <select data-a="dmgType"><option value="pd"${a.dmgType !== "md" ? " selected" : ""}>физ.</option><option value="md"${a.dmgType === "md" ? " selected" : ""}>маг.</option></select>
    </div>
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:3px">
      <select data-a="shape.kind">${sel(SHAPE_OPTS, a.shape?.kind ?? "")}</select>
      радиус <input data-a="shape.radius" type="number" value="${a.shape?.radius ?? 0}" style="width:44px">
      макс. целей <input data-a="shape.max" type="number" value="${a.shape?.max ?? 0}" style="width:44px">
      дальность <input data-a="shape.range" type="number" value="${a.shape?.range ?? 0}" style="width:44px">
      <label><input data-a="shape.self" type="checkbox"${a.shape?.self ? " checked" : ""}> вокруг себя</label>
    </div>
    <textarea data-a="text" rows="2" style="width:100%;margin-top:3px" data-ph="Описание">${esc(a.text)}</textarea>
  </fieldset>`;
}

function rowRow(r, i) {
  const c = (k, w = 52) => `<input data-r="${k}" type="${k === "name" ? "text" : "number"}" value="${esc(r[k])}" style="width:${w}px">`;
  return `<tr data-i="${i}"><td>${c("name", 110)}</td><td>${c("hit")}</td><td>${c("dmgMod")}</td><td>${c("dodge")}</td><td>${c("pp")}</td><td>${c("hp")}</td><td>${c("mp")}</td><td><button type="button" data-delrow="${i}">✕</button></td></tr>`;
}


/* ------------------------------------------------------------------ *
 *  ytsheet (yutorize.work/ytsheet/sw2.5) JSON -> monster. Structured data, no text parsing needed.
 *  The GM exports "JSON出力" of a monster sheet and drops/pastes it into the importer.
 * ------------------------------------------------------------------ */
const unesc = (t) => String(t ?? "").replace(/&lt;br&gt;|<br\s*\/?>/gi, "\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const digits = (v, d = 0) => {   // first integer in the value («20×3» -> 20, «1,200» -> 1200), not all digits glued together
  const t = String(v ?? "").normalize("NFKC").replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/[−―ー–]/g, "-");
  const x = t.match(/-?\d+/); const n = x ? parseInt(x[0], 10) : NaN;
  return Number.isFinite(n) ? n : d;
};

export function isYtsheet(o) { return o && typeof o === "object" && ("monsterName" in o || ("lv" in o && "statusNum" in o)); }

/** ytsheet «skills» text -> one chunk per ability (two layouts: «***Name» headings, or blank-line separated paragraphs; links to other sheets are flattened). */
const HEADMARK = /^\s*\**\s*[〇◯○●▶▷►＞>]/;
export function ytSkillChunks(raw) {
  let t = unesc(raw).normalize("NFKC");   // full-width digits / brackets / «＋» -> ASCII
  if (t.includes("***")) {
    const seps = t.match(/\*\*\*/g).length, tagged = (t.match(/\*\*\*\s*[〇◯○●▶▷►＞>]?\s*\[[^\]]{1,3}\]/g) ?? []).length;
    if (tagged * 2 >= seps) {   // «***[常]Name» = ability separator
      const out = [];
      for (const c of t.split("***").map((x) => x.trim()).filter(Boolean)) {
        // a «**part» heading line inside a chunk starts a new (bare) chunk, so it is not swallowed into the previous ability's text
        let cur = [];
        for (const l of c.split("\n")) {
          if (cur.length && /^\s*\*{1,2}[^*\s]/.test(l)) { out.push(cur.join("\n")); cur = []; }
          cur.push(l);
        }
        if (cur.length) out.push(cur.join("\n"));
      }
      return out;
    }
    t = t.replace(/\*{3}/g, "**");                                                          // otherwise «***part» is a body-part heading
  }
  t = t.replace(/\[\[(.+?)>https?:[^\]]*\]\]/g, "$1");
  const HEAD = /^\s*\**\s*(?:[〇◯○●▶▷►>]\s*)?(?:\[[^\]]{1,3}\])+|^\s*\**\s*[〇◯○●▶▷►>]|^\s*\*{1,2}[^*\s]/;
  const chunks = [];
  for (const para of t.split(/\n[ \t]*\n/)) {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let cur = null;
    lines.forEach((l, i) => {
      if (HEAD.test(l) || (i === 0 && !chunks.length)) { cur = [l]; chunks.push(cur); }
      else if (cur) cur.push(l);
      else if (chunks.length) { cur = chunks[chunks.length - 1]; cur.push(l); }   // headless paragraph = continuation of the previous ability
      else { cur = [l]; chunks.push(cur); }
    });
  }
  return chunks.map((c) => c.join("\n"));
}

export function parseYtsheet(o) {
  const m = {
    lang: "ja", warnings: [], source: "ytsheet",
    name: String(o.monsterName ?? o.characterName ?? "").trim(), level: digits(o.lv, 1),
    intelligence: ja.intellect(o.intellect), perception: ja.perception(o.perception), disposition: ja.disposition(o.disposition), impurity: digits(o.sin),
    language: ja.languages(o.language), habitat: ja.habitat(o.habitat), popularity: digits(o.reputation), weakpoint: digits(o["reputation+"]),
    classType: YT_CLASS[String(o.taxa ?? "").trim()] ?? "", weakness: o.weakness ?? "", weakKind: "", weakValue: 0, initiative: digits(o.initiative), move: String(o.mobility ?? "").normalize("NFKC").replace(/─/g, "-").replace(/\(([^)]+)\)/, (x, g) => `(${ja.habitat(g)})`),
    vit: digits(o.vitResist), mnd: digits(o.mndResist), rows: [], coreName: "", abilities: [], loot: "",
    description: unesc(o.description).replace(/\[\[(.+?)>https?:[^\]]*\]\]/g, "$1").replace(/^\[(?:>|---)\]\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim(),
  };
  Object.assign(m, guessWeakness(String(m.weakness).normalize("NFKC")));
  if (m.weakKind) m.weakness = `${tr(WEAK_LABEL[m.weakKind])} +${m.weakValue}`;
  else if (/^(なし|無し|-|―|ー)?$/.test(String(m.weakness).trim())) m.weakness = "—";
  else m.weakness = ja.weakness(m.weakness);
  const n = Math.max(1, digits(o.statusNum, 1));
  const mountLv = digits(o.lvMin) ? digits(o.lv) - digits(o.lvMin) : 0;   // riding beasts: keys «status1-3Hp» for the chosen level
  const K = (i) => (mountLv ? `${i}-${mountLv + 1}` : String(i));
  if (digits(o.lvMin)) { const nz = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== ""); m.vit = digits(nz(o[`status${K(1)}Vit`], o.vitResist)); m.mnd = digits(nz(o[`status${K(1)}Mnd`], o.mndResist)); }
  m.coreName = String(o.coreParts ?? "").trim();
  for (let i = 1; i <= n; i++) {
    const k = K(i);
    if (o[`status${k}Hp`] === undefined && o[`status${k}Accuracy`] === undefined && o[`status${i}Hp`] === undefined) continue;
    const g = (f) => o[`status${k}${f}`] ?? o[`status${i}${f}`];
    const dm = String(g("Damage") ?? "").normalize("NFKC").match(/\d*\s*d\s*\d*\s*([+-]\s*\d+)?/i);   // «2d+8», «2d6+8», «2ｄ＋８»
    m.rows.push({
      name: String(o[`status${i}Style`] ?? "").trim().replace(/^[（(]([^（()）]*)[）)]$/, "$1") || (n > 1 ? `${tr("Секция")} ${i}` : tr("Оружие")),
      hit: digits(g("Accuracy")), dmgMod: dm ? digits((dm[1] ?? "0").replace(/\s/g, "")) : digits(g("Damage")),
      dodge: digits(g("Evasion")), pp: digits(g("Defense")), hp: digits(g("Hp")), mp: digits(g("Mp")),
    });
  }
  if (!m.rows.length) m.warnings.push("В JSON нет строк статуса (status1…)");
  if (n > 1) m.warnings.push(`Секций: ${n} — проверь основную секцию`);

  // abilities: «***[常]Name<br>text***[宣]Name2…» or, when there is no «***», paragraphs separated by a blank line
  const queue = ytSkillChunks(o.skills);
  const TAGLINE = /^\**\s*[〇◯○●▶▷►＞>]?\s*(?:\[[^\]]{1,3}\])+/;
  let curSec = "";
  const splitTop = (s) => { const out = []; let d = 0, b = ""; for (const ch of s) { if ("(（「《〈【".includes(ch)) d++; else if (")）」》〉】".includes(ch)) d = Math.max(0, d - 1); if ((ch === "/" || ch === "／") && !d) { out.push(b); b = ""; } else b += ch; } out.push(b); return out.map((x) => x.trim()); };
  while (queue.length) {
    const c = queue.shift();
    const lines = c.split("\n").map((l) => l.trim()).filter((l, i) => i === 0 || l);
    // multi-part monsters: «●全身» / «**上半身» lines name a body part; abilities below belong to that part
    if (n > 1) {
      const f = lines[0].replace(/^\*+\s*/, "");
      const bare = !TAGLINE.test(lines[0]) && !/[／/]|\d\s*[（(]/.test(f);
      const nextTag = !lines[1] || TAGLINE.test(lines[1]) || HEADMARK.test(lines[1]);
      if (bare && ((/^●/.test(f) && nextTag) || /^\*{1,2}[^*]/.test(lines[0]) || (lines.length > 1 && nextTag && f.length <= 20 && !/[。、：:]/.test(f)))) {
        curSec = f.replace(/^●\s*/, "").trim();
        if (lines.length > 1) queue.unshift(lines.slice(1).join("\n"));
        continue;
      }
    }
    let head = lines[0].replace(/^\*+\s*/, ""); let text = lines.slice(1).join(" ").trim();
    head = head.replace(/^[〇◯○●▶▷►＞>]\s*[□△▽]?\s*/, "").replace(/^[□△▽]\s*/, "");
    const h = head.match(/^((?:\[[^\]]{1,3}\])+)\s*(.*)$/);
    const tags = h ? h[1] : "", rest = (h ? h[2] : head).trim();
    const kinds = [];
    if (/常/.test(tags)) kinds.push("constant");
    if (/主/.test(tags)) kinds.push("main");
    if (/補/.test(tags)) kinds.push("aux");
    if (/[準戦]/.test(tags)) kinds.push("prep");
    if (/宣/.test(tags)) kinds.push("decla");
    if (!kinds.length) kinds.push(/^[▶＞>]/.test(lines[0].replace(/^\*+\s*/, "")) ? "main" : /^≫/.test(lines[0]) ? "aux" : /^△/.test(lines[0]) ? "prep" : /^[□🗨]/.test(lines[0]) ? "decla" : "constant");
    const kind = kinds[0];
    if (!text && rest.length > 16 && !/[\/／]/.test(rest.slice(0, 12))) {   // «[常]Name text on the same line»
      const sp = rest.match(/^(.{2,20}?)(?:[:：]\s*|\s+)(.{8,})$/);
      if (sp) { text = sp[2].trim(); head = head.replace(rest, sp[1]); }
    }
    const rest2 = text && rest.length > 16 && head !== lines[0] ? head.replace(/^((?:\[[^\]]{1,3}\])+)\s*/, "") : rest;
    const parts = splitTop(rest2);
    let base = parts[0].replace(/^\|/, "");
    const ruby = rest.startsWith("|") || /^[^《]+《[^》]+》/.test(base) && rest.startsWith("|");
    const name = (rest.startsWith("|") ? base.replace(/《([^》]+)》/g, " ($1)") : base.replace(/[《》「」]/g, "")).replace(/\s+/g, " ").trim();
    const a = { name, head: rest, kind, kinds, section: curSec, text, check: 0, resist: "", result: "" };
    const chk = rest.match(/(\d+)\s*[（(]\s*(\d+)\s*[）)]/);
    if (chk) { a.check = digits(chk[1]); a.resist = pick(RESIST_WORDS, rest); a.result = pick(RESULT_WORDS, rest); }
    Object.assign(a, guessAbility({ ...a, text: `${rest} ${text}` }));
    m.abilities.push(a);
  }
  extractMagic(m);
  // loot
  const loots = [];
  for (let i = 1; i <= digits(o.lootsNum, 4); i++) {
    const it = o[`loots${i}Item`], nm = o[`loots${i}Num`];
    if (it) loots.push(`${nm === "自動" ? L2("Всегда", "Always") : nm}: ${it}`);
  }
  m.loot = loots.join("\n");
  return m;
}

const YT_BASE = "https://yutorize.work/ytsheet/sw2.5/";
const ytId = (s) => (String(s).match(/[?&]id=([A-Za-z0-9]{4,12})/) ?? String(s).trim().match(/^([A-Za-z0-9]{6})$/) ?? [])[1] ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const blankMonster = () => {
  const m = parseStatBlock("", "ru");
  m.rows = [{ name: "", hit: 0, dmgMod: 0, dodge: 0, pp: 0, hp: 10, mp: 0 }]; m.warnings = []; m.selected = true;
  return m;
};

export async function openMonsterGenerator(opts = {}) {
  if (!game.user.isGM) return notify.warn(L2("Генератор монстров — только для ГМ.", "The monster generator is GM-only."));
  const { DialogV2 } = foundry.applications.api;
  const mons = [blankMonster()];
  let cur = 0;

  const content = `<div class="mg" style="max-height:72vh;overflow:auto;padding-right:6px">
    <div class="mg-nav" style="display:flex;gap:6px;margin-bottom:6px"><button type="button" disabled style="width:auto;font-weight:700"><i class="fa-solid fa-dragon"></i> ${L2("Монстры", "Monsters")}</button><button type="button" class="mg-toitems" style="width:auto"><i class="fa-solid fa-hammer"></i> ${L2("Предметы и заклинания", "Items and spells")}</button></div>
    <details open><summary><b>1. Откуда брать</b> — вставить текст или загрузить JSON-листы ytsheet</summary>
      <div style="display:flex;gap:6px;align-items:center;margin:4px 0;flex-wrap:wrap">
        <b>JSON (ytsheet):</b> <input type="file" class="mg-file" accept=".json,application/json" multiple>
        <span class="mg-info" style="opacity:.8"></span>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start;margin:6px 0;flex-wrap:wrap">
        <b>ytsheet:</b> <textarea class="mg-yt" rows="2" style="flex:1;min-width:260px" data-ph="ссылки или ID листов ytsheet (по одной в строке) — монстры"></textarea>
        <button type="button" class="mg-ytload">Загрузить по ссылкам</button>
        <button type="button" class="mg-ytopen">Открыть ytsheet</button>
      </div>
      <small>Листы читаются по одному, не чаще раза в секунду. Если сайт не разрешит запрос из браузера, открой ссылку с «&amp;mode=json» и вставь JSON в поле ниже.</small>
      <textarea class="mg-text" rows="5" style="width:100%;margin-top:4px" data-ph="...или вставь сюда текст с одним или несколькими монстрами (или JSON с ytsheet)"></textarea>
      <div style="display:flex;gap:6px;align-items:center;margin:4px 0">
        <select class="mg-lang"><option value="">язык: авто</option><option value="ru">русский</option><option value="en">English</option></select>
        <button type="button" class="mg-parse">Разобрать текст</button>
        <span class="mg-warn" style="color:#b55"></span>
      </div></details>
    <details class="mg-listbox" open style="display:none"><summary><b>Найдено монстров:</b> <span class="mg-count"></span></summary>
      <div style="margin:4px 0"><button type="button" class="mg-selall">выбрать всех</button> <button type="button" class="mg-selnone">снять</button> <input class="mg-filter" data-ph="поиск по названию" style="width:160px"></div>
      <div class="mg-list" style="max-height:180px;overflow:auto;border:1px solid #6666;padding:2px"></div></details>
    <details open><summary><b>2. Монстр</b> <span class="mg-curname"></span></summary>
      <div class="mg-fields" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px"></div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap"><b>Класс:</b> <select data-f="classType">${sel(CLASS_OPTS, "Other")}</select> <label><input type="checkbox" data-f="usespell"> Использует заклинания</label> <small class="mg-magic" style="flex-basis:100%"></small> <b>Слабость:</b>
        <select data-f="weakKind">${sel(WEAK_OPTS, "")}</select> +<input data-f="weakValue" type="number" value="0" style="width:48px">
        <small>создаётся выключенный эффект «Слабое место…», включается при опознании монстра. Распознаётся из текста автоматически.</small></div>
      <table style="width:100%;margin-top:6px"><thead><tr><th>Секция / бой. стиль</th><th>Точн.</th><th>Урон +N</th><th>Уклон.</th><th>Защ.</th><th>ОЖ</th><th>ОМ</th><th></th></tr></thead><tbody class="mg-rows"></tbody></table>
      <button type="button" class="mg-addrow">+ секция</button>
      <small> Базовые числа (без скобок). «Урон +N» — это N из «2d+N». Больше одной строки = многочастный монстр.</small></details>
    <details open><summary><b>3. Способности</b></summary>
      <div style="display:flex;gap:6px;margin:4px 0"><select class="mg-tpl">${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select><button type="button" class="mg-addab">+ добавить из шаблона</button></div>
      <div class="mg-abs"></div></details>
    <details><summary><b>4. Описание / трофеи</b></summary>
      <textarea data-f="description" rows="3" style="width:100%" data-ph="Описание (необязательно)"></textarea>
      <textarea data-f="loot" rows="3" style="width:100%" data-ph="Трофеи"></textarea></details>
    <details><summary><b>5. Тексты для перевода (необязательно)</b></summary>
      <small>Названия, описания и тексты способностей можно прогнать через любой переводчик: структура и числа при этом не затрагиваются.</small>
      <div style="display:flex;gap:6px;margin:4px 0"><button type="button" class="mg-trcopy">Скопировать тексты на перевод</button><button type="button" class="mg-trapply">Применить перевод</button></div>
      <textarea class="mg-trtext" rows="6" style="width:100%" data-ph="Вставь сюда переведённые строки (нумерация «N|» должна сохраниться)"></textarea></details>
    <div style="text-align:right;margin-top:8px"><button type="button" class="mg-create" style="width:auto"><i class="fa-solid fa-dragon"></i> ${tr("Создать выбранных")}</button></div>
  </div>`;

  const readAbilityField = (a, key, el) => {
    const v = el.type === "checkbox" ? el.checked : el.value;
    if (key === "kind") a.kinds = [v];
    if (key.startsWith("shape.")) { a.shape ??= {}; a.shape[key.slice(6)] = el.type === "checkbox" ? v : key === "shape.kind" ? v : num(v); }
    else if (key === "dmgk") a.dmg = v === "" ? null : v === "dice" ? { dice: true, mod: a.dmg?.mod ?? a.dmg?.flat ?? 0 } : { dice: false, flat: a.dmg?.flat ?? a.dmg?.mod ?? 0 };
    else if (key === "dmgv") { if (a.dmg) { if (a.dmg.dice) a.dmg.mod = num(v); else a.dmg.flat = num(v); } }
    else if (key === "check") a.check = num(v);
    else a[key] = v;
  };

  const dlg = new DialogV2({
    window: { title: tr("Генератор монстров"), resizable: true },
    position: { width: 860 },
    content,
    buttons: [
      { action: "cancel", label: tr("Закрыть") },
    ],
  });

  let creating = false;
  const doCreate = async () => {
    if (creating) return;
    creating = true;
    try {
        const chosen = mons.length === 1 ? mons : mons.filter((m) => m.selected);
        if (!chosen.length) { notify.warn("Никто не выбран."); return; }
        if (chosen.some((m) => !m.name?.trim())) { notify.warn(L2("У выбранного монстра нет названия.", "A selected monster has no name.")); return; }
        let n = 0;
        for (const m of chosen) { m.abilities.forEach((a) => { if (!a.resist) a.result = ""; }); await createMonster(m, { open: chosen.length === 1 }); n++; }
        if (n > 1) notify.info(L2(`Создано монстров: ${n}. Они лежат в списке акторов.`, `Monsters created: ${n}. They are in the Actors directory.`));
        await dlg.close();
    } catch (err) { console.error(err); notify.error(String(err?.message ?? err)); }
    finally { creating = false; }
  };

  const wire = (root) => {
    const $ = (q) => root.querySelector(q);
    const fieldsEl = $(".mg-fields"), rowsEl = $(".mg-rows"), absEl = $(".mg-abs"), listEl = $(".mg-list");
    // [2026-10-09] the dialog drops these attributes from its content: set them after render
    $(".mg-file")?.setAttribute("accept", ".json,application/json");
    $(".mg-file")?.setAttribute("multiple", "");
    const m = () => mons[cur];
    const paintList = () => {
      $(".mg-listbox").style.display = mons.length > 1 ? "" : "none";
      const q = $(".mg-filter").value.trim().toLowerCase();
      $(".mg-count").textContent = `${mons.filter((x) => x.selected).length} из ${mons.length} отмечено`;
      listEl.innerHTML = mons.map((x, i) => ({ x, i })).filter(({ x }) => !q || x.name.toLowerCase().includes(q)).map(({ x, i }) =>
        `<div data-pick="${i}" style="display:flex;gap:6px;align-items:center;padding:1px 4px;cursor:pointer;${i === cur ? "background:#4466aa55;" : ""}">
          <input type="checkbox" data-sel="${i}"${x.selected ? " checked" : ""}> <span style="flex:1">${esc(x.name || "(без названия)")}</span>
          <span style="opacity:.7">ур. ${x.level}</span>${x.warnings.length ? `<span title="${esc(x.warnings.map(tr).join("; "))}" style="color:#d93">⚠</span>` : ""}</div>`).join("");
    };
    const applyPh = () => root.querySelectorAll("[data-ph]").forEach((e) => e.setAttribute("placeholder", tr(e.dataset.ph)));  // the dialog HTML drops «placeholder», so it is set here
    const paint = () => {
      const x = m();
      $(".mg-curname").textContent = x.name ? `— ${x.name}` : "";
      fieldsEl.innerHTML = FIELDS.map(([k, l, t]) => `<label style="display:flex;flex-direction:column;font-size:11px">${l}<input data-f="${k}" type="${t}" value="${esc(x[k])}"></label>`).join("");
      rowsEl.innerHTML = x.rows.map(rowRow).join("");
      absEl.innerHTML = x.abilities.map(abilityRow).join("") || "<i>Способностей нет — импортируй текст или добавь из шаблона.</i>";
      root.querySelectorAll("[data-f=description]").forEach((e) => (e.value = x.description ?? ""));
      root.querySelectorAll("[data-f=loot]").forEach((e) => (e.value = x.loot ?? ""));
      root.querySelector("[data-f=classType]").value = x.classType || "Other";
      root.querySelector("[data-f=usespell]").checked = !!x.usespell;
      $(".mg-magic").textContent = x.magic?.length ? tr("Магия (уйдёт в текст «Магия» в GM-информации): ") + x.magic.join(" • ") : "";
      root.querySelector("[data-f=weakKind]").value = x.weakKind ?? "";
      root.querySelector("[data-f=weakValue]").value = x.weakValue ?? 0;
      $(".mg-warn").textContent = x.warnings.map(tr).join(" • ");
      paintList();
      applyPh();
    };
    const load = (arr) => {
      arr.forEach((r) => (r.selected = true));
      mons.splice(0, mons.length, ...arr); cur = 0; trMap = []; paint();   // an old translation map must not be applied to a new list
    };
    const parseText = (txt, lang, ordered = false) => {
      const t0 = txt.trim();
      if (t0.startsWith("{") || t0.startsWith("[")) {
        try {
          const j = JSON.parse(t0); const arr = Array.isArray(j) ? j : [j];
          if (arr.every(isYtsheet)) return arr.map(parseYtsheet);
        } catch (e) { /* not JSON — fall through to text */ }
      }
      const blocks = splitBlocks(txt);
      return (blocks.length ? blocks : [txt]).map((b) => parseStatBlock(b, lang || undefined, { ordered }));
    };
    let trMap = [];
    const setInfo = (t) => ($(".mg-info").textContent = tr(t));
    /** ytsheet JSON objects -> monsters go to the list, spells become world items. Returns a status string. */
    const importYt = async (objs) => {
      const monsters = objs.filter(isYtsheet).map(parseYtsheet);
      // spells/items are created in the world at once — ask first and skip what is already there (same name + kind)
      const isSpell = (o) => isYtSpell(o), nm = (o) => String(o.magicName ?? o.itemName ?? "").trim();
      let wanted = objs.filter((o) => isYtSpell(o) || isYtItem(o));
      const dup = wanted.filter((o) => game.items.some((i) => i.name === nm(o) && (isSpell(o) ? i.type === "spell" : i.type !== "spell")));
      wanted = wanted.filter((o) => !dup.includes(o));
      let go = true;
      if (wanted.length) {
        try { go = await foundry.applications.api.DialogV2.confirm({ window: { title: L2("Создать в мире", "Create in the world") }, content: `<p>${L2(`Будет создано предметов в мире: ${wanted.length}.`, `Items to create in the world: ${wanted.length}.`)}${dup.length ? ` ${L2(`Уже есть (пропущу): ${dup.length}.`, `Already exist (skipped): ${dup.length}.`)}` : ""}</p>`, yes: { label: L2("Создать", "Create") }, no: { label: L2("Отмена", "Cancel") } }); } catch (err) { go = false; }
      }
      const sp = go ? await importYtSheets([...objs.filter((o) => !isYtSpell(o) && !isYtItem(o)), ...wanted]) : { created: [], warnings: [], skippedSkills: objs.filter(isYtSkillArts).length };
      if (monsters.length) load(monsters);
      const parts = [];
      if (monsters.length) parts.push(L2(`монстров: ${monsters.length}`, `monsters: ${monsters.length}`));
      if (sp.created.length) parts.push(L2(`создано в мире (вкладка «Предметы»): ${sp.created.length}`, `created in the world (Items tab): ${sp.created.length}`));
      if (sp.skippedSkills) parts.push(L2(`умений/техник пропущено: ${sp.skippedSkills} (пока не поддерживаются)`, `skills/techniques skipped: ${sp.skippedSkills} (not supported yet)`));
      const unknown = objs.length - monsters.length - sp.created.length - sp.skippedSkills - dup.length - (go ? 0 : wanted.length);
      if (dup.length) parts.push(L2(`уже были в мире: ${dup.length}`, `already in the world: ${dup.length}`));
      if (!go && wanted.length) parts.push(L2("создание отменено", "creation cancelled"));
      if (unknown > 0) parts.push(L2(`не распознано: ${unknown}`, `not recognised: ${unknown}`));
      if (sp.warnings.length) console.warn("SW25 | ytsheet spells:", sp.warnings);
      if (sp.warnings.length) parts.push(L2(`замечаний: ${sp.warnings.length} (см. консоль F12)`, `warnings: ${sp.warnings.length} (see the F12 console)`));
      if (sp.created.length) notify.info(L2(`ytsheet: создано предметов ${sp.created.length}.`, `ytsheet: ${sp.created.length} items created.`));
      return parts.length ? "ytsheet JSON — " + parts.join("; ") + "." : "";
    };

    root.addEventListener("input", (ev) => {
      const e = ev.target;
      if (e.classList.contains("mg-filter")) return paintList();
      if (e.dataset.f) m()[e.dataset.f] = e.type === "number" ? num(e.value) : e.type === "checkbox" ? e.checked : e.value;
      else if (e.dataset.r) { const r = m().rows[num(e.closest("tr").dataset.i)]; r[e.dataset.r] = e.dataset.r === "name" ? e.value : num(e.value); }
      else if (e.dataset.a) { const a = m().abilities[num(e.closest(".mg-ab").dataset.i)]; readAbilityField(a, e.dataset.a, e); }
    });
    root.addEventListener("change", async (ev) => {
      const e = ev.target;
      if (e.dataset.sel !== undefined) { mons[num(e.dataset.sel)].selected = e.checked; paintList(); }
      if (e.classList.contains("mg-file") && e.files?.[0]) {
        const objs = [];
        const bad = [];
        for (const f of e.files) { try { const j = JSON.parse(await f.text()); objs.push(...(Array.isArray(j) ? j : [j])); } catch (err) { console.error(err); bad.push(f.name); } }
        if (bad.length) notify.error(L2(`Не удалось прочитать JSON: ${bad.join(", ")}`, `Could not read JSON: ${bad.join(", ")}`));
        const msg = await importYt(objs);
        e.value = "";   // so the same file can be chosen again
        setInfo(msg || L2("В файлах не нашёл данных ytsheet (монстры, заклинания, предметы).", "No ytsheet data (monsters, spells, items) found in the files.")); return;
      }
    });
    root.addEventListener("click", async (ev) => {
      if (ev.target.closest?.(".mg-toitems")) { const m = await import("./itembuilder.mjs"); m.openItemBuilder(); return; }
      const e = ev.target.closest("button");
      const pick = ev.target.closest("[data-pick]");
      if (!e && pick && ev.target.dataset.sel === undefined) { cur = num(pick.dataset.pick); paint(); return; }
      if (!e) return;
      if (e.classList.contains("mg-create")) { ev.preventDefault(); doCreate(); return; }
      if (e.classList.contains("mg-parse")) {
        const txt = $(".mg-text").value; if (!txt.trim()) return notify.warn("Вставь текст.");
        if (/^\s*[\[{]/.test(txt)) { try { const j = JSON.parse(txt.trim()); const arr = Array.isArray(j) ? j : [j]; if (arr.some((x) => isYtSpell(x) || isYtItem(x) || isYtSkillArts(x))) { setInfo((await importYt(arr)) || ""); return; } } catch (e2) { if (/^\s*[\[{]\s*"/.test(txt)) notify.warn(L2("Похоже на JSON, но он не читается (обрезан или с ошибкой) — разбираю как обычный текст.", "This looks like JSON but cannot be read (truncated or broken) — parsing it as plain text.")); } }
        const res = parseText(txt, $(".mg-lang").value); load(res);
        notify.info(L2(`Разобрано: монстров ${res.length}.`, `Parsed monsters: ${res.length}.`));
      } else if (e.classList.contains("mg-ytopen")) {
        window.open(`${YT_BASE}?type=m`, "_blank", "noopener");
      } else if (e.classList.contains("mg-ytload")) {
        const ids = [...new Set($(".mg-yt").value.split(/\s+/).map(ytId).filter(Boolean))];
        if (!ids.length) return notify.warn(L2("Вставь ссылки или ID листов ytsheet.", "Paste ytsheet links or sheet IDs."));
        if (ids.length > 10) return notify.warn(L2("За раз не больше 10 листов (сайт чужой — не нагружаем).", "At most 10 sheets at a time (it is someone else's site)."));
        const res = []; let skipped = 0, spellsN = 0;
        for (let i = 0; i < ids.length; i++) {
          setInfo(`ytsheet: ${i + 1}/${ids.length}…`);
          try {
            const r = await fetch(`${YT_BASE}?id=${ids[i]}&mode=json`);
            if (!r.ok) { skipped++; continue; }
            const j = await r.json();
            if (isYtsheet(j)) res.push(parseYtsheet(j)); else if (isYtSpell(j) || isYtItem(j)) { await importYt([j]); spellsN++; } else skipped++;
          } catch (err) {
            console.warn("SW25 | ytsheet fetch failed", err);
            setInfo(L2("Сайт не разрешил запрос из браузера (или нет сети). Открой ссылку с «&mode=json» в новой вкладке и вставь JSON в поле ниже.", "The site refused the request from the browser (or there is no network). Open the link with “&mode=json” in a new tab and paste the JSON into the field below."));
            return;
          }
          if (i < ids.length - 1) await sleep(2000);
        }
        if (!res.length) return setInfo(spellsN ? L2(`Создано предметов: ${spellsN}.`, `Items created: ${spellsN}.`) : L2(`Ничего не найдено (пропущено: ${skipped}). Поддерживаются монстры, заклинания и предметы.`, `Nothing found (skipped: ${skipped}). Monsters, spells and items are supported.`));
        load(res); setInfo(L2(`ytsheet: монстров ${res.length}${skipped ? `, пропущено ${skipped}` : ""}.`, `ytsheet: monsters ${res.length}${skipped ? `, skipped ${skipped}` : ""}.`));
      } else if (e.classList.contains("mg-selall")) { mons.forEach((x) => (x.selected = true)); paintList(); }
      else if (e.classList.contains("mg-selnone")) { mons.forEach((x) => (x.selected = false)); paintList(); }
      else if (e.classList.contains("mg-trcopy")) {
        trMap = []; const lines = [];
        const add = (mi, field, ai, txt) => { const t0 = String(txt ?? "").trim(); if (!t0) return; trMap.push({ mi, field, ai }); lines.push(`${trMap.length}|${t0.replace(/\s*\n\s*/g, " ⏎ ")}`); };
        mons.forEach((x, mi) => {
          add(mi, "name", -1, x.name); add(mi, "description", -1, x.description); add(mi, "loot", -1, x.loot);
          x.abilities.forEach((a, ai) => { add(mi, "abname", ai, a.name); add(mi, "abtext", ai, a.text); });
        });
        $(".mg-trtext").value = lines.join("\n");
        try { await navigator.clipboard.writeText(lines.join("\n")); setInfo(L2("Строки скопированы. Переведи их и вставь результат в это же поле.", "Lines copied. Translate them and paste the result into this same field.")); }
        catch (err) { setInfo(L2("Выдели текст в поле и скопируй его вручную (Ctrl+C), затем переведи и вставь обратно.", "Select the text in the field and copy it by hand (Ctrl+C), translate it, then paste it back.")); }
      } else if (e.classList.contains("mg-trapply")) {
        if (!trMap.length) return notify.warn(L2("Сначала нажми «Скопировать тексты на перевод».", "Press “Copy texts for translation” first."));
        let done = 0;
        for (const ln of $(".mg-trtext").value.normalize("NFKC").split("\n")) {
          const mm = ln.match(/^\s*(\d+)\s*[|:]\s*(.*)$/); if (!mm) continue;
          const ent = trMap[num(mm[1]) - 1]; if (!ent) continue;
          const val = mm[2].replace(/\s*⏎\s*/g, "\n").trim(); const x = mons[ent.mi]; if (!x) continue;
          if (ent.field === "abname" || ent.field === "abtext") { const ab = x.abilities[ent.ai]; if (!ab) continue; if (ent.field === "abname") ab.name = val; else ab.text = val; } else x[ent.field] = val;
          done++;
        }
        paint(); setInfo(L2(`Применено строк: ${done} из ${trMap.length}.`, `Lines applied: ${done} of ${trMap.length}.`));
      }
      else if (e.classList.contains("mg-addrow")) { m().rows.push({ name: "", hit: 0, dmgMod: 0, dodge: 0, pp: 0, hp: 10, mp: 0 }); paint(); }
      else if (e.classList.contains("mg-addab")) { m().abilities.push(TEMPLATES[$(".mg-tpl").value].make()); paint(); }
      else if (e.dataset.del !== undefined) { m().abilities.splice(num(e.dataset.del), 1); paint(); }
      else if (e.dataset.delrow !== undefined) { if (m().rows.length > 1) m().rows.splice(num(e.dataset.delrow), 1); paint(); }
    });
    paint();
    applyPh();
    return { load, mons };
  };

  await dlg.render({ force: true });
  dlg.mg = wire(dlg.element);
  watchDom(dlg.element);
  return dlg;
}

/* ------------------------------------------------------------------ *
 *  Registration (called from sw25.mjs ready/init)
 * ------------------------------------------------------------------ */
export function registerMonsterGenerator() {
  game.sw25 ??= {};
  game.sw25.monsterGen = openMonsterGenerator;
  game.sw25.parseStatBlock = parseStatBlock;
  game.sw25.createMonster = createMonster;
  Hooks.on("renderActorDirectory", (app, html) => {
    if (!game.user.isGM) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(".sw25-monstergen")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-monstergen";
    btn.innerHTML = `<i class="fa-solid fa-dragon"></i> ${tr("Генератор монстров")}`;
    btn.addEventListener("click", () => openMonsterGenerator());
    const header = root.querySelector(".header-actions, .directory-header .action-buttons, header");
    (header ?? root).appendChild(btn);
  });
}
