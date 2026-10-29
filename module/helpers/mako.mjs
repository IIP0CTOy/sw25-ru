/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​​‌​​‌‌​​​‌‌​​‌‌​‌​‌​‌‌​​​‌‌​​‌‌‌​​​​​‌‌​​‌‌⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Mako stones: a stone pays all or part of an MP cost⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​​‌​​‌‌​​​‌‌​​‌‌​‌​‌​‌‌​​​‌‌​​‌‌‌​​​​​‌‌​​‌‌​​‌​‌‌​‌​‌‌​​​‌​⁠
 * (spells, techniques, other MP costs), not MP damage. One stone per cost. The stone's points go
 * down; at 0 it breaks. No action needed, but it must be on the character (not deep in a bag).
 *
 * A stone is an inventory item whose name has «Мако» / «Mako» / 「魔晶石」 (or flags.sw25.mako).
 *   flags.sw25.makoPts  — points of a full stone (asked once when the name has no single number);
 *   flags.sw25.makoLeft — points left in the stone being used (quantity = number of stones).
 */
import { L2 } from "./monstergen-i18n.mjs";
import { familiarOf } from "./summons.mjs";

const N = (v) => Math.max(0, Math.floor(Number(v) || 0));
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const RE = /мако|mako|魔晶石|камень маны|mana ?stone|マナストーン/i;

export const isMako = (i) => !!(i && (i.flags?.sw25?.mako || (["item", "accessory"].includes(i.type) && RE.test(i.name))));
/** Points of a full stone: the flag, or one number in brackets in the name («(5 зарядов)»); 0 = unknown. */
export function ptsOf(i) {
  const f = N(i?.flags?.sw25?.makoPts);
  if (f) return f;
  // «(5)», «(5 очков)», «(5 зар.)» = points; «(1-5)» is a price range and «(5 шт.)» a count — asked once instead
  const m = String(i?.name ?? "").normalize("NFKC").match(/\((\d+)(?![\d\s]*[-–～~]\s*\d)(?!\s*(?:шт|pcs|pieces|個))/i);
  return m ? N(m[1]) : 0;
}
const qtyOf = (i) => (i?.system && "quantity" in i.system ? N(i.system.quantity) : 1);
const leftOf = (i) => { const l = i?.flags?.sw25?.makoLeft; return l == null ? ptsOf(i) : N(l); };
export const stonesOf = (actor) => (actor?.items ?? []).filter((i) => isMako(i) && qtyOf(i) > 0);

/**
 * Ask how much of `cost` a stone pays, and how much the familiar's MP pays (the master may use it
 * while touching it). Returns { mp, use } (use = { item, x, pts, fam, fx } or null),
 * or null when the dialog was cancelled. Nothing to offer / no cost → { mp: cost, use: null } at once.
 */
export async function makoSplit(actor, cost, label = "") {
  cost = N(cost);
  const stones = stonesOf(actor);
  const fam = familiarOf(actor);
  const famMp = N(fam?.system?.mp?.value);
  if (!cost || (!stones.length && !famMp) || !actor.isOwner) return { mp: cost, use: null };
  const mpNow = Number(actor.system.mp?.value) || 0;
  const need = Math.max(0, cost - mpNow);
  const opts = stones.map((s, k) => {
    const p = ptsOf(s);
    return `<option value="${s.id}"${k === 0 ? " selected" : ""}>${esc(s.name)} — ${p ? `${leftOf(s)}/${p}` : "?"}${qtyOf(s) > 1 ? ` ×${qtyOf(s)}` : ""}</option>`;
  }).join("");
  const stoneRow = stones.length ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <select name="stone" style="flex:1">${opts}</select>
      <label>${L2("из камня", "from the stone")} <input type="number" name="x" min="0" max="${cost}" value="${need}" style="width:4em"></label>
      <label class="mk-pts">${L2("очков в полном камне", "points in a full stone")} <input type="number" name="pts" min="1" value="5" style="width:4em"></label>
    </div>` : "";
  const famRow = famMp ? `<div style="display:flex;gap:6px;align-items:center;margin-top:4px">
      <label>${L2(`из ОМ фамильяра (${famMp}, нужен контакт)`, `from the familiar's MP (${famMp}, needs contact)`)} <input type="number" name="fx" min="0" max="${Math.min(cost, famMp)}" value="0" style="width:4em"></label>
    </div>` : "";
  const content = `<div class="sw25-mako">
    <p>${L2(`${esc(label)}: стоимость <b>${cost}</b> ОМ, сейчас ОМ ${mpNow}. Чем заплатить часть (камень Мако — один на трату)?`, `${esc(label)}: cost <b>${cost}</b> MP, MP now ${mpNow}. What pays part of it (one Mako Stone per cost)?`)}</p>
    ${stoneRow}${famRow}<p class="hint mk-hint"></p></div>`;
  const { DialogV2 } = foundry.applications.api;
  const q = (root, n) => root.querySelector(`[name="${n}"]`);
  const read = (root) => ({ id: q(root, "stone")?.value ?? null, x: N(q(root, "x")?.value), pts: N(q(root, "pts")?.value), fx: N(q(root, "fx")?.value) });
  const res = await DialogV2.wait({
    window: { title: stones.length ? L2("Камень Мако", "Mako Stone") : L2("ОМ фамильяра", "Familiar MP") },
    content,
    buttons: [
      { action: "ok", label: L2("Оплатить", "Pay"), default: true, callback: (ev, btn) => read(btn.form) },
      { action: "none", label: L2("Только свои ОМ", "Own MP only"), callback: () => ({ x: 0, fx: 0 }) },
    ],
    rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element;
      const sync = () => {
        const r = read(root);
        const parts = [];
        let x = 0;
        if (stones.length) {
          const s = actor.items.get(r.id), known = ptsOf(s) > 0;
          root.querySelector(".mk-pts").style.display = known ? "none" : "";
          const left = known ? leftOf(s) : r.pts;
          const max = Math.min(cost, left);
          q(root, "x").max = String(max);
          if (r.x > max) q(root, "x").value = String(max);
          x = Math.min(r.x, max);
          const after = left - x === 0 ? L2("0 (разобьётся)", "0 (breaks)") : String(left - x);
          parts.push(L2(`Камень: ${left} → ${after}.`, `Stone: ${left} → ${after}.`));
        }
        let fx = 0;
        if (famMp) {
          const max = Math.max(0, Math.min(cost - x, famMp));
          q(root, "fx").max = String(max);
          if (r.fx > max) q(root, "fx").value = String(max);
          fx = Math.min(r.fx, max);
          parts.push(L2(`Фамильяр: ${famMp} → ${famMp - fx}.`, `Familiar: ${famMp} → ${famMp - fx}.`));
        }
        parts.push(L2(`ОМ: ${mpNow} → ${mpNow - (cost - x - fx)}.`, `MP: ${mpNow} → ${mpNow - (cost - x - fx)}.`));
        root.querySelector(".mk-hint").textContent = parts.join(" ");
      };
      root.querySelectorAll("select, input").forEach((el) => el.addEventListener("input", sync));
      sync();
    },
  });
  if (!res) return null;
  const item = res.x && res.id ? actor.items.get(res.id) : null;
  const pts = item ? ptsOf(item) || res.pts || 1 : 0;
  const x = item ? Math.min(res.x, cost, ptsOf(item) ? leftOf(item) : pts) : 0;
  const fx = famMp ? Math.min(N(res.fx), famMp, cost - x) : 0;
  if (!x && !fx) return { mp: cost, use: null };
  return { mp: cost - x - fx, use: { item, x, pts, fam: fx ? fam : null, fx } };
}

/** Take the points from the stone / the familiar (after the MP check passed). Returns a chat line. */
export async function makoCommit(use) {
  if (!use) return "";
  const lines = [];
  if (use.fam && use.fx) {
    const left = N(use.fam.system?.mp?.value) - use.fx;
    await use.fam.update({ "system.mp.value": Math.max(0, left) });
    lines.push(L2(`ОМ фамильяра: −${use.fx} (осталось ${Math.max(0, left)}).`, `Familiar MP: −${use.fx} (${Math.max(0, left)} left).`));
  }
  if (use.item && use.x) {
    const { item, x, pts } = use;
    const left = (item.flags?.sw25?.makoLeft == null ? pts : N(item.flags.sw25.makoLeft)) - x;
    const upd = { "flags.sw25.makoPts": pts };
    if (left <= 0) {
      upd["flags.sw25.makoLeft"] = pts;   // the next stone of the stack is full
      if ("quantity" in (item.system ?? {})) upd["system.quantity"] = Math.max(0, qtyOf(item) - 1);
      lines.push(L2(`Камень Мако: −${x} ОМ, камень разбился.`, `Mako Stone: −${x} MP, the stone broke.`));
    } else {
      upd["flags.sw25.makoLeft"] = left;
      lines.push(L2(`Камень Мако: −${x} ОМ (осталось ${left}).`, `Mako Stone: −${x} MP (${left} left).`));
    }
    await item.update(upd);
  }
  return lines.join(" ");
}
