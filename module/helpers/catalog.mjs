/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​‌‌​​‌‌​​​‌​​‌‌​​​‌​​‌‌​​‌‌​​​‌‌​‌‌‌​​‌‌​​​‌⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Optional data from an active module that declares `flags.sw25.data` (a JSON path inside the module)
 * in its module.json. Without one everything works with what the GM makes in the constructors⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​‌‌​​‌‌​​​‌​​‌‌​​​‌​​‌‌​​‌‌​​​‌‌​‌‌‌​​‌‌​​​‌​​‌​‌‌​‌​‌‌​​​‌​⁠
 * (items flagged below).
 *
 * Flags read from items (world items and Item compendiums):
 *   flags.sw25.golemPart — a golem enhancing item (see golemparts.mjs)
 *   flags.sw25.enh       — an item upgrade { kinds[], f{field: delta}, fx[[key, value]], p, price[B,A,S], tag{}, el{}, abyss }
 *   flags.sw25.curse     — an Abyss curse { code, carried, text{}, p, weapon{f,fx,off}, armor{f,fx,off}, manual }
 * and from actors: flags.sw25.creation — a creation template { kind, conj, mp, material, alt, max, size, consumed }.
 */
let _extra;
const SOURCES = () => [...game.modules].filter((m) => m.active && typeof m.flags?.sw25?.data === "string")
  .map((m) => `modules/${m.id}/${m.flags.sw25.data}`);
/** The module data, or {} (cached). */
export async function extraData() {
  if (_extra !== undefined) return _extra;
  _extra = {};
  for (const url of SOURCES()) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) continue;
      _extra = await r.json();
      break;
    } catch (e) { /* not there */ }
  }
  return _extra;
}

/** All items with flags.sw25[flag]: world items first, then Item compendiums (index only). [{ uuid, name, img, price, spec }] */
export async function flaggedItems(flag) {
  const out = [], seen = new Set();
  const push = (uuid, name, img, price, spec) => {
    const key = `${name}|${JSON.stringify(spec)}`;
    if (!spec || seen.has(key)) return;
    seen.add(key); out.push({ uuid, name, img, price, spec });
  };
  for (const i of game.items) push(i.uuid, i.name, i.img, i.system?.price, i.flags?.sw25?.[flag]);
  for (const p of game.packs) {
    if (p.documentName !== "Item" || !p.visible) continue;
    let idx;
    try { idx = await p.getIndex({ fields: [`flags.sw25.${flag}`, "system.price"] }); } catch (e) { continue; }
    for (const e of idx) push(e.uuid, e.name, e.img, e.system?.price, e.flags?.sw25?.[flag]);
  }
  return out;
}

/** All creation templates: actors with flags.sw25.creation in the world and Actor compendiums. [{ uuid, name, spec }] */
export async function creationTemplates() {
  const out = [];
  for (const a of game.actors) if (a.flags?.sw25?.creation && !a.flags?.sw25?.summon) out.push({ uuid: a.uuid, name: a.name, spec: a.flags.sw25.creation });
  for (const p of game.packs) {
    if (p.documentName !== "Actor" || !p.visible) continue;
    let idx;
    try { idx = await p.getIndex({ fields: ["flags.sw25.creation"] }); } catch (e) { continue; }
    for (const e of idx) if (e.flags?.sw25?.creation) out.push({ uuid: e.uuid, name: e.name, spec: e.flags.sw25.creation });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  [ru.12.2] Items already on sheets: pull the rules again from the compendium entry they came from
 *  (flags, a few system fields, the effects). Quantity, equipment, upgrades, names and
 *  talents whose choice was already made are left alone.
 * ------------------------------------------------------------------ */
const REFRESH_SYS = {
  weapon: ["category", "usage", "cvalue"],
  item: ["type", "applypower", "pwpdbt", "pwmdbt", "pwcdbt", "pwhrbt", "pwmrbt", "usepower", "powermod", "cvalue", "clickitem"],
  spell: ["power", "usepower", "cvalue"],
  magicalsong: ["cvalue"],
  combatability: ["type", "clickitem"],
  raceability: ["clickitem"],
  ridingtrick: ["clickitem"],
};
const REFRESH_FLAGS = ["feat", "daily", "magic"];
const picked = (it) => { const f = it.flags?.sw25?.feat; return !!f?.pick && !!(f.wArg || f.aArg || f.school); };
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const fxSig = (doc) => JSON.stringify(doc.effects.map((e) => [e.name, (e.system?.changes ?? e.changes ?? []).map((c) => [c.key, String(c.value)])]).sort());
let _byName = null;
/** type|name → compendium uuid, for items that came from a world copy (no link to the compendium). */
async function nameIndex() {
  if (_byName) return _byName;
  _byName = new Map();
  for (const p of game.packs) {
    if (p.documentName !== "Item" || !p.visible) continue;
    let idx; try { idx = await p.getIndex(); } catch (e) { continue; }
    for (const e of idx) { const k = `${e.type}|${e.name}`; if (!_byName.has(k)) _byName.set(k, e.uuid); }
  }
  return _byName;
}
// matched only by name (no link): talents and techniques take the rules and effects, never the numbers
const BY_NAME_TYPES = ["combatability", "raceability", "ridingtrick", "enhancearts"];
async function sourceOf(item) {
  let u = item._stats?.compendiumSource ?? item.flags?.core?.sourceId, byName = false;
  if (!u || !String(u).startsWith("Compendium.")) {
    if (!BY_NAME_TYPES.includes(item.type)) return null;
    u = (await nameIndex()).get(`${item.type}|${item.name}`); byName = true;
  }
  if (!u) return null;
  try { const s = await fromUuid(u); return s?.type === item.type ? { src: s, byName } : null; } catch (e) { return null; }
}
/** What would change on this actor: [{ item, upd, fx }] (fx = the source's effects, or null). */
export async function refreshPlan(actor) {
  const out = [];
  for (const it of actor?.items ?? []) {
    if (it.flags?.sw25?.upg) continue;   // an upgraded weapon / armour keeps its numbers
    const found = await sourceOf(it);
    if (!found) continue;
    const src = found.src;
    const upd = {};
    if (!found.byName) for (const k of REFRESH_SYS[it.type] ?? []) {
      const v = foundry.utils.getProperty(src, `system.${k}`);
      if (v !== undefined && !same(v, foundry.utils.getProperty(it, `system.${k}`))) upd[`system.${k}`] = v;
    }
    const keep = picked(it);
    if (!keep) for (const k of REFRESH_FLAGS) {
      const v = src.flags?.sw25?.[k];
      if (v !== undefined && !same(v, it.flags?.sw25?.[k])) upd[`flags.sw25.${k}`] = v;
    }
    // weapons, armour and accessories keep their own effects (upgrades, curses)
    const fx = !keep && !["weapon", "armor", "accessory"].includes(it.type) && fxSig(src) !== fxSig(it)
      ? src.effects.map((e) => { const o = e.toObject(); delete o._id; return o; }) : null;
    if (Object.keys(upd).length || fx) out.push({ item: it, upd, fx });
  }
  return out;
}
/** Apply the plan; talents that now ask for a choice («…/**») ask it. */
export async function refreshFromCompendium(actor) {
  const plan = await refreshPlan(actor);
  for (const p of plan) {
    if (Object.keys(p.upd).length) await p.item.update(p.upd);
    if (p.fx) {
      const ids = p.item.effects.map((e) => e.id);
      if (ids.length) await p.item.deleteEmbeddedDocuments("ActiveEffect", ids);
      if (p.fx.length) await p.item.createEmbeddedDocuments("ActiveEffect", p.fx);
    }
    const f = p.item.flags?.sw25?.feat;
    if (f?.pick && !(f.wArg || f.aArg || f.school)) await game.sw25?.feats?.askPick?.(p.item);
  }
  return plan;
}
/** GM: a list of characters with what would change, tick and update. */
export async function openRefresh() {
  if (!game.user.isGM) return;
  _byName = null;   // compendiums may have changed since the last look
  const { L2 } = await import("./monstergen-i18n.mjs");
  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  const rows = [];
  for (const a of game.actors.filter((x) => x.type === "character")) {
    const plan = await refreshPlan(a);
    if (plan.length) rows.push({ a, plan });
  }
  if (!rows.length) return ui.notifications.info(L2("Все листы уже совпадают с компендиумами.", "Every sheet already matches the compendiums."));
  const content = `<p class="hint">${esc(L2("Предметы, взятые из компендиумов раньше, получат новые правила и эффекты. Количество, экипировка, улучшения и сделанный выбор не меняются.", "Items taken from compendiums earlier get the new rules and effects. Quantity, equipment, upgrades and choices already made stay."))}</p>`
    + rows.map((r, i) => `<label style="display:block;margin:4px 0"><input type="checkbox" name="r${i}" checked> <b>${esc(r.a.name)}</b>: ${r.plan.length} — <small>${esc(r.plan.map((p) => p.item.name).join(", "))}</small></label>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: L2("Обновить из компендиумов", "Update from compendiums") }, position: { width: 560 }, content,
    buttons: [
      { action: "go", label: L2("Обновить отмеченных", "Update the ticked ones"), default: true, callback: (ev, btn) => rows.map((r, i) => (btn.form.elements[`r${i}`]?.checked ? i : -1)).filter((i) => i >= 0) },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
  });
  if (!Array.isArray(res)) return;
  let n = 0;
  for (const i of res) n += (await refreshFromCompendium(rows[i].a)).length;
  ui.notifications.info(L2(`Обновлено предметов: ${n}.`, `Items updated: ${n}.`));
}
export async function registerRefresh() {
  const { L2 } = await import("./monstergen-i18n.mjs");
  game.sw25 = Object.assign(game.sw25 ?? {}, { refresh: { plan: refreshPlan, run: refreshFromCompendium, open: openRefresh } });
  Hooks.on("renderActorDirectory", (app, html) => {
    if (!game.user.isGM) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(".sw25-refresh")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-refresh";
    btn.style.cssText = "flex:1 1 100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const label = L2("Обновить листы из компендиумов", "Update sheets from compendiums");
    btn.title = label;
    btn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> ${label}`;
    btn.addEventListener("click", () => openRefresh());
    (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).appendChild(btn);
  });
}
