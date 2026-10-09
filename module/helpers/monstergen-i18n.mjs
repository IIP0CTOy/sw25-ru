/**
 * [Round 91] Language layer of the monster generator.
 *  - the interface and the data it creates follow the SYSTEM language (Russian → Russian, anything else → English);
 *  - Japanese ytsheet vocabulary (intelligence, perception, habitat, languages, schools of magic …) is turned into that language.
 * Nothing here is book text: only game terms.
 */

/**
 * "ru" or "en". During the `init` hook game.i18n is not initialised yet (it still says "en"),
 * so the client's core language setting is asked first; game.i18n.lang is the fallback.
 */
export const lang = () => {
  const g = globalThis.game;
  let l;
  try { l = g?.settings?.get("core", "language"); } catch (e) { /* settings not ready */ }
  return String(l || g?.i18n?.lang || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
};
/** inline choice: L2("по-русски", "in English") */
export const L2 = (ru, en) => (lang() === "ru" ? ru : en);

const EN = new Map(Object.entries({"1. Откуда брать": "1. Source", "Разобрать текст": "Parse text", "выбрать всех": "select all", "снять": "clear", "Найдено монстров:": "Monsters found:", "2. Монстр": "2. Monster", "Слабость:": "Weakness:", "3. Способности": "3. Abilities", "4. Описание / трофеи": "4. Description / loot", "+ секция": "+ section", "+ добавить из шаблона": "+ add from template", "Генератор монстров": "Monster generator", " из ": " of ", "отмечено": "selected", "ур.": "lv.", "(без названия)": "(unnamed)", "Название": "Name", "Уровень": "Level", "Инициатива": "Initiative", "Скорость": "Speed", "Интеллект": "Intelligence", "Восприятие": "Perception", "Реакция": "Disposition", "Загрязнение": "Soulscars", "Язык": "Language", "Среда обитания": "Habitat", "Известность": "Reputation", "Слабое место (порог)": "Weak point (threshold)", "Слабое место (текст)": "Weak point (text)", "Стойкость (бонус)": "Fortitude (bonus)", "Воля (бонус)": "Willpower (bonus)", "Основная секция": "Main section", "Секция / бой. стиль": "Section / fight. style", "Точн.": "Acc.", "Урон +N": "Dmg +N", "Уклон.": "Eva.", "Защ.": "Def.", "ОЖ": "HP", "ОМ": "MP", "Базовые числа (без скобок). «Урон +N» — это N из «2d+N». Больше одной строки = многочастный монстр.": "Base numbers (without the bracketed values). “Dmg +N” is the N from “2d+N”. More than one row = multi-section monster.", "создаётся выключенный эффект «Слабое место…», включается при опознании монстра. Распознаётся из текста автоматически.": "creates a disabled “Weak point…” effect that turns on when the monster is identified. Detected from the text automatically.", "— нет / только текстом —": "— none / text only —", "Магический урон (любой) +N": "Any magic damage +N", "Физический урон (любой) +N": "Any physical damage +N", "Огонь +N": "Fire +N", "Лёд/Вода +N": "Ice/Water +N", "Ветер +N": "Wind +N", "Земля +N": "Earth +N", "Молния +N": "Thunder +N", "Энергия +N": "Energy +N", "Особая атака (Уклонение)": "Special attack (Evasion)", "Удар со спасброском (Стойкость, половина)": "Hit with save (Fortitude, half)", "Ментальное (Воля, отрицает)": "Mental (Willpower, negates)", "Область вокруг себя": "Area around self", "Область в точке (выбор на карте)": "Area at a point (pick on map)", "Линия": "Line", "Постоянная (◯, текст)": "Passive (◯, text)", "Самоусиление (текст)": "Self-buff (text)", "Регенерация (текст)": "Regeneration (text)", "Пустая": "Blank", "Способностей нет — импортируй текст или добавь из шаблона.": "No abilities — import text or add from a template.", "Бросок": "Check", "— без броска —": "— no roll —", "Стойкость": "Fortitude", "Воля": "Willpower", "Уклонение": "Evasion", "Половина": "Half", "Отриц.": "Negate", "Невозможно": "Can't", "На выбор": "Optional", "Сокращ.": "Shorten", "Снимается": "Disappears", "Урон": "Damage", "фикс.": "flat", "нет": "none", "физ.": "phys.", "маг.": "magic", "цель(и)": "target(s)", "область": "area", "радиус": "radius", "макс. целей": "max targets", "дальность": "range", "вокруг себя": "around self", "► основное": "► main", "◯ постоянное": "◯ passive", "≫ вспомогательное": "≫ auxiliary", "△ подготовка": "△ preparation", "🗨 заявляемое": "🗨 declared", "секция": "section", "Описание (необязательно)": "Description (optional)", "Трофеи": "Loot", "Описание": "Description", "поиск по названию": "search by name", "язык: авто": "language: auto", "русский": "Russian", "...или вставь сюда текст с одним или несколькими монстрами": "...or paste text with one or more monsters here", "Разобрано: монстров": "Parsed monsters:", "Никто не выбран.": "Nobody selected.", "Вставь текст.": "Paste some text.", "Способности": "Abilities", "по": "to", "ссылки или ID листов ytsheet (по одной в строке) — монстры": "ytsheet links or sheet IDs (one per line) — monsters", "Загрузить по ссылкам": "Load from links", "Открыть ytsheet": "Open ytsheet", "Листы читаются по одному, не чаще раза в секунду. Если сайт не разрешит запрос из браузера, открой ссылку с «&mode=json» и вставь JSON в поле ниже.": "Sheets are fetched one at a time, at most once a second. If the site refuses the request from the browser, open the link with “&mode=json” and paste the JSON into the field below.", "...или вставь сюда текст с одним или несколькими монстрами (или JSON с ytsheet)": "...or paste text with one or more monsters here (or ytsheet JSON)", "English": "English", "Класс:": "Class:", "Использует заклинания": "Uses spells", "Варвары": "Barbarians", "Животные": "Animals", "Растения": "Plants", "Нежить": "Undead", "Конструкты": "Constructs", "Магитехи": "Magitech", "Мифозвери": "Mythical beasts", "Феи": "Fairies", "Демоны": "Daemons", "Гуманоиды": "Humanoids", "Прочее": "Other", "Магия (уйдёт в текст «Магия» в GM-информации): ": "Magic (goes into the “Magic” text of the GM info): ", "Создать выбранных": "Create selected", "Закрыть": "Close", "Удалить": "Delete", "секция (для многочастных)": "section (for multi-part monsters)", "Особая атака": "Special attack", "Удар": "Strike", "Взгляд": "Gaze", "Взрыв": "Blast", "Огненный шар": "Fireball", "Луч": "Beam", "Пассивка": "Passive", "Усиление": "Buff", "Регенерация": "Regeneration", "Новая способность": "New ability", "Цель делает спасбросок Воли.": "The target makes a Willpower save.", "Накладывается вручную на N раундов.": "Applied manually for N rounds.", "В начале хода монстр восстанавливает N ОЖ (вручную).": "At the start of its turn the monster recovers N HP (manually).", "Новый монстр": "New monster", "Оружие": "Weapon", "Секция": "Section", "Магия": "Magic", "Слабое место": "Weak point", "Магический урон": "Magic damage", "Физический урон": "Physical damage", "Огонь": "Fire", "Лёд/Вода": "Ice/Water", "Ветер": "Wind", "Земля": "Earth", "Молния": "Thunder", "Энергия": "Energy", "Информация / перевод": "Info / translation", "Тексты для перевода (необязательно)": "Texts for translation (optional)", "Скопировать тексты на перевод": "Copy texts for translation", "Применить перевод": "Apply translation", "Вставь сюда переведённые строки (нумерация «N|» должна сохраниться)": "Paste the translated lines here (keep the “N|” numbering)", "Названия, описания и тексты способностей можно прогнать через любой переводчик: структура и числа при этом не затрагиваются.": "Names, descriptions and ability texts can go through any translator: structure and numbers are not affected."}).map(([k, v]) => [k.trim(), v]));

/** Templates for strings that carry numbers. */
const RX = [
  [/^(\d+) из (\d+) отмечено$/, (m) => `${m[1]} of ${m[2]} selected`],
  [/^ур\. (\d+\+?)$/, (m) => `lv. ${m[1]}`],
  [/^Секция (\d+)$/, (m) => `Section ${m[1]}`],
  [/^Атака \((.+)\)$/, (m) => `Attack (${m[1]})`],
];


Object.entries({
  "Не нашёл строку «Уровень + Название» — введи вручную": "Could not find the “Level + Name” line — enter it manually",
  "Стойкость/Воля не найдены": "Fortitude/Willpower not found",
  "Строка таблицы «Точн./Урон/Уклон./Защ./ОЖ/ОМ» не распознана — заполни ниже": "The table row “Acc./Dmg./Eva./Def./HP/MP” was not recognised — fill it in below",
  "Блок «Unique Skills / Уникальные умения» не найден": "“Unique Skills” block not found",
  "У части способностей пустое описание — столбцы текста могли перемешаться, проверь тексты": "Some abilities have empty descriptions — text columns may have got mixed up, check the texts",
  "В JSON нет строк статуса (status1…)": "No status rows (status1…) in the JSON",
  "Атака с проверкой Уклонения; при уклонении — промах.": "An attack checked against Evasion; if evaded, it misses.",
  "Одна цель. Спасбросок Стойкости: при успехе половина урона.": "One target. Fortitude save: half damage on success.",
  "Цель делает спасбросок Воли; при успехе эффект отсутствует. Статус навешивается вручную.": "The target makes a Willpower save; on success there is no effect. The status is applied manually.",
  "Область радиусом 6 м вокруг себя. Каждая цель в области делает спасбросок Стойкости; при успехе получает половину урона.": "Area of radius 6 m around itself. Each target in the area makes a Fortitude save; on success it takes half damage.",
  "Область радиусом 3 м в выбранной точке (дальность 20 м). Каждая цель делает спасбросок Стойкости; при успехе — половина урона.": "Area of radius 3 m at a chosen point (range 20 m). Each target makes a Fortitude save; on success, half damage.",
  "Линия длиной 20 м. Каждая цель на линии делает спасбросок Стойкости; при успехе — половина урона.": "Line 20 m long. Each target on the line makes a Fortitude save; on success, half damage.",
  "Пустая": "Blank",
  "5. Тексты для перевода (необязательно)": "5. Texts for translation (optional)",
  "Тексты для перевода": "Texts for translation",
  "линия": "line",
  "— вставить текст или загрузить JSON-листы ytsheet": "— paste text or load ytsheet JSON sheets",
  "JSON (ytsheet):": "JSON (ytsheet):",
}).forEach(([k, v]) => EN.set(k.trim(), v));
RX.push([/^Секций: (\d+) — проверь основную секцию$/, (m) => `Sections: ${m[1]} — check the main section`]);

/** Translate one UI string (exact match, then templates). Russian: returned unchanged. */
export function tr(s) {
  if (lang() === "ru" || typeof s !== "string") return s;
  const k = s.trim();
  if (!k) return s;
  if (EN.has(k)) return s.replace(k, EN.get(k));
  for (const [re, f] of RX) { const m = k.match(re); if (m) return s.replace(k, f(m)); }
  return s;
}

/** Translate an already rendered DOM subtree: text nodes, placeholders, titles, tooltips. Idempotent. */
export function trDom(root) {
  if (!root || lang() === "ru") return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
  for (const n of nodes) {
    if (n.parentElement?.closest("textarea, script, style")) continue;
    const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t;
  }
  for (const el of root.querySelectorAll("[placeholder], [title], [data-tooltip]")) {
    for (const a of ["placeholder", "title", "data-tooltip"]) { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  }
}

/** Keep a window translated while the generator repaints its own markup. */
export function watchDom(root) {
  if (!root || lang() === "ru") return null;
  trDom(root);
  let busy = false;
  const mo = new MutationObserver(() => { if (busy) return; busy = true; queueMicrotask(() => { try { trDom(root); } finally { busy = false; } }); });
  mo.observe(root, { childList: true, subtree: true, characterData: true });
  return mo;
}

/* ------------------------------------------------------------------ *
 *  Japanese (ytsheet) vocabulary -> current language
 * ------------------------------------------------------------------ */
const pickL = (o) => (lang() === "ru" ? o.ru : o.en);
const NFKC = (s) => String(s ?? "").normalize("NFKC");
const split = (s) => NFKC(s).split(/[、,，・]/).map((x) => x.trim()).filter(Boolean);
const mapList = (s, table) => split(s).map((x) => (table[x] ? pickL(table[x]) : x)).join(", ");
const T = (ru, en) => ({ ru, en });

const INTEL = { "なし": T("Нет", "None"), "動物並み": T("Животный", "Animal-like"), "命令に従う": T("Слуга", "Follows orders"), "低い": T("Низкий", "Low"), "人間並み": T("Средний", "Human-like"), "高い": T("Высокий", "High") };
const PERC = { "五感": T("Пять чувств", "Five senses"), "魔法": T("Магия", "Magic"), "機械": T("Механическое", "Mechanical"), "なし": T("Нет", "None") };
const PERC_SUB = { "暗視": T("Ночное зрение", "Darkvision"), "熱感知": T("Тепловое чувство", "Heat sense"), "魔力感知": T("Чувство магии", "Magic sense"), "高次元": T("Высшее измерение", "Higher dimension") };
const DISPO = { "敵対的": T("Враждебное", "Hostile"), "中立": T("Нейтральное", "Neutral"), "友好的": T("Дружественное", "Friendly"), "命令に従う": T("Инструкции", "Follows orders"), "捕食": T("Голодное", "Predatory"), "なし": T("Нет", "None") };
const HABITAT = {
  "様々": T("Различное", "Various"), "さまざま": T("Различное", "Various"), "遺跡": T("Руины", "Ruins"), "山": T("Горы", "Mountains"), "山岳": T("Горы", "Mountains"),
  "森": T("Лес", "Forest"), "森林": T("Лес", "Forest"), "迷宮": T("Лабиринты", "Labyrinths"), "荒野": T("Пустошь", "Wasteland"), "砂漠": T("Пустыня", "Desert"),
  "海": T("Море", "Sea"), "海岸": T("Побережье", "Coast"), "川辺": T("Берег реки", "Riverside"), "洞窟": T("Пещеры", "Caves"), "草原": T("Равнины", "Plains"),
  "沼": T("Болота", "Swamp"), "湿地": T("Болота", "Swamp"), "雪原": T("Снежные равнины", "Snowfield"), "人里": T("Населённые места", "Settlements"),
  "浅い奈落": T("Неглубокая бездна", "Shallow Abyss"), "奈落": T("Бездна", "Abyss"), "空": T("Небо", "Sky"), "地底": T("Подземье", "Underground"), "水中": T("Под водой", "Underwater"),
  "秘境": T("Тайные края", "Secluded places"), "全世界": T("Весь мир", "Worldwide"), "古墓": T("Древние гробницы", "Ancient tombs"), "墳墓": T("Гробницы", "Tombs"),
  "廃墟": T("Руины", "Ruins"), "丘陵": T("Холмы", "Hills"), "魔域": T("Магические области", "Magical zones"), "山崖": T("Горные обрывы", "Cliffs"), "マングローブ林": T("Мангровые леса", "Mangrove forests"), "百万迷宮": T("Миллионный лабиринт", "Million Labyrinth"), "なし": T("Нет", "None"),
};
const LANGS = {
  "交易共通語": T("Общий торговый", "Trade Common"), "汎用蛮族語": T("Варварский", "Barbarian"), "妖精語": T("Сильван", "Sylvan"),
  "魔法文明語": T("Аркана", "Arcane"), "魔動機文明語": T("Магитек", "Magitech"), "魔神語": T("Демонический", "Abyssal"), "巨人語": T("Гигантский", "Giant"),
  "ドラゴン語": T("Драконий", "Draconic"), "オーガ語": T("Язык огров", "Ogre"), "ドレイク語": T("Язык дрейков", "Drake"), "翼人語": T("Язык крылатых", "Winged"), "ラットマン語": T("Язык крысолюдов", "Ratman"),
  "バルカン語": T("Язык вулканов", "Vulcan"), "妖魔語": T("Язык гоблиноидов", "Goblinoid"), "ドワーフ語": T("Дварфийский", "Dwarvish"), "ミノタウロス語": T("Язык минотавров", "Minotaur"), "リザードマン語": T("Язык ящеролюдов", "Lizardman"),
  "ノスフェラトゥ語": T("Язык носферату", "Nosferatu"), "鬼族語": T("Язык они", "Oni"), "エルフ語": T("Эльфийский", "Elvish"), "グラスランナー語": T("Язык грасранеров", "Grassrunner"), "ティエンス語": T("Язык тифлингов", "Tiefling"), "なし": T("Нет", "None"),
};
const ELEMS = { "土": T("Земля", "Earth"), "水・氷": T("Вода/Лёд", "Water/Ice"), "水": T("Вода", "Water"), "氷": T("Лёд", "Ice"), "炎": T("Огонь", "Fire"), "風": T("Ветер", "Wind"), "光": T("Свет", "Light"), "闇": T("Тьма", "Dark") };
const SCHOOL_KEY = { "真語魔法": "Sorcerer", "操霊魔法": "Conjurer", "深智魔法": "Wizard", "神聖魔法": "Priest", "魔動機術": "Magitech", "妖精魔法": "Fairy", "森羅魔法": "Druid", "召異魔法": "Daemon", "奈落魔法": "Abyssal", "秘奥魔法": "Bibliomancer" };
const school = (jp) => { const k = SCHOOL_KEY[jp]; if (!k) return jp; const v = globalThis.game?.i18n?.localize?.(`SW25.Item.Spell.${k}`) ?? ""; return v && !v.startsWith("SW25.") ? v : jp; };

const FAIRY_PROP = { "土": "fairyearth", "水・氷": "fairyice", "水": "fairyice", "氷": "fairyice", "炎": "fairyfire", "風": "fairywind", "光": "fairylight", "闇": "fairydark" };
const SCHOOL_ID = { Sorcerer: "sorcerer", Conjurer: "conjurer", Wizard: "wizard", Priest: "priest", Magitech: "magitech", Fairy: "fairy", Druid: "druid", Daemon: "daemon", Abyssal: "abyssal", Bibliomancer: "bibliomancer" };
const SCHOOL_EN = { sorcerer: /sorcer|ancient/i, conjurer: /conjur|summon|spirit/i, wizard: /wizard|sage|deep\s*wis/i, priest: /priest|divine|sacred/i, magitech: /magitech|magic\s*tech/i, fairy: /fairy/i, druid: /druid|nature/i, daemon: /daemon|summon\s*abyss/i, abyssal: /abyssal/i, bibliomancer: /biblio|arcane\s*tome/i };

/** «神聖魔法、妖精魔法9レベル/魔力11(18)» (+ the text below it) -> {schools:[spell types], level, power, props} for flags.sw25.magic. */
export function magicData(head, text = "") {
  const h = NFKC(head), t = NFKC(text);
  const pw = h.match(/(?:魔力|magic\s*power|мощност[\p{L}]*\s*магии|мощь\s*магии)\s*(\d+)/iu);
  if (!pw) return null;
  // level: «9レベル», «5 level», «Level 10», «Lv7», «уровень 5» — several schools -> the highest
  const lvNums = [...(h + "\n" + t).matchAll(/(\d+)\s*(?:レベル|уров[\p{L}]*|levels?\b|lvl\b|Lv\.?)|(?:(?:Lv|Level|lvl|уровень|уровня)\.?\s*)(\d+)/giu)].map((x) => Number(x[1] ?? x[2]));
  const lv = lvNums.length ? [null, Math.max(...lvNums)] : null;
  const schools = [];
  for (const [jp, k] of Object.entries(SCHOOL_KEY)) if (h.includes(jp)) schools.push(SCHOOL_ID[k]);
  if (!schools.length) for (const [jp, k] of Object.entries(SCHOOL_KEY)) if (t.includes(jp)) { schools.push(SCHOOL_ID[k]); break; }
  if (!schools.length) {
    for (const [k, id] of Object.entries(SCHOOL_ID)) {
      const loc = String(globalThis.game?.i18n?.localize?.(`SW25.Item.Spell.${k}`) ?? "");
      if ((loc && !loc.startsWith("SW25.") && h.toLowerCase().includes(loc.toLowerCase())) || SCHOOL_EN[id].test(h)) schools.push(id);
    }
  }
  if (!schools.length) return null;
  const out = { schools: [...new Set(schools)], level: lv ? Number(lv[1]) : 15, power: Number(pw[1]) };
  const el = t.match(/使用する属性は[、,]?\s*((?:「[^」]+」)+)\s*です/);
  if (el && out.schools.includes("fairy")) out.props = [...el[1].matchAll(/「([^」]+)」/g)].map((x) => FAIRY_PROP[x[1]]).filter(Boolean);
  return out;
}

export const ja = {
  intellect: (v) => (INTEL[NFKC(v).trim()] ? pickL(INTEL[NFKC(v).trim()]) : String(v ?? "")),
  disposition: (v) => (DISPO[NFKC(v).trim()] ? pickL(DISPO[NFKC(v).trim()]) : String(v ?? "")),
  perception: (v) => {
    const s = NFKC(v).trim(); const m = s.match(/^([^()]+?)\s*(?:\(([^)]*)\))?$/);
    if (!m || !PERC[m[1].trim()]) return String(v ?? "");
    const sub = m[2] ? split(m[2]).map((x) => (PERC_SUB[x] ? pickL(PERC_SUB[x]) : x)).join(", ") : "";
    return pickL(PERC[m[1].trim()]) + (sub ? ` (${sub})` : "");
  },
  habitat: (v) => mapList(v, HABITAT) || String(v ?? ""),
  languages: (v) => NFKC(v).split(/[、,，・\/\s]+/).map((x) => x.trim()).filter(Boolean).map((x) => (LANGS[x] ? pickL(LANGS[x]) : x)).join(", ") || String(v ?? ""),
  /** weakness text: «水・氷属性ダメージ+3点», «命中力+1» ... */
  weakness: (v) => {
    const s = NFKC(v).trim(); if (!s) return s;
    const n = (s.match(/\+\s*(\d+)/) ?? [])[1] ?? ""; const sign = n ? ` +${n}` : "";
    if (/命中/.test(s)) return L2("Меткость", "Accuracy") + sign;
    if (/回復/.test(s)) return L2("Урон от лечения", "Healing damage") + sign;
    if (/銀/.test(s)) return L2("Серебряное оружие", "Silver weapons") + sign;
    const E = [[/水・氷|氷|水/, L2("Лёд/Вода", "Ice/Water")], [/土/, L2("Земля", "Earth")], [/風/, L2("Ветер", "Wind")], [/炎/, L2("Огонь", "Fire")], [/雷/, L2("Молния", "Thunder")], [/純エネルギー|エネルギー/, L2("Энергия", "Energy")], [/衝撃/, L2("Ударный урон", "Impact damage")], [/魔法/, L2("Магический урон", "Magic damage")], [/物理/, L2("Физический урон", "Physical damage")]];
    const hit = E.find(([re]) => re.test(s));
    if (hit) return hit[1] + sign;
    if (/ダメ.?ジ/.test(s)) return L2("Любой урон", "Any damage") + sign;
    return s;
  },
  /** «妖精魔法で使用する属性は、「土」「水・氷」です。» */
  elementsSentence: (t) => {
    const m = NFKC(t).match(/使用する属性は[、,]?\s*((?:「[^」]+」)+)\s*です/);
    if (!m) return null;
    const list = [...m[1].matchAll(/「([^」]+)」/g)].map((x) => (ELEMS[x[1]] ? pickL(ELEMS[x[1]]) : x[1])).join(", ");
    return L2(`Используемые стихии: ${list}.`, `Elements used: ${list}.`);
  },
  /** «神聖魔法、妖精魔法9レベル/魔力11(18)» -> «Божественная магия, Магия фей 9 уровня / Мощность магии 11(18)» */
  magicLine: (t) => {
    const m = NFKC(t).match(/^\s*(.+?)\s*(?:(\d+)\s*(?:レベル|Lv|L)?)?\s*(?:\(([^)]*)\))?\s*\/\s*魔力\s*(\d+)\s*(?:\(\s*(\d+)\s*\))?/i);
    if (!m) return null;
    const schools = m[1].split(/[、,・]/).map((x) => (x.trim() === "魔法" ? L2("Магия", "Magic") : school(x.trim()))).filter(Boolean).join(", ");
    const power = m[5] ? `${m[4]}(${m[5]})` : m[4], note = m[3] ? ` (${m[3]})` : "";
    const lv = m[2] ? L2(` ${m[2]} уровня`, ` Level ${m[2]}`) : "";
    return L2(`${schools}${lv}${note} / Мощность магии ${power}`, `${schools}${lv}${note} / Magic Power ${power}`);
  },
};
