/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌‌​​​​‌‌​​​​‌​​‌‌​​​​​​‌‌​‌‌‌​​‌‌​​​​​​‌‌‌​​​⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.12): see LICENSE-RESERVED.txt.
 */
/**
 * Ammunition and gun magazines.
 *
 * Ammo = an item flagged flags.sw25.ammo (made in the item constructor, tab «Ammo»):
 *   { for: ["bow","crossbow","gun"], hit, dmg, power, crit, magic, silver, element, recover, text }
 *   recover: "never" (spent) · "always" (picked up again: not spent) · "miss" (back on a miss)
 *            · "nocrit" (back on a miss or on a hit without a critical)
 * A bow / crossbow shot spends one arrow / quarrel of the chosen pack (weapon.flags.sw25.ammoId remembers it).
 * A gun with a magazine (weapon.flags.sw25.mag = { max, loaded: [{ id, name, spec }] }) spends the first
 * loaded bullet; reloading (a major action) takes bullets from the inventory. A gun without «max» is not tracked.
 * The shot's ammo goes on the attack card as flags.sw25.ammo; the damage side reads it from there.
 */
import { L2 } from "./monstergen-i18n.mjs";

const N = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
export const SHOOTING = ["bow", "crossbow", "gun"];
export const RECOVER = [
  ["never", ["тратится", "spent"]],
  ["always", ["всегда подбирается", "always recovered"]],
  ["miss", ["подбирается при промахе", "recovered on a miss"]],
  ["nocrit", ["теряется только при попадании с критом", "lost only on a critical hit"]],
];

/** The ammo spec of an item, or null. */
export const ammoOf = (item) => item?.flags?.sw25?.ammo ?? null;
const fits = (spec, cat) => (spec?.for ?? []).includes(cat);
const weaponCat = (w) => String(w?.system?.category ?? "");

/** Ammo stacks of the actor that fit this weapon (with something left). */
export function fittingAmmo(actor, weapon) {
  const cat = weaponCat(weapon);
  return (actor?.items ?? []).filter((i) => fits(ammoOf(i), cat) && N(i.system?.quantity) > 0);
}

/* ---------------- magazine ---------------- */
export const magOf = (weapon) => {
  const m = weapon?.flags?.sw25?.mag;
  const max = Math.max(0, Math.floor(N(m?.max)));
  return max ? { max, loaded: Array.isArray(m?.loaded) ? m.loaded : [] } : null;
};
const magText = (w, m) => `${m.loaded.length}/${m.max}`;

/** Reload a gun from the inventory (a major action). Returns true when something was loaded. */
export async function reloadGun(actor, weapon) {
  const m = magOf(weapon);
  if (!m) return ui.notifications.warn(L2("У этого ружья не задан «Макс. магазин» (лист оружия).", "This gun has no «Max magazine» set (weapon sheet).")), false;
  const room = m.max - m.loaded.length;
  if (room <= 0) return ui.notifications.info(L2(`${weapon.name}: магазин полон (${magText(weapon, m)}).`, `${weapon.name}: the magazine is full (${magText(weapon, m)}).`)), false;
  const stacks = fittingAmmo(actor, weapon);
  if (!stacks.length) return ui.notifications.warn(L2("Нет пуль в инвентаре (боеприпасы для ружья).", "No bullets in the inventory (gun ammunition).")), false;
  let take = [];
  if (stacks.length === 1) take = [[stacks[0], Math.min(room, N(stacks[0].system.quantity))]];
  else {
    let left = room;
    const rows = stacks.map((s, k) => { const n = Math.min(left, N(s.system.quantity)); left -= n; return `<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><span style="flex:1">${esc(s.name)} <small>(${N(s.system.quantity)})</small></span><input type="number" name="n${k}" value="${n}" min="0" max="${N(s.system.quantity)}" step="1" style="width:4em"></div>`; }).join("");
    const res = await foundry.applications.api.DialogV2.wait({
      window: { title: L2(`${weapon.name}: перезарядка`, `${weapon.name}: reload`) },
      content: `<p>${esc(L2(`Свободно мест: ${room}. Сколько пуль каждого вида зарядить?`, `Free slots: ${room}. How many bullets of each kind?`))}</p>${rows}`,
      buttons: [
        { action: "ok", label: L2("Зарядить", "Load"), default: true, callback: (ev, btn) => stacks.map((s, k) => Math.max(0, Math.floor(N(btn.form.querySelector(`[name="n${k}"]`)?.value)))) },
        { action: "cancel", label: L2("Отмена", "Cancel") },
      ],
      rejectClose: false,
    });
    if (!Array.isArray(res)) return false;
    let free = room;
    take = stacks.map((s, k) => { const n = Math.min(free, res[k], N(s.system.quantity)); free -= n; return [s, n]; }).filter(([, n]) => n > 0);
  }
  if (!take.length) return false;
  const loaded = [...m.loaded];
  for (const [s, n] of take) {
    for (let i = 0; i < n; i++) loaded.push({ id: s.id, name: s.name, spec: ammoOf(s) });
    await s.update({ "system.quantity": N(s.system.quantity) - n });
  }
  await weapon.update({ "flags.sw25.mag.loaded": loaded });
  const got = take.map(([s, n]) => `${esc(s.name)} ×${n}`).join(", ");
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flavor: esc(weapon.name),
    content: `<p><i class="fa-solid fa-rotate"></i> ${L2("Перезарядка (основное действие)", "Reload (major action)")}: ${got}. ${L2("В магазине", "In the magazine")}: <b>${loaded.length}/${m.max}</b></p>` });
  return true;
}

/* ---------------- a shot ----------------⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌‌​​​​‌‌​​​​‌​​‌‌​​​​​​‌‌​‌‌‌​​‌‌​​​​​​‌‌‌​​​​​‌​‌‌​‌​‌‌​​​‌​⁠ */
/**
 * Before a shooting attack: which ammo goes. Returns undefined (not a tracked shot), null (cancel) or
 * { source: "pack"|"mag", item?, spec, name }.
 */
export async function pickShot(actor, weapon) {
  const cat = weaponCat(weapon);
  if (!SHOOTING.includes(cat) || actor?.type !== "character") return undefined;
  if (cat === "gun") {
    const m = magOf(weapon);
    if (!m) return undefined;
    if (!m.loaded.length) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: L2(`${weapon.name}: магазин пуст`, `${weapon.name}: the magazine is empty`) },
        content: `<p>${esc(L2("Пуль в магазине нет. Перезарядить сейчас (основное действие)? Выстрел — уже следующим действием.", "No bullets in the magazine. Reload now (a major action)? Shoot with the next action."))}</p>`,
      });
      if (ok) await reloadGun(actor, weapon);
      return null;
    }
    const b = m.loaded[0];
    return { source: "mag", spec: b.spec ?? {}, name: b.name };
  }
  const stacks = fittingAmmo(actor, weapon);
  if (!stacks.length) {
    // no ammunition made for this weapon at all: the old free shot, as before; some, but all spent: stop
    const any = (actor.items ?? []).some((i) => fits(ammoOf(i), cat));
    if (!any) return undefined;
    ui.notifications.warn(L2(`${weapon.name}: боеприпасы кончились.`, `${weapon.name}: out of ammunition.`));
    return null;
  }
  const saved = weapon.flags?.sw25?.ammoId;
  let pick = stacks.find((s) => s.id === saved) ?? (stacks.length === 1 ? stacks[0] : null);
  if (!pick || (stacks.length > 1 && !stacks.some((s) => s.id === saved))) {
    const opts = stacks.map((s) => `<option value="${s.id}"${s.id === saved ? " selected" : ""}>${esc(s.name)} (${N(s.system.quantity)})</option>`).join("");
    const id = await foundry.applications.api.DialogV2.wait({
      window: { title: L2(`${weapon.name}: чем стрелять?`, `${weapon.name}: which ammunition?`) },
      content: `<p><select name="ammo" style="width:100%">${opts}</select></p><p class="hint">${esc(L2("Выбор запомнится; сменить — на листе оружия.", "The choice is remembered; change it on the weapon sheet."))}</p>`,
      buttons: [
        { action: "ok", label: L2("Стрелять", "Shoot"), default: true, callback: (ev, btn) => btn.form.querySelector("[name=ammo]")?.value },
        { action: "cancel", label: L2("Отмена", "Cancel") },
      ],
      rejectClose: false,
    });
    pick = stacks.find((s) => s.id === id);
    if (!pick) return null;
    if (weapon.isOwner) await weapon.update({ "flags.sw25.ammoId": pick.id });
  }
  return { source: "pack", item: pick, spec: ammoOf(pick), name: pick.name };
}

/** The shot is made: spend the ammo. Returns { flag (for the attack card), line (card text) }. */
export async function spendShot(actor, weapon, shot) {
  const spec = shot.spec ?? {};
  let line = "";
  if (shot.source === "mag") {
    const m = magOf(weapon);
    const loaded = (m?.loaded ?? []).slice(1);
    await weapon.update({ "flags.sw25.mag.loaded": loaded });
    line = `${esc(shot.name)} — ${L2("в магазине", "in the magazine")}: ${loaded.length}/${m?.max ?? 0}`;
  } else if (shot.item) {
    const q = N(shot.item.system.quantity);
    if (spec.recover === "always") line = `${esc(shot.name)}: ${q} (${L2("подбирается", "recovered")})`;
    else { await shot.item.update({ "system.quantity": Math.max(0, q - 1) }); line = `${esc(shot.name)}: ${q} >>> ${q - 1}`; }
  }
  const flag = { name: shot.name, source: shot.source, itemId: shot.item?.id ?? null, weaponId: weapon.id,
    hit: N(spec.hit), dmg: N(spec.dmg), power: N(spec.power), crit: N(spec.crit), magic: !!spec.magic, silver: !!spec.silver, element: spec.element || "", recover: spec.recover || "never" };
  return { flag, line };
}

/** Ammo back to its pack (a miss / no critical). Once per card. */
export async function refundShot(card, why) {
  const a = card?.flags?.sw25?.ammo;
  if (!a || a.source !== "pack" || !a.itemId || a.recover === "never" || a.recover === "always" || card.flags.sw25.ammoBack) return;
  if (why === "nocrit" && a.recover !== "nocrit") return;
  const actor = ChatMessage.getSpeakerActor(card.speaker) ?? game.actors.get(card.speaker?.actor);
  const it = actor?.items.get(a.itemId);
  if (!it || !it.isOwner) return;
  await it.update({ "system.quantity": N(it.system.quantity) + 1 });
  if (card.isOwner) await card.update({ "flags.sw25.ammoBack": true });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p><i class="fa-solid fa-arrow-rotate-left"></i> ${esc(a.name)}: ${esc(L2("подобрано, +1", "recovered, +1"))}</p>` });
}

/** Element flags of a shot (input of DamageSupporter.createChatTag): weapon elements + silver + the ammo element. */
export function ammoElements(el, a) {
  const out = foundry.utils.deepClone(el ?? {});
  if (!a) return out;
  if (a.silver) { out.physical = out.physical && typeof out.physical === "object" ? out.physical : {}; out.physical.mithril = true; }
  if (a.element) { out.magic = out.magic && typeof out.magic === "object" ? out.magic : {}; out.magic[a.element] = true; }
  return out;
}

/** A bullet spell needs a loaded bullet in a gun in hand (only for guns whose magazine is tracked). */
export function bulletReady(actor) {
  const guns = (actor?.items ?? []).filter((i) => i.type === "weapon" && weaponCat(i) === "gun" && i.system?.equip);
  const tracked = guns.filter((g) => magOf(g));
  if (!tracked.length) return true;
  return tracked.some((g) => magOf(g).loaded.length > 0);
}

/* ---------------- weapon sheet: ammo choice / magazine ---------------- */
function sheetBlock(item) {
  const cat = weaponCat(item);
  if (!SHOOTING.includes(cat)) return "";
  const actor = item.actor;
  if (cat === "gun") {
    const m = item.flags?.sw25?.mag ?? {};
    const loaded = Array.isArray(m.loaded) ? m.loaded : [];
    const counts = {};
    for (const b of loaded) counts[b.name] = (counts[b.name] ?? 0) + 1;
    const list = Object.entries(counts).map(([n, c]) => `${esc(n)} ×${c}`).join(", ") || "—";
    return `<label>${L2("Макс. магазин", "Max magazine")} <input type="number" class="sw25-mag-max" value="${N(m.max) || ""}" min="0" step="1" style="width:4em"></label>
      <span>${L2("Заряжено", "Loaded")}: <b>${loaded.length}${N(m.max) ? `/${N(m.max)}` : ""}</b> <small>${list}</small></span>
      ${actor && N(m.max) ? `<button type="button" class="sw25-reload" style="width:auto;flex:0 0 auto"><i class="fa-solid fa-rotate"></i> ${L2("Перезарядить", "Reload")}</button>` : ""}`;
  }
  if (!actor) return `<span class="hint">${L2("Боеприпасы выбираются, когда оружие у персонажа.", "Ammunition is chosen once the weapon is on a character.")}</span>`;
  const stacks = (actor.items ?? []).filter((i) => fits(ammoOf(i), cat));
  const cur = item.flags?.sw25?.ammoId ?? "";
  return `<label>${L2("Боеприпасы", "Ammunition")} <select class="sw25-ammo-pick"><option value="">${L2("— спросить —", "— ask —")}</option>${stacks.map((s) => `<option value="${s.id}"${s.id === cur ? " selected" : ""}>${esc(s.name)} (${N(s.system.quantity)})</option>`).join("")}</select></label>`;
}

export function registerAmmo() {
  Hooks.on("renderItemSheet", (app, html) => {
    const item = app.item ?? app.document;
    if (item?.type !== "weapon") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const block = sheetBlock(item);
    if (!root || !block) return;
    root.querySelector(".sw25-ammo-box")?.remove();
    const box = document.createElement("fieldset");
    box.className = "sw25-ammo-box";
    box.style.cssText = "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:4px 0;padding:4px 8px";
    box.innerHTML = `<legend>${L2("Стрельба", "Shooting")}</legend>${block}`;
    const anchor = root.querySelector("form .sheet-body, form section, .sheet-body, form");
    (anchor ?? root).prepend(box);
    box.querySelector(".sw25-mag-max")?.addEventListener("change", (ev) => item.update({ "flags.sw25.mag.max": Math.max(0, Math.floor(N(ev.target.value))) }));
    box.querySelector(".sw25-ammo-pick")?.addEventListener("change", (ev) => item.update({ "flags.sw25.ammoId": ev.target.value || null }));
    box.querySelector(".sw25-reload")?.addEventListener("click", () => reloadGun(item.actor, item));
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { reloadGun });
}
