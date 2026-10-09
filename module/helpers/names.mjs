/**
 * [Round 94] Language-neutral names.
 * The rules engine recognises some items by NAME (classes, the death check, a few keywords).
 * Russian worlds use Russian names, an English table names its classes "Fighter", a ytsheet
 * import brings Japanese ones. Every such comparison goes through the alias lists below, so the
 * same code works whatever the language of the item is.
 * Only game terms live here — no book text.
 */
import { lang } from "./monstergen-i18n.mjs";

export const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** key -> [Russian, English (first = default), …other spellings, Japanese] */
export const CLASS = {
  fighter: ["Боец", "Fighter", "ファイター"],
  grappler: ["Громила", "Grappler", "グラップラー"],
  fencer: ["Фехтовальщик", "Fencer", "フェンサー"],
  shooter: ["Стрелок", "Shooter", "Marksman", "シューター"],
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
  warleader: ["Тактик", "Warleader", "War Leader", "Tactician", "ウォーリーダー"],
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
export const className = (key) => (CLASS[key] ? CLASS[key][lang() === "ru" ? 0 : 1] : key);
/** All spellings of a class key. */
export const classNames = (key) => CLASS[key] ?? [];

export const itemKey = (name) => ITEM_IX.get(norm(name));
export const isItem = (name, key) => itemKey(name) === key;
export const itemName = (key) => (ITEM[key] ? ITEM[key][lang() === "ru" ? 0 : 1] : key);

/** The actor's own skill item of one of the classes `keys` (highest level first). */
export function findClassItem(actor, ...keys) {
  return actor?.items
    ?.filter((i) => i.type === "skill" && isClass(i.name, keys))
    .sort((a, b) => Number(b.system.skilllevel) - Number(a.system.skilllevel))[0] ?? null;
}
/** Level of the actor in one of the classes `keys` (0 when none). */
export const classLevel = (actor, ...keys) => Number(findClassItem(actor, ...keys)?.system.skilllevel ?? 0);
