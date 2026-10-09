/**
 * [Round 74] End of session, book I p.188-192.
 *   Experience: 1000 if the goal was reached (500 if not)
 *               + 10 × level of every defeated monster (p.384)
 *               + 50 for every automatic failure (1-1) of the character (p.91)
 *   Money: the loot sold, split between the characters.
 *   Reputation: each sword shard -> 1d6 (every character rolls all shards).
 *   Growth: one growth roll per character (existing growth card).
 * The pool (defeated monster levels, loot) is collected automatically by the
 * active GM during the session; 1-1 are counted on the characters.
 */
import { growthCheck } from "./growthcheck.mjs";
import { L2 } from "./monstergen-i18n.mjs";

const T = (k, d) => (d ? game.i18n.format(`SW25.Session.${k}`, d) : game.i18n.localize(`SW25.Session.${k}`));
const POOL = () => foundry.utils.deepClone(game.settings.get("sw25", "sessionPool") ?? {});
const isActiveGM = () => game.user.isGM && game.user === game.users.activeGM;

export function registerSessionSettings() {
  game.settings.register("sw25", "sessionPool", { scope: "world", config: false, type: Object, default: { monsters: [], loot: [] } });
}

async function addToPool(key, entry) {
  const pool = POOL();
  (pool[key] ??= []).push(entry);
  await game.settings.set("sw25", "sessionPool", pool);
}

function isFumble(roll) {
  const d = roll?.dice?.[0];
  if (!d || d.faces !== 6 || d.results.length !== 2) return false;
  return d.results.every((r) => r.result === 1);
}
function goldOf(text) {
  // [2026-10-07] "100 Г" gave 0 (\b never matches after a Cyrillic letter), "1,660G" gave 660
  const m = String(text ?? "").match(/(\d[\d\s,.]*)\s*[GГ](?![A-Za-zА-Яа-яЁё])/);
  return m ? Number(m[1].replace(/[\s,.]/g, "")) : 0;
}

export function registerSessionHooks() {
  // 1-1 of player characters (checks only, not power rolls) and loot results
  Hooks.on("createChatMessage", async (msg) => {
    if (!isActiveGM()) return;
    const f = msg.flags?.sw25 ?? {};
    if (f.kind === "loot" && f.lootItem) {
      await addToPool("loot", { item: f.lootItem, gold: goldOf(f.lootItem), from: f.lootFrom ?? "" });
      return;
    }
    const actor = ChatMessage.getSpeakerActor(msg.speaker);
    if (actor?.type !== "character") return;
    if (/Мощ|Power|威力/i.test(msg.flavor ?? "")) return;
    // [2026-10-07] the growth roll (2d6 picking abilities) is not a check
    if (msg.flavor === game.i18n.localize("SW25.Ability.Growth")) return;
    const n = (msg.rolls ?? []).filter(isFumble).length;
    if (n) await actor.setFlag(game.system.id, "sessionFumbles", Number(actor.getFlag(game.system.id, "sessionFumbles") ?? 0) + n);
  });
  // defeated monsters: when a combat ends
  Hooks.on("deleteCombat", async (combat) => {
    if (!isActiveGM()) return;
    for (const c of combat.combatants) {
      const a = c.actor;
      if (!a || a.type === "character") continue;
      if (c.token?.flags?.sw25?.sectionOf) continue;   // [2026-10-09] a section token is not a separate monster
      // [2026-10-07] an empty HP field ("" by default) used to count as 0 = killed
      const hpv = a.system.hp?.value;
      const down = c.defeated || (hpv !== "" && hpv !== null && hpv !== undefined && Number(hpv) <= 0);
      if (!down) continue;
      if ((POOL().monsters ?? []).some((m) => m.cid === c.id)) continue;
      await addToPool("monsters", { name: c.name, level: Number(a.system.monlevel ?? 0) || 0, cid: c.id });
    }
  });
}

/** GM dialog: rewards for the party. */
export async function sessionEnd() {
  if (!game.user.isGM) return ui.notifications.warn(T("GMOnly"));
  const pool = POOL();
  // [2026-10-09] defeated monsters of combats that are still open count too
  const monsters = [...(pool.monsters ?? [])];
  for (const cb of game.combats) for (const c of cb.combatants) {
    const a = c.actor;
    if (!a || a.type === "character" || c.token?.flags?.sw25?.sectionOf || monsters.some((m) => m.cid === c.id)) continue;
    const hpv = a.system.hp?.value;
    if (c.defeated || (hpv !== "" && hpv !== null && hpv !== undefined && Number(hpv) <= 0)) monsters.push({ name: c.name, level: Number(a.system.monlevel ?? 0) || 0, cid: c.id });
  }
  const loot = pool.loot ?? [];
  const monsterXP = monsters.reduce((s, m) => s + 10 * (Number(m.level) || 0), 0);
  const lootGold = loot.reduce((s, l) => s + (Number(l.gold) || 0), 0);
  const pcs = game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner);
  const all = pcs.length ? pcs : game.actors.filter((a) => a.type === "character");
  const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
  const rows = all
    .map((a) => {
      const fum = Number(a.getFlag(game.system.id, "sessionFumbles") ?? 0);
      return `<tr><td><label><input type="checkbox" name="pc" value="${a.id}" checked> ${esc(a.name)}</label></td><td><input type="number" name="fum-${a.id}" value="${fum}" min="0" style="width:4em"> ×50</td></tr>`;
    })
    .join("");
  const content = `
    <div class="sw25-session">
      <p><b>${T("Goal")}</b>
        <label><input type="radio" name="goal" value="1000" checked> ${T("GoalYes")}</label>
        <label><input type="radio" name="goal" value="500"> ${T("GoalNo")}</label></p>
      <p><b>${T("Monsters")}</b> <input type="number" name="mxp" value="${monsterXP}" style="width:6em"> ${T("XP")}
        <br><span class="sw25-dim">${monsters.length ? esc(monsters.map((m) => `${m.name} (${m.level})`).join(", ")) : T("NoMonsters")}</span></p>
      <p><b>${T("Gold")}</b> <input type="number" name="gold" value="${lootGold}" style="width:7em"> G
        <br><span class="sw25-dim">${loot.length ? esc(loot.map((l) => l.item).join("; ")) : T("NoLoot")}</span></p>
      <p><b>${T("Shards")}</b> <input type="number" name="shards" value="0" min="0" style="width:4em"> <span class="sw25-dim">${T("ShardsHint")}</span></p>
      <p><label><input type="checkbox" name="growth" checked> ${T("Growth")}</label></p>
      <p><b>${L2("Как выдать", "How to give")}</b>
        <label><input type="radio" name="mode" value="sheets" checked> ${L2("начислить на листы", "add to the sheets")}</label>
        <label><input type="radio" name="mode" value="chat"> ${L2("только в чат", "chat only")}</label>
        <br><label><input type="checkbox" name="reset"> ${L2("в режиме «только в чат» тоже очистить итоги сессии (монстры, добыча, счётчики 1-1)", "in chat-only mode also clear the session totals (monsters, loot, 1-1 counters)")}</label></p>
      <table><tr><th>${T("Pc")}</th><th>${T("Fumbles")}</th></tr>${rows}</table>
    </div>`;
  const DialogV2 = foundry.applications.api.DialogV2;
  const form = await DialogV2.wait({
    window: { title: T("Title") },
    position: { width: 460 },
    content,
    buttons: [
      { action: "apply", label: T("Apply"), default: true, callback: (ev, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object },
      { action: "cancel", label: T("Cancel") },
    ],
    rejectClose: false,
  }).catch(() => null);
  if (!form || form === "cancel") return null;

  const chosen = [form.pc].flat().filter(Boolean).map((id) => game.actors.get(id)).filter(Boolean);
  if (!chosen.length) return null;
  const base = Number(form.goal) || 0;
  const mxp = Number(form.mxp) || 0;
  const gold = Number(form.gold) || 0;
  const share = Math.floor(gold / chosen.length);
  const shards = Math.max(0, Number(form.shards) || 0);
  const toSheets = form.mode !== "chat";
  const reset = toSheets || !!form.reset;
  // book I p.192: every character gets the same reputation — one roll for the party
  let rep = 0, repDice = "";
  if (shards) {
    const r = await new Roll(`${shards}d6`).evaluate();
    rep = r.total;
    repDice = ` (${r.dice[0].results.map((x) => x.result).join("+")})`;
  }

  const lines = [];
  for (const a of chosen) {
    const fum = Math.max(0, Number(form[`fum-${a.id}`]) || 0);
    const xp = base + mxp + 50 * fum;
    const upd = {
      "system.attributes.totalexp": Number(a.system.attributes.totalexp ?? 0) + xp,
      "system.money": Number(a.system.money ?? 0) + share,
    };
    if (rep) upd["system.attributes.honer.value"] = Number(a.system.attributes.honer?.value ?? 0) + rep;
    if (toSheets) await a.update(upd);
    if (reset) await a.unsetFlag(game.system.id, "sessionFumbles");
    const free = toSheets ? Number(a.system.attributes.totalexp ?? 0) - Number(a.system.attributes.useexp ?? 0) : "—";
    lines.push(`<tr><td>${esc(a.name)}</td><td>+${xp}${fum ? ` <span class="sw25-dim">(${fum}×1-1)</span>` : ""}</td><td>+${share} G</td><td>${rep ? `+${rep}${repDice}` : "—"}</td><td>${free}</td></tr>`);
  }
  await ChatMessage.create({
    speaker: { alias: T("Title") },
    content:
      `<div class="sw25-session-card"><p><b>${T("Title")}</b></p>` +
      `<p class="sw25-dim">${T("Summary", { base, mxp, gold, share, shards })}</p>` +
      `<table><tr><th>${T("Pc")}</th><th>${T("XP")}</th><th>G</th><th>${T("Rep")}</th><th>${T("FreeXP")}</th></tr>${lines.join("")}</table>` +
      `<p class="sw25-dim">${toSheets ? T("LevelHint") : L2("Только итог: на листы ничего не записано.", "Totals only: nothing was written to the sheets.")}</p></div>`,
  });
  if (reset) await game.settings.set("sw25", "sessionPool", { monsters: [], loot: [] });
  if (form.growth) for (const a of chosen) await growthCheck(a);
  return true;
}
