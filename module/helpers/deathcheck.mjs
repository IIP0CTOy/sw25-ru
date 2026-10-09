/**
 * [Round 52] "Проверка смерти" (Death Check) as a repeatable process, not
 * just a single roll — SW25 core rulebook I, p.109 ("Проверка смерти") +
 * p.184-185 ("Проверки потери сознания и смерти").
 *
 * Ported from studying how Pathfinder 2e (foundryvtt/pf2e,
 * src/module/actor/creature/document.ts#rollRecovery +
 * src/module/system/conditions/manager.ts) structures its own "dying"
 * loop, adapted to SW25's actual (much simpler) numeric rule — PF2e's
 * escalating dying-value/wounded system doesn't match our RAW, but the
 * SHAPE is the same and is what's borrowed: a capped counter attribute on
 * the actor, a dedicated roll method the GM/player re-triggers, and the
 * roll method explicitly NOT auto-applying the "you are now dead"
 * consequence — PF2e leaves the actual condition-pip click to the table,
 * we leave the actual "mark as dead" step to the GM for the same reason
 * (see bottom of this file).
 *
 * Rule recap:
 *  - Target number = |current HP| (HP is allowed to go negative in this
 *    system — no clamp; see documents/actor.mjs, hp.value is never
 *    floored at 0 anywhere).
 *  - Roll 2d + the character's "Проверка смерти" checkbase (already wired
 *    correctly as of Round 49 — checkskill "adv", checkabi "vit").
 *  - Double 6s: automatic success AND the character wakes immediately at
 *    1 HP (p.109, explicit, regardless of the counter below).
 *  - Double 1s: automatic failure (p.90's general auto-fail rule — the
 *    book doesn't special-case it away for this one check).
 *  - Plain success: stays unconscious but alive.
 *  - p.184 additionally says six successful checks within the hour
 *    (~ one every 10 in-fiction minutes) wake the character at 1 HP —
 *    tracked here as a simple counter (system.attributes.deathchecks),
 *    since Foundry has no built-in in-fiction clock to pace the "every
 *    10 minutes" part automatically; the GM is still expected to only
 *    call this roughly that often, same as at the table.
 *  - Plain failure: the character dies. This function does NOT touch hp,
 *    toggle "defeated" on the token, or otherwise mark the actor dead —
 *    death has consequences this system doesn't model yet (resurrection
 *    cost/eligibility, Шрамы души, see p.185 and the Round 50 audit), so
 *    it only announces the result clearly in chat and leaves the actual
 *    bookkeeping to the GM. Same conservative rule this project has
 *    followed everywhere else — see sw25-named-abilities-coverage.md,
 *    "никогда не автоматизируется без предупреждения".
 *
 * The "wake up" branch (double 6, or the 6th success) sets hp.value to 1
 * and stops there — the paired preUpdateActor/updateActor hooks in
 * sw25.mjs detect hp crossing back above 0 and clear the "sw25unconscious"
 * status + reset the counter on their own, so this function doesn't need
 * to duplicate that bookkeeping.
 */
// [Round 66] actors with a death check currently being rolled (double-click guard)
import { L2 } from "./monstergen-i18n.mjs";
import { isItem } from "./names.mjs";
import { starterPack } from "./starter.mjs";

const _inFlight = new Set();

export async function rollDeathCheck(actor) {
  if (actor && _inFlight.has(actor.uuid)) return null;
  if (actor) _inFlight.add(actor.uuid);
  try {
    return await _rollDeathCheck(actor);
  } finally {
    if (actor) _inFlight.delete(actor.uuid);
  }
}

async function _rollDeathCheck(actor) {
  if (!actor) {
    ui.notifications?.warn(L2("Проверка смерти: не выбран персонаж.", "Death Check: no character selected."));
    return null;
  }

  const hp = Number(actor.system.hp?.value ?? 0);
  if (hp > 0) {
    ui.notifications?.warn(
      L2(`${actor.name}: ОЖ выше 0, проверка Смерти не требуется.`, `${actor.name}: HP is above 0, no Death Check is needed.`)
    );
    return null;
  }

  // [Round 94] the item is recognised by any of its spellings ("Death Check" too)
  let checkItem = actor.items.find(
    (i) => i.type === "check" && isItem(i.name, "deathcheck")
  );

  // [Round 61] This used to just error out and tell the GM/player to drag
  // the item in manually from the "Проверки умений (RU)" world folder —
  // an easy-to-miss setup step for a check that's supposed to be automatic
  // (it appears the moment HP <= 0, nobody "picks" it the way they pick a
  // skill). The item itself still exists and still does real work (its
  // checkbase is derived from the actor's Уровень авантюриста + Живучесть
  // via the same item.mjs pipeline every other "check" item uses — not
  // duplicated here on purpose, so it can't drift out of sync with that
  // formula), so instead of reimplementing the math, auto-embed a copy of
  // the world item onto the actor the first time it's needed and carry on
  // with the roll. Falls back to the old error only if that source item
  // has also gone missing from the world.
  if (!checkItem) {
    let sourceItem = game.items?.find(
      (i) => i.type === "check" && i.name === "Проверка смерти"
    ) ?? game.items?.find(
      (i) => i.type === "check" && isItem(i.name, "deathcheck")
    );
    // [Round 95] worlds that keep the checks only in a compendium (content pack or starter pack)
    if (!sourceItem) {
      try {
        const pack = starterPack("checks");
        const index = pack ? await pack.getIndex() : null;
        const entry = index?.find((e) => isItem(e.name, "deathcheck"));
        if (entry) sourceItem = await pack.getDocument(entry._id);
      } catch (err) { console.warn("SW25 | rollDeathCheck: compendium lookup failed", err); }
    }
    if (sourceItem) {
      try {
        const [created] = await actor.createEmbeddedDocuments("Item", [
          sourceItem.toObject(),
        ]);
        checkItem = created;
        ui.notifications?.info(
          L2(`${actor.name}: добавил на лист предмет «Проверка смерти» автоматически (раньше отсутствовал) — дальше бросок будет считаться сам.`, `${actor.name}: added the “${created.name}” item to the sheet automatically (it was missing) — from now on the roll is calculated by itself.`)
        );
      } catch (err) {
        console.error(
          `SW25 | rollDeathCheck: не смог автоматически добавить «Проверка смерти» персонажу "${actor.name}":`,
          err
        );
      }
    }
  }

  if (!checkItem) {
    ui.notifications?.error(
      L2(`${actor.name}: на листе нет предмета «Проверка смерти» (type: check), и в мировых предметах тоже не нашёл образец — добавьте его вручную из папки «Проверки умений (RU)», иначе бросок некому считать.`, `${actor.name}: there is no “Death Check” item (type: check) on the sheet and no sample among the world items either — add it by hand (the checks compendium), otherwise nothing can calculate the roll.`)
    );
    return null;
  }

  const checkbase = Number(checkItem.system.checkbase) || 0;
  const target = Math.abs(hp);

  // [Round 66] roll the modifier too, so the dice shown in chat add up to
  // the number in the text (was a bare 2d6 while the text said +base).
  const formula = checkbase ? `2d6 + ${checkbase}` : "2d6";
  const roll = await new Roll(formula.replace("+ -", "- ")).evaluate();
  const dice = roll.dice[0]?.results?.map((r) => r.result) ?? [];
  const [d1, d2] = dice;
  const total = roll.total;
  const isDoubleSix = d1 === 6 && d2 === 6;
  const isDoubleOne = d1 === 1 && d2 === 1;
  const success = isDoubleSix || (!isDoubleOne && total >= target);

  const deathchecks = actor.system.attributes?.deathchecks ?? { value: 0, max: 6 };
  const maxChecks = Number(deathchecks.max) || 6;

  let resultLabel;
  let wakeUp = false;
  let flavorExtra = "";

  if (success) {
    if (isDoubleSix) {
      resultLabel = L2("АВТОУСПЕХ (дубль 6) — приходит в себя с 1 ОЖ немедленно", "AUTOMATIC SUCCESS (double 6) — wakes up at 1 HP immediately");
      wakeUp = true;
    } else {
      const nextCount = Math.min((Number(deathchecks.value) || 0) + 1, maxChecks);
      flavorExtra = L2(`Успешных проверок подряд: ${nextCount}/${maxChecks}`, `Successful checks in a row: ${nextCount}/${maxChecks}`);
      if (nextCount >= maxChecks) {
        resultLabel = L2(`Успех — и это уже ${maxChecks}-я подряд: персонаж приходит в себя с 1 ОЖ`, `Success — number ${maxChecks} in a row: the character wakes up at 1 HP`);
        wakeUp = true;
      } else {
        resultLabel = L2("Успех — остаётся без сознания, но жив", "Success — still unconscious, but alive");
        await actor.update({ "system.attributes.deathchecks.value": nextCount });
      }
    }
  } else {
    resultLabel = isDoubleOne
      ? L2("АВТОПРОВАЛ (дубль 1) — персонаж умирает", "AUTOMATIC FAILURE (double 1) — the character dies")
      : L2("Провал — персонаж умирает", "Failure — the character dies");
  }

  if (wakeUp) {
    await actor.update({ "system.hp.value": 1 });
  }

  const content = `
    <div class="sw25-deathcheck">
      <p><strong>${Handlebars.escapeExpression(actor.name)} — ${L2("Проверка смерти", "Death Check")}</strong></p>
      <p>${L2(`Целевое число (|ОЖ|): <strong>${target}</strong> · Бросок: 2d(${d1},${d2}) + база ${checkbase} = <strong>${total}</strong>`, `Target number (|HP|): <strong>${target}</strong> · Roll: 2d(${d1},${d2}) + base ${checkbase} = <strong>${total}</strong>`)}</p>
      <p>${resultLabel}</p>
      ${flavorExtra ? `<p><em>${flavorExtra}</em></p>` : ""}
      ${!success ? `<p><em>${L2("ГМ должен подтвердить смерть персонажа — система это не делает автоматически.", "The GM has to confirm the character’s death — the system does not do it automatically.")}</em></p>` : ""}
    </div>
  `.trim();

  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  };
  ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
  await ChatMessage.create(chatData);

  return { success, wakeUp, total, target, roll };
}
