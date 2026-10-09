/*
 * Sword World 2.5 (sw25-ru) — multi-section monsters.
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.8): see LICENSE-SECTIONS.txt.
 */
/**
 * [Round 77] Multi-section monsters (SW2.5 «секции») — pilot.
 *
 * Design (option B «one actor + sections»):
 *  - flags.sw25.sections = [{ id, name, core, hp:{value,max}, mp:{value,max},
 *    hit, dmg, dodge, pp, down }]; flags.sw25.activeSection = id.
 *  - system.hp / system.mp stay the CORE section (all existing code keeps
 *    working: token bar1, death, session summary, damage cards).
 *  - system.sectionsTotal = {value,max} = sum of all sections (token bar2).
 *  - Any HP change aimed at the actor while a NON-core section is the active
 *    target is redirected to that section (preUpdateActor) — one choke point
 *    for every damage/heal path (cards, contests, spells, socket).
 *  - Protection of the active section replaces the core one in derived data;
 *    the dodge contest prefers the active section's attack item.
 *  - No template.json change (flags only) → no server restart needed.
 */

import { L2 } from "./monstergen-i18n.mjs";

const FLAG = "sw25";

/** A «section token» (satellite next to the main token) → the main token's actor. */
export function mainActorOf(actor) {
  const td = actor?.token;
  const id = td?.flags?.[FLAG]?.sectionOf;
  if (!id) return null;
  return td.parent?.tokens.get(id)?.actor ?? null;
}
const sectionIdOfToken = (actor) => actor?.token?.flags?.[FLAG]?.sectionId ?? null;

export function sectionsOf(actor) {
  const s = (mainActorOf(actor) ?? actor)?.flags?.[FLAG]?.sections;
  return Array.isArray(s) && s.length > 1 ? s : null;
}
export function activeSectionOf(actor) {
  const secs = sectionsOf(actor);
  if (!secs) return null;
  // [2026-10-07] a player's own pick (activeSectionBy.<userId>) wins over the shared one,
  // so two players aiming at different sections don't redirect each other's damage
  const fl = (mainActorOf(actor) ?? actor).flags[FLAG];
  const mine = game.user?.isGM ? undefined : fl.activeSectionBy?.[game.user?.id];
  const id = sectionIdOfToken(actor) ?? mine ?? fl.activeSection;
  return secs.find((s) => s.id === id) ?? secs.find((s) => s.core) ?? secs[0];
}
const coreOf = (secs) => secs.find((s) => s.core) ?? secs[0];
const norm = (s) => String(s ?? "").toLowerCase().replace(/ё/g, "е").trim();

/** Does this item belong to the given section (flag, or «(голова)» suffix)? */
export function itemSection(actor, item) {
  const secs = sectionsOf(actor);
  if (!secs) return null;
  const f = item.flags?.[FLAG]?.section;
  if (f) return secs.find((s) => s.id === f) ?? null;
  const m = item.name.match(/\(([^)]+)\)\s*$/);
  if (!m) return null;
  return secs.find((s) => norm(s.base ?? s.name) === norm(m[1])) ?? null;
}

/** Items of the active section first (used by the dodge contest lookup). */
export function sectionOrder(actor, items) {
  const act = activeSectionOf(actor);
  if (!act) return items;
  const mine = items.filter((i) => { const s = itemSection(actor, i); return s && norm(s.base ?? s.name) === norm(act.base ?? act.name); });
  return [...mine, ...items.filter((i) => !mine.includes(i))];
}

/* ---------------- parsing the stat block (gminfo) ---------------- */
const strip = (h) =>
  String(h || "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Parse «Секции: N (…)» + the «Боевой стиль» table into sections. */
export function parseSections(actor) {
  const lines = strip(actor.system.gminfo);
  const si = lines.findIndex((l) => /^(?:Секци[ия]|Sections?):?$/i.test(l) || /^(?:Секци[ия]|Sections?):/i.test(l));
  if (si < 0) return { error: L2("нет строки «Секции»", "no “Sections” line") };
  const secLine = /:\s*\S/.test(lines[si]) ? lines[si].split(":").slice(1).join(":") : lines[si + 1] ?? "";
  const n = parseInt(secLine);
  if (!(n > 1)) return { error: L2(`секций: ${secLine}`, `sections: ${secLine}`) };
  const coreName = (secLine.match(/(?:основная|main):\s*([^)]+)$/i) ?? [])[1]?.trim();
  const hi = lines.findIndex((l, i) => i > si && (l === "ОЖ" || /^HP$/i.test(l)) && (lines[i + 1] === "ОМ" || /^MP$/i.test(lines[i + 1] ?? "")));
  if (hi < 0) return { error: L2("нет таблицы «Боевой стиль»", "no “Fighting Style” table") };
  const rows = [];
  for (let i = hi + 2; i + 6 < lines.length; i += 7) {
    if (/^(?:Уникальные умения|Unique Skills)/i.test(lines[i])) break;
    const [name, hit, dmg, dodge, pp, hp, mp] = lines.slice(i, i + 7);
    if (!/^\d+$/.test(hp)) break;
    rows.push({ name, hit, dmg, dodge, pp: Number(pp) || 0, hp: Number(hp), mp: /^\d+$/.test(mp) ? Number(mp) : 0 });
  }
  if (rows.length < 2) return { error: L2(`в таблице строк: ${rows.length}`, `table rows: ${rows.length}`) };
  const nameOf = (r) => { const n = (r.name.match(/\(([^)]+)\)/)?.[1] ?? r.name).trim(); return n.charAt(0).toUpperCase() + n.slice(1); };
  const secs = rows.map((r, k) => ({
    id: `s${k}`,
    name: nameOf(r),
    style: r.name,
    core: false,
    hp: { value: r.hp, max: r.hp },
    mp: { value: r.mp, max: r.mp },
    hit: r.hit,
    dmg: r.dmg,
    dodge: r.dodge,
    pp: r.pp,
    down: false,
  }));
  const cnt = {};
  for (const s of secs) cnt[s.name] = (cnt[s.name] ?? 0) + 1;
  const idx = {};
  for (const s of secs) if (cnt[s.name] > 1) { idx[s.name] = (idx[s.name] ?? 0) + 1; s.base = s.name; s.name = `${s.name} ${idx[s.name]}`; }
  const core = (coreName && secs.find((s) => norm(s.base ?? s.name) === norm(coreName))) || secs[0];
  core.core = true;
  return { sections: secs, declared: n, coreName: core.name };
}

/** Write parsed sections onto the actor; core HP/MP/PP become the base values. */
export async function setupSections(actor) {
  const r = parseSections(actor);
  if (r.error) return r;
  const core = coreOf(r.sections);
  await actor.update({
    [`flags.${FLAG}.sections`]: r.sections,
    [`flags.${FLAG}.activeSection`]: core.id,
    "system.hpbase": core.hp.max,
    "system.hp.value": core.hp.max,
    "system.mpbase": core.mp.max,
    "system.mp.value": core.mp.max,
    "system.ppbase": core.pp,
  }, { sw25Direct: true });
  return r;
}

/* ---------------- derived data: protection + total bar ---------------- */
function patchDerived() {
  const cls = CONFIG.Actor.documentClass;
  const orig = cls.prototype.prepareDerivedData;
  if (orig.__sw25sections) return;
  const wrapped = function (...args) {
    const out = orig.apply(this, args);
    try {
      const secs = this.type === "monster" ? sectionsOf(this) : null;
      const sid = secs ? sectionIdOfToken(this) : null;
      if (sid) {
        // satellite token: show/hit its own section (data lives on the main token)
        const sec = secs.find((x) => x.id === sid);
        if (sec) {
          const extraPp = Number(this.system.pp) - Number(this.system.ppbase);
          this.system.hp = { ...this.system.hp, value: Number(sec.hp.value), max: Number(sec.hp.max) };
          this.system.mp = { ...this.system.mp, value: Number(sec.mp.value), max: Number(sec.mp.max) };
          this.system.pp = Number(sec.pp) + (Number.isFinite(extraPp) ? extraPp : 0);
          this.system.activeSectionName = sec.name;
        }
      } else if (secs) {
        const core = coreOf(secs);
        const act = activeSectionOf(this);
        if (act && act.id !== core.id) {
          const d = Number(act.pp) - Number(core.pp);
          this.system.pp = Number(this.system.pp) + d;
        }
        const others = secs.filter((s) => s.id !== core.id);
        this.system.sectionsTotal = {
          value: Math.max(0, Number(this.system.hp.value)) + others.reduce((a, s) => a + Math.max(0, Number(s.hp.value)), 0),
          max: Number(this.system.hp.max) + others.reduce((a, s) => a + Number(s.hp.max), 0),
        };
        this.system.activeSectionName = act?.name ?? "";
      }
    } catch (e) {
      console.error("SW25 | sections derived data", e);
    }
    return out;
  };
  wrapped.__sw25sections = true;
  cls.prototype.prepareDerivedData = wrapped;
}

/* ---------------- redirect HP changes to the active section ---------------- */
const _direct = new Set();

/** flags.sw25.loseOnAllDown = ["Голова", …] — monster is defeated when ALL those sections are down. */
function allDownRule(actor, secs) {
  const list = actor.flags?.[FLAG]?.loseOnAllDown;
  if (!Array.isArray(list) || !list.length) return false;
  const hit = secs.filter((x) => !x.core && list.some((n) => norm(x.base ?? x.name) === norm(n)));
  return hit.length > 0 && hit.every((x) => x.down);
}

/** Apply an HP delta to one section of the main actor (with chat messages). */
export async function damageSection(main, sid, delta) {
  const secs = sectionsOf(main);
  if (!secs || !delta) return;
  const copy = foundry.utils.deepClone(secs);
  const s = copy.find((x) => x.id === sid);
  if (!s || s.core) return main.update({ "system.hp.value": Number(main.system.hp.value) + delta }, { sw25Direct: true });
  const before = Number(s.hp.value);
  s.hp.value = Math.min(Number(s.hp.max), before + delta);
  const wasDown = s.down;
  s.down = s.hp.value <= 0;
  const msg = { name: main.name, section: s.name, before, after: s.hp.value, down: s.down && !wasDown, up: wasDown && !s.down };
  const upd = { [`flags.${FLAG}.sections`]: copy };
  if (allDownRule(main, copy)) upd["system.hp.value"] = 0;
  return main.update(upd, { sw25Direct: true, sw25SectionMsg: msg });
}

/* ---------------- several sections at once: area attacks, card apply, undo ---------------- */
const secHp = (actor, s) => (s.core ? Number(actor.system.hp.value) : Number(s.hp.value));
const secMax = (actor, s) => (s.core ? Number(actor.system.hp.max) : Number(s.hp.max));

/** Protection of one section (keeps whatever effects add to the derived value). */
export function sectionPP(actor, s) {
  const act = activeSectionOf(actor);
  return Number(actor.system.pp) - Number(act?.pp ?? 0) + Number(s.pp);
}

/**
 * Does this attack hit every section of a multi-section monster?
 * Area targets («1 область (радиус 3 м)/5», «Все области…») and «1 весь персонаж» do;
 * «1 персонаж» hits one section. Explicit item flag flags.sw25.allSections (true/false) wins.
 */
const ALL_RE = /(?:\d+(?:\s*-\s*\d+)?|все)\s*(?:област|зон)|(?:област[ьи]|зон[аы])\s*\(|вес[ья]\s+персонаж|цел(?:ый|ого)\s+персонаж|персонаж[а]?\s+целиком|все\s+секции|(?:\b\d+(?:\s*-\s*\d+)?|\ball)\s*(?:areas?|zones?)\b|\b(?:areas?|zones?)\s*\(|\b(?:whole|entire)\s+(?:body|character|target|monster)|\ball\s+(?:sections|parts)\b/i;
export function hitsAllSections(item) {
  if (!item) return false;
  const f = item.flags?.[FLAG]?.allSections;
  if (f === true || f === false) return f;
  const sys = item.system ?? {};
  // a monster ability with an area shape (flags.sw25.shape from the generator) covers the whole body
  if (item.flags?.[FLAG]?.shape?.kind === "area") return true;
  if (sys.target) return ALL_RE.test(String(sys.target));
  if (item.type === "monsterability") return ALL_RE.test(`${sys.overview ?? ""} ${String(sys.description ?? "").replace(/<[^>]+>/g, " ")}`);
  return false;
}

/** Pure: what a list of [{id, delta}] does to the actor → { update, actual, msgs }. */
function planDeltas(main, deltas) {
  const secs = sectionsOf(main);
  if (!secs) return null;
  const copy = foundry.utils.deepClone(secs);
  const core = coreOf(copy);
  const actual = [];
  const msgs = [];
  const hp0 = Number(main.system.hp.value);
  let coreHp = hp0;
  let touched = false;
  for (const { id, delta } of deltas ?? []) {
    const s = copy.find((x) => x.id === id);
    const d = Number(delta);
    if (!s || !d) continue;
    if (s.id === core.id) {
      const after = Math.min(Number(main.system.hp.max), coreHp + d);
      if (after !== coreHp) {
        actual.push({ id, delta: after - coreHp });
        msgs.push({ name: main.name, section: s.name, before: coreHp, after });
        coreHp = after;
      }
      continue;
    }
    const before = Number(s.hp.value);
    s.hp.value = Math.min(Number(s.hp.max), before + d);
    const wasDown = s.down;
    s.down = s.hp.value <= 0;
    if (s.hp.value !== before) {
      touched = true;
      actual.push({ id, delta: s.hp.value - before });
      msgs.push({ name: main.name, section: s.name, before, after: s.hp.value, down: s.down && !wasDown, up: wasDown && !s.down });
    }
  }
  if (touched && coreHp > 0 && allDownRule(main, copy)) {
    actual.push({ id: core.id, delta: -coreHp });
    msgs.push({ name: main.name, section: core.name, before: coreHp, after: 0 });
    coreHp = 0;
  }
  const update = {};
  if (touched) update[`flags.${FLAG}.sections`] = copy;
  if (coreHp !== hp0) update["system.hp.value"] = coreHp;
  return { update, actual, msgs };
}

/** Apply [{id, delta}] to the sections in ONE update (GM / owner). */
export async function applySectionDeltas(main, deltas) {
  const plan = planDeltas(main, deltas);
  if (!plan || foundry.utils.isEmpty(plan.update)) return plan;
  await main.update(plan.update, { sw25Direct: true, sw25SectionMsg: plan.msgs });
  return plan;
}

/** Same, but a player without ownership asks the active GM. Returns the plan computed locally. */
async function sendSectionDeltas(token, main, deltas) {
  if (game.user.isGM || main.isOwner) return applySectionDeltas(main, deltas);
  const plan = planDeltas(main, deltas);
  game.socket.emit(`system.${game.system.id}`, { method: "sw25SectionDeltas", sceneId: token.scene?.id ?? token.document?.parent?.id, tokenId: token.id, deltas });
  return plan;
}

/**
 * Apply a rolled value from a chat card to a multi-section monster:
 * to the current target section, or to every section still standing (area attacks).
 * type: buttonpd | buttonmd | buttoncd | buttonhr.
 */
export async function applyToSections(token, type, value, { all = false, healReverseBonus = 0 } = {}) {
  const actor = mainActorOf(token.actor) ?? token.actor;
  const secs = sectionsOf(actor);
  if (!secs) return null;
  const act = activeSectionOf(token.actor);
  let list = all ? secs.filter((x) => type === "buttonhr" || secHp(actor, x) > 0) : [act];
  if (!list.length) list = [act];
  const mpp = Number(actor.system.mpp) || 0;
  const v = Number(value) || 0;
  const want = list.map((x) => {
    let d = 0;
    if (type === "buttonpd") d = -Math.max(0, v - sectionPP(actor, x));
    else if (type === "buttonmd") d = -Math.max(0, v - mpp);
    else if (type === "buttoncd") d = -v;
    else if (type === "buttonhr") d = healReverseBonus > 0 ? -(v + healReverseBonus) : Math.max(0, Math.min(v, secMax(actor, x) - secHp(actor, x)));
    return { id: x.id, delta: d };
  });
  const single = list.length === 1 ? list[0] : null;
  const before = single ? secHp(actor, single) : secs.reduce((a, x) => a + Math.max(0, secHp(actor, x)), 0);
  const plan = await sendSectionDeltas(token, actor, want);
  const hit = new Set(list.map((x) => x.id));
  // the «all heads down → defeated» rule may also change the core: it counts for undo, not for the damage shown
  const shown = (plan?.actual ?? []).filter((a) => hit.has(a.id));
  const sum = shown.reduce((a, x) => a + x.delta, 0);
  const lines = list.map((x) => ({ name: x.name, delta: shown.find((a) => a.id === x.id)?.delta ?? 0 }));
  return {
    all: list.length > 1,
    label: single ? single.name : L2("все секции", "all sections"),
    lines,
    actual: plan?.actual ?? [],
    before,
    after: before + sum,
    value: Math.abs(sum),
  };
}

/** Undo what a card applied (the card keeps the exact per-section changes). */
export async function undoSectionDeltas(token, actual) {
  const actor = mainActorOf(token.actor) ?? token.actor;
  if (!sectionsOf(actor) || !Array.isArray(actual)) return null;
  return sendSectionDeltas(token, actor, actual.map((a) => ({ id: a.id, delta: -Number(a.delta) })).reverse());
}

/* ---------------- add / remove a section (monsters with a variable number of parts) ---------------- */
function renumber(secs, base) {
  const grp = secs.filter((x) => norm(x.base ?? x.name) === norm(base));
  if (grp.length === 1) { grp[0].name = base; delete grp[0].base; return; }
  grp.forEach((x, i) => { x.base = base; x.name = `${base} ${i + 1}`; });
}

/** One more section like this one («Лепесток 3» → + «Лепесток 4»), full HP. */
export async function addSection(actor, sid) {
  const cur = sectionsOf(actor);
  const from = cur?.find((x) => x.id === sid);
  if (!from) return null;
  const secs = foundry.utils.deepClone(cur);
  const base = from.base ?? from.name.replace(/\s+\d+$/, "");
  const n = Math.max(...secs.map((x) => Number(String(x.id).replace(/^s/, "")) || 0)) + 1;
  const copy = foundry.utils.deepClone(from);
  Object.assign(copy, { id: `s${n}`, core: false, down: false, base });
  copy.hp = { value: Number(from.hp.max), max: Number(from.hp.max) };
  copy.mp = { value: Number(from.mp.max), max: Number(from.mp.max) };
  const last = secs.map((x) => norm(x.base ?? x.name) === norm(base)).lastIndexOf(true);
  secs.splice(last + 1, 0, copy);
  renumber(secs, base);
  await actor.update({ [`flags.${FLAG}.sections`]: secs }, { sw25Direct: true });
  return copy.id;
}

/** GM button in a section header: create an attack or an ability that belongs to this section. */
export async function addSectionItem(actor, sid) {
  const sec = sectionsOf(actor)?.find((x) => x.id === sid);
  if (!sec) return null;
  const DV = foundry.applications?.api?.DialogV2;
  let kind = "attack";
  if (DV) {
    kind = await DV.wait({
      window: { title: L2(`Секция «${sec.name}»`, `Section “${sec.name}”`) },
      content: L2(`<p>Что добавить в секцию «${foundry.utils.escapeHTML(sec.name)}»?</p>`, `<p>What should be added to the section “${foundry.utils.escapeHTML(sec.name)}”?</p>`),
      buttons: [
        { action: "attack", label: L2("Атака (точность / урон / уклонение)", "Attack (accuracy / damage / evasion)"), default: true, callback: () => "attack" },
        { action: "ability", label: L2("Способность (пустая)", "Ability (blank)"), callback: () => "ability" },
        { action: "cancel", label: L2("Отмена", "Cancel"), callback: () => null },
      ],
      rejectClose: false,
    });
    if (!kind) return null;
  }
  const ref = actor.items.find((i) => i.type === "monsterability" && /^(?:Атака|Attack)/i.test(i.name));
  const base = ref ? foundry.utils.deepClone(ref._source.system) : { usedice1: true, label1: L2("Точность", "Accuracy"), label2: L2("Урон", "Damage"), label3: L2("Уклонение", "Evasion"), applycheck2: "on" };
  let name, system;
  if (kind === "attack") {
    name = L2(`Атака (${sec.name})`, `Attack (${sec.name})`);
    system = { ...base, checkbasemod1: 0, checkbasemod2: 0, checkbasemod3: 0, checkmod1: 0, checkmod2: 0, checkmod3: 0 };
  } else {
    name = L2("Новая способность", "New ability");
    system = { description: "", usedice1: false, label1: L2("Бросок", "Check"), label2: L2("Урон", "Damage"), label3: "Label3", checkbasemod1: 0, checkbasemod2: 0, checkbasemod3: 0 };
  }
  const [item] = await actor.createEmbeddedDocuments("Item", [{ name, type: "monsterability", system, flags: { [FLAG]: { section: sid } } }]);
  item?.sheet?.render(true);
  return item;
}

/** Remove a non-core section (at least two sections stay). */
export async function removeSection(actor, sid) {
  const cur = sectionsOf(actor);
  const s = cur?.find((x) => x.id === sid);
  if (!s) return false;
  if (s.id === coreOf(cur).id || cur.length <= 2) {
    ui.notifications?.warn(L2("Нельзя убрать основную секцию, и секций должно остаться не меньше двух.", "The main section cannot be removed, and at least two sections must remain."));
    return false;
  }
  const secs = foundry.utils.deepClone(cur).filter((x) => x.id !== sid);
  renumber(secs, s.base ?? s.name);
  const upd = { [`flags.${FLAG}.sections`]: secs };
  if (actor.flags?.[FLAG]?.activeSection === sid) upd[`flags.${FLAG}.activeSection`] = coreOf(secs).id;
  await actor.update(upd, { sw25Direct: true });
  return true;
}

function onPreUpdateActor(actor, changes, options) {
  if (options?.sw25Direct || _direct.delete(actor.uuid)) return;
  const mainForSat = mainActorOf(actor);
  if (mainForSat) {
    const nv = foundry.utils.getProperty(changes, "system.hp.value");
    if (nv === undefined) return;
    const delta = Number(nv) - Number(actor.system.hp.value);
    delete changes.system.hp.value;
    if (foundry.utils.isEmpty(changes.system.hp)) delete changes.system.hp;
    if (delta) damageSection(mainForSat, sectionIdOfToken(actor), delta);
    return;
  }
  const secs = sectionsOf(actor);
  if (!secs) return;
  const newHp = foundry.utils.getProperty(changes, "system.hp.value");
  if (newHp === undefined) return;
  const act = activeSectionOf(actor);
  const core = coreOf(secs);
  if (!act || act.id === core.id) return;
  const delta = Number(newHp) - Number(actor.system.hp.value);
  if (!delta) return;
  const copy = foundry.utils.deepClone(secs);
  const s = copy.find((x) => x.id === act.id);
  const before = Number(s.hp.value);
  s.hp.value = Math.min(Number(s.hp.max), before + delta);
  const wasDown = s.down;
  s.down = s.hp.value <= 0;
  delete changes.system.hp.value;
  if (foundry.utils.isEmpty(changes.system.hp)) delete changes.system.hp;
  foundry.utils.setProperty(changes, `flags.${FLAG}.sections`, copy);
  if (allDownRule(actor, copy)) foundry.utils.setProperty(changes, "system.hp.value", 0);
  options.sw25SectionMsg = { name: actor.name, section: s.name, before, after: s.hp.value, down: s.down && !wasDown, up: wasDown && !s.down };
}

function refreshSatellites(actor, origin) {
  const td = actor?.token;
  if (!td || !sectionsOf(actor)) return;
  for (const t of td.parent?.tokens ?? []) {
    if (t.flags?.[FLAG]?.sectionOf !== td.id) continue;
    t.actor?.reset();
    t.reset(); // token bars are prepared from actor data — re-prepare after the section changed
    t.object?.renderFlags?.set({ refreshBars: true });
    if (origin) {
      const s = sectionsOf(actor).find((x) => x.id === t.flags[FLAG].sectionId);
      const alpha = s?.down ? 0.4 : 1;
      if (s && t.alpha !== alpha) t.update({ alpha });
    }
  }
}

function onUpdateActor(actor, changes, options, userId) {
  refreshSatellites(actor, userId === game.user.id);
  if (sectionsOf(actor)) for (const t of actor.getActiveTokens()) t.renderFlags.set({ refreshState: true });
  const raw = options?.sw25SectionMsg;
  if (!raw || userId !== game.user.id) return;
  const list = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  if (!list.length) return;
  const gms = ChatMessage.getWhisperRecipients("GM");
  const line = (m) => { const d = m.after - m.before; return `<b>${m.name} — ${m.section}</b>: ${L2("ОЖ", "HP")} ${m.before} → ${m.after} (${d > 0 ? "+" : ""}${d})`; };
  ChatMessage.create({
    speaker: { alias: list[0].name },
    whisper: gms.map((u) => u.id),
    content: `<p>${list.map(line).join("<br>")}</p>`,
  });
  const turned = list.filter((m) => m.down || m.up);
  if (turned.length)
    ChatMessage.create({
      speaker: { alias: turned[0].name },
      content: `<p>${turned.map((m) => m.down
        ? L2(`<b>${m.name}</b>: секция «${m.section}» выведена из строя — её действия и способности недоступны.`, `<b>${m.name}</b>: section “${m.section}” is disabled — its actions and abilities are unavailable.`)
        : L2(`<b>${m.name}</b>: секция «${m.section}» снова в строю.`, `<b>${m.name}</b>: section “${m.section}” is back in action.`)).join("<br>")}</p>`,
    });
}

/* ---------------- sheet block ---------------- */
async function setActive(actor, id) {
  await actor.update({ [`flags.${FLAG}.activeSection`]: id }, { sw25Direct: true });
}
async function setSectionHp(actor, id, value) {
  const secs = foundry.utils.deepClone(sectionsOf(actor));
  const s = secs.find((x) => x.id === id);
  if (!s) return;
  if (s.core) return actor.update({ "system.hp.value": Number(value) }, { sw25Direct: true });
  s.hp.value = Math.min(Number(s.hp.max), Number(value));
  s.down = s.hp.value <= 0;
  const upd = { [`flags.${FLAG}.sections`]: secs };
  if (allDownRule(actor, secs)) upd["system.hp.value"] = 0;
  await actor.update(upd, { sw25Direct: true });
}

/* ---------------- which item belongs to which section ---------------- */
const GENERAL = "all";
const _assignCache = new WeakMap();

/** itemId → sectionId (or absent = all sections). Explicit flag > «(Голова)» suffix > stat-block text block. */
export function assignItems(actor) {
  const secs = sectionsOf(actor);
  if (!secs) return new Map();
  const key = actor.system.gminfo + "|" + actor.items.map((i) => i.id + (i.flags?.[FLAG]?.section ?? "")).join(",") + "|" + secs.map((x) => x.id).join();
  const c = _assignCache.get(actor);
  if (c?.key === key) return c.map;
  const map = new Map();
  const byBase = {};
  for (const x of secs) (byBase[norm(x.base ?? x.name)] ??= []).push(x);
  const used = {};
  const pick = (base, itemName) => {
    const list = byBase[norm(base)];
    if (!list) return null;
    const k = `${norm(base)}|${itemName}`;
    const n = used[k] ?? 0;
    used[k] = n + 1;
    return list[n % list.length];
  };
  const skip = (i) => i.type === "monsterability" && /^(?:Сопротивление|Resistance|Resist)$/i.test(i.name);
  // 1-2: flags and suffix
  for (const it of actor.items) {
    if (skip(it)) continue;
    const f = it.flags?.[FLAG]?.section;
    if (f) { if (f !== GENERAL && secs.some((x) => x.id === f)) map.set(it.id, f); continue; }
    const m = it.name.match(/\(([^)]+)\)\s*$/);
    const sec = m && pick(m[1], it.name);
    if (sec) map.set(it.id, sec.id);
  }
  // 3: «Голова:» / «●Тело» blocks of the unique abilities text
  const text = String(actor.system.gminfo || "").replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ");
  const part = (text.split(/Уникальные умения|Unique Skills/i)[1] ?? "").split(/\nТрофеи|\nLoot\b/i)[0];
  if (part) {
    const blocks = [];
    let cur = null;
    for (const raw of part.split("\n")) {
      const line = raw.trim();
      const h = line.match(/^[●•]?\s*([А-ЯЁA-Z][^:●]{1,30}?)\s*:?\s*$/u);
      const base = h && Object.keys(byBase).find((b) => norm(h[1]) === b || norm(h[1]).startsWith(b) || b.startsWith(norm(h[1]).replace(/и$/, "")));
      if (base) { cur = { base, text: "" }; blocks.push(cur); continue; }
      if (cur) cur.text += " " + line;
    }
    for (const it of actor.items) {
      if (skip(it) || map.has(it.id) || it.flags?.[FLAG]?.section) continue;
      const nm = norm(it.name.replace(/\s*\(.*\)$/, ""));
      if (nm.length < 3) continue;
      const b = blocks.find((bl) => norm(bl.text).includes(nm));
      const sec = b && pick(b.base, it.name);
      if (sec) map.set(it.id, sec.id);
    }
  }
  _assignCache.set(actor, { key, map });
  return map;
}

function sectionRows(actor) {
  const secs = sectionsOf(actor);
  const act = activeSectionOf(actor);
  const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
  return secs
    .map((s) => {
      const hp = s.core ? actor.system.hp : s.hp;
      const down = s.core ? Number(actor.system.hp.value) <= 0 : s.down;
      const pct = Math.max(0, Math.min(100, (100 * Number(hp.value)) / (Number(hp.max) || 1)));
      return `<div class="sw25-sec${down ? " down" : ""}${s.id === act?.id ? " active" : ""}" data-sec="${s.id}">
        <div class="sw25-sec-head">
          <a class="sw25-sec-target" data-tooltip="${L2("Цель для следующих атак и лечения", "Target for the next attacks and healing")}"><i class="fa-solid fa-crosshairs"></i></a>
          <span class="sw25-sec-name">${s.core ? "★ " : ""}${esc(s.name)}${down ? L2(" — выведена", " — disabled") : ""}</span>
          <span class="sw25-sec-bar"><span style="width:${pct}%"></span></span>
          <input class="sw25-sec-hp" type="number" value="${Number(hp.value)}"/> / ${Number(hp.max)}
          <span class="sw25-sec-stats">${L2("ОМ", "MP")} ${Number((s.core ? actor.system.mp : s.mp).value)}/${Number(s.mp.max)} · ${L2("Точн", "Acc")} ${esc(s.hit)} · ${L2("Урон", "Dmg")} ${esc(s.dmg)} · ${L2("Укл", "Eva")} ${esc(s.dodge)} · ${L2("Защ", "Def")} ${Number(s.pp)}</span>
          ${game.user.isGM ? `<span class="sw25-sec-tools"><a class="sw25-sec-additem" data-tooltip="${L2("Добавить атаку или способность в эту секцию", "Add an attack or an ability to this section")}"><i class="fa-solid fa-file-circle-plus"></i></a><a class="sw25-sec-add" data-tooltip="${L2("Добавить ещё одну такую секцию (полные ОЖ)", "Add one more section like this (full HP)")}"><i class="fa-solid fa-plus"></i></a>${s.core || secs.length <= 2 ? "" : `<a class="sw25-sec-del" data-tooltip="${L2("Убрать эту секцию", "Remove this section")}"><i class="fa-solid fa-trash"></i></a>`}</span>` : ""}
        </div>
        <ol class="items-list sw25-sec-list"></ol>
      </div>`;
    })
    .join("");
}

function onRenderSheet(app, html) {
  const own = app.actor ?? app.document;
  const actor = mainActorOf(own) ?? own;
  if (!actor || actor.type !== "monster" || !sectionsOf(actor)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  root.querySelector(".sw25-sections")?.remove();
  const secs = sectionsOf(actor);
  const tot = actor.system.sectionsTotal;
  const box = document.createElement("section");
  box.className = "sw25-sections";
  box.innerHTML = `<h3>${L2("Секции", "Sections")} <small>${L2("всего ОЖ", "total HP")} ${tot?.value ?? "?"} / ${tot?.max ?? "?"} · ${L2("цель", "target")}: <b>${foundry.utils.escapeHTML?.(String(activeSectionOf(actor)?.name ?? "")) ?? ""}</b></small></h3>${sectionRows(actor)}`;
  // put the block at the top of the tab that holds the monster's abilities
  const anyItem = root.querySelector("li.item[data-item-id]");
  const tab = anyItem?.closest(".tab") ?? root.querySelector(".sheet-body .tab.active") ?? root.querySelector(".sheet-body") ?? root;
  tab.prepend(box);
  // move every assigned item row (attacks, abilities, techniques, spells…) into its section
  const map = assignItems(actor);
  const opts = (sel) =>
    `<option value="${GENERAL}">${L2("Все секции", "All sections")}</option>` +
    secs.map((x) => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${foundry.utils.escapeHTML?.(String(x.name)) ?? x.name}</option>`).join("");
  for (const li of root.querySelectorAll("li.item[data-item-id]")) {
    if (li.closest(".sw25-sections") && !li.closest(".sw25-sec-list")) continue;
    const it = actor.items.get(li.dataset.itemId);
    if (!it || (it.type === "monsterability" && /^(?:Сопротивление|Resistance|Resist)$/i.test(it.name))) continue;
    const sid = map.get(it.id);
    if (game.user.isGM && !li.querySelector(".sw25-sec-assign")) {
      const sel = document.createElement("select");
      sel.className = "sw25-sec-assign";
      sel.dataset.tooltip = L2("Секция, которой принадлежит способность", "The section this ability belongs to");
      sel.innerHTML = opts(sid);
      sel.addEventListener("change", (ev) => it.update({ [`flags.${FLAG}.section`]: ev.currentTarget.value }));
      (li.querySelector(".flexrow") ?? li).appendChild(sel);
    }
    if (!sid) continue;
    const row = box.querySelector(`.sw25-sec[data-sec="${sid}"]`);
    if (!row) continue;
    row.querySelector(".sw25-sec-list").appendChild(li);
    if (row.classList.contains("down")) li.classList.add("sw25-sec-off");
  }
  box.querySelectorAll(".sw25-sec-target").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      setActive(actor, ev.currentTarget.closest(".sw25-sec").dataset.sec);
    })
  );
  box.querySelectorAll(".sw25-sec-additem").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      addSectionItem(actor, ev.currentTarget.closest(".sw25-sec").dataset.sec);
    })
  );
  box.querySelectorAll(".sw25-sec-add").forEach((a) =>
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      addSection(actor, ev.currentTarget.closest(".sw25-sec").dataset.sec);
    })
  );
  box.querySelectorAll(".sw25-sec-del").forEach((a) =>
    a.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const sid = ev.currentTarget.closest(".sw25-sec").dataset.sec;
      const name = sectionsOf(actor)?.find((x) => x.id === sid)?.name ?? "";
      const DV = foundry.applications?.api?.DialogV2;
      const ok = DV ? await DV.confirm({ window: { title: L2("Убрать секцию", "Remove section") }, content: L2(`<p>Убрать секцию «${foundry.utils.escapeHTML(name)}» у «${foundry.utils.escapeHTML(actor.name)}»?</p>`, `<p>Remove the section “${foundry.utils.escapeHTML(name)}” from “${foundry.utils.escapeHTML(actor.name)}”?</p>`), rejectClose: false }) : true;
      if (ok) removeSection(actor, sid);
    })
  );
  box.querySelectorAll(".sw25-sec-hp").forEach((inp) =>
    inp.addEventListener("change", (ev) => setSectionHp(actor, ev.currentTarget.closest(".sw25-sec").dataset.sec, ev.currentTarget.value))
  );
}

/* ---------------- token HUD: cycle the target section ---------------- */
function onRenderTokenHUD(hud, html) {
  const actor = hud.object?.actor;
  if (!actor || !sectionsOf(actor) || !game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const col = root?.querySelector(".col.left");
  if (!col) return;
  const btn = document.createElement("div");
  btn.className = "control-icon sw25-sec-hud";
  btn.dataset.tooltip = L2(`Секция-цель: ${activeSectionOf(actor)?.name}`, `Target section: ${activeSectionOf(actor)?.name}`);
  btn.innerHTML = `<i class="fa-solid fa-crosshairs"></i>`;
  btn.addEventListener("click", async () => {
    const secs = sectionsOf(actor);
    const i = secs.findIndex((s) => s.id === activeSectionOf(actor)?.id);
    const next = secs[(i + 1) % secs.length];
    await setActive(actor, next.id);
    ui.notifications.info(L2(`${actor.name}: цель — ${next.name}`, `${actor.name}: target — ${next.name}`));
    btn.dataset.tooltip = L2(`Секция-цель: ${next.name}`, `Target section: ${next.name}`);
  });
  col.appendChild(btn);
}

/* ---------------- satellite section tokens ---------------- */

export async function spawnSatellites(tokenDoc) {
  const actor = tokenDoc.actor;
  const secs = sectionsOf(actor);
  if (!secs || tokenDoc.flags?.[FLAG]?.sectionOf) return;
  const scene = tokenDoc.parent;
  if (scene.tokens.some((t) => t.flags?.[FLAG]?.sectionOf === tokenDoc.id)) return;
  const grid = scene.grid.size;
  const size = Math.max(1, Math.round(Number(tokenDoc.width) / 2));
  const others = secs.filter((s) => !s.core);
  const base = tokenDoc.toObject();
  const data = others.map((s, k) => {
    const d = foundry.utils.deepClone(base);
    delete d._id;
    d.name = `${tokenDoc.name}: ${s.name}`;
    d.width = d.height = size;
    d.x = tokenDoc.x + Number(tokenDoc.width) * grid + Math.floor(k / 2) * size * grid;
    d.y = tokenDoc.y + (k % 2) * size * grid;
    d.bar1 = { attribute: "hp" };
    d.bar2 = { attribute: null };
    d.displayName = CONST.TOKEN_DISPLAY_MODES.HOVER;
    d.alpha = s.down ? 0.4 : 1;
    d.flags = { ...(d.flags ?? {}), [FLAG]: { ...(d.flags?.[FLAG] ?? {}), sectionOf: tokenDoc.id, sectionId: s.id } };
    return d;
  });
  if (data.length) await scene.createEmbeddedDocuments("Token", data);
}

function registerSatelliteHooks() {
  Hooks.on("createToken", (doc, options, userId) => {
    if (userId !== game.user.id || options?.sw25NoSatellites) return;
    if (doc.flags?.[FLAG]?.sectionOf || doc.actorLink) return;
    if (game.settings.get(game.system.id, "sectionTokens") === false) return;
    spawnSatellites(doc);
  });
  Hooks.on("preUpdateToken", (doc, changes, options) => {
    if ("x" in changes || "y" in changes) options.sw25Old = { x: doc.x, y: doc.y };
  });
  Hooks.on("updateToken", (doc, changes, options, userId) => {
    if (userId !== game.user.id || !options.sw25Old || doc.flags?.[FLAG]?.sectionOf) return;
    // v14 movement: doc.x is still the old value here — use the change itself
    const dx = ("x" in changes ? changes.x : options.sw25Old.x) - options.sw25Old.x;
    const dy = ("y" in changes ? changes.y : options.sw25Old.y) - options.sw25Old.y;
    if (!dx && !dy) return;
    const upd = doc.parent.tokens
      .filter((t) => t.flags?.[FLAG]?.sectionOf === doc.id)
      .map((t) => ({ _id: t.id, x: t.x + dx, y: t.y + dy }));
    if (upd.length) doc.parent.updateEmbeddedDocuments("Token", upd, { animate: true });
  });
  Hooks.on("deleteToken", (doc, options, userId) => {
    if (userId !== game.user.id || doc.flags?.[FLAG]?.sectionOf) return;
    const ids = doc.parent.tokens.filter((t) => t.flags?.[FLAG]?.sectionOf === doc.id).map((t) => t.id);
    if (ids.length) doc.parent.deleteEmbeddedDocuments("Token", ids);
  });
  // bars of a satellite read the MAIN token's data: re-prepare once drawn
  Hooks.on("drawToken", (token) => {
    if (!token.document.flags?.[FLAG]?.sectionOf) return;
    setTimeout(() => {
      token.actor?.reset();
      token.document.reset();
      token.renderFlags?.set({ refreshBars: true });
    }, 0);
  });
  // satellites never get their own place in the combat tracker
  Hooks.on("preCreateCombatant", (c) => {
    if (c.token?.flags?.[FLAG]?.sectionOf) return false;
  });
}

/* ---------------- on-token section overlay (JRPG bars / satellite ring) ---------------- */
function hpOf(actor, s) {
  return s.core ? { value: Number(actor.system.hp.value), max: Number(actor.system.hp.max) } : { value: Number(s.hp.value), max: Number(s.hp.max) };
}
function shortName(s) {
  const n = String(s.name);
  const m = n.match(/^(\S)\S*(?:[-\s](\S))?\S*\s*(\d*)$/u);
  return m ? (m[1] + (m[2] ?? "") + (m[3] ?? "")).toUpperCase() : n.slice(0, 2);
}
function pctColor(p) {
  return p > 0.5 ? 0x4caf50 : p > 0.25 ? 0xe0a030 : 0xd04030;
}

export async function chooseSection(token, sid) {
  const actor = token.actor;
  if (!sectionsOf(actor)) return;
  if (game.user.isGM) await actor.update({ [`flags.${FLAG}.activeSection`]: sid }, { sw25Direct: true });
  else if (actor.isOwner) await actor.update({ [`flags.${FLAG}.activeSectionBy.${game.user.id}`]: sid }, { sw25Direct: true });
  else game.socket.emit(`system.${game.system.id}`, { method: "sw25SetSection", sceneId: token.scene.id, tokenId: token.id, sid, userId: game.user.id });
}

// Overlays live in their own container on the token layer (NOT inside the token:
// the token's hit area would swallow clicks on satellites outside its square).
const _overlays = new Map(); // token.id → PIXI.Container
let _overlayRoot = null;
function overlayRoot() {
  if (_overlayRoot && !_overlayRoot.destroyed && _overlayRoot.parent === canvas.tokens) return _overlayRoot;
  _overlayRoot = new PIXI.Container();
  _overlayRoot.eventMode = "static";
  _overlayRoot.sortableChildren = true;
  _overlayRoot.zIndex = 1000;
  canvas.tokens.addChild(_overlayRoot);
  return _overlayRoot;
}
function removeOverlay(id) {
  const c = _overlays.get(id);
  if (c && !c.destroyed) c.destroy({ children: true });
  _overlays.delete(id);
}
/** screen-size factor: keep overlays readable when zoomed out */
const zoomK = () => Math.min(4, Math.max(1, 1 / (canvas.stage?.scale?.x || 1)));

function drawOverlay(token) {
  removeOverlay(token.id);
  const actor = token.actor;
  if (!actor || token.document.flags?.[FLAG]?.sectionOf) return;
  const secs = sectionsOf(actor);
  if (!secs || !token.visible || token.document.hidden && !game.user.isGM) return;
  const act = activeSectionOf(actor);
  const gm = game.user.isGM;
  const k = zoomK();
  const c = new PIXI.Container();
  c.eventMode = "static";
  c.position.set(token.document.x, token.document.y);
  const w = token.w, h = token.h;
  const style = (size, color = 0xffffff) =>
    new PIXI.TextStyle({ fontFamily: "Signika, sans-serif", fontSize: size, fill: color, stroke: 0x000000, strokeThickness: Math.max(2, size / 4), fontWeight: "bold" });
  const bind = (g, sec) => {
    g.eventMode = "static";
    g.cursor = "pointer";
    g.on("pointerover", () => (g.alpha = 0.8));
    g.on("pointerout", () => (g.alpha = 1));
    g.on("pointerdown", (ev) => {
      ev.stopPropagation();
      chooseSection(token, sec.id);
      if (!token.isTargeted) { token._sw25SkipPick = true; token.setTarget(true, { releaseOthers: !ev.shiftKey }); }
    });
  };
  if (secs.length <= 4) {
    // JRPG bars stacked ABOVE the token, clear of the token's own bars
    const bh = 10 * k, gap = 5 * k, lift = 12 * k;
    const bw = Math.max(w, 150 * k);
    const x0 = (w - bw) / 2;
    secs.forEach((sec, i) => {
      const hp = hpOf(actor, sec);
      const down = hp.value <= 0;
      const p = Math.max(0, Math.min(1, hp.value / (hp.max || 1)));
      const y = -lift - (secs.length - i) * (bh + gap);
      const g = new PIXI.Graphics();
      g.beginFill(0x000000, 0.75).drawRoundedRect(x0, y, bw, bh, 3 * k).endFill();
      if (!down) g.beginFill(pctColor(p), 0.95).drawRoundedRect(x0 + 1, y + 1, (bw - 2) * p, bh - 2, 2 * k).endFill();
      else g.lineStyle(2, 0xaaaaaa).moveTo(x0 + 3, y + bh / 2).lineTo(x0 + bw - 3, y + bh / 2);
      if (sec.id === act?.id) g.lineStyle(2 * k, 0xffd54a).drawRoundedRect(x0 - 2, y - 2, bw + 4, bh + 4, 4 * k);
      g.hitArea = new PIXI.Rectangle(x0, y - gap / 2, bw, bh + gap);
      bind(g, sec);
      c.addChild(g);
      const label = `${sec.core ? "★" : ""}${sec.name}${gm ? `  ${hp.value}/${hp.max}` : ""}`;
      const t = new PIXI.Text(label, style(9 * k, down ? 0x999999 : 0xffffff));
      t.anchor.set(0, 0.5);
      t.position.set(x0 + 4 * k, y + bh / 2);
      t.eventMode = "none";
      c.addChild(t);
    });
  } else {
    // ring of satellites with a gap at the bottom for the name plate; core on top
    const r = Math.max(13, w * 0.12) * k;
    const R = Math.max(w, h) / 2 + r + 20 * k;
    const cx = w / 2, cy = h / 2;
    const n = secs.length;
    const order = [...secs.filter((x) => !x.core)];
    const coreSec = secs.find((x) => x.core) ?? secs[0];
    order.splice(Math.floor((n - 1) / 2), 0, coreSec);
    const gapDeg = 110, span = 360 - gapDeg, start = 90 + gapDeg / 2;
    order.forEach((sec, i) => {
      const hp = hpOf(actor, sec);
      const down = hp.value <= 0;
      const p = Math.max(0, Math.min(1, hp.value / (hp.max || 1)));
      const a = ((start + (n > 1 ? (i * span) / (n - 1) : 180)) * Math.PI) / 180;
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      const g = new PIXI.Graphics();
      g.beginFill(down ? 0x555555 : 0x202020, 0.88).drawCircle(x, y, r).endFill();
      if (!down && p > 0) {
        g.lineStyle(4 * k, pctColor(p), 1);
        g.arc(x, y, r - 2 * k, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p);
      }
      const sel = sec.id === act?.id;
      g.lineStyle(sel ? 3 * k : 1.5 * k, sel ? 0xffd54a : sec.core ? 0xffffff : 0x888888, 1).drawCircle(x, y, r);
      if (down) g.lineStyle(2.5 * k, 0xcc3333).moveTo(x - r * 0.6, y - r * 0.6).lineTo(x + r * 0.6, y + r * 0.6);
      g.hitArea = new PIXI.Circle(x, y, r + 3 * k);
      bind(g, sec);
      c.addChild(g);
      const t = new PIXI.Text((sec.core ? "★" : "") + shortName(sec), style(Math.max(9, r * 0.62), down ? 0xaaaaaa : 0xffffff));
      t.anchor.set(0.5);
      t.position.set(x, y);
      t.eventMode = "none";
      c.addChild(t);
      if (gm) {
        const v = new PIXI.Text(`${hp.value}`, style(9 * k, 0xffffaa));
        v.anchor.set(0.5, 0);
        v.position.set(x, y + r + 1);
        v.eventMode = "none";
        c.addChild(v);
      }
    });
  }
  overlayRoot().addChild(c);
  _overlays.set(token.id, c);
}

/** cheap per-frame follow while the token animates */
function followOverlay(token) {
  const c = _overlays.get(token.id);
  if (c && !c.destroyed) c.position.set(token.x, token.y);
}

/** T on a multi-section monster → pick the section (keys 1..N, Enter = current). */
async function pickSection(token) {
  const actor = token.actor;
  const secs = sectionsOf(actor);
  if (!secs) return;
  const act = activeSectionOf(actor);
  const gm = game.user.isGM;
  const esc = (x) => foundry.utils.escapeHTML?.(String(x)) ?? String(x);
  const rows = secs
    .map((s, i) => {
      const hp = hpOf(actor, s);
      const down = hp.value <= 0;
      return `<label style="display:flex;gap:6px;align-items:center;${down ? "opacity:.45" : ""}">
        <input type="radio" name="sec" value="${s.id}" ${s.id === act?.id ? "checked" : ""} ${down ? "disabled" : ""}/>
        <b>${i + 1}.</b> ${s.core ? "★ " : ""}${esc(s.name)} ${gm ? `<small>${hp.value}/${hp.max}</small>` : ""}${down ? L2(" — выведена", " — disabled") : ""}</label>`;
    })
    .join("");
  const DialogV2 = foundry.applications.api.DialogV2;
  const dlg = DialogV2.wait({
    window: { title: L2(`${token.name}: какую секцию бьёте?`, `${token.name}: which section do you attack?`) },
    position: { width: 280 },
    content: `<div class="sw25-secpick" style="display:flex;flex-direction:column;gap:4px">${rows}</div><p style="font-size:.8em;opacity:.7">${L2(`Клавиши 1–${secs.length}, Enter — выбрать`, `Keys 1–${secs.length}, Enter — select`)}</p>`,
    buttons: [{ action: "ok", label: L2("Бить", "Attack"), default: true, callback: (ev, btn) => btn.form.elements.sec.value }],
    rejectClose: false,
  });
  // digits pick + confirm
  setTimeout(() => {
    const el = document.querySelector(".sw25-secpick")?.closest("dialog, .application");
    el?.addEventListener("keydown", (ev) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= secs.length) {
        const inp = el.querySelectorAll('input[name="sec"]')[n - 1];
        if (inp && !inp.disabled) { inp.checked = true; el.querySelector('button[data-action="ok"]')?.click(); }
      }
    });
  }, 50);
  const sid = await dlg.catch(() => null);
  if (sid && sid !== "ok") await chooseSection(token, sid);
}

function onTargetToken(user, token, targeted) {
  if (user.id !== game.user.id || !targeted) return;
  if (token._sw25SkipPick) { token._sw25SkipPick = false; return; }
  if (!sectionsOf(token.actor) || token.document.flags?.[FLAG]?.sectionOf) return;
  // only when aiming at an enemy (not when buffing/healing an ally)
  const ctl = canvas.tokens.controlled;
  const mine = ctl[0]?.document.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  if (token.document.disposition === mine && !game.user.isGM) return;
  // [2026-10-07] the GM acting AS a monster (its token is selected) and
  // targeting that monster or its own side (self-buff, heal) is not an attack
  if (ctl.length && (ctl.some((t) => t.id === token.id) || ctl[0].document.disposition === token.document.disposition)) return;
  pickSection(token);
}

export function registerSections() {
  game.settings.register(game.system.id, "sectionTokens", {
    name: "SETTING.sectionTokens.name", // lang keys: at init the client language is not known yet
    hint: "SETTING.sectionTokens.hint",
    scope: "world", config: true, type: Boolean, default: false,
  });
  registerSatelliteHooks();
  Hooks.on("refreshToken", (token, flags) => {
    if (flags?.refreshPosition && !flags.refreshBars && !flags.refreshState && _overlays.has(token.id)) return followOverlay(token);
    drawOverlay(token);
  });
  Hooks.on("destroyToken", (token) => removeOverlay(token.id));
  Hooks.on("canvasTearDown", () => { _overlays.clear(); _overlayRoot = null; });
  let _lastK = 0;
  Hooks.on("canvasPan", () => {
    const k = zoomK();
    if (Math.abs(k - _lastK) < 0.05) return;
    _lastK = k;
    for (const t of canvas.tokens.placeables) if (_overlays.has(t.id)) drawOverlay(t);
  });
  Hooks.on("targetToken", onTargetToken);
  Hooks.once("ready", () => {
    // world actors are prepared before this module patches the derived data: redo them once
    for (const a of game.actors) if (sectionsOf(a)) a.reset();
    game.socket.on(`system.${game.system.id}`, async (data) => {
      if (game.users.activeGM?.id !== game.user.id) return;
      if (data?.method !== "sw25SetSection" && data?.method !== "sw25SectionDeltas") return;
      const tok = game.scenes.get(data.sceneId)?.tokens.get(data.tokenId);
      if (!tok?.actor) return;
      if (data.method === "sw25SectionDeltas") await applySectionDeltas(mainActorOf(tok.actor) ?? tok.actor, data.deltas);
      else await tok.actor.update({ [`flags.${FLAG}.${data.userId ? `activeSectionBy.${data.userId}` : "activeSection"}`]: data.sid }, { sw25Direct: true });
    });
  });
  patchDerived();
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("renderActorSheet", onRenderSheet);
  Hooks.on("renderTokenHUD", onRenderTokenHUD);
  // Token HUD bar edits are aimed at the bar itself (core HP), not the target section.
  Hooks.on("modifyTokenAttribute", (data, updates, actor) => {
    if (actor && data?.attribute === "hp" && sectionsOf(actor)) _direct.add(actor.uuid);
  });
  const css = document.createElement("style");
  css.textContent = `
.sw25-sections{border:1px solid #b9a77a;border-radius:6px;padding:4px 8px;margin:4px 0 8px;background:rgba(255,250,235,.6)}
.sw25-sections h3{margin:2px 0 4px;font-size:1.05em;border:none}
.sw25-sections h3 small{font-weight:normal;font-size:.8em;color:#555}
.sw25-sec{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:3px 2px;border-top:1px dashed #d4c79f}
.sw25-sec.active{background:rgba(255,215,120,.35)}
.sw25-sec.down{opacity:.5}
.sw25-sec-target{cursor:pointer;color:#777}.sw25-sec.active .sw25-sec-target{color:#b33}
.sw25-sec-name{font-weight:bold;min-width:90px}
.sw25-sec-bar{flex:0 0 90px;height:8px;background:#ddd;border-radius:4px;overflow:hidden}
.sw25-sec-bar span{display:block;height:100%;background:#4a9a4a}
.sw25-sec-hp{width:52px;height:22px}
.sw25-sec-stats{font-size:.85em;color:#444}
.sw25-sec-items{flex-basis:100%;font-size:.8em;color:#666;padding-left:22px}
.sw25-sec{display:block}
.sw25-sec-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.sw25-sec-list{margin:2px 0 4px 18px;padding:0;border-left:2px solid #d4c79f}
.sw25-sec-list li.item{background:rgba(255,255,255,.35)}
li.item.sw25-sec-off{opacity:.45;pointer-events:none;filter:grayscale(1)}
select.sw25-sec-assign{flex:0 0 92px;height:20px;font-size:.75em;margin-left:4px}
.sw25-sec-tools{margin-left:auto;display:flex;gap:8px;opacity:.45}.sw25-sec:hover .sw25-sec-tools{opacity:1}
.sw25-sec-tools a{cursor:pointer;color:#555}.sw25-sec-tools a:hover{color:#b33}
.sw25-apply-secs{font-size:.85em;color:#555;text-align:right;margin-top:2px}`;
  document.head.appendChild(css);
  game.sw25 = Object.assign(game.sw25 ?? {}, { sections: { parseSections, setupSections, sectionsOf, activeSectionOf, spawnSatellites, damageSection, applySectionDeltas, applyToSections, hitsAllSections, addSection, removeSection } });
}
