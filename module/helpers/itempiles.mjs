/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​‌​‌​​‌‌​‌​‌​​‌‌​‌‌​​‌‌​​​‌‌​​‌‌​​‌​​​‌‌​​​​⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Item Piles integration: tells the Item Piles module how this system stores quantity, price and money,⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​‌​‌​​‌‌​‌​‌​​‌‌​‌‌​​‌‌​​​‌‌​​‌‌​​‌​​​‌‌​​​​​​‌​‌‌​‌​‌‌​​​‌​⁠
 * so piles, merchants and trading work without manual setup (and the "system not supported" notice goes away).
 */
const NOT_LOOT = ["spell", "enhancearts", "magicalsong", "ridingtrick", "alchemytech", "phasearea", "tactics", "infusion",
  "barbarousskill", "essenceweave", "otherfeature", "check", "combatability", "skill", "raceability", "language",
  "monsterability", "action", "session"];

export function registerItemPiles() {
  Hooks.once("item-piles-ready", async () => {
    const api = game.itempiles?.API;
    if (!api?.addSystemIntegration) return;
    const ru = game.i18n.lang === "ru";
    api.addSystemIntegration({
      VERSION: "1.0.0",
      ACTOR_CLASS_TYPE: "character",
      ITEM_CLASS_LOOT_TYPE: "item",
      ITEM_CLASS_WEAPON_TYPE: "weapon",
      ITEM_CLASS_EQUIPMENT_TYPE: "armor",
      ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
      ITEM_PRICE_ATTRIBUTE: "system.price",
      QUANTITY_FOR_PRICE_ATTRIBUTE: "flags.item-piles.system.quantityForPrice",
      ITEM_FILTERS: [{ path: "type", filters: NOT_LOOT.join(",") }],
      ITEM_SIMILARITIES: ["name", "type"],
      UNSTACKABLE_ITEM_TYPES: ["weapon", "armor", "accessory"],
      CURRENCIES: [{
        type: "attribute",
        name: ru ? "Гамели" : "Gamels",
        img: "icons/commodities/currency/coins-plain-stack-gold-yellow.webp",
        abbreviation: "{#}G",
        data: { path: "system.money" },
        primary: true,
        exchangeRate: 1,
      }],
      SECONDARY_CURRENCIES: [],
      CURRENCY_DECIMAL_DIGITS: 0.00001,
    });
  });
}
