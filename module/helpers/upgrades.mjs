/*
 * Sword World 2.5 Plus (sw25-ru)
 * Copyright (c) 2026 IIP0CTOy. All rights reserved.⁠​‌​​‌​​‌​‌​​‌​​‌​‌​‌​​​​​​‌‌​​​​​‌​​​​‌‌​‌​‌​‌​​​‌​​‌‌‌‌​‌‌‌‌​​‌​​‌​‌‌‌‌​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​​‌​‌‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌‌‌​​‌‌​​‌​​​‌‌​‌​​​‌‌​​​‌​​​‌‌​​‌​​​‌‌​​​‌​​‌‌​​‌​⁠
 * NOT covered by the MIT License of this repository (since 2.4.1-ru.11.3): see LICENSE-RESERVED.txt.
 */
/**
 * Weapon / armour upgrades, applied to an existing item. The system ships NO book tables:
 *  - «+N»: weapon Accuracy and Extra Damage +N, armour / shield Defense +N (the price of +1 / +2 is a
 *    world setting the GM fills in from their rulebook);
 *  - upgrades and Abyss enhancements are items flagged flags.sw25.enh, Abyss curses items flagged
 *    flags.sw25.curse — made by the GM in the item constructor, or from module data
 *    (catalog.mjs). An Abyss enhancement needs a curse (rolled 2d → the curse with that number, or picked).
 *
 * Everything is reversible: flags.sw25.upg keeps what was added to the item fields
 * (delta), so the next «Apply» first takes it off, then applies the new set.
 * Actor-wide parts are transfer effects on the item (flags.sw25.upgFx). Curses that work
 * «while carried» are flagged carried and stay on while the item is unequipped; a curse with
 * `off` is flagged whenOff: on only while the item is NOT equipped (sw25.mjs syncEquipEffects).
 *
 * Specs (copied into the plan, so an item keeps working without its source):
 *   enh   = { kinds[], f{field: delta}, fx[[key, value]], p: ""|"cls"|"type", price[B,A,S], tag{ru,en,ja}, el{physical{},magic{}}, abyss,
 *             guard{uses, repair[B,A,S]} }   guard: armour that cuts gun-shot damage by its own Defense, `uses` times (flags.sw25.guard)
 *   curse = { code, name{}, text{}, carried, p, manual, weapon{f,fx,off}, armor{f,fx,off} }
 *   plan.cstr = custom forging of a weapon (not a gun): Min. Strength and Power move together, ±3 at most,
 *               Min. Strength never below 1; the price per point comes from module data or a world setting.
 *   In keys «{cls}» is one monster category (a group expands), «{type}» a damage type, «{dk}» physical / magic.
 */
import { L2, uiLang } from "./monstergen-i18n.mjs";
import { priceFactor } from "./ranks.mjs";
import { flaggedItems, extraData } from "./catalog.mjs";

const N = (v, d = 0) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : d; };
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const T = (p) => L2(p[0], p[1]);
const loc3 = (v) => (v && typeof v === "object" ? v[uiLang()] ?? v.en ?? v.ru ?? "" : String(v ?? ""));
const rankIx = (r) => ({ B: 0, A: 1, S: 2, SS: 2 }[String(r ?? "").toUpperCase()] ?? 0);
// [ru.11.1] Abyss shards: 3 for the first Abyss Enhancement of an item, 6 for the second
const SHARD_RE = /^(?:Осколк[иа]? Бездны|Осколок Бездны|Abyss Shards?|アビスシャード)$/i;
const shardItems = (actor) => (actor?.items ?? []).filter((i) => SHARD_RE.test(String(i.name ?? "").trim()));
const shardCount = (actor) => shardItems(actor).reduce((n, i) => n + (Number(i.system?.quantity) || 0), 0);
const shardsFor = (had, now) => [3, 6].slice(had, Math.max(had, now)).reduce((a, b) => a + b, 0);
async function spendShards(actor, n) {
  for (const i of shardItems(actor)) {
    if (n <= 0) break;
    const q = Number(i.system?.quantity) || 0, take = Math.min(q, n);
    n -= take;
    if (q - take > 0) await i.update({ "system.quantity": q - take });
    else await i.delete();
  }
}

/* ---------------- monster categories and damage types (system vocabulary) ---------------- */
export const CLASSES = [
  ["Barbarous", ["Варвар", "Barbarous"]], ["Animal", ["Животное", "Animal"]], ["Plant", ["Растение", "Plant"]],
  ["Undead", ["Нежить", "Undead"]], ["MagicCreature", ["Конструкт", "Construct"]], ["Machine", ["Магитех", "Magitech"]],
  ["Eidolon", ["Мифический зверь", "Mythical Beast"]], ["Fairie", ["Фея", "Fairy"]], ["Daemon", ["Демон", "Daemon"]], ["Human", ["Гуманоид", "Humanoid"]],
];
const CLASS_GROUP = { anyA: ["Barbarous", "Animal", "Plant", "Undead", "MagicCreature"], anyB: ["Machine", "Eidolon", "Fairie", "Daemon", "Human"] };
export const TYPES = [
  ["earth", ["Земля", "Earth"]], ["ice", ["Вода/лёд", "Water/Ice"]], ["fire", ["Огонь", "Fire"]], ["wind", ["Ветер", "Wind"]],
  ["thunder", ["Молния", "Lightning"]], ["energy", ["Энергия", "Energy"]], ["cut", ["Рубящий", "Slashing"]], ["impact", ["Дробящий", "Bludgeoning"]],
  ["poison", ["Яд", "Poison"]], ["disease", ["Болезнь", "Disease"]], ["curse", ["Проклятие", "Curse"]], ["mental", ["Психический", "Psychic"]],
];
const clsName = (k) => (CLASS_GROUP[k] ? CLASS_GROUP[k].map(clsName).join(", ") : T(CLASSES.find((c) => c[0] === k)?.[1] ?? [k, k]));
const typeName = (k) => T(TYPES.find((t) => t[0] === k)?.[1] ?? [k, k]);
const clsList = (k) => CLASS_GROUP[k] ?? (k ? [k] : []);

/* ---------------- what the item is ---------------- */
const kindOf = (it) => (it.type === "weapon" ? "weapon" : it.system?.category === "shield" ? "shield" : "armor");
const dmgKind = (it) => (it.system?.category === "gun" ? "magic" : "physical");
export const upgOf = (it) => it?.flags?.sw25?.upg ?? null;

/** Effect rows of a spec for this item and parameter. */
function expand(rows, it, p) {
  const dk = dmgKind(it);
  return (rows ?? []).flatMap(([key, value]) => {
    const k = String(key).replaceAll("{dk}", dk).replaceAll("{type}", p ?? "");
    return k.includes("{cls}") ? clsList(p).map((c) => [k.replaceAll("{cls}", c), value]) : [[k, value]];
  });
}
const curseMech = (it, c) => (it.type === "weapon" ? c?.weapon : c?.armor) ?? {};
const priceAt = (spec, r) => (Array.isArray(spec?.price) ? N(spec.price[Math.min(r, spec.price.length - 1)]) : N(spec?.price));

/* ---------------- +N price (world settings, else module data) ---------------- */
let _magicPrices = null, _customPrices = null;
async function loadMagicPrices() { const p = (await extraData()).prices ?? {}; _magicPrices = p.magic ?? null; _customPrices = p.custom ?? null; }
/** Price of +N for this item, or null when the GM has not set it. */
/** [ru.12] the GM's smithy price table (by rank B / A / S): { weapon1: [..], weapon2, armor1, armor2, custom } */
const forgeTable = () => { try { return game.settings.get(game.system.id, "forgePrices") ?? {}; } catch (e) { return {}; } };
const fromTable = (key, it) => { const row = forgeTable()[key]; return Array.isArray(row) ? N(row[rankIx(it.system?.rank)]) : 0; };
function plusPrice(it, n) {
  if (!n) return 0;
  const key = `forge${kindOf(it) === "weapon" ? "Weapon" : "Armor"}${n}`;
  let v = fromTable(`${kindOf(it) === "weapon" ? "weapon" : "armor"}${n}`, it);
  if (!v) try { v = N(game.settings.get(game.system.id, key)); } catch (e) { /* not registered */ }
  if (!v && n === 1 && _magicPrices) v = N(_magicPrices[Math.min(rankIx(it.system?.rank), _magicPrices.length - 1)]);
  return v || null;
}

/** Custom forging: only weapons that are not guns. */
const canCustom = (it) => kindOf(it) === "weapon" && it.system?.category !== "gun";
const sg = (n) => (n > 0 ? `+${n}` : String(n));
/** Price of one point of custom forging for this item, or null when nobody set it. */
function customPrice(it) {
  let v = fromTable("custom", it);
  if (!v) try { v = N(game.settings.get(game.system.id, "forgeCustom")); } catch (e) { /* not registered */ }
  if (!v && _customPrices) v = N(_customPrices[Math.min(rankIx(it.system?.rank), _customPrices.length - 1)]);
  return v || null;
}
/** Allowed custom forging steps: −3…+3, Min. Strength stays at least 1. */
function customRange(it) {
  const plan = upgOf(it)?.plan ?? {};
  const base = N(it.system?.reqstr) - N(plan.cstr);
  return { lo: Math.max(-3, 1 - base), hi: 3 };
}

/** All the item changes for a plan. plan: { plus, enh: [{ name, spec }], abyss: [{ name, spec, p, curse: { name, spec }, cp }] } */
function compute(it, plan) {
  const kind = kindOf(it), r = rankIx(it.system?.rank);
  const f = {}, fx = [], lines = [], tags = [], el = { physical: {}, magic: {} };
  let price = 0, unpriced = false, guard = null;
  const carried = [];
  const add = (k, v) => { f[k] = (f[k] ?? 0) + N(v); };
  const plus = Math.max(0, Math.min(3, N(plan.plus)));
  if (plus) {
    if (kind === "weapon") { add("hit", plus); add("dmod", plus); lines.push(L2(`Магическое оружие +${plus}: точность +${plus}, дополнительный урон +${plus}.`, `Magic Weapon +${plus}: Accuracy +${plus}, Extra Damage +${plus}.`)); }
    else { add("pp", plus); lines.push(L2(`Магическая защита +${plus}: защита +${plus}.`, `Magic +${plus}: Defense +${plus}.`)); }
    const pp = plusPrice(it, plus);
    if (pp == null) unpriced = true; else price += pp;
  }
  const useSpec = (s, p) => {
    for (const [k, v] of Object.entries(s.f ?? {})) add(k, v);
    for (const [key, value] of expand(s.fx, it, p)) fx.push({ key, value, carried: false });
    for (const [g, ks] of Object.entries(s.el ?? {})) for (const [k, on] of Object.entries(ks ?? {})) if (on) (el[g] ??= {})[k] = true;
    if (s.guard && N(s.guard.uses) > 0 && kind === "armor") guard = { uses: N(s.guard.uses), repair: s.guard.repair ?? 0 };
    price += priceAt(s, r);
  };
  // custom forging: Min. Strength and Power move together
  const cs = canCustom(it) ? Math.max(-3, Math.min(3, Math.trunc(N(plan.cstr)))) : 0;
  if (cs) {
    add("reqstr", cs); add("power", cs);
    lines.push(L2(`Подгонка: мин. сила ${sg(cs)}, мощь ${sg(cs)}.`, `Custom-forged: Min. Strength ${sg(cs)}, Power ${sg(cs)}.`));
    tags.push(L2(`Подгонка ${sg(cs)}`, `Custom ${sg(cs)}`));
    const cp = customPrice(it);
    if (cp == null) unpriced = true; else price += Math.abs(cs) * cp;
  }
  for (const e of plan.enh ?? []) {
    if (!e?.spec || !(e.spec.kinds ?? []).includes(kind)) continue;
    useSpec(e.spec);
    const tag = loc3(e.spec.tag);
    if (tag) tags.push(tag);
    lines.push(`${loc3(e.name)}.`);
    if (e.spec.guard && kind === "armor" && N(e.spec.guard.uses) > 0) lines.push(L2(`Защита от выстрелов (ружьё): урон снижается на защиту самой брони, ${N(e.spec.guard.uses)} раз; ремонт — в кузнице.`, `Shot protection (guns): the damage is reduced by the armor's own Defense, ${N(e.spec.guard.uses)} times; repairs at the smithy.`));
  }
  const abyss = (plan.abyss ?? []).filter((a) => a?.spec).slice(0, 2);
  abyss.forEach((a, n) => {
    useSpec(a.spec, a.p);
    const pName = a.spec.p === "cls" ? clsName(a.p) : a.spec.p === "type" ? typeName(a.p) : "";
    const nm = pName ? `${loc3(a.name)} (${pName})` : loc3(a.name);
    lines.push(L2(`Бездна ${n + 1}: ${nm}.`, `Abyss ${n + 1}: ${nm}.`));
    const cu = a.curse?.spec;
    if (cu) {
      const mech = curseMech(it, cu);
      for (const [k, v] of Object.entries(mech.f ?? {})) add(k, v);
      for (const [key, value] of expand(mech.fx, it, a.cp)) fx.push({ key, value, carried: !!cu.carried && !mech.off, off: !!mech.off });   // off: only while the item is not in use
      const cp = cu.p === "cls" ? clsName(a.cp) : cu.p === "type" ? typeName(a.cp) : "";
      const when = cu.carried ? L2("пока носят", "when carried") : L2("пока экипирован", "when equipped");
      const name = loc3(cu.name ?? a.curse.name);
      const txt = [loc3(cu.text), cp ? `— ${cp}` : "", cu.manual || !(mech.fx?.length || Object.keys(mech.f ?? {}).length) ? L2("[вручную]", "[manual]") : ""].filter(Boolean).join(" ");
      lines.push(L2(`Проклятие «${name}» (${when}): ${txt}`, `Abyss Curse «${name}» (${when}): ${txt}`));
      tags.push(name);
      if (cu.carried) carried.push(cu.code ?? name);
    }
  });
  return { f, fx, lines, tags, price, unpriced, plus, el, carried, guard, cs };
}

/** Apply a plan to the item (undoing the previous one first). */
export async function applyUpgrades(it, plan) {
  const old = upgOf(it) ?? { delta: {}, price: 0, name: null, elements: {} };
  const res = compute(it, plan);
  const sys = it.system ?? {};
  const upd = {};
  // fields: base = current − old delta, then + new delta (with the book minimums)
  const keys = new Set([...Object.keys(old.delta ?? {}), ...Object.keys(res.f)]);
  const delta = {};
  for (const k of keys) {
    const base = N(sys[k], k === "cvalue" ? 10 : 0) - N(old.delta?.[k]);
    let v = base + N(res.f[k]);
    if (k === "reqstr") v = Math.max(1, v);
    if (k === "cvalue" && N(res.f[k]) < 0) v = Math.max(Math.min(8, base), v);
    if (k === "pp") v = Math.max(0, v);
    if (k === "power") v = Math.max(0, Math.min(100, v));
    upd[`system.${k}`] = k === "reqstr" && typeof sys.reqstr === "string" ? String(v) : v;
    delta[k] = v - base;
  }
  // price
  const basePrice = sys.price === "" || sys.price == null ? NaN : N(sys.price, NaN) - N(old.price);   // no price stays no price
  if (Number.isFinite(basePrice)) upd["system.price"] = basePrice + res.price;
  // name: strip the old additions, add the new ones
  const baseName = old.name ?? it.name;
  upd.name = baseName + `${res.plus ? ` +${res.plus}` : ""}${res.tags.length ? ` [${res.tags.join(", ")}]` : ""}`;
  // elements added by upgrades (taken off first)
  for (const [g, ks] of Object.entries(old.elements ?? {})) for (const k of Object.keys(ks ?? {})) upd[`system.elements.${g}.${k}`] = false;
  for (const [g, ks] of Object.entries(res.el)) for (const k of Object.keys(ks)) upd[`system.elements.${g}.${k}`] = true;
  if (Object.keys(res.el.magic ?? {}).length > 1) upd["system.elements.type"] = "or";
  // description block
  const desc = String(sys.description ?? "").replace(/<div class="sw25-upg">[\s\S]*?<\/div>/, "");
  upd["system.description"] = res.lines.length ? `${desc}<div class="sw25-upg"><p><b>${L2("Улучшения", "Upgrades")}</b></p>${res.lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>` : desc;
  const empty = !res.lines.length;
  upd["flags.sw25.upg"] = empty ? null : { plan, delta, price: Number.isFinite(basePrice) ? res.price : 0, name: baseName, elements: res.el };
  // shot protection: its uses survive a re-apply (a new one starts full)
  const og = it.flags?.sw25?.guard;
  if (res.guard) upd["flags.sw25.guard"] = { uses: res.guard.uses, left: og ? Math.max(0, Math.min(N(og.left), res.guard.uses)) : res.guard.uses, repair: res.guard.repair };
  else if (og) upd["flags.sw25.guard"] = null;
  const oldName = it.name;
  await it.update(upd);
  // the attack weapon is chosen by name on the sheet: follow the rename
  if (it.actor && upd.name !== oldName && it.actor.system?.hitweapon === oldName) await it.actor.update({ "system.hitweapon": upd.name });
  // effects
  const oldFx = it.effects.filter((e) => e.flags?.sw25?.upgFx).map((e) => e.id);
  if (oldFx.length) await it.deleteEmbeddedDocuments("ActiveEffect", oldFx);
  const eq = sys.equip === true || !it.actor;
  const mk = (rows, carried) => ({
    name: carried ? L2(`${baseName}: проклятие (при себе)`, `${baseName}: curse (carried)`) : L2(`${baseName}: улучшения`, `${baseName}: upgrades`),
    img: carried ? "icons/magic/unholy/orb-glowing-purple.webp" : "icons/commodities/gems/gem-faceted-navette-blue.webp",
    transfer: true, disabled: carried ? false : !eq,
    changes: rows.map((r) => ({ key: r.key, type: "add", value: String(r.value), phase: "initial" })),
    flags: { sw25: { upgFx: true, carried } },
  });
  const docs = [];
  const eqRows = res.fx.filter((r) => !r.carried && !r.off), cRows = res.fx.filter((r) => r.carried), offRows = res.fx.filter((r) => r.off);
  if (eqRows.length) docs.push(mk(eqRows, false));
  if (cRows.length) docs.push(mk(cRows, true));
  if (offRows.length) docs.push({ ...mk(offRows, false), name: L2(`${baseName}: проклятие (не в руках)`, `${baseName}: curse (not in use)`), img: "icons/magic/unholy/orb-glowing-purple.webp", disabled: eq, flags: { sw25: { upgFx: true, carried: false, whenOff: true } } });
  if (docs.length) await it.createEmbeddedDocuments("ActiveEffect", docs);
  return res;
}

/* ---------------- dice ---------------- */
async function d66(flavor) {
  const r = await new Roll("1d6+1d6").evaluate();
  const [a, b] = r.dice.map((d) => d.total);
  await r.toMessage({ flavor, rollMode: game.settings.get("core", "rollMode") });
  return a * 10 + b;
}
/** Curse roll → the index of the curse with that number; rerolls curses the owner already has. -1 = none found. */
async function rollCurse(it, curses, taken) {
  const own = new Set(taken.map(Number));
  for (const o of it.actor?.items ?? []) if (o.id !== it.id) for (const a of upgOf(o)?.plan?.abyss ?? []) if (a?.curse?.spec?.code) own.add(N(a.curse.spec.code));
  for (let i = 0; i < 20; i++) {
    const c = await d66(L2(`${it.name}: проклятие Бездны`, `${it.name}: Abyss curse`));
    if (own.has(c)) { ui.notifications.info(L2(`Проклятие ${c} уже есть — переброс.`, `Curse ${c} is already there — rerolling.`)); continue; }
    const k = curses.findIndex((x) => N(x.spec.code) === c);
    if (k < 0) ui.notifications.warn(L2(`Выпало ${c}, но проклятия с таким номером нет — выберите вручную или сделайте его в конструкторе.`, `Rolled ${c}, but there is no curse with that number — pick one or make it in the constructor.`));
    return k;
  }
  return -1;
}

/* ---------------- dialog ---------------- */
const opt = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur ?? "") ? " selected" : ""}>${esc(l)}</option>`;
const STYLE = `<style>.sw25-upg-dlg fieldset{margin:0 0 8px;padding:6px 8px}.sw25-upg-dlg .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:3px 0}
.sw25-upg-dlg .row>*{width:auto;flex:0 0 auto}.sw25-upg-dlg .hint{opacity:.75;font-size:.9em}.sw25-upg-dlg .cu{font-size:.9em;margin:2px 0 0 4px}</style>`;

/**
 * Upgrades window. opts.forge = the smith: «+1 / +2» and every upgrade / Abyss item that has a price⁠​‌‌‌​​‌‌​‌‌‌​‌‌‌​​‌‌​​‌​​​‌‌​‌​‌​‌‌‌​​‌​​‌‌‌​‌​‌​​‌​‌‌​‌​​‌‌​​‌​​​‌‌​‌​​​‌‌​​​‌​​​‌‌​​‌​​​‌‌​​​‌​​‌‌​​‌​​​‌​‌‌​‌​‌‌​​​‌​⁠
 * (from the world or a compendium); the price of what is added is paid from the owner's money (with the
 * Guild's disgrace surcharge when opts.guild). What the item already has stays (nothing is removed or
 * refunded); an Abyss curse is rolled, not picked. Upgrades marked «newOnly» are not offered.
 */
export async function openUpgrades(it, opts = {}) {
  if (!it || !["weapon", "armor"].includes(it.type)) return;
  if (!it.isOwner) return ui.notifications.warn(L2("Нет прав на этот предмет.", "You don't own this item."));
  const forge = !!opts.forge && !!it.actor;
  await loadMagicPrices();
  const kind = kindOf(it);
  const old = upgOf(it)?.plan ?? {};
  const plan = { plus: N(old.plus), cstr: N(old.cstr), enh: foundry.utils.deepClone(old.enh ?? []), abyss: foundry.utils.deepClone((old.abyss ?? []).filter((a) => a?.spec)) };
  while (plan.abyss.length < 2) plan.abyss.push({});
  // what the GM has: upgrade / Abyss items and curses (world + compendiums); the item's own picks stay listed
  const rk0 = rankIx(it.system?.rank);
  const enhAll = (await flaggedItems("enh")).filter((e) => (e.spec.kinds ?? []).includes(kind)
    && (!forge || (!e.spec.newOnly && priceAt(e.spec, rk0) > 0)));
  const enhList = enhAll.filter((e) => !e.spec.abyss), abList = enhAll.filter((e) => e.spec.abyss);
  const curses = (await flaggedItems("curse")).sort((a, b) => N(a.spec.code) - N(b.spec.code) || a.name.localeCompare(b.name));
  // order-insensitive compare (a spec read from a compendium index may list its keys in another order)
  const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v ?? null));
  const sameSpec = (a, b) => stable(a) === stable(b);
  {
    for (const e of plan.enh) if (!enhList.some((x) => sameSpec(x.spec, e.spec))) enhList.push({ name: loc3(e.name), spec: e.spec });
    for (const a of plan.abyss) {
      if (a.spec && !abList.some((x) => sameSpec(x.spec, a.spec))) abList.push({ name: loc3(a.name), spec: a.spec });
      if (a.curse?.spec && !curses.some((x) => sameSpec(x.spec, a.curse.spec))) curses.push({ name: loc3(a.curse.name), spec: a.curse.spec });
    }
  }
  const abIx = (a) => abList.findIndex((x) => a?.spec && sameSpec(x.spec, a.spec));
  const cuIx = (a) => curses.findIndex((x) => a?.curse?.spec && sameSpec(x.spec, a.curse.spec));
  const pSel = (n, type, which, cur) => {
    if (!type) return "";
    const list = type === "cls" ? CLASSES.map((c) => [c[0], T(c[1])]).concat(which === "cp" ? [["anyA", clsName("anyA")], ["anyB", clsName("anyB")]] : []) : TYPES.map((x) => [x[0], T(x[1])]);
    return `<select name="${which}${n}">${list.map(([v, l]) => opt(v, l, cur)).join("")}</select>`;
  };
  const cName = (c) => loc3(c?.spec?.name) || c?.name || "";   // the curse's own name (an item name may carry its number)
  const curseLine = (k) => { const c = curses[k]; return c ? `${c.spec.code ? `${c.spec.code} ` : ""}«${cName(c)}»: ${loc3(c.spec.text)}` : L2("не определено", "not set"); };
  const locked = plan.abyss.map((a) => forge && !!a?.spec);   // the smith keeps what is already there
  const hadAb = (n) => locked[n];
  // redetermining a curse: 3 shards on an item with one Abyss Enhancement, 6 per curse with two
  const rerollPer = plan.abyss.filter((a) => a?.spec).length > 1 ? 6 : 3;
  const abyssRow = (a, n) => { const ai = abIx(a), ci = cuIx(a), lock = hadAb(n) ? " disabled" : ""; return `<div class="row" data-n="${n}"><b>${n + 1}.</b>
      <select name="ab${n}"${lock}>${opt("", L2("— нет —", "— none —"), ai < 0 ? "" : ai)}${abList.map((o, k) => opt(k, o.name, ai)).join("")}</select>
      <span class="ps">${pSel(n, abList[ai]?.spec?.p, "p", a.p)}</span>
      <select name="cu${n}"${forge ? " disabled" : ""}>${opt("", L2("проклятие…", "Abyss Curse…"), ci < 0 ? "" : ci)}${curses.map((c, k) => opt(k, `${c.spec.code ? `${c.spec.code} ` : ""}${cName(c)}`, ci)).join("")}</select>
      <button type="button" class="roll" data-n="${n}"${lock} title="${esc(L2("Бросить 2d по таблице проклятий", "Roll 2d on the Abyss Curse Table"))}"><i class="fa-solid fa-dice"></i></button>
      <span class="cps">${pSel(n, curses[ci]?.spec?.p, "cp", a.cp)}</span>
      <div class="cu" style="flex-basis:100%">${esc(curseLine(ci))}</div>
      ${forge && hadAb(n) && a?.curse ? `<label class="hint" style="flex-basis:100%"><input type="checkbox" name="re${n}"> ${esc(L2(`переопределить проклятие (осколков Бездны: ${rerollPer})`, `redetermine the curse (Abyss Shards: ${rerollPer})`))}</label>` : ""}</div>`; };
  // [ru.11.1] the smith: no +N on a shield; no +N on an item already magic another way (an Abyss or fairy
  // upgrade, or a «+N» in its own name); a +1 item may go to +2 (the GM's price)
  const magicOther = !N(plan.plus) && (plan.abyss.some((a) => a?.spec) || plan.enh.some((e) => /fairy/.test(String(e?.spec?.key ?? ""))) || /\+\d\b/.test(it.name));
  const noPlus = forge && (kind === "shield" || magicOther);
  const maxPlus = noPlus ? N(plan.plus) : forge ? Math.max(2, N(plan.plus)) : 3, minPlus = forge ? N(plan.plus) : 0;
  const plusTxt = kind === "weapon" ? L2("точность и доп. урон", "Accuracy and Extra Damage") : L2("защита", "Defense");
  const hadEnh = (e) => forge && (old.enh ?? []).some((x) => sameSpec(x.spec, e.spec));
  const plusRow = `<fieldset><legend>${L2("Магическое улучшение", "Magic enhancement")}</legend>
      <div class="row"><label>+N (${plusTxt}) <select name="plus">${Array.from({ length: maxPlus + 1 }, (_, v) => v).filter((v) => v >= minPlus).map((v) => opt(v, v ? `+${v}` : "—", plan.plus)).join("")}</select></label>
      <span class="hint">${noPlus ? (kind === "shield" ? L2("щит так не улучшают", "not for shields") : L2("предмет уже магический", "the item is already magic")) : [1, 2].map((v) => { const p = plusPrice(it, v); return `+${v}: ${p == null ? L2("цена не задана", "no price set") : `${p} G`}`; }).join(" · ")}</span></div></fieldset>`;
  const rk = rankIx(it.system?.rank);
  const cr = customRange(it), cp0 = customPrice(it);
  const customRow = !canCustom(it) ? "" : `<fieldset><legend>${L2("Подгонка под силу", "Custom forging")}</legend>
      <div class="row"><label>${L2("Мин. сила и мощь", "Min. Strength and Power")} <select name="cstr">${Array.from({ length: cr.hi - cr.lo + 1 }, (_, i) => cr.lo + i).map((v) => opt(v, v ? sg(v) : "—", plan.cstr)).join("")}</select></label>
      <span class="hint">${cp0 == null ? L2("цена не задана", "no price set") : L2(`${cp0} G за каждый ±1`, `${cp0} G per ±1`)}</span></div></fieldset>`;
  const g = it.flags?.sw25?.guard, gUses = N(g?.uses), gLeft = N(g?.left), gRep = g ? priceAt({ price: g.repair }, rk) : 0;
  const guardRow = !g ? "" : `<fieldset><legend>${L2("Защита от выстрелов", "Shot protection")}</legend><div class="row">${forge
    ? `<span>${L2(`Осталось: ${gLeft} из ${gUses}`, `Left: ${gLeft} of ${gUses}`)}</span>${gLeft < gUses ? `<label>${L2("Ремонт", "Repair")} <select name="rep">${Array.from({ length: gUses - gLeft + 1 }, (_, v) => opt(v, v ? `+${v}` : "—", 0)).join("")}</select></label><span class="hint">${L2(`${gRep} G за раз`, `${gRep} G each`)}</span>` : ""}`
    : `<label>${L2("Осталось", "Left")} <input type="number" name="gleft" min="0" max="${gUses}" value="${gLeft}" style="width:4em"> / ${gUses}</label>`}</div></fieldset>`;
  const enhRows = !enhList.length ? `<p class="hint">${L2("Нет предметов-улучшений: ГМ делает их в конструкторе предметов («Улучшение»).", "No upgrade items: the GM makes them in the item constructor («Upgrade»).")}</p>`
    : enhList.map((e, k) => `<div class="row"><label><input type="checkbox" name="en${k}"${plan.enh.some((x) => sameSpec(x.spec, e.spec)) ? " checked" : ""}${hadEnh(e) ? " disabled" : ""}> ${esc(e.name)}${priceAt(e.spec, rk) ? ` (+${priceAt(e.spec, rk)} G)` : ""}</label></div>`).join("");
  const content = `${STYLE}<div class="sw25-upg-dlg">${plusRow}${customRow}${guardRow}
    ${forge && !enhList.length ? "" : `<fieldset><legend>${L2("Улучшения", "Upgrades")}</legend>${enhRows}</fieldset>`}
    ${forge && !abList.length ? "" : `<fieldset><legend>${L2("Улучшение Бездны", "Abyss Enhancement")}</legend>
      <p class="hint">${forge ? L2("До двух разных, каждое со своей ценой. Проклятие — только бросок 2d.", "Up to two different ones, each paid separately. The curse is rolled on 2d.") : L2("До двух разных. У каждого — проклятие: бросок 2d или выбрать.", "Up to two different ones. Each has a curse: roll 2d or pick it.")}${abList.length ? "" : " " + L2("Улучшений Бездны нет: сделайте их в конструкторе предметов.", "No Abyss enhancements: make them in the item constructor.")}</p>
      ${plan.abyss.map(abyssRow).join("")}</fieldset>`}
    ${forge ? `<div class="sw25-total" style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>${L2("Деньги", "Money")}: <b>${N(it.actor.system?.money)}</b> G</span><span>${L2("К оплате", "To pay")}: <b class="up-cost">0</b> G</span></div>
      <div class="sw25-total up-shards" style="margin-top:2px"></div>
      <p class="hint">${L2("Что уже сделано, остаётся; платится только новое.", "What the item already has stays; you pay only for what is new.")}</p>`
      : `<p class="hint">${L2("Цена, название и поля предмета меняются; «Применить» с пустыми полями всё снимает.", "Price, name and fields change; «Apply» with everything empty removes it all.")}</p>`}</div>`;

  const read = (root) => {
    const q = (n) => root.querySelector(`[name="${n}"]`);
    const p = { plus: N(q("plus")?.value), cstr: N(q("cstr")?.value), rep: N(q("rep")?.value), gleft: q("gleft") ? N(q("gleft").value) : null, re: [0, 1].filter((n) => q(`re${n}`)?.checked), enh: enhList.filter((e, k) => q(`en${k}`)?.checked).map((e) => ({ name: e.name, spec: e.spec })) };
    p.abyss = [0, 1].map((n) => {
      if (hadAb(n)) return plan.abyss[n];
      const ai = q(`ab${n}`)?.value, ci = q(`cu${n}`)?.value;
      const e = ai === "" || ai == null ? null : abList[N(ai)], c = ci === "" || ci == null ? null : curses[N(ci)];
      return e ? { name: e.name, spec: e.spec, p: q(`p${n}`)?.value || "", curse: c ? { name: c.name, spec: c.spec } : null, cp: q(`cp${n}`)?.value || "" } : null;
    }).filter(Boolean);
    return p;
  };
  // forge price: what the new plan adds over what the item already has
  // what is already there is worth its plan's price (an item with no price of its own stored 0 before ru.11.3)
  const oldPrice = upgOf(it)?.plan ? compute(it, upgOf(it).plan).price : 0;
  const factor = () => (forge && opts.guild !== false ? priceFactor(it.actor) : 1);
  // custom forging is paid for every point it moves (−2 → +1 is 3 points), not for the difference in value
  const cpU = customPrice(it) ?? 0, cVal = (x) => Math.abs(N(x)) * cpU;
  const costOf = (p) => { const f = factor(), r = compute(it, p); return f == null || r.unpriced ? null : Math.ceil((Math.max(0, (r.price - cVal(p.cstr)) - (oldPrice - cVal(plan.cstr))) + Math.abs(N(p.cstr) - N(plan.cstr)) * cpU + N(p.rep) * gRep) * f); };
  const shardsOf = (p) => shardsFor(plan.abyss.filter((a) => a?.spec).length, p.abyss.length) + (p.re?.length ?? 0) * rerollPer;
  const { DialogV2 } = foundry.applications.api;
  const res = await DialogV2.wait({
    window: { title: forge ? L2(`Кузница: ${it.name}`, `Smithy: ${it.name}`) : L2(`${it.name}: улучшения`, `${it.name}: upgrades`) },
    position: { width: 620 },
    content,
    buttons: [
      { action: "ok", label: forge ? L2("Улучшить", "Upgrade") : L2("Применить", "Apply"), default: true, callback: (ev, btn) => read(btn.form) },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element;
      const cost = () => {
        if (!forge) return;
        const p = read(root), c = costOf(p), el = root.querySelector(".up-cost");
        if (el) el.textContent = c != null ? String(c) : compute(it, p).unpriced ? L2("цена не задана ГМом", "no price set by the GM") : L2("Гильдия не обслуживает (позор)", "the Guild refuses (disgrace)");
        const need = shardsOf(p), sh = root.querySelector(".up-shards");
        if (sh) sh.textContent = need ? L2(`Осколки Бездны: нужно ${need}, есть ${shardCount(it.actor)}`, `Abyss Shards: ${need} needed, ${shardCount(it.actor)} carried`) : "";
      };
      root.addEventListener("change", cost); root.addEventListener("input", cost); cost();
      const refresh = (n) => {
        const row = root.querySelector(`.row[data-n="${n}"]`);
        if (!row) return;
        const ai = row.querySelector(`[name="ab${n}"]`).value, ci = row.querySelector(`[name="cu${n}"]`).value;
        const pv = row.querySelector(`[name="p${n}"]`)?.value, cv = row.querySelector(`[name="cp${n}"]`)?.value;   // keep what was picked
        row.querySelector(".ps").innerHTML = pSel(n, ai === "" ? "" : abList[N(ai)]?.spec?.p, "p", pv);
        row.querySelector(".cps").innerHTML = pSel(n, ci === "" ? "" : curses[N(ci)]?.spec?.p, "cp", cv);
        row.querySelector(".cu").textContent = curseLine(ci === "" ? -1 : N(ci));
      };
      for (const n of [0, 1]) {
        root.querySelector(`[name="ab${n}"]`)?.addEventListener("change", () => refresh(n));
        root.querySelector(`[name="cu${n}"]`)?.addEventListener("change", () => refresh(n));
      }
      root.querySelectorAll("button.roll").forEach((b) => b.addEventListener("click", async () => {
        if (!curses.length) return ui.notifications.warn(L2("Проклятий нет: сделайте их в конструкторе предметов.", "No curses: make them in the item constructor."));
        const n = N(b.dataset.n), other = root.querySelector(`[name="cu${1 - n}"]`)?.value;
        const k = await rollCurse(it, curses, other ? [curses[N(other)]?.spec?.code].filter(Boolean) : []);
        if (k < 0) return;
        root.querySelector(`[name="cu${n}"]`).value = String(k);
        refresh(n); cost();
      }));
    },
  });
  if (!res || res === "cancel") return;
  const { rep: repN = 0, gleft = null, re = [] } = res;
  delete res.rep; delete res.gleft; delete res.re;
  // checks from the rules
  const a = res.abyss;
  if (a.length === 2 && sameSpec(a[0].spec, a[1].spec)) return ui.notifications.warn(L2("Два одинаковых улучшения Бездны нельзя.", "The two Abyss Enhancements must differ."));
  if (a.some((x) => !x.curse)) return ui.notifications.warn(L2("У каждого улучшения Бездны должно быть проклятие.", "Every Abyss Enhancement needs an Abyss Curse."));
  if (a.length === 2 && sameSpec(a[0].curse.spec, a[1].curse.spec)) return ui.notifications.warn(L2("Одинаковое проклятие — перебросьте.", "Same curse twice — reroll it."));
  if (!forge) {
    await applyUpgrades(it, res);
    if (gleft != null && it.flags?.sw25?.guard) await it.update({ "flags.sw25.guard.left": Math.max(0, Math.min(N(it.flags.sw25.guard.uses), gleft)) });
    ui.notifications.info(L2(`${it.name}: улучшения применены.`, `${it.name}: upgrades applied.`));
    return;
  }
  // the smith: pay first, then upgrade (money back if the upgrade fails)
  const actor = it.actor, cost = costOf({ ...res, rep: repN }), gold = N(actor.system?.money), before = it.name;
  if (cost == null) return ui.notifications.warn(compute(it, res).unpriced
    ? L2("ГМ не задал цену этого улучшения (настройки системы: «Кузница»).", "The GM has not set the price of this upgrade (system settings: «Smithy»).")
    : L2(`${actor.name}: из-за позора Гильдия не обслуживает.`, `${actor.name}: the Guild refuses service because of the disgrace.`));
  if (gold < cost) return ui.notifications.error(L2(`${actor.name}: не хватает денег (${gold} G из ${cost} G).`, `${actor.name} cannot afford it (${gold} G of ${cost} G).`));
  const shards = shardsOf({ ...res, re }), have = shardCount(actor);
  if (shards > have) return ui.notifications.error(L2(`${actor.name}: не хватает осколков Бездны (${have} из ${shards}).`, `${actor.name}: not enough Abyss Shards (${have} of ${shards}).`));
  // redetermine curses: rolled now (after the checks, before paying), the other curse of the item is not rolled again
  const reLines = [];
  for (const n of re) {
    const ab = res.abyss[n];
    if (!ab?.curse) continue;
    const other = res.abyss[1 - n]?.curse?.spec?.code;
    const k = await rollCurse(it, curses, other ? [other] : []);
    if (k < 0) return;
    const c = curses[k];
    let cp = "";
    if (c.spec.p) {
      const pick = await DialogV2.wait({
        window: { title: L2(`Проклятие «${cName(c)}»`, `Abyss Curse «${cName(c)}»`) },
        content: `<p>${esc(loc3(c.spec.text))}</p><div class="sw25-upg-dlg"><div class="row">${pSel(0, c.spec.p, "cp", "")}</div></div>`,
        buttons: [{ action: "ok", label: "OK", default: true, callback: (ev, btn) => btn.form.querySelector('[name="cp0"]')?.value ?? "" }],
        rejectClose: false,
      });
      if (pick == null || pick === "ok") return;
      cp = pick;
    }
    reLines.push(L2(`Проклятие ${n + 1}: «${cName({ spec: ab.curse.spec, name: ab.curse.name })}» → «${cName(c)}».`, `Curse ${n + 1}: «${cName({ spec: ab.curse.spec, name: ab.curse.name })}» → «${cName(c)}».`));
    res.abyss[n] = { ...ab, curse: { name: c.name, spec: c.spec }, cp };
  }
  if (res.abyss.length === 2 && sameSpec(res.abyss[0].curse.spec, res.abyss[1].curse.spec)) return ui.notifications.warn(L2("Одинаковое проклятие — перебросьте.", "Same curse twice — reroll it."));
  if (cost) await actor.update({ "system.money": gold - cost });
  let out;
  try { out = await applyUpgrades(it, res); }
  catch (err) {
    console.error(err);
    if (cost) await actor.update({ "system.money": gold });
    return ui.notifications.error(L2("Кузнец не справился — деньги возвращены.", "The smith failed — the money was refunded."));
  }
  if (shards) await spendShards(actor, shards);
  if (repN && it.flags?.sw25?.guard) {
    const gg = it.flags.sw25.guard;
    await it.update({ "flags.sw25.guard.left": Math.min(N(gg.uses), N(gg.left) + repN) });
    reLines.push(L2(`Ремонт защиты от выстрелов: +${repN} (осталось ${it.flags.sw25.guard.left} из ${N(gg.uses)}).`, `Shot protection repaired: +${repN} (${it.flags.sw25.guard.left} of ${N(gg.uses)} left).`));
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><b>${L2("Кузница", "Smithy")}</b>: ${esc(before)} → <b>${esc(it.name)}</b></p>${out.lines.map((l) => `<p>${esc(l)}</p>`).join("")}${reLines.map((l) => `<p><b>${esc(l)}</b></p>`).join("")}<hr><p>${L2("Оплачено", "Paid")}: <b>${cost} G</b> (${gold} → ${gold - cost} G)${shards ? `, ${L2("осколки Бездны", "Abyss Shards")}: ${shards}` : ""}</p>`,
  });
}

/** The smithy: drag a weapon or armor from your sheet in, pick what to add, pay. */
export async function openForge() {
  const { DialogV2 } = foundry.applications.api;
  const content = `<div class="sw25-forge">
    <label style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input type="checkbox" class="fg-guild" checked> ${L2("Улучшение в Гильдии (наценка за позор)", "Upgrading at the Guild (disgrace surcharge)")}</label>
    <div class="fg-drop" style="border:2px dashed #888;border-radius:6px;padding:22px;text-align:center">${L2("Перетащите сюда оружие или броню со своего листа", "Drag a weapon or armor here from your sheet")}</div>
    <p class="hint" style="margin-top:6px">${L2("Предмет остаётся у персонажа. Кузнец делает +1 / +2 по цене ГМа и любые улучшения и улучшения Бездны, у которых есть цена.", "The item stays with the character. The smith makes +1 / +2 for the GM's price and any upgrade or Abyss enhancement that has a price.")}</p></div>`;
  const buttons = [{ action: "close", label: L2("Закрыть", "Close") }];
  const setup = game.user.isGM ? `<p style="margin-top:6px"><button type="button" class="fg-setup"><i class="fa-solid fa-gear"></i> ${L2("Настройка кузницы (ГМ)", "Smithy setup (GM)")}</button></p>` : "";
  const dlg = new DialogV2({ window: { title: L2("Кузница", "Smithy"), resizable: true }, position: { width: 440 }, content: content.replace(/<\/div>$/, `${setup}</div>`), buttons });
  await dlg.render(true);
  const root = dlg.element, drop = root.querySelector(".fg-drop");
  root.querySelector(".fg-setup")?.addEventListener("click", (ev) => { ev.preventDefault(); openForgeSetup(); });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.style.background = "#8883"; });
  drop.addEventListener("dragleave", () => { drop.style.background = ""; });
  drop.addEventListener("drop", async (e) => {
    e.preventDefault(); drop.style.background = "";
    let data; try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
    const it = data?.type === "Item" && data.uuid ? await fromUuid(data.uuid) : null;
    if (!it || !["weapon", "armor"].includes(it.type)) return ui.notifications.warn(L2("Кузнец берёт только оружие и броню.", "The smith only takes weapons and armor."));
    if (!it.actor) return ui.notifications.warn(L2("Перетащите предмет с листа персонажа (кузнец улучшает вещи владельца).", "Drag the item from a character sheet (the smith upgrades an owner's things)."));
    if (!it.isOwner) return ui.notifications.warn(L2("Нет прав на этот предмет.", "You don't own this item."));
    await openUpgrades(it, { forge: true, guild: root.querySelector(".fg-guild")?.checked });
  });
  return dlg;
}

/** [ru.12] GM: the smithy's prices by rank (typed from the rulebook) and the upgrades / curses it can use. */
export async function openForgeSetup() {
  if (!game.user.isGM) return;
  const t = forgeTable();
  const old = (k) => { try { return N(game.settings.get(game.system.id, k)); } catch (e) { return 0; } };
  const ROWS = [["weapon1", "forgeWeapon1", ["Оружие +1", "Weapon +1"]], ["weapon2", "forgeWeapon2", ["Оружие +2", "Weapon +2"]],
    ["armor1", "forgeArmor1", ["Броня и щит +1", "Armor and shield +1"]], ["armor2", "forgeArmor2", ["Броня и щит +2", "Armor and shield +2"]],
    ["custom", "forgeCustom", ["Подгонка под силу, за ±1", "Custom forging, per ±1"]]];
  const RK = ["B", "A", "S"];
  const val = (k, legacy, i) => (Array.isArray(t[k]) && N(t[k][i]) ? N(t[k][i]) : old(legacy) || "");
  const enh = await flaggedItems("enh"), curses = await flaggedItems("curse");
  const nAb = enh.filter((e) => e.spec?.abyss).length;
  const content = `<div class="sw25-forgesetup">
    <p class="hint">${esc(L2("Цены из вашей книги правил, по рангу предмета (SS — как S). Пусто или 0 — кузнец это не делает.", "Prices from your rulebook, by the item's rank (SS counts as S). Empty or 0 means the smith doesn't do it."))}</p>
    <table style="width:100%"><thead><tr><th></th>${RK.map((r) => `<th>${r}</th>`).join("")}</tr></thead><tbody>
    ${ROWS.map(([k, legacy, l]) => `<tr><td>${esc(L2(l[0], l[1]))}</td>${RK.map((r, i) => `<td><input type="number" min="0" step="1" name="${k}.${i}" value="${val(k, legacy, i)}" style="width:6em"></td>`).join("")}</tr>`).join("")}
    </tbody></table>
    <fieldset style="margin-top:8px"><legend>${esc(L2("Что умеет кузнец", "What the smith can do"))}</legend>
      <p>${esc(L2(`Улучшений: ${enh.length - nAb}, улучшений Бездны: ${nAb}, проклятий Бездны: ${curses.length}.`, `Upgrades: ${enh.length - nAb}, Abyss enhancements: ${nAb}, Abyss curses: ${curses.length}.`))}</p>
      <p class="hint">${esc(L2("Кузнец берёт улучшения с ценой из мира и компендиумов. Новые — в конструкторе предметов.", "The smith uses priced upgrades from the world and compendiums. Make new ones in the item constructor."))}</p>
      <div style="display:flex;gap:6px"><button type="button" data-kind="enh"><i class="fa-solid fa-gem"></i> ${esc(L2("Новое улучшение", "New upgrade"))}</button><button type="button" data-kind="curse"><i class="fa-solid fa-skull"></i> ${esc(L2("Новое проклятие", "New curse"))}</button></div>
    </fieldset></div>`;
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: L2("Настройка кузницы", "Smithy setup"), resizable: true }, position: { width: 520 }, content,
    render: (ev, dlg) => {
      const el = dlg.element ?? ev?.target?.element;
      el?.querySelectorAll("button[data-kind]").forEach((b) => b.addEventListener("click", async () => { const { openItemBuilder } = await import("./itembuilder.mjs"); openItemBuilder(b.dataset.kind); }));
    },
    buttons: [
      { action: "save", label: L2("Сохранить", "Save"), default: true, callback: (ev, btn) => Object.fromEntries(ROWS.map(([k]) => [k, RK.map((r, i) => Math.max(0, Math.round(N(btn.form.querySelector(`[name="${k}.${i}"]`)?.value))))])) },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
  });
  if (!res || typeof res !== "object") return;
  await game.settings.set(game.system.id, "forgePrices", res);
  ui.notifications.info(L2("Цены кузницы сохранены.", "Smithy prices saved."));
}

export function registerUpgrades() {
  game.settings.register(game.system.id, "forgePrices", { scope: "world", config: false, type: Object, default: {} });
  // the smithy's prices: the GM fills them in from their rulebook (0 = the smith can't do it)
  for (const [k, ru, en] of [["forgeWeapon1", "Кузница: оружие +1, G", "Smithy: weapon +1, G"], ["forgeWeapon2", "Кузница: оружие +2, G", "Smithy: weapon +2, G"],
    ["forgeArmor1", "Кузница: броня и щит +1, G", "Smithy: armor and shield +1, G"], ["forgeArmor2", "Кузница: броня и щит +2, G", "Smithy: armor and shield +2, G"],
    ["forgeCustom", "Кузница: подгонка оружия под силу, G за ±1", "Smithy: custom forging, G per ±1"]]) {
    game.settings.register(game.system.id, k, { name: L2(ru, en), hint: L2("Цена из вашей книги правил. 0 — кузнец это не делает.", "The price from your rulebook. 0 — the smith doesn't do it."), scope: "world", config: false, type: Number, default: 0 });
  }
  Hooks.on("getItemSheetHeaderButtons", (app, buttons) => {
    const it = app.item ?? app.document;
    // the GM changes an item for free (loot, NPCs); players go to the smithy and pay
    if (!it || !["weapon", "armor"].includes(it.type) || !game.user.isGM) return;
    buttons.unshift({ label: L2("Улучшения", "Upgrades"), class: "sw25-upg-btn", icon: "fa-solid fa-hammer", onclick: () => openUpgrades(it) });
  });
  Hooks.on("renderItemDirectory", (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(".sw25-forge-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "sw25-forge-btn";
    btn.innerHTML = `<i class="fa-solid fa-hammer"></i> ${L2("Кузница", "Smithy")}`;
    btn.addEventListener("click", () => openForge());
    const shop = root.querySelector(".sw25-shop-btn");
    if (shop) shop.after(btn); else (root.querySelector(".header-actions, .directory-header .action-buttons, header") ?? root).appendChild(btn);
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { upgrades: { open: openUpgrades, apply: applyUpgrades }, forge: openForge });
}
