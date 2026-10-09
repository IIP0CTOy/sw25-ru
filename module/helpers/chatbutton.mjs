// Chat button handler
import { sectionOrder, sectionsOf, hitsAllSections, applyToSections, undoSectionDeltas } from "./sections.mjs";
import { powerRoll } from "./powerroll.mjs";
import { mpCost, hpCost } from "./mpcost.mjs";
import { targetRollDialog, targetSelectDialog } from "../helpers/dialogs.mjs";
import { DamageSupporter } from "../helpers/damagesupport.mjs";
import { Util } from "./utils.mjs";
import { emitToGM } from "./socket.mjs";
import { grantLoot, lootToCard } from "./lootroll.mjs";
import { isLabel } from "./utils.mjs";
import { L2 } from "./monstergen-i18n.mjs";
import { isItem } from "./names.mjs";

/**
 * Execute  chat button click event and return the result.
 */
// [Round 79] rolls made from an area item («1 область…», «1 весь персонаж») are
// tagged flags.sw25.allSections: on a multi-section monster they hit every section.
let _allSecCtx = false;
const _resistLock = new Set();
export async function chatButton(chatMessage, buttonType, opts = {}) {
  if (!/^button(check\d?|power)$/.test(String(buttonType))) return _chatButton(chatMessage, buttonType, opts);
  const a = ChatMessage.getSpeakerActor(chatMessage.speaker) ?? game.actors.get(chatMessage.speaker?.actor);
  const prev = _allSecCtx;
  _allSecCtx = hitsAllSections(a?.items.get(chatMessage.flags?.sw25?.itemid));
  try {
    return await _chatButton(chatMessage, buttonType, opts);
  } finally {
    _allSecCtx = prev;
  }
}

async function _chatButton(chatMessage, buttonType, opts = {}) {
  const actorId = chatMessage.speaker.actor;
  // Unlinked tokens: use the token's own (synthetic) actor so effects
  // placed on that token are respected. Falls back to the world actor.
  const actor =
    ChatMessage.getSpeakerActor(chatMessage.speaker) ?? game.actors.get(actorId);
  const itemId = chatMessage.flags?.sw25?.itemid;
  const item = actor ? actor.items.get(itemId) : null;

  // Item roll button
  if (
    buttonType == "buttoncheck" ||
    buttonType == "buttoncheck1" ||
    buttonType == "buttoncheck2" ||
    buttonType == "buttoncheck3" ||
    buttonType == "buttonpower"
  ) {
    // [Round 66] opts.targets lets the auto-damage flow roll against a known
    // target without touching the user's current targeting.
    const targetTokens = opts.targets ?? game.user.targets;
    let apply = "-";
    if (buttonType == "buttoncheck") apply = item.system.applycheck;
    if (buttonType == "buttoncheck1") apply = item.system.applycheck1;
    if (buttonType == "buttoncheck2") apply = item.system.applycheck2;
    if (buttonType == "buttoncheck3") apply = item.system.applycheck3;
    if (buttonType == "buttonpower") apply = item.system.applypower;
    if (opts.targets) return await chatRoll(opts.targets);
    if (apply == "-" || targetTokens.size === 0) {
      // [2026-10-07] keep the current target on the card (it used to be dropped here)
      return await chatRoll(targetTokens.size ? targetTokens : undefined);
    } else {
      let label = `${item.name}`;
      const label0 = game.i18n.localize("SW25.Check");
      const label1 = item.system.label1;
      const label2 = item.system.label2;
      const label3 = item.system.label3;
      const labelmonpow = item.system.labelmonpow;
      if (buttonType == "buttoncheck") label = label + " (" + label0 + ")";
      if (buttonType == "buttoncheck1") label = label + " (" + label1 + ")";
      if (buttonType == "buttoncheck2") label = label + " (" + label2 + ")";
      if (buttonType == "buttoncheck3") label = label + " (" + label3 + ")";
      let powlabel = game.i18n.localize("SW25.Item.Power");
      if (item.type == "monsterability") powlabel = labelmonpow;
      if (buttonType == "buttonpower") label = label + " (" + powlabel + ")";

      const targetRoll = await targetRollDialog(targetTokens, label);
      if (targetRoll == "cancel") {
        return;
      } else if (targetRoll == "once") {
        return await chatRoll(targetTokens);
      } else if (targetRoll == "individual") {
        let chatMessageId = [];
        for (const [index, token] of Array.from(targetTokens).entries()) {
          const targetToken = new Set([token]);
          await chatRoll(targetToken).then((result) => {
            chatMessageId.push(result.chatMessageId);
          });
        }

        // rendar apply all message
        const speaker = ChatMessage.getSpeaker({ actor: actor });
        let chatapply = "-";
        let checktype = null;
        let powertype = null;
        if (buttonType == "buttoncheck") {
          chatapply = item.system.applycheck;
          checktype = item.system.checkTypesButton;
        }
        if (buttonType == "buttoncheck1") {
          chatapply = item.system.applycheck1;
          checktype = item.system.checkTypesButton1;
        }
        if (buttonType == "buttoncheck2") {
          chatapply = item.system.applycheck2;
          checktype = item.system.checkTypesButton2;
        }
        if (buttonType == "buttoncheck3") {
          chatapply = item.system.applycheck3;
          checktype = item.system.checkTypesButton3;
        }
        if (buttonType == "buttonpower") {
          chatapply = item.system.applypower;
          powertype = item.system.powerTypesButton;
        }

        let chatData = {
          speaker: speaker,
          flavor: `${label} - <b>${game.i18n.localize("SW25.Applyall")}</b>`,
        };
        chatData.flags = {
          sw25: {
            targetMessage: chatMessageId,
          },
        };
        chatData.content = await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-applyall.hbs",
          {
            apply: chatapply,
            checktype: checktype,
            powertype: powertype,
          }
        );

        ChatMessage.create(chatData);
        return;
      }
    }

    await chatRoll();
  } else if (buttonType == "target-select") {
    const selectedTokens = await targetSelectDialog(chatMessage.flavor);
    
    if (selectedTokens.length === 0) {
      return;
    }
    const target = selectedTokens.map((target) => target.id);
    const targetNames = selectedTokens
      .map((target) => ">>> " + target.document.name)
      .join("<br>");
    const flags = chatMessage.flags;
    const targetStr = `<span class="targetname">${targetNames}</span>`;

    flags.sw25.target = target;
    flags.sw25.targetName = targetNames;

    const parser = new DOMParser();
    const doc = parser.parseFromString(chatMessage.content, 'text/html');

    const button = doc.querySelector('button.buttonclick.chat-target[data-buttontype="target-select"]');
    if (button) {
        button.innerHTML = targetStr;
    }

    await chatMessage.update({
      content: doc.body.innerHTML,
      flags: flags,
    });
  }

  async function chatRoll(targetTokens) {
    const label1 = item.system.label1;
    const label2 = item.system.label2;
    const label3 = item.system.label3;
    const labelmonpow = item.system.labelmonpow;

    // Roll Setting
    if (buttonType == "buttoncheck") {
      item.system.checkbase = item.system.checkbase;
      if (item.system.usefix == true) {
        item.system.formula = 7;
      } else if (item.system.customdice == true)
        item.system.formula = item.system.customformula;
      else item.system.formula = "2d6";
    }
    if (buttonType == "buttoncheck1") {
      item.system.checkbase1 = item.system.checkbase1;
      if (item.system.usefix1 == true) {
        item.system.formula1 = 7;
      } else if (item.system.customdice1 == true)
        item.system.formula1 = item.system.customformula1;
      else item.system.formula1 = "2d6";
    }
    if (buttonType == "buttoncheck2") {
      item.system.checkbase2 = item.system.checkbase2;
      if (item.system.usefix2 == true) {
        item.system.formula2 = 7;
      } else if (item.system.customdice2 == true)
        item.system.formula2 = item.system.customformula2;
      else item.system.formula2 = "2d6";
    }
    if (buttonType == "buttoncheck3") {
      item.system.checkbase3 = item.system.checkbase3;
      if (item.system.usefix3 == true) {
        item.system.formula3 = 7;
      } else if (item.system.customdice3 == true)
        item.system.formula3 = item.system.customformula3;
      else item.system.formula3 = "2d6";
    }
    if (buttonType == "buttonpower") {
      item.system.formula = "2d6";

      if (item.system.cvalue == null || item.system.cvalue == 0)
        item.system.cvalue = 10;
      if (!actor.system.effect) actor.system.efcmod = 0;
      else if (actor.system.effect.efcvalue)
        actor.system.efcmod = Number(actor.system.effect.efcvalue);
      else actor.system.efcmod = 0;
      if (item.type == "spell") {
        if (!actor.system.effect) actor.system.efcmod = 0;
        else if (actor.system.effect.efspellcvalue)
          actor.system.efcmod = Number(actor.system.effect.efspellcvalue);
        else actor.system.efcmod = 0;
      }
      item.system.totalcvalue =
        Number(item.system.cvalue) + Number(actor.system.efcmod);

      let halfpow, halfpowmod, lethaltech, criticalray, pharmtool, powup;
      if (item.system.halfpow == true) halfpow = 1;
      else halfpow = 0;
      if (item.system.halfpowmod == null || item.system.halfpowmod == 0)
        halfpowmod = 0;
      else halfpowmod = item.system.halfpowmod;
      if (item.type == "weapon" && actor.system.attributes.efwphalfmod)
        halfpowmod =
          Number(halfpowmod) + Number(actor.system.attributes.efwphalfmod);
      if (item.type == "spell" && actor.system.attributes.efsphalfmod)
        halfpowmod =
          Number(halfpowmod) + Number(actor.system.attributes.efsphalfmod);
      if (item.system.lethaltech == null || item.system.lethaltech == 0)
        lethaltech = 0;
      else lethaltech = item.system.lethaltech;
      if (item.system.criticalray == null || item.system.criticalray == 0)
        criticalray = 0;
      else criticalray = item.system.criticalray;
      if (item.system.pharmtool == null || item.system.pharmtool == 0)
        pharmtool = 0;
      else pharmtool = item.system.pharmtool;
      if (item.system.powup == null || item.system.powup == 0) powup = 0;
      else powup = item.system.powup;

      // was: [itemData.type] (ReferenceError) and powerroll.all (wrong key)
      let powmod =
        Number(actor.system.attributes?.powertablemod?.[item.type]) || 0;
      powmod += Number(actor.system.attributes?.powertablemod?.all) || 0;

      item.system.powertable = [
        item.system.power,
        item.system.totalcvalue,
        0,
        item.system.pt3,
        item.system.pt4,
        item.system.pt5,
        item.system.pt6,
        item.system.pt7,
        item.system.pt8,
        item.system.pt9,
        item.system.pt10,
        item.system.pt11,
        item.system.pt12,
        item.system.powerbase,
        halfpow,
        halfpowmod,
        lethaltech,
        criticalray,
        pharmtool,
        powup,
        powmod,
      ];
    }

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: actor });
    const rollMode = game.settings.get("core", "rollMode");
    let label = `${item.name}`;
    let chatresuse = "";
    let chatapply = "-";
    let checktype = item.system.checkTypesButton;
    let baseformula = item.system.formula;
    let checkbase = "0";

    if (
      buttonType == "buttoncheck" ||
      buttonType == "buttoncheck1" ||
      buttonType == "buttoncheck2" ||
      buttonType == "buttoncheck3"
    ) {
      const rollData = item.getRollData();

      if (buttonType == "buttoncheck1") {
        label = label + " (" + label1 + ")";
        chatapply = item.system.applycheck1;
        checktype = item.system.checkTypesButton1;
        baseformula = item.system.checkformula1;
        checkbase = item.system.checkbase1;
      } else if (buttonType == "buttoncheck2") {
        label = label + " (" + label2 + ")";
        chatapply = item.system.applycheck2;
        checktype = item.system.checkTypesButton2;
        baseformula = item.system.checkformula2;
        checkbase = item.system.checkbase2;
      } else if (buttonType == "buttoncheck3") {
        label = label + " (" + label3 + ")";
        chatapply = item.system.applycheck3;
        checktype = item.system.checkTypesButton3;
        baseformula = item.system.checkformula3;
        checkbase = item.system.checkbase3;
      } else {
        label = label + " (" + game.i18n.localize("SW25.Check") + ")";
        chatapply = item.system.applycheck;
        checktype = item.system.checkTypesButton;
        baseformula = item.system.checkformula;
        checkbase = item.system.checkbase;
      }

      let resuse = item.system.resuse;
      if (resuse !== "" && item.system.autouseres) {
        let actoritem = actor.items.get(resuse);
        let resusequantity = item.system.resusequantity;
        let actoritemquantity = actoritem.system.quantity;
        let remainingquantity = actoritemquantity - resusequantity;
        let min = actoritem.system.qmin;

        if (actoritemquantity < resusequantity) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
          );
          return;
        } else if (remainingquantity < min) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
          );
          return;
        } else {
          actoritem.update({ "system.quantity": remainingquantity });
          chatresuse = `<div style="text-align: right;">${actoritem.name}: ${actoritemquantity} >>> ${remainingquantity}</div>`;
        }
      }

      let formula = baseformula + "+" + checkbase;

      let roll = new Roll(formula, rollData);
      await roll.evaluate();

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        rolls: [roll],
      };

      let chatFormula = roll.formula;
      let chatCritical = null;
      let chatFumble = null;
      let chatTotal = roll.total;
      if (roll.terms[0].total == 12) chatCritical = 1;
      if (roll.terms[0].total == 2) chatFumble = 1;
      // when selected target
      let target = null;
      let targetName = null;
      if (targetTokens) {
        const targetArray = Array.from(targetTokens);
        target = targetArray.map((target) => target.id);
        let targetNames = targetArray.map((target) => target.document.name);
        targetName = ``;
        for (let i = 0; i < targetNames.length; i++) {
          if (i != 0) targetName = targetName + `<br>`;
          targetName = targetName + `>>> ${targetNames[i]}`;
        }
        targetName = targetName + ``;
      }

      // [2026-10-07] «Точность» of a monster attack rolled from the item card: offer the
      // same Dodge contest as the sheet row does (the card used to be a dead end)
      const lineLabel = { buttoncheck1: label1, buttoncheck2: label2, buttoncheck3: label3 }[buttonType];
      const cardResist =
        !opts.targets && target?.length && item.type === "monsterability" && isLabel(lineLabel, "MonHit")
          ? { name: game.i18n.localize("SW25.Resist.Check.Dodge"), key: "Dodge", result: "disappear" }
          : null;

      chatData.flags = {
        sw25: {
          // [2026-10-07] element tags for monster «Урон» lines (fire breath vs resistances)
          tags: DamageSupporter.createChatTag(
            DamageSupporter.elementsOf(item),
            actor ? actor.system.attributes?.damage : null,
            actor ? actor.system.classType : null,
            DamageSupporter.getWeaponAttributes(item)
          ),
          total: chatTotal,
          apply: chatapply,
          rolls: roll,
          checktype: checktype,
          target,
          targetName: targetName,
          dohalf: false,
          orgtotal: chatTotal,
          ...(cardResist ? { resist: cardResist, kind: "check", itemid: item.id, formula: chatFormula } : {}),
        },
      };

      chatData.content = await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-check.hbs",
        {
          formula: chatFormula,
          tooltip: await roll.getTooltip(),
          critical: chatCritical,
          fumble: chatFumble,
          total: chatTotal,
          apply: chatapply,
          checktype: checktype,
          resusetext: chatresuse,
          targetName: targetName,
          resist: cardResist && (!game.settings.get("sw25", "autoResistNonPC") || Array.from(targetTokens ?? []).some((t) => t.actor?.type === "character")) ? cardResist : null,
        }
      );

      let chatMessageId;
      await ChatMessage.create(chatData).then((chatMessage) => {
        chatMessageId = chatMessage.id;
      });

      return { roll, chatMessageId };
    }

    if (buttonType == "buttonpower") {
      if (item.type == "monsterability")
        label = label + " (" + labelmonpow + ")";
      else label = label + " (" + game.i18n.localize("SW25.Item.Power") + ")";
      const formula = item.system.formula;
      const powertable = item.system.powertable;

      let roll = await powerRoll(formula, powertable);

      let cValueFormula = "@" + roll.cValue;
      let halfFormula = "";
      let lethalTechFormula = "";
      let criticalRayFormula = "";
      let pharmToolFormula = "";
      let powupFormula = "";
      if (roll.cValue == 100) cValueFormula = "@13";
      if (roll.halfPow == 1) halfFormula = "h+" + roll.halfPowMod;
      else if (roll.halfPowMod && roll.halfPowMod != 0)
        halfFormula = "+" + roll.halfPowMod;
      if (roll.lethalTech != 0) lethalTechFormula = "#" + roll.lethalTech;
      if (roll.criticalRay > 0) criticalRayFormula = "$+" + roll.criticalRay;
      else if (roll.criticalRay != 0)
        criticalRayFormula = "$" + roll.criticalRay;
      if (roll.pharmTool != 0) pharmToolFormula = "tf" + roll.pharmTool;
      if (roll.powup != 0) powupFormula = "r" + roll.powup;

      let chatFormula =
        "k" +
        roll.power +
        cValueFormula +
        "+" +
        roll.powMod +
        lethalTechFormula +
        criticalRayFormula +
        pharmToolFormula +
        powupFormula +
        halfFormula;

      let chatPower = roll.power;
      let chatLethalTech = null;
      let chatCriticalRay = null;
      let chatPharmTool = null;
      let chatPowup = null;
      let chatResult = roll.eachPowerResult;
      let chatMod = roll.powMod;
      let chatModTotal = roll.powMod;
      if (roll.halfPow == 0 && roll.halfPowMod && roll.halfPowMod != 0)
        chatModTotal += roll.halfPowMod;
      let chatHalf = null;
      let chatResults = roll.rawPowerResult;
      let chatTotal = roll.powerResult;
      let chatExtraRoll = null;
      let chatFumble = null;
      if (roll.halfPow == 1) chatHalf = roll.halfPowMod;
      if (roll.lethalTech != 0) chatLethalTech = roll.lethalTech;
      if (roll.criticalRay != 0) chatCriticalRay = roll.criticalRay;
      if (roll.pharmTool != 0) chatPharmTool = roll.pharmTool;
      if (roll.powup != 0) chatPowup = roll.powup;
      if (roll.rollCount > 0) chatExtraRoll = roll.rollCount;
      if (roll.fumble == 1) chatFumble = roll.fumble;

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        rolls: [roll.fakeResult],
      };

      let showhalf = true;
      let shownoc = true;
      if (roll.halfPow == 1) {
        showhalf = false;
        shownoc = false;
      }
      if (roll.cValue == 100 || chatExtraRoll == null) shownoc = false;
      let chatapply = item.system.applypower;
      let powertype = item.system.powerTypesButton;

      // when selected target
      let target = null;
      let targetName = null;
      if (targetTokens) {
        const targetArray = Array.from(targetTokens);
        target = targetArray.map((target) => target.id);
        let targetNames = targetArray.map((target) => target.document.name);
        targetName = ``;
        for (let i = 0; i < targetNames.length; i++) {
          if (i != 0) targetName = targetName + `<br>`;
          targetName = targetName + `>>> ${targetNames[i]}`;
        }
        targetName = targetName + ``;
      }

      // [2026-10-07] power cards rolled from a chat button (one-click spells, contest
      // damage) carried no element tags, so weaknesses/resistances were ignored
      const tags = DamageSupporter.createChatTag(
        DamageSupporter.elementsOf(item),
        actor ? actor.system.attributes?.damage : null,
        actor ? actor.system.classType : null,
        DamageSupporter.getWeaponAttributes(item)
      );

      chatData.flags = {
        sw25: {
          tags: tags,
          formula: chatFormula,
          tooltip: await roll.fakeResult.getTooltip(),
          power: chatPower,
          lethalTech: chatLethalTech,
          criticalRay: chatCriticalRay,
          pharmTool: chatPharmTool,
          powup: chatPowup,
          result: chatResult,
          mod: chatMod,
          modTotal: chatModTotal,
          half: chatHalf,
          results: chatResults,
          total: chatTotal,
          extraRoll: chatExtraRoll,
          fumble: chatFumble,
          orghalf: roll.halfPowMod,
          orgtotal: chatTotal,
          orgextraRoll: chatExtraRoll,
          showhalf: showhalf,
          shownoc: shownoc,
          apply: chatapply,
          powertype: powertype,
          target,
          targetName: targetName,
        },
      };

      chatData.content = await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-power.hbs",
        {
          formula: chatFormula,
          tooltip: await roll.fakeResult.getTooltip(),
          power: chatPower,
          lethalTech: chatLethalTech,
          criticalRay: chatCriticalRay,
          pharmTool: chatPharmTool,
          powup: chatPowup,
          result: chatResult,
          mod: chatModTotal,
          half: chatHalf,
          results: chatResults,
          total: chatTotal,
          extraRoll: chatExtraRoll,
          fumble: chatFumble,
          showhalf: showhalf,
          shownoc: shownoc,
          apply: chatapply,
          powertype: powertype,
          targetName: targetName,
        }
      );

      let chatMessageId;
      await ChatMessage.create(chatData).then((chatMessage) => {
        chatMessageId = chatMessage.id;
      });

      return { roll, chatMessageId };
    }
  }
  if (buttonType == "buttonhalf") {
    let halftotal =
      Math.ceil(
        (chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod) / 2
      ) + chatMessage.flags.sw25.orghalf;
    let newextraRoll = null;
    let aftermod = chatMessage.flags.sw25.aftermod ?? 0;

    if (
      chatMessage.flags.sw25.dohalf == false ||
      chatMessage.flags.sw25.dohalf == null
    ) {
      let newtotal = halftotal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${halftotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: true,
            dohalfc: false,
            noc: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal,
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.mod,
            half: chatMessage.flags.sw25.orghalf,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: newextraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfdone: true,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: chatMessage.flags.sw25.nocdone,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };

      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      const html = $(`.message[data-message-id="${chatMessage.id}"]`);
      html.find(".dice-tooltip").removeClass("expanded");

      return;
    }
    if (chatMessage.flags.sw25.dohalf == true) {
      let newtotal = chatMessage.flags.sw25.orgtotal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${chatMessage.flags.sw25.orgtotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            dohalfc: false,
            noc: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.modTotal,
            half: chatMessage.flags.sw25.half,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: chatMessage.flags.sw25.extraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfdone: false,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: chatMessage.flags.sw25.nocdone,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };

      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      const html = $(`.message[data-message-id="${chatMessage.id}"]`);
      html.find(".dice-tooltip").removeClass("expanded");

      return;
    }
  }
  if (buttonType == "buttonhalfc") {
    let halfctoal =
      Math.ceil(
        (chatMessage.flags.sw25.results + chatMessage.flags.sw25.mod) / 2
      ) + chatMessage.flags.sw25.orghalf;
    let newextraRoll = chatMessage.flags.sw25.extraRoll;
    let aftermod = chatMessage.flags.sw25.aftermod ?? 0;

    if (
      chatMessage.flags.sw25.dohalfc == false ||
      chatMessage.flags.sw25.dohalfc == null
    ) {
      let newtotal = halfctoal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${halfctoal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            dohalfc: true,
            noc: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.mod,
            half: chatMessage.flags.sw25.orghalf,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: newextraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfcdone: true,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: chatMessage.flags.sw25.nocdone,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };
      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      return;
    }
    if (chatMessage.flags.sw25.dohalfc == true) {
      let newtotal = chatMessage.flags.sw25.orgtotal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${chatMessage.flags.sw25.orgtotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            dohalfc: false,
            noc: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.modTotal,
            half: chatMessage.flags.sw25.half,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: chatMessage.flags.sw25.extraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfcdone: false,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: chatMessage.flags.sw25.nocdone,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };
      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      return;
    }
  }
  if (buttonType == "buttonnoc") {
    let noctotal =
      chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod;
    let newextraRoll = null;
    let aftermod = chatMessage.flags.sw25.aftermod ?? 0;

    if (
      chatMessage.flags.sw25.noc == false ||
      chatMessage.flags.sw25.noc == null
    ) {
      let newtotal = noctotal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${noctotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            dohalfc: false,
            noc: true,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.mod,
            half: chatMessage.flags.sw25.half,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: newextraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfdone: chatMessage.flags.sw25.halfdone,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: true,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            targetName: chatMessage.flags.sw25.targetName,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };
      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      return;
    }
    if (chatMessage.flags.sw25.noc == true) {
      let newtotal = chatMessage.flags.sw25.orgtotal + Number(aftermod);
      // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
      const isFumble = !!chatMessage.flags.sw25.fumble;
      if (isFumble) newtotal = 0;
      let newtotaltext = newtotal;
      if (aftermod != 0 && !isFumble)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${chatMessage.flags.sw25.orgtotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            dohalfc: false,
            noc: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            powertype: chatMessage.flags.sw25.powertype,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-power.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            power: chatMessage.flags.sw25.power,
            lethalTech: chatMessage.flags.sw25.lethalTech,
            criticalRay: chatMessage.flags.sw25.criticalRay,
            pharmTool: chatMessage.flags.sw25.pharmTool,
            result: chatMessage.flags.sw25.result,
            mod: chatMessage.flags.sw25.mod,
            half: chatMessage.flags.sw25.half,
            results: chatMessage.flags.sw25.results,
            total: newtotaltext,
            extraRoll: chatMessage.flags.sw25.extraRoll,
            fumble: chatMessage.flags.sw25.fumble,
            halfdone: chatMessage.flags.sw25.halfdone,
            showhalf: chatMessage.flags.sw25.showhalf,
            nocdone: false,
            shownoc: chatMessage.flags.sw25.shownoc,
            apply: chatMessage.flags.sw25.apply,
            powertype: chatMessage.flags.sw25.powertype,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };
      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      return;
    }
  }

  if (buttonType == "buttondecrease") {
    let aftermod = -1;
    if (chatMessage.flags.sw25.aftermod)
      aftermod = Number(chatMessage.flags.sw25.aftermod) - 1;
    if (aftermod > 0) aftermod = `+${aftermod}`;

    let orgtotal = chatMessage.flags.sw25.orgtotal;
    let halfdone = false;
    let halfcdone = false;
    let nocdone = false;
    let newextraRoll = chatMessage.flags.sw25.extraRoll;
    if (chatMessage.flags.sw25.dohalf) {
      orgtotal =
        Math.ceil(
          (chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod) / 2
        ) + chatMessage.flags.sw25.orghalf;
      halfdone = true;
      newextraRoll = null;
    }
    if (chatMessage.flags.sw25.dohalfc) {
      orgtotal =
        Math.ceil(
          (chatMessage.flags.sw25.results + chatMessage.flags.sw25.mod) / 2
        ) + chatMessage.flags.sw25.orghalf;
      halfcdone = true;
    }
    if (chatMessage.flags.sw25.noc) {
      orgtotal = chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod;
      nocdone = true;
      newextraRoll = null;
    }

    let newtotal = Number(orgtotal) + Number(aftermod);
    // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
    const isFumble = !!chatMessage.flags.sw25.fumble;
    if (isFumble) newtotal = 0;
    let newtotaltext = newtotal;
    if (aftermod != 0 && !isFumble)
      newtotaltext = `
          ${newtotal}<span style="font-size: 0.6em;"> (${orgtotal}${aftermod})</span>
        `;

    let chatData = {
      flags: {
        sw25: {
          total: newtotal,
          aftermod: aftermod,
          powertype: chatMessage.flags.sw25.powertype,
          targetName: chatMessage.flags.sw25.targetName,
          elements: chatMessage.flags.sw25.elements,
          damage: chatMessage.flags.sw25.damage,
          tags: chatMessage.flags.sw25.tags,
        },
      },
      content: await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-power.hbs",
        {
          formula: chatMessage.flags.sw25.formula,
          tooltip: chatMessage.flags.sw25.tooltip,
          power: chatMessage.flags.sw25.power,
          lethalTech: chatMessage.flags.sw25.lethalTech,
          criticalRay: chatMessage.flags.sw25.criticalRay,
          pharmTool: chatMessage.flags.sw25.pharmTool,
          result: chatMessage.flags.sw25.result,
          mod: chatMessage.flags.sw25.mod,
          half: chatMessage.flags.sw25.orghalf,
          results: chatMessage.flags.sw25.results,
          total: newtotaltext,
          extraRoll: newextraRoll,
          fumble: chatMessage.flags.sw25.fumble,
          halfdone: halfdone,
          halfcdone: halfcdone,
          nocdone: nocdone,
          showhalf: chatMessage.flags.sw25.showhalf,
          shownoc: chatMessage.flags.sw25.shownoc,
          apply: chatMessage.flags.sw25.apply,
          powertype: chatMessage.flags.sw25.powertype,
          targetName: chatMessage.flags.sw25.targetName,
          tags: chatMessage.flags.sw25.tags,
        }
      ),
    };

    await chatMessage.update({
      content: chatData.content,
      flags: chatData.flags,
    });
    const html = $(`.message[data-message-id="${chatMessage.id}"]`);
    html.find(".dice-tooltip").removeClass("expanded");

    return;
  }

  if (buttonType == "buttonincrease") {
    let aftermod = 1;
    if (chatMessage.flags.sw25.aftermod)
      aftermod = Number(chatMessage.flags.sw25.aftermod) + 1;
    if (aftermod > 0) aftermod = `+${aftermod}`;

    let orgtotal = chatMessage.flags.sw25.orgtotal;
    let halfdone = false;
    let halfcdone = false;
    let nocdone = false;
    let newextraRoll = chatMessage.flags.sw25.extraRoll;
    if (chatMessage.flags.sw25.dohalf) {
      orgtotal =
        Math.ceil(
          (chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod) / 2
        ) + chatMessage.flags.sw25.orghalf;
      halfdone = true;
      newextraRoll = null;
    }
    if (chatMessage.flags.sw25.dohalfc) {
      orgtotal =
        Math.ceil(
          (chatMessage.flags.sw25.results + chatMessage.flags.sw25.mod) / 2
        ) + chatMessage.flags.sw25.orghalf;
      halfcdone = true;
    }
    if (chatMessage.flags.sw25.noc) {
      orgtotal = chatMessage.flags.sw25.result[0] + chatMessage.flags.sw25.mod;
      nocdone = true;
      newextraRoll = null;
    }

    let newtotal = Number(orgtotal) + Number(aftermod);
    // 1-1 on the power roll = 0 damage, whatever half/crit/+- toggles say
    const isFumble = !!chatMessage.flags.sw25.fumble;
    if (isFumble) newtotal = 0;
    let newtotaltext = newtotal;
    if (aftermod != 0 && !isFumble)
      newtotaltext = `
          ${newtotal}<span style="font-size: 0.6em;"> (${orgtotal}${aftermod})</span>
        `;

    let chatData = {
      flags: {
        sw25: {
          total: newtotal,
          aftermod: aftermod,
          powertype: chatMessage.flags.sw25.powertype,
          targetName: chatMessage.flags.sw25.targetName,
          elements: chatMessage.flags.sw25.elements,
          damage: chatMessage.flags.sw25.damage,
          tags: chatMessage.flags.sw25.tags,
        },
      },
      content: await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-power.hbs",
        {
          formula: chatMessage.flags.sw25.formula,
          tooltip: chatMessage.flags.sw25.tooltip,
          power: chatMessage.flags.sw25.power,
          lethalTech: chatMessage.flags.sw25.lethalTech,
          criticalRay: chatMessage.flags.sw25.criticalRay,
          pharmTool: chatMessage.flags.sw25.pharmTool,
          result: chatMessage.flags.sw25.result,
          mod: chatMessage.flags.sw25.mod,
          half: chatMessage.flags.sw25.orghalf,
          results: chatMessage.flags.sw25.results,
          total: newtotaltext,
          extraRoll: newextraRoll,
          fumble: chatMessage.flags.sw25.fumble,
          halfdone: halfdone,
          halfcdone: halfcdone,
          nocdone: nocdone,
          showhalf: chatMessage.flags.sw25.showhalf,
          shownoc: chatMessage.flags.sw25.shownoc,
          apply: chatMessage.flags.sw25.apply,
          powertype: chatMessage.flags.sw25.powertype,
          targetName: chatMessage.flags.sw25.targetName,
          tags: chatMessage.flags.sw25.tags,
        }
      ),
    };

    await chatMessage.update({
      content: chatData.content,
      flags: chatData.flags,
    });
    const html = $(`.message[data-message-id="${chatMessage.id}"]`);
    html.find(".dice-tooltip").removeClass("expanded");

    return;
  }

  if (buttonType == "checkhalf") {
    let halftotal = Math.ceil(chatMessage.flags.sw25.orgtotal / 2);
    let aftermod = chatMessage.flags.sw25.aftermod ?? 0;
    let roll = chatMessage.flags.sw25.rolls;
    let rollTotal =
      roll.terms[0].results[0].result + roll.terms[0].results[1].result;
    let chatCritical = null;
    let chatFumble = null;
    if (rollTotal == 12) chatCritical = 1;
    if (rollTotal == 2) chatFumble = 1;
    if (
      chatMessage.flags.sw25.dohalf == false ||
      chatMessage.flags.sw25.dohalf == null
    ) {
      let newtotal = halftotal + Number(aftermod);
      let newtotaltext = newtotal;
      if (aftermod != 0)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${halftotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: true,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal,
            aftermod: aftermod,
            critical: chatCritical,
            fumble: chatFumble,
            checktype: chatMessage.flags.sw25.checktype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-check.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            result: chatMessage.flags.sw25.result,
            total: newtotaltext,
            critical: chatCritical,
            fumble: chatFumble,
            halfdone: true,
            apply: chatMessage.flags.sw25.apply,
            checktype: chatMessage.flags.sw25.checktype,
            targetName: chatMessage.flags.sw25.targetName,
            resist: chatMessage.flags.sw25.resist,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };

      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      const html = $(`.message[data-message-id="${chatMessage.id}"]`);
      html.find(".dice-tooltip").removeClass("expanded");

      return;
    }
    if (chatMessage.flags.sw25.dohalf == true) {
      let newtotal = chatMessage.flags.sw25.orgtotal + Number(aftermod);
      let newtotaltext = newtotal;
      if (aftermod != 0)
        newtotaltext = `
            ${newtotal}<span style="font-size: 0.6em;"> (${chatMessage.flags.sw25.orgtotal}${aftermod})</span>
          `;
      let chatData = {
        flags: {
          sw25: {
            dohalf: false,
            apply: chatMessage.flags.sw25.apply,
            total: newtotal, // was without aftermod: applied value != shown value
            aftermod: aftermod,
            critical: chatCritical,
            fumble: chatFumble,
            checktype: chatMessage.flags.sw25.checktype,
            targetName: chatMessage.flags.sw25.targetName,
            elements: chatMessage.flags.sw25.elements,
            damage: chatMessage.flags.sw25.damage,
            tags: chatMessage.flags.sw25.tags,
          },
        },
        content: await renderTemplate(
          "systems/sw25-ru/templates/roll/roll-check.hbs",
          {
            formula: chatMessage.flags.sw25.formula,
            tooltip: chatMessage.flags.sw25.tooltip,
            result: chatMessage.flags.sw25.result,
            total: newtotaltext,
            critical: chatCritical,
            fumble: chatFumble,
            halfdone: false,
            apply: chatMessage.flags.sw25.apply,
            checktype: chatMessage.flags.sw25.checktype,
            targetName: chatMessage.flags.sw25.targetName,
            resist: chatMessage.flags.sw25.resist,
            tags: chatMessage.flags.sw25.tags,
          }
        ),
      };

      await chatMessage.update({
        content: chatData.content,
        flags: chatData.flags,
      });
      const html = $(`.message[data-message-id="${chatMessage.id}"]`);
      html.find(".dice-tooltip").removeClass("expanded");

      return;
    }
  }

  if (buttonType == "applycancel") {
    const targetToken = canvas.tokens.get(chatMessage.flags.sw25.targetToken);
    const targetActor = targetToken.actor;
    let resultHP = targetActor.system.hp.value;
    let resultMP = targetActor.system.mp.value;
    if (chatMessage.flags.sw25.type == "buttonmr") {
      resultMP = chatMessage.flags.sw25.beforeValue;
    } else {
      resultHP = chatMessage.flags.sw25.beforeValue;
    }
    const secUndo = chatMessage.flags.sw25.sectionDeltas;
    if (Array.isArray(secUndo)) {
      // [Round 79] the card changed sections: put back exactly what it changed
      if (secUndo.length) await undoSectionDeltas(targetToken, secUndo);
      if (secUndo.length && chatMessage.isOwner) await chatMessage.update({ "flags.sw25.sectionDeltas": [] });
    } else if (game.user.isGM || targetActor.isOwner) {
      targetActor.update({
        "system.hp.value": resultHP,
        "system.mp.value": resultMP,
      });
    } else {
      emitToGM({
        method: "applyRoll",
        targetToken: chatMessage.flags.sw25.targetToken,
        resultHP: resultHP,
        resultMP: resultMP,
        beforeHP: targetActor.system.hp.value,
        beforeMP: targetActor.system.mp.value,
      });
    }

    let content = await renderTemplate(
      "systems/sw25-ru/templates/roll/roll-apply.hbs",
      {
        target: targetToken.document.name,
        type: buttonType,
        cancel: true,
      }
    );
    chatMessage.update({ content: content });
  }

  if (buttonType == "checkdecrease" || buttonType == "checkincrease") {
    let aftermod = 0;
    if (buttonType == "checkdecrease") aftermod = -1;
    if (buttonType == "checkincrease") aftermod = 1;

    if (chatMessage.flags.sw25.aftermod)
      aftermod = Number(chatMessage.flags.sw25.aftermod) + aftermod;
    if (aftermod > 0) aftermod = `+${aftermod}`;

    let orgtotal = chatMessage.flags.sw25.orgtotal;
    if (chatMessage.flags.sw25.dohalf)
      orgtotal = Math.ceil(chatMessage.flags.sw25.orgtotal / 2);

    let newtotal = Number(orgtotal) + Number(aftermod);
    let newtotaltext = newtotal;
    if (aftermod != 0)
      newtotaltext = `
          ${newtotal}<span style="font-size: 0.6em;"> (${orgtotal}${aftermod})</span>
        `;

    let roll = chatMessage.flags.sw25.rolls;
    let rollTotal =
      roll.dice.size > 0
        ? roll.terms[0].results[0].result + roll.terms[0].results[1].result
        : 0;
    let chatCritical = null;
    let chatFumble = null;
    if (rollTotal == 12) chatCritical = 1;
    if (rollTotal == 2) chatFumble = 1;
    let halfdone = chatMessage.flags.sw25.dohalf
      ? chatMessage.flags.sw25.dohalf
      : false;

    let chatData = {
      flags: {
        sw25: {
          total: newtotal,
          apply: chatMessage.flags.sw25.apply,
          spell: chatMessage.flags.sw25.spell,
          rolls: chatMessage.flags.sw25.rolls,
          formula: chatMessage.flags.sw25.formula,
          tooltip: chatMessage.flags.sw25.tooltip,
          orgtotal: chatMessage.flags.sw25.orgtotal,
          critical: chatCritical,
          fumble: chatFumble,
          dohalf: halfdone,
          aftermod: aftermod,
          checktype: chatMessage.flags.sw25.checktype,
          targetName: chatMessage.flags.sw25.targetName,
          elements: chatMessage.flags.sw25.elements,
          damage: chatMessage.flags.sw25.damage,
          tags: chatMessage.flags.sw25.tags,
        },
      },
      content: await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-check.hbs",
        {
          formula: chatMessage.flags.sw25.formula,
          tooltip: chatMessage.flags.sw25.tooltip,
          critical: chatCritical,
          fumble: chatFumble,
          result: chatMessage.flags.sw25.result,
          total: newtotaltext,
          halfdone: halfdone,
          apply: chatMessage.flags.sw25.apply,
          spell: chatMessage.flags.sw25.spell,
          checktype: chatMessage.flags.sw25.checktype,
          targetName: chatMessage.flags.sw25.targetName,
          resist: chatMessage.flags.sw25.resist,
          tags: chatMessage.flags.sw25.tags,
        }
      ),
    };

    await chatMessage.update({
      content: chatData.content,
      flags: chatData.flags,
    });
    const html = $(`.message[data-message-id="${chatMessage.id}"]`);
    html.find(".dice-tooltip").removeClass("expanded");

    return;
  }

  if (
    buttonType == "buttonpd" ||
    buttonType == "buttonmd" ||
    buttonType == "buttoncd" ||
    buttonType == "buttonhr" ||
    buttonType == "buttonmr"
  ) {
    let targetTokenId;
    if (!chatMessage.flags.sw25.target) {
      const targetTokens = game.user.targets;

      // if no target,show dialog
      if (targetTokens.size === 0) {
        let type = "";
        switch (buttonType) {
          case "buttonpd":
            type = game.i18n.localize("SW25.Item.pd");
            break;
          case "buttonmd":
            type = game.i18n.localize("SW25.Item.md");
            break;
          case "buttoncd":
            type = game.i18n.localize("SW25.Item.cd");
            break;
          case "buttonhr":
            type = game.i18n.localize("SW25.Item.hr");
            break;
          case "buttonmr":
            type = game.i18n.localize("SW25.Item.mr");
            break;
        }
        const title = `${type} - ${chatMessage.flavor}`;
        const selectedTokens = await targetSelectDialog(title);
        selectedTokens.forEach((token) => game.user.targets.add(token));
        if (!selectedTokens) {
          return;
        }
      }

      const targetTokenIds = [];
      targetTokens.forEach((token) => {
        targetTokenIds.push(token.id);
      });
      for (let i = 0; i < targetTokenIds.length; i++) {
        targetTokenId = targetTokenIds[i];
        await applyExec(targetTokenId);
      }
    } else {
      for (let i = 0; i < chatMessage.flags.sw25.target.length; i++) {
        const targetToken = canvas.tokens.get(chatMessage.flags.sw25.target[i]);
        targetTokenId = targetToken.id;
        await applyExec(targetTokenId);
      }
    }

    // reset target
    game.user.targets.forEach((target) => target.setTarget(false));

    async function applyExec(targetTokenId) {
      const targetToken = canvas.tokens.get(targetTokenId);
      const targetActor = targetToken.actor;
      let targetHP = targetActor.system.hp.value;
      let targetMP = targetActor.system.mp.value;
      let targetMaxHP = targetActor.system.hp.max;
      let targetMaxMP = targetActor.system.mp.max;
      let targetPP = 0;
      let targetMPP = 0;
      if (targetActor.type == "character") {
        targetPP = targetActor.system.attributes.protectionpoint;
        targetMPP = targetActor.system.attributes.magicprotection;
      } else if (targetActor.type == "monster") {
        targetPP = targetActor.system.pp;
        targetMPP = targetActor.system.mpp;
      } else if (targetActor.type == "npc") {
        targetPP = targetActor.system.pp;
        targetMPP = targetActor.system.mpp;
      }
      let resultHP = targetHP;
      let resultMP = targetMP;

      let resultValue = chatMessage.flags.sw25.total;
      let differenceValue = 0;

      const decay = targetActor.system.attributes?.decay || null;
      const targetClass = targetActor.system.classType;
      const tags = chatMessage.flags.sw25.tags;
      const result = DamageSupporter.calcDamage(
        resultValue,
        tags,
        decay,
        targetClass,
        buttonType
      );
      resultValue = result ? result.total : resultValue;

      // [Round 79] multi-section monster: the card hits the current target
      // section, or every standing section when the roll came from an area attack
      if (sectionsOf(targetActor) && ["buttonpd", "buttonmd", "buttoncd", "buttonhr"].includes(buttonType)) {
        const out = await applyToSections(targetToken, buttonType, resultValue, {
          all: !!chatMessage.flags.sw25.allSections,
          healReverseBonus: Number(targetActor.system.attributes?.healreversebonus) || 0,
        });
        if (out) {
          const esc = (v) => Handlebars.escapeExpression(String(v ?? ""));
          let content = await renderTemplate("systems/sw25-ru/templates/roll/roll-apply.hbs", {
            value: out.value,
            target: `${targetToken.document.name} — ${out.label}`,
            type: buttonType,
            beforeValue: out.before,
            afterValue: out.after,
            isView: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <= targetActor.ownership.default,
            result: result,
          });
          if (out.all)
            content += `<div class="sw25-apply-secs">${out.lines
              .map((l) => `${esc(l.name)} ${l.delta > 0 ? "+" : ""}${l.delta}`)
              .join(" · ")}</div>`;
          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: `${chatMessage.flavor}`,
            rollMode: game.settings.get("core", "rollMode"),
            content,
            flags: {
              sw25: {
                targetToken: targetTokenId,
                type: buttonType,
                beforeValue: out.before,
                afterValue: out.after,
                result: result,
                sectionDeltas: out.actual,
              },
            },
          });
          return;
        }
      }

      if (buttonType == "buttonpd") {
        resultHP = targetHP - Math.max(0, resultValue - targetPP);
        differenceValue = targetHP - resultHP;
      }
      if (buttonType == "buttonmd") {
        resultHP = targetHP - Math.max(0, resultValue - targetMPP);
        differenceValue = targetHP - resultHP;
      }
      if (buttonType == "buttoncd") {
        resultHP = targetHP - resultValue;
        differenceValue = targetHP - resultHP;
      }
      if (buttonType == "buttonhr") {
        // SW25-RU: некоторые монстры (нежить и т.п.) книгой помечены как
        // "Восстановление ОЖ наносит урон вместо этого" — лечение им
        // вредит. Строго опционально: срабатывает только если у ЦЕЛИ
        // явно выставлен положительный system.attributes.healreversebonus
        // (по умолчанию 0/не выставлен ни у кого — обычное лечение не
        // затронуто). Значение поля — это одновременно и флаг, и
        // бонусный урон сверх нанесённого лечения (книжное "+N очков").
        const healReverseBonus = Number(targetActor.system.attributes?.healreversebonus) || 0;
        if (healReverseBonus > 0) {
          resultHP = targetHP - (resultValue + healReverseBonus);
          differenceValue = targetHP - resultHP;
        } else {
          if (targetHP + resultValue < targetMaxHP) {
            resultHP = targetHP + resultValue;
          } else resultHP = targetMaxHP;
          differenceValue = resultHP - targetHP;
        }
      }
      if (buttonType == "buttonmr") {
        if (targetMP + resultValue < targetMaxMP) {
          resultMP = targetMP + resultValue;
        } else resultMP = targetMaxMP;
        differenceValue = resultMP - targetMP;
      }

      if (game.user.isGM || targetActor.isOwner) {
        targetActor.update({
          "system.hp.value": resultHP,
          "system.mp.value": resultMP,
        });
      } else {
        emitToGM({
          method: "applyRoll",
          targetToken: targetTokenId,
          resultHP: resultHP,
          resultMP: resultMP,
          beforeHP: targetHP,
          beforeMP: targetMP,
        });
      }

      let isView = false;
      let beforeValue = null;
      let afterValue = null;
      if (
        CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER <=
        targetActor.ownership.default
      ) {
        isView = true;
      }
      if (buttonType == "buttonmr") {
        beforeValue = targetMP;
        afterValue = resultMP;
      } else {
        beforeValue = targetHP;
        afterValue = resultHP;
      }

      const speaker = ChatMessage.getSpeaker({ actor: actor });
      const rollMode = game.settings.get("core", "rollMode");
      let label = `${chatMessage.flavor}`;

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        flags: {
          sw25: {
            targetToken: targetTokenId,
            type: buttonType,
            beforeValue: beforeValue,
            afterValue: afterValue,
            result: result,
          },
        },
      };

      chatData.content = await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-apply.hbs",
        {
          value: differenceValue,
          target: targetToken.document.name,
          type: buttonType,
          beforeValue: beforeValue,
          afterValue: afterValue,
          isView: isView,
          result: result,
        }
      );

      await ChatMessage.create(chatData); // awaited: keeps the summary parent context
    }
  }

  if (buttonType == "buttoneffect") {
    const orgActor = actor.name;
    const orgId = actor._id;
    const targetEffects = item.effects;
    const targetActorName = [];
    const transferEffectName = [];
    const targetTokens = game.user.targets;

    // if no target,show dialog
    if (targetTokens.size === 0) {
      const title = `${item.name} (${game.i18n.localize("SW25.Effectslong")})`;
      const selectedTokens = await targetSelectDialog(title);
      if (!selectedTokens?.length) return;
      selectedTokens.forEach((token) => game.user.targets.add(token));
    }

    // Target Actor
    const targetActors = [];
    targetTokens.forEach((token) => {
      targetActors.push(token.actor);

      // Actor name stock for chat message
      const actorName = token.actor.name;
      targetActorName.push({ actorName });
    });

    // Effect name stock for chat message
    targetEffects.forEach((effect) => {
      const effectName = effect.name;
      transferEffectName.push({ effectName });
    });

    // Apply
    const targetTokenId = Array.from(targetTokens, (target) => target.id);
    if (game.user.isGM) {
      // [2026-10-07] same rules as the socket path: keep the template's own flags
      // (periodic damage etc.) and replace an earlier copy instead of stacking
      const copies = targetEffects.map((effect) => {
        const e = effect.toObject();
        delete e._id;
        e.disabled = false;
        e.origin = e.origin || item.uuid;
        e.flags = { ...(e.flags ?? {}), sw25: { ...(e.flags?.sw25 ?? {}), sourceName: orgActor, sourceId: `Actor.${orgId}` } };
        return e;
      });
      for (const targetActor of targetActors) {
        if (!targetActor) continue;
        const dup = targetActor.effects.filter((x) => copies.some((n) => n.origin === x.origin && n.name === x.name)).map((x) => x.id);
        if (dup.length) await targetActor.deleteEmbeddedDocuments("ActiveEffect", dup);
        if (copies.length) await targetActor.createEmbeddedDocuments("ActiveEffect", copies);
      }
    } else {
      emitToGM({
        method: "applyEffect",
        targetTokens: targetTokenId,
        targetEffects: targetEffects,
        orgActor: orgActor,
        orgId: orgId,
      });
    }

    // reset target
    game.user.targets.forEach((target) => target.setTarget(false));

    // Chat message
    const speaker = ChatMessage.getSpeaker({ actor: actor });
    let label = game.i18n.localize("SW25.Effectslong");
    let chatActorName = "";
    let chatEffectName = "";

    for (let i = 0; i < targetActorName.length; i++) {
      chatActorName += ">>> " + targetActorName[i].actorName + "<br>";
    }
    for (let i = 0; i < transferEffectName.length; i++) {
      chatEffectName += transferEffectName[i].effectName + "<br>";
    }

    let chatData = {
      speaker: speaker,
      flavor: label,
    };
    chatData.content = await renderTemplate(
      "systems/sw25-ru/templates/roll/effect-apply.hbs",
      {
        targetActorName: chatActorName,
        transferEffectName: chatEffectName,
      }
    );

    ChatMessage.create(chatData);
  }

  if (
    buttonType == "buttonpdall" ||
    buttonType == "buttonmdall" ||
    buttonType == "buttoncdall" ||
    buttonType == "buttonhrall" ||
    buttonType == "buttonmrall"
  ) {
    const targetMessages = chatMessage.flags.sw25.targetMessage;
    let type = "";
    switch (buttonType) {
      case "buttonpdall":
        type = "buttonpd";
        break;
      case "buttonmdall":
        type = "buttonmd";
        break;
      case "buttoncdall":
        type = "buttoncd";
        break;
      case "buttonhrall":
        type = "buttonhr";
        break;
      case "buttonmrall":
        type = "buttonmr";
        break;
      default:
        break;
    }
    for (let i = 0; i < targetMessages.length; i++) {
      const targetMessage = game.messages.get(targetMessages[i]);
      chatButton(targetMessage, type);
    }
    return;
  }

  if (buttonType == "buttonmp") {
    const selectedTokens = await Util.getControlledActorFromUser();

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }
    const token = selectedTokens[0];
    const cost = item.system.mpcost;
    const name = item.name;
    const type = item.type;
    const meta = 1;
    mpCost(token, cost, name, type, meta);
  }

  if (buttonType == "buttonhp") {
    const selectedTokens = await Util.getControlledActorFromUser();

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }
    const token = selectedTokens[0];
    const cost = item.system.hpcost;
    const max = item.system.maxhpcost;
    const name = item.name;
    const type = item.type;
    hpCost(token, cost, max, name, type);
  }

  if (buttonType == "buttonresource") {
    const speaker = ChatMessage.getSpeaker({ actor: actor });
    let resuse = item.system.resuse;
    let resusequantity = item.system.resusequantity;
    let actoritem = actor.items.get(resuse);
    let actoritemquantity = actoritem.system.quantity;
    let remainingquantity = actoritemquantity - resusequantity;
    let min = actoritem.system.qmin;

    if (actoritemquantity < resusequantity) {
      ui.notifications.warn(
        game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
      );
      return;
    } else if (remainingquantity < min) {
      ui.notifications.warn(
        game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
      );
      return;
    } else {
      actoritem.update({ "system.quantity": remainingquantity });

      let chatData = {
        speaker: speaker,
      };

      chatData.content = `<div style="text-align: right;">${actoritem.name}: ${actoritemquantity} >>> ${remainingquantity}</div>`;

      ChatMessage.create(chatData);
    }
  }

  if (buttonType == "buttonmeta") {
    let token = canvas.tokens.get(chatMessage.flags.sw25.tokenId);
    let cost = chatMessage.flags.sw25.cost;
    let name = chatMessage.flags.sw25.name;
    let type = chatMessage.flags.sw25.type;
    let fluc = chatMessage.flags.sw25.fluc;
    let meta;
    if (chatMessage.flags.sw25.meta == false) meta = 1;
    else meta = Number(chatMessage.flags.sw25.meta) + 1;
    let chat = chatMessage;
    let base = chatMessage.flags.sw25.base;

    mpCost(token, cost, name, type, meta, chat, base, fluc);
  }

  if (buttonType == "mpdecrease" || buttonType == "mpincrease") {
    let fluc = 0;
    if (buttonType == "mpdecrease") fluc = -1;
    if (buttonType == "mpincrease") fluc = 1;

    if (chatMessage.flags.sw25.fluc)
      fluc = Number(chatMessage.flags.sw25.fluc) + fluc;

    let token = canvas.tokens.get(chatMessage.flags.sw25.tokenId);
    let cost = chatMessage.flags.sw25.cost;
    let name = chatMessage.flags.sw25.name;
    let type = chatMessage.flags.sw25.type;
    let meta = chatMessage.flags.sw25.meta ?? 1;
    let chat = chatMessage;
    let base = chatMessage.flags.sw25.base;

    mpCost(token, cost, name, type, meta, chat, base, fluc);
  }

  if (buttonType == "buttonhpcancel") {
    let token = canvas.tokens.get(chatMessage.flags.sw25.tokenId);
    let cost = chatMessage.flags.sw25.cost;
    let name = chatMessage.flags.sw25.name;
    let type = chatMessage.flags.sw25.type;
    let meta = 0;
    let chat = chatMessage;
    let base = chatMessage.flags.sw25.base;

    // Apply HP cost (to the token that paid it, not the world actor)
    const costActor = token?.actor ?? actor;
    if (game.user.isGM || costActor.isOwner) {
      costActor.update({
        "system.hp.value": base,
      });
    } else {
      emitToGM({
        method: "applyHp",
        targetToken: chatMessage.flags.sw25.tokenId,
        resultHP: base,
        beforeHP: costActor.system.hp.value,
      });
    }

    // Apply ChatMessage
    let label =
      name +
      " (" +
      cost +
      " " +
      game.i18n.localize("SW25.Item.Spell.Cancel") +
      ")";

    let chatData = {
      flavor: label,
    };

    chatData.content = await renderTemplate(
      "systems/sw25-ru/templates/roll/hp-apply.hbs",
      {
        targetHP: base,
        resultHP: base,
      }
    );
    await chat.update(chatData);
  }

  if (buttonType == "buttonmpcancel") {
    let token = canvas.tokens.get(chatMessage.flags.sw25.tokenId);
    let cost = chatMessage.flags.sw25.cost;
    let name = chatMessage.flags.sw25.name;
    let type = chatMessage.flags.sw25.type;
    let meta = 0;
    let chat = chatMessage;
    let base = chatMessage.flags.sw25.base;

    // Apply MP cost (to the token that paid it, not the world actor)
    const costActor = token?.actor ?? actor;
    if (game.user.isGM || costActor.isOwner) {
      costActor.update({
        "system.mp.value": base,
      });
    } else {
      emitToGM({
        method: "applyMp",
        targetToken: chatMessage.flags.sw25.tokenId,
        resultMP: base,
        beforeMP: costActor.system.mp.value,
      });
    }

    // Apply ChatMessage
    let label =
      name +
      " (" +
      cost +
      " " +
      game.i18n.localize("SW25.Item.Spell.Cancel") +
      ")";
    let metaB = false;
    if (type == "spell") metaB = true;

    let chatData = {
      flavor: label,
      flags: {
        sw25: {
          meta: meta,
          type: type,
        },
      },
    };
    chatData.content = await renderTemplate(
      "systems/sw25-ru/templates/roll/mp-apply.hbs",
      {
        targetMP: base,
        resultMP: base,
        metaB: metaB,
      }
    );
    await chat.update(chatData);
  }

  if (String(buttonType).startsWith("lootcard:")) {
    const f = chatMessage.flags?.sw25 ?? {};
    const grant = f.lootGrants?.[Number(String(buttonType).split(":")[1])];
    const owner = f.lootActorUuid ? await fromUuid(f.lootActorUuid) : null;
    const a = owner?.actor ?? owner;
    if (!grant || !a?.isOwner) return ui.notifications.warn(L2("Превратить добычу в карту может только её владелец.", "Only the owner of the loot can turn it into a card."));
    const label = await lootToCard(a, grant);
    if (label) ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: a }), content: `<div class="sw25-cast-mp">${Handlebars.escapeExpression(grant.name)} → <b>${Handlebars.escapeExpression(label)}</b> (+1)</div>` });
    return;
  }

  if (buttonType == "buttonloot") {
    const selectedTokens = await Util.getControlledActorFromUser();

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    } else if (selectedTokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
      return;
    }
    const lootActor = selectedTokens[0].actor;
    // [Round 88] the loot goes to a character's inventory, never to the monster itself
    if (lootActor.type === "monster") {
      ui.notifications.warn(L2("Добыча: выберите токен персонажа, который её забирает (сейчас выбран монстр).", "Loot: select the token of the character who takes it (a monster is selected now)."));
      return;
    }
    const lootItems = chatMessage.flags.sw25.loot;
    const speaker = ChatMessage.getSpeaker({ actor: lootActor });
    const rollMode = game.settings.get("core", "rollMode");
    const rollData = lootActor.getRollData();
    let label =
      `${chatMessage.speaker.alias}` +
      " (" +
      game.i18n.localize("SW25.Monster.Loot") +
      ")";
    let formula = "2d6";
    let lootmod =
      Number(lootActor.system.lootmod) + Number(lootActor.system.eflootmod);
    if (lootmod && lootmod != 0) formula = formula + "+" + lootmod;

    let roll = new Roll(formula, rollData);
    await roll.evaluate();

    let chatData = {
      speaker: speaker,
      flavor: label,
      rollMode: rollMode,
      rolls: [roll],
    };

    let chatFormula = roll.formula;
    let chatTotal = roll.total;
    let chatLootItem = null;

    for (let i = 0; i < lootItems.length; i++) {
      let min = lootItems[i].range.min;
      let max = lootItems[i].range.max;
      if (min == "etc" || max == "etc") continue;
      if (chatTotal >= min && chatTotal <= max)
        chatLootItem = lootItems[i].item;
    }

    chatData.content = await renderTemplate(
      "systems/sw25-ru/templates/roll/roll-check.hbs",
      {
        formula: chatFormula,
        tooltip: await roll.getTooltip(),
        total: chatTotal,
        chatLootItem,
      }
    );
    // [Round 83] the loot goes straight into the roller's inventory: the rolled
    // line, plus the «Всегда» lines on the first roll for this monster
    const lootFrom = chatMessage.flags?.sw25?.name ?? "";
    const lootGrants = [];
    if (!chatMessage.flags.sw25.lootCount)
      for (const li of lootItems) if (li.always) { const g = await grantLoot(lootActor, li.item, lootFrom); if (g) lootGrants.push(g); }
    if (chatLootItem) { const g = await grantLoot(lootActor, chatLootItem, lootFrom); if (g) lootGrants.push(g); }
    if (lootGrants.length) {
      const escL = (v) => Handlebars.escapeExpression(String(v ?? ""));
      chatData.content += lootGrants.map((g, i) => `<div class="sw25-cast-mp">${L2("В инвентарь", "To inventory")} (${escL(lootActor.name)}): <b>${escL(g.name)}</b>${g.qty > 1 ? ` ×${g.qty}` : ""}${g.price ? ` · ${g.price} G` : ""}${
        g.rank && g.colors.length ? ` <button class="buttonclick" data-buttontype="lootcard:${i}" style="width:auto;display:inline-block;line-height:1.4;font-size:.85em" title="${L2("Превратить одну штуку в карту Алхимика", "Turn one into an Alchemist card")}"><i class="fa-solid fa-clone"></i> ${L2("в карту", "to card")} (${escL(g.material)})</button>` : ""}</div>`).join("");
    }
    // [Round 74] the session pool picks the result up (active GM)
    chatData.flags = { sw25: { kind: "loot", lootItem: chatLootItem, lootFrom, lootGrants, lootActorUuid: lootActor.uuid } };

    ChatMessage.create(chatData);

    const lootFlag = chatMessage.flags;
    const lootCount = chatMessage.flags.sw25.lootCount
      ? Number(chatMessage.flags.sw25.lootCount) + 1
      : 1;
    lootFlag.sw25.lootCount = lootCount;

    const lootContent = await renderTemplate(
      "systems/sw25-ru/templates/roll/lootlist.hbs",
      {
        flavor: chatMessage.flags.sw25.name,
        lootlist: chatMessage.flags.sw25.lootlist,
        lootCount: lootCount,
      }
    );

    if (game.user.isGM) {
      await chatMessage.update({
        content: lootContent,
        flags: lootFlag,
      });
    } else {
      emitToGM({
        method: "updateChat",
        id: chatMessage.id,
        content: lootContent,
        flags: lootFlag,
      });
    }

    return roll;
  }

  if (buttonType == "buttonrollreq" || buttonType == "buttonresist") {
    let roll;
    const flags = chatMessage.flags;
    const target = flags.sw25.target;
    // [Round 66] resolve targets on any scene (GM may view another scene)
    let selectedTokens = target
      ? target
          .map(
            (id) =>
              canvas.tokens.get(id) ??
              game.scenes.get(chatMessage.speaker?.scene)?.tokens.get(id)
          )
          .filter(Boolean)
      : await Util.getControlledActorFromUser();

    // [Round 66] auto-resolve: only the given defenders
    if (opts.onlyTokens) {
      selectedTokens = selectedTokens.filter((t) => opts.onlyTokens.includes(t.id));
    }
    // [Round 66] a click rolls only for defenders the clicker controls
    // (the GM controls monsters; a player only their own character).
    if (buttonType == "buttonresist" && target && !opts.onlyTokens && !game.user.isGM) {
      selectedTokens = selectedTokens.filter((t) => t.actor?.isOwner);
      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Resist.SelectDefender"));
        return;
      }
    }

    // [Round 66] "Evasion / resist" is rolled by the DEFENDER. When the card
    // has no stored target, the clicker's own token was used — so a player
    // clicking it on their own attack rolled evasion for their attacker.
    // Never roll the resist for the actor who made the roll.
    if (buttonType == "buttonresist" && !target) {
      const speakerActor = ChatMessage.getSpeakerActor(chatMessage.speaker);
      selectedTokens = selectedTokens.filter(
        (t) => !speakerActor || t.actor?.uuid !== speakerActor.uuid
      );
      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Resist.SelectDefender"));
        return;
      }
    }

    if (selectedTokens.length === 0) {
      ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
      return;
    }

    // [Round 90] one defender resists one attack once (a double click used to roll the save and the damage again)
    if (buttonType == "buttonresist") {
      const doneIds = new Set(
        game.messages
          .filter((x) => x.flags?.sw25?.contest && x.flags.sw25.attackMessageId === chatMessage.id)
          .map((x) => x.flags.sw25.targetTokenId)
      );
      const fresh = selectedTokens.filter((t) => !doneIds.has(t.id) && !_resistLock.has(`${chatMessage.id}:${t.id}`));
      if (fresh.length < selectedTokens.length) ui.notifications.warn(L2("Эта цель уже сопротивлялась этой атаке.", "This target has already resisted this attack."));
      selectedTokens = fresh;
      if (selectedTokens.length === 0) return;
      for (const t of selectedTokens) _resistLock.add(`${chatMessage.id}:${t.id}`);
      setTimeout(() => selectedTokens.forEach((t) => _resistLock.delete(`${chatMessage.id}:${t.id}`)), 15000);
    }

    if (buttonType == "buttonresist") {
      flags.sw25.targetValue = flags.sw25.total;
      flags.sw25.method = "check";
      // [Round 66] the name was localized on the ATTACKER's client; use this
      // client's language so monster/PC resist items are found (en vs ru).
      const rkey = resistKeyOf(flags.sw25.resist);
      flags.sw25.checkName =
        rkey && rkey !== "input"
          ? game.i18n.localize(`SW25.Resist.Check.${rkey}`)
          : flags.sw25.resist.name;
    }

    for (let token of selectedTokens) {
      const selectActor = token.actor;
      const rollData = selectActor.getRollData();

      let name = token.name;
      let checkItem = "";
      let checkName = flags.sw25.checkName;
      let checkbase;
      let checkformula = "2d6";

      if (checkName == "di") checkName = flags.sw25.inputName;

      if (selectActor.type == "character") {
        // [Round 66] the PC's resist check items carry Russian names while the
        // client UI may be English: accept any language's name + the world
        // setting for Стойкость/Воля.
        const rk = buttonType == "buttonresist" ? resistKeyOf(flags.sw25.resist) : null;
        const altNames =
          rk === "Vitres"
            ? [game.settings.get("sw25", "effectVitResPC"), ...RESIST_NAMES.Vitres]
            : rk === "Mndres"
            ? [game.settings.get("sw25", "effectMndResPC"), ...RESIST_NAMES.Mndres]
            : [];
        for (const item of selectActor.items) {
          if (
            item.type == flags.sw25.method &&
            (checkName == item.name || altNames.includes(item.name))
          ) {
            checkItem = item;
            break;
          }
        }
      } else if (selectActor.type == "monster") {
        // [Round 77] multi-section monsters: the targeted section's attack item first
        for (const item of sectionOrder(selectActor, selectActor.items.filter(
          (i) => i.type === "monsterability"
        ))) {
          if (checkName == game.i18n.localize("SW25.Resist.Check.Dodge")) {
            if (
              isLabel(item.system.label1, "MonHit") &&
              isLabel(item.system.label2, "MonDmg") &&
              isLabel(item.system.label3, "MonDge")
            ) {
              checkItem = item;
              checkbase = item.system.checkbase3;
              if (item.system.usefix3 == true) checkformula = 7;
              break;
            }
          } else if (
            checkName == game.i18n.localize("SW25.Resist.Check.Vitres")
          ) {
            if (isLabel(item.name, "MonRes")) {
              checkItem = item;
              checkbase = item.system.checkbase1;
              if (item.system.usefix1 == true) checkformula = 7;
              break;
            }
          } else if (
            checkName == game.i18n.localize("SW25.Resist.Check.Mndres")
          ) {
            if (isLabel(item.name, "MonRes")) {
              checkItem = item;
              checkbase = item.system.checkbase2;
              if (item.system.usefix2 == true) checkformula = 7;
              break;
            }
          }
        }
        if (checkbase) {
          if (checkbase >= 0) checkbase = `+ ${checkbase}`;
          else if (checkbase < 0) checkbase = `${checkbase}`;
        }
      }

      const item = checkItem;
      const itemData = item.system;
      let dodgeskill = "";

      if (selectActor.type == "character") {
        if (flags.sw25.method == "skill") {
          let skillbase;
          if (checkName == "adv") {
            checkName = `${game.i18n.localize("SW25.Attributes.Advlevel")}`;
            skillbase =
              selectActor.system.abilities[flags.sw25.refAbility].advbase;
          } else if (itemData) {
            skillbase = itemData.skillbase[flags.sw25.refAbility];
          } else checkbase = 0;
          if (skillbase >= 0) checkbase = `+ ${skillbase}`;
          if (skillbase < 0) checkbase = `${skillbase}`;
          if (flags.sw25.refAbility != "-") {
            let abi =
              " + " +
              game.i18n.localize(
                `SW25.Ability.${flags.sw25.refAbility.capitalize()}.abbr`
              );
            checkName = `${checkName}${abi}`;
          }
        } else if (flags.sw25.method == "check") {
          if (itemData) {
            if (itemData.checkbase >= 0) checkbase = `+ ${itemData.checkbase}`;
            if (itemData.checkbase < 0) checkbase = `${itemData.checkbase}`;
          } else if (
            checkName == game.i18n.localize("SW25.Resist.Check.Dodge")
          ) {
            checkbase = `+ ${selectActor.system.dodgebase}`;
            dodgeskill = selectActor.system.dodgeskill;
          } else checkbase = 0;
        }
      }

      let flagMod = parseInt(flags.sw25.modifier, 10);
      flagMod = isNaN(flagMod) ? "" : flagMod;
      if (0 < flagMod) {
        flagMod = `+ ${flagMod}`;
      }

      // Build "<dice> + base + mod" safely: a base of 0 used to give "2d60",
      // an unmatched base gave "2d6undefined" (Roll throws).
      const toTerm = (v) => {
        if (v === undefined || v === null || v === "") return "";
        if (typeof v === "string") return ` ${v}`;
        const n = Number(v) || 0;
        return n > 0 ? ` + ${n}` : n < 0 ? ` - ${-n}` : "";
      };
      let formula =
        item || checkName == game.i18n.localize("SW25.Resist.Check.Dodge")
          ? checkformula + toTerm(checkbase) + toTerm(flagMod)
          : checkformula + toTerm(flagMod);
      if (flags.sw25.checkName == "adv")
        formula = checkformula + toTerm(checkbase) + toTerm(flagMod);

      roll = new Roll(formula, rollData);
      await roll.evaluate();

      const speaker = ChatMessage.getSpeaker({ actor: selectActor });
      // [Round 66] automatic saves of monsters/NPCs are GM-only rolls:
      // players see the outcome on the action card, not the numbers
      const rollMode =
        opts.onlyTokens && selectActor.type !== "character"
          ? "gmroll"
          : game.settings.get("core", "rollMode");
      let label = `${game.i18n.localize("SW25.Check")}`;

      if (checkName) {
        label = `${checkName} (${game.i18n.localize("SW25.Check")})`;
      }

      if (checkName == game.i18n.localize("SW25.Resist.Check.Dodge")) {
        // [Round 72] no dodge class (e.g. a caster) = direct roll
        label = dodgeskill && dodgeskill != "-"
          ? `${checkName} (${dodgeskill})`
          : `${checkName} (${game.i18n.localize("SW25.Contest.DirectRoll")})`;
      } else if (checkName && !item && flags.sw25.checkName != "adv") {
        label = `${game.i18n.localize("SW25.StraightRoll")}
        - ${checkName} (${game.i18n.localize("SW25.Check")})`;
      }
      label += flags.sw25.targetValue ? "/" + flags.sw25.targetValue : "";

      let resultText = "";
      let fumble =
        roll.terms[0]?.results?.[0]?.result === 1 &&
        roll.terms[0]?.results?.[1]?.result === 1;

      let critical =
        roll.terms[0]?.results?.[0]?.result === 6 &&
        roll.terms[0]?.results?.[1]?.result === 6;

      let targetValues;

      if (flags.sw25.targetValue) {
        if (typeof flags.sw25.targetValue === "number") {
          targetValues = [flags.sw25.targetValue];
        } else if (typeof flags.sw25.targetValue === "string") {
          targetValues = flags.sw25.targetValue.match(/[/,／， 　]/)
            ? flags.sw25.targetValue
                .split(/[/,／， 　]/)
                .map((v) => parseInt(v, 10))
                .filter((v) => !isNaN(v))
            : [parseInt(flags.sw25.targetValue, 10)].filter((v) => !isNaN(v));
        } else {
          targetValues = [];
        }

        let successCount = 0;

        let chatData = {
          speaker: speaker,
          flavor: label,
          rollMode: rollMode,
          rolls: [roll],
        };

        for (let target of targetValues) {
          if (roll.total >= target) {
            successCount++;
          }
        }

        if (successCount > 0) {
          if (targetValues.length > 1) {
            resultText = `<span class="success"> ${successCount} ${game.i18n.localize(
              "SW25.Success"
            )} ▶ </span>`;
          } else {
            resultText = `<span class="success"> ${game.i18n.localize(
              "SW25.Success"
            )} ▶ </span>`;
          }
        } else {
          resultText = `<span class="failed"> ${game.i18n.localize(
            "SW25.Failed"
          )} ▶ </span>`;
        }
      }

      if (critical) {
        resultText = `<span class="success">${game.i18n.localize(
          "SW25.Auto"
        )}${game.i18n.localize("SW25.Success")} ▶ </span>`;
      }
      if (fumble) {
        resultText = `<span class="failed"> ${game.i18n.localize(
          "SW25.Auto"
        )}${game.i18n.localize("SW25.Failed")} ▶ </span>`;
      }

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        rolls: [roll],
      };

      let chatFormula = roll.formula;
      if (flags.sw25.targetValue)
        chatFormula =
          roll.formula + ` >= ${parseInt(flags.sw25.targetValue, 10)}`;
      let chatTotal = roll.total;
      if (critical)
        chatTotal = `${Number(
          roll.total + 5
        )} <span style="font-size:0.7em;"> ( ${roll.total} + 5 )</span>`;

      chatData.content = await renderTemplate(
        "systems/sw25-ru/templates/roll/roll-check.hbs",
        {
          name: name,
          formula: chatFormula,
          tooltip: await roll.getTooltip(),
          total: chatTotal,
          resultText,
        }
      );

      // [Round 66] contest outcome + one-click damage (resist rolls only)
      let outcome = null;
      if (buttonType == "buttonresist") {
        outcome = await resolveContest(chatMessage, roll, token);
        if (outcome) {
          chatData.content += outcome.html;
          chatData.flags = { sw25: outcome.flags };
        }
      }

      ChatMessage.applyRollMode(chatData, rollMode);
      delete chatData.rollMode;
      const contestMsg = await ChatMessage.create(chatData);
      // [Round 66] one-click spells: effect templates land on the target
      // when the save failed (or when a successful save only shortens it)
      const af = chatMessage.flags?.sw25;
      if (outcome && af?.spellcast && (!outcome.flags.defenderWins || af.resist?.result === "shortening")) {
        const srcActor = ChatMessage.getSpeakerActor(chatMessage.speaker);
        const srcItem = srcActor?.items.get(af.itemid);
        const tok = canvas.tokens.get(token.id) ?? token;
        if (srcItem) await applyItemEffects(srcActor, srcItem, [tok], { shortened: !!outcome.flags.defenderWins });
      }
      // spells cast with auto-cast: damage follows immediately, no button
      if (outcome?.flags?.damageMode && chatMessage.flags?.sw25?.autoDamage && contestMsg) {
        await autoDamage(contestMsg, { auto: true });
      }
    }

    return roll;
  }

  // [Round 66] "Снять" in a summary row = cancel that hidden apply card
  if (buttonType.startsWith("childcancel:")) {
    const child = game.messages.get(buttonType.split(":")[1]);
    if (!child) return;
    if (!(game.user.isGM || child.isOwner)) {
      ui.notifications.warn(game.i18n.localize("SW25.Contest.AttackerOnly"));
      return;
    }
    await chatButton(child, "applycancel");
    return;
  }

  if (buttonType.startsWith("childdamage:")) {
    const child = game.messages.get(buttonType.split(":")[1]);
    if (child) await autoDamage(child);
    return;
  }

  // [Round 66] "Урон" button on a resolved contest card
  if (buttonType == "autodamage") {
    await autoDamage(chatMessage);
    return;
  }

  if (buttonType.endsWith("-buttonaction")) {
    const itemId = buttonType.replace(/-buttonaction$/, "");
    const item = actor.items.get(itemId);

    // cancel message
    if (itemId == "cancel") {
      const content = actor.system.canceldialog;
      let chatData = {
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        type: CONST.CHAT_MESSAGE_STYLES.IC,
        content: content,
      };
      ChatMessage.create(chatData);
    } else {
      if (item.system.dialog) {
        const content = item.system.dialog;
        let chatData = {
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          type: CONST.CHAT_MESSAGE_STYLES.IC,
          content: content,
        };
        ChatMessage.create(chatData);
      }
      // action item
      item.roll();
    }
  }
}


/* -------------------------------------------- */
/*  [Round 66] Contest resolution & auto damage  */
/* -------------------------------------------- */

// Resist names in every shipped language -> stable key.
const RESIST_NAMES = {
  Dodge: ["Уклонение", "Evasion", "Dodge", "回避"],
  Vitres: ["Стойкость", "Fortitude", "生命抵抗力"],
  Mndres: ["Воля", "Willpower", "精神抵抗力"],
};

/** Stable resist key ("Dodge" | "Vitres" | "Mndres" | "input") of a card's resist data. */
export function resistKeyOf(resist) {
  if (!resist) return null;
  if (resist.key) return resist.key;
  for (const [key, names] of Object.entries(RESIST_NAMES)) {
    if (names.includes(resist.name)) return key;
    if (resist.name === game.i18n.localize(`SW25.Resist.Check.${key}`)) return key;
  }
  return resist.name ? "input" : null;
}

function diceOf(roll) {
  const r = roll?.dice?.[0]?.results ?? roll?.terms?.[0]?.results ?? [];
  return r.map((x) => x.result);
}

/**
 * SW2.5 contest (book I p.99): the attacker is the active side.
 *  - active 1-1: fails, passive wins;  - passive 6-6: passive wins;
 *  - active 6-6: active wins (unless passive also 6-6);
 *  - passive 1-1: active wins;  - otherwise ties go to the PASSIVE side.
 */
async function resolveContest(attackMsg, defRoll, defToken) {
  const f = attackMsg.flags?.sw25 ?? {};
  const key = resistKeyOf(f.resist);
  if (!key) return null;

  const [a1, a2] = diceOf(attackMsg.rolls?.[0]);
  const [d1, d2] = diceOf(defRoll);
  const attackCrit = f.critical == 1 || (a1 === 6 && a2 === 6);
  const attackFumble = f.fumble == 1 || (a1 === 1 && a2 === 1);
  const defCrit = d1 === 6 && d2 === 6;
  const defFumble = d1 === 1 && d2 === 1;
  const atk = Number(f.total) || 0;
  const def = Number(defRoll.total) || 0;

  let defenderWins;
  if (attackFumble) defenderWins = true;
  else if (defCrit) defenderWins = true;
  else if (attackCrit) defenderWins = false;
  else if (defFumble) defenderWins = false;
  else defenderWins = def >= atk;

  const L = (k) => game.i18n.localize(`SW25.Contest.${k}`);
  const result = f.resist?.result;
  let label;
  let damageMode = null;
  if (key === "Dodge") {
    label = defenderWins ? L("Miss") : L("Hit");
    damageMode = defenderWins ? null : "full";
  } else if (!defenderWins) {
    label = L("ResistFailed");
    damageMode = "full";
  } else if (result === "halving") {
    label = L("ResistHalf");
    damageMode = "half";
  } else if (result === "disappear") {
    label = L("ResistNegated");
  } else {
    label = L("Resisted");
    damageMode = result === "shortening" ? "full" : null;
  }

  const atkActor = ChatMessage.getSpeakerActor(attackMsg.speaker);
  const item = atkActor?.items.get(f.itemid);
  const hasPower = !!item && (item.type === "weapon" || !!item.system.usepower || !!monsterDamageLine(item));
  const vs = `${L("Atk")} ${attackCrit ? "6-6" : attackFumble ? "1-1" : atk} · ${L(key === "Dodge" ? "DefDodge" : "DefSave")} ${defCrit ? "6-6" : defFumble ? "1-1" : def}`;
  let html = `<div class="sw25-contest ${defenderWins ? "sw25-contest-miss" : "sw25-contest-hit"}"><b>${label}</b> <span class="sw25-contest-vs">(${vs})</span></div>`;
  if (damageMode && hasPower) {
    html += `<div class="flexrow"><button class="buttonclick sw25-autodamage" data-buttontype="autodamage"><i class="fa-solid fa-burst"></i>&nbsp;${
      damageMode === "half" ? L("DamageHalf") : L("Damage")
    }</button></div>`;
  }
  return {
    html,
    flags: {
      contest: true,
      parentId: attackMsg.id,
      attackMessageId: attackMsg.id,
      targetTokenId: defToken.id,
      defenderWins,
      damageMode: hasPower ? damageMode : null,
    },
  };
}

/** [Round 72] index (1-3) of a monster ability's «Урон» line, or 0. */
function monsterDamageLine(item) {
  if (item?.type !== "monsterability") return 0;
  for (const n of [1, 2, 3]) if (item.system[`usedice${n}`] && isLabel(item.system[`label${n}`], "MonDmg")) return n;
  return 0;
}

/** Which apply button counts as "the damage" for this attack. */
function pickApplyType(item, resistKey) {
  const types = (item?.system?.powerTypesButton ?? []).filter((t) =>
    ["pd", "md", "cd"].includes(t)
  );
  if (item?.system?.applypower === "custom" && types.length === 1) return types[0];
  if (item?.system?.applypower === "custom" && types.length > 1)
    return resistKey === "Dodge" && types.includes("pd") ? "pd" : types[0];
  return resistKey === "Dodge" ? "pd" : "md";
}

const _damageDone = new Set();

/**
 * Roll the attacker's power against one target and apply it.
 * applyType: "pd" | "md" | "cd" | "hr" | "mr" | null (null = roll only,
 * leave the apply buttons to the players).
 */
export async function rollAndApplyDamage(atkMsg, tok, mode = "full", applyType) {
  return withParent(atkMsg.id, () => _rollAndApplyDamage(atkMsg, tok, mode, applyType));
}
async function _rollAndApplyDamage(atkMsg, tok, mode, applyType) {
  const atkActor = ChatMessage.getSpeakerActor(atkMsg.speaker);
  const atkItem = atkActor?.items.get(atkMsg.flags?.sw25?.itemid);
  if (!atkItem) {
    ui.notifications.warn(game.i18n.localize("SW25.Contest.NoItem"));
    return null;
  }
  // [Round 72] monster attack: the damage is the «Урон» line of the same
  // ability (e.g. 2d+2), applied as physical damage (armour counts)
  const dmgLine = !atkItem.system.usepower ? monsterDamageLine(atkItem) : 0;
  if (dmgLine) {
    const r = await chatButton(atkMsg, `buttoncheck${dmgLine}`, { targets: tok ? new Set([tok]) : undefined });
    const dmId = r?.chatMessageId;
    if (!dmId) return null;
    // [2026-10-07] the «Урон» card is a check card (no power result): its own
    // half button is "checkhalf"; "buttonhalf" threw and no damage was applied
    if (mode === "half") await chatButton(game.messages.get(dmId), "checkhalf");
    // [Round 89] magical monster abilities (flags.sw25.dmgType = "md") ignore armour
    // [2026-10-07] no explicit type: an ability saved against with Fortitude/Willpower
    // (breath, poison, blast) is magic damage — armour must not reduce it; Dodge = physical
    const rk = resistKeyOf(atkMsg.flags?.sw25?.resist);
    const dt = applyType ?? atkItem.flags?.sw25?.dmgType ?? (rk === "Vitres" || rk === "Mndres" ? "md" : "pd");
    if (tok) await chatButton(game.messages.get(dmId), dt !== "pd" ? `button${dt}` : "buttonpd");
    return dmId;
  }
  const res = await chatButton(atkMsg, "buttonpower", {
    targets: tok ? new Set([tok]) : undefined,
  });
  const pmId = res?.chatMessageId;
  if (!pmId) return null;
  if (mode === "half") await chatButton(game.messages.get(pmId), "buttonhalf");
  const type =
    applyType === undefined
      ? pickApplyType(atkItem, resistKeyOf(atkMsg.flags.sw25.resist))
      : applyType;
  if (tok && type) await chatButton(game.messages.get(pmId), `button${type}`);
  return pmId;
}

async function autoDamage(contestMsg, { auto = false } = {}) {
  const f = contestMsg.flags?.sw25 ?? {};
  if (!f.attackMessageId || !f.damageMode) return;
  if (f.damageDone || _damageDone.has(contestMsg.id)) {
    if (!auto) ui.notifications.warn(game.i18n.localize("SW25.Contest.AlreadyDone"));
    return;
  }
  const atkMsg = game.messages.get(f.attackMessageId);
  if (!atkMsg) return;
  const atkActor = ChatMessage.getSpeakerActor(atkMsg.speaker);
  if (!auto && !(game.user.isGM || atkActor?.isOwner)) {
    ui.notifications.warn(game.i18n.localize("SW25.Contest.AttackerOnly"));
    return;
  }
  const tok = canvas.tokens.get(f.targetTokenId);
  if (!tok) {
    ui.notifications.warn(game.i18n.localize("SW25.Contest.TargetNotOnScene"));
    return;
  }
  _damageDone.add(contestMsg.id);
  await rollAndApplyDamage(atkMsg, tok, f.damageMode);

  // lock the button for everyone
  const lockFlags = { sw25: { ...f, damageDone: true } };
  if (contestMsg.isOwner) await contestMsg.update({ "flags.sw25.damageDone": true });
  else emitToGM({ method: "updateChat", id: contestMsg.id, flags: lockFlags });
}

/** Disable the damage button once used (bound from renderChatMessage). */
export function markContestButtons(message, html) {
  if (message.flags?.sw25?.damageDone) {
    html.find(".sw25-autodamage").prop("disabled", true).addClass("sw25-used");
  }
}


/**
 * [Round 66] Put an item's effect templates (transfer:false effects, e.g.
 * spell buffs/debuffs/regeneration) on target tokens. GM / owner writes
 * directly, otherwise the active GM does it via the socket.
 */
export async function applyItemEffects(sourceActor, item, tokens, opts = {}) {
  const templates = (item?.effects?.contents ?? []).filter((e) => e.transfer !== true && !e.flags?.sw25?.choiceOff);
  // [Round 88] Ядовитая игла: the poison depends on the card rank chosen at cast time (flags.sw25.lastPoison)
  const poison = isItem(item?.name, "poisonneedle") ? Number(sourceActor?.flags?.sw25?.lastPoison) || 0 : 0;
  if ((!templates.length && !poison) || !tokens?.length) return 0;
  const tplData = templates.map((e) => e.toObject());
  if (poison)
    tplData.push({
      name: L2(`${item.name} (яд ${poison}/раунд)`, `${item.name} (poison ${poison}/round)`), img: item.img, transfer: false, disabled: false,
      duration: { value: 6, units: "rounds" },
      system: { changes: [{ key: "system.attributes.turnend.hpregenmod", type: "add", value: -poison, phase: "initial" }] },
      flags: { sw25: { classFx: true } },
    });
  const effects = tplData.map((src) => {
    const d = src;
    delete d._id;
    d.disabled = false;
    // «Сопротивление: сокращение» — a successful save leaves the effect for 1 round only (book II p.128)
    if (opts.shortened) d.duration = { ...(d.duration ?? {}), value: 1, units: "rounds" };
    d.origin = item.uuid;
    d.flags = {
      ...(d.flags ?? {}),
      sw25: { ...(d.flags?.sw25 ?? {}), sourceName: sourceActor.name, sourceId: `Actor.${sourceActor.id}` },
    };
    if (game.combat?.started) {
      d.duration = { ...(d.duration ?? {}), startRound: game.combat.round, startTurn: game.combat.turn, combat: game.combat.id };
    }
    return d;
  });
  const remote = [];
  for (const tok of tokens) {
    const a = tok.actor;
    if (!a) continue;
    if (game.user.isGM || a.isOwner) {
      // [Round 88] a recast of the same spell on the same target replaces its effect (no stacking)
      const dup = a.effects.filter((x) => x.origin && effects.some((n) => n.origin === x.origin && n.name === x.name)).map((x) => x.id);
      if (dup.length) await a.deleteEmbeddedDocuments("ActiveEffect", dup);
      await a.createEmbeddedDocuments("ActiveEffect", effects);
    }
    else remote.push(tok.id);
  }
  if (remote.length)
    emitToGM({
      method: "applyEffect",
      targetTokens: remote,
      targetEffects: effects,
      orgActor: sourceActor.name,
      orgId: sourceActor.id,
    });
  return tokens.length;
}


/* -------------------------------------------- */
/*  [Round 66] Compact action card               */
/* -------------------------------------------- */
// Messages created while a parent context is active (auto damage, contest)
// are tagged flags.sw25.parentId; they are hidden in the chat log and their
// result is summarised as one row per target on the parent (attack / cast)
// card. Their buttons stay reachable through the row.

let _parentCtx = null;
export async function withParent(parentId, fn) {
  const prev = _parentCtx;
  _parentCtx = parentId;
  try {
    return await fn();
  } finally {
    _parentCtx = prev;
  }
}

export function tagChildMessage(doc) {
  if (_allSecCtx && doc.flags?.sw25?.allSections === undefined) {
    doc.updateSource({ "flags.sw25.allSections": true });
  }
  if (_parentCtx && !doc.flags?.sw25?.parentId) {
    doc.updateSource({ "flags.sw25.parentId": _parentCtx });
  }
}

const _rowsCache = new Map();

function rowKeyOf(child) {
  const f = child.flags.sw25;
  return f.targetTokenId ?? f.targetToken ?? f.target?.[0] ?? child.id;
}

/** Called on the creating client for each child message. */
export async function summarizeChild(child) {
  const f = child.flags?.sw25;
  if (!f?.parentId) return;
  const parent = game.messages.get(f.parentId);
  if (!parent) return;
  const pf = parent.flags.sw25 ?? {};
  const rows = foundry.utils.deepClone(_rowsCache.get(parent.id) ?? pf.rows ?? {});
  const key = rowKeyOf(child);
  const row = (rows[key] ??= {});
  const tokName = canvas.tokens.get(key)?.name ?? child.speaker?.alias ?? "";
  row.name ??= tokName;

  if (f.contest) {
    const roll = child.rolls?.[0];
    row.defense = roll ? roll.total : "";
    row.defenseName = f.defenseName ?? pf.resist?.name ?? "";
    row.hit = !f.defenderWins;
    row.outcome = child.content.match(/<div class="sw25-contest[^"]*"><b>([^<]*)<\/b>/)?.[1] ?? "";
    row.contestId = child.id;
    row.damageMode = f.damageMode ?? null;
  } else if (f.type && f.beforeValue !== undefined && f.afterValue !== undefined) {
    row.applyType = f.type.replace(/^button/, "");
    row.before = f.beforeValue;
    row.after = f.afterValue;
    row.applyId = child.id;
  } else if (f.power !== undefined || f.orgtotal !== undefined) {
    row.power = f.total;
    row.powerId = child.id;
    row.crit = Number(f.extraRoll) || 0; // critical re-rolls on the power table
    row.powerFumble = f.fumble == 1;
  } else {
    return;
  }
  _rowsCache.set(parent.id, rows);

  const base = pf.baseContent ?? parent.content;
  const content = base + renderSummary(rows);
  const flags = { sw25: { ...pf, rows, baseContent: base } };
  if (parent.isOwner) await parent.update({ content, flags });
  else emitToGM({ method: "updateChat", id: parent.id, content, flags });
}

function renderSummary(rows) {
  const L = (k) => game.i18n.localize(`SW25.Contest.${k}`);
  const esc = (v) => Handlebars.escapeExpression(String(v ?? ""));
  const typeLabel = (t) => game.i18n.localize(`SW25.Item.${t}`);
  const lines = Object.entries(rows).map(([tokenId, r]) => {
    const td = canvas.tokens.get(tokenId)?.document;
    const uuid = td?.uuid ?? "";
    // outcome is public; the defence value and HP are only for the GM and
    // for whoever may see that actor (filtered per viewer at render time)
    const outcome =
      r.defense !== undefined
        ? `<span class="sw25-sum-outcome ${r.hit ? "sw25-contest-hit" : "sw25-contest-miss"}">${esc(r.outcome)}</span>`
        : "";
    const defVal =
      r.defense !== undefined
        ? `<span class="sw25-sum-def sw25-viewer" data-sw25-actor="${uuid}">${esc(r.defenseName)} ${esc(r.defense)}</span>`
        : "";
    let res = "";
    if (r.applyId) {
      const diff = Number(r.after) - Number(r.before);
      const sign = diff > 0 ? "+" : "";
      // critical / halved / fumble marker (resisted "half" spells never crit)
      let tag = "";
      if (r.damageMode === "half") tag = `<span class="sw25-sum-tag">${esc(L("TagHalf"))}</span>`;
      else if (r.powerFumble) tag = `<span class="sw25-sum-tag">${esc(L("TagFumble"))}</span>`;
      else if (r.crit) tag = `<span class="sw25-sum-tag sw25-sum-crit">${esc(L("TagCrit"))}${r.crit > 1 ? " ×" + r.crit : ""}</span>`;
      res = `${tag}<span class="sw25-sum-dmg${diff > 0 ? " sw25-sum-heal" : ""}">${sign}${diff} ${esc(typeLabel(r.applyType))}</span>
        <span class="sw25-sum-hp sw25-viewer" data-sw25-actor="${uuid}">(${esc(r.before)} → ${esc(r.after)})</span>
        <button class="buttonclick sw25-sum-cancel sw25-gmonly" data-buttontype="childcancel:${r.applyId}" title="${esc(L("Undo"))}"><i class="fa-solid fa-rotate-left"></i></button>`;
    } else if (r.power !== undefined) {
      res = `<span class="sw25-sum-dmg">${esc(L("Rolled"))}: ${esc(r.power)}</span>`;
    } else if (r.contestId && r.damageMode) {
      res = `<button class="buttonclick sw25-autodamage" data-buttontype="childdamage:${r.contestId}"><i class="fa-solid fa-burst"></i>&nbsp;${esc(
        r.damageMode === "half" ? L("DamageHalf") : L("Damage")
      )}</button>`;
    }
    return `<div class="sw25-sum-row">
      <div class="sw25-sum-line"><span class="sw25-sum-name">${esc(r.name)}</span>${outcome}</div>
      <div class="sw25-sum-line sw25-sum-sub">${defVal}<span class="sw25-sum-res">${res}</span></div>
    </div>`;
  });
  return `<div class="sw25-summary">${lines.join("")}</div>`;
}

/**
 * Per-viewer visibility on action cards: .sw25-gmonly is removed for
 * non-GMs; .sw25-viewer[data-sw25-actor] is removed unless the viewer is GM
 * or may observe that actor (same rule the apply cards use: owner, or the
 * actor's default ownership is Observer).
 */
export function filterViewerOnly(html) {
  if (game.user.isGM) return;
  html.find(".sw25-gmonly").remove();
  html.find(".sw25-viewer").each((_, el) => {
    const doc = el.dataset.sw25Actor ? fromUuidSync(el.dataset.sw25Actor) : null;
    const actor = doc?.actor ?? doc;
    const canSee =
      actor &&
      (actor.isOwner ||
        actor.testUserPermission?.(game.user, "OBSERVER") ||
        (actor.ownership?.default ?? 0) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
    if (!canSee) el.remove();
  });
}
