import { effectInitPC, effectMKnowPC } from "../sw25.mjs";
import { isClass, classLevel } from "../helpers/names.mjs";
import { L2 } from "../helpers/monstergen-i18n.mjs";

/**
 * [Round 71] Side initiative.
 *  - Every PC with Scout rolls the Initiative check (2d6 + Scout + Agility
 *    bonus; 6-6 is just 12, 1-1 still fails). Nobody with Scout -> one plain
 *    2d6 for the party (direct roll).
 *  - Monsters do not roll: the highest «Инициатива» value on the enemy side.
 *  - Party best >= monsters best -> the party acts first.
 *  - Each round: the whole winning side (any order), then the other side.
 *    No re-roll between rounds.
 * The tracker is sorted by side, then by Agility; the GM can hand the turn
 * to any combatant (flag icon in the tracker row).
 */
const T = (k, d) => (d ? game.i18n.format(`SW25.Init.${k}`, d) : game.i18n.localize(`SW25.Init.${k}`));

export function isPartySide(combatant) {
  const actor = combatant.actor;
  if (actor?.type === "character") return true;
  const disp = combatant.token?.disposition ?? actor?.prototypeToken?.disposition ?? -1;
  return disp === CONST.TOKEN_DISPOSITIONS.FRIENDLY;
}
function agilityOf(combatant) {
  const a = combatant.actor?.system?.abilities?.agi;
  return Number(a?.value ?? a?.total ?? 0) || 0;
}
function initItemOf(actor) {
  return actor?.items.find((i) => i.type === "check" && i.name === effectInitPC);
}
function scoutLevel(actor) {
  return classLevel(actor, "scout");
}

export class SW25Combat extends Combat {
  get sideInitiative() {
    return game.settings.get("sw25", "sideInitiative");
  }

  /** side first (winner, loser, unknown), then Agility, then name */
  _sortCombatants(a, b) {
    const combat = a.parent;
    if (!combat?.sideInitiative || combat.flags?.sw25?.partyFirst === undefined) {
      return Combat.prototype._sortCombatants.call(combat, a, b);
    }
    const pf = combat.flags.sw25.partyFirst;
    const rank = (c) => (isPartySide(c) === pf ? 0 : 1);
    return rank(a) - rank(b) || agilityOf(b) - agilityOf(a) || (a.name ?? "").localeCompare(b.name ?? "", "ru");
  }

  async rollAll(options) {
    if (this.sideInitiative) return this.rollSideInitiative(options);
    return super.rollAll(options);
  }
  async rollNPC(options) {
    if (this.sideInitiative) return this.rollSideInitiative(options);
    return super.rollNPC(options);
  }

  /** One initiative for the whole fight. */
  async rollSideInitiative({ messageOptions = {} } = {}) {
    // [ru.12] a second click while the roll is still running does not roll again
    if (this._sideRolling) return this;
    this._sideRolling = true;
    try { return await this._rollSideInitiative({ messageOptions }); } finally { this._sideRolling = false; }
  }
  async _rollSideInitiative({ messageOptions = {} } = {}) {
    const party = this.combatants.filter((c) => isPartySide(c) && c.actor);
    const enemies = this.combatants.filter((c) => !isPartySide(c) && c.actor);
    // 1.3 monster knowledge comes before 1.4 initiative
    const knowledgeHtml = await monsterKnowledge(party, enemies);

    // party: every Scout rolls; no Scout -> one plain 2d6
    const rolls = [];
    const scouts = party.filter((c) => scoutLevel(c.actor) > 0);
    for (const c of scouts) {
      const base = Number(initItemOf(c.actor)?.system.checkbase ?? 0);
      const r = await new Roll(`2d6 + ${base}`).evaluate();
      const d = r.dice[0]?.results.map((x) => x.result) ?? [];
      const fumble = d[0] === 1 && d[1] === 1;
      rolls.push({ c, roll: r, total: fumble ? -Infinity : r.total, fumble });
    }
    if (!rolls.length && party.length) {
      const r = await new Roll("2d6").evaluate();
      const d = r.dice[0]?.results.map((x) => x.result) ?? [];
      rolls.push({ c: null, roll: r, total: d[0] === 1 && d[1] === 1 ? -Infinity : r.total, direct: true });
    }
    const best = rolls.reduce((m, x) => (x.total > (m?.total ?? -Infinity) ? x : m), null);
    const partyBest = best && Number.isFinite(best.total) ? best.total : 0;
    const enemyVals = enemies.map((c) => ({ c, v: Number(c.actor.system.preemptive ?? c.actor.system.initiativeFormula ?? 0) || 0 }));
    const enemyBest = enemyVals.reduce((m, x) => Math.max(m, x.v), 0);
    const partyFirst = !enemies.length || partyBest >= enemyBest;

    const updates = [
      ...party.map((c) => ({ _id: c.id, initiative: partyBest })),
      ...enemyVals.map(({ c }) => ({ _id: c.id, initiative: enemyBest })),
    ];
    await this.update({ "flags.sw25.partyFirst": partyFirst });
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    this.setupTurns();
    await this.update({ turn: 0 });

    // chat card
    const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
    const rows = rolls
      .map((x) => `<div class="sw25-cast-mp">${x.direct ? T("Direct") : esc(x.c.name)}: <b>${x.fumble ? T("Fumble") : x.roll.total}</b> <span class="sw25-dim">(${esc(x.roll.formula)} → ${x.roll.dice[0]?.results.map((r) => r.result).join("+")})</span></div>`)
      .join("");
    const topEnemy = enemyVals.find((x) => x.v === enemyBest)?.c;
    const content =
      `<div class="sw25-contest ${partyFirst ? "sw25-contest-hit" : "sw25-contest-miss"}"><b>${partyFirst ? T("PartyFirst") : T("EnemyFirst")}</b></div>` +
      `<div class="sw25-cast-mp">${T("Compare", { party: partyBest, enemy: enemyBest })}${topEnemy ? ` <span class="sw25-dim">(${esc(topEnemy.name)})</span>` : ""}</div>` +
      (rolls.length ? rows : "") +
      (!scouts.length && party.length ? `<div class="sw25-cast-mp"><i>${T("NoScout")}</i></div>` : "") +
      `<div class="sw25-cast-mp"><i>${T("Order")}</i></div>` + knowledgeHtml;
    await ChatMessage.create({
      speaker: { alias: T("Title") },
      flavor: T("Title"),
      content,
      rolls: rolls.map((x) => x.roll),
      ...messageOptions,
    });
    return this;
  }

  /** single rolls (legacy / side initiative off) */
  async rollInitiative(ids, { updateTurn = true, messageOptions = {} } = {}) {
    if (this.sideInitiative) {
      // [2026-10-07] a single die button used to re-roll the whole side and reset the turn:
      // once the sides are decided (or for a player) it does nothing
      if (!game.user.isGM || this.flags?.sw25?.partyFirst !== undefined) {
        ui.notifications.info(L2("Инициатива сторон уже определена — отдельные броски не нужны.", "Side initiative is already decided — no separate rolls are needed."));
        return this;
      }
      return this.rollSideInitiative({ messageOptions });
    }
    ids = typeof ids === "string" ? [ids] : Array.from(ids ?? []);
    const currentId = this.combatant?.id;
    const combatants = ids.map((id) => this.combatants.get(id)).filter(Boolean);
    const updates = [];
    const messages = [];
    for (const combatant of combatants) {
      const actor = combatant.actor;
      if (!actor) continue;
      const initiativeFormula = actor.system.initiativeFormula || "2d6";
      const roll = new Roll(String(initiativeFormula), actor.getRollData());
      await roll.evaluate();
      updates.push({ _id: combatant.id, initiative: roll.total });
      let flavor = `${actor.name} - ${game.i18n.localize("SW25.Monster.Preemptive")}`;
      if (actor.type == "character") flavor = `${actor.name} - ${effectInitPC}`;
      messages.push(
        await roll.toMessage(
          { speaker: ChatMessage.getSpeaker({ actor, token: combatant.token }), flavor, ...messageOptions },
          { create: false }
        )
      );
    }
    if (updates.length > 0) await this.updateEmbeddedDocuments("Combatant", updates);
    if (messages.length) await ChatMessage.implementation.create(messages);
    if (updateTurn && currentId) {
      const turn = this.turns.findIndex((t) => t.id === currentId);
      if (turn >= 0 && turn !== this.turn) await this.update({ turn });
    }
    return this;
  }
}

/** The side initiative bar at the top of the tracker: who acts first; the GM's roll / re-roll / switch-on button. */
function sideBar(root, combat) {
  root.querySelector(".sw25-side-bar")?.remove();
  if (!combat) return;
  const on = game.settings.get("sw25", "sideInitiative"), gm = game.user.isGM;
  if (!on && !gm) return;
  const pf = combat.flags?.sw25?.partyFirst;
  const bar = document.createElement("div");
  bar.className = "sw25-side-bar";
  bar.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 6px;margin:2px 0;border-radius:4px;background:rgba(0,0,0,.25)";
  const status = !on ? L2("Инициатива сторонами выключена", "Side initiative is off")
    : pf === undefined ? L2("Инициатива сторон ещё не брошена", "Side initiative not rolled yet")
    : pf ? L2("Первой ходит партия", "The party acts first") : L2("Первыми ходят враги", "The enemies act first");
  const color = !on || pf === undefined ? "" : pf ? "color:#9ae6b4" : "color:#feb2b2";
  bar.innerHTML = `<i class="fa-solid fa-flag"></i><b style="flex:1;${color}">${foundry.utils.escapeHTML(status)}</b>`;
  if (gm) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText = "flex:0 0 auto;width:auto;line-height:1.6;padding:0 8px";
    btn.innerHTML = !on ? `<i class="fa-solid fa-toggle-on"></i> ${L2("Включить", "Turn on")}`
      : pf === undefined ? `<i class="fa-solid fa-dice"></i> ${L2("Бросить инициативу сторон", "Roll side initiative")}`
      : `<i class="fa-solid fa-rotate"></i> ${L2("Перебросить", "Re-roll")}`;
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (!on) { await game.settings.set("sw25", "sideInitiative", true); return ui.combat?.render(); }
      if (!combat.combatants.size) return ui.notifications.warn(L2("В бою никого нет: добавьте токены в трекер.", "Nobody in the combat: add tokens to the tracker."));
      if (pf !== undefined) {
        const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: L2("Инициатива сторон", "Side initiative") }, content: `<p>${L2("Перебросить инициативу сторон? По правилам её бросают один раз за бой — переброс нужен, если состав боя изменился.", "Re-roll side initiative? It is rolled once per combat — re-roll only if the combatants changed.")}</p>` });
        if (!ok) return;
      }
      await combat.rollSideInitiative();
    });
    bar.append(btn);
  }
  const anchor = root.querySelector("ol.combat-tracker, .combat-tracker, #combat-tracker");
  if (anchor) anchor.before(bar); else root.prepend(bar);
}

/** GM: flag icon on each tracker row -> this combatant acts now. */
export function registerSideInitiativeUI() {
  Hooks.on("renderCombatTracker", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const combat = app.viewed ?? game.combat;
    if (root) sideBar(root, combat);
    if (!root || !combat || !game.user.isGM || !game.settings.get("sw25", "sideInitiative")) return;
    const pf = combat.flags?.sw25?.partyFirst;
    for (const li of root.querySelectorAll("[data-combatant-id]")) {
      const c = combat.combatants.get(li.dataset.combatantId);
      if (!c) continue;
      if (pf !== undefined) li.classList.add((isPartySide(c) === pf) ? "sw25-side-first" : "sw25-side-second");
      if (li.querySelector(".sw25-take-turn")) continue;
      const btn = document.createElement("a");
      btn.className = "sw25-take-turn combatant-control";
      btn.dataset.tooltip = T("TakeTurn");
      btn.innerHTML = '<i class="fa-solid fa-flag"></i>';
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const idx = combat.turns.findIndex((t) => t.id === c.id);
        if (idx >= 0) await combat.update({ turn: idx });
      });
      (li.querySelector(".combatant-controls") ?? li).prepend(btn);
    }
  });
}

/**
 * [Round 74] 1.3 Monster knowledge: every Sage (or
 * Rider) rolls once per kind of monster; the best result vs the
 * monster's Репутация identifies it, vs Слабость switches its «Слабое место»
 * effect on (off otherwise). 6-6: automatic success (+5), 1-1: fail.
 */
async function monsterKnowledge(party, enemies) {
  const K = (k, d) => (d ? game.i18n.format(`SW25.Know.${k}`, d) : game.i18n.localize(`SW25.Know.${k}`));
  const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
  const know = party.filter((c) => c.actor.items.some((i) => i.type === "skill" && isClass(i.name, "sage", "rider") && Number(i.system.skilllevel) > 0));
  const kinds = new Map();
  // [ru.12.1] one kind = same name AND same Reputation / Weak point (different monsters with one name stay apart)
  for (const c of enemies) {
    const key = `${c.actor.name}|${Number(c.actor.system.popularity) || 0}|${Number(c.actor.system.weakpoint) || 0}`;
    if (!kinds.has(key)) kinds.set(key, []);
    kinds.get(key).push(c);
  }
  if (!kinds.size) return "";
  const rows = [];
  for (const [kindKey, list] of kinds) {
    const name = list[0].actor.name;
    const a = list[0].actor;
    const rep = Number(a.system.popularity ?? 0) || 0;
    const weak = Number(a.system.weakpoint ?? 0) || 0;
    let best = null;
    for (const c of know) {
      const it = c.actor.items.find((i) => i.type === "check" && (i.name === effectMKnowPC || i.name === game.i18n.localize("SW25.Config.MKnow")));
      const base = Number(it?.system.checkbase ?? 0);
      const r = await new Roll(`2d6 + ${base}`).evaluate();
      const d = r.dice[0].results.map((x) => x.result);
      const total = d[0] === 1 && d[1] === 1 ? -Infinity : d[0] === 6 && d[1] === 6 ? r.total + 5 : r.total;
      if (!best || total > best.total) best = { c, r, total };
    }
    const known = best && best.total >= rep;
    const weakOn = best && weak > 0 && best.total >= weak;
    // switch «Слабое место» on every token of this kind
    for (const c of list) {
      const effs = c.actor.effects.filter((e) => /^Слабое место|^Weak|^弱点/i.test(e.name));
      const upd = effs.filter((e) => e.disabled === !!weakOn).map((e) => ({ _id: e.id, disabled: !weakOn }));
      if (upd.length) await c.actor.updateEmbeddedDocuments("ActiveEffect", upd);
    }
    const who = best ? `${esc(best.c.name)} ${Number.isFinite(best.total) ? best.total : "1-1"}` : K("Nobody");
    const res = !best ? K("Unknown") : weakOn ? K("Weak") : known ? K("Known") : K("Unknown");
    rows.push(`<div class="sw25-cast-mp"><b>${esc(name)}</b> (${K("Vs", { rep, weak })}): ${who} — ${res}</div>`);
  }
  return `<div class="sw25-cast-mp"><b>${K("Title")}</b></div>` + rows.join("");
}
