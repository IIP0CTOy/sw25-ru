/**
 * [Round 95] Starter compendiums.
 * The public system ships without rulebook content, but the character wizard and the sheets need
 * a few reference items: classes, skill checks, racial abilities and Enhancer techniques.
 * `module/data/starter.json` holds them as bare mechanics (names, numbers, one-line summaries in
 * our own words — no book text) in Russian and English; this module turns that file into WORLD
 * compendiums in the language of the GM who builds them.
 */
import { L2, lang } from "./monstergen-i18n.mjs";
import { GUIDE, GUIDE_TITLE } from "./guide.mjs";

const KINDS = {
  classes: { name: "sw25-classes", label: ["Классы", "Classes"], legacy: "ru-classes" },
  checks: { name: "sw25-checks", label: ["Проверки умений", "Skill checks"], legacy: "ru-checks" },
  races: { name: "sw25-races", label: ["Расовые способности", "Racial abilities"], legacy: "ru-races" },
  techniques: { name: "sw25-techniques", label: ["Техники Усилителя", "Enhancer techniques"], legacy: "ru-enhancearts" },
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
  const sys = game.packs.get(`${game.system.id}.${k.legacy}`);
  // SW25_STARTER_ONLY: test switch — behave like an install without content packs
  if (hasContent(sys) && !globalThis.SW25_STARTER_ONLY) return sys;
  return game.packs.get(`world.${k.name}`) ?? sys ?? null;
}
/** True when every kind already has a compendium with something in it. */
export const starterReady = () => Object.keys(KINDS).every((k) => hasContent(starterPack(k)));

let _data = null;
async function loadData() {
  if (_data) return _data;
  const r = await fetch(`systems/${game.system.id}/module/data/starter.json`);
  if (!r.ok) throw new Error(`starter.json: HTTP ${r.status}`);
  return (_data = await r.json());
}

/** One entry of starter.json -> Item data in language `L` ("ru" | "en"). */
function toItem(e, L, folderId) {
  const system = foundry.utils.deepClone(e.system ?? {});
  for (const [k, v] of Object.entries(e.loc ?? {})) system[k] = v[L] ?? v.en ?? v.ru ?? "";
  if (system.overview) system.description = `<p>${foundry.utils.escapeHTML(system.overview)}</p>`;
  const name = e.name[L] ?? e.name.en ?? e.name.ru;
  const effects = (e.effects ?? []).map((f) => ({
    name, img: f.img, transfer: !!f.transfer, disabled: !!f.disabled,
    system: { changes: (f.changes[L] ?? f.changes.ru).map(([key, value]) => ({ key, type: "add", value, phase: "initial" })) },
  }));
  return { name, type: e.type, img: e.img, system, effects, flags: foundry.utils.mergeObject({ sw25: { starter: true } }, e.flags ?? {}), folder: folderId ?? null };
}

/**
 * Create (or refill) the starter compendiums of this world.
 * @param {object} [o]
 * @param {"ru"|"en"} [o.language]  language of the items; default: the language of this client
 * @param {boolean} [o.force]       rebuild packs that already have content (their items are replaced)
 * @returns {Promise<{created: Record<string, number>, skipped: string[]}>}
 */
export async function buildStarter({ language = lang(), force = false } = {}) {
  if (!game.user.isGM) { ui.notifications.warn(L2("Стартовые компендиумы создаёт ГМ.", "Only the GM can build the starter compendiums.")); return null; }
  const L = language === "ru" ? "ru" : "en";
  const data = await loadData();
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  const out = { created: {}, skipped: [] };
  for (const [kind, k] of Object.entries(KINDS)) {
    let pack = game.packs.get(`world.${k.name}`);
    if (hasContent(pack) && !force) { out.skipped.push(kind); continue; }
    if (!pack) pack = await CC.createCompendium({ name: k.name, label: `SW25: ${k.label[L === "ru" ? 0 : 1]}`, type: "Item", system: game.system.id });
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
  try { await buildGuide({ language: L, force }); } catch (err) { console.error("SW25 | guide:", err); }
  const n = Object.values(out.created).reduce((a, b) => a + b, 0);
  if (n) ui.notifications.info(L2(`SW25: созданы стартовые компендиумы (классы, проверки, расовые способности, техники) — предметов: ${n}.`, `SW25: starter compendiums built (classes, checks, racial abilities, techniques) — ${n} items.`));
  else ui.notifications.info(L2("SW25: стартовые компендиумы уже есть.", "SW25: the starter compendiums already exist."));
  return out;
}

/**
 * [2026-10-07] The built-in guide as a Journal compendium of the world ("SW25: Руководство").
 * @param {object} [o]
 * @param {"ru"|"en"} [o.language]
 * @param {boolean} [o.force]  rebuild an existing guide
 */
const GUIDE_PACK = "sw25-guide";
export async function buildGuide({ language = lang(), force = false } = {}) {
  if (!game.user.isGM) return null;
  const i = language === "ru" ? 0 : 1;
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  let pack = game.packs.get(`world.${GUIDE_PACK}`);
  if (hasContent(pack) && !force) return pack;
  if (!pack) pack = await CC.createCompendium({ name: GUIDE_PACK, label: i === 0 ? "SW25: Руководство" : "SW25: Guide", type: "JournalEntry" });
  if (pack.locked) await pack.configure({ locked: false });
  await pack.getIndex();
  if (pack.index.size) await JournalEntry.implementation.deleteDocuments(pack.index.map((e) => e._id), { pack: pack.collection });
  await JournalEntry.implementation.create({
    name: GUIDE_TITLE[i],
    pages: GUIDE.map((p, n) => ({ name: p.title[i], type: "text", sort: (n + 1) * 100000, title: { show: true, level: 1 }, text: { content: p.html[i], format: 1 } })),
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
      { action: "samples", label: L2("Примеры: персонажи и монстры", "Samples: characters and monsters"), callback: () => "samples" },
      { action: "cancel", label: L2("Отмена", "Cancel"), callback: () => null },
    ],
  }).catch(() => null);
  // rebuilt in the language of this client (samples keep the language they were made in)
  if (choice === "samples") return game.sw25?.samples?.build?.({ force: true });
  if (choice === "ru" || choice === "en") return buildStarter({ language: choice, force: true });
  return null;
}

export function registerStarter() {
  game.settings.register(game.system.id, "starterOffered", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(game.system.id, "guideOffered", { scope: "world", config: false, type: Boolean, default: false });
  game.sw25 = Object.assign(game.sw25 ?? {}, { starter: { build: buildStarter, open: askAndBuild, pack: starterPack, ready: starterReady, guide: buildGuide } });
  // a fresh world without content packs: the active GM gets the starter set once, in their own language
  Hooks.once("ready", async () => {
    try {
      if (!game.user.isGM || game.user.id !== game.users.activeGM?.id) return;
      // the guide is added once to every world, old ones included
      if (!game.settings.get(game.system.id, "guideOffered")) {
        await game.settings.set(game.system.id, "guideOffered", true);
        try { await buildGuide(); } catch (err) { console.error("SW25 | guide:", err); }
      }
      if (game.settings.get(game.system.id, "starterOffered")) return;
      await game.settings.set(game.system.id, "starterOffered", true);
      if (!starterReady()) {
        await buildStarter();
        // a fresh world also gets the sample characters and monsters to try things out with
        try { await game.sw25?.samples?.build?.(); } catch (err) { console.error("SW25 | samples:", err); }
      }
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
