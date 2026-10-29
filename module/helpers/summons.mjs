/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​​​‌​​‌‌​​‌​​​‌‌​‌​​​​‌‌​​​‌​‌‌​​‌​​​​‌‌​‌‌‌⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Golems, undead and familiars made by a character.
 *
 *
 * «Creations» button on a character sheet: pick what to make → the MP is paid (mako stone / familiar
 * MP allowed), the Conjurer level is checked against the table, the normal material is taken from
 * the inventory, then the GM side copies the monster actor (world or compendium) into the folder
 * «Создания», gives it to the creator's owners and puts a linked token next to the creator.
 *   flags.sw25.summon = { owner: creator actor id, kind: "golem" | "undead" | "familiar" | "other", label }
 *
 * In combat a golem / undead acts right after its creator (initiative = creator − 0.01).
 * A familiar has no HP: damage to it goes to its master; its Fortitude / Willpower use the master's
 * checks; the master may pay MP from it; one familiar per master (a new one dismisses the old one).
 * «Dismiss» on the creation's sheet removes its tokens and the copied actor.
 */
import { L2 } from "./monstergen-i18n.mjs";
import { classLevel } from "./names.mjs";
import { emitToGM } from "./socket.mjs";
import { makoSplit, makoCommit } from "./mako.mjs";
import { partOf, partRecord, checkParts, applyParts, SIZE_NAME, ELEMENTS, openPartsCopy } from "./golemparts.mjs";
import { creationTemplates, extraData } from "./catalog.mjs";

const N = (v) => Math.max(0, Math.floor(Number(v) || 0));
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const T = (p) => L2(p[0], p[1]);
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/**
 * What can be made is not shipped with the system. It comes from
 *  - creation templates: monster actors with flags.sw25.creation (made in the monster generator, section
 *    «Creation», or marked with the GM button «Creation» on a monster sheet), world or compendium;
 *  - module data (catalog.mjs extraData().creations), matched to monsters by name.
 * spec = { kind: golem|undead|familiar, conj, mp, material, alt, max, size, consumed, matPrice, strongPrice }
 */
const nameOf = (v) => (v && typeof v === "object" ? L2(v.ru ?? v.en ?? "", v.en ?? v.ru ?? "") : String(v ?? ""));
const namesOf = (v) => (v && typeof v === "object" ? [v.ru, v.en, v.ja].filter(Boolean) : [String(v ?? "")].filter(Boolean));
async function creationOptions() {
  const list = (await creationTemplates()).map((t) => ({ ...t.spec, label: t.name, names: [t.name], uuid: t.uuid }));
  const have = new Set(list.map((o) => norm(o.label)));
  for (const c of (await extraData()).creations ?? []) {
    const names = namesOf(c.name);
    if (names.some((n) => have.has(norm(n)))) continue;
    list.push({ ...c, label: nameOf(c.name), names, uuid: null });
  }
  const order = { golem: 0, undead: 1, familiar: 2 };
  return list.sort((a, b) => (order[a.kind] ?? 3) - (order[b.kind] ?? 3) || N(a.conj) - N(b.conj) || a.label.localeCompare(b.label));
}

/* ---------------- who is who ---------------- */
/** A golem: a creation template of kind golem, a Construct / Magitech monster, or a name with «golem». */
const isGolem = (a) => a?.flags?.sw25?.creation?.kind === "golem" || ["MagicCreature", "Machine"].includes(a?.system?.classType)
  || /голем|golem|ゴーレム/i.test(String(a?.name ?? ""));
export const summonOf = (a) => a?.flags?.sw25?.summon ?? null;
export const masterOf = (a) => { const s = summonOf(a); return s ? game.actors.get(s.owner) ?? null : null; };
export const familiarOf = (actor) => game.actors.find((a) => summonOf(a)?.kind === "familiar" && summonOf(a).owner === actor?.id) ?? null;
const creationsOf = (actor) => game.actors.filter((a) => summonOf(a)?.owner === actor?.id);

/* ---------------- finding the monster ---------------- */
async function findCreature(names) {
  const want = names.map(norm).filter(Boolean);
  const words = (w) => w.split(/[\s:：()（）\-]+/).filter((t) => t.length > 1);
  const two = (t) => /(^|[^a-z])ii([^a-z]|$)/.test(t);   // «Familiar» must not pick «Familiar II»
  const hit = (n) => { const x = norm(n); return want.some((w) => x === w) ? 2 : want.some((w) => two(w) === two(x) && (x.includes(w) || words(w).every((t) => x.includes(t)))) ? 1 : 0; };
  let best = null, score = 0;
  for (const a of game.actors) if (a.type === "monster" && !summonOf(a)) { const s = hit(a.name); if (s > score) { best = a.uuid; score = s; } }
  if (score === 2) return best;
  for (const p of game.packs) {
    if (p.documentName !== "Actor") continue;
    const idx = await p.getIndex({ fields: ["type"] });
    for (const e of idx) { const s = hit(e.name); if (s > score) { best = e.uuid; score = s; } }
    if (score === 2) break;
  }
  return best;
}

/* ---------------- material ---------------- */
function materialItem(actor, names) {
  const want = names.map(norm);
  return actor.items.find((i) => want.some((w) => norm(i.name).includes(w)) && N(i.system?.quantity ?? 1) > 0) ?? null;
}
async function takeOne(item) {
  if ("quantity" in (item.system ?? {})) await item.update({ "system.quantity": Math.max(0, N(item.system.quantity) - 1) });
}

/* ---------------- dialog ---------------- */
export async function openSummons(actor) {
  if (!actor || actor.type !== "character") return;
  const { DialogV2 } = foundry.applications.api;
  const conj = classLevel(actor, "conjurer");
  const opts = await creationOptions();
  const optOf = (kind) => opts.map((o, i) => (o.kind !== kind ? "" : `<option value="t${i}"${N(o.conj) > conj ? " disabled" : ""}>${esc(o.label)}${N(o.conj) ? ` — ${L2("ур.", "lv")} ${N(o.conj)}` : ""}${N(o.mp) ? `, ${N(o.mp)} ${L2("ОМ", "MP")}` : ""}</option>`)).join("");
  const optG = optOf("golem"), optU = optOf("undead"), optF = optOf("familiar");
  const none = !opts.length ? `<p class="hint">${L2("Шаблонов созданий нет. ГМ делает их в «Генераторе монстров» (раздел «Создание») или отмечает готового монстра кнопкой «Создание» на его листе.", "No creation templates. The GM makes them in the «Monster generator» (section «Creation») or marks a monster with the «Creation» button on its sheet.")}</p>` : "";
  const list = creationsOf(actor);
  const cur = list.length ? `<p>${L2("Сейчас", "Now")}: ${list.map((a) => `<b>${esc(a.name)}</b>`).join(", ")}</p>` : "";
  const content = `<div class="sw25-summons">
    <p>${L2(`Призыватель: ур. ${conj}.`, `Conjurer: level ${conj}.`)}</p>${cur}${none}
    <select name="what" style="width:100%">
      ${optG ? `<optgroup label="${esc(L2("Големы", "Golems"))}">${optG}</optgroup>` : ""}
      ${optU ? `<optgroup label="${esc(L2("Нежить", "Undead"))}">${optU}</optgroup>` : ""}
      ${optF ? `<optgroup label="${esc(L2("Фамильяры", "Familiars"))}">${optF}</optgroup>` : ""}
      <option value="other">${esc(L2("Другое существо (перетащить)", "Another creature (drag it)"))}</option>
    </select>
    <div class="sm-drop" style="border:2px dashed #888;border-radius:6px;padding:8px;margin:6px 0;text-align:center">${L2("Существо ищется по названию в мире и компендиумах. Нет нужного — сначала сделайте его в «Генераторе монстров» (или загрузите с ytsheet) и перетащите сюда.", "The creature is found by name in the world and the compendiums. Not there? Make it first in the «Monster generator» (or load it from ytsheet) and drop it here.")}<br><b class="sm-found"></b></div>
    <label><input type="checkbox" name="paid"> ${L2("ОМ уже потрачены (заклинание брошено отдельно)", "MP already paid (the spell was cast separately)")}</label><br>
    <label><input type="checkbox" name="mat" checked> ${L2("Списать обычный материал из инвентаря", "Take the normal material from the inventory")}</label>
    <p class="hint sm-info"></p>
    <fieldset class="sm-parts" style="display:none"><legend>${L2("Улучшающие предметы", "Enhancing Items")}</legend><div class="sm-plist"></div></fieldset></div>`;

  let dropped = null;
  const pick = (v) => {
    const o = v?.[0] === "t" ? opts[N(v.slice(1))] : null;
    if (!o) return { kind: "other", names: ["", ""], label: "", lvl: 0, mp: 0, mat: null, info: L2("Перетащите существо. ОМ не тратятся.", "Drop a creature. No MP is spent.") };
    const mat = o.material ? namesOf(o.material) : null, alt = o.alt ? namesOf(o.alt) : null;
    const info = [
      mat?.length ? L2(`Материал: ${nameOf(o.material)}`, `Material: ${nameOf(o.material)}`) + (o.matPrice ? ` (${o.matPrice} G)` : "") + (alt?.length ? L2(` или ${nameOf(o.alt)}`, ` or ${nameOf(o.alt)}`) : "") + (o.consumed ? L2(", расходуется", ", consumed") : "") + "." : "",
      o.kind === "familiar" ? L2("Один фамильяр на хозяина. Нет своих ОЖ: урон идёт хозяину.", "One familiar per master. No HP of its own: damage goes to the master.") : "",
    ].filter(Boolean).join(" ");
    return { kind: o.kind ?? "other", names: o.names, label: o.label, uuid: o.uuid, lvl: N(o.conj), mp: N(o.mp), mat, alt, max: N(o.max), size: o.size || "small", info };
  };
  let foundUuid = null;
  const res = await DialogV2.wait({
    window: { title: L2(`${actor.name}: создания`, `${actor.name}: creations`) },
    position: { width: 520 },
    content,
    buttons: [
      { action: "ok", label: L2("Создать", "Create"), default: true, callback: (ev, btn) => ({ what: btn.form.elements.what.value, paid: btn.form.elements.paid.checked, mat: btn.form.elements.mat.checked,
        parts: [...btn.form.querySelectorAll('[name="gp"]:checked')].map((x) => x.value), resist: btn.form.querySelector('[name="gres"]')?.value ?? "" }) },
      ...(list.length ? [{ action: "dismissAll", label: L2("Развеять всех", "Dismiss all") }] : []),
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element;
      const sync = async () => {
        const p = pick(root.querySelector('[name="what"]').value);
        root.querySelector(".sm-info").textContent = p.info;
        // enhancement items from the creator's inventory, of the size this golem uses
        const box = root.querySelector(".sm-parts");
        box.style.display = p.kind === "golem" ? "" : "none";
        if (p.kind === "golem") {
          const size = p.size;
          const own = actor.items.filter((i) => partOf(i)?.size === size && !i.flags?.sw25?.inGolem && N(i.system?.quantity ?? 1) > 0);
          const busy = actor.items.filter((i) => partOf(i) && i.flags?.sw25?.inGolem).length;
          root.querySelector(".sm-plist").innerHTML = `<p class="hint">${L2(`Размер: ${SIZE_NAME[size][0]}.`, `Size: ${SIZE_NAME[size][1]}.`)}${p.max ? " " + L2(`Не больше ${p.max}.`, `Up to ${p.max}.`) : ""}${busy ? " " + L2(`Ещё в других големах: ${busy}.`, `In other golems: ${busy}.`) : ""}</p>`
            + (own.length ? own.map((i) => `<label style="display:block"><input type="checkbox" name="gp" value="${i.id}"> ${esc(i.name)}</label>`).join("")
              : `<p>${L2("В инвентаре нет подходящих предметов.", "No fitting items in the inventory.")}</p>`)
            + (own.some((i) => partOf(i).resist) ? `<label>${L2("Стихия рассеивателя", "Disruptor type")} <select name="gres">${ELEMENTS.map(([k, n]) => `<option value="${k}">${esc(T(n))}</option>`).join("")}</select></label>` : "");
        }
        foundUuid = dropped ?? p.uuid ?? (p.kind === "other" ? null : await findCreature(p.names));
        const doc = foundUuid ? await fromUuid(foundUuid) : null;
        root.querySelector(".sm-found").textContent = doc ? doc.name : L2("не найдено — перетащите", "not found — drop one");
      };
      root.querySelector('[name="what"]').addEventListener("change", () => { dropped = null; sync(); });
      const drop = root.querySelector(".sm-drop");
      drop.addEventListener("dragover", (e) => e.preventDefault());
      drop.addEventListener("drop", async (e) => {
        e.preventDefault();
        let data; try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
        if (data?.type !== "Actor" || !data.uuid) return;
        dropped = data.uuid; sync();
      });
      sync();
    },
  });
  if (!res || res === "cancel") return;
  if (res === "dismissAll") { for (const a of creationsOf(actor)) await dismiss(a); return; }
  const p = pick(res.what);
  const uuid = foundUuid;
  if (!uuid) return ui.notifications.warn(L2("Существо не найдено: перетащите его в окно.", "Creature not found: drop it into the window."));
  if (!p.label) p.label = (await fromUuid(uuid))?.name ?? "";
  if (p.lvl && conj < p.lvl) return ui.notifications.warn(L2(`Нужен Призыватель ур. ${p.lvl}.`, `Needs Conjurer level ${p.lvl}.`));
  const canvasTok = actor.getActiveTokens()[0];
  if (!canvasTok) return ui.notifications.warn(L2("Поставьте токен создателя на сцену.", "Put the creator's token on the scene."));
  // material
  let matItem = null;
  if (p.mat && res.mat) {
    matItem = materialItem(actor, [...p.mat, ...(p.alt ?? [])]);
    if (!matItem) return ui.notifications.warn(L2(`Нет материала: ${p.mat[0]}. Снимите галочку, если он есть по-другому.`, `No material: ${p.mat[1] ?? p.mat[0]}. Untick the box if it is covered another way.`));
  }
  {
    const pre = (res.parts ?? []).map((id) => partRecord(actor.items.get(id))).filter(Boolean);
    const err = pre.length ? checkParts(pre, p.max) : "";
    if (err) return ui.notifications.warn(err);
  }
  // MP⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​​​‌​​‌‌​​‌​​​‌‌​‌​​​​‌‌​​​‌​‌‌​​‌​​​​‌‌​‌‌‌​​‌​‌‌​‌​‌‌​​​‌​⁠
  let line = "";
  if (p.mp && !res.paid) {
    const split = await makoSplit(actor, p.mp, p.label);
    if (!split) return;
    const mp = Number(actor.system.mp?.value) || 0;
    if (split.mp > mp) return ui.notifications.warn(L2(`Не хватает ОМ: нужно ${split.mp}, есть ${mp}.`, `Not enough MP: ${split.mp} needed, ${mp} left.`));
    if (split.mp) await actor.update({ "system.mp.value": mp - split.mp });
    line = [split.mp ? L2(`ОМ −${split.mp}.`, `MP −${split.mp}.`) : "", await makoCommit(split.use)].filter(Boolean).join(" ");
  }
  if (matItem) { await takeOne(matItem); line += ` ${L2(`Материал: ${matItem.name} −1.`, `Material: ${matItem.name} −1.`)}`; }
  // enhancement items: checked before anything is paid
  const partItems = (res.parts ?? []).map((id) => actor.items.get(id)).filter(Boolean);
  const parts = partItems.map(partRecord).filter(Boolean);
  if (parts.length) { const err = checkParts(parts, p.max); if (err) return ui.notifications.warn(err); }
  const req = { method: "summon", uuid, owner: actor.id, kind: p.kind, label: p.label || "", sceneId: canvasTok.scene.id, x: canvasTok.document.x, y: canvasTok.document.y, parts, resist: res.resist };
  if (game.user.isGM) await spawn(req);
  else if (!emitToGM(req)) return;
  if (partItems.length) {
    await actor.updateEmbeddedDocuments("Item", partItems.map((i) => ({ _id: i.id, "flags.sw25.inGolem": true })));
    line += ` ${L2(`Улучшения: ${partItems.map((i) => i.name).join(", ")}.`, `Enhancements: ${partItems.map((i) => i.name).join(", ")}.`)}`;
  }
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="sw25-cast-mp"><b>${esc(actor.name)}</b> ${L2("создаёт", "creates")}: <b>${esc(p.label || "")}</b>. ${esc(line)}</div>` });
}

/* ---------------- creation template: the fields (monster generator and the monster sheet button) ---------------- */
const KIND_OPTS = [["", ["— не создание —", "— not a creation —"]], ["golem", ["Голем", "Golem"]], ["undead", ["Нежить", "Undead"]], ["familiar", ["Фамильяр", "Familiar"]]];
/** HTML of the creation fields (names prefixed with `cr-`). */
export function creationFields(spec = {}) {
  const o = (v, l, cur) => `<option value="${v}"${String(v) === String(cur ?? "") ? " selected" : ""}>${esc(l)}</option>`;
  const n = (name, v, w = "4.5em") => `<input type="number" name="cr-${name}" value="${v ?? ""}" min="0" step="1" style="width:${w}">`;
  return `<div class="sw25-creation" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
    <label>${L2("Вид", "Kind")} <select name="cr-kind">${KIND_OPTS.map(([v, l]) => o(v, T(l), spec.kind ?? "")).join("")}</select></label>
    <label>${L2("Призыватель, ур.", "Conjurer level")} ${n("conj", spec.conj)}</label>
    <label>${L2("ОМ", "MP")} ${n("mp", spec.mp)}</label>
    <label>${L2("Материал", "Material")} <input type="text" name="cr-material" value="${esc(nameOf(spec.material))}" style="width:14em"></label>
    <label>${L2("или", "or")} <input type="text" name="cr-alt" value="${esc(nameOf(spec.alt))}" style="width:10em"></label>
    <label><input type="checkbox" name="cr-consumed"${spec.consumed ? " checked" : ""}> ${L2("материал расходуется", "material is consumed")}</label>
    <label>${L2("Улучшающих предметов, макс.", "Enhancing items, max")} ${n("max", spec.max)}</label>
    <label>${L2("Размер предметов", "Item size")} <select name="cr-size">${Object.entries(SIZE_NAME).map(([k, v]) => o(k, T(v), spec.size ?? "small")).join("")}</select></label>
  </div>`;
}
/** Read the creation fields; null when «not a creation». */
export function readCreation(root) {
  const q = (n) => root.querySelector(`[name="cr-${n}"]`);
  const kind = q("kind")?.value ?? "";
  if (!kind) return null;
  const txt = (n) => String(q(n)?.value ?? "").trim();
  return { kind, conj: N(q("conj")?.value), mp: N(q("mp")?.value), material: txt("material"), alt: txt("alt"), consumed: !!q("consumed")?.checked, max: N(q("max")?.value), size: q("size")?.value || "small" };
}
/** GM button on a monster sheet: mark it as a creation template (or unmark). */
export async function openCreationMark(actor) {
  if (!game.user.isGM || actor?.type !== "monster") return;
  const { DialogV2 } = foundry.applications.api;
  const res = await DialogV2.wait({
    window: { title: L2(`${actor.name}: создание`, `${actor.name}: creation`) },
    position: { width: 640 },
    content: `<div class="sw25-crmark"><p class="hint">${L2("Шаблон для окна «Создания» на листе персонажа. Числа — из вашей книги.", "A template for the «Creations» window on a character sheet. The numbers come from your rulebook.")}</p>${creationFields(actor.flags?.sw25?.creation ?? {})}</div>`,
    buttons: [{ action: "ok", label: L2("Сохранить", "Save"), default: true, callback: (ev, btn) => ({ spec: readCreation(btn.form) }) }, { action: "cancel", label: L2("Отмена", "Cancel") }],
    rejectClose: false,
  });
  if (!res || res === "cancel") return;
  await actor.update(res.spec ? { "flags.sw25.creation": res.spec } : { "flags.sw25.-=creation": null });
}

/* ---------------- GM side ---------------- */
async function ensureFolder() {
  const name = L2("Создания", "Creations");
  return game.folders.find((f) => f.type === "Actor" && f.name === name && !f.folder) ?? Folder.create({ name, type: "Actor" });
}
export async function spawn(req) {
  const src = await fromUuid(req.uuid);
  const owner = game.actors.get(req.owner);
  const scene = game.scenes.get(req.sceneId);
  if (!src || !owner || !scene) return;
  if (req.kind === "familiar") for (const a of creationsOf(owner).filter((a) => summonOf(a).kind === "familiar")) await dismiss(a);
  const data = src.toObject();
  delete data._id; delete data.sort;
  data.folder = (await ensureFolder()).id;
  data.name = `${src.name} (${owner.name})`;
  data.ownership = { default: 0, ...Object.fromEntries(Object.entries(owner.ownership).filter(([k, v]) => k !== "default" && v >= 3)) };
  data.prototypeToken = { ...(data.prototypeToken ?? {}), actorLink: true, name: data.name, disposition: owner.prototypeToken?.disposition ?? 1 };
  if (req.parts?.length) applyParts(data, req.parts, { resist: req.resist });
  foundry.utils.setProperty(data, "flags.sw25.summon", { owner: owner.id, kind: req.kind, label: req.label, parts: (req.parts ?? []).map((p) => p.itemId) });
  const made = await Actor.create(data);
  const grid = scene.grid?.size ?? 100;
  const td = await made.getTokenDocument({ x: req.x + grid, y: req.y });
  await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  // in combat: right after the creator
  const combat = game.combats.find((c) => c.scene?.id === scene.id && c.combatants.some((x) => x.actor?.id === owner.id));
  if (combat && req.kind !== "familiar") {
    const tok = scene.tokens.find((t) => t.actorId === made.id);
    const mc = combat.combatants.find((x) => x.actor?.id === owner.id);
    if (tok) await combat.createEmbeddedDocuments("Combatant", [{ tokenId: tok.id, sceneId: scene.id, actorId: made.id, initiative: mc?.initiative != null ? mc.initiative - 0.01 : null }]);
  }
}
export async function dismiss(a) {
  if (!summonOf(a)) return;
  if (!game.user.isGM) return emitToGM({ method: "dismiss", actorId: a.id });
  for (const c of game.combats) {
    const ids = c.combatants.filter((x) => x.actorId === a.id).map((x) => x.id);
    if (ids.length) await c.deleteEmbeddedDocuments("Combatant", ids);
  }
  for (const s of game.scenes) {
    const ids = s.tokens.filter((t) => t.actorId === a.id).map((t) => t.id);
    if (ids.length) await s.deleteEmbeddedDocuments("Token", ids);
  }
  // the enhancement items come back to the creator
  const sm = summonOf(a), owner = game.actors.get(sm.owner);
  const back = (sm.parts ?? []).map((id) => owner?.items.get(id)).filter(Boolean);
  if (back.length) await owner.updateEmbeddedDocuments("Item", back.map((i) => ({ _id: i.id, "flags.sw25.inGolem": false })));
  await a.delete();
}

/** Socket requests from players (called from socket.mjs). */
export async function handleSummonSocket(data) {
  if (data.method === "summon") return spawn(data);
  if (data.method === "dismiss") { const a = game.actors.get(data.actorId); if (a && summonOf(a)) return dismiss(a); }
  if (data.method === "familiarHp") {
    const m = game.actors.get(data.masterId);
    if (m) await m.update({ "system.hp.value": (Number(m.system.hp?.value) || 0) - N(data.dmg) });
  }
}

/** Familiar resist: the master's Fortitude / Willpower check value (or null). */
export function familiarResistBase(actor, key) {
  if (summonOf(actor)?.kind !== "familiar") return null;
  const m = masterOf(actor);
  if (!m) return null;
  const want = key === "Vitres" ? [game.settings.get("sw25", "effectVitResPC"), "Стойкость", "Fortitude", "生命抵抗力"] : [game.settings.get("sw25", "effectMndResPC"), "Воля", "Willpower", "精神抵抗力"];
  const it = m.items.find((i) => i.type === "check" && want.includes(i.name));
  return it ? Number(it.system.checkbase) || 0 : null;
}

export function registerSummons() {
  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    const actor = app.actor ?? app.document;
    if (!actor?.isOwner) return;
    if (actor.type === "character") buttons.unshift({ label: L2("Создания", "Creations"), class: "sw25-summon-btn", icon: "fa-solid fa-person-rays", onclick: () => openSummons(actor) });
    if (summonOf(actor)) buttons.unshift({ label: L2("Развеять", "Dismiss"), class: "sw25-dismiss-btn", icon: "fa-solid fa-wind", onclick: () => dismiss(actor) });
    else if (actor.type === "monster" && game.user.isGM) {
      buttons.unshift({ label: L2("Создание", "Creation"), class: "sw25-crmark-btn", icon: "fa-solid fa-person-rays", onclick: () => openCreationMark(actor) });
      if (isGolem(actor)) buttons.unshift({ label: L2("Улучшить голема", "Enhance golem"), class: "sw25-gparts-btn", icon: "fa-solid fa-gem", onclick: () => openPartsCopy(actor) });
    }
  });
  // a familiar has no HP: damage goes to its master
  Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
    if (summonOf(actor)?.kind !== "familiar" || userId !== game.user.id) return;
    const nv = foundry.utils.getProperty(changes, "system.hp.value");
    if (nv === undefined) return;
    const dmg = (Number(actor.system.hp?.value) || 0) - Number(nv);
    foundry.utils.setProperty(changes, "system.hp.value", Number(actor.system.hp?.value) || 0);
    const m = masterOf(actor);
    if (!(dmg > 0) || !m) return;
    if (m.isOwner) m.update({ "system.hp.value": (Number(m.system.hp?.value) || 0) - dmg });
    else emitToGM({ method: "familiarHp", masterId: m.id, dmg });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="sw25-cast-mp">${L2(`Урон фамильяру (${dmg}) получает хозяин: ${esc(m.name)}.`, `Damage to the familiar (${dmg}) goes to the master: ${esc(m.name)}.`)}</div>` });
  });
  // golems / undead act right after their creator
  Hooks.on("updateCombatant", async (cb, changes) => {
    if (game.user !== game.users.activeGM || !("initiative" in changes) || cb.initiative == null) return;
    const id = cb.actor?.id;
    if (!id || summonOf(cb.actor)) return;
    const ups = cb.combat.combatants.filter((x) => { const s = summonOf(x.actor); return s && s.owner === id && s.kind !== "familiar"; })
      .map((x) => ({ _id: x.id, initiative: cb.initiative - 0.01 }));
    if (ups.length) await cb.combat.updateEmbeddedDocuments("Combatant", ups);
  });
  Hooks.on("createCombatant", async (cb) => {
    if (game.user !== game.users.activeGM) return;
    const s = summonOf(cb.actor);
    if (!s || s.kind === "familiar") return;
    const mc = cb.combat.combatants.find((x) => x.actor?.id === s.owner);
    if (mc?.initiative != null && cb.initiative == null) await cb.update({ initiative: mc.initiative - 0.01 });
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { summons: { open: openSummons, dismiss, familiarOf, masterOf } });
}
