/**
 * [Round 94] Language-neutral names.
 * The rules engine recognises some items by NAME (classes, the death check, a few keywords).
 * Russian worlds use Russian names, an English table names its classes "Fighter", a ytsheet
 * import brings Japanese ones. Every such comparison goes through the alias lists below, so the
 * same code works whatever the language of the item is.
 * Only game terms live here — no book text.
 */
import { lang, isJa } from "./monstergen-i18n.mjs";

export const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** key -> [Russian, English (first = default), …other spellings, Japanese] */
export const CLASS = {
  fighter: ["Боец", "Fighter", "ファイター"],
  grappler: ["Громила", "Grappler", "グラップラー"],
  fencer: ["Фехтовальщик", "Fencer", "フェンサー"],
  shooter: ["Стрелок", "Marksman", "Shooter", "シューター"],
  battledancer: ["Боевой танцор", "Battle Dancer", "バトルダンサー"],
  sorcerer: ["Чародей", "Sorcerer", "ソーサラー"],
  conjurer: ["Призыватель", "Conjurer", "コンジャラー"],
  priest: ["Жрец", "Priest", "プリースト"],
  magitech: ["Конструктор", "Artificer", "Magitech", "マギテック"],
  fairytamer: ["Укротитель фей", "Fairy Tamer", "Fairytamer", "フェアリーテイマー"],
  druid: ["Друид", "Druid", "ドルイド"],
  daemonruler: ["Демонолог", "Demon Ruler", "Daemon Ruler", "デーモンルーラー"],
  scout: ["Разведчик", "Scout", "スカウト"],
  ranger: ["Рейнджер", "Ranger", "レンジャー"],
  sage: ["Мудрец", "Sage", "セージ"],
  enhancer: ["Усилитель", "Enhancer", "エンハンサー"],
  bard: ["Бард", "Bard", "バード"],
  rider: ["Всадник", "Rider", "ライダー"],
  alchemist: ["Алхимик", "Alchemist", "アルケミスト"],
  geomancer: ["Геомант", "Geomancer", "ジオマンサー"],
  warleader: ["Тактик", "Tactician", "Warleader", "War Leader", "ウォーリーダー"],
  darkhunter: ["Тёмный охотник", "Dark Hunter", "Darkhunter", "ダークハンター"],
};
/** Other items the engine looks up by name. */
export const ITEM = {
  deathcheck: ["Проверка смерти", "Death Check", "Death check", "生死判定"],
  tacspower: ["Предел", "Edge", "陣気"],
  poisonneedle: ["Ядовитая игла", "Poison Needle", "ポイズンニードル"],
  recovery: ["Восстановление", "Recovery", "リカバリィ"],
  renewal: ["Обновление", "Renewal"],
};

const index = (table) => {
  const m = new Map();
  for (const [key, list] of Object.entries(table)) for (const n of list) m.set(norm(n), key);
  return m;
};
const CLASS_IX = index(CLASS), ITEM_IX = index(ITEM);

/** "Боец" / "Fighter" / "ファイター" -> "fighter" (undefined for an unknown name). */
export const classKey = (name) => CLASS_IX.get(norm(name));
/** Is `name` one of the classes `keys`? */
export const isClass = (name, ...keys) => { const k = classKey(name); return !!k && keys.flat().includes(k); };
/** Same class, whatever the language ("Боец" == "Fighter"); unknown names compare as plain text. */
export const sameClass = (a, b) => { const ka = classKey(a), kb = classKey(b); return ka || kb ? ka === kb : norm(a) === norm(b); };
/** Default name of a class in the language of this client. */
const JP = /[\u3040-\u30ff\u4e00-\u9fff]/;
/** Name from an alias list in the client's language: Russian, Japanese (when the list has one), else English. */
const pickName = (list) => (lang() === "ru" ? list[0] : (isJa() && list.find((n) => JP.test(n))) || list[1]);
export const className = (key) => (CLASS[key] ? pickName(CLASS[key]) : key);
/** All spellings of a class key. */
export const classNames = (key) => CLASS[key] ?? [];

export const itemKey = (name) => ITEM_IX.get(norm(name));
export const isItem = (name, key) => itemKey(name) === key;
export const itemName = (key) => (ITEM[key] ? pickName(ITEM[key]) : key);

/** The actor's own skill item of one of the classes `keys` (highest level first). */
export function findClassItem(actor, ...keys) {
  return actor?.items
    ?.filter((i) => i.type === "skill" && isClass(i.name, keys))
    .sort((a, b) => Number(b.system.skilllevel) - Number(a.system.skilllevel))[0] ?? null;
}
/** Level of the actor in one of the classes `keys` (0 when none). */
export const classLevel = (actor, ...keys) => Number(findClassItem(actor, ...keys)?.system.skilllevel ?? 0);
