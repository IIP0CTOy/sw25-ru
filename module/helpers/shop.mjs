/**
 * [Round 92] Shop: drag items (from a compendium, the Items directory or another sheet) into the window,
 * press «Buy» — the price is taken from system.price and subtracted from the buyer's system.money,
 * the items go into the buyer's inventory (a stack grows if the same item is already there).
 * Replaces the Japanese «買い物» macro. UI follows the system language (ru / en).
 */
import { L2 } from "./monstergen-i18n.mjs";

const esc = (s) => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");
/** «1,660G», "570 G", 570 -> number (0 when unknown). */
export function parsePrice(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : 0;
  const n = parseInt(String(v ?? "").normalize("NFKC").replace(/[,\s]/g, "").replace(/[^\d-].*$/, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function buyers() {
  const list = game.actors.filter((a) => a.type === "character" && a.isOwner);
  const def = canvas?.tokens?.controlled?.map((t) => t.actor).find((a) => a?.type === "character" && a.isOwner)
    ?? (game.user.character?.isOwner ? game.user.character : null) ?? list[0] ?? null;
  return { list, def };
}

/** Put purchased items into the actor: grow an existing stack or create a new item. */
async function giveItems(actor, lines) {
  const create = [];
  for (const l of lines) {
    const src = l.item;
    const has = actor.items.find((i) => i.type === src.type && i.name === src.name && "quantity" in (i.system ?? {}) && !i.system.equip);
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
    <div class="shop-drop" style="border:2px dashed #888;border-radius:6px;padding:14px;text-align:center;margin-bottom:6px">${L2("Перетащите сюда предметы (из компендиума, списка предметов или листа)", "Drag items here (from a compendium, the Items directory or a sheet)")}</div>
    <table style="width:100%"><thead><tr><th style="text-align:left">${L2("Предмет", "Item")}</th><th>${L2("Цена, G", "Price, G")}</th><th>${L2("Кол-во", "Qty")}</th><th>${L2("Сумма", "Sum")}</th><th></th></tr></thead><tbody class="shop-rows"></tbody></table>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button type="button" class="shop-buy" style="width:auto"><i class="fa-solid fa-coins"></i> ${L2("Купить", "Buy")}</button><b>${L2("Итого", "Total")}: <span class="shop-total">0</span> G</b></div>
  </div>`;

  let root = null;
  const total = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
  const paint = () => {
    if (!root) return;
    const q = (sel) => root.querySelector(sel);
    q(".shop-money").textContent = Number(actor()?.system?.money) || 0;
    q(".shop-rows").innerHTML = cart.length
      ? cart.map((l, i) => `<tr data-i="${i}"><td>${esc(l.item.name)}</td>
          <td style="text-align:center"><input data-f="price" type="number" min="0" value="${l.price}" style="width:70px"${l.fixed && !game.user.isGM ? " disabled" : ""}></td>
          <td style="text-align:center"><input data-f="qty" type="number" min="1" value="${l.qty}" style="width:48px"></td>
          <td style="text-align:center">${l.price * l.qty}</td>
          <td><button type="button" data-del="${i}" style="width:auto" title="${L2("Убрать", "Remove")}"><i class="fa-solid fa-xmark"></i></button></td></tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;opacity:.6">${L2("Корзина пуста", "The cart is empty")}</td></tr>`;
    q(".shop-total").textContent = total();
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
    position: { width: 560 },
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
  root.querySelector(".sw25-shop").addEventListener("drop", onDrop);   // one handler (the zone is inside it)
  root.querySelector(".sw25-shop").addEventListener("dragover", (e) => e.preventDefault());
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.classList.contains("shop-buyer")) { buyerId = t.value; return paint(); }
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
