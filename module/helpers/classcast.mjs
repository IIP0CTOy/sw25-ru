/**
 * [Round 69] One-click Bard songs / finales and Alchemist evocations.
 *
 * Song (Волшебная мелодия), click on the icon:
 *   2d6 + Сила Барда -> base rhythm is added to the bard's rhythm counters,
 *   plus the extra rhythm when the result reaches the flourish value
 *   (Значение Процветания) — book II p.188. The effect condition
 *   (Условие эффекта) is checked against the rhythm the bard already has.
 * Finale (Финальный аккорд): refuses when the rhythm is not enough, spends it,
 *   then goes through the spell pipeline (check -> Willpower save -> power).
 * Evocation (Приворот): pick the card rank (B/A/S/SS), the material cards are
 *   spent, rank values go into the effect / fixed amount, then the spell
 *   pipeline (targets, save, effects) — book III p.189.
 * Missing rhythm counters are created on the actor automatically.
 */
import { castSpell, applyFixedAmount } from "./spellcast.mjs";
import { emitToGM } from "./socket.mjs";
import { L2 } from "./monstergen-i18n.mjs";
import { isClass, className, findClassItem, itemName, isItem } from "./names.mjs";
import { canon } from "./ability-names.mjs";

/** [ru, en] pair from a module-level table -> the string of the client language (resolved at display time). */
const loc = (v) => (Array.isArray(v) ? L2(v[0], v[1]) : v);

const T = (k, d) => (d ? game.i18n.format(`SW25.Class.${k}`, d) : game.i18n.localize(`SW25.Class.${k}`));
const NOTE_KINDS = ["up", "down", "charm"];
const NOTE_SYM = { up: "⮭", down: "⮯", charm: "♡" };
const COLORS = ["red", "green", "black", "white", "gold"];
const RANKS = ["b", "a", "s", "ss"];

/* ---------------- rhythm ---------------- */
function noteItem(actor, kind) {
  return actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "note" && i.system.resource.notetype === kind);
}
async function ensureNotes(actor) {
  const missing = NOTE_KINDS.filter((k) => !noteItem(actor, k));
  if (!missing.length) return;
  await actor.createEmbeddedDocuments(
    "Item",
    missing.map((k) => ({ name: `${T("Rhythm")} ${NOTE_SYM[k]}`, type: "resource", system: { quantity: 0, resource: { type: "note", notetype: k } } }))
  );
}
export function notesOf(actor) {
  return Object.fromEntries(NOTE_KINDS.map((k) => [k, Number(noteItem(actor, k)?.system.quantity ?? 0)]));
}
async function addNotes(actor, delta) {
  const updates = [];
  for (const k of NOTE_KINDS) {
    const d = Number(delta[k] ?? 0);
    if (!d) continue;
    const it = noteItem(actor, k);
    if (it) updates.push({ _id: it.id, "system.quantity": Math.max(0, Number(it.system.quantity ?? 0) + d) });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
}
const fmt = (o) => NOTE_KINDS.filter((k) => Number(o[k])).map((k) => `${NOTE_SYM[k]}${o[k]}`).join(" ") || "—";
const pick3 = (s, suffix) => Object.fromEntries(NOTE_KINDS.map((k) => [k, Number(s[`${k}${suffix}`] ?? 0)]));

// [Round 69] song effects (book II p.188-194, book III p.176-177): who they
// hit and what they change. Songs sound for everyone within 30 m (book II
// p.121 example «все области (радиус 30 м)»); a debuff only takes hostile
// listeners, a buff only friendly ones. Lasts while the bard keeps playing
// (re-perform each round) -> 1 round.
const K = {
  hit: "system.attributes.efhitmod", dodge: "system.attributes.efdodgemod",
  vitres: "system.effect.vitres", mndres: "system.effect.mndres", allck: "system.effect.allck",
  allsk: "system.effect.allsk", mcast: "system.attributes.efmckall", mpow: "system.attributes.efmpwall",
  mpall: "system.attributes.efmpall",
};
const SONG_FX = {
  "Расслабляющая": { side: "foe", ch: [[K.hit, -1]] },
  "Какофония": { side: "foe", ch: [[K.mcast, -1]] },
  "Баллада": { side: "foe", ch: [[K.dodge, -1]] },
  "Разрыв": { side: "foe", ch: [[K.vitres, -1], [K.mndres, -1]] },
  "Колыбельная": { side: "foe", ch: [[K.allck, -4]] },
  "Танец": { side: "foe", ch: [[K.hit, -2], [K.dodge, -2]] },
  "Лень": { side: "foe", ch: [[K.allsk, -1]] },
  "Боевой дух": { side: "ally", ch: [[K.hit, 1]] },
  "Сопротивление": { side: "ally", ch: [[K.vitres, 1], [K.mndres, 1]] },
  "Транс": { side: "ally", ch: [[K.mcast, 1]] },
  "Разрежение": { side: "ally", ch: [[K.mpall, 1]] },
};
const SONG_RANGE_M = 30;

async function ensureSongEffect(item) {
  // [2026-10-07] a song made in the constructor carries its own effect and says whom it reaches
  const own = item.flags?.sw25?.songSide;
  if (own && item.effects.some((e) => e.flags?.sw25?.songFx)) return { side: own === "ally" ? "ally" : "foe" };
  const fx = SONG_FX[canon(item.name)];
  if (!fx || !item.isOwner) return fx ?? null;
  if (item.effects.some((e) => e.flags?.sw25?.songFx)) return fx;
  await item.createEmbeddedDocuments("ActiveEffect", [{
    name: item.name, img: item.img, transfer: false, disabled: false,
    duration: { value: 1, units: "rounds" },
    system: { changes: fx.ch.map(([key, v]) => ({ key, type: "add", value: v, phase: "initial" })) },
    flags: { sw25: { songFx: true } },
  }]);
  return fx;
}

function songTargets(actor, fx) {
  const bard = actor.getActiveTokens()[0] ?? null;
  const disp = bard?.document.disposition ?? 1;
  const hostile = (t) => disp !== 0 && t.document.disposition === -disp;
  const side = (t) => (fx.side === "foe" ? hostile(t) : !hostile(t));
  let list = Array.from(game.user.targets);
  if (!list.length && bard && canvas?.ready) {
    const d = canvas.dimensions;
    const maxPx = (SONG_RANGE_M / d.distance) * d.size;
    list = canvas.tokens.placeables.filter((t) => t.actor && !t.document.hidden &&
      Math.hypot(t.center.x - bard.center.x, t.center.y - bard.center.y) <= maxPx);
  }
  return list.filter(side);
}
function setTargets(tokens) {
  const ids = new Set(tokens.map((t) => t.id));
  for (const t of Array.from(game.user.targets)) if (!ids.has(t.id)) t.setTarget(false, { releaseOthers: false, groupSelection: true });
  // [2026-10-07] programmatic targeting (areas, songs, stratagems) is not "aiming at a
  // multi-section monster": don't pop the «какую секцию бьёте?» dialog for it
  for (const t of tokens) if (!t.isTargeted) t._sw25SkipPick = true;
  tokens.forEach((t, i) => t.setTarget(true, { releaseOthers: false, groupSelection: i < tokens.length - 1 }));
  for (const t of tokens) t._sw25SkipPick = false;
}

export async function performSong(actor, item) {
  if (item.system.type === "final") return performFinale(actor, item);
  await ensureNotes(actor);
  const s = item.system;
  const before = notesOf(actor);
  const cond = pick3(s, "cond");
  const condNeeded = NOTE_KINDS.some((k) => cond[k] > 0);
  const condOk = NOTE_KINDS.every((k) => before[k] >= cond[k]);

  const fx = await ensureSongEffect(item);
  const targets = fx && condOk ? songTargets(actor, fx) : [];
  setTargets(targets);

  // check + Willpower of hostile listeners + effects: the spell pipeline
  const msg = await castSpell(actor, item, { label: T("Perform"), pay: async () => "" });
  if (!msg) return msg;
  const f = msg.flags?.sw25 ?? {};
  const total = Number(f.total) || 0;
  const critical = !!f.critical;
  const fumble = !!f.fumble;

  const flourish = Number(s.singpoint) || 0;
  const gained = fumble ? {} : { ...pick3(s, "get") };
  const extra = !fumble && flourish > 0 && (total >= flourish || critical);
  if (extra) for (const [k, v] of Object.entries(pick3(s, "add"))) gained[k] = (gained[k] ?? 0) + v;
  await addNotes(actor, gained);
  const after = notesOf(actor);

  const lines = [];
  if (fumble) lines.push(`<b>${T("SongFumble")}</b>`);
  else lines.push(T("RhythmGain", { gain: fmt(gained) }) + (extra ? ` <i>(${T("Flourish", { v: flourish })})</i>` : flourish ? ` <i>(${T("NoFlourish", { v: flourish })})</i>` : ""));
  lines.push(T("RhythmNow", { before: fmt(before), after: fmt(after) }));
  if (condNeeded) lines.push(condOk ? T("CondOk", { cond: fmt(cond) }) : `<b>${T("CondFail", { cond: fmt(cond) })}</b>`);
  if (fx && condOk && !fumble) lines.push(T(targets.length ? "SongHits" : "SongNobody", { n: targets.length, side: T(fx.side === "foe" ? "Foes" : "Allies"), r: SONG_RANGE_M }));
  if (s.overview) lines.push(`<i>${foundry.utils.escapeHTML?.(s.overview) ?? s.overview}</i>`);
  await msg.update({ content: msg.content + lines.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") });
  return msg;
}

async function performFinale(actor, item) {
  await ensureNotes(actor);
  const cost = pick3(item.system, "cost");
  return castSpell(actor, item, {
    label: T("Finale"),
    pay: async () => {
      const have = notesOf(actor);
      const short = NOTE_KINDS.filter((k) => have[k] < cost[k]);
      if (short.length) {
        ui.notifications.warn(T("NoRhythm", { name: item.name, cost: fmt(cost), have: fmt(have) }));
        return null;
      }
      await addNotes(actor, Object.fromEntries(NOTE_KINDS.map((k) => [k, -cost[k]])));
      return T("RhythmSpent", { cost: fmt(cost), before: fmt(have), after: fmt(notesOf(actor)) });
    },
  });
}

/* ---------------- alchemy ---------------- */
// cards whose rank value is a fixed amount applied straight to the targets
const FIXED = {
  "Лечебный спрей": "hp",
  "Яркая жидкость": "mp",
  "Всходы маны": "mp",
};
function cardItem(actor, color, rank) {
  return actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "material" &&
    i.system.resource.materialtype === color && i.system.resource.materialrank === rank);
}
/** Item data of an empty card stack. */
const cardData = (color, rank) => ({
  name: L2(`Карта: ${colorName(color)} ${rank.toUpperCase()}`, `Card: ${colorName(color)} ${rank.toUpperCase()}`),
  type: "resource", img: "icons/svg/card-hand.svg",
  system: { quantity: 0, resource: { type: "material", materialtype: color, materialrank: rank } },
});
const colorName = (c) => game.i18n.localize(`SW25.Item.Alchemytech.${c.charAt(0).toUpperCase()}${c.slice(1)}`);

async function chooseRank(actor, item) {
  const need = COLORS.filter((c) => Number(item.system[c]) > 0);
  const avail = (r) => Math.min(...need.map((c) => Math.floor(Number(cardItem(actor, c, r)?.system.quantity ?? 0) / Number(item.system[c]))));
  const ev = item.system.effectvalue ?? {};
  const buttons = RANKS.map((r) => {
    const n = need.length ? avail(r) : 0;
    const val = ev.type && ev.type !== "-" && ev[r] !== null && ev[r] !== undefined ? ` · ${ev[r]}` : "";
    return { action: r, label: `${r.toUpperCase()}${val} (${T("Uses", { n })})`, default: r === "a" };
  });
  const costTxt = need.map((c) => `${colorName(c)} ×${item.system[c]}`).join(", ");
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2) return "a";
  return DialogV2.wait({
    window: { title: `${item.name} — ${T("PickRank")}` },
    content: `<p>${T("CardCost", { cost: costTxt })}</p>`,
    buttons,
    rejectClose: false,
  }).catch(() => null);
}

export async function useAlchemy(actor, item) {
  const rank = await chooseRank(actor, item);
  if (!rank || !RANKS.includes(rank)) return null;
  const need = COLORS.filter((c) => Number(item.system[c]) > 0);
  const ev = item.system.effectvalue ?? {};
  const rankValue = ev[rank];

  const pay = async () => {
    const lack = need.filter((c) => Number(cardItem(actor, c, rank)?.system.quantity ?? 0) < Number(item.system[c]));
    if (lack.length) {
      // no stack of this rank on the sheet yet: add empty ones so the player only has to fill in the number
      const missing = lack.filter((c) => !cardItem(actor, c, rank));
      if (missing.length && actor.isOwner) await actor.createEmbeddedDocuments("Item", missing.map((c) => cardData(c, rank)));
      ui.notifications.warn(T("NoCards", { name: item.name, rank: rank.toUpperCase(), cards: lack.map(colorName).join(", ") }));
      return null;
    }
    const parts = [];
    const updates = need.map((c) => {
      const it = cardItem(actor, c, rank);
      const before = Number(it.system.quantity ?? 0);
      const after = before - Number(item.system[c]);
      parts.push(`${colorName(c)} ${rank.toUpperCase()} ${before} → ${after}`);
      return { _id: it.id, "system.quantity": after };
    });
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    // rank value into the effect templates (duration or numeric value)
    if (ev.type === "time" || ev.type === "value") {
      const effUpdates = item.effects.contents.map((e) => {
        const u = { _id: e.id };
        if (ev.type === "time") u.duration = { value: Number(rankValue) || 0, units: "rounds" };
        else u["system.changes"] = (e.system?.changes ?? e.changes ?? []).map((c) => ({ ...c, value: Number(rankValue) }));
        return u;
      });
      if (effUpdates.length) await item.updateEmbeddedDocuments("ActiveEffect", effUpdates);
    }
    return T("CardsSpent", { rank: rank.toUpperCase(), cards: parts.join(", ") || "—" }) +
      (rankValue !== null && rankValue !== undefined && ev.type !== "-" ? ` · ${T("RankValue", { v: rankValue })}` : "");
  };

  // B-rank "Нет": nothing happens but the cards are spent
  // [Round 88] the poison effect is placed by the normal spell pipeline once the save is known
  // (full 6 rounds on a failed save, 1 round on a successful one — «Сопротивление: сокращение»)
  if (isItem(item.name, "poisonneedle")) await actor.update({ "flags.sw25.lastPoison": Number(rankValue) || 0 });
  const msg = await castSpell(actor, item, { label: T("Evocation"), pay });
  if (!msg) return msg;

  const kind = FIXED[canon(item.name)];
  const amount = Number(rankValue) || 0;
  // [Round 84] Ядовитая игла: poison damage at the end of every turn for 1 minute
  // (an effect with a negative «regeneration»), not one hit
  if (isItem(item.name, "poisonneedle") && amount) {
    const toks = Array.from(game.user.targets);
    if (toks.length)
      await msg.update({ content: msg.content + L2(`<div class="sw25-cast-mp">Яд: −${amount} ОЖ в конце каждого хода цели, 6 раундов (${toks.map((t) => foundry.utils.escapeHTML(t.name)).join(", ")}); при успешном сопротивлении — 1 раунд</div>`, `<div class="sw25-cast-mp">Poison: −${amount} HP at the end of each of the target's turns, 6 rounds (${toks.map((t) => foundry.utils.escapeHTML(t.name)).join(", ")}); 1 round on a successful resistance</div>`) });
  }
  if (kind && amount) {
    const lines = [];
    for (const tok of Array.from(game.user.targets)) {
      const line = await applyFixedAmount(tok, kind, amount);
      if (line) lines.push(line);
    }
    if (lines.length) {
      const add = lines.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("");
      await msg.update({ content: msg.content + add });
    }
  }
  return msg;
}

/* ---------------- [Round 76] Qi / Limit counters (Geomancer, Tactician) ---------------- */
const QI = [["ten", ["Небесная Ци", "Heaven Qi"]], ["chi", ["Земная Ци", "Earth Qi"]], ["jin", ["Духовная Ци", "Spirit Qi"]]];
/** Create the resource counters a class-III ability needs (Qi ×3 or Limit) if the actor lacks them. */
const _counterLocks = new Map();
export function ensureClassCounters(actor, item) {
  if (!actor || !item) return;
  // createItem fires once per item of a batch: serialise per actor so a
  // class + its first aspect dropped together don't create counters twice.
  const prev = _counterLocks.get(actor.uuid) ?? Promise.resolve();
  const next = prev.then(() => _ensureClassCounters(actor, item)).catch((e) => console.error(e));
  _counterLocks.set(actor.uuid, next);
  return next;
}
async function _ensureClassCounters(actor, item) {
  const res = (pred) => actor.items.some((i) => i.type === "resource" && pred(i.system?.resource ?? {}));
  const toCreate = [];
  const geo = item.type === "phasearea" || (item.type === "skill" && isClass(item.name, "geomancer"));
  const tac = item.type === "tactics" || (item.type === "skill" && isClass(item.name, "warleader"));
  if (geo)
    for (const [k, name] of QI)
      if (!res((r) => r.type === "lifeline" && r.lifelinetype === k))
        toCreate.push({ name: loc(name), type: "resource", system: { quantity: 0, resource: { type: "lifeline", lifelinetype: k } } });
  // [2026-10-07] Alchemist: a stack of material cards per colour for ranks B and A (empty —
  // the player types in how many they own). Higher ranks appear when first asked for.
  const alc = item.type === "alchemytech" || (item.type === "skill" && isClass(item.name, "alchemist"));
  if (alc)
    for (const c of COLORS)
      for (const r of ["b", "a"])
        if (!res((x) => x.type === "material" && x.materialtype === c && x.materialrank === r)) toCreate.push(cardData(c, r));
  if (tac && !res((r) => r.type === "tacspower"))
    toCreate.push({ name: itemName("tacspower"), type: "resource", system: { quantity: 0, resource: { type: "tacspower" } } });
  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
}

/* ---------------- [Round 80] Tactician: stratagems and maneuvers ---------------- */
// Stratagem (drum): Minor action, lasts 1 round, hits every ally (not the Tactician),
// gives Limit (+get) or costs it (rank 5). One stratagem per round; the rank may grow
// by one per round while the Tactician stays in the same line (attack/dodge/…),
// a new line starts from rank 1 («Inspire» ones unlock rank 2/3 of any line).
// Maneuver (camp): the Tactician himself, paid with Limit, one per round.
const KT = {
  ...K,
  dmg: "system.attributes.efdmod", pp: "system.attributes.efppmod", mpp: "system.attributes.efmppmod",
  red: "system.attributes.efdreduce", move: "system.attributes.move.efmovemod",
};
// visible strings of the module-level tables are [ru, en] pairs, resolved with loc() where they are shown
const KT_LABEL = {
  [KT.hit]: ["Точность", "Accuracy"], [KT.dodge]: ["Уклонение", "Evasion"], [KT.vitres]: ["Стойкость", "Fortitude"], [KT.mndres]: ["Воля", "Willpower"],
  [KT.dmg]: ["физ. урон", "phys. damage"], [KT.pp]: ["Защита", "Defense"], [KT.mpp]: ["маг. защита", "magic defense"], [KT.red]: ["снижение урона", "damage reduction"],
  [KT.move]: ["передвижение (м)", "movement (m)"], [KT.mcast]: ["проверки заклинаний", "spellcasting checks"], [KT.mpow]: ["мощь магии", "magic power"], [KT.mpall]: ["экономия ОМ", "MP saving"],
};
const VW = (n) => [{ label: ["Стойкость", "Fortitude"], ch: [[KT.vitres, n]] }, { label: ["Воля", "Willpower"], ch: [[KT.mndres, n]] }];
const PM = (n) => [{ label: ["Физический урон", "Physical damage"], ch: [[KT.pp, n]] }, { label: ["Магический урон", "Magic damage"], ch: [[KT.mpp, n]] }];
const TAC_FX = {
  // stratagems — resist
  "Вызывающая Позиция I": { choice: VW(1) },
  "Вызывающая Позиция II": { choice: VW(1) },
  "Вызывающая Позиция III": { choice: VW(2) },
  "Вызывающая Позиция IV": { choice: VW(2) },
  "Вызывающая Позиция V: Эфирная пружина": { ch: [[KT.mpall, 5]] },
  "Вызывающая Позиция V: Переполненная жизнь": { ch: [[KT.vitres, 2], [KT.mndres, 2]], note: ["Павших/спящих союзников пробуждает как [Пробуждение] — вручную.", "Wakes fallen/sleeping allies like [Awaken] — apply manually."] },
  // dodge
  "Изменчивая Фортуна I": { ch: [[KT.dodge, 1]], note: ["Эффект пропадает после первой проверки Уклонения — снимите вручную.", "The effect ends after the first Evasion check — remove it manually."] },
  "Изменчивая Фортуна II": { ch: [[KT.dodge, 1]] },
  "Изменчивая Фортуна III": { ch: [[KT.dodge, 2]] },
  "Изменчивая Фортуна IV": { ch: [[KT.dodge, 2]] },
  "Изменчивая Фортуна V": { ch: [[KT.dodge, 4]] },
  // defence
  "Надежная защита II: Железные Доспехи": { choice: PM(1) },
  "Надежная защита II: Твердая Форма": { ch: [[KT.pp, 2]] },
  "Надежная защита III: Бронированный сердечник": { choice: PM(1) },
  "Надежная защита III: Стальные доспехи": { ch: [[KT.pp, 3]] },
  "Надежная защита IV: Доспехи замка": { ch: [[KT.pp, 3]] },
  "Надежная защита IV: Зеркальный щит": { ch: [[KT.red, 1]] },
  "Надежная защита V: Гигантская стена": { ch: [[KT.red, 3]] },
  "Надежная защита V: Стальная цитадель": { ch: [[KT.pp, 7]] },
  // attack
  "Нарастающее Наступление I": { ch: [[KT.dmg, 1]] },
  "Нарастающее Наступление II: Яростное Пламя": { ch: [[KT.dmg, 2]] },
  "Нарастающее Наступление II: Вихрь": { ch: [[KT.hit, 1]] },
  "Нарастающее Наступление III: Ревущее пламя": { ch: [[KT.dmg, 3]] },
  "Нарастающее Наступление III: Истинная цель": { ch: [[KT.hit, 1], [KT.dmg, 1]] },
  "Нарастающее Наступление IV: Пламя": { ch: [[KT.dmg, 3]] },
  "Нарастающее Наступление IV: Лучезарные удары": { ch: [[KT.hit, 1], [KT.dmg, 1]] },
  "Нарастающее Наступление V: Тайфун": { ch: [[KT.hit, 2], [KT.dmg, 2]] },
  // inspire
  "Поиск Недостатков": { free: 2, note: ["+1 к доп. урону по обнаруженному слабому месту — учитывается вручную.", "+1 extra damage against a revealed weak point — track manually."] },
  "Позиция Божественной Скорости": { ch: [[KT.move, 5]], free: 2 },
  "Гимн храбрых": { free: 2, selfOnly: true, note: ["Мелодии Тактика в этот раунд действуют только на выбранную сторону — вручную.", "This round the Warleader's songs affect only the chosen side — apply manually."] },
  "Тайное возрождение": { free: 3, note: ["Каждый союзник может сразу сделать проверку Знания монстров по указанному монстру.", "Each ally may immediately make a Monster Knowledge check for the indicated monster."] },
  "Великая задача": { ch: [[KT.dodge, 1], [KT.vitres, 1], [KT.mndres, 1]], self: [[KT.dodge, -3], [KT.vitres, -3], [KT.mndres, -3]], free: 3 },
  "Оценка травматизма": { free: 3, note: ["Союзник, восстановивший хотя бы 1 ОЖ в этот раунд, получает ещё +5 ОЖ — вручную.", "An ally who recovers at least 1 HP this round gains another +5 HP — apply manually."] },
  // maneuvers
  "Тщательная Охрана I": { ch: [[KT.red, 4]] },
  "Тщательная Охрана II": { ch: [[KT.red, 7]] },
  "Концентрация I": { ch: [[KT.mcast, 1]], note: ["На одну проверку заклинания — после неё снимите эффект.", "For one spellcasting check — remove the effect afterwards."] },
  "Концентрация II": { ch: [[KT.mcast, 2]], note: ["На одну проверку заклинания — после неё снимите эффект.", "For one spellcasting check — remove the effect afterwards."] },
  "Эффективность I": { ch: [[KT.mpow, 4]], note: ["На одну цель одного заклинания — после него снимите эффект.", "For one target of one spell — remove the effect afterwards."] },
  "Эффективность II": { ch: [[KT.mpow, 7]], note: ["На одну цель одного заклинания — после него снимите эффект.", "For one target of one spell — remove the effect afterwards."] },
  "Предвидение I": { ch: [[KT.dodge, 3]] },
  "Предвидение II": { ch: [[KT.dodge, 5]] },
  "Сопротивление I": { choice: VW(3) },
  "Сопротивление II": { choice: VW(5) },
  "Неожиданный Удар I": { ch: [[KT.hit, 2], [KT.dmg, 2]], note: ["На одну атаку — после неё снимите эффект.", "For one attack — remove the effect afterwards."] },
  "Неожиданный Удар II": { ch: [[KT.hit, 4], [KT.dmg, 4]], note: ["На одну атаку — после неё снимите эффект.", "For one attack — remove the effect afterwards."] },
  "Стратегическая изобретательность": { note: ["Инициатива: можно взять «уровень Тактика + мод. Интеллекта + 1» — вручную.", "Initiative: you may use “Warleader level + Intelligence mod. + 1” — apply manually."] },
  "Сплошная линия": { gain: 1, noLimit: true },
  "Сокрушительная победа": { gain: 1, noLimit: true },
};
const tacKey = (s) => String(s ?? "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const TAC_BY_KEY = Object.fromEntries(Object.entries(TAC_FX).map(([k, v]) => [tacKey(k), v]));
const LINE_NAME = { attack: ["Атака", "Attack"], dodge: ["Уклонение", "Evasion"], deffence: ["Защита", "Defense"], resist: ["Сопротивление", "Resistance"], inspire: ["Вдохновение", "Inspirational"] };
const lineName = (k) => loc(LINE_NAME[k]);

function limitItem(actor) {
  return actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "tacspower");
}
function tacEffect(item, actor, changes, label) {
  const d = {
    name: label ? `${item.name} (${label})` : item.name,
    img: item.img, transfer: false, disabled: false, origin: item.uuid,
    duration: { value: 1, units: "rounds" },
    system: { changes: changes.map(([key, v]) => ({ key, type: "add", value: v, phase: "initial" })) },
    flags: { sw25: { tacFx: true, sourceName: actor.name, sourceId: `Actor.${actor.id}` } },
  };
  if (game.combat?.started) Object.assign(d.duration, { startRound: game.combat.round, startTurn: game.combat.turn, combat: game.combat.id });
  return d;
}
async function putEffects(actor, tokens, effects) {
  const remote = [];
  for (const tok of tokens) {
    const a = tok.actor;
    if (!a) continue;
    if (game.user.isGM || a.isOwner) {
      // [Round 88] the same ability used again replaces its effect instead of stacking
      const dup = a.effects.filter((x) => x.origin && effects.some((n) => n.origin === x.origin && x.flags?.sw25?.sourceId === `Actor.${actor.id}`)).map((x) => x.id);
      if (dup.length) await a.deleteEmbeddedDocuments("ActiveEffect", dup);
      await a.createEmbeddedDocuments("ActiveEffect", effects);
    } else remote.push(tok.id);
  }
  if (remote.length) emitToGM({ method: "applyEffect", targetTokens: remote, targetEffects: effects, orgActor: actor.name, orgId: actor.id });
}
const chText = (ch) => ch.map(([k, v]) => `${loc(KT_LABEL[k]) ?? k} ${v > 0 ? "+" : ""}${v}`).join(", ");

export const tacticsKnown = (name) => !!TAC_BY_KEY[tacKey(canon(name))];
export async function useTactics(actor, item) {
  const s = item.system;
  const isStrat = s.type === "drum";
  const fx = TAC_BY_KEY[tacKey(canon(item.name))] ?? {};
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  await ensureClassCounters(actor, item);
  const lim = limitItem(actor);
  const have = Number(lim?.system.quantity ?? 0);
  const cost = Number(s.cost) || 0;
  const gain = (isStrat ? Number(s.get) || 0 : 0) + (Number(fx.gain) || 0);
  if (cost > have) {
    ui.notifications.warn(L2(`${item.name}: нужно ${cost} Предела, есть ${have}.`, `${item.name}: needs ${cost} Edge, you have ${have}.`));
    return null;
  }

  // one stratagem and one maneuver per round; stratagem rank order
  const cb = game.combat?.started ? game.combat : null;
  const slot = isStrat ? "drum" : "camp";
  const mem = actor.flags?.sw25?.tacUse ?? {};
  const warns = [];
  if (cb && !fx.noLimit) {
    const last = mem[slot];
    if (last && last.combat === cb.id && last.round === cb.round) warns.push(L2(`В этом раунде уже ${isStrat ? "использована стратагема" : "использован манёвр"} «${last.name}».`, `${isStrat ? "A stratagem" : "A maneuver"} has already been used this round: “${last.name}”.`));
    if (isStrat) {
      const prev = last && last.combat === cb.id && last.round === cb.round - 1 ? last : null;
      let max = 1;
      if (prev && prev.line === s.line) max = Math.max(max, Number(prev.rank) + 1);
      if (prev?.free) max = Math.max(max, Number(prev.free));
      if (Number(s.rank) > max) warns.push(L2(`Ранг ${s.rank} (${lineName(s.line) ?? s.line}) пока недоступен: сейчас можно ранг не выше ${max}${prev ? ` (в прошлом раунде — «${prev.name}», ${lineName(prev.line) ?? prev.line} ${prev.rank})` : " (в прошлом раунде стратагем не было)"}.`, `Rank ${s.rank} (${lineName(s.line) ?? s.line}) is not available yet: the highest rank allowed now is ${max}${prev ? ` (last round: “${prev.name}”, ${lineName(prev.line) ?? prev.line} ${prev.rank})` : " (no stratagem last round)"}.`));
    }
  }
  if (warns.length && DialogV2) {
    const ok = await DialogV2.confirm({ window: { title: item.name }, content: `<p>${warns.map(esc).join("<br>")}</p><p>${L2("Использовать всё равно?", "Use it anyway?")}</p>`, rejectClose: false });
    if (!ok) return null;
  }

  // «Tactician chooses»
  let changes = fx.ch ?? [];
  let label = "";
  if (fx.choice?.length) {
    const picked = DialogV2
      ? await DialogV2.wait({
          window: { title: L2(`${item.name} — выбор`, `${item.name} — choice`) },
          content: `<p>${L2("Что усиливаем?", "What do we boost?")}</p>`,
          buttons: fx.choice.map((c, i) => ({ action: String(i), label: loc(c.label), default: i === 0 })),
          rejectClose: false,
        }).catch(() => null)
      : "0";
    if (picked === null || picked === undefined) return null;
    changes = fx.choice[Number(picked)].ch;
    label = loc(fx.choice[Number(picked)].label);
  }

  // who gets it
  const me = actor.getActiveTokens()[0] ?? null;
  let targets = [];
  if (!isStrat || fx.selfOnly) targets = me ? [me] : [];
  else if (canvas?.ready) {
    const disp = me?.document.disposition ?? 1;
    const friendly = (t) => t.actor && !t.document.hidden && t.actor.uuid !== actor.uuid && (disp === 0 ? t.document.disposition >= 0 : t.document.disposition === disp);
    const chosen = Array.from(game.user.targets).filter(friendly);
    // one effect per actor: a linked actor may have several tokens on the scene
    const seen = new Set();
    // [2026-10-07] in a running fight "every ally" means the allies in the tracker, not every friendly token on the scene
    const fight = game.combat?.started ? new Set(game.combat.combatants.map((c) => c.tokenId)) : null;
    const present = (t) => !fight || fight.has(t.id);
    targets = (chosen.length ? chosen : canvas.tokens.placeables.filter((t) => friendly(t) && present(t))).filter((t) => !seen.has(t.actor.uuid) && seen.add(t.actor.uuid));
  }
  if (changes.length && targets.length) await putEffects(actor, targets, [tacEffect(item, actor, changes, label)]);
  if (fx.self?.length && me) await putEffects(actor, [me], [tacEffect(item, actor, fx.self, className("warleader"))]);

  // Limit: a stratagem gives it only when it reached at least one ally
  const reached = !isStrat || fx.selfOnly || targets.length > 0;
  const got = reached ? gain : 0;
  const after = have - cost + got;
  if (lim && after !== have) await lim.update({ "system.quantity": after });
  if (cb && !fx.noLimit)
    await actor.update({ [`flags.sw25.tacUse.${slot}`]: { combat: cb.id, round: cb.round, name: item.name, line: s.line ?? null, rank: Number(s.rank) || 0, free: fx.free ?? 0 } });

  const lines = [];
  if (changes.length) lines.push(`${esc(chText(changes))}${label ? ` <i>(${esc(label)})</i>` : ""} — ${L2("на 1 раунд", "for 1 round")}`);
  if (isStrat && !fx.selfOnly) lines.push(targets.length ? `${L2("Союзники", "Allies")} (${targets.length}): ${targets.map((t) => esc(t.name)).join(", ")}` : L2(`<b>Рядом нет союзников — Предел не накоплен.</b>`, `<b>No allies nearby — no Edge gained.</b>`));
  if (fx.self?.length) lines.push(`${L2("Сам Тактик", "The Warleader")}: ${esc(chText(fx.self))}`);
  if (!changes.length && !fx.self && !fx.gain) lines.push(L2(`<i>Эффект применяется вручную.</i>`, `<i>Apply the effect manually.</i>`));
  if (fx.note) lines.push(`<i>${esc(loc(fx.note))}</i>`);
  if (fx.free) lines.push(L2(`В следующем раунде доступна стратагема ранга ${fx.free} любого типа.`, `Next round a rank ${fx.free} stratagem of any type is available.`));
  if (after !== have || cost || got) lines.push(`${L2("Предел", "Edge")}: ${have} → <b>${after}</b>${cost ? ` (−${cost})` : ""}${got ? ` (+${got})` : ""}`);
  if (!lim) lines.push(L2(`<b>Нет счётчика «Предел».</b>`, `<b>No “Edge” counter.</b>`));
  const head = isStrat ? `${L2("Стратагема", "Stratagem")}${s.rank ? ` · ${lineName(s.line) ?? ""} ${s.rank}` : ""}` : L2("Манёвр", "Maneuver");
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${esc(item.name)} <small>(${esc(head)})</small>`,
    content: lines.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") + (s.overview ? `<div class="sw25-cast-mp"><small>${esc(s.overview)}</small></div>` : ""),
    flags: { sw25: { tactics: true, itemid: item.id } },
  });
}

/* ---------------- [Round 81] shared helpers for class-III abilities ---------------- */
const escH = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const selfToken = (actor) => actor.getActiveTokens()[0] ?? null;
function timedEffect(item, actor, changes, rounds = 1, label = "") {
  const d = tacEffect(item, actor, changes, label);
  d.duration.value = rounds;
  d.flags.sw25.tacFx = false;
  d.flags.sw25.classFx = true;
  return d;
}
async function classCard(actor, item, head, lines, extra = {}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${escH(item.name)} <small>(${escH(head)})</small>`,
    content: lines.filter(Boolean).map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") + (item.system.overview ? `<div class="sw25-cast-mp"><small>${escH(item.system.overview)}</small></div>` : ""),
    flags: { sw25: { classAbility: true, itemid: item.id } },
    ...extra,
  });
}

/* ---------------- [Round 81] Geomancer: aspects paid with Qi ---------------- */
// X = Qi spent (the aspect's «1–4»). Fixed amounts go straight to the targets,
// numeric buffs/debuffs become 1-round effects; the rest stays text.
const GEO_FX = {
  "Исцеляющая Земля": { fixed: "hp", mult: 2, note: ["Раз в день.", "Once per day."] },
  "Нисходящий гром": { fixed: "dmg", mult: 2 },
  "Пожиратель снов": { fixed: "dmg", mult: 2 },
  "Обновление": { fixed: "mp", mult: 1, note: ["Не больше половины макс. ОМ цели; раз в день.", "No more than half the target's max MP; once per day."] },
  "Расход маны": { note: (x) => [`ОМ цели −${2 * x} (не ниже 0) — снимите вручную.`, `Target's MP −${2 * x} (not below 0) — deduct manually.`] },
  "Горный восторг": { note: ["Цель с ОЖ ≤ 0 восстанавливает 10 ОЖ и приходит в сознание — вручную.", "A target at HP ≤ 0 recovers 10 HP and regains consciousness — apply manually."] },
  "Песчаный щит": { ch: (x) => [[KT.pp, 2 * x]] },
  "Ужас": { self: (x) => [[KT.red, 2 * x]], note: ["Снижение урона — только от атак выбранной цели.", "The damage reduction applies only to attacks of the chosen target."] },
  "Направляющие ветры": { ch: (x) => [[KT.hit, x]], note: ["Только для дальних атак.", "Ranged attacks only."] },
  "Гнев Тенмы": { ch: (x) => [[KT.mpow, x]] },
  "Сифон Маны": { ch: (x) => [[KT.mpow, -x], [KT.mcast, -x]] },
  "Зыбучий песок": { ch: (x) => (x >= 2 ? [[KT.dodge, -(x - 1)]] : []), note: ["Цель не может двигаться (не действует на летающих).", "The target cannot move (no effect on flying creatures)."] },
  "Шаги": { ch: (x) => [[KT.allck, -x]], note: ["Скорость по земле вдвое меньше; не действует, если цель не на земле.", "Ground speed is halved; no effect if the target is not on the ground."] },
};
const GEO_BY_KEY = Object.fromEntries(Object.entries(GEO_FX).map(([k, v]) => [tacKey(k), v]));
const SPHERE = Object.fromEntries(QI);
export const aspectKnown = (name) => !!GEO_BY_KEY[tacKey(canon(name))];

export async function useAspect(actor, item) {
  const s = item.system;
  const fx = GEO_BY_KEY[tacKey(canon(item.name))] ?? {};
  const DialogV2 = foundry.applications?.api?.DialogV2;
  await ensureClassCounters(actor, item);
  const qi = actor.items.find((i) => i.type === "resource" && i.system?.resource?.type === "lifeline" && i.system.resource.lifelinetype === s.type);
  const have = Number(qi?.system.quantity ?? 0);
  const min = Number(s.mincost) || 0;
  const max = Number(s.maxcost) > min ? Number(s.maxcost) : min;
  const sphere = loc(SPHERE[s.type]) ?? L2("Ци", "Qi");
  if (have < min) {
    ui.notifications.warn(L2(`${item.name}: нужно ${min} (${sphere}), есть ${have}.`, `${item.name}: needs ${min} (${sphere}), you have ${have}.`));
    return null;
  }
  let x = min;
  if (max > min) {
    const top = Math.min(max, have);
    const picked = DialogV2
      ? await DialogV2.wait({
          window: { title: L2(`${item.name} — сколько потратить (${sphere}: ${have})`, `${item.name} — how much to spend (${sphere}: ${have})`) },
          content: L2(`<p>Стоимость ${min}–${max}. Чем больше Ци, тем сильнее эффект.</p>`, `<p>Cost ${min}–${max}. The more Qi, the stronger the effect.</p>`),
          buttons: Array.from({ length: top - min + 1 }, (_, i) => ({ action: String(min + i), label: String(min + i), default: min + i === top })),
          rejectClose: false,
        }).catch(() => null)
      : String(top);
    if (picked === null || picked === undefined) return null;
    x = Number(picked);
  }

  const me = selfToken(actor);
  const chosen = Array.from(game.user.targets);
  const targets = chosen.length ? chosen : me ? [me] : [];
  const lines = [];
  // [2026-10-07] a damage aspect without a target used to spend the Qi anyway
  if (fx.fixed === "dmg" && !chosen.length) {
    ui.notifications.warn(L2(`${item.name}: сначала выберите цель (Ци не потрачена).`, `${item.name}: select a target first (no Qi spent).`));
    return null;
  }
  if (qi) await qi.update({ "system.quantity": have - x });
  lines.push(`${escH(sphere)}: ${have} → <b>${have - x}</b> (−${x})`);

  if (fx.fixed) {
    if (fx.fixed === "dmg" && !chosen.length) lines.push(L2(`<b>Цель не выбрана — урон ${fx.mult * x} примените вручную.</b>`, `<b>No target selected — apply ${fx.mult * x} damage manually.</b>`));
    else
      for (const tok of targets) {
        let amount = fx.mult * x;
        if (isItem(item.name, "renewal")) amount = Math.min(amount, Math.floor((Number(tok.actor?.system.mp?.max) || 0) / 2));
        const line = await applyFixedAmount(tok, fx.fixed, amount);
        if (line) lines.push(escH(line));
      }
  }
  const ch = fx.ch ? fx.ch(x) : [];
  if (ch.length && targets.length) {
    await putEffects(actor, targets, [timedEffect(item, actor, ch, 1, `${sphere} ${x}`)]);
    lines.push(`${escH(chText(ch))} — ${L2("на 1 раунд", "for 1 round")}: ${targets.map((t) => escH(t.name)).join(", ")}`);
  }
  const selfCh = fx.self ? fx.self(x) : [];
  if (selfCh.length && me) {
    await putEffects(actor, [me], [timedEffect(item, actor, selfCh, 1, `${sphere} ${x}`)]);
    lines.push(`${L2("Сам Геомант", "The Geomancer")}: ${escH(chText(selfCh))} — ${L2("на 1 раунд", "for 1 round")}`);
  }
  if (!fx.fixed && !ch.length && !selfCh.length) lines.push(L2(`<i>Эффект применяется вручную${chosen.length ? ` (цель: ${chosen.map((t) => escH(t.name)).join(", ")})` : ""}.</i>`, `<i>Apply the effect manually${chosen.length ? ` (target: ${chosen.map((t) => escH(t.name)).join(", ")})` : ""}.</i>`));
  const note = loc(typeof fx.note === "function" ? fx.note(x) : fx.note);
  if (note) lines.push(`<i>${escH(note)}</i>`);
  if (!qi) lines.push(L2(`<b>Нет счётчика «${escH(sphere)}».</b>`, `<b>No “${escH(sphere)}” counter.</b>`));
  return classCard(actor, item, `${L2("Аспект", "Aspect")} · ${sphere} ${x}`, lines);
}

/* ---------------- [Round 81] Dark Hunter: essence weaves paid with HP ---------------- */
// ⏩ minor weaves cost 1d6 or 2 HP, no check. ► main weaves: check with Spirit Power
// (class level + Spirit modifier), HP cost = the sum of the two dice (capped; 1-1 → 0
// and the weave fails). HP may drop to 0 or below.
const DU = ["Daemon", "Undead"];
const DH_FX = {
  "Фокус Эссенции": { self: true, ch: [[KT.hit, 1]], rounds: 3, note: ["Против Демонов и Нежити ещё +1 — вручную.", "Another +1 against Daemons and Undead — apply manually."] },
  "Техника Связывания Разума I": { ch: [[KT.dodge, -1]], rounds: 1, bind: true },
  "Техника Связывания Разума II": { ch: [[KT.hit, -1], [KT.mcast, -1]], rounds: 1, bind: true, note: ["−1 ко всем активным проверкам со сравнением значений успеха.", "−1 to all active checks that compare success values."] },
  "Техника Связывания Разума III": { ch: [[KT.allck, -1]], rounds: 1, bind: true },
  "Спектральный защитный круг": { ch: [[KT.red, 2]], rounds: 3, note: ["От Демонов и Нежити снижение 3, а не 2 — вручную.", "Against Daemons and Undead the reduction is 3 instead of 2 — apply manually."] },
  "Методы Исследования Бездны": { self: true, note: ["+1 к первой проверке Техники / Передвижения / Наблюдения / Знаний за 10 минут — вручную.", "+1 to the first Technique / Movement / Observation / Knowledge check within 10 minutes — apply manually."] },
  "Опека Бедствия": { self: true, note: ["+2 к Сопротивлению против Яда, Болезни и Проклятия на 10 минут — вручную.", "+2 to Resistance against Poison, Disease and Curse for 10 minutes — apply manually."] },
  "Изгоняющая зло световая пуля": { attack: { power: 20, powerDU: 40 } },
  "Изгоняющее зло световое копье": { attack: { power: 30, powerDU: 60 } },
};
const DH_BY_KEY = Object.fromEntries(Object.entries(DH_FX).map(([k, v]) => [tacKey(k), v]));
// the actor's own class item name (Russian, English or imported) — falls back to the default name of the client language
const dhClassName = (actor) => findClassItem(actor, "darkhunter")?.name ?? className("darkhunter");
export const weaveKnown = (name) => !!DH_BY_KEY[tacKey(canon(name))];
function spiritPower(actor) {
  const cls = findClassItem(actor, "darkhunter");
  return (Number(cls?.system.skilllevel) || 0) + (Number(actor.system.abilities?.mnd?.mod) || 0);
}
async function payHp(actor, cost) {
  const before = Number(actor.system.hp?.value) || 0;
  if (cost > 0) await actor.update({ "system.hp.value": before - cost });
  return L2(`ОЖ Тёмного охотника: ${before} → <b>${before - cost}</b> (−${cost})`, `Dark Hunter's HP: ${before} → <b>${before - cost}</b> (−${cost})`);
}

export async function useWeave(actor, item) {
  const s = item.system;
  if (s.constant) return item.roll(); // ◯ passive: just show the text
  const fx = DH_BY_KEY[tacKey(canon(item.name))] ?? {};
  const base = String(s.basehpcost ?? "").trim().toLowerCase();
  const cap = Number(s.maxhpcost) || 0;
  const me = selfToken(actor);
  const chosen = Array.from(game.user.targets);
  const isSelf = fx.self || /^(Заклина|Caster|Self)/i.test(String(s.target ?? ""));
  const lines = [];

  // ► light bullet / spear: the spell pipeline (check → Willpower for half → power)
  if (fx.attack) {
    if (!chosen.length) {
      ui.notifications.warn(L2(`${item.name}: выберите цель.`, `${item.name}: select a target.`));
      return null;
    }
    const isDU = DU.includes(chosen[0].actor?.system.classType);
    const dhClass = dhClassName(actor);
    const want = {
      "system.checkskill": dhClass, "system.checkabi": "mnd", "system.powerskill": dhClass, "system.powerabi": "mnd",
      "system.usepower": true, "system.power": isDU ? fx.attack.powerDU : fx.attack.power, "system.cvalue": 10,
      "system.applypower": "custom", "system.pwmdbt": true,
      "system.pwpdbt": false, "system.pwcdbt": false, "system.pwhrbt": false, "system.pwmrbt": false,
    };
    const diff = Object.fromEntries(Object.entries(want).filter(([k, v]) => foundry.utils.getProperty(item, k) !== v));
    if (!foundry.utils.isEmpty(diff)) await item.update(diff);
    item.system.resistinfo = { type: "Mndres", result: "halving" };
    let payLine = "";
    const msg = await castSpell(actor, item, { label: L2("Плетение сути", "Essence Weave"), pay: async () => "" });
    if (!msg) return msg;
    const dice = msg.rolls?.[0]?.dice?.[0]?.results?.map((r) => r.result) ?? [];
    const sum = dice.reduce((a, b) => a + b, 0);
    const fumble = dice[0] === 1 && dice[1] === 1;
    const cost = fumble ? 0 : cap ? Math.min(sum, cap) : sum;
    payLine = await payHp(actor, cost);
    const add = [payLine + L2(` <i>(сумма кубов ${sum}${cap ? `, не больше ${cap}` : ""}${fumble ? ", дубль 1 — 0" : ""})</i>`, ` <i>(dice sum ${sum}${cap ? `, at most ${cap}` : ""}${fumble ? ", double 1 — 0" : ""})</i>`), L2(`Мощь ${want["system.power"]}${isDU ? " (цель — Демон/Нежить)" : ""}, крит. порог 10`, `Power ${want["system.power"]}${isDU ? " (target is a Daemon/Undead)" : ""}, crit. threshold 10`)];
    await msg.update({ content: msg.content + add.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join("") });
    return msg;
  }

  // cost
  let cost = 0;
  let failed = false;
  if (base === "2d") {
    const sp = spiritPower(actor);
    const roll = await new Roll(`2d6 + ${sp}`).evaluate();
    const dice = roll.dice[0].results.map((r) => r.result);
    const sum = dice[0] + dice[1];
    failed = dice[0] === 1 && dice[1] === 1;
    cost = failed ? 0 : cap ? Math.min(sum, cap) : sum;
    lines.push(L2(`Проверка (Сила Духа ${sp}): ${dice.join(" + ")} + ${sp} = <b>${roll.total}</b>${failed ? " — <b>автопровал, плетение не сработало</b>" : ""}`, `Check (Spirit Power ${sp}): ${dice.join(" + ")} + ${sp} = <b>${roll.total}</b>${failed ? " — <b>automatic failure, the weave did not work</b>" : ""}`));
  } else if (base === "1d") {
    const roll = await new Roll("1d6").evaluate();
    cost = roll.total;
  } else cost = Number(base) || 0;
  lines.push(await payHp(actor, cost));

  // effects
  const targets = isSelf ? (me ? [me] : []) : chosen;
  if (!failed && fx.ch?.length) {
    if (!targets.length) lines.push(L2(`<b>Цель не выбрана — эффект не наложен.</b>`, `<b>No target selected — effect not applied.</b>`));
    else {
      if (fx.bind)
        for (const t of targets) {
          // «Mind Binding» I/II/III do not stack: the last one stays
          const old = t.actor?.effects.filter((e) => e.flags?.sw25?.dhBind).map((e) => e.id) ?? [];
          if (old.length && (game.user.isGM || t.actor.isOwner)) await t.actor.deleteEmbeddedDocuments("ActiveEffect", old);
        }
      const eff = timedEffect(item, actor, fx.ch, fx.rounds ?? 1);
      if (fx.bind) eff.flags.sw25.dhBind = true;
      await putEffects(actor, targets, [eff]);
      lines.push(`${escH(chText(fx.ch))} — ${L2(`на ${fx.rounds ?? 1} р.`, `for ${fx.rounds ?? 1} rd.`)}: ${targets.map((t) => escH(t.name)).join(", ")}`);
    }
  } else if (!failed && !fx.ch) lines.push(L2(`<i>Эффект применяется вручную${!isSelf && chosen.length ? ` (цель: ${chosen.map((t) => escH(t.name)).join(", ")})` : ""}.</i>`, `<i>Apply the effect manually${!isSelf && chosen.length ? ` (target: ${chosen.map((t) => escH(t.name)).join(", ")})` : ""}.</i>`));
  if (fx.note) lines.push(`<i>${escH(loc(fx.note))}</i>`);
  return classCard(actor, item, `${L2("Плетение сути", "Essence Weave")}${s.time ? ` · ${s.time}` : ""}`, lines);
}
