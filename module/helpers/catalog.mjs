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
