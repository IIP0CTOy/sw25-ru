/**
 * Execute  Growth roll event and return the result.
 */
export async function growthCheck(actor) {
  let target = actor;

  const rollMode = game.settings.get("core", "rollMode");
  const formula = "2d6";
  const chatFormula = "1D6 , 1D6";

  let roll = new Roll(formula);
  await roll.evaluate();

  const roll1 = roll.dice[0].results[0].result;
  const roll2 = roll.dice[0].results[1].result;

  const abilities = ["dex", "agi", "str", "vit", "int", "mnd"];

  let growth1Label = abilities[roll1 - 1];
  let growth1LabelUc = growth1Label.capitalize();
  let growth1 = target.system.abilities[`${growth1Label}`];
  let growth1Name = game.i18n.localize(`SW25.Ability.${growth1LabelUc}.long`);
  let growth1Abbr = game.i18n.localize(`SW25.Ability.${growth1LabelUc}.abbr`);
  let growth1Die = game.i18n.localize(`SW25.Ability.${growth1LabelUc}.die`);
  let growth1after = growth1.value + 1;
  let growth1aftermod = Math.floor(growth1after / 6);
  let upcss1 = "";
  if (growth1.mod < growth1aftermod) upcss1 = `color: #0f6f0f;`;

  let growth2Label = abilities[roll2 - 1];
  let growth2LabelUc = growth2Label.capitalize();
  let growth2 = target.system.abilities[`${growth2Label}`];
  let growth2Name = game.i18n.localize(`SW25.Ability.${growth2LabelUc}.long`);
  let growth2Abbr = game.i18n.localize(`SW25.Ability.${growth2LabelUc}.abbr`);
  let growth2Die = game.i18n.localize(`SW25.Ability.${growth2LabelUc}.die`);
  let growth2after = growth2.value + 1;
  let growth2aftermod = Math.floor(growth2after / 6);
  let upcss2 = "";
  if (growth2.mod < growth2aftermod) upcss2 = ` color: #0f6f0f;`;

  let result = `
        <span style="font-size: 0.8em;">
            <span style="font-size: 0.5em;">${growth1Abbr}:</span>${growth1.value}<span style="font-size: 0.7em;">(+${growth1.mod})</span> > ${growth1after}<span style="font-size: 0.7em;${upcss1}">(+${growth1aftermod})</span> , 
            <span style="font-size: 0.5em;">${growth2Abbr}:</span>${growth2.value}<span style="font-size: 0.7em;">(+${growth2.mod})</span> > ${growth2after}<span style="font-size: 0.7em;;${upcss2}">(+${growth2aftermod})</span>
        </span>
    `;

  let chatContent = await renderTemplate(
    "systems/sw25-ru/templates/roll/roll-check.hbs",
    {
      formula: chatFormula,
      tooltip: await roll.getTooltip(),
      total: result,
    }
  );

  chatContent += `
      <div class="flexrow">
        <button class="increase-ability" data-ability="${growth1Label}" data-value="${growth1.valuegrowth}">${growth1Die} : ${growth1Name}</button>
        <button class="increase-ability" data-ability="${growth2Label}" data-value="${growth2.valuegrowth}">${growth2Die} : ${growth2Name}</button>
      </div>
    `;

  let chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: game.i18n.localize(`SW25.Ability.Growth`),
    content: chatContent,
    rollMode: rollMode,
    rolls: [roll],
    flags: {
      sw25: {
        actor: `${actor._id}`,
      },
    },
  };

  ChatMessage.create(chatData);
}

/**
 * Growth buttons on the chat card. Bound from the global renderChatMessage
 * hook (was: Hooks.once, which attached to whatever message rendered next
 * and died on reload). By the rules only ONE of the two rolled abilities
 * grows: the choice is stored on the message and the other button is locked.
 */
export function bindGrowthButtons(message, html) {
  const buttons = html.find(".increase-ability");
  if (!buttons.length) return;
  const used = message.flags?.sw25?.growthUsed;
  if (used) {
    buttons.prop("disabled", true);
    buttons.filter(`[data-ability="${used}"]`).addClass("growth-chosen");
    return;
  }
  buttons.click(async function (event) {
    event.preventDefault();
    buttons.prop("disabled", true);
    await applyGrowth(message, event.currentTarget);
  });
}

async function applyGrowth(message, button) {
  if (message.flags?.sw25?.growthUsed) {
    ui.notifications.warn(game.i18n.localize("SW25.Ability.GrowthAlreadyUsed"));
    return;
  }
  const beforeValueGrowth = parseInt(button.dataset.value);
  const target = game.actors.get(message.flags.sw25.actor);
  if (!target) return;
  if (!target.isOwner) {
    ui.notifications.warn(game.i18n.localize("SW25.Ability.GrowthNotOwner"));
    return;
  }
  // [2026-10-07] the card lock below is only written by the message owner (the GM for
  // session-end cards), so a player could take both abilities: lock on the actor too
  if (target.flags?.sw25?.growthDone?.[message.id]) {
    ui.notifications.warn(game.i18n.localize("SW25.Ability.GrowthAlreadyUsed"));
    return;
  }
  const growth = button.dataset.ability;
  const currentValueGrowth = target.system.abilities[growth].valuegrowth;
  if (beforeValueGrowth != currentValueGrowth) return;
  const afterValueGrowth = currentValueGrowth + 1;
  const ability = growth.capitalize();
  const abilityName = game.i18n.localize(`SW25.Ability.${ability}.long`);
  const abilityDie = game.i18n.localize(`SW25.Ability.${ability}.die`);

  // Lock the card first so a double click can't grow twice.
  if (message.isOwner) await message.update({ "flags.sw25.growthUsed": growth });
  await target.update({
    [`system.abilities.${growth}.valuegrowth`]: afterValueGrowth,
    [`flags.sw25.growthDone.${message.id}`]: growth,
  });

  const chatContent = `<div class="growth">
          <span class="fontsize12">${abilityDie}${abilityName}&nbsp;</span>:&nbsp;
          ${game.i18n.localize("SW25.Ability.Growth")}&nbsp;
          <span class="fontsize12 before">${currentValueGrowth}</span>
          ><span class="fontsize11">></span><span class="fontsize12">></span> 
          <span class="fontsize15 after">${afterValueGrowth}</span>
          </div>`;
  ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: target }),
    content: chatContent,
  });
}
