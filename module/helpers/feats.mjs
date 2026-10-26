/**
 * Talent constructor and talent rules (combat feats and racial abilities).
 *
 * A talent made here keeps its rules in flags.sw25.feat:
 *   kind   "feat" | "race"
 *   how    feat: "always" | "declare" | "button";  race: "always" | "toggle" | "use" | "after"
 *   dur    declare: "action" (this attack) | "round" (until the user's next turn)
 *   form   attack form: "none" | "two" | "multi" | "miss" | "hit" | "counter" | "best" | "combo" | "double"
 *   where  feat: any | melee | ranged | wcat | grip2 | spell | dual | all;  race: all | self_form | vs_eff | fly | check
 *   rules  [{ s, n, sc, x }]   s = stat id (STAT) or special id (SPECIAL)
 *   risk   [{ s, n }]          declare: penalty for 1 round
 *   g6/g11 [{ s, n, sc, x }]   race growth at adventurer level 6 / 11
 *   on/off/mpc/limit/limitN/forbid/after/who/prereq/twoDecl …
 *
 * What runs automatically:
 *  - «always» rules with no condition (and race toggles / growth) become transfer Active Effects on the item;
 *    growth effects carry flags.sw25.minAdv and stay suppressed below that adventurer level.
 *  - Conditional rules (melee only, a weapon category, two-handed weapons, the dual attack) and declared
 *    talents are added when the attack is rolled (attackMods), the damage part goes to the damage roll.
 *  - Risk and «1 round» talents become Active Effects on the actor for 1 round.
 *  - Tiers: «Name II» hides «Name» / «Name I» on the same actor.
 */
import { L2 } from "./monstergen-i18n.mjs";
import { ensureItemFolder } from "./itembuilder.mjs";

const A = "system.attributes.", E = "system.effect.";
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const N = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const sg = (n) => (n > 0 ? `+${n}` : String(n).replace("-", "−"));

/* ------------------------------------------------------------------ *
 *  Vocabulary
 * ------------------------------------------------------------------ */
export const STAT = {
  hit: [["Точность", "Accuracy"], A + "efhitmod"],
  dmg: [["Урон", "Damage"], A + "efdmod"],
  eva: [["Уклонение", "Evasion"], A + "efdodgemod"],
  def: [["Защита", "Defense"], A + "efppmod"],
  fort: [["Стойкость", "Fortitude"], E + "vitres"],
  will: [["Воля", "Willpower"], E + "mndres"],
  cast: [["Проверка заклинания", "Spellcasting check"], A + "efmckall"],
  mp: [["Стоимость ОМ", "MP cost"], A + "efmpall", -1],
  crit: [["Крит. значение", "Critical value"], E + "efcvalue"],
  lethal: [["Бросок мощи (+к выпавшему)", "Power roll result"], A + "ltmod"],
  hp: [["Макс. ОЖ", "Max HP"], "system.hp.efhpmod"],
  strmod: [["Мод. Силы", "Strength bonus"], "system.abilities.str.efmodify"],
  agimod: [["Мод. Подвижности", "Agility bonus"], "system.abilities.agi.efmodify"],
  allck: [["Все проверки", "All checks"], E + "allck"],
};
const SPECIAL = {
  nodual: ["Снять штраф парной атаки", "Remove the dual attack penalty"],
  immune: ["Иммунитет к урону…", "Immune to damage…"],
  halve: ["Урон вдвое меньше от…", "Half damage from…"],
  vuln: ["Получаемый урон больше от…", "More damage taken from…"],
  checkbase: ["Основа проверки…", "Check base…"],
  flip: ["Бонус к «после броска» +N", "“After the roll” bonus +N"],
  note: ["Только текст (без автоматики)", "Text only (not automated)"],
};
const ELEM = { fire: ["огня", "fire"], ice: ["воды/льда", "water/ice"], wind: ["ветра", "wind"], earth: ["земли", "earth"], thunder: ["молнии", "lightning"], energy: ["энергии", "energy"], silver: ["серебряного оружия", "silver weapons"], origin: ["стихии своего происхождения", "the element of origin"] };
const SCALE = { num: ["просто число", "plain number"], lvl: ["× уровень класса", "× class level"], half: ["× ½ уровня класса", "× ½ class level"], magic: ["+ мощность магии", "+ magic power"], adv: ["× уровень авантюриста", "× adventurer level"] };
const ABIL = { dex: ["Ловкости", "Dexterity"], agi: ["Подвижности", "Agility"], str: ["Силы", "Strength"], vit: ["Живучести", "Vitality"], int: ["Интеллекта", "Intelligence"], mnd: ["Духа", "Spirit"] };
const ACTS = { minor: ["Малое действие", "Minor action"], major: ["Основное действие", "Major action"], prep: ["Подготовка к бою", "Combat preparation"], free: ["Без действия", "No action"] };
const FEAT_HOW = { always: ["◯ Всегда", "◯ Always", "Работает само, пока талант есть.", "Works by itself while the talent is there."], declare: ["🗨 Игрок заявляет", "🗨 Declared", "Флажок перед броском точности.", "A checkbox before the accuracy roll."], button: ["▶ Действие", "▶ Action", "Своя кнопка на листе.", "Its own button on the sheet."] };
const RACE_HOW = { always: ["◯ Всегда", "◯ Always", "Работает само.", "Works by itself."], toggle: ["⇄ Переключатель", "⇄ Toggle", "Превращение: пока включено — свои бонусы.", "A form: its bonuses while it is on."], use: ["☀ Использовать", "☀ Use", "Кнопка на листе с лимитом.", "A sheet button with a limit."], after: ["↺ После броска", "↺ After the roll", "Кнопка на карточке броска.", "A button on the roll card."] };
const FORMS = {
  none: ["·", ["Обычная атака", "Normal attack"], ["только бонусы", "bonuses only"]],
  two: ["⚔", ["Две атаки", "Two attacks"], ["по одной каждым оружием", "one with each weapon"]],
  multi: ["≋", ["Несколько целей", "Several targets"], ["одна точность, урон по каждой", "one accuracy roll, damage to each"]],
  miss: ["↻", ["Ещё атака после промаха", "Another attack after a miss"], ["если цель уклонилась", "if the target evaded"]],
  hit: ["⤳", ["Ещё атака после попадания", "Another attack after a hit"], ["тем же оружием", "with the same weapon"]],
  counter: ["⇄", ["Атака вместо уклонения", "Attack instead of evading"], ["пока вручную", "manual for now"]],
  best: ["⚄", ["Два броска, лучший", "Two rolls, best"], ["пока вручную", "manual for now"]],
  combo: ["✦", ["Атака + заклинание", "Attack + spell"], ["пока вручную", "manual for now"]],
  double: ["×2", ["Урон ×2 при перевесе", "Damage ×2 on a margin"], ["пока вручную", "manual for now"]],
};
const AUTO_FORMS = ["none", "two", "multi", "miss", "hit"];
const AFTER = { flip: ["Перевернуть оба кубика (1↔6, 2↔5, 3↔4)", "Flip both dice (1↔6, 2↔5, 3↔4)"] };
const LIMIT = { none: ["без лимита", "no limit"], day: ["раз в день", "once a day"], ndays: ["N раз в день", "N times a day"], rounds: ["N раундов в день", "N rounds a day"], hours: ["раз в час", "once an hour"] };
const WHERE_FEAT = { any: ["любая атака оружием", "any weapon attack"], melee: ["ближний бой", "melee"], ranged: ["стрельба и метание", "shooting and throwing"], wcat: ["оружие категории…", "weapon category…"], grip2: ["оружие 2Р", "2H weapon"], dual: ["парная атака", "dual attack"], all: ["всегда, во всём", "always, everything"] };
const WHERE_RACE = { all: ["всегда", "always"], self_form: ["пока включено", "while on"], vs_eff: ["против яда и болезни", "against poison and disease"], check: ["проверка…", "a check…"] };
const WHO = { self: ["сам", "self"], hand: ["союзник, держащий за руку", "an ally holding hands"], mount: ["свой транспорт", "own mount"] };
const T = (p) => L2(p[0], p[1]);

const RANGED_CATS = ["bow", "crossbow", "gun", "throw"];
const TWO_HAND = ["2H", "S2H", "P2H", "2HT", "2H#"];

/* ------------------------------------------------------------------ *
 *  Examples (neutral mechanics, not book talents)
 * ------------------------------------------------------------------ */
const R = (s, n = 0, sc = "num", x) => ({ s, n, sc, ...(x !== undefined ? { x } : {}) });
const EX = {
  risk: { kind: "feat", label: ["Удар с риском", "Risky Strike"], how: "declare", dur: "action", form: "none", where: "melee", rules: [R("dmg", 2)], risk: [R("eva", -1)], tip: ["Заявил перед атакой — урон больше, но до своего хода уклоняешься хуже.", "Declared before the attack: more damage, worse evasion until your next turn."] },
  risk2: { kind: "feat", label: ["Удар с риском II", "Risky Strike II"], how: "declare", dur: "action", form: "none", where: "melee", rules: [R("dmg", 4)], risk: [R("eva", -1)], tip: ["Вторая ступень: первую система скроет сама — по названию.", "Second tier: the first one is hidden automatically, by name."] },
  aim: { kind: "feat", label: ["Точный удар", "Precise Strike"], how: "declare", dur: "action", form: "none", where: "any", rules: [R("hit", 1)], risk: [], tip: ["Самый простой заявляемый: только бонус к точности.", "The simplest declared talent: an accuracy bonus."] },
  sweep: { kind: "feat", label: ["Широкий взмах", "Wide Sweep"], how: "declare", dur: "action", form: "multi", formN: 3, where: "grip2", rules: [R("dmg", -1)], risk: [], tip: ["Форма «несколько целей» + штраф к урону строкой.", "Form “several targets” plus a damage penalty row."] },
  followup: { kind: "feat", label: ["Добивание после промаха", "Follow-up"], how: "declare", dur: "action", form: "miss", where: "grip2", rules: [], risk: [], tip: ["Только форма атаки, строки не нужны.", "Only the attack form, no rows needed."] },
  hands: { kind: "feat", label: ["Две руки", "Two Hands"], how: "button", form: "two", where: "dual", rules: [R("hit", -1)], risk: [], tip: ["Даёт кнопку «две атаки» со штрафом.", "Gives a “two attacks” button with a penalty."] },
  combo: { kind: "feat", label: ["Отработанная связка", "Practiced Combo"], how: "always", form: "none", where: "dual", rules: [R("nodual")], risk: [], tip: ["Место действия «парная атака» — и талант усиливает «Две руки», ничего не указывая на него.", "Place “dual attack”: it improves “Two Hands” without pointing at it."] },
  blade: { kind: "feat", label: ["Магия в клинке", "Spellblade"], how: "declare", dur: "action", form: "none", where: "melee", rules: [R("dmg", 1, "magic")], risk: [R("fort", -1), R("will", -1)], tip: ["Счёт «+ мощность магии» и риск в две строки.", "“+ magic power” and a two-row risk."] },
  mastery: { kind: "feat", label: ["Мастерство оружия", "Weapon Mastery"], how: "always", form: "none", where: "wcat", wArg: "sword", rules: [R("dmg", 1)], risk: [], tip: ["Постоянный бонус только для категории оружия.", "A permanent bonus for one weapon category."] },
  hide: { kind: "race", label: ["Прочная кожа", "Tough Hide"], how: "always", where: "all", rules: [R("def", 1)], tip: ["Самая простая расовая: всегда +N.", "The simplest racial ability: always +N."] },
  form2: { kind: "race", label: ["Вторая форма", "Second Form"], how: "toggle", on: "major", off: "major", mpc: 0, limit: "none", forbid: ["spell"], where: "self_form", rules: [R("strmod", 1)], g6: [R("note", 0, "num", ["включение малым действием", "turned on with a minor action"])], g11: [R("agimod", 1)], tip: ["Переключатель: бонусы только пока включено, плюс запрет.", "A toggle: bonuses only while on, plus a restriction."] },
  flight: { kind: "race", label: ["Полёт", "Flight"], how: "toggle", on: "minor", off: "minor", mpc: 0, limit: "rounds", limitN: 3, forbid: [], where: "self_form", rules: [R("hit", 1), R("eva", 1)], tip: ["Переключатель с запасом раундов в день.", "A toggle with a daily budget of rounds."] },
  luck: { kind: "race", label: ["Удача", "Luck"], how: "after", after: "flip", limit: "day", where: "all", rules: [], g6: [R("flip", 1)], g11: [R("flip", 1)], tip: ["Кнопка появляется на карточке проверки.", "The button appears on the check card."] },
  swap: { kind: "race", label: ["Обмен сил", "Exchange"], how: "use", on: "major", mpc: 0, limit: "day", where: "all", rules: [R("note", 0, "num", ["потратить ОЖ, получить столько же ОМ", "spend HP, gain as much MP"])], tip: ["Кнопка «использовать» с лимитом; эффект текстом.", "A “use” button with a limit; the effect is text."] },
  elem: { kind: "race", label: ["Сопротивление стихии", "Elemental Ward"], how: "always", where: "all", rules: [R("immune", 0, "num", "fire")], g6: [R("note", 0, "num", ["то же — союзнику, держащему за руку", "the same for an ally holding hands"])], tip: ["Особые строки по типу урона.", "Special rows by damage type."] },
  weak: { kind: "race", label: ["Уязвимость", "Weakness"], how: "always", where: "all", rules: [R("vuln", 1, "num", "fire")], tip: ["Минус тоже бывает расовой способностью.", "A minus can be a racial ability too."] },
  ward: { kind: "race", label: ["Стойкость к ядам", "Poison Ward"], how: "always", where: "vs_eff", rules: [R("fort", 1), R("will", 1)], tip: ["Место действия «против яда и болезни» (бонус вручную).", "Place “against poison and disease” (bonus applied by hand)."] },
};

/** Item data of one example talent (neutral, not from a book), named in the world language. Used by the samples. */
export function exampleFeat(key) {
  const ex = EX[key];
  if (!ex) return null;
  const { label, ...rest } = ex;
  return buildFeatItem({ ...foundry.utils.deepClone(rest), name: L2(label[0], label[1]) }).data;
}

/* ------------------------------------------------------------------ *
 *  Reading talents
 * ------------------------------------------------------------------ */
const LEGACY = [
  [/^(?:парное оружие|dual[\s-]*wield\S*|二刀流)$/i, { kind: "feat", how: "button", form: "two", where: "dual", rules: [R("hit", -2)] }],
  [/^(?:двойная техника|twin[\s-]*technique|二刀無双|二刀流の極意)$/i, { kind: "feat", how: "always", form: "none", where: "dual", rules: [R("nodual")] }],
];
/** The rules of a talent item (constructor flags, or the two known names), or null. */
export function featOf(item) {
  if (!item || !["combatability", "raceability"].includes(item.type)) return null;
  const f = item.flags?.sw25?.feat;
  if (f) return f;
  const name = String(item.name ?? "").trim();
  for (const [re, def] of LEGACY) if (re.test(name)) return { ...def, legacy: true };
  return null;
}
/** «Name II» → { base: "Name", n: 2 }. */
function tierOf(name) {
  const m = /^(.*\S)\s+(I{1,3}|IV|V)$/.exec(String(name ?? "").trim());
  if (!m) return { base: String(name ?? "").trim(), n: 1 };
  return { base: m[1], n: { I: 1, II: 2, III: 3, IV: 4, V: 5 }[m[2]] };
}
/** Talent items of the actor that count (only the highest tier of each name). */
export function activeFeats(actor) {
  const list = (actor?.items ?? []).filter((i) => featOf(i));
  const best = new Map();
  for (const i of list) { const t = tierOf(i.name); const b = best.get(t.base); if (!b || t.n > b.n) best.set(t.base, { n: t.n, id: i.id }); }
  return list.filter((i) => best.get(tierOf(i.name).base)?.id === i.id).map((item) => ({ item, f: featOf(item) }));
}
export const isLowerTier = (actor, item) => !!featOf(item) && !activeFeats(actor).some((x) => x.item.id === item.id);

export function advLevel(actor) {
  return Math.max(0, ...(actor?.items ?? []).filter((i) => i.type === "skill").map((i) => N(i.system?.skilllevel)));
}
function classLevelFor(actor, item) {
  const sk = item?.system?.checkskill ?? item?.system?.powerskill;
  const s = actor?.items?.find((i) => i.type === "skill" && i.name === sk);
  return N(s?.system?.skilllevel) || advLevel(actor);
}
function magicPower(actor) {
  const a = actor?.system?.attributes ?? {};
  return Math.max(0, ...["sc", "cn", "wz", "pr", "mt", "fr", "dr", "dm", "ab", "bm"].map((k) => N(a[`${k}power`])));
}
/** Numeric value of a rule for this actor (scale by level / magic power). */
function valueOf(r, actor, item) {
  const n = N(r.n);
  switch (r.sc) {
    case "lvl": return n * classLevelFor(actor, item);
    case "half": return n * Math.ceil(classLevelFor(actor, item) / 2);
    case "adv": return n * advLevel(actor);
    case "magic": return magicPower(actor) * Math.sign(n || 1);
    default: return n;
  }
}

/* ------------------------------------------------------------------ *
 *  Text
 * ------------------------------------------------------------------ */
function ruleText(r) {
  if (STAT[r.s]) {
    const L = T(STAT[r.s][0]), n = Math.abs(N(r.n)), s = N(r.n) < 0 ? "−" : "+";
    switch (r.sc) {
      case "lvl": return `${L} ${s}${n}×${L2("ур. класса", "class lv")}`;
      case "half": return `${L} ${s}${n}×½ ${L2("ур. класса", "class lv")}`;
      case "adv": return `${L} ${s}${n}×${L2("ур. авантюриста", "adv. lv")}`;
      case "magic": return `${L} + ${L2("мощность магии", "magic power")}`;
      default: return `${L} ${sg(N(r.n))}`;
    }
  }
  const el = ELEM[r.x] ? T(ELEM[r.x]) : r.x;
  switch (r.s) {
    case "nodual": return L2("штраф парной атаки снимается", "the dual attack penalty is removed");
    case "immune": return L2(`иммунитет к урону от ${el}`, `immune to damage from ${el}`);
    case "halve": return L2(`урон от ${el} вдвое меньше`, `half damage from ${el}`);
    case "vuln": return L2(`урон от ${el} +${N(r.n)}`, `damage from ${el} +${N(r.n)}`);
    case "checkbase": return L2(`проверка = ур. авантюриста + мод. ${ABIL[r.x] ? T(ABIL[r.x]) : r.x}`, `check = adventurer level + ${ABIL[r.x] ? T(ABIL[r.x]) : r.x} bonus`);
    case "flip": return L2(`+${N(r.n)} к результату`, `+${N(r.n)} to the result`);
    case "note": return r.x ? `«${r.x}»` : L2("(текст)", "(text)");
    default: return "";
  }
}
function whereText(f) {
  if (f.kind === "feat") {
    const cat = CONFIG.SW25?.weaponCategories?.[f.wArg];
    return { any: L2("при любой атаке оружием", "with any weapon attack"), melee: L2("в ближнем бою", "in melee"), ranged: L2("при стрельбе и метании", "when shooting or throwing"), wcat: L2(`оружием категории «${cat ? game.i18n.localize(cat) : f.wArg}»`, `with ${cat ? game.i18n.localize(cat) : f.wArg} weapons`), grip2: L2("оружием 2Р", "with 2H weapons"), dual: L2("в атаках «Парной атаки»", "in dual attacks"), all: "" }[f.where] ?? "";
  }
  return { all: "", self_form: "", vs_eff: L2("против яда и болезни", "against poison and disease"), check: L2(`для проверки «${f.whereCheck ?? ""}»`, `for the “${f.whereCheck ?? ""}” check`) }[f.where] ?? "";
}
function limitText(f) {
  return { none: "", day: L2("раз в день", "once a day"), ndays: L2(`${f.limitN} раз в день`, `${f.limitN} times a day`), rounds: L2(`не больше ${f.limitN} раундов в день`, `up to ${f.limitN} rounds a day`), hours: L2("раз в час", "once an hour") }[f.limit ?? "none"] ?? "";
}
/** The plain-language summary of a talent (also the item's overview). */
export function featSentence(f, name) {
  // every L2 below has non-adjacent ${} slots, so the Japanese templates can match them
  const C = L2(", ", ", "), D = L2(".", ".");
  const nm = `«${name}»`, eff = (f.rules ?? []).map(ruleText).filter(Boolean).join(C), w = whereText(f);
  const effT = eff || "—";
  let t = "";
  if (f.kind === "feat") {
    const second = f.otherT ? L2(" (вторая — можно в другую цель)", " (the second may go to another target)") : "";
    const form = {
      none: "", two: L2(`две атаки, по одной каждым оружием${second}`, `two attacks, one with each weapon${second}`),
      multi: L2(`одна проверка точности по ${f.formN} целям, урон по каждой отдельно`, `one accuracy roll against ${f.formN} targets, damage to each`),
      miss: L2("если цель уклонилась — ещё одна атака тем же оружием в ту же цель", "if the target evaded, another attack with the same weapon at the same target"),
      hit: L2("после попадания — ещё одна атака тем же оружием", "after a hit, another attack with the same weapon"),
      counter: L2("вместо уклонения — своя атака (пока вручную)", "attack instead of evading (manual for now)"),
      best: L2("точность бросается дважды, берётся лучший (пока вручную)", "accuracy rolled twice, best kept (manual for now)"),
      combo: L2("атака и заклинание одним действием (пока вручную)", "attack and spell in one action (manual for now)"),
      double: L2(`урон ×2 при перевесе ${f.doubleN}+ (пока вручную)`, `damage ×2 on a margin of ${f.doubleN}+ (manual for now)`),
    }[f.form ?? "none"];
    const wPar = w ? ` (${w})` : "";
    if (f.how === "always") t = w ? L2(`Пока у персонажа есть ${nm}, ${w}: ${effT}.`, `While the character has ${nm}, ${w}: ${effT}.`) : L2(`Пока у персонажа есть ${nm}: ${effT}.`, `While the character has ${nm}: ${effT}.`);
    if (f.how === "declare") {
      t = L2(`Перед броском точности${wPar} можно заявить ${nm}.`, `Before the accuracy roll${wPar} ${nm} may be declared.`);
      if (form) t += ` ${form[0].toUpperCase()}${form.slice(1)}${D}`;
      if (eff) t += f.dur === "round" ? L2(` До начала следующего хода: ${eff}.`, ` Until the next turn: ${eff}.`) : L2(` Для этой атаки: ${eff}.`, ` For this attack: ${eff}.`);
      if (f.risk?.length) t += L2(` Риск на 1 раунд: ${f.risk.map(ruleText).join(C)}.`, ` Risk for 1 round: ${f.risk.map(ruleText).join(C)}.`);
      t += L2(" Не больше одного заявляемого таланта за ход.", " No more than one declared talent per turn.");
    }
    if (f.how === "button") {
      const btn = `${nm}${wPar}`;
      t = L2(`На листе кнопка ${btn}: ${form || "действие"}.`, `A sheet button ${btn}: ${form || "action"}.`);
      if (eff) t += L2(` В этих атаках: ${eff}.`, ` In these attacks: ${eff}.`);
    }
    if (f.twoDecl) t += L2(" Позволяет заявлять 2 таланта за ход.", " Allows 2 declared talents per turn.");
    if (f.prereq) t += L2(` Взять можно, если: ${f.prereq}.`, ` Requires: ${f.prereq}.`);
  } else {
    const who = { self: "", hand: L2(" (на союзника, держащего за руку)", " (on an ally holding hands)"), mount: L2(" (на свой транспорт)", " (on own mount)") }[f.who ?? "self"];
    const lim = limitText(f), act = (k) => (ACTS[k] ? T(ACTS[k]).toLowerCase() : "");
    const mpTxt = f.mpc ? L2(`, ${f.mpc} ОМ`, `, ${f.mpc} MP`) : "", limTxt = lim ? `${C}${lim}` : "";
    const fbList = (f.forbid ?? []).map((x) => (x === "spell" ? L2("заклинания", "spells") : L2("говорить", "speech"))).join(C);
    const fb = fbList ? L2(` Пока включено нельзя: ${fbList}.`, ` While on: no ${fbList}.`) : "";
    if (f.how === "always") { const where = `${w ? " " + w : ""}${who}`; t = where ? L2(`Всегда ${where.trim()}: ${effT}.`, `Always ${where.trim()}: ${effT}.`) : L2(`Всегда: ${effT}.`, `Always: ${effT}.`); }
    if (f.how === "toggle") { const offT = `${act(f.off)}${mpTxt}${limTxt}`; t = L2(`Переключатель ${nm}: включить — ${act(f.on)}, выключить — ${offT}. Пока включено${who}: ${effT}.`, `Toggle ${nm}: on — ${act(f.on)}, off — ${offT}. While on${who}: ${effT}.`) + fb; }
    if (f.how === "use") { const cost = `${act(f.on)}${mpTxt}${limTxt}`; t = L2(`Кнопка ${nm} (${cost})${who}: ${effT}.`, `Button ${nm} (${cost})${who}: ${effT}.`); }
    if (f.how === "after") {
      const btn = lim ? `${nm} (${lim})` : nm;
      t = L2(`На карточках проверок персонажа кнопка ${btn}: ${T(AFTER[f.after] ?? AFTER.flip).toLowerCase()}.`, `On the character's check cards, a button ${btn}: ${T(AFTER[f.after] ?? AFTER.flip).toLowerCase()}.`);
      if (eff) t += ` ${eff}${D}`;
    }
    if (f.g6?.length) t += L2(` С 6-го уровня: ${f.g6.map(ruleText).join(C)}.`, ` From level 6: ${f.g6.map(ruleText).join(C)}.`);
    if (f.g11?.length) t += L2(` С 11-го: ${f.g11.map(ruleText).join(C)}.`, ` From level 11: ${f.g11.map(ruleText).join(C)}.`);
  }
  return t.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ *
 *  Item data (effects)
 * ------------------------------------------------------------------ */
/** Effect changes for rules that map onto the system's effect keys. */
function changesOf(rules, f) {
  const out = [];
  for (const r of rules ?? []) {
    if (STAT[r.s]) {
      if (["lvl", "half", "adv", "magic"].includes(r.sc)) continue; // level-scaled values are added at roll time
      let key = STAT[r.s][1];
      const v = N(r.n) * (STAT[r.s][2] ?? 1);
      if (!v) continue;
      if (f.kind === "race" && f.where === "check" && f.whereCheck) key = `${E}checkbonus.${f.whereCheck}`;
      out.push({ key, type: "add", value: String(v), phase: "initial" });
    } else if (r.s === "immune" || r.s === "vuln") {
      const el = ["fire", "ice", "wind", "earth", "thunder"].includes(r.x) ? r.x : null;
      if (!el) continue;
      const v = r.s === "immune" ? 999 : -N(r.n);
      out.push({ key: `${A}decay.magic.element.magic.${el}`, type: "add", value: String(v), phase: "initial" });
      out.push({ key: `${A}decay.physical.element.magic.${el}`, type: "add", value: String(v), phase: "initial" });
    }
  }
  return out;
}
/** Rules that work everywhere (no weapon / attack condition), i.e. can be a plain Active Effect. */
const isGlobal = (f) => (f.kind === "race" ? f.where !== "vs_eff" : f.how === "always" && (f.where === "all" || f.where === "any"));

function effectsFor(f, name, img) {
  const effects = [];
  const mk = (label, changes, extra = {}) => ({ name: label, img, transfer: true, disabled: false, changes, flags: { sw25: { featFx: true, ...extra.flags } }, ...extra.data });
  if (isGlobal(f)) {
    const base = changesOf(f.rules, f);
    if (f.kind === "race" && f.how === "toggle") {
      effects.push(mk(name, base, { flags: { featToggle: true, forbid: f.forbid ?? [] }, data: { disabled: true } }));
    } else if (base.length && !(f.kind === "race" && ["use", "after"].includes(f.how))) {
      effects.push(mk(name, base));
    }
  }
  if (f.kind === "race") {
    for (const [lv, list] of [[6, f.g6], [11, f.g11]]) {
      const ch = changesOf(list, f);
      if (!ch.length) continue;
      effects.push(mk(`${name} (${L2(`с ${lv} ур.`, `lv ${lv}+`)})`, ch, { flags: { minAdv: lv, ...(f.how === "toggle" ? { featToggle: true, growthOf: true } : {}) }, data: f.how === "toggle" ? { disabled: true } : {} }));
    }
  }
  return effects;
}

/** Item data for a talent built in the constructor. */
export function buildFeatItem(f) {
  const name = String(f.name ?? "").trim();
  if (!name) throw new Error(L2("Нужно название.", "A name is required."));
  const type = f.kind === "race" ? "raceability" : "combatability";
  const img = f.kind === "race" ? "icons/magic/life/heart-cross-strong-flame-green.webp" : f.how === "declare" ? "icons/skills/melee/strike-sword-steel-yellow.webp" : f.how === "button" ? "icons/skills/melee/weapons-crossed-swords-yellow.webp" : "icons/skills/melee/maneuver-sword-katana-yellow.webp";
  const rules = foundry.utils.deepClone(f);
  delete rules.name;
  const sentence = featSentence(rules, name);
  const system = { description: `<p>${esc(sentence)}</p>`, overview: sentence, clickitem: f.how === "always" ? "description" : "all" };
  if (type === "combatability") Object.assign(system, { type: f.how === "declare" ? "declaration" : f.how === "always" ? "constant" : "main" });
  const flags = { sw25: { feat: rules } };
  if (f.limit && f.limit !== "none") flags.sw25.daily = { per: f.limit === "hours" ? "hour" : "day", limit: f.limit === "ndays" ? Math.max(1, N(f.limitN, 1)) : 1 };
  return { data: { name, type, img, system, flags, effects: effectsFor(rules, name, img) }, folder: f.kind === "race" ? [L2("Расовые способности", "Racial abilities")] : [L2("Боевые таланты", "Combat feats")] };
}

/* ------------------------------------------------------------------ *
 *  Attack: declared and conditional talents
 * ------------------------------------------------------------------ */
function weaponMatches(f, weapon, ctx = {}) {
  const s = weapon?.system ?? {};
  switch (f.where) {
    case "any": case "all": return true;
    case "melee": return !RANGED_CATS.includes(s.category);
    case "ranged": return RANGED_CATS.includes(s.category);
    case "wcat": return s.category === f.wArg;
    case "grip2": return TWO_HAND.includes(s.usage);
    case "dual": return !!ctx.dual;
    default: return false;
  }
}
/** Numbers from a list of rules for one attack: { hit, dmg, eva, ... } (only stats). */
function sumRules(rules, actor, weapon) {
  const out = {};
  for (const r of rules ?? []) if (STAT[r.s]) out[r.s] = (out[r.s] ?? 0) + valueOf(r, actor, weapon);
  return out;
}
/** Conditional «always» feats that apply to this weapon (global ones are already Active Effects). */
function passiveMods(actor, weapon, ctx) {
  const tot = { hit: 0, dmg: 0, names: [] };
  for (const { item, f } of activeFeats(actor)) {
    if (f.kind !== "feat" || f.how !== "always" || isGlobal(f)) continue;
    if (!weaponMatches(f, weapon, ctx)) continue;
    const s = sumRules(f.rules, actor, weapon);
    if (!s.hit && !s.dmg) continue;
    tot.hit += s.hit ?? 0; tot.dmg += s.dmg ?? 0; tot.names.push(item.name);
  }
  // level-scaled always feats with no condition (they are not Active Effects)
  for (const { item, f } of activeFeats(actor)) {
    if (f.kind !== "feat" || f.how !== "always" || !isGlobal(f)) continue;
    const scaled = (f.rules ?? []).filter((r) => STAT[r.s] && ["lvl", "half", "adv", "magic"].includes(r.sc));
    if (!scaled.length) continue;
    const s = sumRules(scaled, actor, weapon);
    tot.hit += s.hit ?? 0; tot.dmg += s.dmg ?? 0; tot.names.push(item.name);
  }
  return tot;
}

/** How many declared talents this actor may use per turn. */
const declLimit = (actor) => (activeFeats(actor).some(({ f }) => f.twoDecl) ? 2 : 1);
function turnKey() {
  const c = game.combat;
  return c?.started ? `${c.id}:${c.round}:${c.turn}` : null;
}
function declaredThisTurn(actor) {
  const k = turnKey(), d = actor.flags?.sw25?.declTurn;
  return k && d?.key === k ? N(d.n) : 0;
}

/**
 * Before a weapon attack: offer the declarable talents for this weapon.
 * Returns null when cancelled, else { hit, dmg, form, formN, names, label } (also with nothing declared).
 */
export async function attackMods(actor, weapon, ctx = {}) {
  if (!actor || weapon?.type !== "weapon") return { hit: 0, dmg: 0, form: "none", names: [] };
  const pass = passiveMods(actor, weapon, ctx);
  const decl = ctx.dual || ctx.noDeclare ? [] : activeFeats(actor).filter(({ f }) => f.kind === "feat" && f.how === "declare" && weaponMatches(f, weapon, ctx));
  let chosen = [];
  if (decl.length) {
    const left = Math.max(0, declLimit(actor) - declaredThisTurn(actor));
    const rows = decl.map(({ item, f }, i) => `<label class="sw25-decl-row"><input type="checkbox" name="d${i}" ${left ? "" : "disabled"}> <b>${esc(item.name)}</b><br><small>${esc(featSentence(f, item.name))}</small></label>`).join("");
    const head = left ? L2(`Можно заявить: ${left}`, `You may declare: ${left}`) : L2("В этот ход талант уже заявлен.", "A talent was already declared this turn.");
    const DV = foundry.applications.api.DialogV2;
    ensureStyle();   // the row styles live with the feat builder; a fresh session may not have opened it yet
    const res = await DV.wait({
      window: { title: L2(`${weapon.name}: заявить талант?`, `${weapon.name}: declare a talent?`) },
      position: { width: 480 },
      content: `<div class="sw25-decl"><p class="hint">${esc(head)}</p>${rows}</div>`,
      buttons: [
        { action: "go", label: L2("Атаковать", "Attack"), default: true, callback: (ev, btn) => [...btn.form.querySelectorAll("input[type=checkbox]")].map((c, i) => (c.checked ? i : -1)).filter((i) => i >= 0) },
        { action: "cancel", label: L2("Отмена", "Cancel") },
      ],
      rejectClose: false,
      render: (ev, dlg) => {
        const el = dlg.element ?? ev?.target?.element;
        const boxes = [...(el?.querySelectorAll?.(".sw25-decl input[type=checkbox]") ?? [])];
        boxes.forEach((b) => b.addEventListener("change", () => { const n = boxes.filter((x) => x.checked).length; boxes.forEach((x) => { if (!x.checked) x.disabled = n >= left; }); }));
      },
    });
    if (res === "cancel" || res === null || res === undefined) return null;
    chosen = (Array.isArray(res) ? res : []).slice(0, left).map((i) => decl[i]);
  }
  const out = { hit: pass.hit, dmg: pass.dmg, crit: 0, lt: 0, form: "none", formN: 0, names: [...pass.names], declared: chosen.map((c) => c.item.name) };
  const roundFx = [];
  for (const { item, f } of chosen) {
    const s = sumRules(f.rules, actor, weapon);
    // a «1 round» talent is an effect from now on; this roll's accuracy formula was read before it, so add it here too
    if (f.dur === "round") { if (f.rules?.length) roundFx.push({ item, f, rules: f.rules }); out.hit += s.hit ?? 0; }
    else { out.hit += s.hit ?? 0; out.dmg += s.dmg ?? 0; out.crit += s.crit ?? 0; out.lt += s.lethal ?? 0; }
    if (f.form && f.form !== "none") { out.form = f.form; out.formN = N(f.formN) || 0; }
    out.names.push(item.name);
    if (f.risk?.length) roundFx.push({ item, f, rules: f.risk, risk: true });
  }
  if (chosen.length) {
    for (const r of roundFx) await roundEffect(actor, r.item, r.rules, weapon, r.risk);
    const k = turnKey();
    if (k && actor.isOwner) await actor.update({ "flags.sw25.declTurn": { key: k, n: declaredThisTurn(actor) + chosen.length } });
  }
  out.label = out.names.length ? out.names.join(", ") : "";
  return out;
}

/** An Active Effect on the actor for 1 round (risk, or a «1 round» declared talent). */
async function roundEffect(actor, item, rules, weapon, risk) {
  const changes = [];
  for (const r of rules) {
    if (!STAT[r.s]) continue;
    const v = valueOf(r, actor, weapon) * (STAT[r.s][2] ?? 1);
    if (v) changes.push({ key: STAT[r.s][1], type: "add", value: String(v), phase: "initial" });
  }
  if (!changes.length) return;
  const duration = { value: 1, units: "rounds", ...(game.combat?.started ? { startRound: game.combat.round, startTurn: game.combat.turn, combat: game.combat.id } : {}) };
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: risk ? L2(`Риск: ${item.name}`, `Risk: ${item.name}`) : item.name, img: item.img, transfer: false, disabled: false, duration, changes,
    flags: { sw25: { classFx: true, featRound: true } },
  }]);
}

/* ------------------------------------------------------------------ *
 *  Dual attack hooks
 * ------------------------------------------------------------------ */
/** The talent giving the dual attack (constructor «two» form or the known name), or null. */
export function dualFeat(actor) {
  return activeFeats(actor).find(({ f }) => f.kind === "feat" && f.how === "button" && f.form === "two") ?? null;
}
/** Accuracy modifier of each dual attack and whether the second may go to another target. */
export function dualMods(actor, weapon) {
  const df = dualFeat(actor);
  const all = activeFeats(actor).filter(({ f }) => f.kind === "feat" && f.where === "dual");
  const noPenalty = all.some(({ f }) => (f.rules ?? []).some((r) => r.s === "nodual"));
  let hit = 0, dmg = 0;
  for (const { item, f } of all) {
    const s = sumRules(f.rules, actor, weapon);
    if (df && item.id === df.item.id && noPenalty) { hit += Math.max(0, s.hit ?? 0); dmg += s.dmg ?? 0; continue; }
    hit += s.hit ?? 0; dmg += s.dmg ?? 0;
  }
  const pass = passiveMods(actor, weapon, { dual: false });
  return { hit: hit + pass.hit, dmg: dmg + pass.dmg, otherTarget: all.some(({ f }) => f.otherT) };
}

/* ------------------------------------------------------------------ *
 *  Racial abilities: toggle / use / after the roll
 * ------------------------------------------------------------------ */
/** Is something forbidden right now by an active racial form ("spell" | "speech")? */
export function forbidden(actor, what) {
  for (const e of actor?.allApplicableEffects?.() ?? []) {
    if (e.disabled || e.isSuppressed) continue;
    if ((e.flags?.sw25?.forbid ?? []).includes(what)) return e.name;
  }
  return null;
}

async function payMp(actor, n, label = "") {
  n = N(n);
  if (!n) return true;
  // a Mako Stone pays MP of any cost, not only spells (CR I p. 158 «or other reasons»)
  const { makoSplit, makoCommit } = await import("./mako.mjs");
  const split = await makoSplit(actor, n, label);
  if (!split) return false;
  const mp = N(actor.system?.mp?.value);
  if (mp < split.mp) { ui.notifications.warn(L2(`Не хватает ОМ (${mp} из ${split.mp}).`, `Not enough MP (${mp} of ${split.mp}).`)); return false; }
  if (split.mp) await actor.update({ "system.mp.value": mp - split.mp });
  const line = await makoCommit(split.use);
  if (line) ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flavor: esc(label), content: `<p>${line}</p>` });
  return true;
}

/** Click on a talent made in the constructor (sheet «use»). Returns null when nothing was done. */
export async function useFeat(actor, item) {
  const f = featOf(item);
  if (!f) return "fallback";
  const say = (html) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flavor: esc(item.name), content: html });
  const act = (k) => (ACTS[k] ? T(ACTS[k]) : "");
  if (f.kind === "feat" && f.how === "button" && f.form === "two") {
    const { dualAttack } = await import("./dualattack.mjs");
    await dualAttack(actor);
    return true;
  }
  if (f.kind === "race" && f.how === "toggle") {
    const fx = item.effects.filter((e) => e.flags?.sw25?.featToggle);
    const on = fx.some((e) => !e.disabled && !e.flags?.sw25?.growthOf);
    if (!on && !(await payMp(actor, f.mpc, item.name))) return null;
    const upd = fx.map((e) => {
      const d = { _id: e.id, disabled: on };
      if (!on && f.limit === "rounds") {
        d.duration = { value: Math.max(1, N(f.limitN, 1)), units: "rounds", expired: false };
        // v14 counts rounds from `start`; a toggle switched on again needs a fresh one
        const c = game.combat;
        d.start = c?.started ? { combat: c.id, combatant: c.combatant?.id ?? null, round: c.round, turn: c.turn ?? 0, time: game.time.worldTime } : { combat: null, combatant: null, round: null, turn: null, time: game.time.worldTime };
      }
      if (on) d.duration = { value: null, units: "", expired: false };
      return d;
    });
    if (upd.length) await item.updateEmbeddedDocuments("ActiveEffect", upd);
    const mp2 = f.mpc ? L2(`, −${f.mpc} ОМ`, `, −${f.mpc} MP`) : "";
    await say(`<p>${on ? L2(`Выключено (${act(f.off)}).`, `Turned off (${act(f.off)}).`) : L2(`Включено (${act(f.on) + mp2}).`, `Turned on (${act(f.on) + mp2}).`)}</p>`);
    return on ? null : true; // only switching on counts as a use for the daily limit
  }
  if (f.kind === "race" && f.how === "use") {
    if (!(await payMp(actor, f.mpc, item.name))) return null;
    const mp3 = f.mpc ? L2(`, −${f.mpc} ОМ`, `, −${f.mpc} MP`) : "";
    await say(`<p><i>${esc(act(f.on))}${mp3}</i></p><p>${esc(featSentence(f, item.name))}</p>`);
    return true;
  }
  // always / declare / after: just show what it does
  await say(`<p>${esc(featSentence(f, item.name))}</p>`);
  return null;
}

/** «After the roll» racial abilities the actor can still use. */
function afterAbilities(actor) {
  return activeFeats(actor).filter(({ f }) => f.kind === "race" && f.how === "after");
}
function flipBonus(actor, f) {
  const lv = advLevel(actor);
  return [...(lv >= 6 ? f.g6 ?? [] : []), ...(lv >= 11 ? f.g11 ?? [] : [])].concat(f.rules ?? []).filter((r) => r.s === "flip").reduce((a, r) => a + N(r.n), 0);
}
function diceOf(roll) {
  const d = roll?.dice?.[0];
  return d && d.faces === 6 && d.results?.length === 2 ? d.results.map((r) => r.result) : null;
}
/** Adds the «after the roll» button to check cards of the user's own characters. */
export function bindAfterRoll(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || message.flags?.sw25?.flipped) return;
  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!actor?.isOwner || !message.isOwner) return;
  const roll = message.rolls?.[0];
  const dd = diceOf(roll);
  // a 6-6 would only turn into 1-1
  if (!dd || (dd[0] === 6 && dd[1] === 6) || message.flags?.sw25?.contest) return;
  const abil = afterAbilities(actor);
  if (!abil.length) return;
  const box = document.createElement("div");
  box.className = "sw25-after";
  for (const { item } of abil) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sw25-after-btn";
    b.innerHTML = `<i class="fa-solid fa-dice"></i> ${esc(item.name)}`;
    b.addEventListener("click", (ev) => { ev.preventDefault(); flipRoll(message, actor, item); });
    box.appendChild(b);
  }
  (root.querySelector(".message-content") ?? root).appendChild(box);
}
async function flipRoll(message, actor, item) {
  const f = featOf(item);
  const { dailyCheck, dailyMark } = await import("./rest.mjs");
  const chk = await dailyCheck(actor, item);
  if (!chk.ok) return;
  const roll = message.rolls[0], d = diceOf(roll);
  const nd = d.map((x) => 7 - x);
  const bonus = flipBonus(actor, f);
  const before = N(roll.total);
  const after = before - (d[0] + d[1]) + (nd[0] + nd[1]) + bonus;
  const six = nd[0] === 6 && nd[1] === 6, one = nd[0] === 1 && nd[1] === 1;
  const auto = six ? L2(" — автоматический успех (6-6)", " — automatic success (6-6)") : one ? L2(" — автоматический провал (1-1)", " — automatic failure (1-1)") : "";
  const sw = { ...(message.flags.sw25 ?? {}), flipped: true };
  // the card's ± buttons add `aftermod` to orgtotal: shift both by the same amount
  const delta = after - before;
  if (sw.total !== undefined) { sw.orgtotal = Number(sw.orgtotal ?? sw.total) + delta; sw.total = Number(sw.total) + delta; }
  if (six) { sw.critical = 1; sw.fumble = null; }
  if (one) { sw.fumble = 1; sw.critical = null; }
  if (message.isOwner) await message.update({ "flags.sw25": sw });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), flavor: esc(item.name),
    content: `<p>${esc(message.flavor ?? "")}: [${d.join(", ")}] → [${nd.join(", ")}]${bonus ? ` ${sg(bonus)}` : ""}</p><p><b>${before} → ${after}</b>${auto}</p>`,
  });
  await dailyMark(actor, item, chk);
}

/* ------------------------------------------------------------------ *
 *  Constructor window
 * ------------------------------------------------------------------ */
const STYLE = `
.sw25-fb{display:flex;flex-direction:column;gap:12px;font-size:14px}
.sw25-fb .fb-kinds{display:flex;gap:4px;border-bottom:2px solid var(--color-border-light-tertiary,#c4b28d)}
.sw25-fb .fb-kind{flex:none;width:auto;border:0;background:none;border-bottom:3px solid transparent;border-radius:0;padding:6px 12px}
.sw25-fb .fb-kind.on{border-bottom-color:#7a1f15;font-weight:700;color:#7a1f15}
.sw25-fb .fb-ex{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.sw25-fb .fb-ex button{flex:none;width:auto;padding:2px 9px;font-size:12px;line-height:1.6}
.sw25-fb .fb-ex .lab{font-size:12px;opacity:.75;margin-right:4px}
.sw25-fb h3{margin:4px 0 6px;font-size:15px;border:0}
.sw25-fb .q{font-weight:400;font-size:12px;opacity:.7}
.sw25-fb .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}
.sw25-fb .card{text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:2px;height:auto;padding:6px 9px;line-height:1.25}
.sw25-fb .card small{opacity:.75;font-size:12px}
.sw25-fb .on{outline:2px solid #7a1f15;background:rgba(122,31,21,.12)}
.sw25-fb .chips{display:flex;flex-wrap:wrap;gap:4px}
.sw25-fb .chip{flex:none;width:auto;border-radius:999px;padding:2px 10px;line-height:1.6;height:auto}
.sw25-fb .chip.on{background:#7a1f15;color:#fff;outline:0}
.sw25-fb .forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:4px}
.sw25-fb .form{text-align:left;height:auto;line-height:1.2;padding:5px 8px;display:flex;gap:6px;align-items:flex-start}
.sw25-fb .form small{display:block;opacity:.7;font-size:11px}
.sw25-fb .row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
.sw25-fb .fld{display:flex;flex-direction:column;gap:2px}
.sw25-fb .fld>span{font-size:12px;opacity:.75}
.sw25-fb .sub{margin-top:6px;padding:6px 8px;border:1px solid rgba(0,0,0,.2);border-radius:5px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.sw25-fb .rules{display:flex;flex-direction:column;gap:4px}
.sw25-fb .rule{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:4px 6px;border:1px solid rgba(0,0,0,.2);border-radius:5px}
.sw25-fb .rule.risk{background:rgba(200,150,30,.15)}
.sw25-fb .rule>*{width:auto;flex:0 0 auto;max-width:100%}
.sw25-fb .rule select.what{flex:1 1 170px}
.sw25-fb .sub select,.sw25-fb .sub input[type=number]{width:auto}
.sw25-fb .rule input[type=number]{width:60px;flex:none}
.sw25-fb .rule input[type=text]{flex:1 1 160px}
.sw25-fb .rule .del{flex:none;width:28px;margin-left:auto}
.sw25-fb .add{flex:none;width:auto;align-self:flex-start;padding:2px 10px;line-height:1.6;height:auto}
.sw25-fb .grow{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px}
.sw25-fb .lvl{border:1px solid #9fb5cc;background:rgba(80,130,190,.08);border-radius:5px;padding:6px;display:flex;flex-direction:column;gap:4px}
.sw25-fb .tip{border:1px solid #9fb5cc;background:rgba(80,130,190,.1);border-radius:5px;padding:5px 8px;font-size:13px}
.sw25-fb .tier{border:1px solid #a9c8a3;background:rgba(60,140,60,.1);border-radius:5px;padding:5px 8px;font-size:13px}
.sw25-fb .check{border:2px solid #d2a94e;border-radius:6px;padding:8px 10px;background:#0b181f;color:#e9f1d6}
.sw25-fb .check b{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#f3dc93}
.sw25-fb .check p{color:#e9f1d6;margin:4px 0 0}
.sw25-fb .check p{margin:4px 0 0;font-size:14px}
.sw25-fb .note{font-size:12px;opacity:.75}
.sw25-fb .foot{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sw25-fb .foot .create{flex:none;width:auto;padding:4px 16px}
.sw25-fb .log{font-size:12px}
.sw25-decl-row{display:block;margin:4px 0;padding:4px 6px;border:1px solid rgba(0,0,0,.2);border-radius:5px}
.sw25-decl-row small{opacity:.75}
.sw25-after{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.sw25-after-btn{flex:none;width:auto;font-size:12px;line-height:1.6;padding:0 8px}
`;
function ensureStyle() {
  if (document.getElementById("sw25-fb-style")) return;
  const s = document.createElement("style");
  s.id = "sw25-fb-style"; s.textContent = STYLE;
  document.head.appendChild(s);
}
const optK = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(Array.isArray(v) ? T(v) : v)}</option>`).join("");

let _open = null;
/** Open the talent constructor. */
export async function openFeatBuilder(startKind = "feat") {
  const mine = game.user.isGM ? [] : game.actors.filter((a) => a.type === "character" && a.isOwner);
  if (!game.user.isGM && !mine.length) return ui.notifications.warn(L2("У вас нет персонажа, на лист которого можно создать талант.", "You have no character to build the talent onto."));
  if (_open?.rendered) { _open.bringToFront?.(); return _open; }
  ensureStyle();
  const { DialogV2 } = foundry.applications.api;
  const dlg = new DialogV2({
    window: { title: L2("Конструктор талантов", "Talent constructor"), resizable: true }, position: { width: 720, height: 760 },
    content: `<div class="sw25-fb"></div>`, buttons: [{ action: "close", label: L2("Закрыть", "Close") }],
  });
  await dlg.render(true);
  _open = dlg;
  const root = dlg.element.querySelector(".sw25-fb");
  let S;
  const log = [];
  const blank = (kind) => ({ kind, name: "", how: "always", dur: "action", form: "none", formN: 3, doubleN: 3, where: kind === "race" ? "all" : "any", wArg: "sword", whereCheck: "", who: "self", rules: [], risk: [], g6: [], g11: [], on: "minor", off: "major", mpc: 0, limit: "none", limitN: 1, forbid: [], after: "flip", prereq: "", twoDecl: false, otherT: false });
  const load = (k) => {
    const e = EX[k]; S = { ...blank(e.kind), ...foundry.utils.deepClone(e), name: T(e.label) }; S.ex = k; delete S.label;
    for (const list of [S.rules, S.risk, S.g6, S.g11]) for (const r of list ?? []) if (Array.isArray(r.x)) r.x = T(r.x);
    render();
  };
  S = blank(startKind);

  function ruleRow(r, list, i, mode) {
    const d = document.createElement("div");
    d.className = "rule" + (mode === "risk" ? " risk" : "");
    const sel = document.createElement("select");
    sel.className = "what";
    let h = `<optgroup label="${L2("Число", "Number")}">${Object.entries(STAT).map(([k, v]) => `<option value="${k}" ${k === r.s ? "selected" : ""}>${esc(T(v[0]))}</option>`).join("")}</optgroup>`;
    if (mode !== "risk") {
      const sp = Object.entries(SPECIAL).filter(([k]) => (S.kind === "feat" ? ["nodual", "note"].includes(k) : k !== "nodual" && (k !== "flip" || S.how === "after")));
      h += `<optgroup label="${L2("Особое", "Special")}">${sp.map(([k, v]) => `<option value="${k}" ${k === r.s ? "selected" : ""}>${esc(T(v))}</option>`).join("")}</optgroup>`;
    }
    sel.innerHTML = h;
    sel.onchange = () => { r.s = sel.value; r.n = STAT[r.s] || ["vuln", "flip"].includes(r.s) ? 1 : 0; r.sc = "num"; r.x = ["immune", "halve", "vuln"].includes(r.s) ? "fire" : r.s === "checkbase" ? "int" : r.s === "note" ? "" : undefined; render(); };
    d.appendChild(sel);
    const num = () => { const n = document.createElement("input"); n.type = "number"; n.value = N(r.n); n.oninput = () => { r.n = N(n.value); sentence(); }; d.appendChild(n); };
    if (STAT[r.s]) {
      num();
      if (mode !== "risk") { const sc = document.createElement("select"); sc.innerHTML = optK(SCALE, r.sc ?? "num"); sc.onchange = () => { r.sc = sc.value; sentence(); }; d.appendChild(sc); }
    }
    if (["immune", "halve", "vuln"].includes(r.s)) { const t = document.createElement("select"); t.innerHTML = optK(ELEM, r.x); t.onchange = () => { r.x = t.value; sentence(); }; d.appendChild(t); if (r.s === "vuln") num(); }
    if (r.s === "flip") num();
    if (r.s === "checkbase") { const t = document.createElement("select"); t.innerHTML = optK(ABIL, r.x); t.onchange = () => { r.x = t.value; sentence(); }; d.appendChild(t); }
    if (r.s === "note") { const t = document.createElement("input"); t.type = "text"; t.value = r.x ?? ""; t.placeholder = L2("что написать на листе", "what to show on the sheet"); t.oninput = () => { r.x = t.value; sentence(); }; d.appendChild(t); }
    const x = document.createElement("button"); x.type = "button"; x.className = "del"; x.innerHTML = `<i class="fa-solid fa-xmark"></i>`; x.onclick = () => { list.splice(i, 1); render(); };
    d.appendChild(x);
    return d;
  }

  function render() {
    const feat = S.kind === "feat";
    const ex = Object.entries(EX).filter(([, v]) => v.kind === S.kind).map(([k, v]) => `<button type="button" data-ex="${k}" class="${S.ex === k ? "on" : ""}">${esc(T(v.label))}</button>`).join("");
    const how = feat ? FEAT_HOW : RACE_HOW;
    const cats = CONFIG.SW25?.weaponCategories ?? {};
    const W = feat ? WHERE_FEAT : WHERE_RACE;
    root.innerHTML = `
      <div class="fb-kinds"><button type="button" class="fb-kind ${feat ? "on" : ""}" data-kind="feat">${L2("Боевой талант", "Combat feat")}</button><button type="button" class="fb-kind ${feat ? "" : "on"}" data-kind="race">${L2("Расовая способность", "Racial ability")}</button></div>
      <div class="fb-ex"><span class="lab">${L2("Примеры:", "Examples:")}</span>${ex}</div>
      ${S.ex && EX[S.ex]?.tip ? `<div class="tip">💡 ${esc(T(EX[S.ex].tip))}</div>` : ""}
      <label class="fld"><span>${L2("Название", "Name")}</span><input type="text" class="fb-name" value="${esc(S.name)}"></label>
      <div class="fb-tier"></div>
      <section><h3>1. ${L2("Как работает?", "How does it work?")}</h3><div class="cards">${Object.entries(how).map(([k, v]) => `<button type="button" class="card ${S.how === k ? "on" : ""}" data-how="${k}"><b>${esc(L2(v[0], v[1]))}</b><small>${esc(L2(v[2], v[3]))}</small></button>`).join("")}</div><div class="fb-howsub"></div></section>
      ${feat && S.how !== "always" ? `<section><h3>2. ${L2("Форма атаки", "Attack form")} <span class="q">${L2("что происходит, когда заявлено или нажато", "what happens when declared or pressed")}</span></h3><div class="forms">${Object.entries(FORMS).filter(([k]) => S.how === "button" ? ["two", "counter", "none"].includes(k) : !["two", "counter"].includes(k)).map(([k, [ic, t, d]]) => `<button type="button" class="form ${S.form === k ? "on" : ""}" data-form="${k}"><span>${ic}</span><span><b>${esc(T(t))}</b><small>${esc(T(d))}</small></span></button>`).join("")}</div><div class="fb-formsub"></div></section>` : ""}
      <section><h3>${L2("Где действует?", "Where does it work?")}</h3><div class="chips">${Object.entries(W).filter(([k]) => feat || S.how === "toggle" || k !== "self_form").map(([k, v]) => `<button type="button" class="chip ${S.where === k ? "on" : ""}" data-where="${k}">${esc(T(v))}</button>`).join("")}</div>
        ${S.where === "wcat" ? `<div class="sub"><select class="fb-wcat">${Object.entries(cats).map(([k, v]) => `<option value="${k}" ${k === S.wArg ? "selected" : ""}>${esc(game.i18n.localize(v))}</option>`).join("")}</select></div>` : ""}
        ${S.where === "check" ? `<div class="sub"><label class="fld"><span>${L2("Название проверки (как на листе)", "Check name (as on the sheet)")}</span><input type="text" class="fb-wcheck" value="${esc(S.whereCheck)}"></label></div>` : ""}
        ${S.where === "dual" ? `<div class="note">${L2("Работает в атаках кнопки «Парная атака». Ссылаться на другой талант не нужно.", "Works in the dual attack. No need to point at another talent.")}</div>` : ""}
        ${S.where === "vs_eff" ? `<div class="note">${L2("Бонус показывается на листе; против яда и болезни его учитывают вручную.", "Shown on the sheet; applied by hand against poison and disease.")}</div>` : ""}
        ${!feat ? `<div class="row" style="margin-top:6px"><span class="note">${L2("На кого:", "On whom:")}</span><div class="chips">${Object.entries(WHO).map(([k, v]) => `<button type="button" class="chip ${S.who === k ? "on" : ""}" data-who="${k}">${esc(T(v))}</button>`).join("")}</div></div>` : ""}
      </section>
      <section><h3>${L2("Что даёт?", "What does it give?")}</h3><div class="rules fb-rules"></div><button type="button" class="add fb-addrule">+ ${L2("ещё строка", "another row")}</button><div class="fb-risk"></div></section>
      ${feat ? "" : `<section><h3>${L2("Рост расы", "Racial growth")} <span class="q">${L2("на 6-м и 11-м уровне авантюриста", "at adventurer level 6 and 11")}</span></h3><div class="grow fb-grow"></div></section>`}
      <details><summary>${L2("Дополнительно (можно не трогать)", "More (optional)")}</summary><div class="fb-more" style="display:flex;flex-direction:column;gap:6px;padding:6px 0"></div></details>
      <div class="check"><b>${L2("Проверка — так система поймёт", "Check — this is how the system reads it")}</b><p class="fb-sentence"></p></div>
      <div class="foot"><button type="button" class="create"><i class="fa-solid fa-plus"></i> ${L2("Создать", "Create")}</button>
        ${mine.length ? `<label>${L2("на лист", "onto")} <select class="fb-actor">${mine.map((a) => `<option value="${a.id}"${a.id === game.user.character?.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>` : ""}
        <span class="note">${game.user.isGM ? L2("Папка: ", "Folder: ") + (feat ? L2("Боевые таланты", "Combat feats") : L2("Расовые способности", "Racial abilities")) : ""}</span></div>
      <div class="log">${log.join("")}</div>`;
    // how sub
    let sub = "";
    if (feat && S.how === "declare") sub = `<div class="sub"><span class="note">${L2("Сколько действует:", "Lasts:")}</span><div class="chips">${[["action", L2("эта атака", "this attack")], ["round", L2("1 раунд (до своего хода)", "1 round (until your turn)")]].map(([k, t]) => `<button type="button" class="chip ${S.dur === k ? "on" : ""}" data-dur="${k}">${t}</button>`).join("")}</div></div>`;
    if (!feat && (S.how === "toggle" || S.how === "use")) sub = `<div class="sub">
      <label class="fld"><span>${S.how === "toggle" ? L2("Включить", "Turn on") : L2("Чем", "Action")}</span><select class="fb-on">${optK(ACTS, S.on)}</select></label>
      ${S.how === "toggle" ? `<label class="fld"><span>${L2("Выключить", "Turn off")}</span><select class="fb-off">${optK(ACTS, S.off)}</select></label>` : ""}
      <label class="fld"><span>${L2("Стоит ОМ", "MP cost")}</span><input type="number" class="fb-mpc" min="0" value="${N(S.mpc)}" style="width:70px"></label>
      <label class="fld"><span>${L2("Лимит", "Limit")}</span><select class="fb-limit">${optK(LIMIT, S.limit)}</select></label>
      ${["ndays", "rounds"].includes(S.limit) ? `<label class="fld"><span>N</span><input type="number" class="fb-limitn" min="1" value="${N(S.limitN, 1)}" style="width:60px"></label>` : ""}
      ${S.how === "toggle" ? `<div class="fld"><span>${L2("Пока включено нельзя", "While on, no")}</span><div class="row"><label><input type="checkbox" data-fb="spell" ${S.forbid.includes("spell") ? "checked" : ""}> ${L2("заклинания", "spells")}</label><label><input type="checkbox" data-fb="speech" ${S.forbid.includes("speech") ? "checked" : ""}> ${L2("говорить", "speech")}</label></div></div>` : ""}</div>`;
    if (!feat && S.how === "after") sub = `<div class="sub"><label class="fld"><span>${L2("Кнопка на карточке проверки", "Button on the check card")}</span><select class="fb-after">${optK(AFTER, S.after)}</select></label><label class="fld"><span>${L2("Лимит", "Limit")}</span><select class="fb-limit">${optK(LIMIT, S.limit)}</select></label>${S.limit === "ndays" ? `<label class="fld"><span>N</span><input type="number" class="fb-limitn" min="1" value="${N(S.limitN, 1)}" style="width:60px"></label>` : ""}</div>`;
    root.querySelector(".fb-howsub").innerHTML = sub;
    const fs = root.querySelector(".fb-formsub");
    if (fs) fs.innerHTML = S.form === "multi" ? `<div class="sub"><label class="fld"><span>${L2("До скольких целей", "Up to how many targets")}</span><input type="number" class="fb-formn" min="2" value="${N(S.formN, 3)}" style="width:60px"></label></div>`
      : S.form === "two" ? `<div class="sub"><label><input type="checkbox" class="fb-othert" ${S.otherT ? "checked" : ""}> ${L2("вторую атаку можно в другую цель", "the second attack may go to another target")}</label></div>`
      : S.form === "double" ? `<div class="sub"><label class="fld"><span>${L2("Перевес не меньше", "Margin at least")}</span><input type="number" class="fb-dbln" min="1" value="${N(S.doubleN, 3)}" style="width:60px"></label></div>` : "";
    // rules
    const RL = root.querySelector(".fb-rules");
    if (!S.rules.length) RL.innerHTML = `<div class="note">${S.form && S.form !== "none" ? L2("Можно оставить пустым: форма атаки уже всё делает.", "May stay empty: the attack form does the work.") : L2("Пока ничего.", "Nothing yet.")}</div>`;
    S.rules.forEach((r, i) => RL.appendChild(ruleRow(r, S.rules, i, "rule")));
    if (feat && S.how === "declare") {
      const rb = root.querySelector(".fb-risk");
      rb.innerHTML = `<div class="note" style="margin-top:8px"><b>${L2("Риск", "Risk")}</b> — ${L2("штраф на 1 раунд после заявления, даже если атака промахнулась:", "a penalty for 1 round after declaring, even on a miss:")}</div>`;
      const box = document.createElement("div"); box.className = "rules";
      S.risk.forEach((r, i) => box.appendChild(ruleRow(r, S.risk, i, "risk")));
      rb.appendChild(box);
      const a = document.createElement("button"); a.type = "button"; a.className = "add"; a.textContent = `+ ${L2("риск", "risk")}`; a.onclick = () => { S.risk.push(R("eva", -1)); render(); };
      rb.appendChild(a);
    }
    if (!feat) {
      const G = root.querySelector(".fb-grow");
      for (const [k, t] of [["g6", L2("На 6-м уровне", "At level 6")], ["g11", L2("На 11-м уровне", "At level 11")]]) {
        const box = document.createElement("div"); box.className = "lvl"; box.innerHTML = `<b>${t}</b>`;
        if (!S[k].length) box.insertAdjacentHTML("beforeend", `<div class="note">${L2("ничего не меняется", "no change")}</div>`);
        S[k].forEach((r, i) => box.appendChild(ruleRow(r, S[k], i, "grow")));
        const a = document.createElement("button"); a.type = "button"; a.className = "add"; a.textContent = `+ ${L2("добавить", "add")}`; a.onclick = () => { S[k].push(R("hit", 1)); render(); };
        box.appendChild(a); G.appendChild(box);
      }
    }
    root.querySelector(".fb-more").innerHTML = feat
      ? `<label class="fld"><span>${L2("Условие получения (текст)", "Requirement (text)")}</span><input type="text" class="fb-prereq" value="${esc(S.prereq)}"></label>
         <label><input type="checkbox" class="fb-twodecl" ${S.twoDecl ? "checked" : ""}> ${L2("Позволяет заявлять 2 таланта за ход", "Allows 2 declared talents per turn")}</label>`
      : `<div class="note">${L2("Расовую способность перетащите на лист персонажа или в компендиум рас.", "Drag the racial ability onto a character or into the race compendium.")}</div>`;
    tier(); sentence();
  }
  function tier() {
    const el = root.querySelector(".fb-tier");
    const t = tierOf(S.name);
    el.innerHTML = S.kind === "feat" && t.n > 1 ? `<div class="tier">✔ ${L2(`Ступень ${t.n}: при этом таланте «${esc(t.base)}» младших ступеней не суммируется.`, `Tier ${t.n}: lower tiers of “${esc(t.base)}” stop counting.`)}</div>` : "";
  }
  function sentence() {
    const p = root.querySelector(".fb-sentence");
    if (p) p.textContent = featSentence(S, S.name || "?");
  }
  async function create() {
    try {
      const built = buildFeatItem(S);
      const onto = game.user.isGM ? null : game.actors.get(root.querySelector(".fb-actor")?.value);
      let item;
      if (onto) [item] = await onto.createEmbeddedDocuments("Item", [built.data]);
      else { const folder = await ensureItemFolder(built.folder); item = await Item.implementation.create({ ...built.data, folder: folder?.id ?? null }); }
      log.unshift(`<div><i class="fa-solid fa-check"></i> <a data-uuid="${item.uuid}"><b>${esc(item.name)}</b></a> → ${esc(onto ? onto.name : built.folder.join(" / "))}</div>`);
      render();
    } catch (err) { ui.notifications.warn(err?.message ?? String(err)); }
  }
  root.addEventListener("click", (ev) => {
    const b = ev.target.closest("button, a");
    if (!b) return;
    const d = b.dataset;
    if (d.kind) { S = blank(d.kind); return render(); }
    if (d.ex) return load(d.ex);
    if (d.how) { S.how = d.how; if (S.kind === "race" && d.how === "toggle" && S.where === "all") S.where = "self_form"; if (S.kind === "race" && d.how !== "toggle" && S.where === "self_form") S.where = "all"; if (S.kind === "feat" && d.how === "button") S.form = "two"; if (S.kind === "feat" && d.how === "declare" && ["two", "counter"].includes(S.form)) S.form = "none"; return render(); }
    if (d.form) { S.form = d.form; return render(); }
    if (d.where) { S.where = d.where; return render(); }
    if (d.who) { S.who = d.who; return render(); }
    if (d.dur) { S.dur = d.dur; return render(); }
    if (b.classList.contains("fb-addrule")) { S.rules.push(R("hit", 1)); return render(); }
    if (b.classList.contains("create")) return create();
    if (d.uuid) return fromUuid(d.uuid).then((x) => x?.sheet?.render(true));
  });
  root.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.classList.contains("fb-name")) { S.name = t.value; tier(); return sentence(); }
    if (t.classList.contains("fb-mpc")) S.mpc = N(t.value);
    if (t.classList.contains("fb-limitn")) S.limitN = Math.max(1, N(t.value, 1));
    if (t.classList.contains("fb-formn")) S.formN = Math.max(2, N(t.value, 3));
    if (t.classList.contains("fb-dbln")) S.doubleN = Math.max(1, N(t.value, 3));
    if (t.classList.contains("fb-prereq")) S.prereq = t.value;
    if (t.classList.contains("fb-wcheck")) S.whereCheck = t.value.trim();
    sentence();
  });
  root.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.classList.contains("fb-on")) S.on = t.value;
    if (t.classList.contains("fb-off")) S.off = t.value;
    if (t.classList.contains("fb-after")) S.after = t.value;
    if (t.classList.contains("fb-wcat")) S.wArg = t.value;
    if (t.classList.contains("fb-othert")) S.otherT = t.checked;
    if (t.classList.contains("fb-twodecl")) S.twoDecl = t.checked;
    if (t.dataset.fb) S.forbid = t.checked ? [...new Set([...S.forbid, t.dataset.fb])] : S.forbid.filter((x) => x !== t.dataset.fb);
    if (t.classList.contains("fb-limit")) { S.limit = t.value; return render(); }
    sentence();
  });
  render();
  return dlg;
}

/* ------------------------------------------------------------------ *
 *  Registration
 * ------------------------------------------------------------------ */
export function registerFeats() {
  game.sw25 = Object.assign(game.sw25 ?? {}, { feats: { open: openFeatBuilder, build: buildFeatItem, featOf, activeFeats, attackMods, sentence: featSentence } });
  Hooks.on("renderItemDirectory", (app, htmlEl) => {
    const root = htmlEl instanceof HTMLElement ? htmlEl : htmlEl?.[0];
    if (!root || root.querySelector(".sw25-featbuilder")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-featbuilder";
    btn.innerHTML = `<i class="fa-solid fa-star"></i> ${L2("Конструктор талантов", "Talent constructor")}`;
    btn.addEventListener("click", () => openFeatBuilder());
    (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).appendChild(btn);
  });
  Hooks.on("renderChatMessageHTML", (message, html) => { try { bindAfterRoll(message, html); } catch (err) { console.error("SW25 | after-roll button", err); } });
}
