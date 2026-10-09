// Minimum Strength for equipping weapons, armour and shields
// (Core Rulebook I, pp. 151 and 153): a character can only EQUIP an item whose
// minimum Strength does not exceed their Strength; otherwise it can only be held.
// The Fencer class halves Strength (rounded up) for this check.
//
// - A player cannot tick "equipped" on such an item (the update is cancelled, a warning is shown).
// - The GM may always override (the GM only gets a notice).
// - Only player characters are checked: monsters/NPCs/companions can be given anything.
// - Items dropped onto a character with too little Strength arrive "held" (equip = false).

import { L2 } from "./monstergen-i18n.mjs";
import { classLevel } from "./names.mjs";

const BATTLE_TYPES = ["weapon", "armor", "accessory"];
// [Round 94] classes by key: «Боец» / "Fighter" / ファイター are the same class
const FULL_STR_CLASSES = ["fighter", "grappler"];

function reqOf(item) {
  const n = parseInt(String(item.system?.reqstr ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function hasSkill(actor, ...keys) {
  return classLevel(actor, ...keys) > 0;
}

/** Strength used for the check (halved for a Fencer who is not also a Fighter/Grappler). */
export function effectiveStrength(actor) {
  const str = Number(actor.system?.abilities?.str?.value) || 0;
  const half = hasSkill(actor, "fencer") && !FULL_STR_CLASSES.some((n) => hasSkill(actor, n));
  return { str: half ? Math.ceil(str / 2) : str, raw: str, half };
}

/** { ok, req, str, raw, half } — ok is true when the item does not apply or the requirement is met. */
export function checkEquipRequirement(item, actor = item.parent) {
  if (!actor || actor.documentName !== "Actor" || actor.type !== "character") return { ok: true };
  if (!BATTLE_TYPES.includes(item.type)) return { ok: true };
  const req = reqOf(item);
  if (req <= 0) return { ok: true };
  const { str, raw, half } = effectiveStrength(actor);
  return { ok: str >= req, req, str, raw, half };
}

function message(item, r) {
  const how = r.half ? L2(`Сила ${r.raw}, для Фехтовальщика ${r.str}`, `Strength ${r.raw}, ${r.str} for a Fencer`) : L2(`Сила ${r.str}`, `Strength ${r.str}`);
  return L2(`${item.name}: не хватает силы (${how}, нужно ${r.req}). Предмет можно только держать.`, `${item.name}: not enough Strength (${how}, ${r.req} needed). The item can only be held.`);
}

export function registerEquipRequirement() {
  Hooks.on("preUpdateItem", (item, changes, options, userId) => {
    if (userId !== game.user.id) return;
    if (foundry.utils.getProperty(changes, "system.equip") !== true) return;
    if (item.system?.equip === true) return;
    const r = checkEquipRequirement(item);
    if (r.ok) return;
    if (game.user.isGM) {
      ui.notifications.info(L2(`[ГМ] ${message(item, r)} Разрешено ГМом.`, `[GM] ${message(item, r)} Allowed by the GM.`));
      return;
    }
    ui.notifications.warn(message(item, r));
    return false;
  });

  // dropped / created on a character: arrives held if Strength is too low
  Hooks.on("preCreateItem", (item, data, options, userId) => {
    if (userId !== game.user.id) return;
    if (item.system?.equip !== true) return;
    const r = checkEquipRequirement(item);
    if (r.ok) return;
    item.updateSource({ "system.equip": false });
    ui.notifications.warn(message(item, r));
  });
}
