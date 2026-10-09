/**
 * [Round 66] One-click spell casting.
 *
 * Click on a spell's icon:
 *  1. MP: if the caster has less MP than the spell costs, nothing is cast
 *     (warning). Otherwise the cost is paid immediately — by the rules MP is
 *     spent whether the spell succeeds or not (book I p.95).
 *  2. Casting check: 2d6 + the spell's check base (school magic power).
 *  3. Targets with a resistance (Стойкость/Воля, result half/negate/shorten):
 *     the card carries targets + resist, so the active GM auto-rolls the save
 *     for monsters/NPCs (players roll their own with the card button) and the
 *     damage is rolled and applied right after the save — no button.
 *  4. No resistance (必中 / none): damage goes straight to hostile targets;
 *     healing spells heal non-hostile targets. "Any" (任意) and unclear cases
 *     roll the power against the targets and leave the apply buttons.
 * Shift+click on the icon keeps the old item chat card.
 */
import { chatButton, resistKeyOf, rollAndApplyDamage, applyItemEffects } from "./chatbutton.mjs";
import { emitToGM } from "./socket.mjs";
import { L2 } from "./monstergen-i18n.mjs";
import { canon } from "./ability-names.mjs";

// [Round 70] spells that heal a flat «Мощность магии + N» (no power table)
const FLAT_HEAL = { "Базовое лечение": 4, "Улучшенное лечение": 8, "Расширенное лечение": 12, "Насыщенное лечение": 6, "Лечебная вода": 4 };
/* data keywords written by Russian content and by the importers (any language) */
const SELF_RE = /^(?:Заклинатель|Caster|Self|術者)/i;

/** Apply a flat HP/MP change to a token (owner directly, else via the GM). */
export async function applyFixedAmount(tok, kind, amount) {
  const target = tok.actor;
  if (!target) return null;
  const sys = target.system;
  const name = foundry.utils.escapeHTML?.(tok.document.name) ?? tok.document.name;
  const isMp = kind === "mp";
  const path = isMp ? "system.mp.value" : "system.hp.value";
  const before = Number((isMp ? sys.mp?.value : sys.hp?.value) ?? 0);
  const max = Number((isMp ? sys.mp?.max : sys.hp?.max) ?? Infinity);
  const after = kind === "dmg" ? before - amount : Math.min(max, before + amount);
  const real = Math.abs(after - before);
  const unit = game.i18n.localize(isMp ? "SW25.Class.MP" : "SW25.Class.HP");
  let label = kind === "dmg" ? `−${real} ${unit}` : `+${real} ${unit}`;
  if (kind !== "dmg" && real < amount) label += ` (${game.i18n.format("SW25.Class.Capped", { v: amount })})`;
  if (target.isOwner) await target.update({ [path]: after });
  else if (isMp) emitToGM({ method: "applyMp", targetToken: tok.id, resultMP: after, beforeMP: before });
  else emitToGM({ method: "applyHp", targetToken: tok.id, resultHP: after, beforeHP: before });
  return `${name}: ${label}`;
}

const CONTESTED_RESULTS = ["halving", "disappear", "shortening"];
const HEAL_RE = /лечен|исцел|восстанавл|heal|cure|回復/i;

export async function castSpell(actor, item, opts = {}) {
  const L = (k, d) => (d ? game.i18n.format(`SW25.Cast.${k}`, d) : game.i18n.localize(`SW25.Cast.${k}`));
  let targets = Array.from(game.user.targets);

  // 0. [Round 66] area spells: "1 область (радиус 3 м)/5", ".../Все", ".../Место"
  const area = parseArea(item.system.target);
  let areaNote = "";
  const casterToken = actor.getActiveTokens()[0] ?? null;
  const shape = String(item.system.rangeshape ?? "");
  // self spells ("Заклинатель") target the caster when nothing is selected
  if (!area && !targets.length && casterToken &&
      (SELF_RE.test(String(item.system.target ?? "")) || SELF_RE.test(shape))) {
    targets = [casterToken];
    setUserTargets(targets);
  }
  // line spells ("2(50м)/Линия"): everyone on the straight line from the caster
  const line = parseLine(shape);
  if (line && !area && targets.length <= 1 && casterToken && canvas?.ready) {
    const end = targets.length === 1 ? targets[0].center : await pickPoint({ radius: 0.5, line, from: casterToken.center }, item.name);
    if (!end) return null;
    targets = tokensOnLine(casterToken, end, line.range);
    setUserTargets(targets);
    areaNote = L("LineLine", { r: line.range, n: targets.length });
  }
  if (area && canvas?.ready) {
    const isHealLike = HEAL_RE.test(`${item.name} ${item.system.description ?? ""}`) ||
      (!item.system.usepower && item.effects.size > 0);
    let picked = null;
    if (targets.length <= 1) {
      // one target selected = the point of impact; none = click on the map
      // [Round 97] "area around the caster" (range/shape says Caster): centred on the caster's token
      const selfArea = SELF_RE.test(shape) && casterToken;
      const center = selfArea ? casterToken.center : targets.length === 1 ? targets[0].center : await pickPoint(area, item.name);
      if (!center) return null; // cancelled: nothing spent
      picked = tokensInArea(center, area, actor, isHealLike);
    } else {
      picked = targets;
    }
    if (Number.isFinite(area.max) && picked.length > area.max) {
      ui.notifications.warn(L("TooManyTargets", { max: area.max, n: picked.length }));
      picked = picked.slice(0, area.max);
    }
    targets = picked;
    setUserTargets(targets);
    areaNote = L("AreaLine", {
      r: area.radius,
      n: targets.length,
      max: Number.isFinite(area.max) ? area.max : L("All"),
    });
    if (!targets.length) ui.notifications.info(L("AreaEmpty"));
  }

  // 0b. [Round 70] "caster chooses": several effect templates flagged
  // choice -> pick one; the others are switched off for this cast
  const choices = item.effects.contents.filter((e) => e.flags?.sw25?.choice);
  if (choices.length > 1 && item.isOwner) {
    const DialogV2 = foundry.applications?.api?.DialogV2;
    const picked = DialogV2
      ? await DialogV2.wait({
          window: { title: `${item.name} — ${L("PickEffect")}` },
          content: `<p>${L("PickEffectHint")}</p>`,
          buttons: choices.map((e, i) => ({ action: e.id, label: e.flags.sw25.choiceLabel ?? e.name, default: i === 0 })),
          rejectClose: false,
        }).catch(() => null)
      : choices[0].id;
    if (!picked) return null;
    await item.updateEmbeddedDocuments("ActiveEffect", choices.map((e) => ({ _id: e.id, "flags.sw25.choiceOff": e.id !== picked })));
  }

  // 1. cost: MP for spells; songs/alchemy pass their own payer (rhythm, cards)
  let payLine = "";
  const cost = opts.pay ? 0 : Number(item.system.mpcost) || 0;
  const mpBefore = Number(actor.system.mp?.value) || 0;
  if (opts.pay) {
    const paid = await opts.pay();
    if (paid === null || paid === false) return null;
    payLine = paid || "";
  } else {
    if (cost > mpBefore) {
      ui.notifications.warn(L("NoMP", { name: item.name, cost, mp: mpBefore }));
      return null;
    }
    if (cost > 0) await actor.update({ "system.mp.value": mpBefore - cost });
  }

  // 2. resistance of this spell
  const info = item.system.resistinfo ?? {};
  const result = info.result || "none";
  let key = info.type || (item.system.hpresist ? "Vitres" : "Mndres");
  // [Round 66] book I p.167: a Willpower check is made only "if the target
  // wants to resist". For BENEFICIAL spells (healing, pure buffs) allies
  // accept: only hostile targets get a save. Damage spells: everybody in
  // the area wants to resist, allies included.
  const casterDisp0 = casterToken?.document.disposition ?? 1;
  const hostileTo = (tok) => tok.document.disposition === -casterDisp0 && casterDisp0 !== 0;
  const ptypes0 = item.system.powerTypesButton ?? [];
  const templates0 = item.effects.contents.filter((e) => e.transfer !== true);
  const beneficial =
    (item.system.usepower && ptypes0.length > 0 && ptypes0.every((t) => t === "hr" || t === "mr")) ||
    (!item.system.usepower &&
      templates0.length > 0 &&
      templates0.every((e) => (e.system?.changes ?? e.changes ?? []).every((c) => Number(c.value) > 0)));
  const canBeContested = ["Vitres", "Mndres", "Dodge"].includes(key) && CONTESTED_RESULTS.includes(result);
  const willingTargets = canBeContested && beneficial ? targets.filter((t) => !hostileTo(t)) : [];
  const contestTargets = canBeContested ? targets.filter((t) => !willingTargets.includes(t)) : [];
  const contested = contestTargets.length > 0;

  // 3. casting check
  const base = Number(item.system.checkbase) || 0;
  const formula = base ? `2d6 ${base < 0 ? "-" : "+"} ${Math.abs(base)}` : "2d6";
  const roll = await new Roll(formula, actor.getRollData()).evaluate();
  const dice = roll.dice[0]?.results.map((r) => r.result) ?? [];
  const critical = dice[0] === 6 && dice[1] === 6 ? 1 : null;
  const fumble = dice[0] === 1 && dice[1] === 1 ? 1 : null;

  const resistData = contested
    ? { name: game.i18n.localize(`SW25.Resist.Check.${key}`), key, result }
    : null;
  const targetIds = (contested ? contestTargets : targets).map((t) => t.id);
  const targetName = targets.length
    ? targets.map((t) => `>>> ${Handlebars.escapeExpression(t.document.name)}`).join("<br>")
    : null;

  let content = await renderTemplate("systems/sw25-ru/templates/roll/roll-check.hbs", {
    formula: roll.formula,
    tooltip: await roll.getTooltip(),
    critical,
    fumble,
    total: roll.total,
    apply: "-",
    // [Round 90] with saves the per-target rows below already name everyone: no duplicate list on the card
    targetName: contested ? null : targetName,
    // [Round 66] the save button is only for player characters — monsters
    // and NPCs roll their save automatically on the GM's side
    resist: showResistButton(resistData, contestTargets) ? resistData : null,
  });
  if (areaNote) content += `<div class="sw25-cast-mp"><i class="fa-regular fa-circle-dot"></i> ${areaNote}</div>`;
  if (cost > 0) content += `<div class="sw25-cast-mp">${L("MpLine", { cost, before: mpBefore, after: mpBefore - cost })}</div>`;
  if (payLine) content += `<div class="sw25-cast-mp">${payLine}</div>`;
  if (fumble) content += `<div class="sw25-contest sw25-contest-miss"><b>${L(opts.pay ? "FumblePaid" : "Fumble")}</b></div>`;

  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name} — ${opts.label ?? L("Label")}`,
    rolls: [roll],
    content,
    flags: {
      sw25: {
        kind: "check",
        spellcast: true,
        autoDamage: true,
        total: roll.total,
        orgtotal: roll.total,
        formula: roll.formula,
        tooltip: await roll.getTooltip(),
        apply: "-",
        target: targetIds.length ? targetIds : null,
        targetName,
        resist: resistData,
        itemid: item.id,
        critical,
        fumble,
      },
    },
  };
  ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
  const msg = await ChatMessage.create(chatData);

  if (fumble || !msg) return msg;
  // contested spells: the save (GM for monsters / player for PCs) triggers
  // the damage and effects — see createChatMessage hook + buttonresist.
  // Willing allies of a beneficial spell get it right away.
  if (contested) {
    if (willingTargets.length) {
      await applyItemEffects(actor, item, willingTargets);
      if (item.system.usepower)
        for (const tok of willingTargets) await rollAndApplyDamage(msg, tok, "full", undefined);
    }
    return msg;
  }

  // [Round 66] uncontested: the spell's effect templates go on EVERY
  // targeted token (area spells like Бушующая Земля hit friend and foe;
  // the GM / players remove them when someone leaves the zone)
  const casterDisp = casterToken?.document.disposition ?? 1;
  const isHostile = (tok) => tok.document.disposition === -casterDisp && casterDisp !== 0;
  // "По желанию" (any): a target that does not want it resists automatically
  // (book I p.167) -> it only works on non-hostile targets
  const willing = result === "any" ? targets.filter((t) => !isHostile(t)) : targets;
  if (willing.length) await applyItemEffects(actor, item, willing);
  // [Round 70] flat heals «Мощность магии + N» (fairy magic, book II)
  // [Round 98] the item constructor stores its own flat heal: flags.sw25.flatHeal = N («Magic Power + N»)
  const ownFlat = item.flags?.sw25?.flatHeal;
  const flat = Number.isFinite(Number(ownFlat)) && ownFlat !== null && ownFlat !== "" ? Number(ownFlat) : FLAT_HEAL[canon(item.name)];
  if (flat !== undefined) {
    const mpow = Number(item.system.powerbase ?? item.system.checkbase) || 0;
    const lines = [];
    for (const tok of willing.filter((t) => !isHostile(t))) {
      const line = await applyFixedAmount(tok, "hp", mpow + flat);
      if (line) lines.push(line);
    }
    if (lines.length) await msg.update({ content: msg.content + lines.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") });
    return msg;
  }
  if (!item.system.usepower) return msg;

  // 4. no resistance
  if (!targets.length) {
    await rollAndApplyDamage(msg, null, "full", null);
    return msg;
  }
  const ptypes = item.system.powerTypesButton ?? [];
  const isHeal =
    (ptypes.length && ptypes.every((t) => t === "hr" || t === "mr")) ||
    (!ptypes.includes("md") && HEAL_RE.test(`${item.name} ${item.system.description ?? ""}`));
  for (const tok of willing) {
    const hostile = isHostile(tok);
    let type = null;
    if (isHeal) type = hostile ? null : ptypes.includes("mr") && !ptypes.includes("hr") ? "mr" : "hr";
    else if (["decide", "none"].includes(result) && hostile) type = "md";
    if (isHeal && hostile) continue;
    await rollAndApplyDamage(msg, tok, "full", type);
  }
  return msg;
}

/**
 * [Round 84] Damage that repeats at the end of the victim's turn (e.g. Молниеносная привязка:
 * «Мощность 20 + мощь магии» every round). The effect template carries
 * flags.sw25.periodic = { kind: "power" }; the power is rolled from the caster's last cast
 * of the spell the effect came from. Runs on the active GM.
 */
export async function periodicEffectDamage(actor, effect, token) {
  const p = effect.flags?.sw25?.periodic;
  if (!p || effect.disabled || p.kind !== "power") return null;
  const item = effect.origin ? await fromUuid(effect.origin).catch(() => null) : null;
  const msg = item
    ? game.messages.contents.findLast((m) => m.flags?.sw25?.spellcast && m.flags.sw25.itemid === item.id && ChatMessage.getSpeakerActor(m.speaker)?.uuid === item.parent?.uuid)
    : null;
  if (!msg || !token) {
    ChatMessage.create({
      speaker: { alias: actor.name },
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
      content: `<p><b>${foundry.utils.escapeHTML(effect.name)}</b>: ${L2("конец хода — нанесите урон вручную (исходный бросок заклинания не найден).", "end of turn — apply the damage by hand (the original spell roll was not found).")}</p>`,
    });
    return null;
  }
  return rollAndApplyDamage(msg, token, "full", p.apply ?? "md");
}

/** "2(50м)/Линия" -> { range: 50 } */
export function parseLine(shape) {
  if (!/Линия|Line|貫通/i.test(shape)) return null;
  const m = shape.match(/(\d+)\s*(?:м|m)/i);
  return m ? { range: Number(m[1]) } : null;
}

/** Tokens whose centre lies within half a metre of the line caster -> end (clamped to range). */
function tokensOnLine(casterToken, end, range) {
  const d = canvas.dimensions;
  const a = casterToken.center;
  let bx = end.x - a.x, by = end.y - a.y;
  const len = Math.hypot(bx, by) || 1;
  const maxPx = (range / d.distance) * d.size;
  const L = Math.min(len, maxPx);
  bx = (bx / len) * L; by = (by / len) * L;
  const tolPx = (0.5 / d.distance) * d.size + d.size / 2;
  return canvas.tokens.placeables.filter((t) => {
    if (t === casterToken || !t.actor || t.document.hidden) return false;
    const px = t.center.x - a.x, py = t.center.y - a.y;
    const u = (px * bx + py * by) / (L * L);
    // tolerance: the token the line is aimed at sits exactly at u = 1 and rounding must not drop it
    if (u < -1e-6 || u > 1 + 1e-6) return false;
    return Math.hypot(px - u * bx, py - u * by) <= tolPx;
  });
}

/** Show the manual save/evasion button only if some target must roll it by hand. */
export function showResistButton(resistData, targets) {
  if (!resistData) return false;
  if (!game.settings.get("sw25", "autoResistNonPC")) return true;
  return targets.some((t) => (t.actor ?? t.document?.actor)?.type === "character");
}

/* -------------------------------------------- */
/*  [Round 66] Area targeting                    */
/* -------------------------------------------- */

/** "1 область (радиус 3 м)/5" -> { radius: 3, max: 5 }; "/Все", "/Место" -> max Infinity. */
export function parseArea(text) {
  const t = String(text ?? "");
  if (!/област|area|エリア/i.test(t)) return null;
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*\d+\s*)?(?:метр[а-я]*|м|meters?|m)(?![a-zа-я])/i) ?? t.match(/(?:радиус|radius|半径)\s*(\d+)/i);
  if (!m) return null;
  if (/км|km/i.test(t)) return null; // city-scale areas: target by hand
  const radius = Number(String(m[1]).replace(",", "."));
  const tail = t.split("/")[1]?.trim() ?? "";
  const n = tail.match(/^(\d+)/);
  const max = n ? Number(n[1]) : Infinity;
  return { radius, max };
}

function metersBetween(a, b) {
  const d = canvas.dimensions;
  const px = Math.hypot(a.x - b.x, a.y - b.y);
  return (px / d.size) * d.distance;
}

/** Tokens whose centre is inside the circle; for "/N" the caster's likely picks come first. */
function tokensInArea(center, area, caster, friendlyFirst) {
  const casterDisp = caster.getActiveTokens()[0]?.document.disposition ?? 1;
  const inside = canvas.tokens.placeables.filter(
    (t) => t.actor && !t.document.hidden && metersBetween(t.center, center) <= area.radius + 0.01
  );
  const hostile = (t) => t.document.disposition === -casterDisp;
  return inside.sort((a, b) => {
    if (Number.isFinite(area.max)) {
      const pa = friendlyFirst ? !hostile(a) : hostile(a);
      const pb = friendlyFirst ? !hostile(b) : hostile(b);
      if (pa !== pb) return pa ? -1 : 1;
    }
    return metersBetween(a.center, center) - metersBetween(b.center, center);
  });
}

function setUserTargets(tokens) {
  const ids = new Set(tokens.map((t) => t.id));
  for (const t of Array.from(game.user.targets)) if (!ids.has(t.id)) t.setTarget(false, { releaseOthers: false, groupSelection: true });
  // [2026-10-07] programmatic targeting (areas, songs, stratagems) is not "aiming at a
  // multi-section monster": don't pop the «какую секцию бьёте?» dialog for it
  for (const t of tokens) if (!t.isTargeted) t._sw25SkipPick = true;
  tokens.forEach((t, i) => t.setTarget(true, { releaseOthers: false, groupSelection: i < tokens.length - 1 }));
  for (const t of tokens) t._sw25SkipPick = false;
}

/** Let the user click the centre of the area; right click / Esc cancels. */
function pickPoint(area, label) {
  return new Promise((resolve) => {
    const d = canvas.dimensions;
    const rPx = (area.radius / d.distance) * d.size;
    const g = new PIXI.Graphics();
    const draw = (p) => {
      g.clear();
      if (area.line && area.from) {
        const a = area.from;
        const maxPx = (area.line.range / d.distance) * d.size;
        const len = Math.hypot(p.x - a.x, p.y - a.y) || 1;
        const k = Math.min(1, maxPx / len);
        const e = { x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k };
        if (typeof g.moveTo === "function" && g.lineStyle) g.lineStyle(d.size, 0xff6a00, 0.25).moveTo(a.x, a.y).lineTo(e.x, e.y);
        else g.moveTo(a.x, a.y).lineTo(e.x, e.y).stroke({ width: d.size, color: 0xff6a00, alpha: 0.25 });
        return;
      }
      if (typeof g.circle === "function" && typeof g.fill === "function" && !g.beginFill) {
        g.circle(p.x, p.y, rPx).fill({ color: 0xff6a00, alpha: 0.18 }).stroke({ width: 3, color: 0xff6a00, alpha: 0.9 });
      } else {
        g.lineStyle(3, 0xff6a00, 0.9).beginFill(0xff6a00, 0.18).drawCircle(p.x, p.y, rPx).endFill();
      }
    };
    (canvas.controls ?? canvas.interface ?? canvas.stage).addChild(g);
    const pos = (ev) => ev.getLocalPosition?.(canvas.stage) ?? ev.data?.getLocalPosition(canvas.stage) ?? canvas.mousePosition;
    const onMove = (ev) => draw(pos(ev));
    const finish = (value) => {
      canvas.stage.off("pointermove", onMove);
      canvas.stage.off("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", onCtx, true);
      g.destroy();
      resolve(value);
    };
    const onDown = (ev) => {
      if (ev.button === 2) return finish(null);
      ev.stopPropagation?.();
      finish(pos(ev));
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") finish(null);
    };
    const onCtx = (ev) => {
      ev.preventDefault();
      finish(null);
    };
    canvas.stage.on("pointermove", onMove);
    canvas.stage.on("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onCtx, true);
    ui.notifications.info(
      area.line
        ? game.i18n.format("SW25.Cast.PickLine", { name: label, r: area.line.range })
        : game.i18n.format("SW25.Cast.PickArea", { name: label, r: area.radius })
    );
    draw(canvas.mousePosition ?? { x: 0, y: 0 });
  });
}

/**
 * [Round 73] Monster magic: the stat block gives «school N ур. / Мощность
 * магии P» (ability made by macro 73, flags.sw25.magic). The monster can use
 * any spell of that school up to level N: pick one, a copy is kept on the
 * monster with its magic power as the check/power base, then cast as usual.
 */
export async function castMonsterMagic(actor, ability) {
  const magic = ability.flags?.sw25?.magic;
  if (!magic) return null;
  const L = (k, d) => (d ? game.i18n.format(`SW25.Cast.${k}`, d) : game.i18n.localize(`SW25.Cast.${k}`));
  // [Round 84] fairy magic of monsters: «может использовать землю, воду/лёд…» →
  // magic.props limits the elemental fairy spells (basic fairy magic is always allowed)
  const props = Array.isArray(magic.props) && magic.props.length ? magic.props : null;
  const fairyOk = (i) => !props || i.system.type !== "fairy" || i.system.fairytype !== "propfairy" || props.includes(i.system.fairyprop);
  const spells = game.items
    .filter((i) => i.type === "spell" && magic.schools.includes(i.system.type) && Number(i.system.level) <= Number(magic.level) && fairyOk(i))
    .sort((a, b) => Number(a.system.level) - Number(b.system.level) || a.name.localeCompare(b.name, "ru"));
  if (!spells.length) {
    ui.notifications.warn(L("NoSchoolSpells"));
    return null;
  }
  const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
  const groups = {};
  for (const s of spells) (groups[s.system.level] ??= []).push(s);
  const options = Object.entries(groups)
    .map(([lvl, list]) => `<optgroup label="${esc(L("Circle", { n: lvl }))}">${list.map((s) => `<option value="${s.id}">${esc(s.name)} — ${esc(Number(s.system.basempcost) || Number(s.system.mpcost) || 0)} ${L2("ОМ", "MP")}</option>`).join("")}</optgroup>`)
    .join("");
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const pickedId = await DialogV2.wait({
    window: { title: `${actor.name}: ${ability.name}` },
    content: `<p>${esc(L("MonsterMagicHint", { power: magic.power }))}</p><select name="spell" style="width:100%">${options}</select>`,
    buttons: [{ action: "cast", label: L("Label"), default: true, callback: (ev, btn) => btn.form.elements.spell.value }],
    rejectClose: false,
  }).catch(() => null);
  if (!pickedId || pickedId === "cast") return null;
  const src = game.items.get(pickedId);
  if (!src) return null;

  const mods = {
    "system.checkskill": "", "system.checkabi": "", "system.powerskill": "", "system.powerabi": "",
    "system.checkmod": Number(magic.power), "system.powermod": Number(magic.power),
  };
  let copy = actor.items.find((i) => i.type === "spell" && i.name === src.name && i.flags?.sw25?.monsterMagic);
  if (copy) await copy.update(mods);
  else {
    const data = src.toObject();
    delete data._id;
    delete data.folder;
    data.flags = { ...(data.flags ?? {}), sw25: { ...(data.flags?.sw25 ?? {}), monsterMagic: true } };
    foundry.utils.mergeObject(data, foundry.utils.expandObject(mods));
    [copy] = await actor.createEmbeddedDocuments("Item", [data]);
  }
  return castSpell(actor, copy);
}

/**
 * [Round 89] Monster abilities with an area / line (flags.sw25.shape, filled from the
 * bestiary text): pick the targets the same way spells do, then the normal card rolls.
 * Returns false when the GM cancelled the pick (nothing is rolled).
 */
export async function pickMonsterTargets(actor, item) {
  const sh = item?.flags?.sw25?.shape;
  if (!sh || !canvas?.ready) return true;
  const tok = actor.getActiveTokens()[0];
  if (!tok) return true;
  const sel = Array.from(game.user.targets);
  if (sel.length >= 2) return true; // the GM already chose the targets by hand
  let targets = [];
  let note = "";
  if (sh.kind === "area" && Number(sh.radius) > 0) {
    const area = { radius: Number(sh.radius), max: Number.isFinite(Number(sh.max)) && sh.max ? Number(sh.max) : Infinity };
    let center;
    if (sh.self) center = tok.center;
    else center = sel.length === 1 ? sel[0].center : await pickPoint(area, item.name);
    if (!center) return false;
    targets = tokensInArea(center, area, actor, false).filter((t) => t !== tok);
    if (Number.isFinite(area.max) && targets.length > area.max) targets = targets.slice(0, area.max);
    note = L2(`${item.name}: область ${area.radius} м${sh.self ? " вокруг себя" : ""}, целей ${targets.length}${Number.isFinite(area.max) ? "/" + area.max : ""}`, `${item.name}: area ${area.radius} m${sh.self ? " around the caster" : ""}, targets ${targets.length}${Number.isFinite(area.max) ? "/" + area.max : ""}`);
  } else if (sh.kind === "line" && Number(sh.range) > 0) {
    const line = { range: Number(sh.range) };
    const end = sel.length === 1 ? sel[0].center : await pickPoint({ radius: 0.5, line, from: tok.center }, item.name);
    if (!end) return false;
    targets = tokensOnLine(tok, end, line.range);
    note = L2(`${item.name}: линия ${line.range} м, целей ${targets.length}`, `${item.name}: line ${line.range} m, targets ${targets.length}`);
  } else return true;
  for (const t of targets) t._sw25SkipPick = true;
  setUserTargets(targets);
  for (const t of targets) t._sw25SkipPick = false;
  if (note) ui.notifications.info(note);
  return true;
}

/**
 * [Round 89] One-click monster ability with a resisted attack line («Стойкость (атака)» +
 * «Урон»): target picking (area / line from flags.sw25.shape), one attack roll, the save of
 * every target (monsters automatically, PCs with the card button), damage and effects.
 * Returns "fallback" when the ability is not of this kind (the caller rolls the plain card),
 * null when cancelled.
 */
export async function castMonsterAbility(actor, item) {
  const s = item.system;
  const info = s.dice1?.resist ?? {};
  const key = info.type;
  const result = info.result;
  if (!s.usedice1 || !key || !result) return "fallback";
  const hasShape = !!item.flags?.sw25?.shape;
  if (!hasShape && !game.user.targets.size) return "fallback";
  if (hasShape && (await pickMonsterTargets(actor, item)) === false) return null;
  const targets = Array.from(game.user.targets);
  if (!targets.length) {
    ui.notifications.info(L2(`${item.name}: целей нет.`, `${item.name}: no targets.`));
    return null;
  }
  const L = (k, d) => (d ? game.i18n.format(`SW25.Cast.${k}`, d) : game.i18n.localize(`SW25.Cast.${k}`));
  const formula = `${s.checkformula1 || "2d6"}+${Number(s.checkbase1) || 0}`;
  const roll = await new Roll(formula, item.getRollData()).evaluate();
  const dice = roll.dice[0]?.results.map((r) => r.result) ?? [];
  const critical = dice[0] === 6 && dice[1] === 6 ? 1 : null;
  const fumble = dice[0] === 1 && dice[1] === 1 ? 1 : null;
  // monster abilities store «Отриц.» as result "none": a successful save leaves nothing
  const contested = ["Vitres", "Mndres", "Dodge"].includes(key) && [...CONTESTED_RESULTS, "none"].includes(result);
  const resistData = contested ? { name: game.i18n.localize(`SW25.Resist.Check.${key}`), key, result } : null;
  const targetName = targets.map((t) => `>>> ${Handlebars.escapeExpression(t.document.name)}`).join("<br>");
  let content = await renderTemplate("systems/sw25-ru/templates/roll/roll-check.hbs", {
    formula: roll.formula, tooltip: await roll.getTooltip(), critical, fumble, total: roll.total, apply: "-", targetName: contested ? null : targetName,
    resist: showResistButton(resistData, targets) ? resistData : null,
  });
  if (fumble) content += `<div class="sw25-contest sw25-contest-miss"><b>${L("Fumble")}</b></div>`;
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name} — ${s.label1 || ""}`,
    rolls: [roll],
    content,
    flags: { sw25: {
      kind: "check", spellcast: true, autoDamage: true, total: roll.total, orgtotal: roll.total, formula: roll.formula,
      tooltip: await roll.getTooltip(), apply: "-", target: targets.map((t) => t.id), targetName, resist: resistData,
      itemid: item.id, critical, fumble,
    } },
  };
  ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
  const msg = await ChatMessage.create(chatData);
  if (fumble || !msg || contested) return msg; // contested: the save triggers damage + effects (createChatMessage hook)
  await applyItemEffects(actor, item, targets);
  for (const tok of targets) await rollAndApplyDamage(msg, tok, "full");
  return msg;
}
