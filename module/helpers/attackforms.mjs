/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​​​‌​‌‌​​‌​‌​​‌‌‌​​​​​‌‌​‌​​​​‌‌​‌‌‌​‌‌​​​​‌⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.12): see LICENSE-RESERVED.txt.
 */
/**
 * Attack forms of the talent constructor (flags.sw25.feat.form) that need more than a bonus:
 *   best    — accuracy rolled twice, the better roll is kept (two shots are spent);
 *   double  — total damage ×2 when accuracy beats evasion by formArg or more (one target only);
 *   pierce  — the target's Defense counts as half (tier 2/3: 0 on a critical);
 *   combo   — a spell is put on a melee weapon (MP paid then) and is cast at the next attack's target;
 *   counter — when attacked in melee: your own accuracy instead of evasion (once per round).
 * The attack card keeps featMods.form / formArg; the damage side reads them from there.
 */
import { L2 } from "./monstergen-i18n.mjs";
import { isLabel } from "./utils.mjs";

const N = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const RANGED = ["bow", "crossbow", "gun", "throw"];
const dice = (roll) => (roll?.dice?.[0]?.results ?? roll?.terms?.[0]?.results ?? []).map((x) => x.result);

/* ---------------- best of two ---------------- */
/** The better of two evaluated rolls (6-6 first, 1-1 last, then the total). */
export function betterRoll(a, b) {
  const rank = (r) => { const [x, y] = dice(r); return x === 6 && y === 6 ? 1e6 : x === 1 && y === 1 ? -1e6 : r.total; };
  return rank(b) > rank(a) ? [b, a] : [a, b];
}

/* ---------------- armor piercing ---------------- */
/** Defense used against this damage card: half (round up), 0 on a critical for tier 2 / 3. */
export function piercedDefense(def, card, tokenId) {
  const p = card?.flags?.sw25?.pierce;
  if (!p?.tier || (p.tokenId && p.tokenId !== tokenId)) return { def, note: "" };
  const crit = card.flags.sw25.extraRoll != null;
  const out = p.tier >= 2 && crit ? 0 : Math.ceil(N(def) / 2);
  return { def: out, note: L2(`Пробой брони: защита ${def} → ${out}`, `Armor piercing: Defense ${def} → ${out}`) };
}
/** When an attack with «pierce» hits several targets, one of them (random) gets the effect. */
export function pierceTarget(targets) {
  const ids = Array.from(targets ?? []).map((t) => t.id ?? t);
  return ids.length > 1 ? ids[Math.floor(Math.random() * ids.length)] : ids[0] ?? null;
}

/* ---------------- critical immunity (monster setting) ---------------- */
/** No critical for this damage: every target is immune to it (armor piercing III ignores the immunity). */
export function critBlocked(item, targets, card) {
  const list = Array.from(targets ?? []);
  if (!list.length) return false;
  const fm = card?.flags?.sw25?.featMods;
  if (fm?.form === "pierce" && N(fm.formArg) >= 3) return false;
  const edged = item?.type === "weapon" && item.system?.type === "blade";
  return list.every((t) => { const c = (t.actor ?? t.document?.actor)?.flags?.sw25?.critImmune; return c === "all" || (c === "edged" && edged); });
}

/* ---------------- damage ×2 on a margin ---------------- */
export function doubleOn(attackMsg, atk, def, defenderWins) {
  const f = attackMsg.flags?.sw25 ?? {};
  if (f.featMods?.form !== "double" || defenderWins || (f.target?.length ?? 0) > 1) return false;
  return atk - def >= (N(f.featMods.formArg, 3) || 3);
}

/* ---------------- spell on the weapon (combo) ---------------- */
export async function loadWeaponSpell(actor, weapon, feat) {
  const spells = actor.items.filter((i) => i.type === "spell");
  if (!spells.length) return ui.notifications.warn(L2("У персонажа нет заклинаний.", "The character has no spells."));
  const opts = spells.map((s) => `<option value="${s.id}">${esc(s.name)} (${N(s.system.mpcost)} ${L2("ОМ", "MP")})</option>`).join("");
  const id = await foundry.applications.api.DialogV2.wait({
    window: { title: `${feat?.name ?? ""}: ${weapon.name}` },
    content: `<p><select name="sp" style="width:100%">${opts}</select></p><p class="hint">${esc(L2("ОМ списываются сейчас. Заклинание сработает в цель следующей атаки ближнего боя этим оружием.", "MP is paid now. The spell goes off at the target of the next melee attack with this weapon."))}</p>`,
    buttons: [
      { action: "ok", label: L2("Наложить", "Put on"), default: true, callback: (ev, btn) => btn.form.querySelector("[name=sp]")?.value },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
  });
  const sp = actor.items.get(id);
  if (!sp) return;
  const cost = N(sp.system.mpcost), mp = N(actor.system.mp?.value);
  if (cost > mp) return ui.notifications.warn(L2(`${sp.name}: не хватает ОМ (${cost} из ${mp}).`, `${sp.name}: not enough MP (${cost} of ${mp}).`));
  await actor.update({ "system.mp.value": mp - cost, "flags.sw25.weaponSpell": { weaponId: weapon.id, spellId: sp.id, cost } });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flavor: esc(feat?.name ?? ""),
    content: `<p><i class="fa-solid fa-wand-sparkles"></i> ${esc(L2(`${sp.name} — на оружии «${weapon.name}»`, `${sp.name}: on the weapon «${weapon.name}»`))}</p><div class="sw25-cast-mp">${esc(L2(`ОМ −${cost} (${mp} → ${mp - cost})`, `MP −${cost} (${mp} → ${mp - cost})`))}</div>` });
}
/** After a melee attack with the weapon that holds a spell: cast it (already paid) at the same targets. */
export async function fireWeaponSpell(actor, weapon) {
  const ws = actor?.flags?.sw25?.weaponSpell;
  if (!ws || ws.weaponId !== weapon?.id || RANGED.includes(weapon.system?.category)) return;
  const sp = actor.items.get(ws.spellId);
  await actor.update({ "flags.sw25.weaponSpell": null });
  if (!sp) return;
  const { castSpell } = await import("./spellcast.mjs");
  const msg = await castSpell(actor, sp, { pay: async () => L2(`ОМ уже списаны (на оружии «${weapon.name}»)`, `MP already paid (on the weapon «${weapon.name}»)`) });
  // [ru.12.1] the cast did not happen (a form forbids spells, cancelled): the paid spell stays on the weapon
  if (!msg) await actor.update({ "flags.sw25.weaponSpell": ws });
}

/* ---------------- counter ----------------⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​​​‌​‌‌​​‌​‌​​‌‌‌​​​​​‌‌​‌​​​​‌‌​‌‌‌​‌‌​​​​‌​​‌​‌‌​‌​‌‌​​​‌​⁠ */
function turnKey() { const c = game.combat; return c?.started ? `${c.id}:${c.round}` : null; }
/** The counter talent of this actor (constructor form «counter»), or null. */
export async function counterFeat(actor) {
  if (!actor) return null;
  const { activeFeats } = await import("./feats.mjs");
  return activeFeats(actor).find(({ f }) => f.kind === "feat" && f.form === "counter")?.item ?? null;
}
const counterUsed = (actor) => { const k = turnKey(); return !!k && actor?.flags?.sw25?.counterRound === k; };
/** Is this attack card a melee attack that a counter can answer? */
export function meleeAttack(msg) {
  const f = msg?.flags?.sw25;
  if (!f || f.kind !== "check" || f.spellcast || f.contest || f.counter || !f.itemid) return false;
  const actor = ChatMessage.getSpeakerActor(msg.speaker);
  const it = actor?.items.get(f.itemid);
  if (!it) return false;
  // [ru.12.1] only an attack against Evasion (not a breath / poison against Fortitude or Willpower)
  const rk = f.resist?.key ?? (["Уклонение", "Evasion", "Dodge", "回避"].includes(f.resist?.name) ? "Dodge" : f.resist?.name ? "other" : null);
  if (rk && rk !== "Dodge") return false;
  if (it.type === "weapon") return !RANGED.includes(it.system?.category);
  return it.type === "monsterability" && isLabel(it.system?.label1, "MonHit");
}
/** Tokens of the card's targets that may counter it now (not resisted yet, not used this round). */
export async function counterCandidates(msg) {
  if (!meleeAttack(msg)) return [];
  const done = new Set(game.messages.filter((x) => x.flags?.sw25?.contest && (x.flags.sw25.attackMessageId === msg.id || x.flags.sw25.counterOf === msg.id)).map((x) => x.flags.sw25.counterBy ?? x.flags.sw25.targetTokenId));
  const scene = game.scenes.get(msg.speaker?.scene);
  const out = [];
  for (const id of msg.flags.sw25.target ?? []) {
    if (done.has(id)) continue;
    const td = canvas.tokens.get(id)?.document ?? scene?.tokens.get(id);
    if (td?.actor && !counterUsed(td.actor) && await counterFeat(td.actor)) out.push(td);
  }
  return out;
}

/** The defender's accuracy for a counter: { formula, label, item } with the best equipped melee weapon / monster attack. */
function counterAccuracy(actor) {
  if (actor.type === "monster" || actor.type === "npc") {
    const atk = actor.items.find((i) => i.type === "monsterability" && isLabel(i.system.label1, "MonHit"));
    if (!atk) return null;
    return { formula: atk.system.usefix1 ? `7+${N(atk.system.checkbase1)}` : `2d6+${N(atk.system.checkbase1)}`, item: atk };
  }
  const ws = actor.items.filter((i) => i.type === "weapon" && i.system?.equip && !RANGED.includes(i.system?.category));
  if (!ws.length) return null;
  const w = ws.sort((a, b) => N(b.system.checkbase) - N(a.system.checkbase))[0];
  return { formula: `${w.system.checkformula || "2d6"}+${N(w.system.checkbase)}`, item: w };
}

/**
 * Counter the attack card for the given defender token. Ties go to the original attacker (the counter is the active side).
 * Win: a contest card «counter hit» with a damage button against the attacker. Loss: the attack hits, its first damage roll counts as 12.
 */
export async function doCounter(attackMsg, defTd) {
  const def = defTd.actor;
  const feat = await counterFeat(def);
  if (!feat) return;
  if (counterUsed(def)) return ui.notifications.warn(L2(`${def.name}: контратака в этом раунде уже была.`, `${def.name}: a counter was already used this round.`));
  const acc = counterAccuracy(def);
  if (!acc) return ui.notifications.warn(L2(`${def.name}: нет надетого оружия ближнего боя.`, `${def.name}: no equipped melee weapon.`));
  const key = turnKey();
  if (key && def.isOwner) await def.update({ "flags.sw25.counterRound": key });
  // [ru.12.1] the defender's own always-on talents for this weapon (accuracy, damage) count too
  let fm = null;
  if (acc.item.type === "weapon") { const { attackMods } = await import("./feats.mjs"); fm = await attackMods(def, acc.item, { noDeclare: true }); }
  const roll = await new Roll(fm?.hit ? `${acc.formula}+${fm.hit}` : acc.formula, def.getRollData()).evaluate();
  const f = attackMsg.flags.sw25;
  const [a1, a2] = dice(roll), [p1, p2] = Array.isArray(f.dice) ? f.dice : dice(attackMsg.rolls?.[0]);
  const mine = roll.total, theirs = N(f.total);
  const activeCrit = a1 === 6 && a2 === 6, activeFumble = a1 === 1 && a2 === 1;
  const passiveCrit = f.critical == 1 || (p1 === 6 && p2 === 6), passiveFumble = f.fumble == 1 || (p1 === 1 && p2 === 1);
  let win;
  if (activeFumble) win = false; else if (passiveCrit) win = false; else if (activeCrit) win = true; else if (passiveFumble) win = true; else win = mine > theirs;
  const atkTokenId = attackMsg.speaker?.token;
  const label = `${feat.name}: ${acc.item.name}`;
  const vs = `${L2("контратака", "counter")} ${mine} · ${L2("атака", "attack")} ${theirs}`;
  // the counter roll card: a check of the defender at the attacker (its damage button uses the defender's weapon)
  const cardFlags = { sw25: { kind: "check", counter: true, itemid: acc.item.id, total: mine, orgtotal: mine, target: atkTokenId ? [atkTokenId] : null, featMods: fm && (fm.dmg || fm.crit || fm.lt) ? { dmg: fm.dmg || 0, crit: fm.crit || 0, lt: fm.lt || 0, form: "none", names: fm.names ?? [] } : null } };
  const counterCard = await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token: defTd }), flavor: esc(label), rolls: [roll],
    content: `<div class="dice-roll"><div class="dice-result"><h4 class="dice-total">${mine}</h4></div></div>`, flags: cardFlags });
  const html = `<div class="sw25-contest ${win ? "sw25-contest-hit" : "sw25-contest-miss"}"><b>${win ? L2("Контратака удалась: атака отменена", "Counter succeeded: the attack is cancelled") : L2("Контратака не удалась: атака попала, урон с броском 12", "Counter failed: the attack hits, damage with a roll of 12")}</b> <span class="sw25-contest-vs">(${vs})</span></div>`
    + `<div class="flexrow"><button class="buttonclick sw25-autodamage" data-buttontype="autodamage"><i class="fa-solid fa-burst"></i>&nbsp;${L2("Урон", "Damage")}</button></div>`;
  // the contest card: on a win the damage goes from the counter card to the attacker; on a loss the original attack hits the defender
  const flags = win
    ? { contest: true, parentId: attackMsg.id, attackMessageId: counterCard.id, targetTokenId: atkTokenId, defenderWins: false, damageMode: "full", counterOf: attackMsg.id, counterBy: defTd.id }
    : { contest: true, parentId: attackMsg.id, attackMessageId: attackMsg.id, targetTokenId: defTd.id, defenderWins: false, damageMode: "full", fixed12: true };
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token: defTd }), content: html, flags: { sw25: flags } });
}

/** A «Counter» button on melee attack cards for the defenders who have the talent (owners and the GM click it). */
export async function bindCounterButton(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || !meleeAttack(message) || root.querySelector(".sw25-counter")) return;
  const cand = (await counterCandidates(message)).filter((td) => game.user.isGM || td.actor?.isOwner);
  if (!cand.length) return;
  const box = document.createElement("div");
  box.className = "flexrow sw25-counter";
  box.innerHTML = cand.map((td) => `<button type="button" data-token="${td.id}"><i class="fa-solid fa-right-left"></i>&nbsp;${esc(L2(`Контратака: ${td.name}`, `Counter: ${td.name}`))}</button>`).join("")
    + (game.user.isGM && cand.some((td) => td.actor?.type !== "character") ? `<button type="button" data-evade="1"><i class="fa-solid fa-person-running"></i>&nbsp;${esc(L2("Уклонение монстров", "Monsters evade"))}</button>` : "");
  (root.querySelector(".message-content") ?? root).appendChild(box);
  box.addEventListener("click", async (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    ev.preventDefault(); box.querySelectorAll("button").forEach((x) => (x.disabled = true));
    if (b.dataset.evade) {
      const { chatButton } = await import("./chatbutton.mjs");
      return chatButton(message, "buttonresist", { onlyTokens: cand.filter((td) => td.actor?.type !== "character").map((td) => td.id) });
    }
    const td = cand.find((x) => x.id === b.dataset.token);
    if (td) await doCounter(message, td);
  });
}
