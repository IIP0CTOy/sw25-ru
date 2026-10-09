import { L2, lang } from "./monstergen-i18n.mjs";

/**
 * Execute  Loot roll event and return the result.
 */
export async function lootRoll(actor) {
  const actorId = actor.id;
  const actorData = actor.system;
  const actorName = actor.name;

  const lootlist = actorData.loot;
  // [Round 66] Russian bestiary loot is ONE paragraph:
  //   "Всегда: X. 2-6: Y. 7-12: Z. 13+: W."
  // The upstream parser only split on <br>/<p> and only understood "a-b",
  // so every Russian monster rolled nothing. Now: also split on ". " before
  // the next "<range>:" token, and accept "13+", single numbers and – — −.
  const RANGE_START = /\.\s+(?=(?:\d+\s*[ー－～~\-–—−]\s*\d*|\d+\s*\+|\d+|Всегда|Always|自動)\s*[：:])/;
  const lootLines = String(lootlist ?? "")
    .split(/<br\s*\/?>|<\/?p>/)
    .flatMap((line) => line.replace(/<[^>]*>/g, "").split(RANGE_START))
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const lootitems = lootLines.map((cleanedLine) => {
    const colon = cleanedLine.search(/[：:]/);
    const rangePart = colon >= 0 ? cleanedLine.slice(0, colon) : cleanedLine;
    const itemPart = colon >= 0 ? cleanedLine.slice(colon + 1) : "";
    const rangPartNum = rangePart
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .trim();
    let range = { min: "etc", max: "etc" };
    let m;
    if ((m = rangPartNum.match(/^(\d+)?\s*[ー－～~\-–—−]\s*(\d+)?$/))) {
      range = {
        min: m[1] ? parseInt(m[1], 10) : 0,
        max: m[2] ? parseInt(m[2], 10) : 100,
      };
    } else if ((m = rangPartNum.match(/^(\d+)\s*\+$/))) {
      range = { min: parseInt(m[1], 10), max: 100 };
    } else if ((m = rangPartNum.match(/^(\d+)$/))) {
      range = { min: parseInt(m[1], 10), max: parseInt(m[1], 10) };
    }
    return {
      range: range,
      item: itemPart.trim().replace(/\.$/, ""),
      always: /^(Всегда|Always|自動)/i.test(rangPartNum), // [Round 83] dropped without a roll
    };
  });

  const speaker = ChatMessage.getSpeaker({ actor: actor });
  const rollMode = game.settings.get("core", "rollMode");
  //let label = game.i18n.localize("SW25.Monster.Loot");

  let chatData = {
    speaker: speaker,
    //flavor: label,
    rollMode: rollMode,
  };

  chatData.content = await renderTemplate(
    "systems/sw25-ru/templates/roll/lootlist.hbs",
    {
      flavor: actorName,
      lootlist: lootlist,
    }
  );

  chatData.flags = {
    sw25: {
      actorId: actorId,
      loot: lootitems,
      name: actorName,
      lootlist: lootlist,
    }
  };

  ChatMessage.create(chatData);
}


/* ---------------- [Round 83] loot goes to the inventory ---------------- */
// [key, pattern (Russian | English), Russian name, English name] — names are resolved at use time
const COLORS = [
  ["red", /красн|\bred\b/i, "Красная", "Red"], ["green", /зел[её]н|\bgreen\b/i, "Зелёная", "Green"], ["black", /ч[её]рн|\bblack\b/i, "Чёрная", "Black"],
  ["white", /бел|\bwhite\b/i, "Белая", "White"], ["gold", /золот|(?<!\d\s*)\bgold(?:en)?\b/i, "Золотая", "Gold"],
];
const colorName = (key) => { const c = COLORS.find(([k]) => k === key); return c ? c[lang() === "ru" ? 2 : 3] : key; };
/** «Красная карта B» / "Red Material Card B" */
const cardName = (color, rank) => L2(`${colorName(color)} карта ${String(rank).toUpperCase()}`, `${colorName(color)} Material Card ${String(rank).toUpperCase()}`);
const NOTHING = /^(ничего|нет|—|-|none|nothing|no loot|n\/a)?$/i;

/** «Тонкая змеиная кожа (120G/Красный A) x2» → { name, price, colors, rank, qty } or null. */
export function parseLoot(text) {
  let t = String(text ?? "").trim().replace(/\.$/, "");
  if (NOTHING.test(t)) return null;
  let qty = "1";
  const q = t.match(/\s*[x×х]\s*(\d*d\d*|\d+)\s*$/i);
  if (q) { qty = q[1]; t = t.slice(0, q.index).trim(); }
  const par = t.match(/\(([^()]*)\)\s*$/);
  const inside = par ? par[1] : "";
  const name = (par ? t.slice(0, par.index) : t).trim() || t;
  const price = Number((inside.match(/(\d[\d\s]*)\s*G/i)?.[1] ?? "").replace(/\s/g, "")) || 0;
  const colors = COLORS.filter(([, re]) => re.test(inside)).map(([k]) => k);
  const rank = (inside.match(/\b(SS|S|A|B)\b\s*$/i)?.[1] ?? "").toLowerCase();
  return { name, price, colors: rank ? colors : [], rank, qty, material: rank && colors.length ? inside.split("/").pop().trim() : "" };
}

/** Put one loot line into the actor's inventory (stacks by name). Returns what was added. */
export async function grantLoot(actor, text, from = "") {
  const loot = parseLoot(text);
  if (!loot || !actor?.isOwner) return null;
  let n = Number(loot.qty) || 0;
  if (!n) {
    const f = /^d/i.test(loot.qty) ? `1${loot.qty}` : loot.qty;
    n = (await new Roll(/d$/i.test(f) ? `${f}6` : f).evaluate()).total;
  }
  const have = actor.items.find((i) => i.type === "item" && i.name === loot.name && i.flags?.sw25?.loot);
  let item = have;
  if (have) await have.update({ "system.quantity": (Number(have.system.quantity) || 0) + n });
  else
    [item] = await actor.createEmbeddedDocuments("Item", [{
      name: loot.name, type: "item",
      system: {
        quantity: n, price: loot.price || "",
        description: L2(`<p>Добыча${from ? ` (${foundry.utils.escapeHTML(from)})` : ""}.${loot.price ? ` Цена продажи: ${loot.price} G.` : ""}${loot.material ? ` Материал для карт Алхимика: ${foundry.utils.escapeHTML(loot.material)}.` : ""}</p>`, `<p>Loot${from ? ` (${foundry.utils.escapeHTML(from)})` : ""}.${loot.price ? ` Sale price: ${loot.price} G.` : ""}${loot.material ? ` Material for Alchemist cards: ${foundry.utils.escapeHTML(loot.material)}.` : ""}</p>`),
      },
      flags: { sw25: { loot: { from, colors: loot.colors, rank: loot.rank, price: loot.price } } },
    }]);
  return { itemId: item.id, name: loot.name, qty: n, price: loot.price, colors: loot.colors, rank: loot.rank, material: loot.material };
}

/** Turn one piece of loot into an Alchemist material card of its colour and rank. */
export async function lootToCard(actor, grant) {
  if (!actor?.isOwner || !grant?.rank || !grant.colors?.length) return null;
  const item = actor.items.get(grant.itemId);
  if (!item || (Number(item.system.quantity) || 0) < 1) {
    ui.notifications.warn(L2(`${grant.name}: в инвентаре больше нет.`, `${grant.name}: none left in the inventory.`));
    return null;
  }
  let color = grant.colors[0];
  const DV = foundry.applications?.api?.DialogV2;
  if (grant.colors.length > 1 && DV) {
    color = await DV.wait({
      window: { title: L2(`${grant.name} — какого цвета карта?`, `${grant.name} — which card color?`) },
      content: `<p>${L2("Материал двух цветов: выберите, какой картой он станет.", "This material has two colors: choose which card it becomes.")}</p>`,
      buttons: grant.colors.map((c, i) => ({ action: c, label: colorName(c), default: i === 0 })),
      rejectClose: false,
    }).catch(() => null);
    if (!color) return null;
  }
  const label = cardName(color, grant.rank);
  const left = (Number(item.system.quantity) || 0) - 1;
  if (left > 0) await item.update({ "system.quantity": left });
  else await item.delete();
  const card = actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "material" && i.system.resource.materialtype === color && i.system.resource.materialrank === grant.rank);
  if (card) await card.update({ "system.quantity": (Number(card.system.quantity) || 0) + 1 });
  else await actor.createEmbeddedDocuments("Item", [{ name: label, type: "resource", system: { quantity: 1, resource: { type: "material", materialtype: color, materialrank: grant.rank } } }]);
  return label;
}

/* ---------------- [Round 87] «+» in the material card table of the sheet ---------------- */
async function addCardsDialog(actor) {
  const DV = foundry.applications?.api?.DialogV2;
  if (!DV) return;
  const res = await DV.prompt({
    window: { title: L2(`${actor.name}: добавить карты материала`, `${actor.name}: add material cards`) },
    content: `<div class="form-group"><label>${L2("Цвет", "Color")}</label><select name="color">${COLORS.map(([k]) => `<option value="${k}">${colorName(k)}</option>`).join("")}</select></div>
      <div class="form-group"><label>${L2("Ранг", "Rank")}</label><select name="rank">${["b", "a", "s", "ss"].map((r) => `<option value="${r}">${r.toUpperCase()}</option>`).join("")}</select></div>
      <div class="form-group"><label>${L2("Сколько", "Quantity")}</label><input type="number" name="qty" value="1" min="1"></div>`,
    ok: { label: L2("Добавить", "Add"), callback: (ev, btn) => ({ color: btn.form.elements.color.value, rank: btn.form.elements.rank.value, qty: Math.max(1, Number(btn.form.elements.qty.value) || 1) }) },
    rejectClose: false,
  });
  if (!res) return;
  const card = actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "material" && i.system.resource.materialtype === res.color && i.system.resource.materialrank === res.rank);
  if (card) await card.update({ "system.quantity": (Number(card.system.quantity) || 0) + res.qty });
  else
    await actor.createEmbeddedDocuments("Item", [{
      name: cardName(res.color, res.rank), type: "resource",
      system: { quantity: res.qty, resource: { type: "material", materialtype: res.color, materialrank: res.rank } },
    }]);
}

export function registerCardButton() {
  Hooks.on("renderActorSheet", (app, html) => {
    const actor = app.actor ?? app.document;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || !actor?.isOwner) return;
    for (const head of root.querySelectorAll(".items-header")) {
      const q = [...head.querySelectorAll(":scope > .quantity")].map((x) => x.textContent.trim());
      const cell = head.querySelector(":scope > .resources");
      if (!cell || q.join(",") !== "B,A,S,SS" || cell.querySelector(".sw25-card-add")) continue;
      const a = document.createElement("a");
      a.className = "sw25-card-add";
      a.dataset.tooltip = L2("Добавить карты материала (цвет, ранг, количество)", "Add material cards (color, rank, quantity)");
      a.style.cssText = "margin-left:8px;cursor:pointer";
      a.innerHTML = `<i class="fas fa-plus"></i>`;
      a.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); addCardsDialog(actor); });
      cell.appendChild(a);
    }
    // no cards yet → the table is not drawn: put a link above the evocation list instead
    if (!root.querySelector(".sw25-card-add")) {
      const tech = actor.items.find((i) => i.type === "alchemytech");
      const list = tech ? root.querySelector(`li.item[data-item-id="${tech.id}"]`)?.closest("ol") : null;
      if (list) {
        const div = document.createElement("div");
        div.style.cssText = "margin:4px 0";
        div.innerHTML = `<a class="sw25-card-add" style="cursor:pointer"><i class="fas fa-plus"></i> ${L2("Добавить карты материала", "Add material cards")}</a>`;
        div.querySelector("a").addEventListener("click", (ev) => { ev.preventDefault(); addCardsDialog(actor); });
        list.before(div);
      }
    }
  });
}
