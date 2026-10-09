import { isClass, CLASS, className } from "./names.mjs";
import { L2 } from "./monstergen-i18n.mjs";
import { canon } from "./ability-names.mjs";
/**
 * [Round 62] Auto-grant "Автоматически приобретаемые" (auto-learned, zero
 * player choice) class combat talents the instant a character's class
 * level reaches the book's required threshold — SW25 core rulebooks I/II/
 * III. Sibling pattern to helpers/deathcheck.mjs's auto-embed-if-missing
 * fix from Round 61, applied to a whole table instead of one fixed item.
 *
 * SCOPE — deliberately narrow, discussed with the user before writing this:
 * SW25's talent catalog has TWO different kinds of "class ability" —
 * ones the PLAYER SELECTS from a list at level-up (on the combatability
 * item, `system.condtype` is "premise" — a prerequisite gate the player
 * must meet to be ALLOWED to pick it, not an instruction to auto-grant it
 * — or "replace", a tier upgrade the player chooses to take), and ones the
 * book says are learned automatically with no choice involved at all
 * (`system.condtype === "learn"`). Auto-granting only makes sense for the
 * second kind — blindly auto-picking from the selectable pool would
 * silently make a real build decision FOR the player, which would be
 * wrong regardless of how convenient it'd be. This file only ever touches
 * condtype:"learn" items: verified live as exactly 20 items across all
 * three books (`game.items.filter(i => i.type === "combatability" &&
 * i.system.condtype === "learn").length === 20`), matching the book
 * page-count catalog's 4+8+8 tally in
 * the project notes on talents ("Автоматически приобретаемые
 * пассивные боевые таланты" sections, ОКП I p.265 / ОКП II p.209-211 /
 * ОКП III p.204-205) — strong signal this table is the complete set, not
 * a partial scan.
 *
 * WHY A HAND-WRITTEN TABLE, NOT A system.cond PARSER: each item's own
 * system.cond field already states its (class, level) requirement as
 * free text, but the 20 real values use several different phrasings, not
 * one consistent grammar — "Рейнджер 15 уровня", "Уровень класса Рейнджер
 * 5", "Класс Мудреца 5-го уровня" (genitive case), "Любой класс
 * Магического типа 11 уровня" (a type-category, not a class name at all),
 * "Боец или Громила 13 уровня" (two classes, either counts). A generic
 * regex parser over that would be more likely to silently mis-grant
 * something than a table this small checked by hand once. Every row below
 * was transcribed directly from that item's live system.cond value (see
 * project progress doc, Round 62, for the raw dump this was built from).
 * If a 21st "learn" item is ever added to the world, it needs a new row
 * here by hand too — this does NOT try to auto-discover new entries by
 * re-parsing system.cond at runtime.
 *
 * WHY NOTHING IS EVER REMOVED: if a class level is later lowered (player
 * mis-click, respec, etc.) this never strips an already-granted talent —
 * same conservative rule this project uses everywhere else for
 * consequential changes ("никогда не автоматизируется без предупреждения"
 * — see sw25-named-abilities-coverage.md). Removing something a player may
 * have already built around is a GM decision, not this hook's.
 */

const AUTO_CLASS_FEATURES = [
  // Громила
  { item: "Цепная атака", classes: ["grappler"], level: 1 },
  { item: "Встречный удар", classes: ["grappler"], level: 7 },
  // Боец
  { item: "Прочность", classes: ["fighter"], level: 7 },
  // Боец или Громила
  { item: "Мастер боя", classes: ["fighter", "grappler"], level: 13 },
  // Разведчик
  { item: "Охота за сокровищами", classes: ["scout"], level: 5 },
  { item: "Быстрое действие", classes: ["scout"], level: 7 },
  { item: "Крадущаяся тень", classes: ["scout"], level: 9 },
  { item: "Мастер сокровищ", classes: ["scout"], level: 12 },
  { item: "Мастер навыков", classes: ["scout"], level: 15 },
  // Рейнджер
  { item: "Выживаемость", classes: ["ranger"], level: 5 },
  { item: "Неукротимый", classes: ["ranger"], level: 7 },
  { item: "Мастер зелий", classes: ["ranger"], level: 9 },
  { item: "Сюкути", classes: ["ranger"], level: 12 },
  { item: "Беги и стреляй", classes: ["ranger"], level: 15 },
  // Мудрец
  { item: "Зоркие глаза", classes: ["sage"], level: 5 },
  { item: "Использование слабых мест", classes: ["sage"], level: 7 },
  { item: "Экономия маны", classes: ["sage"], level: 9 },
  { item: "Сопротивление мане", classes: ["sage"], level: 12 },
  { item: "Премудрость мудреца", classes: ["sage"], level: 15 },
  // Любой класс Магического типа (skilltype: "magicuserskill" — same
  // category actor-sheet.mjs/item.mjs already use for "Магический тип
  // (Мощность магии)" checkskill matching; note "Мудрец" is NOT this
  // category in this world's data (skilltype "otherskill"), so it does
  // not count toward this one even though it counts toward the rows above.
  { item: "Мастер рун", category: "magicuserskill", level: 11 },
];

// [Round 66] per-actor queue: two level changes in quick succession (double
// click on "+", or one update touching two classes) used to run
// concurrently, both saw "not granted yet" and both created the talent.
const _queues = new Map();

/**
 * Auto-embeds any AUTO_CLASS_FEATURES entry the actor now qualifies for
 * and doesn't already have. Idempotent and serialized per actor; all
 * missing talents are created in ONE batch. Returns the names granted.
 */
export function grantAutoClassFeatures(actor) {
  if (!actor || actor.type !== "character") return Promise.resolve([]);
  const key = actor.uuid;
  const prev = _queues.get(key) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => _grant(actor))
    .finally(() => {
      if (_queues.get(key) === next) _queues.delete(key);
    });
  _queues.set(key, next);
  return next;
}

/** World item first, then any Item compendium (new worlds keep talents only in packs). */
async function findSource(name) {
  const local = game.items?.find(
    (i) => i.type === "combatability" && canon(i.name) === name && i.system?.condtype === "learn"
  );
  if (local) return local.toObject();
  for (const pack of game.packs.filter((p) => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["type", "system.condtype"] });
    const entry = index.find(
      (e) => canon(e.name) === name && e.type === "combatability" &&
        (e.system?.condtype === undefined || e.system?.condtype === "learn")
    );
    if (entry) {
      const doc = await pack.getDocument(entry._id);
      if (doc) return doc.toObject();
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 *  [2026-10-07] Auto-grant rule stored on the talent itself
 *  flags.sw25.autoGrant = { cls: <class key from names.mjs | "magic">, level: N }
 * ------------------------------------------------------------------ */
const MAGIC = "magic";
const ruleOf = (flags) => {
  const r = flags?.sw25?.autoGrant;
  const level = Math.round(Number(r?.level) || 0);
  return r?.cls && level >= 1 ? { cls: String(r.cls), level } : null;
};
/** Every talent with an auto-grant rule: world items first, then Item compendiums. */
async function flaggedSources() {
  const out = [];
  for (const i of game.items ?? []) {
    const rule = i.type === "combatability" ? ruleOf(i.flags) : null;
    if (rule) out.push({ name: i.name, rule, load: async () => i.toObject() });
  }
  for (const pack of game.packs.filter((p) => p.documentName === "Item")) {
    let index;
    try { index = await pack.getIndex({ fields: ["type", "flags.sw25.autoGrant"] }); } catch (_e) { continue; }
    for (const e of index) {
      const rule = e.type === "combatability" ? ruleOf(e.flags) : null;
      if (rule && !out.some((o) => canon(o.name) === canon(e.name))) out.push({ name: e.name, rule, load: async () => (await pack.getDocument(e._id))?.toObject() ?? null });
    }
  }
  return out;
}

/** The «выдавать автоматически» row on the sheet of a talent that is not on a character. */
function injectAutoGrantRow(app, html) {
  const item = app.item ?? app.object ?? app.document;
  if (!item || item.type !== "combatability" || item.actor) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const anchor = root?.querySelector("nav.sheet-tabs") ?? root?.querySelector(".sheet-body");
  if (!anchor || root.querySelector(".sw25-autogrant")) return;
  const cur = item.flags?.sw25?.autoGrant ?? {};
  const esc = (x) => foundry.utils.escapeHTML(String(x));
  const opts = [["", L2("нет — игрок выбирает сам", "no — the player picks it")], ...Object.keys(CLASS).map((k) => [k, className(k)]), [MAGIC, L2("любой магический класс", "any magic-user class")]]
    .map(([v, l]) => `<option value="${esc(v)}"${v === (cur.cls ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("");
  const row = document.createElement("div");
  row.className = "sw25-autogrant";
  row.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:3px 6px;font-size:.9em;border-top:1px solid #8884;border-bottom:1px solid #8884";
  row.innerHTML = `<i class="fa-solid fa-graduation-cap"></i><b>${L2("Выдавать автоматически", "Grant automatically")}</b>
    <label>${L2("класс", "class")} <select name="sw25ag-cls" style="width:auto">${opts}</select></label>
    <label>${L2("с уровня", "from level")} <input type="number" name="sw25ag-level" min="1" max="20" step="1" value="${Math.max(1, Math.round(Number(cur.level) || 1))}" style="width:4em"></label>`;
  anchor.parentNode.insertBefore(row, anchor);
  const editable = app.isEditable ?? app.options?.editable ?? true;
  row.querySelectorAll("select, input").forEach((el) => {
    el.disabled = !editable;
    // keep these two fields out of the sheet's own form submit
    el.addEventListener("change", async (ev) => {
      ev.stopPropagation();
      const cls = row.querySelector("[name=sw25ag-cls]").value;
      const level = Math.max(1, Math.round(Number(row.querySelector("[name=sw25ag-level]").value) || 1));
      await item.update({ "flags.sw25.autoGrant": { cls, level } });
    });
  });
}

export function registerAutoGrant() {
  Hooks.on("renderItemSheet", injectAutoGrantRow);
}

async function _grant(actor) {
  const classItems = actor.items.filter((i) => i.type === "skill");
  const toCreate = [];

  for (const entry of AUTO_CLASS_FEATURES) {
    const already = actor.items.find(
      (i) => i.type === "combatability" && canon(i.name) === entry.item
    );
    if (already) continue;
    if (toCreate.some((d) => canon(d.name) === entry.item)) continue;

    const eligible = classItems.some((cls) => {
      const lvl = Number(cls.system?.skilllevel) || 0;
      if (lvl < entry.level) return false;
      if (entry.classes) return isClass(cls.name, entry.classes); // class keys, see names.mjs
      if (entry.category) return cls.system?.skilltype === entry.category;
      return false;
    });
    if (!eligible) continue;

    const source = await findSource(entry.item);
    if (!source) {
      // expected in a world without the talent items (the public build ships none): not a warning
      console.debug(
        `SW25 | grantAutoClassFeatures: "${entry.item}" (condtype learn) not found in world items or compendiums — skipped for "${actor.name}".`
      );
      continue;
    }
    delete source._id;
    toCreate.push(source);
  }

  // [2026-10-07] talents the GM marked on the item itself («выдавать автоматически: класс, уровень»).
  // The name does not matter here, so every table can call its talents whatever it likes.
  for (const src of await flaggedSources()) {
    const { cls, level } = src.rule;
    const eligible = classItems.some((c) => {
      if ((Number(c.system?.skilllevel) || 0) < level) return false;
      return cls === MAGIC ? c.system?.skilltype === "magicuserskill" : isClass(c.name, cls);
    });
    if (!eligible) continue;
    const name = canon(src.name);
    if (actor.items.some((i) => i.type === "combatability" && canon(i.name) === name)) continue;
    if (toCreate.some((d) => canon(d.name) === name)) continue;
    const data = await src.load();
    if (!data) continue;
    delete data._id;
    toCreate.push(data);
  }

  if (!toCreate.length) return [];
  try {
    const created = await actor.createEmbeddedDocuments("Item", toCreate);
    const granted = created.map((c) => c.name);
    console.log(
      `SW25 | grantAutoClassFeatures: auto-added [${granted.join(", ")}] to "${actor.name}".`
    );
    return granted;
  } catch (err) {
    console.error(`SW25 | grantAutoClassFeatures: failed on "${actor.name}":`, err);
    return [];
  }
}
