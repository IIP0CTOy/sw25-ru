// Import document classes.
import { SW25Actor } from "./documents/actor.mjs";
import { SW25Item } from "./documents/item.mjs";
import { SW25ActiveEffect } from "./documents/active-effect.mjs";
import { SW25Combat, registerSideInitiativeUI } from "./documents/combat.mjs";
// Import sheet classes.
import { SW25ActorSheet } from "./sheets/actor-sheet.mjs";
import { SW25CharacterSheetNew } from "./sheets/actor-sheet-new.mjs";
import { SW25ItemSheet } from "./sheets/item-sheet.mjs";
import { SW25ActiveEffectConfigV1 } from "./sheets/active-effect-config-V1.mjs";
import { SW25ActiveEffectConfigV2 } from "./sheets/active-effect-config-V2.mjs";
let SW25ActiveEffectConfig;

// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { SW25 } from "./helpers/config.mjs";
import { chatButton, resistKeyOf, markContestButtons, tagChildMessage, summarizeChild, filterViewerOnly } from "./helpers/chatbutton.mjs";
import { customCommand } from "./helpers/customcommand.mjs";
import { powerRoll } from "./helpers/powerroll.mjs";
import { lootRoll, registerCardButton } from "./helpers/lootroll.mjs";
import { growthCheck, bindGrowthButtons } from "./helpers/growthcheck.mjs";
import { actionRoll } from "./helpers/actionroll.mjs";
import { rollreq } from "./helpers/rollrequest.mjs";
import { targetRollDialog, targetSelectDialog } from "./helpers/dialogs.mjs";
import { preparePolyglot } from "./helpers/sw25languageprovider.mjs";
import { Migrator } from "./helpers/migrator.mjs";
import { isLabel } from "./helpers/utils.mjs";
import { registerSessionSettings, registerSessionHooks, sessionEnd } from "./helpers/session.mjs";
import { rollDeathCheck } from "./helpers/deathcheck.mjs";
import { grantAutoClassFeatures, registerAutoGrant } from "./helpers/classfeatures.mjs";
import { ensureClassCounters } from "./helpers/classcast.mjs";
import { registerSections } from "./helpers/sections.mjs";
import { registerMonsterGenerator } from "./helpers/monstergen.mjs";
import { registerShop } from "./helpers/shop.mjs";
import { registerEffectText } from "./helpers/effecttext.mjs";
import { registerStarter } from "./helpers/starter.mjs";
import { registerItemBuilder } from "./helpers/itembuilder.mjs";
import { registerSamples } from "./helpers/samples.mjs";
import { isClass, className, findClassItem } from "./helpers/names.mjs";
import { L2, lang as i18nLang } from "./helpers/monstergen-i18n.mjs";
import { registerRest } from "./helpers/rest.mjs";
import { registerEquipRequirement } from "./helpers/equipreq.mjs";
import { registerChargen } from "./helpers/chargen.mjs";
import { periodicEffectDamage } from "./helpers/spellcast.mjs";
import { registerSocketHandler } from "./helpers/socket.mjs";
import { registerItemPiles } from "./helpers/itempiles.mjs";

// Export variable.
export const rpt = {};
export let effectVitResPC,
  effectMndResPC,
  effectInitPC,
  effectMKnowPC,
  effectVitResMon,
  effectMndResMon,
  effectHitMon,
  effectDmgMon,
  effectDodgeMon,
  effectScpMon,
  effectCnpMon,
  effectWzpMon,
  effectPrpMon,
  effectMtpMon,
  effectFrpMon,
  effectDrpMon,
  effectDmpMon,
  effectAbpMon,
  effectBmpMon;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

/**
 * World settings. Registered in `init` (was: `ready`, which ran after actors
 * were already prepared, so the first preparation saw undefined names).
 * Defaults are fixed Russian names that match the Russian content items,
 * instead of the GM client's UI language (an English-UI GM silently broke
 * initiative/resistance bonuses for everyone).
 */
const RU_SETTING_DEFAULTS = {
  effectVitResPC: "Стойкость",
  effectMndResPC: "Воля",
  effectInitPC: "Инициатива",
  effectMKnowPC: "Знание монстров",
  effectVitResMon: "Стойкость",
  effectMndResMon: "Воля",
  effectHitMon: "Точность",
  effectDmgMon: "Урон",
  effectDodgeMon: "Уклонение",
  effectScpMon: "ОМ Речи Истины",
  effectCnpMon: "ОМ Духовной магии",
  effectWzpMon: "ОМ Глубинной магии",
  effectPrpMon: "ОМ Божественной магии",
  effectMtpMon: "ОМ Магитеха",
  effectFrpMon: "ОМ Магии фей",
  effectDrpMon: "ОМ Природной магии",
  effectDmpMon: "ОМ Призыва",
  effectAbpMon: "ОМ Магии Бездны",
  effectBmpMon: "ОМ Тайнописи",
};
/** [Round 94] The same names for a world played in another language (they match lang/en.json). */
const EN_SETTING_DEFAULTS = {
  effectVitResPC: "Fortitude",
  effectMndResPC: "Willpower",
  effectInitPC: "Initiative",
  effectMKnowPC: "Monster Knowledge",
  effectVitResMon: "Fortitude",
  effectMndResMon: "Willpower",
  effectHitMon: "Accuracy",
  effectDmgMon: "Damage",
  effectDodgeMon: "Evasion",
  effectScpMon: "Truespeech Magic Power",
  effectCnpMon: "Spiritualism Magic Power",
  effectWzpMon: "Deep Magic Power",
  effectPrpMon: "Divine Magic Power",
  effectMtpMon: "Magitech Magic Power",
  effectFrpMon: "Fairy Magic Power",
  effectDrpMon: "Nature Magic Power",
  effectDmpMon: "Summoning Magic Power",
  effectAbpMon: "Abyssal Magic Power",
  effectBmpMon: "Secrets Magic Power",
};
/**
 * Default of a name setting. These are WORLD settings: every client must see the same value,
 * so the language-dependent default is only a stop-gap until the active GM writes the names
 * into the world once (pinSettingDefaults, on ready).
 */
const settingDefault = (key) => (i18nLang() === "ru" ? RU_SETTING_DEFAULTS : EN_SETTING_DEFAULTS)[key];

/**
 * Active GM, once per world: store the name settings explicitly, so that players whose client
 * is in another language do not fall back to different defaults. A world that already holds
 * Russian content (a check or an ability called by a Russian default) keeps the Russian names
 * whatever the GM's interface language is.
 */
async function pinSettingDefaults() {
  if (!game.user.isGM || game.user.id !== game.users.activeGM?.id) return;
  const stored = (key) => game.settings.storage.get("world")?.getSetting?.(`sw25.${key}`) != null
    || game.settings.storage.get("world")?.some?.((d) => d.key === `sw25.${key}`);
  const keys = Object.keys(RU_SETTING_DEFAULTS).filter((k) => !stored(k));
  if (!keys.length) return;
  const ruNames = new Set(Object.values(RU_SETTING_DEFAULTS));
  const hasRu = (items) => items?.some?.((i) => (i.type === "check" || i.type === "monsterability") && ruNames.has(i.name));
  const russianWorld = i18nLang() === "ru" || hasRu(game.items) || game.actors.some((a) => hasRu(a.items));
  const table = russianWorld ? RU_SETTING_DEFAULTS : EN_SETTING_DEFAULTS;
  for (const k of keys) await game.settings.set("sw25", k, table[k]);
  readSystemSettings();
}


function registerSystemSettings() {
  game.settings.register("sw25", "effectVitResPC", {
    name: "SETTING.effectVitResPC.name",
    hint: "SETTING.effectVitResPC.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectVitResPC"),
    onChange: (value) => {
      effectVitResPC = value;
    },
  });
  game.settings.register("sw25", "effectMndResPC", {
    name: "SETTING.effectMndResPC.name",
    hint: "SETTING.effectMndResPC.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectMndResPC"),
    onChange: (value) => {
      effectMndResPC = value;
    },
  });
  game.settings.register("sw25", "effectInitPC", {
    name: "SETTING.effectInitPC.name",
    hint: "SETTING.effectInitPC.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectInitPC"),
    onChange: (value) => {
      effectInitPC = value;
    },
  });
  game.settings.register("sw25", "effectMKnowPC", {
    name: "SETTING.effectMKnowPC.name",
    hint: "SETTING.effectMKnowPC.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectMKnowPC"),
    onChange: (value) => {
      effectMKnowPC = value;
    },
  });
  game.settings.register("sw25", "effectVitResMon", {
    name: "SETTING.effectVitResMon.name",
    hint: "SETTING.effectVitResMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectVitResMon"),
    onChange: (value) => {
      effectVitResMon = value;
    },
  });
  game.settings.register("sw25", "effectMndResMon", {
    name: "SETTING.effectMndResMon.name",
    hint: "SETTING.effectMndResMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectMndResMon"),
    onChange: (value) => {
      effectMndResMon = value;
    },
  });
  game.settings.register("sw25", "effectHitMon", {
    name: "SETTING.effectHitMon.name",
    hint: "SETTING.effectHitMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectHitMon"),
    onChange: (value) => {
      effectHitMon = value;
    },
  });
  game.settings.register("sw25", "effectDmgMon", {
    name: "SETTING.effectDmgMon.name",
    hint: "SETTING.effectDmgMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectDmgMon"),
    onChange: (value) => {
      effectDmgMon = value;
    },
  });
  game.settings.register("sw25", "effectDodgeMon", {
    name: "SETTING.effectDodgeMon.name",
    hint: "SETTING.effectDodgeMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectDodgeMon"),
    onChange: (value) => {
      effectDodgeMon = value;
    },
  });
  game.settings.register("sw25", "effectScpMon", {
    name: "SETTING.effectScpMon.name",
    hint: "SETTING.effectScpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectScpMon"),
    onChange: (value) => {
      effectScpMon = value;
    },
  });
  game.settings.register("sw25", "effectCnpMon", {
    name: "SETTING.effectCnpMon.name",
    hint: "SETTING.effectCnpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectCnpMon"),
    onChange: (value) => {
      effectCnpMon = value;
    },
  });
  game.settings.register("sw25", "effectWzpMon", {
    name: "SETTING.effectWzpMon.name",
    hint: "SETTING.effectWzpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectWzpMon"),
    onChange: (value) => {
      effectWzpMon = value;
    },
  });
  game.settings.register("sw25", "effectPrpMon", {
    name: "SETTING.effectPrpMon.name",
    hint: "SETTING.effectPrpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectPrpMon"),
    onChange: (value) => {
      effectPrpMon = value;
    },
  });
  game.settings.register("sw25", "effectMtpMon", {
    name: "SETTING.effectMtpMon.name",
    hint: "SETTING.effectMtpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectMtpMon"),
    onChange: (value) => {
      effectMtpMon = value;
    },
  });
  game.settings.register("sw25", "effectFrpMon", {
    name: "SETTING.effectFrpMon.name",
    hint: "SETTING.effectFrpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectFrpMon"),
    onChange: (value) => {
      effectFrpMon = value;
    },
  });
  game.settings.register("sw25", "effectDrpMon", {
    name: "SETTING.effectDrpMon.name",
    hint: "SETTING.effectDrpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectDrpMon"),
    onChange: (value) => {
      effectDrpMon = value;
    },
  });
  game.settings.register("sw25", "effectDmpMon", {
    name: "SETTING.effectDmpMon.name",
    hint: "SETTING.effectDmpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectDmpMon"),
    onChange: (value) => {
      effectDmpMon = value;
    },
  });
  game.settings.register("sw25", "effectAbpMon", {
    name: "SETTING.effectAbpMon.name",
    hint: "SETTING.effectAbpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectAbpMon"),
    onChange: (value) => {
      effectAbpMon = value;
    },
  });
  game.settings.register("sw25", "effectBmpMon", {
    name: "SETTING.effectBmpMon.name",
    hint: "SETTING.effectBmpMon.hint",
    scope: "world",
    config: true,
    type: String,
    default: settingDefault("effectBmpMon"),
    onChange: (value) => {
      effectBmpMon = value;
    },
  });
  game.settings.register("sw25", "fromCompendium", {
    name: "SETTING.fromCompendium.name",
    hint: "SETTING.fromCompendium.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  });
  // [Round 66]
  game.settings.register("sw25", "compactCards", {
    name: "SETTING.compactCards.name",
    hint: "SETTING.compactCards.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });
  game.settings.register("sw25", "sideInitiative", {
    name: "SETTING.sideInitiative.name",
    hint: "SETTING.sideInitiative.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register("sw25", "autoCastSpells", {
    name: "SETTING.autoCastSpells.name",
    hint: "SETTING.autoCastSpells.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register("sw25", "autoResistNonPC", {
    name: "SETTING.autoResistNonPC.name",
    hint: "SETTING.autoResistNonPC.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register("sw25", "defaultCharaAction", {
    name: "SETTING.defaultCharaAction.name",
    hint: "SETTING.defaultCharaAction.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });

}

/** Read setting values into the exported variables (before actors are prepared). */
function readSystemSettings() {
  effectVitResPC = game.settings.get("sw25", "effectVitResPC");
  effectMndResPC = game.settings.get("sw25", "effectMndResPC");
  effectInitPC = game.settings.get("sw25", "effectInitPC");
  effectMKnowPC = game.settings.get("sw25", "effectMKnowPC");
  effectVitResMon = game.settings.get("sw25", "effectVitResMon");
  effectMndResMon = game.settings.get("sw25", "effectMndResMon");
  effectHitMon = game.settings.get("sw25", "effectHitMon");
  effectDmgMon = game.settings.get("sw25", "effectDmgMon");
  effectDodgeMon = game.settings.get("sw25", "effectDodgeMon");
  effectScpMon = game.settings.get("sw25", "effectScpMon");
  effectCnpMon = game.settings.get("sw25", "effectCnpMon");
  effectWzpMon = game.settings.get("sw25", "effectWzpMon");
  effectPrpMon = game.settings.get("sw25", "effectPrpMon");
  effectMtpMon = game.settings.get("sw25", "effectMtpMon");
  effectFrpMon = game.settings.get("sw25", "effectFrpMon");
  effectDrpMon = game.settings.get("sw25", "effectDrpMon");
  effectDmpMon = game.settings.get("sw25", "effectDmpMon");
  effectAbpMon = game.settings.get("sw25", "effectAbpMon");
  effectBmpMon = game.settings.get("sw25", "effectBmpMon");
}

Hooks.once("init", function () {
  registerSystemSettings();
  registerSessionSettings();
  registerSessionHooks();
  registerItemPiles();
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.sw25 = {
    SW25Actor,
    SW25Item,
    SW25ActiveEffect,
    SW25Combat,
    rollItemMacro,
    powerRoll,
    lootRoll,
    growthCheck,
    actionRoll,
    targetRollDialog,
    targetSelectDialog,
    rollDeathCheck,
    sessionEnd,
  };

  // Add custom constants for configuration.
  CONFIG.SW25 = SW25;

  // Define custom Document classes
  CONFIG.Actor.documentClass = SW25Actor;
  CONFIG.Item.documentClass = SW25Item;
  CONFIG.ActiveEffect.documentClass = SW25ActiveEffect;
  CONFIG.Combat.documentClass = SW25Combat;
  registerSideInitiativeUI();

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Round 25 addendum: a handful of custom status markers for effects
  // that impose a CONDITION rather than a numeric modifier (Оглушение/
  // Безумие/Западня/Звуковой карман — see audit-mechanics-gap README,
  // "Группа C"). This registers only the ICON/tracking side — Foundry
  // shows it on the token HUD and combat tracker, and it auto-clears
  // with the effect's own duration.rounds like any other ActiveEffect.
  // It does NOT enforce the rule mechanically (e.g. a "stunned" token
  // can still act unless a GM remembers the condition) — building real
  // rule enforcement (auto-skipping a stunned token's turn, blocking
  // actions, etc.) is a separate, bigger feature this round intentionally
  // does not attempt blind. Prefixed "sw25" to avoid colliding with any
  // core-Foundry or future system status id.
  CONFIG.statusEffects.push(
    { id: "sw25stunned", name: "SW25.Status.Stunned", img: "icons/svg/daze.svg" },
    { id: "sw25confused", name: "SW25.Status.Confused", img: "icons/svg/stoned.svg" },
    { id: "sw25restrained", name: "SW25.Status.Restrained", img: "icons/svg/net.svg" },
    { id: "sw25silenced", name: "SW25.Status.Silenced", img: "icons/svg/silenced.svg" },
    // Round 52: SW25 core p.184 — 0 or less HP => unconscious, threatened
    // with death, Проверка Смерти begins. Same "icon-only" caveat as the
    // four above: Foundry shows it on the token/combat tracker on its
    // own, but nothing here stops an "unconscious" token from being
    // manually acted with — the preUpdateActor/updateActor hook pair
    // below only handles APPLYING/CLEARING the marker as HP crosses 0,
    // not enforcing "can't act while unconscious".
    { id: "sw25unconscious", name: "SW25.Status.Unconscious", img: "icons/svg/unconscious.svg" }
  );

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("sw25", SW25ActorSheet, {
    makeDefault: true,
    label: "SW25.SheetLabels.Actor",
  });
  // [UI redesign] second, opt-in sheet for characters — pick it from the
  // sheet window's "Sheet" button. The classic sheet above stays the default.
  Actors.registerSheet("sw25", SW25CharacterSheetNew, {
    types: ["character"],
    makeDefault: false,
    label: "SW25.SheetLabels.ActorNew", // a lang key: at init the client language is not known yet
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("sw25", SW25ItemSheet, {
    makeDefault: true,
    label: "SW25.SheetLabels.Item",
  });

  // Register Active effect sheet Class
  DocumentSheetConfig.unregisterSheet(ActiveEffect, "core", ActiveEffectConfig);

  if (foundry.utils.isNewerVersion(game.version, "13")) {
    // v13 or newer
    SW25ActiveEffectConfig = SW25ActiveEffectConfigV2;
  } else {
    // v12 or older
    SW25ActiveEffectConfig = SW25ActiveEffectConfigV1;
  }

  DocumentSheetConfig.registerSheet(
    ActiveEffect,
    "sw25",
    SW25ActiveEffectConfig,
    {
      makeDefault: true,
      label: "SW25.SheetLabels.ActiveEffect",
    }
  );

  // migration setting.
  game.settings.register("sw25", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0",
  });

  Actor.prototype.migrateSystemData = function (currentVersion, storedVersion) {
    return Migrator.migrateActor(this, currentVersion, storedVersion);
  };
  Item.prototype.migrateSystemData = function (currentVersion, storedVersion) {
    return Migrator.migrateItem(this, currentVersion, storedVersion);
  };

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/**
 * migration hook.
 */
Hooks.once("setup", () => {
  registerSections(); // [Round 77] multi-section monsters
  registerRest(); // [Round 82] rest and «once per day»
  registerChargen(); // [Round 85] character creation wizard
  registerMonsterGenerator(); // [Round 91] GM monster generator / importer
  registerShop(); // [Round 92] drag-and-drop shop (price -> money)
  registerEffectText(); // [Round 93] effects from text + manual fix dialog (item sheet header)
  registerItemBuilder(); // [Round 97] item constructor (weapons, armour, accessories, gear, spells)
  registerAutoGrant(); // [2026-10-07] «выдавать автоматически» on talent sheets
  registerSamples(); // [Round 99] built-in sample characters and monsters
  registerStarter(); // [Round 95] starter compendiums (classes, checks, racial abilities, techniques)
  registerEquipRequirement(); // minimum Strength to equip (book I p.151/153), GM may override
  registerCardButton(); // [Round 87] «+» in the material card table
  readSystemSettings();
});

Hooks.once("ready", async () => {
  await pinSettingDefaults();
  if (game.user.isGM) {
    // multiple GM treatment
    const isActiveGM =
      game.user.isGM && game.user.id === game.users.activeGM?.id;
    if (!isActiveGM) return;

    const currentVersion = game.system.version;
    const storedVersion = game.settings.get("sw25", "systemMigrationVersion");

    if (Migrator.isVersionBefore(storedVersion, currentVersion)) {
      ui.notifications.info(game.i18n.localize("SW25.StartMigration"));
      await Migrator.migrateWorld(storedVersion, currentVersion);
      await game.settings.set("sw25", "systemMigrationVersion", currentVersion);
      ui.notifications.info(game.i18n.localize("SW25.CompleteMigration"));
    }
  }
});

/**
 * combat hook.
 */
// [Round 74] class level-ups: XP check (book I p.188) and talent hint
Hooks.on("preUpdateItem", (item, changes, options, userId) => {
  if (userId !== game.user.id || item.type !== "skill" || item.actor?.type !== "character") return;
  const lvl = foundry.utils.getProperty(changes, "system.skilllevel");
  if (lvl === undefined || Number(lvl) <= Number(item.system.skilllevel)) return;
  options.sw25PrevAdv = Number(item.actor.system.attributes.advlevel?.value ?? 0);
  const A = [0, 1000, 2000, 3500, 5000, 7000, 9500, 12500, 16500, 21500, 27500, 35000, 44000, 54500, 66500, 80000];
  const B = [0, 500, 1500, 2500, 4000, 5500, 7500, 10000, 13000, 17000, 22000, 28000, 35500, 44500, 55000, 67000];
  const tbl = item.system.exptable === "A" ? A : item.system.exptable === "B" ? B : null;
  if (!tbl) return;
  const extra = (tbl[Number(lvl)] ?? Infinity) - (tbl[Number(item.system.skilllevel)] ?? 0);
  const attr = item.actor.system.attributes;
  const free = Number(attr.totalexp ?? 0) - Number(attr.useexp ?? 0);
  if (extra > free) {
    ui.notifications.warn(game.i18n.format("SW25.Session.NoXP", { name: item.name, lvl, need: extra, free }));
    if (!game.user.isGM) return false; // players cannot overspend; the GM is warned only
  }
});
Hooks.on("updateItem", (item, changes, options, userId) => {
  if (userId !== game.user.id || item.type !== "skill" || item.actor?.type !== "character") return;
  if (foundry.utils.getProperty(changes, "system.skilllevel") === undefined) return;
  const adv = Number(item.actor.system.attributes.advlevel?.value ?? 0);
  const prev = Number(options.sw25PrevAdv ?? NaN);
  if (adv % 2 === 1 && Number.isFinite(prev) && adv > prev)
    ui.notifications.info(game.i18n.format("SW25.Session.NewTalent", { name: item.actor.name, adv }));
});

/**
 * [2026-10-07] Round-based effects that were applied outside combat. When the fight starts the
 * core stamps them with the current round and, on the owner's first turn, marks them expired
 * although no round has passed — the buff silently stops working. Give such effects a start
 * (when the core did not) and clear an "expired" mark that came before the duration ran out.
 */
async function restampPreCombatEffects(combat, actor, again = true) {
  if (!actor || !combat?.started) return;
  const updates = [];
  for (const e of actor.effects) {
    const d = e._source?.duration ?? {};
    const st = e._source?.start ?? {};
    const value = Number(d.value);
    if (!(value > 0) || (d.units && d.units !== "rounds")) continue;
    if (st.round === null || st.round === undefined) {
      updates.push({ _id: e.id, start: { combat: combat.id, combatant: combat.combatant?.id ?? null, round: combat.round, turn: combat.turn ?? 0, time: game.time.worldTime }, "duration.expired": false });
    } else if (d.expired && (st.combat?.id ?? st.combat) === combat.id && combat.round - Number(st.round) < value) {
      updates.push({ _id: e.id, "duration.expired": false });
    }
  }
  try {
    if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
  } catch (err) {
    console.error(`SW25 | pre-combat effects of "${actor.name}":`, err);
  }
  // the core's own expiry pass may land after this hook: look once more when the turn change has settled
  if (again) setTimeout(() => restampPreCombatEffects(combat, actor, false), 400);
}
// someone joins a fight that is already running
Hooks.on("createCombatant", (combatant) => {
  if (game.user.id !== game.users.activeGM?.id) return;
  const combat = combatant.combat ?? combatant.parent;
  if (combat?.started) restampPreCombatEffects(combat, combatant.actor);
});

Hooks.on("updateCombat", async (combat, changes, options, userId) => {
  if (!game.user.isGM) return;

  // multiple GM treatment
  const isActiveGM = game.user.isGM && game.user.id === game.users.activeGM?.id;
  if (!isActiveGM) return;

  // SW25-RU: auto-expire round-based buffs/debuffs (Active Effects with a
  // "N rounds" duration, e.g. enhance-arts techniques like [Жучья кожа]).
  // Foundry core tracks and displays "duration.remaining" for temporary
  // effects on its own, but — unlike Pathfinder 2e, which has its own
  // effect-expiration sweep every turn — it never actually DELETES an
  // expired effect for you. Without this, a Точность/Урон/Защита buff
  // would sit there forever showing "0 rounds left" instead of the
  // bonus actually going away. Runs once per round advance (not every
  // single turn), checking every combatant's actor, not just the one
  // whose turn just ended.
  // [Round 72] v14: duration.remaining is not filled in, so compute it:
  // an N-round effect ends when its source's turn comes around N rounds
  // after it started (or any time later), checked on every turn change.
  // [2026-10-07] a buff cast BEFORE the fight is marked expired by v14 on its owner's first
  // turn and silently stops working: count its rounds from this fight instead.
  if (changes.round !== undefined || changes.turn !== undefined) {
    for (const c of combat.combatants) await restampPreCombatEffects(combat, c.actor);
  }
  const nowCombatant = combat.combatant?.id;
  const isExpired = (effect) => {
    const d = effect.duration ?? {};
    const value = Number(d.value ?? d.rounds ?? 0);
    const st = effect.start ?? {};
    const startRound = Number(st.round ?? d.startRound);
    // [2026-10-07] v14 fills duration.remaining per ROUND (0 at the top of
    // round start+N), which killed every N-round effect before the turn it
    // was cast on came around again. Trust it only when there is no start
    // data to compute the exact turn from.
    const exact = value && Number.isFinite(startRound) && (!d.units || d.units === "rounds");
    if (!exact && d.remaining !== null && d.remaining !== undefined && d.remaining <= 0) return true;
    if (!value || (d.units && d.units !== "rounds")) return false;
    if (!Number.isFinite(startRound) || (st.combat && (st.combat.id ?? st.combat) !== combat.id)) return false;
    const elapsed = combat.round - startRound;
    if (elapsed > value) return true;
    if (elapsed < value) return false;
    const src = st.combatant;
    return !src || src === nowCombatant || !combat.combatants.get(src);
  };
  if (changes.round !== undefined || changes.turn !== undefined) {
    for (const c of combat.combatants) {
      const combatActor = c.actor;
      if (!combatActor) continue;
      const expired = combatActor.effects.filter(isExpired);
      if (expired?.length) {
        try {
          await combatActor.deleteEmbeddedDocuments(
            "ActiveEffect",
            expired.map((e) => e.id)
          );
        } catch (err) {
          console.error(
            `SW25 | failed to clean up expired effect(s) on "${combatActor.name}":`,
            err
          );
        }
      }
    }
  }

  // [2026-10-07] combat.previous is {round, turn, combatantId, tokenId}, not a Combatant:
  // resolve it so this also works when the GM is looking at another scene
  const prevState = combat.previous;
  if (!prevState) return;
  const combatant = combat.combatants.get(prevState.combatantId) ?? prevState;

  let actor = combatant.actor || game.actors.get(combatant.actorId);

  if (!actor && combatant.tokenId) {
    const token = canvas.tokens.get(combatant.tokenId);
    if (token) {
      actor = token.actor;
    }
  }

  if (!actor) return;

  // [Round 66] only when the tracker moves FORWARD (going back a turn used
  // to heal/drain again)
  const prev = combat.previous ?? {};
  if (
    prev.round !== undefined &&
    (combat.round < prev.round ||
      (combat.round === prev.round && combat.turn < (prev.turn ?? 0)))
  )
    return;

  // [Round 84] damage that repeats at the end of this actor's turn
  if (changes.turn !== undefined || changes.round !== undefined) {
    const tok = combatant.tokenId ? canvas.tokens.get(combatant.tokenId) : null;
    for (const e of actor.effects.filter((x) => x.flags?.sw25?.periodic && !x.disabled)) {
      try {
        await periodicEffectDamage(actor, e, tok);
      } catch (err) {
        console.error("SW25 | periodic effect damage", err);
      }
    }
  }

  const turnEndEffect = actor.system.attributes?.turnend;
  // [Round 66] monsters: "Регенерация = N" / "Тёмная регенерация = N" from
  // the stat block (13 monsters), unless the text says it stops at 0 HP.
  let monsterRegen = 0;
  if (actor.type === "monster") {
    const txt = String(actor.system.gminfo ?? "").replace(/<[^>]+>/g, " ");
    const m = txt.match(/(?:[Рр]егенерация|[Rr]egeneration|再生)\s*=\s*(\d+)/);
    if (m) {
      const stopsAtZero = /не при 0 ОЖ|not at 0 HP/i.test(txt);
      if (!(stopsAtZero && (Number(actor.system.hp?.value) || 0) <= 0))
        monsterRegen = Number(m[1]);
    }
  }
  if (changes.turn !== undefined || changes.round !== undefined) {
    if (turnEndEffect?.hpregenmod || turnEndEffect?.mpregenmod || monsterRegen) {
      const hpregen = (Number(turnEndEffect?.hpregenmod) || 0) + monsterRegen;
      const mpregen = Number(turnEndEffect?.mpregenmod) || 0;

      const targetHP = actor.system.hp.value || 0;
      const maxHP = Number(actor.system.hp.max) || targetHP;
      const maxMP = Number(actor.system.mp.max) || 0;
      // healing never goes above max; damage can go below 0 (unconscious)
      const resultHP =
        hpregen > 0 ? Math.max(targetHP, Math.min(targetHP + hpregen, maxHP)) : targetHP + hpregen;
      const targetMP = actor.system.mp.value || 0;
      const resultMP = Math.max(
        0,
        mpregen > 0 ? Math.max(targetMP, Math.min(targetMP + mpregen, maxMP)) : targetMP + mpregen
      );
      let isView = false;
      if (Number(hpregen) != 0 || Number(mpregen) != 0) {
        if (CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= actor.ownership.default)
          isView = true;

        // Apply regen
        const updates = {
          "system.hp.value": resultHP,
          "system.mp.value": resultMP,
        };

        // sw25Direct: a multi-section monster regenerates its MAIN section,
        // not the section the players aimed at last
        actor.update(updates, { sw25Direct: true });
      }

      // Chat message
      const speaker = ChatMessage.getSpeaker({ actor: actor });
      const rollMode = game.settings.get("core", "rollMode");
      let label =
        actor.name + "(" + game.i18n.localize("SW25.TurnendEffect") + ")";

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
      };

      chatData.content = await renderTemplate(
        "systems/sw25-ru/templates/roll/hpmp-apply.hbs",
        {
          targetHP: targetHP,
          resultHP: resultHP,
          targetMP: targetMP,
          resultMP: resultMP,
          hpregen: 0 < hpregen ? `+${hpregen}` : hpregen,
          mpregen: 0 < mpregen ? `+${mpregen}` : mpregen,
          isView: isView,
        }
      );

      ChatMessage.create(chatData);
    }
  }
});

/**
 * Round 22: equip-gated Active Effects.
 *
 * Foundry's own applyActiveEffects() (which this system does not
 * override beyond a crash-guard, see actor.mjs/item.mjs) applies EVERY
 * embedded ActiveEffect with transfer:true on an owned Item to its
 * Actor unconditionally — it has no concept of this system's own
 * "Экипировано" (system.equip) checkbox. That meant an accessory/armor/
 * weapon item's own bonus (e.g. a ring granting +1 Воля) would apply
 * even while sitting unequipped in the inventory, and there was no way
 * to make it turn off again on unequip. These two hooks keep an item's
 * OWN transfer-effects' disabled state in sync with system.equip:
 * enabled while equipped, disabled while not. Nothing else about
 * ActiveEffects (round-based buffs, click-to-target self-buffs, etc.)
 * is touched — only items that (a) have their own equip toggle and
 * (b) carry at least one transfer:true effect are affected.
 */
async function syncEquipEffects(item, equip) {
  if (!item.effects?.size) return;
  const transferEffects = item.effects.filter((e) => e.transfer === true);
  if (!transferEffects.length) return;
  const updates = transferEffects
    .filter((e) => e.disabled !== !equip)
    .map((e) => ({ _id: e.id, disabled: !equip }));
  if (!updates.length) return;
  try {
    await item.updateEmbeddedDocuments("ActiveEffect", updates);
  } catch (err) {
    console.error(
      `SW25 | failed to sync equip-gated effect(s) on "${item.name}":`,
      err
    );
  }
}

// [Round 66] run only on the client that made the change (was: every owner
// client — player AND GM — plus a second upstream GM hook, so each equip
// toggle was written 2-3 times and the upstream one also flipped
// non-transfer template effects).
Hooks.on("createItem", (item, options, userId) => {
  if (userId !== game.user.id) return;
  if (!("equip" in (item.system ?? {}))) return;
  syncEquipEffects(item, item.system.equip === true);
});

Hooks.on("updateItem", (item, changes, options, userId) => {
  if (userId !== game.user.id) return;
  if (!foundry.utils.hasProperty(changes, "system.equip")) return;
  syncEquipEffects(item, foundry.utils.getProperty(changes, "system.equip") === true);
});

// [Round 52] SW25 core p.184: 0 or less HP => unconscious, Проверка
// Смерти begins (see helpers/deathcheck.mjs for the roll itself). This
// pair of hooks only manages the "sw25unconscious" status marker and the
// deathchecks counter as HP crosses the 0 line — split across
// preUpdateActor (to capture the PRE-update HP, since a partial update
// payload doesn't carry the old value) and updateActor (to do the actual
// async embedded-document work, which isn't safe mid-preUpdate). Applying
// the wake-up itself (hp -> 1) is done by rollDeathCheck; this pair reacts
// to THAT update too and clears the marker, so the two files never need
// to duplicate each other's bookkeeping.
// [Round 66] Unconscious status + death-check counter.
// Runs on the client that made the HP change (it has permission to update
// this actor), not only on the active GM: before, with no GM online the
// counter was never reset and a later knock-out could wake up after 1 success.
// The counter reset is written into the same update (no second round-trip).
// Previous HP is keyed per actor, so batch updates of several actors work.
// [2026-10-07] compendium weapons come with checkskill "adv" and no power skill, so the
// extra damage missed the class level (book: warrior class level + ability modifier).
// When such a weapon lands on a character, point it at the character's own warrior class.
Hooks.on("preCreateItem", (item, data, options, userId) => {
  const actor = item.parent;
  if (item.type !== "weapon" || actor?.documentName !== "Actor" || actor.type !== "character") return;
  const sys = item.system ?? {};
  const unset = (v) => v === undefined || v === null || v === "" || v === "-" || v === "adv";
  if (!unset(sys.checkskill) || !unset(sys.powerskill)) return;
  const cat = String(sys.category ?? "");
  const allowed = cat === "grapple" ? ["grappler"]
    : ["bow", "crossbow", "gun"].includes(cat) ? ["shooter"]
    : ["throw", "throwing"].includes(cat) ? ["shooter", "fighter", "fencer"]
    : ["fighter", "fencer"];
  const best = actor.items
    .filter((i) => i.type === "skill" && isClass(i.name, allowed) && Number(i.system.skilllevel) > 0)
    .sort((a, b) => Number(b.system.skilllevel) - Number(a.system.skilllevel))[0];
  if (!best) return;
  const upd = { "system.checkskill": best.name };
  if (cat !== "gun") upd["system.powerskill"] = best.name; // gun damage comes from the bullet
  item.updateSource(upd);
});

// [2026-10-07] a monster at 0 HP is out of the fight: mark it defeated in the
// tracker (and back, if it is healed above 0)
Hooks.on("updateActor", async (actor, changed, options, userId) => {
  if (userId !== game.user.id || actor.type !== "monster") return;
  if (!foundry.utils.hasProperty(changed, "system.hp.value")) return;
  const tokenId = actor.token?.id;
  const c = game.combat?.combatants.find((x) => (tokenId ? x.tokenId === tokenId : x.actorId === actor.id && x.token?.actorLink));
  if (!c || !c.isOwner) return;
  const down = Number(actor.system.hp?.value ?? 0) <= 0;
  if (!!c.defeated !== down) await c.update({ defeated: down });
});

Hooks.on("preUpdateActor", (actor, changed, options) => {
  if (actor.type !== "character") return;
  if (!foundry.utils.hasProperty(changed, "system.hp.value")) return;
  const prevHp = Number(actor.system.hp?.value ?? 0);
  const newHp = Number(foundry.utils.getProperty(changed, "system.hp.value"));
  options.sw25PrevHp ??= {};
  options.sw25PrevHp[actor.uuid] = prevHp;
  if (Number.isFinite(newHp) && (prevHp <= 0) !== (newHp <= 0)) {
    foundry.utils.setProperty(changed, "system.attributes.deathchecks.value", 0);
  }
});

Hooks.on("updateActor", async (actor, changed, options, userId) => {
  if (userId !== game.user.id) return;
  if (actor.type !== "character") return;
  const prevHp = options.sw25PrevHp?.[actor.uuid];
  if (prevHp === undefined) return;

  const newHp = Number(actor.system.hp?.value ?? 0);
  const wasUnconscious = prevHp <= 0;
  const isUnconscious = newHp <= 0;
  if (wasUnconscious === isUnconscious) return;

  try {
    await actor.toggleStatusEffect("sw25unconscious", { active: isUnconscious });
  } catch (err) {
    console.error(`SW25 | unconscious-status update failed for "${actor.name}":`, err);
  }
});

// [Round 62] Silently auto-grant "learn"-type (zero player choice) class
// talents the moment a class level crosses the book's threshold — see
// helpers/classfeatures.mjs for the table and the full rationale for why
// only that one condtype is touched.
// [Round 66] Runs on the client that changed the class (it owns the actor),
// so level-ups made while no GM is online are granted too. Also handles a
// class item dropped onto the sheet already at level N (createItem).
Hooks.on("updateItem", async (item, changes, options, userId) => {
  if (userId !== game.user.id) return;
  if (item.type !== "skill") return;
  if (!foundry.utils.hasProperty(changes, "system.skilllevel")) return;
  const actor = item.actor;
  if (!actor || actor.type !== "character") return;
  try {
    await grantAutoClassFeatures(actor);
  } catch (err) {
    console.error(`SW25 | auto-class-features hook failed for "${actor.name}":`, err);
  }
});

// [Round 76] Geomancer / Tactician: counters for Qi (×3) and Limit appear
// as soon as the class or its first aspect/stratagem is added.
Hooks.on("createItem", async (item, options, userId) => {
  if (userId !== game.user.id) return;
  if (!["skill", "phasearea", "tactics", "alchemytech"].includes(item.type)) return;
  if (item.actor?.type !== "character") return;
  try {
    await ensureClassCounters(item.actor, item);
  } catch (err) {
    console.error("SW25 | class counters failed:", err);
  }
});

Hooks.on("createItem", async (item, options, userId) => {
  if (userId !== game.user.id) return;
  if (item.type !== "skill") return;
  const actor = item.actor;
  if (!actor || actor.type !== "character") return;
  try {
    await grantAutoClassFeatures(actor);
  } catch (err) {
    console.error(`SW25 | auto-class-features hook failed for "${actor.name}":`, err);
  }
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// v14: Foundry's classic "select" Handlebars BLOCK helper
// (`{{#select value}}<option value="x">X</option>...{{/select}}`) is no
// longer auto-registered by core in this build — only its newer sibling
// `selectOptions` still is. This threw `Missing helper: "select"` and
// silently aborted the ENTIRE sheet render (no window, no error visible
// anywhere else — see actor-sheet.mjs's _render() diagnostic wrapper,
// which is what finally surfaced this). Re-implementing it ourselves
// avoids having to rewrite every `{{#select}}` block across
// actor-character-sheet.hbs / item-action-sheet.hbs /
// item-monsterability-sheet.hbs (they're unchanged from the original
// sw25-fvtt templates). Behavior matches historical Foundry core: render
// the block's raw HTML (hand-written <option value="..."> tags), then
// mark whichever option(s) match the given value(s) as selected.
Handlebars.registerHelper("select", function (selected, options) {
  const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const values = Array.isArray(selected)
    ? selected.map(String)
    : [String(selected)];
  let html = options.fn(this);
  for (const value of values) {
    const rgx = new RegExp(` value=(["'])${escapeRegExp(value)}\\1`);
    html = html.replace(rgx, (match) => `${match} selected`);
  }
  return new Handlebars.SafeString(html);
});

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("isEven", function (num) {
  return num % 2 === 0;
});

// [Round 53] numeric <= comparison, used to show the death-check button
// only while system.hp.value <= 0.
Handlebars.registerHelper("lte", function (a, b) {
  return Number(a) <= Number(b);
});

Handlebars.registerHelper("growth", function (idx) {
  switch (idx) {
    case 0:
      return "⚀";
    case 1:
      return "⚁";
    case 2:
      return "⚂";
    case 3:
      return "⚃";
    case 4:
      return "⚄";
    case 5:
      return "⚅";
  }
});

Handlebars.registerHelper("localizeAbility", function (ability) {
  switch (ability) {
    case "dex":
      return game.i18n.localize("SW25.Ability.Technique");
    case "str":
      return game.i18n.localize("SW25.Ability.Body");
    case "int":
      return game.i18n.localize("SW25.Ability.Heart");
  }
});

Handlebars.registerHelper("localizeResist", function (resist) {
  switch (resist) {
    case "decide":
      return game.i18n.localize("SW25.Item.Decide");
    case "any":
      return game.i18n.localize("SW25.Item.Any");
    case "none":
      return game.i18n.localize("SW25.Item.None");
    case "disappear":
      return game.i18n.localize("SW25.Item.Disappear");
    case "halving":
      return game.i18n.localize("SW25.Item.Halving");
    case "shortening":
      return game.i18n.localize("SW25.Item.Shortening");
  }
  return "-";
});

Handlebars.registerHelper("localizeProp", function (prop) {
  switch (prop) {
    case "earth":
      return game.i18n.localize("SW25.Item.Earth");
    case "ice":
      return game.i18n.localize("SW25.Item.Ice");
    case "fire":
      return game.i18n.localize("SW25.Item.Fire");
    case "wind":
      return game.i18n.localize("SW25.Item.Wind");
    case "thunder":
      return game.i18n.localize("SW25.Item.Thunder");
    case "energy":
      return game.i18n.localize("SW25.Item.Energy");
    case "cut":
      return game.i18n.localize("SW25.Item.Cut");
    case "impact":
      return game.i18n.localize("SW25.Item.Impact");
    case "poison":
      return game.i18n.localize("SW25.Item.Poison");
    case "disease":
      return game.i18n.localize("SW25.Item.Disease");
    case "mental":
      return game.i18n.localize("SW25.Item.Mental");
    case "mentalw":
      return game.i18n.localize("SW25.Item.Mentalw");
    case "curse":
      return game.i18n.localize("SW25.Item.Curse");
    case "curseMental":
      return game.i18n.localize("SW25.Item.CurseMental");
    case "mentalPoison":
      return game.i18n.localize("SW25.Item.MentalPoison");
    case "other":
      return game.i18n.localize("SW25.Item.Other");
    case "fandw":
      return game.i18n.localize("SW25.Item.Fandw");
    case "iandt":
      return game.i18n.localize("SW25.Item.Iandt");
  }
  return "-";
});

Handlebars.registerHelper("localizeFairyProp", function (fairyprop) {
  switch (fairyprop) {
    case "fairyearth":
      return game.i18n.localize("SW25.Item.Spell.Fairyearth");
    case "fairyice":
      return game.i18n.localize("SW25.Item.Spell.Fairyice");
    case "fairyfire":
      return game.i18n.localize("SW25.Item.Spell.Fairyfire");
    case "fairywind":
      return game.i18n.localize("SW25.Item.Spell.Fairywind");
    case "fairylight":
      return game.i18n.localize("SW25.Item.Spell.Fairylight");
    case "fairydark":
      return game.i18n.localize("SW25.Item.Spell.Fairydark");
  }
  return "-";
});

Handlebars.registerHelper("localizePhasetype", function (phasetype) {
  switch (phasetype) {
    case "ten":
      return game.i18n.localize("SW25.Item.Phasearea.Ten");
    case "chi":
      return game.i18n.localize("SW25.Item.Phasearea.Chi");
    case "jin":
      return game.i18n.localize("SW25.Item.Phasearea.Jin");
  }
  return "-";
});

Handlebars.registerHelper("localizeStatus", function (ability) {
  switch (ability) {
    case "dex":
      return game.i18n.localize("SW25.Ability.Dex.long");
    case "agi":
      return game.i18n.localize("SW25.Ability.Agi.long");
    case "str":
      return game.i18n.localize("SW25.Ability.Str.long");
    case "vit":
      return game.i18n.localize("SW25.Ability.Vit.long");
    case "int":
      return game.i18n.localize("SW25.Ability.Int.long");
    case "mnd":
      return game.i18n.localize("SW25.Ability.Mnd.long");
  }
  return "-";
});

// [Round 75] Label of the resist button on a power card: dodge shows only
// "Уклонение" (the "negated/снимается" result is meaningless for dodge);
// English names from imported data are normalised via the stable key.
Handlebars.registerHelper("resistButtonLabel", function (resist) {
  if (!resist) return "";
  const key = resistKeyOf(resist);
  if (key === "Dodge") return game.i18n.localize("SW25.Resist.Check.Dodge");
  const name = ["Vitres", "Mndres"].includes(key)
    ? game.i18n.localize(`SW25.Resist.Check.${key}`)
    : resist.name ?? "";
  return resist.result
    ? `${name} / ${game.i18n.localize(`SW25.Resist.Result.${resist.result}`)}`
    : name;
});

Handlebars.registerHelper("localizeResistType", function (type, input) {
  switch (type) {
    case "Dodge":
      return game.i18n.localize("SW25.Resist.Check.Dodge");
    case "Vitres":
      return game.i18n.localize("SW25.Resist.Check.Vitres");
    case "Mndres":
      return game.i18n.localize("SW25.Resist.Check.Mndres");
    case "input":
      return input;
  }
  return "-";
});

Handlebars.registerHelper("localizeResourceType", function (type) {
  switch (type) {
    case "none":
      return game.i18n.localize("SW25.Item.Resource.Types.None");
    case "note":
      return game.i18n.localize("SW25.Item.Resource.Types.Note");
    case "material":
      return game.i18n.localize("SW25.Item.Resource.Types.Material");
    case "lifeline":
      return game.i18n.localize("SW25.Item.Resource.Types.Lifeline");
    case "tacspower":
      return game.i18n.localize("SW25.Item.Resource.Types.Tacspower");
    case "magitech":
      return game.i18n.localize("SW25.Item.Resource.Types.Magitech");
    case "abyssex":
      return game.i18n.localize("SW25.Item.Resource.Types.AbyssEx");
  }
  return "-";
});

Handlebars.registerHelper(
  "backgroundStyleFromMaterialcards",
  function (system) {
    const map = {
      green: "rgb(var(--material-green-color))",
      red: "rgb(var(--material-red-color))",
      gold: "rgb(var(--material-gold-color))",
      black: "rgb(var(--material-black-color))",
      white: "rgb(var(--material-white-color))",
    };

    const colors = Object.entries(map)
      .filter(([key]) => system[key])
      .map(([, color]) => color);

    if (colors.length === 1) {
      return `background-color: ${colors[0]};`;
    } else if (colors.length > 1) {
      return `background: linear-gradient(90deg, ${colors.join(",")});`;
    } else {
      return "";
    }
  }
);

Handlebars.registerHelper(
  "resistAttributes",
  function (type, resistinfo, hpresist, label) {
    const info = resistinfo || {};
    const resistHp = hpresist ?? false;

    let resist = "";
    let result = "";
    let key = "";

    if (info?.type) {
      if (info.type === "input") {
        resist = info.input ?? "";
        key = "input";
      } else {
        resist = game.i18n.localize(`SW25.Resist.Check.${info.type}`);
        key = info.type;
      }
    } else {
      if (type === "weapon") {
        resist = game.i18n.localize("SW25.Resist.Check.Dodge");
        key = "Dodge";
      } else if (type === "monsterability" && typeof label === "string" && isLabel(label, "MonHit")) {
        // [Round 72] a monster's Точность line is an attack: the target dodges
        resist = game.i18n.localize("SW25.Resist.Check.Dodge");
        key = "Dodge";
        if (!info.result) result = "disappear";
      } else if (type === "spell") {
        resist = resistHp
          ? game.i18n.localize("SW25.Resist.Check.Vitres")
          : game.i18n.localize("SW25.Resist.Check.Mndres");
        key = resistHp ? "Vitres" : "Mndres";
      }
    }

    if (info.result) {
      result = info.result;
    }

    let html = `data-resist="${resist}"`;
    if (key) html += ` data-resistkey="${key}"`;
    if (result) {
      html += ` data-resistresult="${result}"`;
    }

    return new Handlebars.SafeString(html);
  }
);

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));

  // Chat message button
  // [Round 66] Attack/check with a target and a resist -> the active GM
  // automatically rolls the resist for every non-PC target (monsters, NPCs).
  // PCs keep rolling their own evasion/saves with the card's button.
  Hooks.on("createChatMessage", async (message) => {
    try {
      if (!game.user.isGM || game.user !== game.users.activeGM) return;
      if (!game.settings.get("sw25", "autoResistNonPC")) return;
      const f = message.flags?.sw25;
      if (!f || f.kind !== "check" || !f.resist || !f.target?.length) return;
      if (f.resist.result === "decide") return; // cannot be resisted
      if (f.fumble == 1) return; // attacker's 1-1: fails, no resist roll
      const key = resistKeyOf(f.resist);
      if (!key || key === "input") return;
      const scene = game.scenes.get(message.speaker?.scene);
      const ids = f.target.filter((id) => {
        const td = canvas.tokens.get(id)?.document ?? scene?.tokens.get(id);
        return td?.actor && td.actor.type !== "character";
      });
      if (!ids.length) return;
      await chatButton(message, "buttonresist", { onlyTokens: ids });
    } catch (err) {
      console.error("SW25 | auto resist failed", err);
    }
  });

  // [Round 66] compact action cards: children are tagged, summarised on the
  // parent card and hidden from the log
  Hooks.on("preCreateChatMessage", (doc) => tagChildMessage(doc));
  Hooks.on("createChatMessage", async (message, options, userId) => {
    if (userId !== game.user.id) return;
    try {
      await summarizeChild(message);
    } catch (err) {
      console.error("SW25 | summary update failed", err);
    }
  });

  // [Round 90] v14 re-renders an updated card through renderChatMessageHTML: filter the GM-only parts there
  // too, otherwise a player saw the undo buttons and other actors' HP after the GM's roll updated the card
  document.body.classList.toggle("sw25-is-gm", game.user.isGM);
  Hooks.on("renderChatMessageHTML", (chatMessage, element) => {
    try {
      filterViewerOnly($(element));
    } catch (err) {
      console.error("SW25 | viewer filter failed", err);
    }
  });

  Hooks.on("renderChatMessage", (chatMessage, html, data) => {
    bindGrowthButtons(chatMessage, html);
    markContestButtons(chatMessage, html);
    filterViewerOnly(html);
    if (chatMessage.flags?.sw25?.parentId && game.settings.get("sw25", "compactCards")) {
      html.addClass("sw25-child-hidden");
    }
    html.find(".buttonclick").click(function () {
      const button = $(this);
      const buttonType = button.data("buttontype");
      chatButton(chatMessage, buttonType);
    });
    html.find(".flavor-text").on("click", async function (event) {
      event.preventDefault();
      const toggler = $(event.currentTarget);
      const message = toggler.closest(".chat-message");
      const description = message.find(".chat-tooltip");
      toggler.toggleClass("open", false);
      description.slideToggle();
    });
  });
  // Add listener to past message
  $(".chat-message .buttonclick").each((index, element) => {
    const messageId = $(element).closest(".message").attr("data-message-id");
    $(element).on("click", (event) => {
      const chatMessage = game.messages.get(messageId);
      const button = $(event.currentTarget);
      const buttonType = button.data("buttontype");
      chatButton(chatMessage, buttonType);
    });
  });
  $(".chat-message").each((index, element) => {
    const message = game.messages.get(element.dataset.messageId);
    if (message) bindGrowthButtons(message, $(element));
  });
  $(".chat-message .flavor-text").each((index, element) => {
    $(element).on("click", (event) => {
      const toggler = $(event.currentTarget);
      const message = toggler.closest(".chat-message");
      const description = message.find(".chat-tooltip");
      toggler.toggleClass("open", false);
      description.slideToggle();
    });
  });

  // Prepare reference data from journal or compendium
  const entryName = "Reference Data";

  async function findEntryInCompendium(entryName) {
    const packs = game.packs
      .filter((p) => p.documentClass.documentName === "JournalEntry")
      .sort((a, b) => a.metadata.label.localeCompare(b.metadata.label));
    for (const pack of packs) {
      const index = await pack.getIndex();
      const entryIndex = index.find((e) => e.name === entryName);
      if (entryIndex) {
        const compEntry = await pack.getDocument(entryIndex._id);
        return compEntry;
      }
    }
    return null;
  }

  // Power table: failure to find it must NOT abort the rest of `ready`
  // (socket, createActor defaults, equip hook were registered below and got
  // silently skipped by the early `return`s that used to live here).
// [Round 88] Built-in power rows (Power 0, 10, 20 … 100; rolls 3…12). The shipped
// «Reference Data» table is empty, so any attack/spell without its own pt3…pt12
// (class III techniques, user-made items) would deal 0. Only EMPTY rows are filled,
// a user's own «Reference Data» journal always wins.
const BUILTIN_POWER_ROWS = {
  0: [0, 0, 0, 1, 2, 2, 3, 3, 4, 4],
  10: [1, 1, 2, 3, 3, 4, 5, 5, 6, 7],
  20: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  30: [2, 4, 4, 6, 7, 8, 9, 10, 10, 10],
  40: [4, 5, 6, 7, 9, 10, 11, 11, 12, 13],
  50: [4, 6, 8, 10, 10, 12, 12, 13, 15, 15],
  60: [5, 9, 10, 11, 12, 13, 14, 15, 16, 18],
  70: [5, 9, 10, 12, 14, 16, 17, 18, 19, 19],
  80: [6, 9, 10, 13, 16, 18, 20, 21, 22, 23],
  90: [7, 10, 12, 15, 18, 19, 21, 23, 25, 26],
  100: [8, 12, 15, 18, 19, 20, 22, 24, 27, 30],
};
function applyBuiltinPowerRows() {
  for (const [pw, row] of Object.entries(BUILTIN_POWER_ROWS)) {
    const cur = rpt[pw];
    const empty = !Array.isArray(cur) || cur.length < 10 || cur.every((v) => !v || v === 99);
    if (empty) rpt[pw] = [...row];
  }
}

  async function loadReferencePowerTable() {
    let entry = game.journal.getName(entryName);
    if (!entry) {
      entry = await findEntryInCompendium(entryName);
    }
    if (!entry) { applyBuiltinPowerRows(); return false; }

    // Find power table journal
    const ptPageTitle = "Reference Power Table";
    let ptPage = entry.pages.contents.find((p) => p.name === ptPageTitle);
    if (!ptPage) {
      entry = await findEntryInCompendium(entryName);
      if (entry) {
        ptPage = entry.pages.contents.find((p) => p.name === ptPageTitle);
      }
    }
    if (!ptPage) { applyBuiltinPowerRows(); return false; }

    // Prepare reference power table
    const ptParser = new DOMParser();
    const ptHtmlString = ptPage.text.content;
    const ptDoc = ptParser.parseFromString(ptHtmlString, "text/html");
    const ptDivs = ptDoc.querySelectorAll("div.pt-item");
    let power = "";

    ptDivs.forEach((div, index) => {
      const ptText = div.querySelector("p").textContent;
      const ptValue = Number(ptText);

      if (index % 11 === 0) {
        power = ptText;
        rpt[power] = [];
      } else {
        rpt[power].push(ptValue);
      }
    });

    applyBuiltinPowerRows();
    return true;
  }
  try {
    const loaded = await loadReferencePowerTable();
    if (!loaded)
      console.info('SW25 | no "Reference Data" journal: using the built-in power table.');
  } catch (err) {
    console.error("SW25 | failed to load reference power table", err);
  }

  // Player -> GM requests (see helpers/socket.mjs)
  registerSocketHandler();

  // preCreateActor hook
  Hooks.on("preCreateActor", (actor, options, userId) => {
    // Set default token
    let displayName,
      actorLink,
      appendNumber,
      prependAdjective,
      disposition,
      displayBars;
    /*
    let displayName = 0;
    let actorLink = false;
    let appendNumber = false;
    let prependAdjective = false;
    let disposition = 0;
    let displayBars = 0;
    */
    switch (actor.type) {
      case "character":
        displayName = 50;
        actorLink = true;
        appendNumber = false;
        prependAdjective = false;
        disposition = 1;
        displayBars = 50;
        break;
      case "npc":
        displayName = 30;
        actorLink = true;
        appendNumber = false;
        prependAdjective = false;
        disposition = 0;
        displayBars = 0;
        break;
      case "monster":
        //displayName = 30;
        actorLink = false;
        //appendNumber = true;
        //prependAdjective = true;
        //disposition = -1;
        //displayBars = 40;
        break;
      default:
      /*
        displayName = 0;
        actorLink = false;
        appendNumber = false;
        prependAdjective = false;
        disposition = 0;
        displayBars = 0;
      */
    }
    // [2026-10-07] a brand-new character made inside a folder still has Foundry's blank
    // token (unlinked, hostile): that is "nothing chosen", not a choice to keep —
    // otherwise PCs created in a folder are enemies to each other and lose edits on tokens
    const blankPc = ["character", "npc"].includes(actor.type) &&
      !(actor._stats?.compendiumSource || options._stats?.compendiumSource) &&
      actor.prototypeToken.actorLink === false && actor.prototypeToken.disposition === -1;
    if (
      !blankPc && (
      actor._stats?.compendiumSource ||
      options._stats?.compendiumSource ||
      actor.folder ||
      options.folder)
    ) {
      displayName = actor.prototypeToken.hasOwnProperty("displayName")
        ? actor.prototypeToken.displayName
        : displayName;
      actorLink = actor.prototypeToken.hasOwnProperty("actorLink")
        ? actor.prototypeToken.actorLink
        : actorLink;
      appendNumber = actor.prototypeToken.hasOwnProperty("appendNumber")
        ? actor.prototypeToken.appendNumber
        : appendNumber;
      prependAdjective = actor.prototypeToken.hasOwnProperty("prependAdjective")
        ? actor.prototypeToken.prependAdjective
        : prependAdjective;
      disposition = actor.prototypeToken.hasOwnProperty("disposition")
        ? actor.prototypeToken.disposition
        : disposition;
      displayBars = actor.prototypeToken.hasOwnProperty("displayBars")
        ? actor.prototypeToken.displayBars
        : displayBars;
    }

    // Update actor
    // v14: guard this too — if updateSource ever throws here, preCreateActor
    // returning false-ish/throwing can abort actor creation entirely
    // (unlike createActor/prepareData failures, which happen after the
    // actor already exists), so this is the one spot in the creation flow
    // where an uncaught error really could mean "no actor gets created".
    try {
      actor.updateSource({
        "prototypeToken.displayName": displayName,
        "prototypeToken.actorLink": actorLink,
        "prototypeToken.appendNumber": appendNumber,
        "prototypeToken.prependAdjective": prependAdjective,
        "prototypeToken.disposition": disposition,
        "prototypeToken.displayBars": displayBars,
      });
    } catch (err) {
      console.error(
        `SW25 | preCreateActor hook: failed to set default prototypeToken fields for a new "${actor.type}" actor — continuing with Foundry's own defaults:`,
        err
      );
    }
  });

  // createActor hook
  Hooks.on("createActor", async (actor, options, userId) => {
    if (!game.user.isGM) return;

    // multiple GM treatment
    const isActiveGM =
      game.user.isGM && game.user.id === game.users.activeGM?.id;
    if (!isActiveGM) return;

    // Default item data
    let itemData = [];
    let resvit = false;
    let resmnd = false;
    let init = false;
    let mknow = false;
    let monres = false;
    let monwp = false;
    if (actor.type == "character") {
      actor.items.forEach((item) => {
        // [2026-10-07] the names the rest of the system looks for come from the world
        // settings; a GM client in another language used to create checks nobody found
        const is = (key, setting) => item.name == game.i18n.localize(key) || item.name == setting;
        if (is("SW25.Config.ResVit", effectVitResPC)) resvit = true;
        if (is("SW25.Config.ResMnd", effectMndResPC)) resmnd = true;
        if (is("SW25.Config.Init", effectInitPC)) init = true;
        if (is("SW25.Config.MKnow", effectMKnowPC)) mknow = true;
      });
      if (!resvit) {
        itemData.push({
          name: effectVitResPC || game.i18n.localize("SW25.Config.ResVit"),
          type: "check",
          system: {
            description: "",
            checkskill: "adv",
            checkabi: "vit",
            showbtcheck: true,
          },
        });
      }
      if (!resmnd) {
        itemData.push({
          name: effectMndResPC || game.i18n.localize("SW25.Config.ResMnd"),
          type: "check",
          system: {
            description: "",
            checkskill: "adv",
            checkabi: "mnd",
            showbtcheck: true,
          },
        });
      }
      if (!init) {
        itemData.push({
          name: effectInitPC || game.i18n.localize("SW25.Config.Init"),
          type: "check",
          system: {
            description: "",
            // [Round 71] book I p.104: Scout level + Agility bonus
            checkskill: findClassItem(actor, "scout")?.name ?? className("scout"),
            checkabi: "agi",
            showbtcheck: true,
          },
        });
      }
      if (!mknow) {
        itemData.push({
          name: effectMKnowPC || game.i18n.localize("SW25.Config.MKnow"),
          type: "check",
          system: {
            description: "",
            // [Round 71] Sage level + Int bonus (Rider too, book III)
            checkskill: L2("Мудрец или Всадник", "Sage or Rider"),
            checkabi: "int",
            showbtcheck: true,
          },
        });
      }
    }
    if (actor.type == "monster") {
      actor.items.forEach((item) => {
        if (item.name == game.i18n.localize("SW25.Config.MonRes"))
          monres = true;
        if (
          item.system.label1 == game.i18n.localize("SW25.Config.MonHit") &&
          item.system.label2 == game.i18n.localize("SW25.Config.MonDmg") &&
          item.system.label3 == game.i18n.localize("SW25.Config.MonDge")
        )
          monwp = true;
      });
      if (!monres) {
        itemData.push({
          name: game.i18n.localize("SW25.Config.MonRes"),
          type: "monsterability",
          system: {
            description: "",
            usedice1: true,
            label1: game.i18n.localize("SW25.Config.MonResVit"),
            usefix1: true,
            applycheck1: "-",
            usedice2: true,
            label2: game.i18n.localize("SW25.Config.MonResMnd"),
            usefix2: true,
            applycheck2: "-",
          },
        });
      }
      if (!monwp) {
        itemData.push({
          name: game.i18n.localize("SW25.Config.MonWp"),
          type: "monsterability",
          system: {
            description: "",
            usedice1: true,
            label1: game.i18n.localize("SW25.Config.MonHit"),
            usefix1: true,
            applycheck1: "-",
            usedice2: true,
            label2: game.i18n.localize("SW25.Config.MonDmg"),
            usefix2: false,
            applycheck2: "on",
            usedice3: true,
            label3: game.i18n.localize("SW25.Config.MonDge"),
            usefix3: true,
            applycheck3: "-",
          },
        });
      }
    }

    // Set default item
    // v14: guard against this call throwing (e.g. if it re-enters the
    // still-unstable v14 Active Effects "phase" pipeline via the new
    // items' own prepareData()). Left unguarded, an exception here means
    // the default "check"/"monsterability" items silently never get
    // added to a brand-new actor and this hook aborts with an unhandled
    // promise rejection — which can look, from the sheet, like actor
    // creation "didn't work" even though the actor document itself exists.
    try {
      let item = await Item.create(itemData, { parent: actor });
    } catch (err) {
      console.error(
        `SW25 | createActor hook: failed to add default items to actor "${actor.name}" (id ${actor.id}):`,
        err
      );
    }
  });

  // Custom chat command
  let customCommandModule = "_chatcommands";
  let chatcommands =
    game.modules.has(customCommandModule) &&
    game.modules.get(customCommandModule).active;
  if (chatcommands) {
    console.log("Enable custom chat commands");
    game.chatCommands.register({
      name: "/powerroll",
      aliases: [
        "/powroll",
        "/powr",
        "/rollpower",
        "/rollpow",
        "/rpow",
        "/rp",
        "/pow",
      ],
      module: "_chatcommands",
      description: "Roll power table.",
      icon: "<i class='fas fa-dice-d6'></i>",
      callback: async (chat, parameters, messageData) => {
        let command = "/powerroll";
        await customCommand(command, messageData, parameters);
        return;
      },
    });
  } else {
    console.log("Disable custom chat commands");
  }

  // (upstream equip<->effect GM hook removed in Round 66: duplicated the
  //  syncEquipEffects hooks above and also toggled non-transfer effects)

  // Load language from Compendium for Polyglot
  let polyglotmodule = "polyglot";
  let polyglot =
    game.modules.has(polyglotmodule) && game.modules.get(polyglotmodule).active;
  if (polyglot) {
    let fromCompendium = game.settings.get("sw25", "fromCompendium");
    if (fromCompendium) {
      await game.polyglot.languageProvider.getLanguages(fromCompendium);
    }
  }
});

// SceneControl Hook
Hooks.on("getSceneControlButtons", function (controls) {
  const rollRequestBtn = {
    name: "rollRequest(Skill)",
    title: game.i18n.localize("SETTING.rollRequest"),
    icon: "fas fa-dice-d6",
    visible: game.user.isGM,
    onClick: () => {
      rollreq();
    },
    button: true,
  };
  // [Round 74] end of session rewards (GM)
  const sessionBtn = {
    name: "sw25SessionEnd",
    title: game.i18n.localize("SW25.Session.Title"),
    icon: "fas fa-scroll",
    visible: game.user.isGM,
    onClick: () => sessionEnd(),
    button: true,
  };
  const isV13Plus = foundry.utils.isNewerVersion(game.version, "13");
  // v13 or newer
  if (isV13Plus) {
    if (!controls.tokens.tools) controls.tokens.tools = {};
    controls.tokens.tools[rollRequestBtn.name] = rollRequestBtn;
    controls.tokens.tools[sessionBtn.name] = sessionBtn;
  }
  // v12 or older
  else {
    if (controls[0] && controls[0].tools) {
      const existingButton = controls[0].tools.find(
        (tool) => tool.name === rollRequestBtn.name
      );
      if (!existingButton) {
        controls[0].tools.push(rollRequestBtn);
      }
    }
  }
});

// textarea edit hook
Hooks.on("renderSW25ActorSheet", (app, html, data) => {
  html.find(".textarea-editor").on("blur", async (event) => {
    const textarea = $(event.currentTarget);
    const path = "system." + textarea.data("path");
    const displaypath = "system.display" + textarea.data("path");
    const content = textarea.val();
    const displaycontent = content.replace(/\n/g, "<br>");
    const updateData = {};
    updateData[path] = content;
    updateData[displaypath] = displaycontent;
    await app.object.update(updateData);
  });
});
Hooks.on("renderSW25ItemSheet", (app, html, data) => {
  html.find(".textarea-editor").on("blur", async (event) => {
    const textarea = $(event.currentTarget);
    const path = "system." + textarea.data("path");
    const displaypath = "system.display" + textarea.data("path");
    const content = textarea.val();
    const displaycontent = content.replace(/\n/g, "<br>");
    const updateData = {};
    updateData[path] = content;
    updateData[displaypath] = displaycontent;
    await app.object.update(updateData);
  });
});

// Polyglot support
Hooks.once("polyglot.init", (LanguageProvider) => {
  const SW25LanguageProvider = preparePolyglot(LanguageProvider);
  game.polyglot.api.registerSystem(SW25LanguageProvider);
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.sw25.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "sw25.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
