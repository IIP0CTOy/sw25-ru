/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​​​‌​​‌‌​‌​‌​​‌‌​​​‌​​‌‌‌​​​​​‌‌​​‌​​​‌‌‌​​‌⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * [Round 92] Shop: drag items (from a compendium, the Items directory or another sheet) into the window,⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​​​‌​​‌‌​‌​‌​​‌‌​​​‌​​‌‌‌​​​​​‌‌​​‌​​​‌‌‌​​‌​​‌​‌‌​‌​‌‌​​​‌​⁠
 * press «Buy» — the price is taken from system.price and subtracted from the buyer's system.money,
 * the items go into the buyer's inventory (a stack grows if the same item is already there).
 * Replaces the Japanese «買い物» macro. UI follows the system language (ru / en).
 */
import { L2 } from "./monstergen-i18n.mjs";
import { priceFactor, disgraceEffect } from "./ranks.mjs";
import { checkEquipRequirement } from "./equipreq.mjs";

const esc = (s) => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");
/** «1,660G», "570 G", 570 -> number (0 when unknown). */
export function parsePrice(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : 0;
  const n = parseInt(String(v ?? "").normalize("NFKC").replace(/[,\s]/g, "").replace(/[^\d-].*$/, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function buyers() {
  const list = game.actors.filter((a) => a.type === "character" && a.isOwner);
  // [ru.12.1] then a character whose sheet is open, then the newest character (not simply the first by name)
  const open = Object.values(ui.windows).map((w) => w.actor ?? w.document).find((a) => a?.documentName === "Actor" && a.type === "character" && a.isOwner);
  const newest = [...list].sort((a, b) => (b._stats?.createdTime ?? 0) - (a._stats?.createdTime ?? 0))[0];
  const def = canvas?.tokens?.controlled?.map((t) => t.actor).find((a) => a?.type === "character" && a.isOwner)
    ?? (game.user.character?.isOwner ? game.user.character : null) ?? open ?? newest ?? null;
  return { list, def };
}

/** Put purchased items into the actor: grow an existing stack or create a new item. */
async function giveItems(actor, lines) {
  const create = [];
  for (const l of lines) {
    const src = l.item;
    // stack only onto a plain copy of the same thing: not equipped, not upgraded, not in a golem,
    // and from the same source when both know theirs
    const srcOf = (i) => i._stats?.compendiumSource ?? i.flags?.core?.sourceId ?? null;
    const from = src.uuid?.startsWith("Compendium.") ? src.uuid : srcOf(src);
    const has = actor.items.find((i) => i.type === src.type && i.name === src.name && "quantity" in (i.system ?? {}) && !i.system.equip
      && !i.flags?.sw25?.upg && !i.flags?.sw25?.inGolem && (!from || !srcOf(i) || srcOf(i) === from));
    if (has && "quantity" in (src.system ?? {})) {
      await has.update({ "system.quantity": (Number(has.system.quantity) || 0) + l.qty });
      continue;
    }
    const data = src.toObject();
    delete data._id; delete data.folder; delete data.sort; delete data.ownership;
    if (data.system && "equip" in data.system) data.system.equip = false;
    if ("quantity" in (data.system ?? {})) { data.system.quantity = l.qty; create.push(data); }
    else for (let k = 0; k < l.qty; k++) create.push(foundry.utils.deepClone(data));
  }
  if (create.length) await actor.createEmbeddedDocuments("Item", create);
}

export async function openShop() {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const { list, def } = buyers();
  if (!list.length) return ui.notifications.warn(L2("Нет персонажей, которыми вы владеете.", "You own no characters."));
  const cart = [];   // {item, price, qty}
  let buyerId = def?.id ?? list[0].id;
  const actor = () => game.actors.get(buyerId);

  const content = `<div class="sw25-shop" style="min-width:420px">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <label>${L2("Покупатель", "Buyer")}:</label>
      <select class="shop-buyer" style="flex:1">${list.map((a) => `<option value="${a.id}"${a.id === buyerId ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
      <b>${L2("Деньги", "Money")}: <span class="shop-money"></span> G</b>
    </div>
    <label style="display:flex;gap:6px;align-items:center;margin-bottom:6px" title="${L2("Позор повышает цены Гильдии", "Disgrace raises the Guild's prices")}"><input type="checkbox" class="shop-guild" checked> ${L2("Покупка в Гильдии (наценка за позор)", "Buying at the Guild (disgrace surcharge)")}</label>
    <div class="shop-drop" style="border:2px dashed #888;border-radius:6px;padding:14px;text-align:center;margin-bottom:6px">${L2("Перетащите сюда предметы — из каталога выше, списка предметов или листа", "Drag items here — from a catalog above, the Items directory or a sheet")}</div>
    <table style="width:100%"><thead><tr><th style="text-align:left">${L2("Предмет", "Item")}</th><th>${L2("Цена, G", "Price, G")}</th><th>${L2("Кол-во", "Qty")}</th><th>${L2("Сумма", "Sum")}</th><th></th></tr></thead><tbody class="shop-rows"></tbody></table>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button type="button" class="shop-buy" style="width:auto"><i class="fa-solid fa-coins"></i> ${L2("Купить", "Buy")}</button><b>${L2("Итого", "Total")}: <span class="shop-total">0</span> G</b></div>
  </div>`;

  let root = null;
  const base = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
  // disgrace: Guild prices go up unless the rank prevents it
  let guild = true;   // the surcharge / refusal is the Guild's; another merchant sells at the price
  const factor = () => (guild ? priceFactor(actor()) : 1);
  const total = () => Math.ceil(base() * (factor() ?? 1));
  const paint = () => {
    if (!root) return;
    const q = (sel) => root.querySelector(sel);
    q(".shop-money").textContent = Number(actor()?.system?.money) || 0;
    q(".shop-rows").innerHTML = cart.length
      ? cart.map((l, i) => { const r = checkEquipRequirement(l.item, actor()); return `<tr data-i="${i}"><td>${esc(l.item.name)}${r.ok ? "" : ` <i class="fa-solid fa-triangle-exclamation" style="color:#d2a94e" title="${esc(L2(`Не хватает силы: ${r.str} из ${r.req} — можно только держать`, `Not enough Strength: ${r.str} of ${r.req} — can only be held`))}"></i>`}</td>
          <td style="text-align:center"><input data-f="price" type="number" min="0" value="${l.price}" style="width:70px"${l.fixed && !game.user.isGM ? " disabled" : ""}></td>
          <td style="text-align:center"><input data-f="qty" type="number" min="1" value="${l.qty}" style="width:48px"></td>
          <td style="text-align:center">${l.price * l.qty}</td>
          <td><button type="button" data-del="${i}" style="width:auto" title="${L2("Убрать", "Remove")}"><i class="fa-solid fa-xmark"></i></button></td></tr>`; }).join("")
      : `<tr><td colspan="5" style="text-align:center;opacity:.6">${L2("Корзина пуста", "The cart is empty")}</td></tr>`;
    const f = factor(), e = disgraceEffect(actor());
    q(".shop-total").textContent = f === 1 ? total() : f == null ? "—" : `${total()} (${base()} ×${f})`;
    q(".shop-total").title = e && !e.prevented ? L2("Позор: наценка Гильдии", "Disgrace: Guild surcharge") : "";
  };

  const addItem = async (data) => {
    if (data?.type !== "Item") return ui.notifications.warn(L2("Можно перетаскивать только предметы.", "Only items can be dropped here."));
    const item = data.uuid ? await fromUuid(data.uuid) : null;
    if (!item) return;
    const price = parsePrice(item.system?.price);
    if (!price) ui.notifications.warn(L2(`У «${item.name}» не указана цена — введите её в таблице.`, `“${item.name}” has no price — enter it in the table.`));
    const ex = cart.find((l) => l.item.uuid === item.uuid);
    if (ex) ex.qty += 1; else cart.push({ item, price, qty: 1, fixed: price > 0 });   // a printed price can only be changed by the GM
    paint();
  };

  let buying = false;
  const buy = async () => {
    if (buying) return false;
    buying = true;
    try { return await doBuy(); } finally { buying = false; }
  };
  const doBuy = async () => {
    const a = actor();
    if (!a) return false;
    if (!cart.length) { ui.notifications.warn(L2("Корзина пуста.", "The cart is empty.")); return false; }
    const sum = total(), gold = Number(a.system.money) || 0;
    if (factor() == null) { ui.notifications.warn(L2(`${a.name}: из-за позора Гильдия не обслуживает.`, `${a.name}: the Guild refuses service because of the disgrace.`)); return false; }
    if (cart.some((l) => !l.price)) { ui.notifications.warn(L2("У некоторых предметов не указана цена.", "Some items have no price.")); return false; }
    if (gold < sum) { ui.notifications.error(L2(`${a.name}: не хватает денег (${gold} G из ${sum} G).`, `${a.name} cannot afford it (${gold} G of ${sum} G).`)); return false; }
    await a.update({ "system.money": gold - sum });
    try { await giveItems(a, cart); }
    catch (err) {
      console.error(err);
      await a.update({ "system.money": gold });   // refund: nothing was handed out
      ui.notifications.error(L2("Не удалось выдать предметы — деньги возвращены.", "Could not hand out the items — the money was refunded."));
      return false;
    }
    const rows = cart.map((l) => `${esc(l.item.name)}${l.qty > 1 ? ` ×${l.qty}` : ""} — ${l.price * l.qty} G`).join("<br>");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: a }),
      content: `<p><b>${esc(a.name)}</b> ${L2("покупает", "buys")}:</p><p>${rows}</p><hr><p>${L2("Итого", "Total")}: <b>${sum} G</b> (${gold} → ${gold - sum} G)</p>`,
    });
    cart.length = 0;
    paint();
    return true;
  };

  const dlg = new DialogV2({
    window: { title: L2("Магазин", "Shop"), resizable: true },
    position: { width: 640 },
    content,
    buttons: [
      { action: "close", label: L2("Закрыть", "Close") },
    ],
  });
  await dlg.render(true);
  root = dlg.element;
  const drop = root.querySelector(".shop-drop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.style.background = "#8883"; });
  drop.addEventListener("dragleave", () => { drop.style.background = ""; });
  const onDrop = async (e) => {
    e.preventDefault(); drop.style.background = "";
    let data; try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
    await addItem(data);
  };
  // [ru.12.1] catalogs: the item compendiums that hold gear open with one click (drag from them into the cart)
  (async () => {
    const GEAR = ["weapon", "armor", "accessory", "item"];
    const STAT_FIELDS = ["system.power", "system.cvalue", "system.usage", "system.hit", "system.dmod", "system.pp", "system.dodge", "system.reqstr"];
    const cats = [];
    for (const p of game.packs) {
      if (p.documentName !== "Item" || !p.visible) continue;
      let idx; try { idx = await p.getIndex({ fields: ["flags.sw25.enh", "flags.sw25.curse"] }); } catch (e) { continue; }
      if (idx.some((e) => GEAR.includes(e.type) && !e.flags?.sw25?.enh && !e.flags?.sw25?.curse)) cats.push(p);
    }
    const lng = game.i18n.lang;
    const cyr = (p) => /[\u0400-\u04FF]/.test(p.title);
    const mine = cats.filter((p) => (lng === "ru" ? cyr(p) : !cyr(p)));
    const show = mine.length ? mine : cats;
    // [ru.12.2] the world's own gear (made with the item builder etc.) — the ones this user can see
    const world = game.items.filter((i) => GEAR.includes(i.type) && i.testUserPermission(game.user, "OBSERVER"));
    if ((!show.length && !world.length) || !root?.isConnected) return;
    const bar = document.createElement("div");
    bar.className = "shop-cats";
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px";
    const btn = "width:auto;flex:0 0 auto;padding:0 8px";
    bar.innerHTML = `<span style="opacity:.8">${L2("Каталог:", "Catalog:")}</span>`
      + (world.length ? `<button type="button" class="shop-world" style="${btn}"><i class="fa-solid fa-globe"></i> ${L2("Предметы мира", "World items")} (${world.length})</button>` : "")
      + show.map((p) => `<button type="button" data-pack="${esc(p.collection)}" style="${btn}"><i class="fa-solid fa-book-open"></i> ${esc(p.title)}</button>`).join("");
    // [ru.12.2] every source opens as a price list right here (click a line → cart); Shift+click a compendium opens its window
    const path = (f) => { const n = []; while (f) { n.unshift(f.name); f = f.folder; } return n.join(" / ") || "—"; };
    const list = document.createElement("div");
    list.className = "shop-world-list";
    list.style.cssText = "display:none;max-height:260px;overflow:auto;border:1px solid #888;border-radius:6px;padding:4px 6px;margin-bottom:6px";
    let shown = null;
    const rowsOf = async (src) => {
      if (src === "world") return world.map((i) => ({ uuid: i.uuid, name: i.name, type: i.type, sys: i.system, price: i.system?.price, rank: i.system?.rank, g: path(i.folder) }));
      const p = game.packs.get(src);
      const idx = await p.getIndex({ fields: ["system.price", "system.rank", "folder", "flags.sw25.enh", "flags.sw25.curse", ...STAT_FIELDS] });
      return [...idx].filter((e) => GEAR.includes(e.type) && !e.flags?.sw25?.enh && !e.flags?.sw25?.curse)   // upgrades / curses belong to the smithy
        .map((e) => ({ uuid: e.uuid, name: e.name, type: e.type, sys: e.system, price: e.system?.price, rank: e.system?.rank, g: path(p.folders.get(e.folder)) }));
    };
    // [ru.12.2] the numbers that matter when choosing: weapon power / critical value / grip / Strength, armour Defense / Evasion
    const sg = (n) => (n > 0 ? `+${n}` : `${n}`);
    const stats = (r) => {
      const s = r.sys ?? {}, n = (v) => Number(v) || 0, out = [];
      if (r.type === "weapon") {
        if (s.power !== null && s.power !== undefined && s.power !== "") out.push(`k${s.power}@${n(s.cvalue) || 10}`);
        const u = CONFIG.SW25?.weaponUsages?.[s.usage]; if (u) out.push(game.i18n.localize(u));
        if (n(s.hit)) out.push(`${L2("точн", "acc")} ${sg(n(s.hit))}`);
        if (n(s.dmod)) out.push(`${L2("урон", "dmg")} ${sg(n(s.dmod))}`);
      } else if (r.type === "armor") {
        out.push(`${L2("Защ", "Def")} ${n(s.pp)}`);
        if (n(s.dodge)) out.push(`${L2("Укл", "Eva")} ${sg(n(s.dodge))}`);
      }
      if (["weapon", "armor"].includes(r.type) && n(s.reqstr)) out.push(`${L2("Сила", "Str")} ${n(s.reqstr)}`);
      return out.join(" · ");
    };
    const fill = async (src) => {
      const rows = (await rowsOf(src)).sort((x, y) => String(x.g ?? "").localeCompare(String(y.g ?? "")) || String(x.name ?? "").localeCompare(String(y.name ?? "")));
      const groups = new Map();
      for (const r of rows) { if (!groups.has(r.g)) groups.set(r.g, []); groups.get(r.g).push(r); }
      list.innerHTML = `<input type="search" class="shop-world-q" placeholder="${L2("Поиск…", "Search…")}" style="width:100%;margin-bottom:4px">`
        + [...groups].map(([k, items]) => `<div class="shop-wg"><div style="opacity:.75;font-size:11px;margin-top:4px">${esc(k)}</div>`
          + items.map((i) => `<div class="shop-wi" data-uuid="${esc(i.uuid)}" data-n="${esc(i.name.toLowerCase())}" style="display:grid;grid-template-columns:18px minmax(0,1fr) auto 2.5em 6em;gap:6px;align-items:center;cursor:pointer;padding:1px 0" title="${L2("В корзину", "Add to cart")}"><i class="fa-solid fa-cart-plus"></i><span>${esc(i.name)}</span><span style="opacity:.75;font-size:11px;white-space:nowrap">${esc(stats(i))}</span><span style="opacity:.7;text-align:center">${esc(i.rank ?? "")}</span><span style="text-align:right">${parsePrice(i.price) || "—"} G</span></div>`).join("") + `</div>`).join("");
    };
    bar.addEventListener("click", async (e) => {
      const b = e.target.closest(".shop-world, [data-pack]"); if (!b) return;
      const src = b.dataset.pack ?? "world";
      if (b.dataset.pack && e.shiftKey) return game.packs.get(src)?.render(true);
      bar.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      if (shown === src && list.style.display !== "none") { list.style.display = "none"; shown = null; return; }
      shown = src; b.classList.add("active");
      try { await fill(src); } catch (err) { console.error("SW25 | shop catalog", err); }
      list.style.display = "";
      list.querySelector(".shop-world-q")?.focus();
    });
    list.addEventListener("click", (e) => { const r = e.target.closest(".shop-wi"); if (r) addItem({ type: "Item", uuid: r.dataset.uuid }); });
    list.addEventListener("input", (e) => {
      if (!e.target.matches(".shop-world-q")) return;
      const q = e.target.value.trim().toLowerCase();
      for (const r of list.querySelectorAll(".shop-wi")) r.style.display = !q || r.dataset.n.includes(q) ? "" : "none";
      for (const g of list.querySelectorAll(".shop-wg")) g.style.display = [...g.querySelectorAll(".shop-wi")].some((r) => r.style.display !== "none") ? "" : "none";
    });
    root.querySelector(".shop-drop")?.before(bar, list);
  })();
  root.querySelector(".sw25-shop").addEventListener("drop", onDrop);   // one handler (the zone is inside it)
  root.querySelector(".sw25-shop").addEventListener("dragover", (e) => e.preventDefault());
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.classList.contains("shop-buyer")) { buyerId = t.value; return paint(); }
    if (t.classList.contains("shop-guild")) { guild = t.checked; return paint(); }
    const tr = t.closest("tr[data-i]"); if (!tr || !t.dataset.f) return;
    const l = cart[Number(tr.dataset.i)]; if (!l) return;
    if (t.dataset.f === "price" && l.fixed && !game.user.isGM) return paint();
    l[t.dataset.f] = Math.max(t.dataset.f === "qty" ? 1 : 0, parseInt(t.value, 10) || 0);
    paint();
  });
  root.addEventListener("click", (e) => {
    if (e.target.closest(".shop-buy")) { e.preventDefault(); buy(); return; }
    const b = e.target.closest("[data-del]"); if (!b) return;
    cart.splice(Number(b.dataset.del), 1); paint();
  });
  paint();
}

export function registerShop() {
  game.sw25 ??= {};
  game.sw25.shop = openShop;
  Hooks.on("renderItemDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(".sw25-shop-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-shop-btn";
    btn.innerHTML = `<i class="fa-solid fa-coins"></i> ${L2("Магазин", "Shop")}`;
    btn.addEventListener("click", () => openShop());
    (root.querySelector(".header-actions, .directory-header .action-buttons, header") ?? root).appendChild(btn);
  });
}
