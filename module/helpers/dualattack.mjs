/**
 * [Dual Wielding] (Core Rulebook I, p. 254): one weapon "1H" (not 1H#) with
 * Min STR 20 or less in each hand, one attack with each in the same Major
 * Action, -2 Accuracy on each, same target.
 *
 * The "Dual attack" button rolls two ordinary attack cards (each one goes
 * through the usual flow: the GM rolls the evasion, a hit gets its damage
 * button) and posts one more card with a single "Damage" button. That button
 * applies every hit separately (each one reduced by the target's Defense, as
 * the rules say) and sums the HP loss on that card: "-12 HP (7 + 5)".
 */
import { L2 } from "./monstergen-i18n.mjs";
import { DamageSupporter } from "./damagesupport.mjs";
import { showResistButton } from "./spellcast.mjs";
import { dualFeat, dualMods, attackMods } from "./feats.mjs";

const reqOf = (i) => parseInt(String(i.system?.reqstr ?? "").replace(/[^\d]/g, ""), 10) || 0;

/** The two weapons for a dual attack, or null (no feat / fewer than two fitting weapons). */
export function dualWeapons(actor) {
  if (!actor || actor.type !== "character") return null;
  const df = dualFeat(actor);
  if (!df) return null;
  // the 20 Strength limit can be lifted by a talent with the "no limit" note (kept by hand for now)
  const ws = actor.items.filter((i) => i.type === "weapon" && i.system.equip === true && i.system.usage === "1H" && reqOf(i) <= 20);
  if (ws.length < 2) return null;
  const main = ws.find((i) => i.name === actor.system.hitweapon);
  return main ? [main, ...ws.filter((i) => i !== main)].slice(0, 2) : ws.slice(0, 2);
}

/** One ordinary attack card (the usual evasion / damage flow follows). mods: { hit, dmg, note } */
export async function attackCard(actor, item, targets, mods = {}) {
  const hit = Number(mods.hit) || 0;
  const roll = await new Roll(`${item.system.checkformula || "2d6"}+${Number(item.system.checkbase) || 0}${hit ? (hit > 0 ? `+${hit}` : `${hit}`) : ""}`, actor.getRollData()).evaluate();
  const critical = roll.terms[0].total == 12 ? 1 : null;
  const fumble = roll.terms[0].total == 2 ? 1 : null;
  const label = `${item.name} (${game.i18n.localize("SW25.Item.Weapon.Hit")}${mods.note ? `, ${mods.note}` : ""})`;
  const target = targets.length ? targets.map((t) => t.id) : null;
  const targetName = targets.length ? targets.map((t) => `>>> ${t.document.name}`).join("<br>") : null;
  const resist = { name: game.i18n.localize("SW25.Resist.Check.Dodge"), key: "Dodge", result: "disappear" };
  const elements = DamageSupporter.elementsOf(item);
  const damage = actor.system.attributes.damage;
  const tags = DamageSupporter.createChatTag(elements, damage, actor.system.classType, DamageSupporter.getWeaponAttributes(item));
  const tooltip = await roll.getTooltip();
  const content = await renderTemplate("systems/sw25-ru/templates/roll/roll-check.hbs", {
    formula: roll.formula, tooltip, critical, fumble, total: roll.total,
    apply: item.system.applycheck, checktype: item.system.checkTypesButton ?? "", targetName,
    resist: targets.length ? (showResistButton(resist, targets) ? resist : null) : resist,
    tags,
  });
  const msg = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: label,
    rollMode: game.settings.get("core", "rollMode"),
    rolls: [roll],
    content,
    flags: { sw25: {
      total: roll.total, orgtotal: roll.total, formula: roll.formula, rolls: roll, tooltip,
      apply: item.system.applycheck, checktype: item.system.checkTypesButton ?? "",
      target, targetName, resist, elements, damage, tags,
      kind: "check", itemid: item.id, critical, fumble, dualAttack: !!mods.dual,
      featMods: mods.dmg ? { dmg: mods.dmg, form: "none" } : null,
    } },
  });
  return msg;
}

/** Sheet button: two attacks with -2 against the current target, plus the card with one damage button. */
export async function dualAttack(actor) {
  const ws = dualWeapons(actor);
  if (!ws) {
    ui.notifications.warn(L2("Парная атака: нужен талант [Парное оружие] и два экипированных оружия 1Р с мин. силой ≤20.",
      "Dual attack: needs [Dual Wielding] and two equipped 1H weapons with Min STR 20 or less."));
    return;
  }
  const targets = Array.from(game.user.targets);
  const other = dualMods(actor, ws[0]).otherTarget;
  if (targets.length > (other ? 2 : 1)) {
    ui.notifications.warn(other ? L2("Парная атака: не больше двух целей.", "Dual attack: two targets at most.") : L2("Парная атака: выберите одну цель (обе атаки идут в одну цель).", "Dual attack: pick one target (both attacks go to the same target)."));
    return;
  }
  const ids = [], tids = [];
  for (const [n, w] of ws.entries()) {
    const m = dualMods(actor, w);
    const tg = targets.length === 2 ? [targets[n]] : targets;
    const mod = `${m.hit > 0 ? "+" : "−"}${Math.abs(m.hit)}`;
    const note = m.hit ? L2(`парная атака ${mod}`, `dual attack ${mod}`) : L2("парная атака", "dual attack");
    ids.push((await attackCard(actor, w, tg, { hit: m.hit, dmg: m.dmg, note, dual: true })).id);
    tids.push(tg[0]?.id ?? null);
  }
  const names = ws.map((w) => `<b>${Handlebars.escapeExpression(w.name)}</b>`).join(" + ");
  let content = `<div class="sw25-dual">${names}<br><small>${L2("Каждый удар: своё уклонение цели и своя защита.", "Each hit: its own evasion and Defense.")}</small></div>`;
  if (targets.length)
    content += `<div class="flexrow"><button class="buttonclick sw25-autodamage" data-buttontype="dualdamage"><i class="fa-solid fa-burst"></i>&nbsp;${L2("Нанести урон (все попадания)", "Apply damage (all hits)")}</button></div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: L2("Парная атака", "Dual attack"),
    content,
    flags: { sw25: { dualOf: ids, dualTarget: targets[0]?.id ?? null, dualTargets: tids, baseContent: content } },
  });
}

/** Rows of an attack card's summary for one target (filled by the contest / apply children). */
function rowOf(atkId, tokenId) {
  return game.messages.get(atkId)?.flags?.sw25?.rows?.[tokenId] ?? null;
}

/**
 * "Apply damage (all hits)": every hit is applied on its own (Defense each time),
 * then the total is written on the dual card. `autoDamage(contestMsg)` comes from chatbutton.mjs.
 */
export async function dualDamage(dualMsg, autoDamage) {
  const f = dualMsg.flags?.sw25 ?? {};
  const ids = f.dualOf ?? [];
  const tids = f.dualTargets ?? ids.map(() => f.dualTarget);
  const tokId = f.dualTarget;
  if (!ids.length || !tokId) return;
  if (f.dualDone) {
    ui.notifications.warn(game.i18n.localize("SW25.Contest.AlreadyDone"));
    return;
  }
  const contests = ids.map((id, n) => game.messages.find((m) => m.flags?.sw25?.contest && m.flags.sw25.attackMessageId === id && m.flags.sw25.targetTokenId === (tids[n] ?? tokId)));
  const pending = ids.filter((id, n) => !contests[n] && game.messages.get(id)?.flags?.sw25?.fumble != 1);
  if (pending.length) {
    ui.notifications.warn(L2("Цель ещё не бросила уклонение против всех атак.", "The target has not rolled evasion against every attack yet."));
    return;
  }
  const hits = contests.filter((c) => c?.flags.sw25.damageMode && !c.flags.sw25.damageDone);
  for (const c of hits) await autoDamage(c);

  // wait for the apply cards to be summarised on the attack cards (the GM may do it over the socket)
  let parts = [];
  for (let i = 0; i < 20; i++) {
    parts = ids.map((id, n) => {
      if (!contests[n]?.flags.sw25.damageMode) return null;
      const r = rowOf(id, tids[n] ?? tokId);
      return r?.applyId ? Number(r.after) - Number(r.before) : undefined;
    });
    if (!parts.includes(undefined)) break;
    await new Promise((res) => setTimeout(res, 250));
  }
  const dealt = parts.filter((p) => typeof p === "number" && !Number.isNaN(p)).map((p) => -p);
  const total = dealt.reduce((a, b) => a + b, 0);
  const line = hits.length === 0
    ? `<div class="sw25-contest sw25-contest-miss"><b>${L2("Нет попаданий", "No hits")}</b></div>`
    : `<div class="sw25-contest sw25-contest-hit"><b>−${total} ${L2("ХП", "HP")}</b>${dealt.length > 1 ? ` (${dealt.join(" + ")})` : ""}</div>`;
  const content = (f.baseContent ?? dualMsg.content).replace(/<div class="flexrow"><button[^]*?<\/button><\/div>/, "") + line;
  const flags = { sw25: { ...f, dualDone: true } };
  if (dualMsg.isOwner) await dualMsg.update({ content, flags });
  else {
    const { emitToGM } = await import("./socket.mjs");
    emitToGM({ method: "updateChat", id: dualMsg.id, content, flags });
  }
}

/** Talents «another attack after a miss / hit»: one more ordinary attack, same weapon, same target. */
export async function followupAttack(contest) {
  const f = contest.flags?.sw25 ?? {};
  if (!f.followup || f.followupDone) { ui.notifications.warn(game.i18n.localize("SW25.Contest.AlreadyDone")); return; }
  const atk = game.messages.get(f.attackMessageId);
  const actor = atk ? ChatMessage.getSpeakerActor(atk.speaker) : null;
  const item = actor?.items.get(atk?.flags?.sw25?.itemid);
  if (!actor || !item) return;
  if (!(game.user.isGM || actor.isOwner)) { ui.notifications.warn(game.i18n.localize("SW25.Contest.AttackerOnly")); return; }
  const tok = canvas.tokens.get(f.targetTokenId);
  if (!tok) { ui.notifications.warn(game.i18n.localize("SW25.Contest.TargetNotOnScene")); return; }
  const flags = { sw25: { ...f, followupDone: true } };
  if (contest.isOwner) await contest.update({ "flags.sw25.followupDone": true });
  else { const { emitToGM } = await import("./socket.mjs"); emitToGM({ method: "updateChat", id: contest.id, flags }); }
  // refresh the summary row on the attack card
  // drop the used button from the attack card's summary
  const content = String(atk.content ?? "").replace(new RegExp(`\\s*<button class="buttonclick" data-buttontype="childfollowup:${contest.id}">[\\s\\S]*?</button>`), "");
  if (content !== atk.content) {
    if (atk.isOwner) await atk.update({ content });
    else { const { emitToGM } = await import("./socket.mjs"); emitToGM({ method: "updateChat", id: atk.id, content }); }
  }
  const m = await attackMods(actor, item, { noDeclare: true });
  await attackCard(actor, item, [tok], { hit: m?.hit ?? 0, dmg: m?.dmg ?? 0, note: L2("ещё атака", "another attack") });
}
