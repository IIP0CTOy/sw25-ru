/**
 * [Round 82] Rest and «once per day» (book I p.183-184).
 *
 *  - Sleep 3 h: +10 % max HP, + half max MP (rounded up). 6 h (or two rests): 20 % HP, all MP.
 *    No more than 6 h of sleep count per day.
 *  - «Once per day» abilities come back at the next sunrise (06:00) — the «Новый день» button.
 *    «Once per hour» ones come back after any rest or the «Прошёл час» button.
 *  - Limits are read from the item text («один раз в день», «раз в час на одну цель»,
 *    «не более двух раз в день»); flags.sw25.daily on the item overrides
 *    ({ per: "day"|"hour", limit: n, perTarget: bool } or false).
 *  Uses are remembered on the actor: flags.sw25.daily = { key: { n, per, name } },
 *  flags.sw25.slept = hours slept today.
 */
import { L2 } from "./monstergen-i18n.mjs";

const FLAG = "sw25";
const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const WORD_N = { двух: 2, трёх: 3, трех: 3, "2": 2, "3": 3, два: 2, три: 3, дважды: 2, трижды: 3 };
// [Round 94] the same limits in English text: «once per day», «twice a day», «3 times per hour», «2/day»
const EN_N = { once: 1, twice: 2, thrice: 3, one: 1, two: 2, three: 3, four: 4, five: 5 };
const EN_LIMIT = /\b(?:(once|twice|thrice)|(one|two|three|four|five|\d+)\s*(?:times?|uses?|x))\s+(?:per|a|an|each|every)\s+(day|hour)\b|\b(\d+)\s*\/\s*(day|hour)\b/i;
const EN_UNLIMITED = /\b(?:any number of(?:\s+(?:times|uses))?|unlimited(?:\s+(?:times|uses))?)\s+(?:per|a|an|each|every)\s+(?:day|hour)\b/i;
const EN_PER_TARGET = /\bper target\b|\b(?:on|against|for|to) (?:the same|each|every|a single|one|any one) target\b|\bthe same target\b|\beach target\b/i;
const _infoCache = new WeakMap();

/** null, or { per: "day"|"hour", limit, perTarget } for a limited-use item. */
export function dailyInfo(item) {
  if (!item) return null;
  const f = item.flags?.[FLAG]?.daily;
  if (f === false) return null;
  if (f && typeof f === "object") return { per: f.per ?? "day", limit: Number(f.limit) || 1, perTarget: !!f.perTarget };
  const text = `${item.system?.overview ?? ""} ${strip(item.system?.description)}`;
  const c = _infoCache.get(item);
  if (c && c.text === text) return c.info;
  let info = null;
  // [2026-10-07] also «два/три раза в день», «дважды/трижды в день» (used to read as once)
  const mm = text.match(/(любое количество\s+)?(?:(?:(?:не более|до)\s+(двух|трёх|трех|2|3)|(два|три|2|3))\s+)?(?:раза?|(дважды|трижды))\s+(?:в|за)\s+(день|сутки|час)/i);
  const m = mm ? Object.assign([mm[0], mm[1], mm[2] ?? mm[3] ?? mm[4], mm[5]], { index: mm.index }) : null;
  if (m && !m[1]) {
    const around = text.slice(Math.max(0, m.index - 120), m.index + 80);
    info = {
      per: /час/i.test(m[3]) ? "hour" : "day",
      limit: WORD_N[String(m[2] ?? "").toLowerCase()] ?? 1,
      perTarget: /на одну цель|одна и та же цель|на цель|на каждую цель/i.test(around),
    };
  }
  // [Round 94] no Russian limit phrase at all → try the English wording (same result shape)
  if (!mm) {
    const e = text.match(EN_LIMIT);
    const u = text.match(EN_UNLIMITED);
    if (e && !(u && u.index < e.index)) {
      const w = String(e[1] ?? e[2] ?? e[4] ?? "").toLowerCase();
      const around = text.slice(Math.max(0, e.index - 120), e.index + e[0].length + 80);
      info = {
        per: /hour/i.test(e[3] ?? e[5]) ? "hour" : "day",
        limit: EN_N[w] ?? (Number(w) || 1),
        perTarget: EN_PER_TARGET.test(around),
      };
    }
  }
  _infoCache.set(item, { text, info });
  return info;
}

function keysFor(item, info) {
  if (!info.perTarget) return [{ key: item.name, label: "" }];
  const targets = Array.from(game.user.targets).filter((t) => t.actor);
  if (!targets.length) return [{ key: item.name, label: "" }];
  return targets.map((t) => ({ key: `${item.name}@${t.actor.uuid}`, label: t.name }));
}
const storeOf = (actor) => actor.flags?.[FLAG]?.daily ?? {};
const safe = (k) => k.replace(/\./g, "·");

/** Before use: { ok, info, keys }. Asks when the limit is already reached. */
export async function dailyCheck(actor, item) {
  const info = dailyInfo(item);
  if (!info || !actor) return { ok: true, info: null, keys: [] };
  const keys = keysFor(item, info);
  const store = storeOf(actor);
  const spent = keys.filter((k) => (Number(store[safe(k.key)]?.n) || 0) >= info.limit);
  if (spent.length) {
    const unit = info.per === "hour" ? L2("в этот час", "this hour") : L2("сегодня", "today");
    const who = spent.map((k) => k.label).filter(Boolean).join(", ");
    const text = L2(`«${item.name}» уже ${info.limit > 1 ? `использовано ${info.limit} раза` : "использовано"} ${unit}${who ? ` (цель: ${who})` : ""}.`, `“${item.name}” has already been used ${info.limit > 1 ? `${info.limit} times ` : ""}${unit}${who ? ` (target: ${who})` : ""}.`);
    const DV = foundry.applications?.api?.DialogV2;
    const ok = DV ? await DV.confirm({ window: { title: L2("Лимит использований", "Usage limit") }, content: `<p>${esc(text)}</p><p>${L2("Использовать всё равно?", "Use it anyway?")}</p>`, rejectClose: false }) : true;
    if (!ok) return { ok: false, info, keys };
  }
  return { ok: true, info, keys };
}

/** After a successful use. */
export async function dailyMark(actor, item, check) {
  if (!check?.info || !actor?.isOwner) return;
  const store = foundry.utils.deepClone(storeOf(actor));
  for (const k of check.keys) {
    const id = safe(k.key);
    store[id] = { n: (Number(store[id]?.n) || 0) + 1, per: check.info.per, name: item.name, target: k.label };
  }
  await actor.update({ [`flags.${FLAG}.daily`]: store });
}

export function usedCount(actor, item) {
  const info = dailyInfo(item);
  if (!info) return null;
  const store = storeOf(actor);
  const n = Object.entries(store).filter(([k]) => k === safe(item.name) || k.startsWith(safe(item.name) + "@")).reduce((a, [, v]) => a + (Number(v.n) || 0), 0);
  return { n, info };
}

async function resetUses(actor, per) {
  const store = storeOf(actor);
  const drop = Object.entries(store).filter(([, v]) => per === "all" || v.per === per).map(([k]) => k);
  if (!drop.length) return 0;
  const upd = {};
  for (const k of drop) upd[`flags.${FLAG}.daily.-=${k}`] = null;
  await actor.update(upd);
  return drop.length;
}

/** [Round 88] «Полный отдых»: all limited-use abilities back, HP/MP full, sleep counter reset. */
export async function restFull(actor) {
  const name = esc(actor.name);
  const n = await resetUses(actor, "all");
  const hp0 = Number(actor.system.hp?.value) || 0, mp0 = Number(actor.system.mp?.value) || 0;
  const hpMax = Number(actor.system.hp?.max) || hp0, mpMax = Number(actor.system.mp?.max) || mp0;
  await actor.update({ "system.hp.value": Math.max(hp0, hpMax), "system.mp.value": Math.max(mp0, mpMax), [`flags.${FLAG}.slept`]: 0 });
  return L2(`<b>${name}</b>: полный отдых — ОЖ ${hp0} → <b>${Math.max(hp0, hpMax)}</b>, ОМ ${mp0} → <b>${Math.max(mp0, mpMax)}</b>, способности восстановлены${n ? ` (${n})` : ""}.`, `<b>${name}</b>: full rest — HP ${hp0} → <b>${Math.max(hp0, hpMax)}</b>, MP ${mp0} → <b>${Math.max(mp0, mpMax)}</b>, abilities restored${n ? ` (${n})` : ""}.`);
}

/** mode: "3h" | "6h" | "hour" | "day". Returns one summary line. */
export async function restActor(actor, mode) {
  const name = esc(actor.name);
  if (mode === "day") {
    const n = await resetUses(actor, "all");
    await actor.update({ [`flags.${FLAG}.slept`]: 0 });
    return L2(`<b>${name}</b>: новый день — дневные способности восстановлены${n ? ` (${n})` : ""}.`, `<b>${name}</b>: new day — daily abilities restored${n ? ` (${n})` : ""}.`);
  }
  if (mode === "hour") {
    const n = await resetUses(actor, "hour");
    return L2(`<b>${name}</b>: прошёл час${n ? ` — «раз в час» восстановлено (${n})` : ""}.`, `<b>${name}</b>: an hour has passed${n ? ` — “once per hour” restored (${n})` : ""}.`);
  }
  const want = mode === "6h" ? 6 : 3;
  const slept = Number(actor.flags?.[FLAG]?.slept) || 0;
  const hours = Math.max(0, Math.min(want, 6 - slept));
  await resetUses(actor, "hour");
  if (!hours) return L2(`<b>${name}</b>: сегодня уже спал 6 часов — сон больше не восстанавливает.`, `<b>${name}</b>: already slept 6 hours today — more sleep restores nothing.`);
  const units = hours >= 6 ? 2 : 1;
  const hp = actor.system.hp ?? {};
  const mp = actor.system.mp ?? {};
  const hpMax = Number(hp.max) || 0;
  const mpMax = Number(mp.max) || 0;
  const hp0 = Number(hp.value) || 0;
  const mp0 = Number(mp.value) || 0;
  const hp1 = Math.max(hp0, Math.min(hpMax, hp0 + Math.ceil(hpMax * 0.1 * units)));
  const full = units === 2 || slept + hours >= 6;
  const mp1 = Math.max(mp0, full ? mpMax : Math.min(mpMax, mp0 + Math.ceil(mpMax / 2)));
  await actor.update({ "system.hp.value": hp1, "system.mp.value": mp1, [`flags.${FLAG}.slept`]: slept + hours });
  const note = hours < want ? L2(` <i>(засчитано ${hours} ч: за день не больше 6)</i>`, ` <i>(${hours} h counted: no more than 6 per day)</i>`) : "";
  return L2(`<b>${name}</b>: сон ${hours} ч — ОЖ ${hp0} → <b>${hp1}</b>, ОМ ${mp0} → <b>${mp1}</b>${note}`, `<b>${name}</b>: slept ${hours} h — HP ${hp0} → <b>${hp1}</b>, MP ${mp0} → <b>${mp1}</b>${note}`);
}

export async function openRestDialog() {
  const DV = foundry.applications?.api?.DialogV2;
  const picked = new Set((canvas?.tokens?.controlled ?? []).map((t) => t.actor).filter((a) => a?.type === "character" && a.isOwner));
  // everyone the user owns; ticked by default: the selected tokens, else the players' characters
  const pool = game.actors.filter((a) => a.type === "character" && a.isOwner);
  for (const a of picked) if (!pool.includes(a)) pool.push(a);
  const owned = pool.filter((a) => a.hasPlayerOwner);
  const ticked = picked.size ? picked : new Set(owned.length ? owned : pool);
  if (!pool.length) return ui.notifications.warn(L2("Нет персонажей для отдыха: выделите токены или дайте игрокам персонажей.", "No characters to rest: select tokens or assign characters to the players."));
  const rows = pool
    .map((a) => {
      const slept = Number(a.flags?.[FLAG]?.slept) || 0;
      const used = Object.keys(storeOf(a)).length;
      return `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="who" value="${a.id}" ${ticked.has(a) ? "checked" : ""}>
        <span style="flex:1"><b>${esc(a.name)}</b></span><small>${L2(`ОЖ ${a.system.hp.value}/${a.system.hp.max} · ОМ ${a.system.mp.value}/${a.system.mp.max} · спал ${slept} ч${used ? ` · использовано: ${used}` : ""}`, `HP ${a.system.hp.value}/${a.system.hp.max} · MP ${a.system.mp.value}/${a.system.mp.max} · slept ${slept} h${used ? ` · used: ${used}` : ""}`)}</small></label>`;
    })
    .join("");
  const ids = (btn) => Array.from(btn.form.querySelectorAll('input[name="who"]:checked')).map((i) => i.value);
  const mk = (action, label, icon) => ({ action, label, icon, callback: (ev, btn) => ({ mode: action, ids: ids(btn) }) });
  const res = await DV.wait({
    window: { title: L2("Отдых", "Rest") },
    content: `<form>${rows}<hr><p style="font-size:.9em">${L2("Сон 3 ч: +10% ОЖ и половина ОМ. Сон 6 ч: +20% ОЖ и все ОМ. За день засчитывается не больше 6 часов сна. «Раз в день» возвращается с новым днём (06:00), «раз в час» — после отдыха.", "3 h of sleep: +10% HP and half of MP. 6 h of sleep: +20% HP and all MP. No more than 6 hours of sleep count per day. “Once per day” comes back with the new day (06:00), “once per hour” after a rest.")}</p></form>`,
    buttons: [mk("3h", L2("Сон 3 часа", "Sleep 3 hours"), "fa-solid fa-bed"), mk("6h", L2("Сон 6 часов", "Sleep 6 hours"), "fa-solid fa-moon"), mk("hour", L2("Прошёл час", "An hour passed"), "fa-solid fa-hourglass-half"), mk("day", L2("Новый день (06:00)", "New day (06:00)"), "fa-solid fa-sun")],
    rejectClose: false,
  }).catch(() => null);
  if (!res?.ids?.length) return null;
  const lines = [];
  for (const id of res.ids) {
    const a = game.actors.get(id);
    if (a) lines.push(await restActor(a, res.mode));
  }
  return ChatMessage.create({
    speaker: { alias: L2("Отдых", "Rest") },
    content: lines.map((l) => `<div class="sw25-cast-mp">${l}</div>`).join(""),
    flags: { [FLAG]: { rest: res.mode } },
  });
}

function onRenderSheet(app, html) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "character") return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  // [Round 88] rest buttons under «Рост»
  root.querySelectorAll(".sw25-rest-btns").forEach((x) => x.remove());
  const growth = root.querySelector(".growth-button");
  if (growth && actor.isOwner) {
    const box = document.createElement("div");
    box.className = "sw25-rest-btns";
    box.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin:6px 4px 0 4px";
    const mk = (mode, icon, label, tip) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.tooltip = tip;
      b.style.cssText = "flex:1 1 auto;min-width:0;padding:1px 6px;border:1px solid var(--color-border-dark, #333);border-radius:5px;background:transparent;cursor:pointer;font-size:.9em;line-height:1.5";
      b.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
      b.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        b.disabled = true;
        try {
          const line = mode === "full" ? await restFull(actor) : await restActor(actor, mode);
          await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="sw25-cast-mp">${line}</div>`, flags: { [FLAG]: { rest: mode } } });
        } finally { b.disabled = false; }
      });
      return b;
    };
    box.append(
      mk("3h", "fa-bed", L2("Отдых 3 ч", "Rest 3 h"), L2("Половина отдыха: +10% ОЖ, половина ОМ; «раз в час» восстанавливается.", "Half a rest: +10% HP, half of MP; “once per hour” is restored.")),
      mk("6h", "fa-moon", L2("Отдых 6 ч", "Rest 6 h"), L2("Сон 6 часов: +20% ОЖ, все ОМ; «раз в час» восстанавливается.", "6 hours of sleep: +20% HP, all MP; “once per hour” is restored.")),
      mk("full", "fa-sun", L2("Полный отдых", "Full rest"), L2("Всё восстанавливается: ОЖ, ОМ и все способности «раз в день» / «раз в час».", "Everything is restored: HP, MP and all “once per day” / “once per hour” abilities.")),
    );
    growth.insertAdjacentElement("afterend", box);
  }
  for (const li of root.querySelectorAll("li.item[data-item-id]")) {
    li.querySelector(".sw25-daily")?.remove();
    const it = actor.items.get(li.dataset.itemId);
    const u = it ? usedCount(actor, it) : null;
    if (!u) continue;
    const spent = u.n >= u.info.limit && !u.info.perTarget;
    const tag = document.createElement("span");
    tag.className = `sw25-daily${u.n ? " used" : ""}`;
    const unit = u.info.per === "hour" ? L2("час", "hour") : L2("день", "day");
    tag.dataset.tooltip = L2(`${u.info.limit > 1 ? `${u.info.limit} раза` : "Раз"} в ${unit}${u.info.perTarget ? " на цель" : ""}. Использовано: ${u.n}. ПКМ — сбросить.`, `${u.info.limit > 1 ? `${u.info.limit} times` : "Once"} per ${unit}${u.info.perTarget ? " per target" : ""}. Used: ${u.n}. Right-click to reset.`);
    tag.innerHTML = `<i class="fa-solid ${u.info.per === "hour" ? "fa-hourglass-half" : "fa-sun"}"></i>${u.n ? ` ${u.n}` : ""}`;
    if (spent) li.classList.add("sw25-daily-spent");
    else li.classList.remove("sw25-daily-spent");
    tag.addEventListener("contextmenu", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const store = storeOf(actor);
      const upd = {};
      for (const k of Object.keys(store)) if (k === safe(it.name) || k.startsWith(safe(it.name) + "@")) upd[`flags.${FLAG}.daily.-=${k}`] = null;
      if (!foundry.utils.isEmpty(upd)) await actor.update(upd);
    });
    (li.querySelector("h4") ?? li.querySelector(".item-name") ?? li).appendChild(tag);
  }
}

export function registerRest() {
  Hooks.on("renderActorSheet", onRenderSheet);
  const css = document.createElement("style");
  css.textContent = `
.sw25-daily{margin-left:6px;font-size:.8em;color:#b8860b;cursor:context-menu;font-weight:normal}
.sw25-daily.used{color:#a33}
li.item.sw25-daily-spent h4{opacity:.55;text-decoration:line-through}`;
  document.head.appendChild(css);
  game.sw25 = Object.assign(game.sw25 ?? {}, { rest: { open: openRestDialog, restActor, dailyInfo, dailyCheck, dailyMark, usedCount } });
}
