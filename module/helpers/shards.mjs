/**
 * Monsters boosted with sword shards (Core Rulebook I, pp. 384-385):
 *  - +5 max HP and +1 max MP per shard;
 *  - Fortitude and Willpower +1 (1-5 shards), +2 (6-10), +3 (11-15), +4 (16+);
 *  - a multi-section monster: the GM spreads the HP and MP over any sections, the resistance bonus counts
 *    the total number of shards for every section;
 *  - the shards are an «always» loot of the monster (sold for 200 G each, CR II).
 *
 * Stored on the monster: flags.sw25.shards = { n, hp: { sectionId: x }, mp: { sectionId: x } }.
 * The core section (or a monster without sections) gets an Active Effect «Sword Shards ×N»;
 * other sections get their max / current HP and MP raised in flags.sw25.sections.
 */
import { L2 } from "./monstergen-i18n.mjs";
import { sectionsOf } from "./sections.mjs";

const N = (v) => Math.max(0, Math.floor(Number(v) || 0));
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));

/** Fortitude / Willpower bonus for n shards. */
export const shardResist = (n) => (N(n) ? Math.min(4, Math.ceil(N(n) / 5)) : 0);
/** Shards the monster is boosted with (0 if none). */
export const shardsOf = (actor) => N(actor?.flags?.sw25?.shards?.n);

const CORE = "_core";

/** Apply (or change, or remove with n = 0) the boost. hp / mp: { sectionId | "_core": amount }. */
export async function setShards(actor, n, hp = null, mp = null) {
  if (!actor || actor.type !== "monster") return;
  n = N(n);
  const secs = sectionsOf(actor);
  const coreId = secs ? (secs.find((s) => s.core) ?? secs[0]).id : CORE;
  hp ??= { [coreId]: 5 * n };
  mp ??= { [coreId]: n };
  const old = actor.flags?.sw25?.shards ?? { n: 0, hp: {}, mp: {} };
  const upd = {};
  // other sections: undo the old amounts, add the new ones
  if (secs) {
    const list = foundry.utils.deepClone(secs);
    for (const s of list) {
      if (s.id === coreId) continue;
      const dh = N(hp[s.id]) - N(old.hp?.[s.id]), dm = N(mp[s.id]) - N(old.mp?.[s.id]);
      if (s.hp) { s.hp.max = N(s.hp.max) + dh; s.hp.value = Math.min(s.hp.max, (Number(s.hp.value) || 0) + dh); }
      if (s.mp) { s.mp.max = N(s.mp.max) + dm; s.mp.value = Math.min(s.mp.max, (Number(s.mp.value) || 0) + dm); }
    }
    upd["flags.sw25.sections"] = list;
  }
  // core: one Active Effect, current HP / MP follow the change
  const coreHp = N(hp[coreId] ?? hp[CORE]), coreMp = N(mp[coreId] ?? mp[CORE]);
  const oldHp = N(old.hp?.[coreId] ?? old.hp?.[CORE]), oldMp = N(old.mp?.[coreId] ?? old.mp?.[CORE]);
  // current HP / MP before the effect changes (removing it clamps them to the lower max first)
  const hp0 = Number(actor.system.hp?.value) || 0;
  const mp0 = Number(actor.system.mp?.value) || 0;
  const fx = actor.effects.filter((e) => e.flags?.sw25?.shardFx).map((e) => e.id);
  if (fx.length) await actor.deleteEmbeddedDocuments("ActiveEffect", fx);
  if (n) {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: L2(`Осколки меча ×${n}`, `Sword Shards ×${n}`), img: "icons/commodities/gems/gem-shattered-red.webp",
      transfer: false, disabled: false,
      changes: [
        ...(coreHp ? [{ key: "system.hp.efhpmod", type: "add", value: String(coreHp), phase: "initial" }] : []),
        ...(coreMp ? [{ key: "system.mp.efmpmod", type: "add", value: String(coreMp), phase: "initial" }] : []),
      ],
      flags: { sw25: { shardFx: true } },
    }]);
  }
  upd["system.hp.value"] = Math.max(0, hp0 + coreHp - oldHp);
  upd["system.mp.value"] = Math.max(0, mp0 + coreMp - oldMp);
  upd["flags.sw25.shards"] = n ? { n, hp, mp } : null;
  await actor.update(upd, { sw25Direct: true });   // core section, not the active one
}

/** GM dialog: number of shards and, for a multi-section monster, where the HP and MP go. */
export async function openShardDialog(actor) {
  if (!game.user.isGM) return;
  actor = actor?.token?.actor ?? actor;
  const secs = sectionsOf(actor);
  const cur = actor.flags?.sw25?.shards ?? { n: 0, hp: {}, mp: {} };
  const coreId = secs ? (secs.find((s) => s.core) ?? secs[0]).id : CORE;
  const rows = (secs ?? [{ id: CORE, name: actor.name, core: true }]).map((s) => `<tr data-sid="${esc(s.id)}"><td>${esc(s.name)}${s.core ? " ★" : ""}</td>
    <td><input type="number" class="sh-hp" min="0" step="5" value="${N(cur.hp?.[s.id] ?? (s.id === coreId ? 5 * N(cur.n) : 0))}" style="width:5em"></td>
    <td><input type="number" class="sh-mp" min="0" value="${N(cur.mp?.[s.id] ?? (s.id === coreId ? N(cur.n) : 0))}" style="width:5em"></td></tr>`).join("");
  const content = `<div class="sw25-shards">
    <p>${L2("За каждый осколок: +5 к макс. ОЖ и +1 к макс. ОМ. Стойкость и Воля: +1 (1–5), +2 (6–10), +3 (11–15), +4 (16+). После победы осколки — добыча «Всегда».", "Per shard: +5 max HP and +1 max MP. Fortitude and Willpower: +1 (1–5), +2 (6–10), +3 (11–15), +4 (16+). Once defeated, the shards are “always” loot.")}</p>
    <label>${L2("Осколков меча", "Sword Shards")} <input type="number" class="sh-n" min="0" value="${N(cur.n)}" style="width:5em" autofocus></label>
    <span class="sh-res" style="margin-left:8px"></span>
    ${secs ? `<p class="hint">${L2("Монстр из нескольких секций: распределите ОЖ и ОМ как хотите.", "Multi-section monster: spread the HP and MP as you like.")}</p>` : ""}
    <table class="sh-table" ${secs ? "" : 'style="display:none"'}><thead><tr><th>${L2("Секция", "Section")}</th><th>${L2("ОЖ", "HP")}</th><th>${L2("ОМ", "MP")}</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="sh-sum hint"></p></div>`;
  const { DialogV2 } = foundry.applications.api;
  const read = (root) => {
    const n = N(root.querySelector(".sh-n").value);
    const hp = {}, mp = {};
    root.querySelectorAll("tr[data-sid]").forEach((tr) => { hp[tr.dataset.sid] = N(tr.querySelector(".sh-hp").value); mp[tr.dataset.sid] = N(tr.querySelector(".sh-mp").value); });
    return { n, hp, mp };
  };
  const res = await DialogV2.wait({
    window: { title: L2(`${actor.name}: осколки меча`, `${actor.name}: Sword Shards`) },
    content,
    buttons: [
      { action: "ok", label: L2("Применить", "Apply"), default: true, callback: (ev, btn) => read(btn.form) },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element;
      const sync = (fromN) => {
        const { n, hp, mp } = read(root);
        if (fromN) { // a new count: everything to the core section, as a starting point
          root.querySelectorAll("tr[data-sid]").forEach((tr) => {
            const core = tr.dataset.sid === coreId;
            tr.querySelector(".sh-hp").value = core ? 5 * n : 0;
            tr.querySelector(".sh-mp").value = core ? n : 0;
          });
        }
        const r = read(root);
        const sh = Object.values(r.hp).reduce((a, b) => a + b, 0), sm = Object.values(r.mp).reduce((a, b) => a + b, 0);
        root.querySelector(".sh-res").textContent = n ? L2(`Стойкость и Воля +${shardResist(n)}`, `Fortitude and Willpower +${shardResist(n)}`) : "";
        const bad = sh !== 5 * n || sm !== n;
        root.querySelector(".sh-sum").textContent = secs ? L2(`Распределено: ОЖ ${sh} из ${5 * n}, ОМ ${sm} из ${n}.`, `Spread: HP ${sh} of ${5 * n}, MP ${sm} of ${n}.`) : "";
        root.querySelector(".sh-sum").style.color = bad ? "var(--color-level-error, #c33)" : "";
        void hp; void mp;
      };
      root.querySelector(".sh-n")?.addEventListener("input", () => sync(true));
      root.querySelectorAll(".sh-hp, .sh-mp").forEach((el) => el.addEventListener("input", () => sync(false)));
      sync(false);
    },
  });
  if (!res || res === "cancel") return;
  await setShards(actor, res.n, res.hp, res.mp);
  ui.notifications.info(res.n ? L2(`${actor.name}: осколков меча ${res.n}.`, `${actor.name}: ${res.n} Sword Shards.`) : L2(`${actor.name}: осколки убраны.`, `${actor.name}: shards removed.`));
}

/** «Always» loot line for the shards (CR II: 200 G each). */
export const shardLootLine = (n) => L2(`Осколок меча (200G) x${N(n)}`, `Sword Shard (200G/-) x${N(n)}`);

export function registerShards() {
  // GM button in the monster sheet header
  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    const actor = app.actor ?? app.document;
    if (!game.user.isGM || actor?.type !== "monster") return;
    buttons.unshift({
      label: L2("Осколки", "Shards"), class: "sw25-shards-btn", icon: "fa-solid fa-gem",
      onclick: () => openShardDialog(actor),
    });
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { shards: { open: openShardDialog, set: setShards, of: shardsOf, resist: shardResist } });
}
