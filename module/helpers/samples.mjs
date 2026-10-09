/**
 * [Round 99] Built-in sample characters and monsters.
 * One ready-to-play character per class and a ladder of monsters from trivial to a ten-section
 * boss, created in the world on demand (and once in a fresh world). Everything here is our own
 * invention — names, numbers, spells and monsters are NOT taken from a rulebook; only the class
 * names and the generic check / technique items of the starter compendiums are reused.
 */
import { L2, lang } from "./monstergen-i18n.mjs";
import { classKey, className } from "./names.mjs";
import { starterPack } from "./starter.mjs";
import { buildItem, ensureFolder } from "./itembuilder.mjs";

const P = (ru, en) => [ru, en];
const pick = (pair) => (Array.isArray(pair) ? (lang() === "ru" ? pair[0] : pair[1]) : pair);

/* ------------------------------------------------------------------ *
 *  Gear and spells shared by the samples (all invented)
 * ------------------------------------------------------------------ */
const W = {
  sword: { name: P("Длинный меч", "Longsword"), category: "sword", usage: "1H", reqstr: 13, power: 15, cvalue: 10 },
  great: { name: P("Двуручный меч", "Greatsword"), category: "sword", usage: "2H", reqstr: 18, power: 30, cvalue: 10 },
  rapier: { name: P("Рапира", "Rapier"), category: "sword", usage: "1H", reqstr: 4, power: 10, cvalue: 9 },
  fists: { name: P("Кастеты", "Knuckles"), category: "grapple", usage: "1H", reqstr: 5, power: 10, cvalue: 11 },
  bow: { name: P("Короткий лук", "Shortbow"), category: "bow", usage: "2H", reqstr: 8, power: 15, cvalue: 10, wrange: "30 m" },
  staff: { name: P("Посох", "Staff"), category: "staff", usage: "2H", reqstr: 5, power: 10, cvalue: 12 },
  dagger: { name: P("Кинжал", "Dagger"), category: "sword", usage: "1H", reqstr: 3, power: 5, cvalue: 9 },
  mace: { name: P("Булава", "Mace"), category: "mace", usage: "1H", reqstr: 12, power: 15, cvalue: 12 },
  spear: { name: P("Копьё", "Spear"), category: "spear", usage: "2H", reqstr: 12, power: 20, cvalue: 10 },
  gun: { name: P("Пистоль", "Pistol"), category: "gun", usage: "1H", reqstr: 5, power: 20, cvalue: 10, wrange: "20 m" },
};
const A = {
  cloth: { name: P("Плотная одежда", "Padded Clothes"), acategory: "nonmetalarmor", reqstr: 1, pp: 1 },
  leather: { name: P("Кожаный доспех", "Leather Armour"), acategory: "nonmetalarmor", reqstr: 5, pp: 3 },
  chain: { name: P("Кольчуга", "Chain Mail"), acategory: "metalarmor", reqstr: 13, pp: 5, dodge: -1 },
  plate: { name: P("Латы", "Plate Armour"), acategory: "metalarmor", reqstr: 18, pp: 7, dodge: -2 },
  shield: { name: P("Круглый щит", "Round Shield"), acategory: "shield", reqstr: 8, pp: 1 },
};
const base = { level: 1, mp: 3, time: "instant", resistType: "", actMain: true };
const S = {
  spark: { ...base, name: P("Искра", "Spark"), school: "sorcerer", shape: "target", range: 30, does: "damage", power: 10, cvalue: 10, prop: "thunder", resistType: "Mndres", resistResult: "halving" },
  heavyLids: { ...base, name: P("Тяжёлые веки", "Heavy Lids"), school: "sorcerer", level: 2, mp: 4, shape: "target", range: 10, time: "rounds", timeN: 3, resistType: "Mndres", resistResult: "disappear", rows: [["dodge", -1]] },
  stoneSkin: { ...base, name: P("Каменная кожа", "Stoneskin"), school: "conjurer", shape: "touch", time: "rounds", timeN: 3, rows: [["pp", 2]] },
  keenEdge: { ...base, name: P("Острая кромка", "Keen Edge"), school: "conjurer", level: 2, mp: 4, shape: "touch", time: "rounds", timeN: 3, rows: [["dmg", 2]] },
  forceBlow: { ...base, name: P("Силовой удар", "Force Blow"), school: "wizard", level: 2, mp: 5, shape: "shot", range: 30, does: "damage", power: 20, cvalue: 10, prop: "energy", resistType: "Mndres", resistResult: "halving" },
  mend: { ...base, name: P("Малое исцеление", "Lesser Mending"), school: "priest", shape: "touch", does: "heal", power: 10 },
  goodWord: { ...base, name: P("Доброе слово", "Kind Word"), school: "priest", level: 2, mp: 5, shape: "selfarea", radius: 5, max: 0, time: "rounds", timeN: 3, rows: [["vitres", 1], ["mndres", 1]] },
  aimAssist: { ...base, name: P("Прицельная линза", "Aiming Lens"), school: "magitech", shape: "self", time: "rounds", timeN: 3, rows: [["hit", 1]] },
  burstShot: { ...base, name: P("Разрывной заряд", "Burst Charge"), school: "magitech", level: 2, mp: 4, shape: "area", range: 20, radius: 3, max: 0, does: "damage", power: 10, cvalue: 10, prop: "fire", resistType: "Vitres", resistResult: "halving" },
  petal: { ...base, name: P("Огненный лепесток", "Fire Petal"), school: "fairy", shape: "shot", range: 20, does: "damage", power: 10, cvalue: 10, prop: "fire", resistType: "Mndres", resistResult: "halving" },
  spring: { ...base, name: P("Родниковая вода", "Spring Water"), school: "fairy", shape: "target", range: 10, does: "flat", amount: 3 },
};

/**
 * One character per class. cls: [classKey, level]…; ab: dex agi str vit int mnd (totals);
 * checks / tech: Russian names of starter items (the English twins are found automatically).
 */
const CHARACTERS = [
  { key: "fighter", cls: [["fighter", 3], ["enhancer", 1]], ab: [14, 12, 18, 17, 9, 11], w: ["sword"], a: ["chain", "shield"], checks: ["Точность", "Уклонение"], tech: ["Жучья кожа"] },
  { key: "grappler", cls: [["grappler", 3], ["scout", 1]], ab: [16, 17, 15, 14, 9, 10], w: ["fists"], a: ["cloth"], checks: ["Точность", "Уклонение", "Акробатика"] },
  { key: "fencer", cls: [["fencer", 3], ["scout", 2]], ab: [17, 18, 11, 12, 12, 11], w: ["rapier"], a: ["leather"], checks: ["Точность", "Уклонение", "Скрытность", "Поиск"] },
  { key: "shooter", cls: [["shooter", 3], ["ranger", 1]], ab: [18, 14, 12, 12, 12, 12], w: ["bow", "dagger"], a: ["leather"], checks: ["Точность", "Выслеживать"] },
  { key: "sorcerer", cls: [["sorcerer", 3], ["sage", 1]], ab: [10, 11, 8, 11, 19, 17], w: ["staff"], a: ["cloth"], checks: ["Заклинания", "Знания о Монстрах"], spells: ["spark", "heavyLids"] },
  { key: "conjurer", cls: [["conjurer", 3], ["sage", 1]], ab: [11, 10, 9, 12, 18, 17], w: ["staff"], a: ["cloth"], checks: ["Заклинания", "Чтение"], spells: ["stoneSkin", "keenEdge"] },
  { key: "priest", cls: [["priest", 3], ["fighter", 1]], ab: [11, 10, 14, 15, 13, 18], w: ["mace"], a: ["chain", "shield"], checks: ["Заклинания", "Точность", "Уклонение"], spells: ["mend", "goodWord"] },
  { key: "fairytamer", cls: [["fairytamer", 3], ["ranger", 1]], ab: [12, 13, 8, 10, 17, 18], w: ["staff"], a: ["cloth"], checks: ["Заклинания", "Гербология"], spells: ["petal", "spring"] },
  { key: "magitech", cls: [["magitech", 3], ["shooter", 2]], ab: [17, 12, 10, 11, 17, 12], w: ["gun"], a: ["leather"], checks: ["Заклинания", "Точность"], spells: ["aimAssist", "burstShot"] },
  { key: "scout", cls: [["scout", 3], ["fencer", 2]], ab: [18, 18, 10, 11, 13, 10], w: ["dagger"], a: ["leather"], checks: ["Поиск", "Скрытность", "Взлом", "Чутьё (Чувство опасности)", "Точность", "Уклонение"] },
  { key: "ranger", cls: [["ranger", 3], ["shooter", 2]], ab: [17, 15, 12, 13, 13, 10], w: ["bow", "dagger"], a: ["leather"], checks: ["Выслеживать", "Первая помощь", "Гербология", "Точность"] },
  { key: "sage", cls: [["sage", 3], ["sorcerer", 1]], ab: [10, 10, 8, 11, 20, 16], w: ["staff"], a: ["cloth"], checks: ["Знания о Монстрах", "Чтение", "Понимание", "Заклинания"], spells: ["spark"] },
  { key: "enhancer", cls: [["enhancer", 3], ["grappler", 2]], ab: [15, 15, 16, 16, 9, 12], w: ["fists"], a: ["cloth"], checks: ["Точность", "Уклонение"], tech: ["Кошачьи глаза", "Жучья кожа", "Медвежья мышца"] },
  { key: "bard", cls: [["bard", 3], ["fencer", 1]], ab: [14, 14, 9, 11, 13, 19], w: ["rapier"], a: ["leather"], checks: ["Выступление", "Точность", "Уклонение"] },
  { key: "rider", cls: [["rider", 3], ["fighter", 2]], ab: [14, 15, 15, 15, 12, 10], w: ["spear"], a: ["chain"], checks: ["Верховая езда", "Точность", "Уклонение"] },
  { key: "alchemist", cls: [["alchemist", 3], ["shooter", 1]], ab: [16, 12, 9, 11, 19, 11], w: ["gun"], a: ["leather"], checks: ["Приворот", "Точность"] },
  { key: "warleader", cls: [["warleader", 3], ["fighter", 2]], ab: [13, 13, 15, 14, 16, 12], w: ["sword"], a: ["chain", "shield"], checks: ["Точность", "Уклонение"] },
  { key: "geomancer", cls: [["geomancer", 3], ["ranger", 1]], ab: [12, 13, 10, 13, 17, 16], w: ["staff"], a: ["cloth"], checks: ["Выслеживать"] },
  { key: "darkhunter", cls: [["darkhunter", 3], ["fencer", 2]], ab: [16, 16, 12, 13, 12, 14], w: ["rapier"], a: ["leather"], checks: ["Точность", "Уклонение"] },
];

/* ------------------------------------------------------------------ *
 *  Monsters (invented): rows = sections [name, hit, dmg +N, dodge, defense, HP, MP]
 * ------------------------------------------------------------------ */
const ab = (o) => ({ name: "", text: "", kind: "main", check: 0, resist: "", result: "", dmg: null, dmgType: "pd", shape: null, section: "", ...o });
const MONSTERS = [
  { key: "hopper", name: P("Пещерный прыгун", "Cave Hopper"), level: 1, classType: "Animal", vit: 3, mnd: 2, initiative: 8, move: "12",
    rows: [["", 2, 1, 2, 0, 12, 0]], abilities: [] },
  { key: "skirmisher", name: P("Гоблин-застрельщик", "Goblin Skirmisher"), level: 2, classType: "Barbarous", vit: 4, mnd: 3, initiative: 9, move: "14",
    rows: [["", 3, 2, 3, 2, 18, 0]],
    abilities: [ab({ name: P("Бросок камня", "Thrown Rock"), check: 3, resist: "Dodge", result: "none", dmg: { dice: true, mod: 1 }, text: P("Дальняя атака до 10 м, проверяется Уклонением.", "Ranged attack up to 10 m, checked against Evasion.") })] },
  { key: "spitter", name: P("Болотный плевун", "Marsh Spitter"), level: 4, classType: "Plant", vit: 7, mnd: 5, initiative: 6, move: "6",
    rows: [["", 5, 4, 3, 3, 30, 0]],
    abilities: [ab({ name: P("Кислотный плевок", "Acid Spit"), check: 12, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 4 }, dmgType: "md", shape: { kind: "area", radius: 3, max: 0, range: 15, self: false }, text: P("Область радиусом 3 м в точке до 15 м. Стойкость: половина урона.", "Area of radius 3 m at a point up to 15 m away. Fortitude: half damage.") })] },
  { key: "warden", name: P("Костяной страж", "Bone Warden"), level: 6, classType: "Undead", vit: 9, mnd: 9, initiative: 10, move: "12", weakKind: "fire", weakValue: 3,
    rows: [["", 8, 6, 7, 6, 50, 0]],
    abilities: [ab({ name: P("Леденящий взгляд", "Chilling Gaze"), check: 15, resist: "Mndres", result: "none", text: P("Одна цель до 10 м. При провале Воли цель получает −2 к Уклонению на 3 раунда (наложить вручную).", "One target within 10 m. On a failed Willpower save the target has Evasion −2 for 3 rounds (apply by hand).") }),
      ab({ name: P("Не чувствует боли", "Feels No Pain"), kind: "constant", text: P("Не теряет сознание и не делает проверок смерти: падает только на 0 ОЖ.", "Never falls unconscious and makes no death checks: it only drops at 0 HP.") })] },
  { key: "ogre", name: P("Двуглавый огр", "Two-Headed Ogre"), level: 8, classType: "Barbarous", vit: 12, mnd: 9, initiative: 11, move: "14", coreName: P("Тело", "Body"),
    rows: [[P("Тело", "Body"), 11, 9, 8, 7, 70, 0], [P("Левая голова", "Left Head"), 10, 6, 9, 5, 35, 10], [P("Правая голова", "Right Head"), 10, 6, 9, 5, 35, 10]],
    abilities: [ab({ name: P("Размах дубиной", "Club Sweep"), section: P("Тело", "Body"), check: 17, resist: "Dodge", result: "none", dmg: { dice: true, mod: 9 }, shape: { kind: "area", radius: 3, max: 0, range: 0, self: true }, text: P("Все в радиусе 3 м вокруг огра. Уклонение: промах.", "Everyone within 3 m of the ogre. Evasion: miss.") }),
      ab({ name: P("Оглушающий рёв", "Deafening Roar"), section: P("Левая голова", "Left Head"), check: 16, resist: "Mndres", result: "none", text: P("Все в радиусе 10 м. При провале Воли −1 ко всем проверкам на 1 раунд (вручную).", "Everyone within 10 m. On a failed Willpower save: −1 to all checks for 1 round (by hand).") })] },
  { key: "serpent", name: P("Грозовой змей", "Storm Serpent"), level: 11, classType: "Eidolon", vit: 16, mnd: 14, initiative: 15, move: "20 / 30 (полёт)", weakKind: "earth", weakValue: 3, coreName: P("Голова", "Head"),
    rows: [[P("Голова", "Head"), 15, 12, 14, 9, 80, 40], [P("Тело", "Body"), 14, 10, 11, 11, 110, 0], [P("Хвост", "Tail"), 14, 11, 13, 8, 60, 0]],
    abilities: [ab({ name: P("Грозовое дыхание", "Storm Breath"), section: P("Голова", "Head"), check: 21, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 12 }, dmgType: "md", shape: { kind: "line", radius: 0, max: 0, range: 20, self: false }, text: P("Линия 20 м, молния. Стойкость: половина урона.", "Line 20 m, lightning. Fortitude: half damage.") }),
      ab({ name: P("Удар хвостом", "Tail Lash"), section: P("Хвост", "Tail"), check: 20, resist: "Dodge", result: "none", dmg: { dice: true, mod: 11 }, shape: { kind: "area", radius: 4, max: 0, range: 0, self: true }, text: P("Все в радиусе 4 м. Уклонение: промах.", "Everyone within 4 m. Evasion: miss.") }),
      ab({ name: P("Чешуя бури", "Storm Scales"), kind: "constant", text: P("Урон молнией по змею уменьшается на 5 (учитывать вручную).", "Lightning damage against the serpent is reduced by 5 (track by hand).") })] },
  { key: "cthulhu", name: P("КТУЛХУ", "CTHULHU"), level: 20, classType: "Daemon", vit: 30, mnd: 30, initiative: 22, move: "20 / 40 (полёт) / 30 (вода)", coreName: P("Голова", "Head"),
    description: P("Десять секций, 1000 ОЖ на всех. Пример большого босса: показывает, как работают секции, области и линии. Регенерация = 10", "Ten sections, 1000 HP in total. A sample big boss: it shows how sections, areas and lines work. Regeneration = 10"),
    rows: [[P("Голова", "Head"), 28, 22, 24, 18, 160, 200], [P("Туловище", "Torso"), 26, 20, 20, 22, 180, 0],
      [P("Левая рука", "Left Arm"), 27, 24, 23, 16, 100, 0], [P("Правая рука", "Right Arm"), 27, 24, 23, 16, 100, 0],
      [P("Левое крыло", "Left Wing"), 25, 18, 25, 14, 80, 0], [P("Правое крыло", "Right Wing"), 25, 18, 25, 14, 80, 0],
      [P("Щупальца I", "Tentacles I"), 28, 19, 26, 12, 90, 0], [P("Щупальца II", "Tentacles II"), 28, 19, 26, 12, 90, 0],
      [P("Левая нога", "Left Leg"), 24, 21, 20, 18, 60, 0], [P("Правая нога", "Right Leg"), 24, 21, 20, 18, 60, 0]],
    abilities: [
      ab({ name: P("Зов безумия", "Call of Madness"), section: P("Голова", "Head"), check: 38, resist: "Mndres", result: "halving", dmg: { dice: true, mod: 20 }, dmgType: "md", shape: { kind: "area", radius: 30, max: 0, range: 0, self: true }, text: P("Все в радиусе 30 м. Воля: половина урона.", "Everyone within 30 m. Willpower: half damage.") }),
      ab({ name: P("Взгляд из бездны", "Gaze from the Deep"), section: P("Голова", "Head"), check: 36, resist: "Mndres", result: "none", text: P("Одна цель до 50 м. При провале Воли цель пропускает следующий ход (вручную).", "One target within 50 m. On a failed Willpower save the target loses its next turn (by hand).") }),
      ab({ name: P("Сокрушающая длань", "Crushing Hand"), section: P("Правая рука", "Right Arm"), check: 34, resist: "Dodge", result: "none", dmg: { dice: true, mod: 30 }, text: P("Одна цель до 10 м. Уклонение: промах.", "One target within 10 m. Evasion: miss.") }),
      ab({ name: P("Хлёст щупалец", "Tentacle Lash"), section: P("Щупальца I", "Tentacles I"), check: 35, resist: "Dodge", result: "none", dmg: { dice: true, mod: 19 }, shape: { kind: "area", radius: 8, max: 0, range: 0, self: true }, text: P("Все в радиусе 8 м. Уклонение: промах.", "Everyone within 8 m. Evasion: miss.") }),
      ab({ name: P("Удушающий захват", "Strangling Grip"), section: P("Щупальца II", "Tentacles II"), check: 35, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 15 }, text: P("Одна цель до 8 м. Стойкость: половина урона; при провале цель схвачена (вручную).", "One target within 8 m. Fortitude: half damage; on a failure the target is grabbed (by hand).") }),
      ab({ name: P("Буря крыльев", "Wing Tempest"), section: P("Левое крыло", "Left Wing"), check: 33, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 14 }, dmgType: "md", shape: { kind: "area", radius: 15, max: 0, range: 0, self: true }, text: P("Все в радиусе 15 м, ветер. Стойкость: половина урона.", "Everyone within 15 m, wind. Fortitude: half damage.") }),
      ab({ name: P("Луч небытия", "Ray of Unbeing"), section: P("Голова", "Head"), check: 37, resist: "Vitres", result: "halving", dmg: { dice: true, mod: 26 }, dmgType: "md", shape: { kind: "line", radius: 0, max: 0, range: 50, self: false }, text: P("Линия 50 м. Стойкость: половина урона.", "Line 50 m. Fortitude: half damage.") }),
      ab({ name: P("Поступь титана", "Titan's Tread"), section: P("Левая нога", "Left Leg"), check: 30, resist: "Dodge", result: "none", dmg: { dice: true, mod: 21 }, shape: { kind: "area", radius: 5, max: 0, range: 0, self: true }, text: P("Все в радиусе 5 м. Уклонение: промах.", "Everyone within 5 m. Evasion: miss.") }),
      ab({ name: P("Древняя плоть", "Ancient Flesh"), kind: "constant", text: P("В конце каждого своего хода восстанавливает 10 ОЖ основной секции. Пока цела Голова, остальные секции не выходят из строя окончательно (на усмотрение ГМа).", "At the end of each of its turns it restores 10 HP of the main section. While the Head stands, the other sections are never out for good (GM's call).") }),
    ] },
];

/* ------------------------------------------------------------------ *
 *  Building
 * ------------------------------------------------------------------ */
let _starter = null;
async function starterNames() {
  if (_starter) return _starter;
  const r = await fetch(`systems/${game.system.id}/module/data/starter.json`);
  const d = await r.json();
  const map = {};
  for (const kind of ["checks", "techniques"]) for (const e of d[kind]) map[e.name.ru] = [e.name.ru, e.name.en];
  return (_starter = map);
}
async function fromPack(kind, test) {
  const pack = starterPack(kind);
  if (!pack) return null;
  const index = await pack.getIndex();
  const e = index.find(test);
  if (!e) return null;
  const o = (await pack.getDocument(e._id)).toObject();
  delete o._id; delete o.folder;
  return o;
}

async function buildCharacter(c, folderId) {
  const names = await starterNames();
  const main = className(c.cls[0][0]);
  const name = L2(`Пример: ${main}`, `Sample: ${main}`);
  const keys = ["dex", "agi", "str", "vit", "int", "mnd"];
  const abilities = Object.fromEntries(keys.map((k, i) => [k, { racevalue: 0, valuebase: c.ab[i] }]));
  const actor = await Actor.implementation.create({
    name, type: "character", folder: folderId,
    system: { race: L2("Человек", "Human"), money: 300, abilities },
    flags: { sw25: { sample: c.key } },
  });
  const items = [], missing = [], classes = [];
  for (const [key, lv] of c.cls) {
    const it = await fromPack("classes", (e) => classKey(e.name) === key);
    if (it) { it.system.skilllevel = lv; classes.push(it); } else missing.push(className(key));
  }
  // classes first: a weapon that lands on the sheet picks its class from what is already there
  if (classes.length) await actor.createEmbeddedDocuments("Item", classes);
  // the system adds its own basic checks a moment after creation: do not duplicate them
  await new Promise((r) => setTimeout(r, 1000));
  const have = new Set(actor.items.map((i) => i.name));
  for (const ru of c.checks ?? []) {
    const al = names[ru] ?? [ru, ru];
    if (al.some((n) => have.has(n))) continue;
    const it = await fromPack("checks", (e) => al.includes(e.name));
    if (it) items.push(it); else missing.push(ru);
  }
  for (const ru of c.tech ?? []) {
    const al = names[ru] ?? [ru, ru];
    const it = await fromPack("techniques", (e) => al.includes(e.name));
    if (it) items.push(it); else missing.push(ru);
  }
  for (const k of c.w ?? []) { const d = buildItem("weapon", { ...W[k], name: pick(W[k].name), rank: "B", hit: 0, dmod: 0 }).data; d.system.equip = k === c.w[0]; items.push(d); }
  for (const k of c.a ?? []) { const d = buildItem("armor", { ...A[k], name: pick(A[k].name), rank: "B", dodge: A[k].dodge ?? 0, mpp: 0 }).data; d.system.equip = true; items.push(d); }
  for (const k of c.spells ?? []) {
    const s = S[k];
    items.push(buildItem("spell", { ...s, name: pick(s.name) }, (s.rows ?? []).map(([id, value]) => ({ id, value }))).data);
  }
  await actor.createEmbeddedDocuments("Item", items);
  await new Promise((r) => setTimeout(r, 600));
  const hp = Number(actor.system.hp?.max) || 0, mp = Number(actor.system.mp?.max) || 0;
  // samples are above starting level: earned XP covers what the classes cost (never negative free XP)
  const used = Number(actor.system.attributes?.useexp) || 0;
  await actor.update({ "system.hp.value": hp, "system.mp.value": mp, "system.attributes.totalexp": Math.max(3000, used) });
  return { actor, missing };
}

async function buildMonster(m, folderId, createMonster, parseStatBlock) {
  const data = parseStatBlock("", lang());
  Object.assign(data, {
    name: pick(m.name), level: m.level, classType: m.classType, vit: m.vit, mnd: m.mnd, initiative: m.initiative ?? 0, move: m.move ?? "",
    weakKind: m.weakKind ?? "", weakValue: m.weakValue ?? 0, coreName: pick(m.coreName ?? ""), description: pick(m.description ?? ""), loot: "",
    rows: m.rows.map(([name, hit, dmgMod, dodge, pp, hp, mp]) => ({ name: pick(name), hit, dmgMod, dodge, pp, hp, mp })),
    abilities: m.abilities.map((a) => ({ ...a, name: pick(a.name), text: pick(a.text), section: pick(a.section), shape: a.shape ? { ...a.shape } : null })),
    warnings: [], selected: true,
  });
  const actor = await createMonster(data, { open: false, folder: folderId });
  if (actor) await actor.update({ "flags.sw25.sample": m.key });
  return actor;
}

/**
 * Create the sample characters and monsters in this world (GM). Samples that already exist
 * (flags.sw25.sample) are left alone unless `force` is set, which rebuilds them.
 */
export async function buildSamples({ force = false, characters = true, monsters = true } = {}) {
  if (!game.user.isGM) { ui.notifications.warn(L2("Примеры создаёт ГМ.", "Only the GM can build the samples.")); return null; }
  const out = { characters: 0, monsters: 0, missing: [] };
  const existing = (key) => game.actors.filter((a) => a.flags?.sw25?.sample === key);
  const root = L2("SW25 — Примеры", "SW25 — Samples");
  if (characters) {
    const folder = await ensureFolder("Actor", [root, L2("Персонажи", "Characters")]);
    for (const c of CHARACTERS) {
      const old = existing(c.key).filter((a) => a.type === "character");
      if (old.length && !force) continue;
      for (const a of old) await a.delete();
      const r = await buildCharacter(c, folder.id);
      out.characters++; out.missing.push(...r.missing);
    }
  }
  if (monsters) {
    const { createMonster, parseStatBlock } = await import("./monstergen.mjs");
    const folder = await ensureFolder("Actor", [root, L2("Монстры", "Monsters")]);
    for (const m of MONSTERS) {
      const old = existing(m.key).filter((a) => a.type === "monster");
      if (old.length && !force) continue;
      for (const a of old) await a.delete();
      if (await buildMonster(m, folder.id, createMonster, parseStatBlock)) out.monsters++;
    }
  }
  out.missing = [...new Set(out.missing)];
  ui.notifications.info(L2(`SW25: примеры созданы — персонажей ${out.characters}, монстров ${out.monsters}.`, `SW25: samples built — ${out.characters} characters, ${out.monsters} monsters.`)
    + (out.missing.length ? L2(` Не найдено в компендиумах: ${out.missing.join(", ")}.`, ` Not found in the compendiums: ${out.missing.join(", ")}.`) : ""));
  return out;
}

export function registerSamples() {
  game.sw25 = Object.assign(game.sw25 ?? {}, { samples: { build: buildSamples, CHARACTERS, MONSTERS } });
}
