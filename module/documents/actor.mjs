import { effectInitPC, effectVitResPC, effectMndResPC, effectMKnowPC } from "../sw25.mjs";
import { PT } from "../helpers/powerroll.mjs";
import { effectHitMon, effectDmgMon, effectDodgeMon, rpt } from "../sw25.mjs";
import { isClass, isItem } from "../helpers/names.mjs";
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
/** Effect values the actor's own passes add to items; hidden from the second item preparation. */
const REPREP_MASK = [
  "attributes.efhitmod", "attributes.efdmod", "attributes.efdodgemod",
  "effect.allck", "effect.init", "effect.mknow", "effect.vitres", "effect.mndres",
];

export class SW25Actor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /**
   * @override
   * v14 workaround: Foundry core's own Active Effect application
   * (`applyActiveEffects(phase)`) currently throws — "Cannot set
   * properties of undefined (setting 'initial'/'final')" on the first
   * call for either phase, and "ActiveEffect application phase ... has
   * already completed" on later calls in the same or a later cycle —
   * even for brand-new actors with zero effects. Core now calls this
   * TWICE per prepareData() cycle (phase "initial" from inside
   * prepareEmbeddedDocuments(), phase "final" directly at the end of
   * prepareData() itself), so guarding just prepareEmbeddedDocuments()
   * was not enough; overriding applyActiveEffects() itself catches both
   * call sites regardless of who calls it. This looks like a genuine
   * v14 core regression in the new phase-based AE application (Foundry's
   * own changelogs show several "phase" bugfixes landing across
   * 14.349-14.365 — worth checking you're on the latest v14 build).
   * Left unguarded, the exception aborts prepareData() before it ever
   * reaches prepareDerivedData() — which is why HP/MP/abilities/items on
   * the sheet looked completely empty. Catch it here so the rest of data
   * preparation still runs; Active Effects (buffs/debuffs from items)
   * may not apply correctly until Foundry fixes the underlying bug, but
   * the character sheet itself works.
   */
  applyActiveEffects(phase) {
    try {
      return super.applyActiveEffects(phase);
    } catch (err) {
      console.error(
        `SW25 | applyActiveEffects("${phase}") failed (likely a Foundry v14 core bug, see actor.mjs) — skipping this phase for this cycle:`,
        err
      );
    }
  }

  /** @override */
  prepareBaseData() {
    // v14: THIS is very likely the actual root cause of the
    // applyActiveEffects("initial"/"final") crash guarded against below —
    // not a core v14 bug. This override used to do nothing (standard
    // Foundry boilerplate: "data modifications in this step occur before
    // processing embedded documents"), and — critically — never called
    // `super.prepareBaseData()`. In older Foundry versions Document's own
    // base prepareBaseData() was also a no-op, so skipping it was
    // harmless. In v14, core now appears to use this step (or the
    // reset()/_initialize() sequence around it) to set up the per-phase
    // Active Effect application tracking state that applyActiveEffects()
    // later writes to (`this.<something>[phase] = ...`). Skip the super
    // call, and that tracking object is never created — which explains
    // why applyActiveEffects() fails immediately and unconditionally for
    // literally every actor, even a brand-new one with zero effects and
    // zero items. Restoring the super call should fix this at the root,
    // making Active Effects (buffs/debuffs) actually work again instead
    // of just silently no-op'ing every cycle. The catch in
    // applyActiveEffects() below is left in place as a safety net in case
    // this isn't the *whole* story.
    super.prepareBaseData();
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags || {};

    this._reprepareItems();

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
    this._prepareMonsterData(actorData);
  }
  /**
   * [Round 96] Foundry prepares the owned items BEFORE the actor's active effects are applied,
   * so everything Item#prepareDerivedData reads from `actor.system.effect.*` /
   * `actor.system.attributes.ef*` was still empty: check-package bonuses, the critical value
   * shift, MP discounts and several class-wide modifiers silently did nothing.
   * The items are prepared once more here, now that the effects are in place. Values that the
   * actor's own passes below already add to the items (REPREP_MASK) are hidden for that second
   * run, otherwise they would be counted twice.
   */
  _reprepareItems() {
    if (globalThis.SW25_NO_REPREP || !this.items?.size) return;
    const sys = this.system;
    const saved = [];
    try {
      for (const path of REPREP_MASK.concat(globalThis.SW25_REPREP_EXTRA_MASK ?? [])) {
        if (!foundry.utils.hasProperty(sys, path)) continue;
        const v = foundry.utils.getProperty(sys, path);
        if (!v) continue;
        saved.push([path, v]);
        foundry.utils.setProperty(sys, path, typeof v === "number" ? 0 : "");
      }
      for (const item of this.items) item.reset();
    } catch (err) {
      console.error(`SW25 | _reprepareItems failed for "${this.name}":`, err);
    } finally {
      for (const [path, v] of saved) foundry.utils.setProperty(sys, path, v);
    }
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== "character") return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    // v14: this method used to be `async` and start with `await
    // this.update({})` (later `await Promise.resolve()`), which deferred
    // EVERYTHING below to a microtask running AFTER prepareDerivedData()
    // (and therefore prepareData()) had already returned control — because
    // prepareDerivedData() calls this fire-and-forget, without `await`.
    // That deferral raced against whatever synchronous code called
    // prepareData() next, most often a sheet render's getData() reading
    // `actor.system` immediately. The race was lost more often than not,
    // which is exactly why ability.mod/hp.max/dodgebase/etc. showed up as
    // their raw, uncalculated template.json defaults (e.g. "") on the
    // sheet, and why roll formulas built from those values came out
    // malformed (missing/blank modifiers). Nothing below needs to be
    // async — items/effects are already fully prepared by the time
    // prepareDerivedData() runs — so this now runs synchronously and is
    // guaranteed correct before any render can read it.
    //
    // Wrap the computation in try/catch anyway so an unrelated bug below
    // can never crash the whole prepareData() cycle for this actor.
    try {

    //Calcurate Exp & AdvLevel & MgLevel
    this.items.forEach((item) => {
      if (item.type == "skill") {
        // Exp
        systemData.attributes.useexp += item.system.skillexp;
        // AdvLevel & MgLevel
        if (item.system.skilltype == "fighterskill") {
          if (item.system.skilllevel > systemData.attributes.advlevel.value)
            systemData.attributes.advlevel.value = item.system.skilllevel;
        }
        if (item.system.skilltype == "magicuserskill") {
          if (item.system.skilllevel > systemData.attributes.advlevel.value) {
            systemData.attributes.advlevel.value = item.system.skilllevel;
          }
          systemData.attributes.mglevel.value =
            Number(systemData.attributes.mglevel.value) +
            Number(item.system.skilllevel);
        }
        if (item.system.skilltype == "otherskill") {
          if (item.system.skilllevel > systemData.attributes.advlevel.value)
            systemData.attributes.advlevel.value = item.system.skilllevel;
        }
      }
    });

    // [Round 72] defaults for a fresh character: nothing picked on the sheet
    // yet -> take what follows from the classes (the sheet can override).
    {
      const skills = this.items.filter((i) => i.type === "skill" && Number(i.system.skilllevel) > 0);
      const own = (key) => skills.find((i) => isClass(i.name, key))?.name;
      const unset = (v) => !v || v === "-";
      // class keys (names.mjs): the actor's own item name is used, whatever its language
      const MAGIC = { scskill: "sorcerer", cnskill: "conjurer", prskill: "priest", mtskill: "magitech", frskill: "fairytamer", drskill: "druid", dmskill: "daemonruler" };
      for (const [k, key] of Object.entries(MAGIC)) { const n = own(key); if (unset(systemData[k]) && n) systemData[k] = n; }
      if (unset(systemData.dodgeskill)) {
        const f = skills.filter((i) => isClass(i.name, "fighter", "grappler", "fencer"))
          .sort((a, b) => Number(b.system.skilllevel) - Number(a.system.skilllevel))[0];
        if (f) systemData.dodgeskill = f.name;
      }
      if (unset(systemData.hitweapon)) {
        const w = this.items.find((i) => i.type === "weapon" && i.system.equip);
        if (w) systemData.hitweapon = w.name;
      }
    }

    // Calculate Skill check & Action check
    if (systemData.effect?.allsc) systemData.efallscmod = Number(systemData.effect.allsc);
    else systemData.efallscmod = 0;

    if (systemData.effect?.allac) systemData.efallacmod = Number(systemData.effect.allac);
    else systemData.efallacmod = 0;

    // Calculate the abilities & modifier
    systemData.abilities.agi.racevalue = systemData.abilities.dex.racevalue;
    systemData.abilities.vit.racevalue = systemData.abilities.str.racevalue;
    systemData.abilities.mnd.racevalue = systemData.abilities.int.racevalue;
    if (!systemData.effect) systemData.efallskadvmod = 0;
    else if (systemData.effect.allsk)
      systemData.efallskadvmod = Number(systemData.effect.allsk);
    else systemData.efallskadvmod = 0;

    for (let [key, ability] of Object.entries(systemData.abilities)) {
      ability.value =
        Number(ability.racevalue) +
        Number(ability.valuebase) +
        Number(ability.valuegrowth) +
        Number(ability.valuemodify) +
        Number(ability.efvaluemodify);
      ability.mod = Math.floor(ability.value / 6) + Number(ability.efmodify);
      ability.advbase =
        Number(ability.mod) +
        Number(systemData.attributes.advlevel.value) +
        Number(systemData.attributes.advlevel.mod) +
        Number(systemData.efallskadvmod) + 
        Number(systemData.efallscmod) + 
        Number(systemData.efallacmod);
    }

    //Calculate HP & MP & Move
    systemData.hp.max =
      Number(systemData.abilities.vit.value) +
      Number(systemData.attributes.advlevel.value) * 3 +
      Number(systemData.hp.hpmod) +
      Number(systemData.hp.efhpmod);
    systemData.mp.max =
      Number(systemData.abilities.mnd.value) +
      Number(systemData.attributes.mglevel.value) * 3 +
      Number(systemData.mp.mpmod) +
      Number(systemData.mp.efmpmod);
    systemData.attributes.move.limited = 3;
    systemData.armorDedicated = this.items.some(item =>
      item.type === "armor" &&
      item.system.equip === true &&
      item.system.dedicated === true &&
      (item.system.category === "nonmetalarmor" || item.system.category === "metalarmor")
    );
    systemData.attributes.move.normal =
      Number(systemData.abilities.agi.value) +
      Number(systemData.attributes.move.movemod) +
      Number(systemData.attributes.move.efmovemod) +
      (systemData.armorDedicated ? 2 : 0);
    systemData.attributes.move.max =
      Number(systemData.attributes.move.normal) * 3;
    if (systemData.attributes.move.normal < 3) {
      systemData.attributes.move.limited = Number(
        systemData.attributes.move.normal
      );
    }
    // [Round 72] a new character starts at full HP/MP (value was "")
    if (systemData.hp.value === "" || systemData.hp.value === null || systemData.hp.value === undefined) systemData.hp.value = systemData.hp.max;
    if (systemData.mp.value === "" || systemData.mp.value === null || systemData.mp.value === undefined) systemData.mp.value = systemData.mp.max;
    if(systemData.hp.max < systemData.hp.value){
      systemData.hp.value = systemData.hp.max;
    }
    if(systemData.mp.max < systemData.mp.value){
      systemData.mp.value = systemData.mp.max;
    }

    //Calculate Battle Data
    this.items.forEach((item) => {
      if (item.type == "weapon") {
        if (item.name == systemData.hitweapon) {
          systemData.itemname = item.name;
          systemData.itemhitformula = item.system.checkformula;
          systemData.itemhitbase = item.system.checkbase;
          systemData.itempowerformula = item.system.powerformula;
          systemData.itempower = item.system.power;
          systemData.itemapplycheck = item.system.applycheck;
          systemData.itemchecktype = item.system.checkTypesButton;
          systemData.itemapplypower = item.system.applypower;
          systemData.itempowertype = item.system.powerTypesButton;
          if (item.system.autouseres) {
            systemData.resuse = item.system.resuse;
            systemData.resusequantity = item.system.resusequantity;
          }
          if (item.system.cvalue == null || item.system.cvalue == 0)
            item.system.cvalue = 10;
          if (!systemData.effect) systemData.efcmod = 0;
          else if (systemData.effect.efcvalue)
            systemData.efcmod = Number(systemData.effect.efcvalue);
          else systemData.efcmod = 0;
          systemData.itemcvalue =
            Number(item.system.cvalue) + Number(systemData.efcmod);
          systemData.itempowerbase = item.system.powerbase;
          if (item.system.halfpowmod)
            systemData.itempowerbase += item.system.halfpowmod;
          if (systemData.attributes.efwphalfmod)
            systemData.itempowerbase += systemData.attributes.efwphalfmod;
          systemData.itempowertable = item.system.powertable;
          systemData.itempowertable[PT.LETHALTECH] += systemData.lt;
          systemData.itempowertable[PT.LETHALTECH] += Number(systemData?.attributes?.ltmod) || 0;
          if (!/^f\d+$/.test(systemData.itempowertable[PT.CRITICALRAY])) {
            systemData.itempowertable[PT.CRITICALRAY] =
              Number(systemData.itempowertable[PT.CRITICALRAY]) + systemData.cr
            systemData.itempowertable[PT.CRITICALRAY] += Number(systemData?.attributes?.crmod) || 0;
          }
          systemData.itemid = item.id;
        }
      }
    });

    systemData.itemdodge = 0;
    systemData.itempp = 0;
    systemData.barepp = 0;
    systemData.itemmpp = 0;
    systemData.barempp = 0;
    systemData.baredreduce = 0;
    systemData.skillagidodge = 0;
    systemData.shieldDedicated = this.items.some(item =>
      item.type === "armor" &&
      item.system.equip === true &&
      item.system.dedicated === true &&
      item.system.category === "shield"
    );
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.dodgeskill) {
          const dodgeAgimod = Math.floor(
            (Number(systemData.abilities.dex.racevalue) +
              Number(systemData.abilities.agi.valuebase) +
              Number(systemData.abilities.agi.valuegrowth) +
              Number(systemData.abilities.agi.valuemodify) +
              Number(systemData.abilities.agi.efvaluemodify) +
              (systemData.shieldDedicated ? 2 : 0)) /
              6 +
              Number(systemData.abilities.agi.efmodify)
          );
          systemData.skillagidodge = Number(item.system.skilllevel) +
            Number(dodgeAgimod) +
            Number(item.system.skillmod);
        }
      }
    });
    this.items.forEach((item) => {
      if (item.type == "armor") {
        if (item.system.equip == true) {
          systemData.itemdodge += Number(item.system.dodge);
          systemData.itempp += Number(item.system.pp);
          systemData.itemmpp += Number(item.system.mpp);
        }
      }
    });
    systemData.dodgebase =
      Number(systemData.skillagidodge) +
      Number(systemData.itemdodge) +
      Number(systemData.attributes.dodgemod) +
      Number(systemData.attributes.efdodgemod) +
      (Number(systemData.effect?.allsc) || 0) +
      (Number(systemData.effect?.allac) || 0);
    systemData.attributes.protectionpoint =
      Number(systemData.itempp) +
      Number(systemData.attributes.ppmod) +
      Number(systemData.attributes.efppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);
    systemData.barepp =
      Number(systemData.itempp) +
      Number(systemData.attributes.ppmod) +
      Number(systemData.attributes.efppmod);
    systemData.attributes.magicprotection =
      Number(systemData.itemmpp) +
      Number(systemData.attributes.mppmod) +
      Number(systemData.attributes.efmppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);
    systemData.barempp =
      Number(systemData.itemmpp) +
      Number(systemData.attributes.mppmod) +
      Number(systemData.attributes.efmppmod);
    systemData.baredreduce =
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);

    //Calculate Spell Data
    if (!systemData.effect) systemData.efallmgpacmod = 0;
    else if (systemData.effect.allmgp)
      systemData.efallmgpacmod = Number(systemData.effect.allmgp);
    else systemData.efallmgpacmod = 0;

    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.scskill) {
          systemData.scbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.scpower =
      Number(systemData.scbase) +
      Number(systemData.attributes.scmod) +
      Number(systemData.attributes.efscmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.sccast =
      Number(systemData.attributes.scpower) +
      Number(systemData.attributes.efscckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.cnskill) {
          systemData.cnbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.cnpower =
      Number(systemData.cnbase) +
      Number(systemData.attributes.cnmod) +
      Number(systemData.attributes.efcnmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.cncast =
      Number(systemData.attributes.cnpower) +
      Number(systemData.attributes.efcnckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.wzskill) {
          systemData.wzbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.wzpower =
      Number(systemData.wzbase) +
      Number(systemData.attributes.wzmod) +
      Number(systemData.attributes.efwzmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.wzcast =
      Number(systemData.attributes.wzpower) +
      Number(systemData.attributes.efwzckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.prskill) {
          systemData.prbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.prpower =
      Number(systemData.prbase) +
      Number(systemData.attributes.prmod) +
      Number(systemData.attributes.efprmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.prcast =
      Number(systemData.attributes.prpower) +
      Number(systemData.attributes.efprckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.mtskill) {
          systemData.mtbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.mtpower =
      Number(systemData.mtbase) +
      Number(systemData.attributes.mtmod) +
      Number(systemData.attributes.efmtmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.mtcast =
      Number(systemData.attributes.mtpower) +
      Number(systemData.attributes.efmtckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.frskill) {
          systemData.frbase = item.system.skillbase.invoke;
          let skillLevel = item.system.skilllevel ? item.system.skilllevel : 0;

          let fairyCount = 0;
          if(systemData.attributes.fairy?.earth){
            fairyCount++;
          }
          if(systemData.attributes.fairy?.water){
            fairyCount++;
          }
          if(systemData.attributes.fairy?.fire){
            fairyCount++;
          }
          if(systemData.attributes.fairy?.wind){
            fairyCount++;
          }
          if(systemData.attributes.fairy?.light){
            fairyCount++;
          }
          if(systemData.attributes.fairy?.dark){
            fairyCount++;
          }

          const fairyRank = [0,1,2,4,5,6,8,9,10,12,13,14,15,15,15,15];
          const fairyAllRank = [0,0,0,2,3,4,4,5,6,6,7,8,8,9,10,10];
          const fairyExRank = [0,0,0,1,1,1,2,2,2,3,3,3,4,4,4,5];

          let fairyUseRank = "";
          if(fairyCount < 4) {
            fairyUseRank = fairyRank[skillLevel];
          } else if (fairyCount == 4){
            fairyUseRank = skillLevel;
          } else if (fairyCount == 5){
            fairyUseRank = fairyAllRank[skillLevel];
          } else {
            fairyUseRank = `${fairyAllRank[skillLevel]}/${fairyExRank[skillLevel]}`;
          }
          systemData.frRank = fairyUseRank;
        }
      }
    });
    systemData.attributes.frpower =
      Number(systemData.frbase) +
      Number(systemData.attributes.frmod) +
      Number(systemData.attributes.effrmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.frcast =
      Number(systemData.attributes.frpower) +
      Number(systemData.attributes.effrckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.drskill) {
          systemData.drbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.drpower =
      Number(systemData.drbase) +
      Number(systemData.attributes.drmod) +
      Number(systemData.attributes.efdrmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.drcast =
      Number(systemData.attributes.drpower) +
      Number(systemData.attributes.efdrckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.dmskill) {
          systemData.dmbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.dmpower =
      Number(systemData.dmbase) +
      Number(systemData.attributes.dmmod) +
      Number(systemData.attributes.efdmmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.dmcast =
      Number(systemData.attributes.dmpower) +
      Number(systemData.attributes.efdmckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.abskill) {
          systemData.abbase = item.system.skillbase.invoke;
        }
      }
    });
    systemData.attributes.abpower =
      Number(systemData.abbase) +
      Number(systemData.attributes.abmod) +
      Number(systemData.attributes.efabmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.abcast =
      Number(systemData.attributes.abpower) +
      Number(systemData.attributes.efabckmod) +
      Number(systemData.attributes.efmckall);
    this.items.forEach((item) => {
      if (item.type == "skill") {
        if (item.name == systemData.bmskill) {
          systemData.bmbase = item.system.skillbase.invoke;
          systemData.bmlv = item.system.skilllevel;
        }
      }
    });
    // SW25-RU fix (раунд 23.1): было `Number(x) ?? 0 + Number(y) ?? 0 + ...`
    // — `??` слабее `+`, и несколько `??` подряд без скобок схлопывают всё
    // выражение в "первое не-nullish значение", т.е. фактически в один
    // Number(bmbase) — bmmod/efbmmod/efallmgpacmod/efbmckmod/efmckall НЕ
    // прибавлялись к Мощи магии Библиомантии вообще никогда. Тот же класс
    // опечатки, что был найден в item.mjs (см. комментарий там же), только
    // здесь — на уровне актёра. Исправлено обычным сложением.
    systemData.attributes.bmpower =
      Number(systemData.bmbase) +
      Number(systemData.attributes.bmmod) +
      Number(systemData.attributes.efbmmod) +
      Number(systemData.efallmgpacmod);
    systemData.attributes.bmcast =
      Number(systemData.attributes.bmpower) +
      Number(systemData.attributes.efbmckmod) +
      Number(systemData.attributes.efmckall);

    systemData.attributes.bibRankMax = [0,0,0,0,0,0];
    if(systemData.bmlv){
      let remain = Math.max(0, systemData.bmlv);

      for (let rank = 1; rank <= 5; rank++) {
        if (remain <= 0) break;

        const add = Math.min(3, remain);
        systemData.attributes.bibRankMax[rank] = add;
        remain -= add;
      }
    }

    systemData.attributes.bibRankEquip = [0,0,0,0,0,0];
    const bmItems = actorData.items.filter(i =>
      i.system?.type === "bibliomancer" &&
      i.system?.equip === true &&
      Number.isInteger(i.system?.level) &&
      i.system.level >= 1 &&
      i.system.level <= 5
    );

    for (const item of bmItems) {
      systemData.attributes.bibRankEquip[item.system.level]++;
    }

    // Calculate active effect
    // SW25-RU fix (round 42): actorData.effects already includes any
    // transfer:true item-owned effects (native Foundry v11+ behavior) and
    // correctly excludes transfer:false ones (selfbuff/technique template
    // effects that only apply once the player toggles them onto the actor
    // as their own ActiveEffect). The old code below re-added EVERY owned
    // item's effects unconditionally, double-counting transfer:true ones
    // and showing transfer:false template effects (e.g. Мощный удар I) as
    // already active before they were ever toggled on.
    // [Round 66] actor.effects does NOT contain item effects here
    // (CONFIG.ActiveEffect.legacyTransferral = false), so equipment bonuses
    // (e.g. +1 Воля from a ring) were missing from this panel. Use every
    // effect that actually applies to the actor: own + transfer:true item
    // effects (transfer:false templates are still excluded by Foundry).
    let allEffects = Array.from(this.allApplicableEffects());

    let modParams = this._getModParams(allEffects);

    for (let [key, entry] of Object.entries(modParams)) {
      if (typeof entry.value === "number") {
        if (entry.value > 0) {
          entry.value = `+${entry.value}`;
        } else {
          entry.value = `${entry.value}`;
        }
      }
    }
    systemData.modParams = modParams;

    // Round 22 fix: named PC checks (Стойкость/Воля/Инициатива/Знание
    // монстров — whichever check items match the effectVitResPC/
    // effectMndResPC/effectInitPC/effectMKnowPC world settings) read
    // actorData.effect.vitres/mndres/init/mknow inside
    // Item#prepareDerivedData() (module/documents/item.mjs, ~line 480) —
    // which runs BEFORE Actor#applyActiveEffects() in Foundry's real
    // prepareData() order (reset -> prepareBaseData ->
    // prepareEmbeddedDocuments (items) -> applyActiveEffects ->
    // prepareDerivedData (actor), same order established by the round 18
    // monster-buff fix). So any equipped item's Active Effect targeting
    // system.effect.vitres/mndres/init/mknow (e.g. a ring granting +1
    // Воля) was invisible there — the check item always saw a stale,
    // not-yet-applied value. Patched the same way as round 18: re-add
    // the now-correctly-applied bonus here, after applyActiveEffects()
    // has genuinely run for this cycle.
    // Round 22.5 fix: "не суммируется" (Кольцо разума / Кольцо
    // праведной веры, оба бьют в Волю) изначально было сделано через
    // штатный Foundry-режим UPGRADE ("взять большее") — диагностика
    // в игре (actor.overrides оставался пустым {} несмотря на
    // appliedEffects/disabled:false/mode:4 — всё настроено верно)
    // показала, что UPGRADE в этой сборке ядра (14.366) молча
    // отказывается применяться к необъявленному в схеме полю
    // (system.effect.* тут везде "самодельное" — не описано в
    // template.json). Режим ADD на тех же необъявленных полях уже
    // много раз подтверждён рабочим (decay/checkbonus/efhitmod и
    // Кольцо разума в его самой первой, ADD-версии). Поэтому
    // "не суммируется" реализовано иначе: каждый источник пишет
    // (обычным ADD) в СВОЁ собственное под-поле
    // system.effect.mndresmax.<источник>, а "взять большее" считается
    // здесь, в уже проверенном коде поста-прохода — не полагаясь на
    // штатный режим Foundry вообще.
    const willRingMax = systemData.effect?.mndresmax
      ? Math.max(
          0,
          ...Object.values(systemData.effect.mndresmax).map(
            (v) => Number(v) || 0
          )
        )
      : 0;

    if (systemData.effect) {
      const namedCheckFix = [
        { name: effectVitResPC, bonus: Number(systemData.effect.vitres) || 0 },
        {
          name: effectMndResPC,
          bonus: (Number(systemData.effect.mndres) || 0) + willRingMax,
        },
        { name: effectInitPC, bonus: Number(systemData.effect.init) || 0 },
        { name: effectMKnowPC, bonus: Number(systemData.effect.mknow) || 0 },
      ];
      this.items.forEach((item) => {
        if (item.type !== "check") return;
        const fix = namedCheckFix.find(
          (f) => f.name && f.name === item.name && f.bonus
        );
        if (fix) item.system.checkbase = Number(item.system.checkbase) + fix.bonus;
      });
    }

    // Round 22 fix (continued): named per-check equipment bonuses.
    // The four settings-based checks above (Стойкость/Воля/Инициатива/
    // Знание монстров) are the only ones the system ever gave a name-
    // matching mechanism for. Most equipment that names a specific check
    // in its book text — "Скрытность +2" (Бесшумный плащ), "Понимание и
    // Поиска +1" (Очки с яркой вспышкой) — targets an ORDINARY `check`
    // item (Скрытность/Понимание/Поиск are `check`-type items too, same
    // as Воля, just not one of the four hardcoded names), so it needed
    // the same fix generalized rather than one setting per check. An
    // item's Active Effect can now target
    // system.effect.checkbonus.<Точное Имя Проверки> (ADD, plain object
    // keyed by the check item's exact name) and it's added to that
    // check's checkbase here, after applyActiveEffects() has run.
    if (systemData.effect?.checkbonus) {
      this.items.forEach((item) => {
        if (item.type !== "check") return;
        const bonus = Number(systemData.effect.checkbonus[item.name]) || 0;
        if (!bonus) return;
        item.system.checkbase = Number(item.system.checkbase) + bonus;
      });
    }

    // [2026-10-07] «ко всем проверкам» (system.effect.allck — Заморозка, Дрёма,
    // Молниеносная привязка…) was read by the items before Active Effects were
    // applied, so on a character it changed nothing. Apply it here to every action
    // check: check items (not the death check), weapon accuracy, evasion, casting.
    const allckBonus = Number(systemData.effect?.allck) || 0;
    if (allckBonus) {
      const deathName = game.i18n.localize("SW25.Config.Death");
      this.items.forEach((item) => {
        if (item.type === "check" && item.name !== deathName && !isItem(item.name, "deathcheck"))
          item.system.checkbase = Number(item.system.checkbase) + allckBonus;
        if (item.type === "weapon") {
          item.system.checkbase = Number(item.system.checkbase) + allckBonus;
          if (item.name == systemData.hitweapon) systemData.itemhitbase = Number(systemData.itemhitbase) + allckBonus;
        }
      });
      if (Number.isFinite(Number(systemData.dodgebase))) systemData.dodgebase = Number(systemData.dodgebase) + allckBonus;
      for (const k of ["sccast", "cncast", "wzcast", "prcast", "mtcast", "frcast", "drcast", "dmcast", "abcast", "bmcast"])
        if (Number.isFinite(Number(systemData.attributes[k]))) systemData.attributes[k] = Number(systemData.attributes[k]) + allckBonus;
    }

    // [2026-10-07] «Напряжённый финал»: +10 Power for the Bard's finales. Finales are
    // magicalsong items with their own table, so the generic bonus never reached them:
    // move the finale to the row of the higher Power.
    const finaleBonus = Number((systemData.effect?.spellpowerbonus?.["Финальный аккорд"] ?? systemData.effect?.spellpowerbonus?.["Finale"])) || 0;
    if (finaleBonus) {
      this.items.forEach((item) => {
        if (item.type !== "magicalsong" || item.system.type !== "final" || !Array.isArray(item.system.powertable)) return;
        const p = Math.min(100, (Number(item.system.power) || 0) + finaleBonus);
        const row = rpt[p];
        if (!Array.isArray(row) || !row.some((v) => Number(v))) return;
        item.system.powertable[0] = p;
        for (let i = 0; i < 10; i++) item.system.powertable[3 + i] = row[i];
      });
    }

    // Round 22 fix (continued): named per-skill equipment bonuses.
    // Skill items already sum a blanket "+N to ALL skills" modifier
    // (system.effect.allsk, added inside Item#prepareDerivedData() —
    // module/documents/item.mjs ~line 208) but there was never a way to
    // target ONE specific named skill (e.g. "Скрытность +2" from a
    // cloak) — only the all-skills blanket field existed. Equipment
    // whose book text names one particular skill needed a real
    // mechanism, so this adds it: an item's Active Effect can target
    // system.effect.skillbonus.<Точное Имя Навыка> (ADD mode, plain
    // object keyed by the skill item's exact name — same "undeclared
    // dynamic field" pattern already used throughout this system for
    // dice1.resist/elements.magic.*/effect.vitres etc.) and it's added
    // here to every one of that skill's six ability-branch totals
    // (skillbase.dex/agi/str/vit/int/mnd/invoke), exactly the way the
    // built-in efallskmod already does it a few lines up in item.mjs.
    if (systemData.effect?.skillbonus) {
      this.items.forEach((item) => {
        if (item.type !== "skill") return;
        const bonus = Number(systemData.effect.skillbonus[item.name]) || 0;
        if (!bonus) return;
        for (const key of ["dex", "agi", "str", "vit", "int", "mnd", "invoke"]) {
          if (item.system.skillbase?.[key] !== undefined) {
            item.system.skillbase[key] =
              Number(item.system.skillbase[key]) + bonus;
          }
        }
      });
    }

    // Round 22 fix (continued): PC weapon accuracy/damage buffs.
    // Same root cause as round 18 (monster abilities) — weapon items
    // read actorData.attributes.efhitmod/efdmod inside
    // Item#prepareDerivedData() (module/documents/item.mjs, ~line
    // 1276-1287) to build their own checkbase/powerbase, and that runs
    // BEFORE Actor#applyActiveEffects() — so a temporary combat buff
    // (e.g. a potion granting +2 Точность for a few rounds, or any
    // future equipped item granting flat +hit/+dmg) baked in a stale
    // (effectively zero) value there and never actually showed up on
    // the weapon's own numbers, exactly like the round 18 bug did for
    // monsterability items. This was never diagnosed for PC weapons
    // before because nothing shipped so far actually drove efhitmod/
    // efdmod for a character. Patched the same way: re-add the
    // correctly-applied value here, after applyActiveEffects() has run.
    // Round 25 addendum: per-category weapon mastery ("Владение оружием
    // A/S", "Метание I" — book text: "+N урона для оружия ЭТОЙ
    // категории", not all weapons). Reuses the exact checkbonus/skillbonus
    // pattern from round 22 (a plain named dictionary under
    // system.effect.*, ADD mode) — an item's Active Effect targets
    // system.effect.weaponcatbonus.<категория> (e.g. "sword", "throwing",
    // matching weapon.system.category's own slug) and it's added only to
    // weapons of that one category, here, after applyActiveEffects() has
    // run. "Владение оружием A/S" needs the player's chosen category
    // written onto the technique item's own (previously unused)
    // system.scholl field — see set-mastery-category.mjs.
    const weaponCatBonus = systemData.effect?.weaponcatbonus || {};
    // Round 25 addendum: "Смертельный удар I/II/III" — book text is not a
    // flat damage number but a shift on the POWER TABLE roll itself
    // (powertable[PT.POWTABLEMOD], already a real slot the engine reads —
    // module/helpers/powerroll.mjs — just never fed by anything before).
    // Declared as a toggle (system.attributes.efpowtablemod), same
    // transfer:true/disabled:true pattern as "Мощный удар".
    const powTableModBonus = Number(systemData.attributes.efpowtablemod) || 0;
    this.items.forEach((item) => {
      if (item.type !== "weapon") return;
      // [2026-10-07] per-category accuracy (system.effect.weaponcathit.<category>, e.g. «Метание I»)
      const hitBonus = (Number(systemData.attributes.efhitmod) || 0) + (Number(systemData.effect?.weaponcathit?.[item.system.category]) || 0);
      const catDmgBonus = Number(weaponCatBonus[item.system.category]) || 0;
      const dmgBonus = (Number(systemData.attributes.efdmod) || 0) + catDmgBonus;
      // [Round 66] the main-weapon attack panel (itemhitbase/itempowerbase)
      // was copied from this weapon BEFORE these buffs were added, so the
      // sheet's attack button rolled without them. Keep both in sync.
      const isMainWeapon = item.name == systemData.hitweapon;
      if (hitBonus) {
        item.system.checkbase = Number(item.system.checkbase) + hitBonus;
        if (isMainWeapon)
          systemData.itemhitbase = Number(systemData.itemhitbase) + hitBonus;
      }
      if (dmgBonus && isMainWeapon)
        systemData.itempowerbase = Number(systemData.itempowerbase) + dmgBonus;
      if (dmgBonus) {
        item.system.powerbase = Number(item.system.powerbase) + dmgBonus;
        item.system.listpowerbase =
          Number(item.system.listpowerbase) + dmgBonus;
        // Round 23.1 addendum: this patched powerbase/listpowerbase, but
        // the actual rolled/displayed "k{power}@{cvalue}+{mod}" formula
        // reads item.system.powertable (a plain array snapshotted earlier
        // by item.mjs, before this method runs — see the spell fix right
        // below for the full explanation of why this second write is
        // needed). Without this, a damage-boosting buff (efdmod) would
        // show correctly in item.system.powerbase but the weapon's actual
        // damage roll would still silently use the old value.
        if (Array.isArray(item.system.powertable)) {
          item.system.powertable[13] = item.system.powerbase;
        }
      }
      if (powTableModBonus && Array.isArray(item.system.powertable)) {
        item.system.powertable[PT.POWTABLEMOD] =
          Number(item.system.powertable[PT.POWTABLEMOD] || 0) + powTableModBonus;
      }
    });

    // Round 25 addendum: per-category armor mastery ("Владение бронёй
    // A/S" — book text: "+N защиты для брони ЭТОЙ категории"). Same
    // pattern as weapon mastery above, applied to itempp (Protection
    // Point) only for EQUIPPED armor of the matching category.
    const armorCatBonus = systemData.effect?.armorcatbonus || {};
    if (Object.keys(armorCatBonus).length) {
      this.items.forEach((item) => {
        if (item.type !== "armor" || item.system.equip !== true) return;
        const bonus = Number(armorCatBonus[item.system.category]) || 0;
        if (!bonus) return;
        systemData.attributes.protectionpoint =
          Number(systemData.attributes.protectionpoint) + bonus;
        systemData.barepp = Number(systemData.barepp) + bonus;
      });
    }

    // Round 23.1 fix: spell checkbase/powerbase ("Мощь магии" not adding
    // to a spell's roll — e.g. "Заморозка" showing "k40@10+0" instead of
    // "k40@10+11"). Same root cause class as the weapon fix just above,
    // but subtler: item.mjs's own per-school switch (in
    // Item#prepareDerivedData(), which runs during
    // Actor#prepareEmbeddedDocuments() — BEFORE this method,
    // Actor#prepareDerivedData(), runs) used to try to read
    // actorData.attributes.<school>cast/<school>power directly — but
    // those fields are computed a few lines above THIS method, i.e. they
    // don't exist yet at the point item.mjs runs this cycle. Number(undefined)
    // is NaN, which module/helpers/powerroll.mjs then silently coerces to
    // 0 (its own defensive cleanup for a blank powertable) — so the bug
    // looked like "the bonus is just 0", not a crash, which is why it took
    // a full round of live testing (not just code-reading) to catch.
    //
    // Fixed the same way as the weapon buffs above: item.mjs's per-school
    // switch no longer touches checkbase/powerbase at all (only mpcost,
    // which doesn't have this dependency); the entire "add the caster's
    // Мощь магии to this spell's roll" responsibility now lives HERE,
    // after <school>cast/<school>power for every school have already been
    // correctly computed by the code above (post-effects, post-item-prep —
    // safe to read). <школа>cast already includes <школа>base (the
    // skill-rank-derived component that was the actual missing piece the
    // user reported) plus the equipment "Мощь магии" bonus
    // (efallmgpacmod) — both were silently dropped before this fix.
    const spellSchoolPower = [
      { type: "sorcerer", cast: "sccast", power: "scpower", pwmod: "efscpwmod" },
      { type: "conjurer", cast: "cncast", power: "cnpower", pwmod: "efcnpwmod" },
      { type: "wizard", cast: "wzcast", power: "wzpower", pwmod: "efwzpwmod" },
      { type: "priest", cast: "prcast", power: "prpower", pwmod: "efprpwmod" },
      { type: "magitech", cast: "mtcast", power: "mtpower", pwmod: "efmtpwmod" },
      { type: "fairy", cast: "frcast", power: "frpower", pwmod: "effrpwmod" },
      { type: "druid", cast: "drcast", power: "drpower", pwmod: "efdrpwmod" },
      { type: "daemon", cast: "dmcast", power: "dmpower", pwmod: "efdmpwmod" },
      { type: "abyssal", cast: "abcast", power: "abpower", pwmod: "efabpwmod" },
      { type: "bibliomancer", cast: "bmcast", power: "bmpower", pwmod: "efbmpwmod" },
    ];
    const efmpwallBonus = Number(systemData.attributes.efmpwall) || 0;
    // Round 25 addendum: bonuses aimed at ONE named spell rather than a
    // whole school ("Напряженный финал" — Bard technique, "+10 Мощность"
    // to specifically "Финальный аккорд"). Same named-dictionary pattern
    // as checkbonus/skillbonus (round 22), keyed by the spell's own exact
    // name this time: system.effect.spellpowerbonus.<Точное имя>.
    const spellPowerBonus = systemData.effect?.spellpowerbonus || {};
    this.items.forEach((item) => {
      if (item.type !== "spell") return;
      const school = spellSchoolPower.find((s) => s.type === item.system.type);
      if (!school) return;

      // [Round 66] Avoid double-counting the caster's class level + INT
      // bonus. <school>cast/<school>power already contain <school>base
      // (skill "invoke" = level + INT bonus + skill mod). When a spell has
      // its own check/power skill+ability saved (the spell sheet's selects
      // store them), item.mjs has ALREADY added that level + ability into
      // checkbase/powerbase; it records exactly how much in
      // checkskillpart/powerskillpart, which is removed here.
      // Example that used to break: Sorcerer 5, INT 21 -> base 16, not 8.
      const castBonus =
        (Number(systemData.attributes[school.cast]) || 0) -
        (Number(item.system.checkskillpart) || 0);
      const powerBonus =
        (Number(systemData.attributes[school.power]) || 0) -
        (Number(item.system.powerskillpart) || 0) +
        (Number(systemData.attributes[school.pwmod]) || 0) +
        efmpwallBonus +
        (Number(spellPowerBonus[item.name]) || 0);

      item.system.checkbase = Number(item.system.checkbase) + castBonus;
      item.system.powerbase = Number(item.system.powerbase) + powerBonus;

      // The displayed/rolled "k{power}@{cvalue}+{mod}" formula does NOT
      // read item.system.powerbase live — module/helpers/chatbutton.mjs
      // feeds item.system.powertable (a plain array snapshotted by
      // item.mjs's own _prepareItemRollData(), well before this fix runs)
      // straight into powerRoll(). Patching powerbase above is invisible
      // to the roll unless the same corrected number also lands in the
      // snapshot's POWMOD slot (index 13, module/helpers/powerroll.mjs
      // PT.POWMOD) — otherwise the roll would keep using the stale
      // pre-effects value even though the sheet's own fields look right.
      if (Array.isArray(item.system.powertable)) {
        item.system.powertable[13] = item.system.powerbase;
      }
    });

    // Set initiative formula
    systemData.initiativeFormula = "2d6";
    this.items.forEach((item) => {
      if (item.name == effectInitPC) {
        systemData.initiativeFormula =
          item.system.formula + "+" + item.system.checkbase;
      }
    });

    // Polyglot support
    const languages = [];
    this.items.forEach((item) => {
      if (item.type == "language") {
        if (item.system.conversation) {
          systemData.attributes.languages.conv.push(`${item.name}`);
          languages.push(
            `${item.name}` +
              ` (${game.i18n.localize("SW25.Item.Language.Conversation")})`
          );
        }
        if (item.system.reading) {
          systemData.attributes.languages.read.push(`${item.name}`);
          languages.push(
            `${item.name}` +
              ` (${game.i18n.localize("SW25.Item.Language.Reading")})`
          );
        }
      }
    });
    systemData.attributes.langlist = languages.join(", ");

    // Sheet refresh removed: it existed only to force a follow-up render
    // once the old async computation finally caught up. Now that the
    // computation above runs synchronously, the in-flight render already
    // sees correct data, so this extra self-render would just be a
    // redundant duplicate render on every single update (this is also why
    // the console used to show "Rendering SW25ActorSheet" more than once
    // per interaction).
    } catch (err) {
      console.error(
        `SW25 | _prepareCharacterData failed for actor "${actorData.name}" (id ${actorData.id}) — data preparation was incomplete this cycle. This is a bug unrelated to the applyActiveEffects v14 workaround above; please report this stack trace:`,
        err
      );
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== "npc") return;

    const systemData = actorData.system;
    // v14: see the matching comment in _prepareCharacterData() above — this
    // used to defer everything below to a microtask (via `await
    // this.update({})`, later `await Promise.resolve()`), racing against
    // whatever synchronous render read `actor.system` right after
    // prepareData() returned. Now fully synchronous, so the values below
    // are guaranteed correct before any render can read them.
    try {

    // Visible data trigger
    const userId = game.user.id;
    if (
      actorData.ownership[userId] === 1 ||
      (typeof actorData.ownership[userId] === "undefined" &&
        actorData.ownership.default === 1)
    ) {
      systemData.limited = true;
      if (systemData.udname == null || systemData.udname == "") {
        systemData.udname = game.i18n.localize("SW25.Npc.Unidentifiednpc");
      }
      actorData.name = systemData.udname;
    } else systemData.limited = false;
    if (game.user.isGM === true) systemData.isgm = true;
    else systemData.isgm = false;

    // Make modifiy
    systemData.hp.max =
      Number(systemData.hpbase) +
      Number(systemData.hp.hpmod) +
      Number(systemData.hp.efhpmod);
    systemData.mp.max =
      Number(systemData.mpbase) +
      Number(systemData.mp.mpmod) +
      Number(systemData.mp.efmpmod);
    systemData.pp =
      Number(systemData.ppbase) +
      Number(systemData.attributes.ppmod) +
      Number(systemData.attributes.efppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);
    systemData.mpp =
      Number(systemData.mppbase) +
      Number(systemData.attributes.mppmod) +
      Number(systemData.attributes.efmppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);

    if(systemData.hp.max < systemData.hp.value){
      systemData.hp.value = systemData.hp.max;
    }
    if(systemData.mp.max < systemData.mp.value){
      systemData.mp.value = systemData.mp.max;
    }
    
    // Calculate active effect
    // SW25-RU fix (round 42): actorData.effects already includes any
    // transfer:true item-owned effects (native Foundry v11+ behavior) and
    // correctly excludes transfer:false ones (selfbuff/technique template
    // effects that only apply once the player toggles them onto the actor
    // as their own ActiveEffect). The old code below re-added EVERY owned
    // item's effects unconditionally, double-counting transfer:true ones
    // and showing transfer:false template effects (e.g. Мощный удар I) as
    // already active before they were ever toggled on.
    // [Round 66] actor.effects does NOT contain item effects here
    // (CONFIG.ActiveEffect.legacyTransferral = false), so equipment bonuses
    // (e.g. +1 Воля from a ring) were missing from this panel. Use every
    // effect that actually applies to the actor: own + transfer:true item
    // effects (transfer:false templates are still excluded by Foundry).
    let allEffects = Array.from(this.allApplicableEffects());
    let activeEffects = allEffects.filter(
      (effect) => effect.disabled === false
    );

    let effectsChange = activeEffects.map((effect) => {
      return effect.changes.map((change) => {
        return {
          key: change.key,
          value: Number(change.value),
          mode: change.mode,
        };
      });
    }).flat();

    // (was: eval() on variable names)
    const totals = {
      totalppmod: null,
      totalmppmod: null,
      totaldreduce: null,
      totalhpmod: null,
      totalmpmod: null,
    };
    const processingRules = [
      { key: "system.attributes.efppmod", target: "totalppmod" },
      { key: "system.attributes.efmppmod", target: "totalmppmod" },
      { key: "system.attributes.efdreduce", target: "totaldreduce" },
      { key: "system.hp.efhpmod", target: "totalhpmod" },
      { key: "system.mp.efmpmod", target: "totalmpmod" }
    ];
    let ruleMap = Object.fromEntries(
      processingRules.map((rule) => [rule.key, rule])
    );
    effectsChange.sort((a, b) => a.mode - b.mode);
    effectsChange.forEach((effects) => {

      let rule = ruleMap[effects.key];
      if (rule) {
        let value = Number(effects.value);
        switch (effects.mode) {
          case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
            totals[rule.target] *= value;
            break;

          case CONST.ACTIVE_EFFECT_MODES.ADD:
            totals[rule.target] += value;
            break;
  
          case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
            totals[rule.target] = value;
            break;
  
          case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          case CONST.ACTIVE_EFFECT_MODES.CUSTOM:
            //未実装
            break;
  
          default:
            break;
        }
      }
    });
    const { totalppmod, totalmppmod, totaldreduce, totalhpmod, totalmpmod } =
      totals;
    systemData.totalppmod = totalppmod;
    systemData.totalmppmod = totalmppmod;
    systemData.totaldreduce = totaldreduce;
    systemData.totalhpmod = totalhpmod;
    systemData.totalmpmod = totalmpmod;
    if (totalppmod > 0) systemData.totalppmod = "+" + totalppmod;
    if (totalmppmod > 0) systemData.totalmppmod = "+" + totalmppmod;
    if (totaldreduce > 0) systemData.totaldreduce = "+" + totaldreduce;
    if (totalhpmod > 0) systemData.totalhpmod = "+" + totalhpmod;
    if (totalmpmod > 0) systemData.totalmpmod = "+" + totalmpmod;

    // Set initiative formula
    systemData.initiativeFormula = "0";

    // Polyglot support
    if (systemData.language) {
      const lang = systemData.language
        .split(/[，,、\s　]+/)
        .map((item) => item.trim());
      systemData.attributes.languages.conv = lang;
      systemData.attributes.languages.read = lang;
    }
    systemData.attributes.langlist = systemData.language;

    // Sheet refresh removed: see the matching comment in
    // _prepareCharacterData().
    } catch (err) {
      console.error(
        `SW25 | _prepareNpcData failed for actor "${actorData.name}" (id ${actorData.id}) — data preparation was incomplete this cycle. This is a bug unrelated to the applyActiveEffects v14 workaround above; please report this stack trace:`,
        err
      );
    }
  }

  /**
   * Prepare Monster type specific data.
   */
  _prepareMonsterData(actorData) {
    if (actorData.type !== "monster") return;

    const systemData = actorData.system;
    // v14: see the matching comment in _prepareCharacterData() above — this
    // used to defer everything below to a microtask (via `await
    // this.update({})`, later `await Promise.resolve()`), racing against
    // whatever synchronous render read `actor.system` right after
    // prepareData() returned. Now fully synchronous, so the values below
    // are guaranteed correct before any render can read them.
    try {

    // Visible data trigger
    const userId = game.user.id;
    if (
      actorData.ownership[userId] === 1 ||
      (typeof actorData.ownership[userId] === "undefined" &&
        actorData.ownership.default === 1)
    ) {
      systemData.limited = true;
      if (systemData.udname == null || systemData.udname == "") {
        systemData.udname = game.i18n.localize("SW25.Monster.Unidentifiedmon");
      }
      actorData.name = systemData.udname;
    } else systemData.limited = false;
    if (game.user.isGM === true) systemData.isgm = true;
    else systemData.isgm = false;

    // Make modifiy
    systemData.exp = systemData.monlevel * 10;

    systemData.hp.max =
      Number(systemData.hpbase) +
      Number(systemData.hp.hpmod) +
      Number(systemData.hp.efhpmod) +
      Math.floor((systemData.abilities?.vit?.efvaluemodify ?? 0));
    systemData.mp.max =
      Number(systemData.mpbase) +
      Number(systemData.mp.mpmod) +
      Number(systemData.mp.efmpmod) +
      Math.floor((systemData.abilities?.mnd?.efvaluemodify ?? 0));
    systemData.pp =
      Number(systemData.ppbase) +
      Number(systemData.attributes.ppmod) +
      Number(systemData.attributes.efppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);
    systemData.mpp =
      Number(systemData.mppbase) +
      Number(systemData.attributes.mppmod) +
      Number(systemData.attributes.efmppmod) +
      Number(systemData.attributes.dreduce) +
      Number(systemData.attributes.efdreduce);

    // SW25-RU fix: a monsterability item's own checkbase1/2/3 (Точность/
    // Урон/Уклонение) is computed inside Item#prepareDerivedData(), which
    // Foundry calls from Actor#prepareEmbeddedDocuments() — this runs
    // BEFORE Actor#applyActiveEffects() in Foundry's actual prepareData()
    // sequence (reset -> prepareBaseData -> prepareEmbeddedDocuments
    // (items) -> applyActiveEffects -> prepareDerivedData). That means
    // any Active Effect targeting system.attributes.efhitmod/efdmod/
    // efdodgemod is always stale (0, freshly reset) by the time the item
    // reads it, even though the attribute itself gets set correctly a
    // moment later in this very cycle. This is why a self-buff (e.g. an
    // enhance-art like [Кошачьи глаза]/[Медвежья мышца] applied via the
    // item's own ✨ button) never visibly changed Точность/Урон on the
    // monster's own attacks, while attributes read later in THIS method
    // (efdreduce, above, feeding system.pp/"Защита") worked fine — this
    // method runs from prepareDerivedData(), i.e. AFTER
    // applyActiveEffects() has already run for this cycle. Fix: re-apply
    // the same three bonuses here, directly on top of each monsterability
    // item's already-computed checkbase, now that the attribute values
    // are actually current.
    this.items.forEach((monAbility) => {
      if (monAbility.type !== "monsterability") return;
      for (let i = 1; i <= 3; i++) {
        const label = monAbility.system[`label${i}`];
        let bonus = 0;
        if (label === effectHitMon) bonus = Number(systemData.attributes.efhitmod) || 0;
        else if (label === effectDmgMon) bonus = Number(systemData.attributes.efdmod) || 0;
        else if (label === effectDodgeMon) bonus = Number(systemData.attributes.efdodgemod) || 0;
        // [2026-10-07] «ко всем проверкам» (system.effect.allck) is stale at item-prep time
        // for the same reason: add it to every rolled line except damage
        if (label && label !== effectDmgMon && monAbility.system[`usedice${i}`]) bonus += Number(systemData.effect?.allck) || 0;
        if (bonus) {
          monAbility.system[`checkbase${i}`] =
            Number(monAbility.system[`checkbase${i}`]) + bonus;
          monAbility.system[`checkbasefix${i}`] =
            Number(monAbility.system[`checkbase${i}`]) + 7;
        }
      }
    });

    if(systemData.hp.max < systemData.hp.value){
      systemData.hp.value = systemData.hp.max;
    }
    if(systemData.mp.max < systemData.mp.value){
      systemData.mp.value = systemData.mp.max;
    }
  
    if (systemData.impurity == 0 || systemData.impurity == null)
      systemData.showimp = false;
    else systemData.showimp = true;
    if (systemData.part == 0 || systemData.part == null)
      systemData.showpt = false;
    else systemData.showpt = true;

    // Calculate active effect
    // SW25-RU fix (round 42): actorData.effects already includes any
    // transfer:true item-owned effects (native Foundry v11+ behavior) and
    // correctly excludes transfer:false ones (selfbuff/technique template
    // effects that only apply once the player toggles them onto the actor
    // as their own ActiveEffect). The old code below re-added EVERY owned
    // item's effects unconditionally, double-counting transfer:true ones
    // and showing transfer:false template effects (e.g. Мощный удар I) as
    // already active before they were ever toggled on.
    // [Round 66] actor.effects does NOT contain item effects here
    // (CONFIG.ActiveEffect.legacyTransferral = false), so equipment bonuses
    // (e.g. +1 Воля from a ring) were missing from this panel. Use every
    // effect that actually applies to the actor: own + transfer:true item
    // effects (transfer:false templates are still excluded by Foundry).
    let allEffects = Array.from(this.allApplicableEffects());

    let modParams = this._getModParams(allEffects);

    // Convert Status Monster Parameter.
    // convert dex
    if (modParams.totaldex && typeof modParams.totaldex.value === "number") {
      const dex = modParams.totaldex.value;
      const bonus = Math.floor(dex / 6);

      if(modParams.totalhitmod)
        modParams.totalhitmod.value += bonus;
      else
        modParams.totalhitmod = {
          label: `${game.i18n.localize("SW25.Effect.HitMod")}`,
          value: bonus,
        };

      delete modParams.totaldex;
    }
    if (modParams.totaldexmod && typeof modParams.totaldexmod.value === "number") {
      const bonus = Number(modParams.totaldexmod.value);

      if(modParams.totalhitmod)
        modParams.totalhitmod.value += bonus;
      else
        modParams.totalhitmod = {
          label: `${game.i18n.localize("SW25.Effect.HitMod")}`,
          value: bonus,
        };

      delete modParams.totaldexmod;
    }

    // convert str
    if (modParams.totalstr && typeof modParams.totalstr.value === "number") {
      const param = modParams.totalstr.value;
      const bonus = Math.floor(param / 6);

      if(modParams.totaldmod)
        modParams.totaldmod.value += bonus;
      else
        modParams.totaldmod = {
          label: `${game.i18n.localize("SW25.Effect.DamageMod")}`,
          value: bonus,
        };

      delete modParams.totalstr;
    }
    if (modParams.totalstrmod && typeof modParams.totalstrmod.value === "number") {
      const bonus = Number(modParams.totalstrmod.value);

      if(modParams.totaldmod)
        modParams.totaldmod.value += bonus;
      else
        modParams.totaldmod = {
          label: `${game.i18n.localize("SW25.Effect.DamageMod")}`,
          value: bonus,
        };

      delete modParams.totalstrmod;
    }

    // convert agi
    if (modParams.totalagi && typeof modParams.totalagi.value === "number") {
      const param = modParams.totalagi.value;
      const bonus = Math.floor(param / 6);

      if(modParams.totaldodgemod)
        modParams.totaldodgemod.value += bonus;
      else
        modParams.totaldodgemod = {
          label: `${game.i18n.localize("SW25.Effect.DodgeMod")}`,
          value: bonus,
        };

      if(modParams.totalmovemod)
        modParams.totalmovemod.value += param;
      else
        modParams.totalmovemod = {
          label: `${game.i18n.localize("SW25.Effect.MoveMod")}`,
          value: param,
        };

      if(modParams.totalinit)
        modParams.totalinit.value += bonus;
      else
        modParams.totalinit = {
          label: `${game.i18n.localize("SW25.Config.Init")}`,
          value: bonus,
        };

      delete modParams.totalagi;
    }
    if (modParams.totalagimod && typeof modParams.totalagimod.value === "number") {
      const bonus = Number(modParams.totalagimod.value);

      if(modParams.totaldodgemod)
        modParams.totaldodgemod.value += bonus;
      else
        modParams.totaldodgemod = {
          label: `${game.i18n.localize("SW25.Effect.DodgeMod")}`,
          value: bonus,
        };

      if(modParams.totalmovemod)
        modParams.totalmovemod.value += bonus;
      else
        modParams.totalmovemod = {
          label: `${game.i18n.localize("SW25.Effect.MoveMod")}`,
          value: bonus,
        };

      if(modParams.totalinit)
        modParams.totalinit.value += bonus;
      else
        modParams.totalinit = {
          label: `${game.i18n.localize("SW25.Config.Init")}`,
          value: bonus,
        };

      delete modParams.totalagimod;
    }

    // convert vit
    if (modParams.totalvit && typeof modParams.totalvit.value === "number") {
      const param = modParams.totalvit.value;
      const bonus = Math.floor(param / 6);

      if(modParams.totalvitres)
        modParams.totalvitres.value += bonus;
      else
        modParams.totalvitres = {
          label: `${game.i18n.localize("SW25.Config.ResVit")}`,
          value: bonus,
        };

      if(modParams.totalhpmod)
        modParams.totalhpmod.value += param;
      else
        modParams.totalhpmod = {
          label: `${game.i18n.localize("SW25.Effect.HpMod")}`,
          value: param,
        };

      delete modParams.totalvit;
    }
    if (modParams.totalvitmod && typeof modParams.totalvitmod.value === "number") {
      const bonus = Number(modParams.totalvitmod.value);

      if(modParams.totalvitres)
        modParams.totalvitres.value += bonus;
      else
        modParams.totalvitres = {
          label: `${game.i18n.localize("SW25.Config.ResVit")}`,
          value: bonus,
        };

      delete modParams.totalvitmod;
    }

    // convert int
    if (modParams.totalint && typeof modParams.totalint.value === "number") {
      const param = modParams.totalint.value;
      const bonus = Math.floor(param / 6);

      if(modParams.totalallmgp)
        modParams.totalallmgp.value += bonus;
      else
        modParams.totalallmgp = {
          label: `${game.i18n.localize("SW25.Config.AllMgp")}`,
          value: bonus,
        };

      delete modParams.totalint;
    }
    if (modParams.totalintmod && typeof modParams.totalintmod.value === "number") {
      const bonus = Number(modParams.totalintmod.value);

      if(modParams.totalallmgp)
        modParams.totalallmgp.value += bonus;
      else
        modParams.totalallmgp = {
          label: `${game.i18n.localize("SW25.Config.AllMgp")}`,
          value: bonus,
        };

      delete modParams.totalintmod;
    }

    // convert mnd
    if (modParams.totalmnd && typeof modParams.totalmnd.value === "number") {
      const param = modParams.totalmnd.value;
      const bonus = Math.floor(param / 6);

      if(modParams.totalmndres)
        modParams.totalmndres.value += bonus;
      else
        modParams.totalmndres = {
          label: `${game.i18n.localize("SW25.Config.ResMnd")}`,
          value: bonus,
        };
      if(modParams.totalmpmod)
        modParams.totalmpmod.value += param;
      else
        modParams.totalmpmod = {
          label: `${game.i18n.localize("SW25.Effect.MpMod")}`,
          value: param,
        };

      delete modParams.totalmnd;
    }
    if (modParams.totalmndmod && typeof modParams.totalmndmod.value === "number") {
      const bonus = Number(modParams.totalmndmod.value);

      if(modParams.totalmndres)
        modParams.totalmndres.value += bonus;
      else
        modParams.totalmndres = {
          label: `${game.i18n.localize("SW25.Config.ResMnd")}`,
          value: bonus,
        };

      delete modParams.totalmndmod;
    }

    // normalize
    for (let [key, entry] of Object.entries(modParams)) {
      if (typeof entry.value === "number") {
        if (entry.value > 0) {
          entry.value = `+${entry.value}`;
        } else {
          entry.value = `${entry.value}`;
        }
      }
    }
    systemData.modParams = modParams;

    // Set initiative formula
    systemData.initiativeFormula = String(systemData.preemptive);

    // Polyglot support
    if (systemData.language) {
      const lang = systemData.language
        .split(/[，,、\s　]+/)
        .map((item) => item.trim());
      systemData.attributes.languages.conv = lang;
      systemData.attributes.languages.read = lang;
    }

    // Sheet refresh removed: see the matching comment in
    // _prepareCharacterData().
    } catch (err) {
      console.error(
        `SW25 | _prepareMonsterData failed for actor "${actorData.name}" (id ${actorData.id}) — data preparation was incomplete this cycle. This is a bug unrelated to the applyActiveEffects v14 workaround above; please report this stack trace:`,
        err
      );
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const data = { ...super.getRollData() };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);
    this._getMonsterRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== "character") return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.advlevel) {
      data.advlvl = data.attributes.advlevel.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== "npc") return;

    // Process additional NPC data here.
  }

  /**
   * Prepare Monster roll data.
   */
  _getMonsterRollData(data) {
    if (this.type !== "monster") return;

    // Add level for easier access, or fall back to 0.
    if (data.monlevel) {
      data.monlvl = data.monlevel ?? 0;
    }

    // Process additional Monster data here.
  }

  _splitEffectKey(effectKey) {
    const keyPrefixes = [
      "system.attributes.damage.physical.classType.",
      "system.attributes.decay.physical.classType.",
      "system.attributes.damage.physical.element.",
      "system.attributes.decay.physical.element.",
      "system.attributes.damage.magic.classType.",
      "system.attributes.decay.magic.classType.",
      "system.attributes.damage.magic.element.",
      "system.attributes.decay.magic.element.",
      "system.effect.checkinputmod.",
    ];
    for (const prefix of keyPrefixes) {
      if (effectKey.startsWith(prefix)) {
        return {
          keyA: prefix,
          keyB: effectKey.slice(prefix.length)
        };
      }
    }
    return null;
  }

  _getModParams(allEffects){
    let activeEffects = allEffects.filter(
      (effect) => effect.disabled === false
    );
    let effectsChange = activeEffects.map((effect) => {
      return effect.changes.map((change) => {
        return {
          key: change.key,
          value: Number(change.value),
          mode: change.mode,
        };
      });
    }).flat();

    const processingRules = [
      { key: "system.attributes.efhitmod", target: "totalhitmod", localize: "overview" },
      { key: "system.attributes.efdmod", target: "totaldmod", localize: "overview" },
      { key: "system.effect.efcvalue", target: "totalcmod", localize: "overview" },
      { key: "system.effect.efspellcvalue", target: "totalspcmod", localize: "overview" },
      { key: "system.lt", target: "totallt", localize: "overview" },
      { key: "system.cr", target: "totalcr", localize: "overview" },
      { key: "system.attributes.efwphalfmod", target: "totalwphalfmod", localize: "overview" },
      { key: "system.attributes.efsphalfmod", target: "totalsphalfmod", localize: "overview" },
      { key: "system.attributes.efdodgemod", target: "totaldodgemod", localize: "overview" },
      { key: "system.attributes.efppmod", target: "totalppmod", localize: "overview" },
      { key: "system.attributes.efmppmod", target: "totalmppmod", localize: "overview" },
      { key: "system.attributes.efdreduce", target: "totaldreduce", localize: "overview" },
      { key: "system.attributes.move.efmovemod", target: "totalmovemod", localize: "overview" },
      { key: "system.attributes.turnend.hpregenmod", target: "totalhpregenmod", localize: "overview" },
      { key: "system.attributes.turnend.mpregenmod", target: "totalmpregenmod", localize: "overview" },
      { key: "system.effect.vitres", target: "totalvitres", localize: "overview" },
      { key: "system.effect.mndres", target: "totalmndres", localize: "overview" },
      { key: "system.effect.init", target: "totalinit", localize: "overview" },
      { key: "system.effect.mknow", target: "totalmknow", localize: "overview" },
      { key: "system.effect.allck", target: "totalallck", localize: "overview" },
      { key: "system.effect.allsk", target: "totalallsk", localize: "overview" },
      { key: "system.effect.allsc", target: "totalallsc", localize: "overview" },
      { key: "system.effect.allac", target: "totalallac", localize: "overview" },
      { key: "system.hp.efhpmod", target: "totalhpmod", localize: "overview" },
      { key: "system.mp.efmpmod", target: "totalmpmod", localize: "overview" },
      { key: "system.abilities.dex.efvaluemodify", target: "totaldex", localize: "overview" },
      { key: "system.abilities.agi.efvaluemodify", target: "totalagi", localize: "overview" },
      { key: "system.abilities.str.efvaluemodify", target: "totalstr", localize: "overview" },
      { key: "system.abilities.vit.efvaluemodify", target: "totalvit", localize: "overview" },
      { key: "system.abilities.int.efvaluemodify", target: "totalint", localize: "overview" },
      { key: "system.abilities.mnd.efvaluemodify", target: "totalmnd", localize: "overview" },
      { key: "system.abilities.dex.efmodify", target: "totaldexmod", localize: "overview" },
      { key: "system.abilities.agi.efmodify", target: "totalagimod", localize: "overview" },
      { key: "system.abilities.str.efmodify", target: "totalstrmod", localize: "overview" },
      { key: "system.abilities.vit.efmodify", target: "totalvitmod", localize: "overview" },
      { key: "system.abilities.int.efmodify", target: "totalintmod", localize: "overview" },
      { key: "system.abilities.mnd.efmodify", target: "totalmndmod", localize: "overview" },
      { key: "system.attributes.efscmod", target: "totalscmod", localize: "overview" },
      { key: "system.attributes.efcnmod", target: "totalcnmod", localize: "overview" },
      { key: "system.attributes.efwzmod", target: "totalwzmod", localize: "overview" },
      { key: "system.attributes.efprmod", target: "totalprmod", localize: "overview" },
      { key: "system.attributes.efmtmod", target: "totalmtmod", localize: "overview" },
      { key: "system.attributes.effrmod", target: "totalfrmod", localize: "overview" },
      { key: "system.attributes.efdrmod", target: "totaldrmod", localize: "overview" },
      { key: "system.attributes.efdmmod", target: "totaldmmod", localize: "overview" },
      { key: "system.attributes.efabmod", target: "totalabmod", localize: "overview" },
      { key: "system.attributes.efbmmod", target: "totalbmmod", localize: "overview" },
      { key: "system.attributes.efscckmod", target: "totalscckmod", localize: "overview" },
      { key: "system.attributes.efcnckmod", target: "totalcnckmod", localize: "overview" },
      { key: "system.attributes.efwzckmod", target: "totalwzckmod", localize: "overview" },
      { key: "system.attributes.efprckmod", target: "totalprckmod", localize: "overview" },
      { key: "system.attributes.efmtckmod", target: "totalmtckmod", localize: "overview" },
      { key: "system.attributes.effrckmod", target: "totalfrckmod", localize: "overview" },
      { key: "system.attributes.efdrckmod", target: "totaldrckmod", localize: "overview" },
      { key: "system.attributes.efdmckmod", target: "totaldmckmod", localize: "overview" },
      { key: "system.attributes.efabckmod", target: "totalabckmod", localize: "overview" },
      { key: "system.attributes.efbmckmod", target: "totalbmckmod", localize: "overview" },
      { key: "system.attributes.efscpwmod", target: "totalscpwmod", localize: "overview" },
      { key: "system.attributes.efcnpwmod", target: "totalcnpwmod", localize: "overview" },
      { key: "system.attributes.efwzpwmod", target: "totalwzpwmod", localize: "overview" },
      { key: "system.attributes.efprpwmod", target: "totalprpwmod", localize: "overview" },
      { key: "system.attributes.efmtpwmod", target: "totalmtpwmod", localize: "overview" },
      { key: "system.attributes.effrpwmod", target: "totalfrpwmod", localize: "overview" },
      { key: "system.attributes.efdrpwmod", target: "totaldrpwmod", localize: "overview" },
      { key: "system.attributes.efdmpwmod", target: "totaldmpwmod", localize: "overview" },
      { key: "system.attributes.efabpwmod", target: "totalabpwmod", localize: "overview" },
      { key: "system.attributes.efbmpwmod", target: "totalbmpwmod", localize: "overview" },
      { key: "system.effect.allmgp", target: "totalallmgp", localize: "overview" },
      { key: "system.attributes.efmpsc", target: "totalmpsc", localize: "overview" },
      { key: "system.attributes.efmpcn", target: "totalmpcn", localize: "overview" },
      { key: "system.attributes.efmpwz", target: "totalmpwz", localize: "overview" },
      { key: "system.attributes.efmppr", target: "totalmppr", localize: "overview" },
      { key: "system.attributes.efmpmt", target: "totalmpmt", localize: "overview" },
      { key: "system.attributes.efmpfr", target: "totalmpfr", localize: "overview" },
      { key: "system.attributes.efmpdr", target: "totalmpdr", localize: "overview" },
      { key: "system.attributes.efmpdm", target: "totalmpdm", localize: "overview" },
      { key: "system.attributes.efmpab", target: "totalmpab", localize: "overview" },
      { key: "system.attributes.efmpbm", target: "totalmpbm", localize: "overview" },
      { key: "system.attributes.efmpall", target: "totalmpall", localize: "overview" },
      { key: "system.attributes.efmckall", target: "totalallmck", localize: "overview" },
      { key: "system.attributes.efmpwall", target: "totalallmpw", localize: "overview" },
      { key: "system.attributes.efmsckmod", target: "totalmsckmod", localize: "overview" },
      { key: "system.attributes.efmspwmod", target: "totalmspwmod", localize: "overview" },
      { key: "system.attributes.efatckmod", target: "totalatckmod", localize: "overview" },
      { key: "system.attributes.efewckmod", target: "totalewckmod", localize: "overview" },
      { key: "system.attributes.efewpwmod", target: "totalewpwmod", localize: "overview" },
      { key: "system.eflootmod", target: "totallootmod", localize: "overview" },
      { key: "system.effect.package.fine", target: "totalfinechkmod", localize: "overview" },
      { key: "system.effect.package.move", target: "totalmovechkmod", localize: "overview" },
      { key: "system.effect.package.obse", target: "totalobsechkmod", localize: "overview" },
      { key: "system.effect.package.know", target: "totalknowchkmod", localize: "overview" },
      { key: "system.attributes.powertablemod.weapon", target: "ptmodweapon", localize: "overview" },
      { key: "system.attributes.powertablemod.armor", target: "ptmodarmor", localize: "overview" },
      { key: "system.attributes.powertablemod.accessory", target: "ptmodaccessory", localize: "overview" },
      { key: "system.attributes.powertablemod.item", target: "ptmoditem", localize: "overview" },
      { key: "system.attributes.powertablemod.spell", target: "ptmodspell", localize: "overview" },
      { key: "system.attributes.powertablemod.enhancearts", target: "ptmodenhancearts", localize: "overview" },
      { key: "system.attributes.powertablemod.magicalsong", target: "ptmodmagicalsong", localize: "overview" },
      { key: "system.attributes.powertablemod.ridingtrick", target: "ptmodridingtrick", localize: "overview" },
      { key: "system.attributes.powertablemod.alchemytech", target: "ptmodalchemytech", localize: "overview" },
      { key: "system.attributes.powertablemod.phasearea", target: "ptmodphasearea", localize: "overview" },
      { key: "system.attributes.powertablemod.tactics", target: "ptmodtactics", localize: "overview" },
      { key: "system.attributes.powertablemod.infusion", target: "ptmodinfusion", localize: "overview" },
      { key: "system.attributes.powertablemod.barbarousskill", target: "ptmodbarbarousskill", localize: "overview" },
      { key: "system.attributes.powertablemod.essenceweave", target: "ptmodessenceweave", localize: "overview" },
      { key: "system.attributes.powertablemod.skill", target: "ptmodskill", localize: "overview" },
      { key: "system.attributes.powertablemod.raceability", target: "ptmodraceability", localize: "overview" },
      { key: "system.attributes.powertablemod.otherfeature", target: "ptmodotherfeature", localize: "overview" },
      { key: "system.attributes.powertablemod.monsterability", target: "ptmodmonsterability", localize: "overview" },
      { key: "system.attributes.powertablemod.action", target: "ptmodaction", localize: "overview" },
      { key: "system.attributes.powertablemod.all", target: "ptmodall", localize: "overview" },
      { key: "system.attributes.damage.physical.classType.", target: "classPdamage", localize: "key-overview" },
      { key: "system.attributes.decay.physical.classType.", target: "classPdecay", localize: "key-overview" },
      { key: "system.attributes.damage.physical.element.", target: "elementPdamage", localize: "key-overview" },
      { key: "system.attributes.decay.physical.element.", target: "elementPdecay", localize: "key-overview" },
      { key: "system.attributes.damage.magic.classType.", target: "classMdamage", localize: "key-overview" },
      { key: "system.attributes.decay.magic.classType.", target: "classMdecay", localize: "key-overview" },
      { key: "system.attributes.damage.magic.element.", target: "elementMdamage", localize: "key-overview" },
      { key: "system.attributes.decay.magic.element.", target: "elementMDecay", localize: "key-overview" },
      { key: "system.effect.checkinputmod.", target: "checkinputmod", localize: "key" },
    ];

    let modParams = {};
    let ruleMap = Object.fromEntries(
      processingRules.map((rule) => [rule.key, rule])
    );

    effectsChange.sort((a, b) => a.mode - b.mode);
    effectsChange.forEach((effects) => {
      const keys = this._splitEffectKey(effects.key);
      let rule = keys != null ? ruleMap[keys.keyA] : ruleMap[effects.key];
      if (rule) {
        let value = Number(effects.value);
        let path = keys ? rule.target + keys.keyB.replaceAll(".", "") : rule.target;
        let currentValue = foundry.utils.getProperty(modParams, `${path}.value`);
        if (currentValue === undefined) {
          currentValue = 0;
        }

        let newValue = currentValue;
        switch (effects.mode) {
          case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
            newValue = Number(currentValue) * value;
            break;

          case CONST.ACTIVE_EFFECT_MODES.ADD:
            newValue = Number(currentValue) + value;
            break;
  
          case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
            newValue = value;
            break;
  
          case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          case CONST.ACTIVE_EFFECT_MODES.CUSTOM:
            //未実装
            break;
  
          default:
            break;
        }
        foundry.utils.setProperty(modParams, `${path}.value`, newValue);
        
        if (rule.localize) {
          let label;
          if( rule.localize === "key" )
            label = keys.keyB
          else if( rule.localize === "key-overview" )
            label = game.i18n.localize("SW25.Effect.Overview." + rule.key + keys.keyB);
          else
            label = game.i18n.localize("SW25.Effect.Overview." + rule.key);
          foundry.utils.setProperty(modParams, `${path}.label`, label);
        }
      }
    });

    return modParams;
  }
}
