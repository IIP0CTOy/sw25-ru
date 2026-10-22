/**
 * Adventurer rank and disgrace (Core Rulebook II, pp. 110-120).
 *  - Ranks cost reputation (system.attributes.honer.value); several ranks at once are allowed.
 *    Past «Sword of Genesis ★3», every 500 more gives another ★ (free value +50).
 *  - «Free»: famous items whose reputation cost is not above this value cost no reputation.
 *  - Disgrace (flags.sw25.disgrace): a mark and a price penalty at the Guild's services,
 *    unless the rank prevents it (all or nothing). Reputation pays it off 1:1.
 *  - Losing / lowering / giving up a rank adds an equal disgrace.
 * Stored: flags.sw25.rank = index in RANKS (★ above the last row = extra index), the name goes to
 * system.attributes.honer.rank for the sheet.
 */
import { L2 } from "./monstergen-i18n.mjs";

const N = (v) => Math.max(0, Math.floor(Number(v) || 0));
const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
const T = (p) => L2(p[0], p[1]);

// [name, cost, free, loan (G, null = not given in the book)]
export const RANKS = [
  [["Нет", "None"], 0, 0, 300],
  [["Кинжал", "Dagger"], 20, 0, 500],
  [["Рапира", "Rapier"], 30, 5, 1000],
  [["Широкий меч", "Broad Sword", "Broadsword"], 50, 10, null],
  [["Двуручный меч", "Great Sword", "Greatsword"], 100, 20, null],
  [["Фламберг", "Flamberge"], 100, 30, 5000],
  [["Страж", "Sentinel", "Guardian"], 200, 50, null],
  [["Гиперион", "Hyperion"], 200, 70, 10000],
  [["Меч Создания", "Sword of Genesis", "Sword of Creation"], 300, 100, 15000],
  [["Меч Создания★", "Sword of Genesis★", "Sword of Creation★"], 500, 150, 20000],
  [["Меч Создания★2", "Sword of Genesis★2", "Sword of Creation★2"], 500, 200, 25000],
  [["Меч Создания★3", "Sword of Genesis★3", "Sword of Creation★3"], 500, 250, 30000],
];
const LAST = RANKS.length - 1;
/** Row for any index (past the table: one more ★ each, cost 500, free +50, loan +5000). */
export function rankRow(i) {
  if (i <= LAST) return RANKS[i];
  const k = i - LAST;
  const st = 3 + k;
  return [[`Меч Создания★${st}`, `Sword of Genesis★${st}`], 500, RANKS[LAST][2] + 50 * k, RANKS[LAST][3] + 5000 * k];
}
const total = (i) => { let s = 0; for (let j = 1; j <= i; j++) s += rankRow(j)[1]; return s; };

// disgrace: [from, mark, effect, factor, rank that prevents it (index, null = none)]
const DISGRACE = [
  [1, ["Гоблин Неприятность", "Goblin Nuisance"], ["цены товаров и услуг +10%", "item purchase and service prices +10%"], 1.1, 2],
  [21, ["Болг Опасность", "Bolg Hazard"], ["цены +20%", "prices +20%"], 1.2, 3],
  [51, ["Огр-изгой", "Ogre Outcast"], ["цены +50%", "prices +50%"], 1.5, 4],
  [101, ["Тролль Экстремальное Зло", "Troll Extreme Evil"], ["цены ×2", "prices ×2"], 2, 6],
  [201, ["Дрейк Враг Гуманоидов", "Drake Enemy of Humanoids"], ["цены ×5", "prices ×5"], 5, 8],
  [501, ["Варварский король Разрушитель Мира", "Barbarous King World Breaker"], ["услуги Гильдии приостановлены", "Guild services suspended"], null, null],
];

/** Current rank index: the flag, or the rank text on the sheet. */
export function rankOf(actor) {
  const f = actor?.flags?.sw25?.rank;
  if (Number.isFinite(Number(f))) return N(f);
  const txt = String(actor?.system?.attributes?.honer?.rank ?? "").trim().toLowerCase();
  if (!txt || txt === "-") return 0;
  for (let i = LAST; i >= 0; i--) if (RANKS[i][0].some((n) => n.toLowerCase() === txt)) return i;
  const m = txt.match(/★(\d+)/);
  return m && N(m[1]) > 3 ? LAST + N(m[1]) - 3 : 0;
}
export const disgraceOf = (actor) => N(actor?.flags?.sw25?.disgrace);
const repOf = (actor) => Number(actor?.system?.attributes?.honer?.value) || 0;

/** Disgrace row in force (null = none or prevented by the rank). */
export function disgraceEffect(actor) {
  const d = disgraceOf(actor);
  if (!d) return null;
  const row = [...DISGRACE].reverse().find((r) => d >= r[0]);
  const prevented = row[4] != null && rankOf(actor) >= row[4];
  return { row, prevented };
}
/** Price factor at the Guild's services (1 = none; null = suspended). */
export function priceFactor(actor) {
  const e = disgraceEffect(actor);
  if (!e || e.prevented) return 1;
  return e.row[3];
}

async function setRank(actor, i, rep, disgrace) {
  await actor.update({
    "flags.sw25.rank": i,
    "system.attributes.honer.rank": i ? T(rankRow(i)[0]) : "-",
    "system.attributes.honer.value": rep,
    "flags.sw25.disgrace": N(disgrace),
  });
}

const say = (actor, text) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="sw25-cast-mp">${text}</div>` });

export async function openRanks(actor) {
  if (!actor || actor.type !== "character") return;
  const { DialogV2 } = foundry.applications.api;
  const cur = rankOf(actor), rep = repOf(actor), dis = disgraceOf(actor);
  const rows = [];
  for (let i = 0; i <= Math.max(LAST, cur + 2); i++) {
    const r = rankRow(i);
    rows.push(`<tr${i === cur ? ' style="font-weight:bold;background:#8882"' : ""}><td>${esc(T(r[0]))}</td><td>${r[1]} (${total(i)})</td><td>${r[2] || "—"}</td><td>${r[3] != null ? `${r[3]} G` : "—"}</td>
      <td>${i > cur ? `<button type="button" data-up="${i}" style="width:auto"${total(i) - total(cur) > rep ? " disabled" : ""}>${L2("Получить", "Get")} −${total(i) - total(cur)}</button>` : ""}</td></tr>`);
  }
  const e = disgraceEffect(actor);
  const disLine = !dis ? L2("Позора нет.", "No disgrace.")
    : `${L2("Знак бесчестия", "Mark of dishonour")}: <b>${esc(T(e.row[1]))}</b> — ${esc(T(e.row[2]))}${e.prevented ? ` <i>(${L2("ранг защищает", "prevented by the rank")})</i>` : ""}`;
  const content = `<div class="sw25-ranks">
    <p>${L2("Ранг", "Rank")}: <b>${esc(T(rankRow(cur)[0]))}</b> · ${L2("Репутация", "Reputation")}: <b>${rep}</b> · ${L2("Позор", "Disgrace")}: <b>${dis}</b></p>
    <p class="hint">${L2("Ранг покупается репутацией, можно сразу несколько. «Бесплатно» — прославленные предметы до этой цены в репутации не требуют её. Займ — потолок аванса в Гильдии.", "Ranks are bought with reputation, several at once is fine. «Free» — famous items up to this reputation cost need no reputation. Loan — the Guild's advance limit.")}</p>
    <table><thead><tr><th>${L2("Ранг", "Rank")}</th><th>${L2("Репутация (всего)", "Reputation (total)")}</th><th>${L2("Бесплатно", "Free")}</th><th>${L2("Займ", "Loan")}</th><th></th></tr></thead><tbody>${rows.join("")}</tbody></table>
    <hr><p>${disLine}</p>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input type="number" class="rk-n" min="1" value="1" style="width:5em">
      <button type="button" data-act="dis" style="width:auto"${game.user.isGM ? "" : " disabled"}>${L2("Позор +N", "Disgrace +N")}</button>
      <button type="button" data-act="pay" style="width:auto"${!dis ? " disabled" : ""}>${L2("Погасить репутацией", "Pay off with reputation")}</button>
      <button type="button" data-act="down" style="width:auto"${!cur || !game.user.isGM ? " disabled" : ""}>${L2("Понизить ранг", "Lower the rank")}</button>
    </div></div>`;

  const dlg = new DialogV2({
    window: { title: L2(`${actor.name}: ранг авантюриста`, `${actor.name}: adventurer rank`) },
    position: { width: 560 },
    content,
    buttons: [{ action: "close", label: L2("Закрыть", "Close") }],
  });
  await dlg.render(true);
  const root = dlg.element;
  const n = () => N(root.querySelector(".rk-n")?.value) || 1;
  const reopen = async () => { await dlg.close(); openRanks(actor); };
  root.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", async () => {
    const to = N(b.dataset.up), cost = total(to) - total(cur);
    if (cost > repOf(actor)) return ui.notifications.warn(L2("Не хватает репутации.", "Not enough reputation."));
    // famous items bought for reputation that are now under «Free» give it back — by hand, see p. 116
    await setRank(actor, to, repOf(actor) - cost, disgraceOf(actor));
    await say(actor, L2(`<b>${esc(actor.name)}</b>: ранг «${esc(T(rankRow(to)[0]))}» (−${cost} репутации). Прославленные предметы с ценой в репутации до ${rankRow(to)[2]} возвращают её.`, `<b>${esc(actor.name)}</b>: rank «${esc(T(rankRow(to)[0]))}» (−${cost} reputation). Famous items whose reputation cost is up to ${rankRow(to)[2]} give it back.`));
    reopen();
  }));
  root.querySelector('[data-act="dis"]').addEventListener("click", async () => {
    await actor.update({ "flags.sw25.disgrace": disgraceOf(actor) + n() });
    await say(actor, L2(`<b>${esc(actor.name)}</b>: позор +${n()} (всего ${disgraceOf(actor)}).`, `<b>${esc(actor.name)}</b>: disgrace +${n()} (total ${disgraceOf(actor)}).`));
    reopen();
  });
  root.querySelector('[data-act="pay"]').addEventListener("click", async () => {
    const x = Math.min(n(), disgraceOf(actor), Math.max(0, repOf(actor)));
    if (!x) return ui.notifications.warn(L2("Не хватает репутации.", "Not enough reputation."));
    await actor.update({ "flags.sw25.disgrace": disgraceOf(actor) - x, "system.attributes.honer.value": repOf(actor) - x });
    await say(actor, L2(`<b>${esc(actor.name)}</b>: позор −${x} за ${x} репутации (осталось ${disgraceOf(actor)}).`, `<b>${esc(actor.name)}</b>: disgrace −${x} for ${x} reputation (${disgraceOf(actor)} left).`));
    reopen();
  });
  root.querySelector('[data-act="down"]').addEventListener("click", async () => {
    const to = Math.max(0, cur - n()), lost = total(cur) - total(to);
    if (!lost) return;
    await setRank(actor, to, repOf(actor), disgraceOf(actor) + lost);
    await say(actor, L2(`<b>${esc(actor.name)}</b>: ранг понижен до «${esc(T(rankRow(to)[0]))}», позор +${lost}.`, `<b>${esc(actor.name)}</b>: rank lowered to «${esc(T(rankRow(to)[0]))}», disgrace +${lost}.`));
    reopen();
  });
}

export function registerRanks() {
  Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    const actor = app.actor ?? app.document;
    if (actor?.type !== "character" || !actor.isOwner) return;
    buttons.unshift({ label: L2("Ранг", "Rank"), class: "sw25-rank-btn", icon: "fa-solid fa-medal", onclick: () => openRanks(actor) });
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { ranks: { open: openRanks, of: rankOf, disgrace: disgraceOf, factor: priceFactor } });
}
