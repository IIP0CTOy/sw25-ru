import { SW25ActorSheet } from "./actor-sheet.mjs";
import { dailyCheck, dailyMark } from "../helpers/rest.mjs";
import { isItem, findClassItem } from "../helpers/names.mjs";
import { canon } from "../helpers/ability-names.mjs";
import { starterPack } from "../helpers/starter.mjs";

/**
 * SW25-RU — new character sheet (redesign).
 *
 * A thin subclass of SW25ActorSheet: same getData(), same handlers, different
 * template and a single tab group. It is registered as a SECOND sheet for
 * characters (sw25.mjs), so the classic sheet stays the default and either can
 * be picked per actor from the window's "Sheet" button.
 *
 * Fellow mode (system.toFellow) is not supported by this sheet.
 */

// The stylesheet is injected here instead of system.json "styles" so that the
// sheet works after a plain F5, without relaunching the world.
// TODO: move to system.json once the redesign is accepted.
const CSS_PATH = "systems/sw25-ru/css/sw25-sheet-new.css";
if (!document.querySelector(`link[data-sw25n]`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.sw25n = "1";
  link.href = foundry.utils.getRoute(CSS_PATH);
  document.head.appendChild(link);
}

// Item types that can be starred onto the Combat tab: checks go to the
// "Checks" card, everything else to the Favourites card.
const STARRABLE = new Set([
  "spell", "enhancearts", "magicalsong", "ridingtrick", "alchemytech",
  "phasearea", "tactics", "infusion", "barbarousskill", "essenceweave",
  "combatability", "raceability", "otherfeature", "item", "check",
]);

/* ---------------------------------------------------------------------------
 * Techniques (enhancearts) in one click: pay MP, put the item's template
 * effect(s) on the actor for the technique's duration, post a short card.
 * Techniques that roll power keep the classic castSpell() path.
 * ------------------------------------------------------------------------- */
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
// strings live in lang/*.json under SW25.NewSheet
const T = (k, d) => (d ? game.i18n.format(`SW25.NewSheet.${k}`, d) : game.i18n.localize(`SW25.NewSheet.${k}`));

/** "30 секунд (3 р.)" -> 3, "3 минуты (18 р.)" -> 18, "1 час" -> 360, instant/unknown -> null */
function techniqueRounds(time) {
  const t = String(time ?? "").toLowerCase();
  let m = t.match(/\((\d+)\s*(?:р|r)/);
  if (m) return Number(m[1]);
  m = t.match(/(\d+)\s*(?:раунд|round)/);
  if (m) return Number(m[1]);
  m = t.match(/(\d+)\s*(?:час|hour)/);
  if (m) return Number(m[1]) * 360;
  m = t.match(/(\d+)\s*(?:мин|min)/);
  if (m) return Number(m[1]) * 6;
  return null;
}

// Fallback for owned copies when neither the item nor the compendium entry
// carries an ActiveEffect (the compendium is the source of truth).
const TECH_FX = {
  "кошачьи глаза": [["system.attributes.efhitmod", 1]],
  "медвежья мышца": [["system.abilities.str.efmodify", 2]],
};
// Book default: a technique costs 3 MP unless stated otherwise.
const TECH_MP = 3;
const techKey = (name) => String(name ?? "").trim().toLowerCase().replace(/ё/g, "е");

/**
 * Effect templates for a technique: the item's own effects, else the effects
 * of its compendium source (owned copies sometimes lose them), else the small
 * built-in table above.
 */
async function techniqueTemplates(item) {
  let list = item.effects.map((e) => e.toObject());
  if (!list.length) {
    let src = null;
    const uuid = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    try {
      if (uuid) src = await fromUuid(uuid);
    } catch (_e) {
      src = null;
    }
    if (!src) {
      const pack = starterPack("techniques");
      if (pack && !pack.index.size) await pack.getIndex();
      const entry = pack?.index.find((x) => techKey(canon(x.name)) === techKey(canon(item.name)));
      if (entry) src = await pack.getDocument(entry._id);
    }
    if (src?.effects?.size) list = src.effects.map((e) => e.toObject());
  }
  if (!list.length) {
    const ch = TECH_FX[techKey(canon(item.name))];
    if (ch) {
      list = [
        {
          name: item.name,
          system: { changes: ch.map(([key, value]) => ({ key, type: "add", value, phase: "initial" })) },
        },
      ];
    }
  }
  return list;
}

export async function useTechnique(actor, item) {
  // old owned copies have an empty base cost (shown as 1): use the book value
  const blank = String(item.system.basempcost ?? "").trim() === "";
  const cost = blank
    ? Math.max(1, TECH_MP - (Number(actor.system.attributes?.efmpall) || 0))
    : Number(item.system.mpcost) || 0;
  const mp = Number(actor.system.mp?.value) || 0;
  if (cost > mp) {
    ui.notifications.warn(T("NoMp", { name: item.name, cost, mp }));
    return null;
  }
  const rounds = techniqueRounds(item.system.time);

  // Template effects live on the item; the active copy lives on the actor.
  const effects = (await techniqueTemplates(item)).map((d) => {
    delete d._id;
    d.name = item.name;
    d.img = item.img;
    d.transfer = false;
    d.disabled = false;
    d.origin = item.uuid;
    d.duration = rounds ? { value: rounds, units: "rounds" } : {};
    if (rounds && game.combat?.started) {
      Object.assign(d.duration, {
        startRound: game.combat.round,
        startTurn: game.combat.turn,
        combat: game.combat.id,
      });
    }
    d.flags = foundry.utils.mergeObject(d.flags ?? {}, {
      sw25: { techFx: true, sourceName: actor.name, sourceId: `Actor.${actor.id}` },
    });
    return d;
  });

  // Timed technique without numbers (darkvision, wings, ...): a marker effect,
  // so the chip is visible on the sheet and expires with the duration.
  const marker = !effects.length && !!rounds;
  if (marker) {
    effects.push({
      name: item.name,
      img: item.img,
      transfer: false,
      disabled: false,
      origin: item.uuid,
      duration: { value: rounds, units: "rounds", ...(game.combat?.started
        ? { startRound: game.combat.round, startTurn: game.combat.turn, combat: game.combat.id }
        : {}) },
      flags: { sw25: { techFx: true, marker: true, sourceName: actor.name, sourceId: `Actor.${actor.id}` } },
    });
  }

  if (effects.length) {
    // using the same technique again refreshes it instead of stacking
    const dup = actor.effects.filter((x) => x.origin === item.uuid).map((x) => x.id);
    if (dup.length) await actor.deleteEmbeddedDocuments("ActiveEffect", dup);
    await actor.createEmbeddedDocuments("ActiveEffect", effects);
  }

  // "Восстановление": heal HP equal to the Enhancer class level.
  let heal = "";
  if (isItem(item.name, "recovery")) {
    const cls = findClassItem(actor, "enhancer");
    const lv = Number(cls?.system.skilllevel) || 0;
    const hp = Number(actor.system.hp?.value) || 0;
    const max = Number(actor.system.hp?.max) || hp;
    const to = Math.min(max, hp + lv);
    if (lv && to !== hp) await actor.update({ "system.hp.value": to });
    heal = lv ? T("HpHealed", { n: to - hp, from: hp, to }) : T("NoEnhancer");
  }
  if (cost) await actor.update({ "system.mp.value": mp - cost });

  const lines = [
    cost ? T("MpSpent", { cost, from: mp, to: mp - cost }) : "",
    heal,
    heal
      ? ""
      : marker
      ? T("Marker", { n: rounds })
      : effects.length
      ? (rounds ? T("Applied", { n: rounds }) : T("AppliedNoTime"))
      : T("Manual"),
  ];
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${esc(item.name)} <small>(${esc(game.i18n.localize("TYPES.Item.enhancearts"))}${
      item.system.time ? ` · ${esc(item.system.time)}` : ""
    })</small>`,
    content:
      lines.filter(Boolean).map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") +
      (item.system.description ? `<div class="sw25-cast-mp"><small>${item.system.description}</small></div>` : ""),
    flags: { sw25: { classAbility: true, itemid: item.id } },
  });
  return true;
}

export class SW25CharacterSheetNew extends SW25ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sw25", "sheet", "actor", "sw25n-app"],
      width: 860,
      height: 860,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "battle",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/sw25-ru/templates/actor/actor-character-sheet-new.hbs";
  }

  /**
   * One-click techniques. Everything else goes to the classic handler.
   * Shift+click keeps the old behaviour (plain item card).
   * @override
   */
  async _onRoll(event) {
    const el = event.currentTarget;
    if (el?.dataset?.rollType === "item" && !event.shiftKey) {
      const item = this.actor.items.get(el.closest(".item")?.dataset.itemId);
      if (
        item?.type === "enhancearts" &&
        !item.system.usepower &&
        game.settings.get("sw25", "autoCastSpells")
      ) {
        event.preventDefault();
        const daily = await dailyCheck(this.actor, item);
        if (!daily.ok) return;
        const used = await useTechnique(this.actor, item);
        if (daily.info && used !== null) await dailyMark(this.actor, item, daily);
        return used;
      }
    }
    return super._onRoll(event);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    const root = html[0];
    if (!root) return;

    // "Breakdown" popovers are native <details>: keep only one open and close
    // them when the user clicks anywhere outside (works for mouse and touch).
    root.addEventListener("click", (event) => {
      const inside = event.target.closest?.("details.n-more");
      for (const d of root.querySelectorAll("details.n-more[open]")) {
        if (d !== inside) d.removeAttribute("open");
      }
    });

    // Favourite star on every spell / technique / feature row. The rows come
    // from the classic partials, so the star is added here; the click itself is
    // handled by the inherited delegated ".changebookmark" listener, which
    // toggles item.system.bookmark.
    if (this.isEditable) {
      const rows = root.querySelectorAll(
        ".tab.spells li.item[data-item-id], .tab.features li.item[data-item-id], .tab.items li.item[data-item-id], .tab.check .n-checks-card li.item[data-item-id]"
      );
      for (const li of rows) {
        if (li.classList.contains("items-header") || li.querySelector(".n-star")) continue;
        const item = this.actor.items.get(li.dataset.itemId);
        if (!item || !STARRABLE.has(item.type)) continue;
        // Check rows: the name itself is the roll button, so the star goes
        // next to it (inside it a click would also roll the check).
        const name =
          item.type === "check"
            ? li.querySelector(":scope > .flexrow") ?? li
            : li.querySelector(".item-name");
        if (!name) continue;
        const on = !!item.system.bookmark;
        const star = document.createElement("a");
        star.className = `changebookmark n-star${on ? " on" : ""}`;
        star.dataset.tooltip = T(on ? "Unstar" : "Star");
        star.innerHTML = `<i class="${on ? "fa-solid" : "fa-regular"} fa-star"></i>`;
        name.prepend(star);
      }
    }
  }
}
