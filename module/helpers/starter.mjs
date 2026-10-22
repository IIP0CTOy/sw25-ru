/**
 * [Round 95] Starter compendiums.
 * The public system ships without rulebook content, but the character wizard and the sheets need
 * a few reference items: classes, skill checks, racial abilities and Enhancer techniques.
 * `module/data/starter.json` holds them as bare mechanics (names, numbers, one-line summaries in
 * our own words — no book text) in Russian, English and Japanese; this module turns that file into WORLD
 * compendiums in the language of the GM who builds them.
 */
import { L2, uiLang } from "./monstergen-i18n.mjs";
import { extraData } from "./catalog.mjs";
import { GUIDE, GUIDE_TITLE } from "./guide.mjs";
import { GUIDE_JA, GUIDE_TITLE_JA } from "./guide-ja.mjs";

const KINDS = {
  classes: { name: "sw25-classes", label: ["Классы", "Classes", "技能"], legacy: "ru-classes" },
  checks: { name: "sw25-checks", label: ["Проверки умений", "Skill checks", "判定"], legacy: "ru-checks" },
  races: { name: "sw25-races", label: ["Расовые способности", "Racial abilities", "種族特徴"], legacy: "ru-races" },
  techniques: { name: "sw25-techniques", label: ["Техники Усилителя", "Enhancer techniques", "練技"], legacy: "ru-enhancearts" },
  // the next three are filled only from module data (catalog.mjs extraData); the system has no such data
  golemparts: { name: "sw25-golem-parts", label: ["Улучшения големов", "Golem Enhancing Items", "ゴーレム強化パーツ"], legacy: null },
  gear: { name: "sw25-gear", label: ["Снаряжение", "Gear", "装備品"], legacy: null },
  abyss: { name: "sw25-abyss", label: ["Улучшения и Бездна", "Upgrades and Abyss", "強化とアビス"], legacy: null },
};
const FOLDER = "SW25 — Starter";
const hasContent = (p) => !!p && (p.index?.size ?? 0) > 0;

/**
 * The compendium to read `kind` from ("classes" | "checks" | "races" | "techniques"):
 * a full content pack of the system when there is one, else the starter pack of the world.
 */
export function starterPack(kind) {
  const k = KINDS[kind];
  if (!k) return null;
  const sys = k.legacy ? game.packs.get(`${game.system.id}.${k.legacy}`) : null;
  // SW25_STARTER_ONLY: test switch — behave like an install without content packs
  if (hasContent(sys) && !globalThis.SW25_STARTER_ONLY) return sys;
  return game.packs.get(`world.${k.name}`) ?? sys ?? null;
}
/** True when every kind already has a compendium with something in it. */
export const starterReady = () => Object.keys(KINDS).filter((k) => KINDS[k].legacy).every((k) => hasContent(starterPack(k)));

let _data = null;
async function loadData() {
  if (_data) return _data;
  const r = await fetch(`systems/${game.system.id}/module/data/starter.json`);
  if (!r.ok) throw new Error(`starter.json: HTTP ${r.status}`);
  const data = await r.json();
  // module data adds its kinds; its version is part of the version (new data rebuilds the packs)
  const ex = await extraData();
  for (const k of ["golemparts", "gear", "abyss"]) if (Array.isArray(ex[k])) data[k] = ex[k];
  if (ex.version) data.version = `${data.version ?? ""}+${ex.version}`;
  return (_data = data);
}

/** One entry of starter.json -> Item data in language `L` ("ru" | "en" | "ja"). */
function toItem(e, L, folderId) {
  const system = foundry.utils.deepClone(e.system ?? {});
  for (const [k, v] of Object.entries(e.loc ?? {})) system[k] = v[L] ?? v.en ?? v.ru ?? "";
  // a full text (HTML) from the data wins over the one-line overview
  if (system.overview && !e.loc?.description) system.description = `<p>${foundry.utils.escapeHTML(system.overview)}</p>`;
  const name = e.name[L] ?? e.name.en ?? e.name.ru;
  const effects = (e.effects ?? []).map((f) => ({
    name, img: f.img, transfer: !!f.transfer, disabled: !!f.disabled,
    system: { changes: (f.changes[L] ?? f.changes.en ?? f.changes.ru).map(([key, value]) => ({ key, type: "add", value, phase: "initial" })) },
  }));
  return { name, type: e.type, img: e.img, system, effects, flags: foundry.utils.mergeObject({ sw25: { starter: true } }, e.flags ?? {}), folder: folderId ?? null };
}

/**
 * Create (or refill) the starter compendiums of this world.
 * @param {object} [o]
 * @param {"ru"|"en"|"ja"} [o.language]  language of the items; default: the language of this client
 * @param {boolean} [o.force]       rebuild packs that already have content (their items are replaced)
 * @returns {Promise<{created: Record<string, number>, skipped: string[]}>}
 */
export async function buildStarter({ language = uiLang(), force = false, only = null } = {}) {
  if (!game.user.isGM) { ui.notifications.warn(L2("Стартовые компендиумы создаёт ГМ.", "Only the GM can build the starter compendiums.")); return null; }
  const L = ["ru", "ja"].includes(language) ? language : "en";
  const data = await loadData();
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  const out = { created: {}, skipped: [] };
  for (const [kind, k] of Object.entries(KINDS)) {
    if (only && !only.includes(kind)) continue;
    if (!data[kind]?.length) continue;
    let pack = game.packs.get(`world.${k.name}`);
    if (hasContent(pack) && !force) { out.skipped.push(kind); continue; }
    const label = `SW25: ${k.label[{ ru: 0, en: 1, ja: 2 }[L]]}`;
    // a compendium label cannot be changed after creation: a pack in another language is recreated
    if (pack && pack.metadata.label !== label) { if (pack.locked) await pack.configure({ locked: false }); await pack.deleteCompendium(); pack = null; }
    if (!pack) pack = await CC.createCompendium({ name: k.name, label, type: "Item", system: game.system.id });
    if (pack.locked) await pack.configure({ locked: false });
    if (hasContent(pack)) {
      await pack.getIndex();
      await Item.implementation.deleteDocuments(pack.index.map((i) => i._id), { pack: pack.collection });
      if (pack.folders?.size) await Folder.implementation.deleteDocuments(pack.folders.map((f) => f.id), { pack: pack.collection });
    }
    const folders = {};
    for (const fname of [...new Set(data[kind].map((e) => e.folder?.[L]).filter(Boolean))].sort()) {
      const f = await Folder.implementation.create({ name: fname, type: "Item" }, { pack: pack.collection });
      folders[fname] = f.id;
    }
    const items = data[kind].map((e) => toItem(e, L, folders[e.folder?.[L]]));
    const made = await Item.implementation.createDocuments(items, { pack: pack.collection });
    out.created[kind] = made.length;
    await pack.configure({ locked: true, ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" } }).catch(() => {});
  }
  // keep the four packs together in the sidebar
  try {
    let folder = game.folders.find((f) => f.type === "Compendium" && f.name === FOLDER);
    if (!folder && Object.keys(out.created).length) folder = await Folder.implementation.create({ name: FOLDER, type: "Compendium", color: "#6b2d1f" });
    if (folder) for (const k of Object.values(KINDS)) { const p = game.packs.get(`world.${k.name}`); if (p && p.folder?.id !== folder.id) await p.setFolder(folder); }
  } catch (err) { console.warn("SW25 | starter: compendium folder", err); }
  if (!only) try { await buildGuide({ language: L, force }); } catch (err) { console.error("SW25 | guide:", err); }
  const n = Object.values(out.created).reduce((a, b) => a + b, 0);
  if (n) ui.notifications.info(L2(`SW25: созданы стартовые компендиумы — предметов: ${n}.`, `SW25: starter compendiums built — ${n} items.`));
  else ui.notifications.info(L2("SW25: стартовые компендиумы уже есть.", "SW25: the starter compendiums already exist."));
  return out;
}

/**
 * [2026-10-07] The built-in guide as a Journal compendium of the world ("SW25: Руководство").
 * @param {object} [o]
 * @param {"ru"|"en"|"ja"} [o.language]
 * @param {boolean} [o.force]  rebuild an existing guide
 */
const GUIDE_PACK = "sw25-guide";
export async function buildGuide({ language = uiLang(), force = false } = {}) {
  if (!game.user.isGM) return null;
  const i = language === "ru" ? 0 : 1;
  const jp = language === "ja";
  const title = jp ? GUIDE_TITLE_JA : GUIDE_TITLE[i];
  const pages = jp ? GUIDE_JA.map((p) => ({ title: p.title, html: p.html })) : GUIDE.map((p) => ({ title: p.title[i], html: p.html[i] }));
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  let pack = game.packs.get(`world.${GUIDE_PACK}`);
  if (hasContent(pack) && !force) return pack;
  const label = jp ? "SW25: ガイド" : i === 0 ? "SW25: Руководство" : "SW25: Guide";
  if (pack && pack.metadata.label !== label) { if (pack.locked) await pack.configure({ locked: false }); await pack.deleteCompendium(); pack = null; }
  if (!pack) pack = await CC.createCompendium({ name: GUIDE_PACK, label, type: "JournalEntry" });
  if (pack.locked) await pack.configure({ locked: false });
  await pack.getIndex();
  if (pack.index.size) await JournalEntry.implementation.deleteDocuments(pack.index.map((e) => e._id), { pack: pack.collection });
  await JournalEntry.implementation.create({
    name: title,
    pages: pages.map((p, n) => ({ name: p.title, type: "text", sort: (n + 1) * 100000, title: { show: true, level: 1 }, text: { content: p.html, format: 1 } })),
    flags: { sw25: { guide: true } },
  }, { pack: pack.collection });
  await pack.configure({ locked: true, ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" } }).catch(() => {});
  try {
    const folder = game.folders.find((f) => f.type === "Compendium" && f.name === FOLDER) ?? await Folder.implementation.create({ name: FOLDER, type: "Compendium", color: "#6b2d1f" });
    if (pack.folder?.id !== folder.id) await pack.setFolder(folder);
  } catch (err) { console.warn("SW25 | guide: compendium folder", err); }
  return pack;
}

async function askAndBuild() {
  const DialogV2 = foundry.applications.api.DialogV2;
  const have = Object.values(KINDS).some((k) => hasContent(game.packs.get(`world.${k.name}`)));
  const choice = await DialogV2.wait({
    window: { title: L2("SW25: стартовые компендиумы", "SW25: starter compendiums") }, rejectClose: false,
    content: `<p>${L2("Классы, проверки умений, расовые способности и техники Усилителя — только названия и числа, без текста книг. Они нужны мастеру создания персонажа и листам. Вместе с ними создаётся руководство «SW25: как создавать предметы и умения».", "Classes, skill checks, racial abilities and Enhancer techniques — names and numbers only, no rulebook text. The character wizard and the sheets use them. The guide “SW25: how to make items and abilities” is built with them.")}</p>`
      + (have ? `<p>${L2("Компендиумы уже есть: выбор языка пересоздаст их, свои правки в них пропадут.", "The compendiums already exist: choosing a language rebuilds them and your edits inside them are lost.")}</p>` : "")
      + `<p>${L2("«Примеры» пересоздаёт встроенных персонажей и монстров на языке этого клиента; правки в них пропадут.", "“Samples” rebuilds the built-in characters and monsters in the language of this client; edits made to them are lost.")}</p>`,
    buttons: [
      { action: "ru", label: "Русский", callback: () => "ru" },
      { action: "en", label: "English", callback: () => "en" },
      { action: "ja", label: "日本語", callback: () => "ja" },
      { action: "samples", label: L2("Примеры: персонажи и монстры", "Samples: characters and monsters"), callback: () => "samples" },
      { action: "cancel", label: L2("Отмена", "Cancel"), callback: () => null },
    ],
  }).catch(() => null);
  // rebuilt in the language of this client (samples keep the language they were made in)
  if (choice === "samples") return game.sw25?.samples?.build?.({ force: true });
  if (["ru", "en", "ja"].includes(choice)) return buildStarter({ language: choice, force: true });
  return null;
}

/* ------------------------------------------------------------------ *
 *  Updates: starter.json carries "version". When the system brings a different version, the starter
 *  packs of the world are simply rebuilt (in the language they were built in). Kinds that come from
 *  the system's own content packs (a world like klaud) are left alone. No partial merging.
 * ------------------------------------------------------------------ */
const sysPackHas = (kind) => { const k = KINDS[kind]; return !!k.legacy && hasContent(game.packs.get(`${game.system.id}.${k.legacy}`)) && !globalThis.SW25_STARTER_ONLY; };
/** Language the starter packs of this world were built in (from their labels). */
function packLanguage() {
  for (const k of Object.values(KINDS)) {
    const lab = String(game.packs.get(`world.${k.name}`)?.metadata?.label ?? "").replace(/^SW25:\s*/, "");
    const i = k.label.indexOf(lab);
    if (i >= 0) return ["ru", "en", "ja"][i];
  }
  return uiLang();
}
/** One-time notice for the GM: starter packs are rebuilt with new versions, keep your own edits elsewhere. */
async function starterNotice() {
  if (game.settings.get(game.system.id, "starterNoticeShown")) return;
  await game.settings.set(game.system.id, "starterNoticeShown", true);
  const DialogV2 = foundry.applications.api.DialogV2;
  await DialogV2.prompt({
    window: { title: L2("SW25: стартовые компендиумы", "SW25: starter compendiums") },
    content: `<p>${L2("Стартовые компендиумы «SW25: …» собираются системой и <b>пересобираются при обновлениях</b>: в новых версиях их данные могут меняться.", "The «SW25: …» starter compendiums are built by the system and <b>rebuilt on updates</b>: their data may change in future versions.")}</p>
      <p>${L2("Пожалуйста, не вносите в них правки — они пропадут. Нужен свой вариант предмета — перетащите его в мир или в свой компендиум и правьте там.", "Please don't edit them — the edits would be lost. Need your own version of an item — drag it into the world or your own compendium and edit it there.")}</p>`,
    ok: { label: L2("Понятно", "Got it") },
    rejectClose: false,
  }).catch(() => null);
}

async function refreshStarter() {
  const data = await loadData();
  const ver = String(data.version ?? "");
  if (game.settings.get(game.system.id, "starterVersion") === ver) return;
  const kinds = Object.keys(KINDS).filter((kind) => !sysPackHas(kind));
  if (kinds.length) await buildStarter({ language: packLanguage(), force: true, only: kinds });
  await game.settings.set(game.system.id, "starterVersion", ver);
  if (kinds.length) await starterNotice();
}

export function registerStarter() {
  game.settings.register(game.system.id, "starterOffered", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(game.system.id, "guideOffered", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(game.system.id, "starterVersion", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(game.system.id, "starterNoticeShown", { scope: "world", config: false, type: Boolean, default: false });
  game.sw25 = Object.assign(game.sw25 ?? {}, { starter: { build: buildStarter, open: askAndBuild, pack: starterPack, ready: starterReady, guide: buildGuide, refresh: refreshStarter } });
  // a fresh world without content packs: the active GM gets the starter set once, in their own language
  Hooks.once("ready", async () => {
    try {
      if (!game.user.isGM || game.user.id !== game.users.activeGM?.id) return;
      // the guide is added once to every world, old ones included
      if (!game.settings.get(game.system.id, "guideOffered")) {
        await game.settings.set(game.system.id, "guideOffered", true);
        try { await buildGuide(); } catch (err) { console.error("SW25 | guide:", err); }
      }
      // an older world: a new version of the starter data rebuilds its starter packs
      if (game.settings.get(game.system.id, "starterOffered")) {
        try { await refreshStarter(); } catch (err) { console.error("SW25 | starter refresh:", err); }
        return;
      }
      await game.settings.set(game.system.id, "starterOffered", true);
      const missing = Object.keys(KINDS).filter((kind) => !hasContent(starterPack(kind)));
      if (starterReady() && missing.length) await buildStarter({ only: missing });   // content packs present: only what they lack (golem enhancements)
      if (!starterReady()) {
        await buildStarter();
        // a fresh world also gets the sample characters and monsters to try things out with
        try { await game.sw25?.samples?.build?.(); } catch (err) { console.error("SW25 | samples:", err); }
      }
      await game.settings.set(game.system.id, "starterVersion", String((await loadData()).version ?? ""));
      if (missing.length) await starterNotice();
    } catch (err) { console.error("SW25 | starter compendiums:", err); }
  });
  Hooks.on("renderCompendiumDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || !game.user.isGM || root.querySelector(".sw25-starter")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-starter";
    btn.innerHTML = `<i class="fa-solid fa-box-open"></i> ${L2("SW25: стартовые компендиумы", "SW25: starter compendiums")}`;
    btn.addEventListener("click", () => askAndBuild());
    (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).appendChild(btn);
  });
}
