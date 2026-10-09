/**
 * [Round 93] "Effects from text": recognise simple numeric modifiers in an item / spell text
 * ("Accuracy +1", «Уклонение −2», 「命中力+1」, duration) and turn them into an ActiveEffect,
 * plus a small dialog (item sheet header button) to correct the result by hand.
 * Only keys that are known to change numbers on the sheet are offered.
 */
import { L2 } from "./monstergen-i18n.mjs";

const A = "system.attributes.", E = "system.effect.", AB = (a) => `system.abilities.${a}.efvaluemodify`;
/** id, key, [ru, en], regexp of the words that name the stat (ja | ru | en) */
export const STATS = [
  ["hit", A + "efhitmod", ["Точность", "Accuracy"], /命中力?(?:判定)?|точност|попадани|accuracy/],
  ["dodge", A + "efdodgemod", ["Уклонение", "Evasion"], /回避力?(?:判定)?|уклонени|evasion/],
  ["mpp", A + "efmppmod", ["Магич. защита", "Magic defense"], /魔法防護点?|маг\S*\s+защит|magic(?:al)?\s+defen[cs]e/],
  ["pp", A + "efppmod", ["Защита", "Defense"], /防護点|защит|defen[cs]e/],
  ["dreduce", A + "efdreduce", ["Снижение любого урона", "Damage reduction"], /снижени\S*\s+урон|damage\s+reduction/],
  ["mdmg", A + "efmpwall", ["Урон заклинаний", "Spell damage"], /魔法ダメージ|魔法の?ダメージ|маг\S*\s+урон|урон\S*\s+заклинани|spell\s+damage|magic\s+damage/],
  ["dmg", A + "efdmod", ["Урон оружием", "Weapon damage"], /物理ダメージ|打撃点|追加ダメージ|урон|damage/],
  ["cast", A + "efmckall", ["Проверки колдовства", "Spellcasting checks"], /魔法行使(?:判定)?|行使判定|колдовств|сотворени|^\s*заклинания\s*$|spellcasting|casting\s+check/],
  ["mgp", E + "allmgp", ["Мощь магии", "Magic power"], /魔力|мощ\S*\s+маги|маг\S*\s+сил|magic\s+power/],
  ["vitres", E + "vitres", ["Стойкость", "Fortitude"], /生命(?:・精神)?抵抗力?(?:判定)?|стойкост|fortitude/],
  ["mndres", E + "mndres", ["Воля", "Willpower"], /(?:生命・)?精神抵抗力?(?:判定)?|(?<![а-яё])вол[яеиюь](?![а-яё])|willpower/],
  ["init", E + "init", ["Инициатива", "Initiative"], /先制力?(?:判定)?|инициатив|initiative/],
  ["mknow", E + "mknow", ["Знание монстров", "Monster knowledge"], /魔物知識(?:判定)?|знани\S*\s+монстр|monster\s+knowledge/],
  ["allck", E + "allck", ["Все проверки", "All checks"], /行為判定|все\S*\s+проверк|all\s+checks/],
  ["regenhp", A + "turnend.hpregenmod", ["ОЖ в конце каждого хода", "HP at the end of each turn"], /регенераци\S*(?:\s+ож)?|восстановлени\S*\s+ож\s+(?:в|за)\s+(?:ход|раунд)|hp\s+regen\S*|regenerat\S*|再生/],
  ["regenmp", A + "turnend.mpregenmod", ["ОМ в конце каждого хода", "MP at the end of each turn"], /регенераци\S*\s+ом|восстановлени\S*\s+ом\s+(?:в|за)\s+(?:ход|раунд)|mp\s+regen\S*/],
  ["move", A + "move.efmovemod", ["Движение", "Movement"], /移動力|движени|скорост|movement|move\s+speed/],
  ["dex", AB("dex"), ["Ловкость", "Dexterity"], /器用度?|ловкост|dexterity/],
  ["agi", AB("agi"), ["Подвижность", "Agility"], /敏捷度?|подвижност|agility/],
  ["str", AB("str"), ["Сила", "Strength"], /筋力|(?<![а-яё])сил[аыуе](?![а-яё])|strength/],
  ["vit", AB("vit"), ["Живучесть", "Vitality"], /生命力|живучест|vitality/],
  ["int", AB("int"), ["Интеллект", "Intelligence"], /知力|интеллект|intelligence/],
  ["mnd", AB("mnd"), ["Дух", "Spirit"], /精神力|(?<![а-яё])дух[ае]?(?![а-яё])|(?<![a-z])spirit(?![a-z])/],
  // [Round 98] wider list for the constructors (rare in imported text, so the patterns are deliberately narrow)
  ["hpmax", "system.hp.efhpmod", ["Макс. ОЖ", "Max HP"], /макс\S*\s+ож|максимум\S*\s+ож|max(?:imum)?\s+hp|最大hp/],
  ["mpmax", "system.mp.efmpmod", ["Макс. ОМ", "Max MP"], /макс\S*\s+ом|максимум\S*\s+ом|max(?:imum)?\s+mp|最大mp/],
  ["crit", E + "efcvalue", ["Порог крита (−1 = легче)", "Crit threshold (−1 = easier)"], /порог\S*\s+крит\S*|crit(?:ical)?\s+(?:threshold|value)|c値/],
  ["spcrit", E + "efspellcvalue", ["Порог крита заклинаний", "Spell crit threshold"], /порог\S*\s+крит\S*\s+заклинани\S*|spell\s+crit\S*/],
  ["mpsave", A + "efmpall", ["Экономия ОМ (на заклинание)", "MP saving (per spell)"], /экономи\S*\s+ом|mp\s+(?:saving|cost\s+reduction)/],
  ["dexmod", "system.abilities.dex.efmodify", ["Бонус Ловкости", "Dexterity bonus"], /бонус\S*\s+ловкост\S*|модификатор\S*\s+ловкост\S*|dexterity\s+(?:bonus|modifier)/],
  ["agimod", "system.abilities.agi.efmodify", ["Бонус Подвижности", "Agility bonus"], /бонус\S*\s+подвижност\S*|модификатор\S*\s+подвижност\S*|agility\s+(?:bonus|modifier)/],
  ["strmod", "system.abilities.str.efmodify", ["Бонус Силы", "Strength bonus"], /бонус\S*\s+сил\S*|модификатор\S*\s+сил\S*|strength\s+(?:bonus|modifier)/],
  ["vitmod", "system.abilities.vit.efmodify", ["Бонус Живучести", "Vitality bonus"], /бонус\S*\s+живучест\S*|модификатор\S*\s+живучест\S*|vitality\s+(?:bonus|modifier)/],
  ["intmod", "system.abilities.int.efmodify", ["Бонус Интеллекта", "Intelligence bonus"], /бонус\S*\s+интеллект\S*|модификатор\S*\s+интеллект\S*|intelligence\s+(?:bonus|modifier)/],
  ["mndmod", "system.abilities.mnd.efmodify", ["Бонус Духа", "Spirit bonus"], /бонус\S*\s+дух\S*|модификатор\S*\s+дух\S*|spirit\s+(?:bonus|modifier)/],
  ["resfire", A + "decay.magic.element.magic.fire", ["Меньше урона от огня", "Less fire damage taken"], /(?:сопротивлени\S*|защит\S*\s+от|урон\S*\s+от)\s+(?:огн\S*|fire)|(?:fire)\s+resist\S*/, [A + "decay.physical.element.magic.fire"]],
  ["resice", A + "decay.magic.element.magic.ice", ["Меньше урона от воды/льда", "Less water/ice damage taken"], /(?:сопротивлени\S*|защит\S*\s+от|урон\S*\s+от)\s+(?:льд\S*|вод\S*|ice|water)|(?:water)\s+resist\S*/, [A + "decay.physical.element.magic.ice"]],
  ["reswind", A + "decay.magic.element.magic.wind", ["Меньше урона от ветра", "Less wind damage taken"], /(?:сопротивлени\S*|защит\S*\s+от|урон\S*\s+от)\s+(?:ветр\S*|wind)|(?:wind)\s+resist\S*/, [A + "decay.physical.element.magic.wind"]],
  ["researth", A + "decay.magic.element.magic.earth", ["Меньше урона от земли", "Less earth damage taken"], /(?:сопротивлени\S*|защит\S*\s+от|урон\S*\s+от)\s+(?:земл\S*|earth)|(?:earth)\s+resist\S*/, [A + "decay.physical.element.magic.earth"]],
  ["resthunder", A + "decay.magic.element.magic.thunder", ["Меньше урона от молнии", "Less lightning damage taken"], /(?:сопротивлени\S*|защит\S*\s+от|урон\S*\s+от)\s+(?:молни\S*|lightning|thunder)|(?:lightning)\s+resist\S*/, [A + "decay.physical.element.magic.thunder"]],
].map(([id, key, label, re, more]) => ({ id, key, label, re, more: more ?? [] }));
/** Bonus to one named check item: «Скрытность +2» -> system.effect.checkbonus.Скрытность */
export const checkBonusKey = (checkName) => `${E}checkbonus.${String(checkName).trim()}`;
const CHECK_RE = /^system\.effect\.checkbonus\.(.+)$/;
export const statById = (id) => STATS.find((s) => s.id === id);
export const statByKey = (key) => STATS.find((s) => s.key === key);
export const statLabel = (s) => L2(s.label[0], s.label[1]);

const plain = (html) => String(html ?? "").replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
  .normalize("NFKC").replace(/[−–—‐‑](?=\s*\d)/g, "-");
const RES = STATS.map((s) => ({ s, re: new RegExp(s.re.source, "g") }));

/** Stat mentions in a text fragment, longest match first, no overlaps (so «маг. защита» is not also «защита»). */
function mentions(seg) {
  const all = [];
  for (const { s, re } of RES) { re.lastIndex = 0; let m; while ((m = re.exec(seg))) { if (!m[0]) { re.lastIndex++; continue; } all.push({ s, a: m.index, b: m.index + m[0].length }); } }
  all.sort((x, y) => (y.b - y.a) - (x.b - x.a));
  const kept = [];
  for (const c of all) if (!kept.some((k) => c.a < k.b && k.a < c.b)) kept.push(c);
  const out = kept.sort((x, y) => x.a - y.a).map((k) => k.s);
  // 「生命・精神抵抗力」 names both resistances
  if (/生命・精神抵抗/.test(seg)) for (const id of ["vitres", "mndres"]) if (!out.some((s) => s.id === id)) out.push(statById(id));
  return [...new Set(out)];
}

/** Duration in rounds from "3分(18ラウンド)", "18 р.", "1 мин", "10 sec", "1 hour"; null = none / permanent / unknown. */
export function roundsOf(text) {
  const t = plain(text).toLowerCase();
  let m = t.match(/(\d+)\s*(?:ラウンド|раунд|р\.|rounds?)/);
  if (m) return Number(m[1]);
  m = t.match(/(\d+)\s*(?:分|мин|min)/); if (m) return Number(m[1]) * 6;
  m = t.match(/(\d+)\s*(?:秒|сек|sec)/); if (m) return Math.max(1, Math.round(Number(m[1]) / 10));
  m = t.match(/(\d+)\s*(?:時間|час|ч\.|hours?)/); if (m) return Number(m[1]) * 360;
  return null;
}

/**
 * -> { rows: [{id, key, value}], rounds, notes[], choice }
 * A signed number is given to the stats named just before it («Точность и Уклонение +1», 「命中力・回避力に+1」),
 * or, when nothing is named before it, to the stats named right after it («+1 к Точности»).
 */
export function parseEffectText(text, durationText = "") {
  const rows = [], notes = [];
  const low = plain(text).toLowerCase();
  for (const sent of plain(text).split(/[。\n;!?]+|\.(?=\s+[A-ZА-ЯЁ])/).map((x) => x.toLowerCase())) {
    const nums = [...sent.matchAll(/([+-])\s*(\d+)(?!\s*(?:%|d\d|к\d))/g)];
    let prev = 0;
    nums.forEach((m, i) => {
      const value = Number(m[2]) * (m[1] === "-" ? -1 : 1);
      const end = m.index + m[0].length, next = nums[i + 1]?.index ?? sent.length;
      let st = mentions(sent.slice(prev, m.index));
      if (!st.length) st = mentions(sent.slice(end, next));
      prev = end;
      if (!value || value < -20 || value > 20) return;
      for (const s of st) {
        const same = rows.find((r) => r.id === s.id);
        if (same) { if (same.value !== value) notes.push(L2(`«${statLabel(s)}» встречается в тексте несколько раз (${same.value} и ${value}) — взято первое`, `"${statLabel(s)}" appears more than once (${same.value} and ${value}) — the first is used`)); continue; }
        rows.push({ id: s.id, key: s.key, value });
      }
    });
  }
  if (/場合|とき|時に|のみ|に対して|если|только|против|while|if |only|against/.test(low) && rows.length) notes.push(L2("в тексте есть условие («если», «против…») — эффект поставлен без условия", "the text has a condition — the effect is created unconditional"));
  // 「…のいずれかを+6」 / «одну из … на выбор»: one of the rows is picked when the effect is applied
  const choice = rows.length > 1 && /いずれか|どれか1つ|どれか一つ|одн\S+ из|на выбор|one of|choose/.test(low);
  if (choice) notes.push(L2("в тексте выбор одного из вариантов — сделан отдельный эффект на каждый", "the text offers a choice — one effect per option is created"));
  return { rows, rounds: roundsOf(durationText) ?? roundsOf(text), notes, choice };
}

const GEAR = ["weapon", "armor", "accessory"];
/** [ActiveEffect data] for an item of `type` from rows ([] when there is nothing to create). `choice`: one effect per row, picked on use. */
export function buildEffects(name, type, rows, opts = {}) {
  rows = rows.filter((r) => r.key && Number(r.value));
  if (!opts.choice || rows.length < 2 || (opts.transfer ?? GEAR.includes(type))) return [buildEffectData(name, type, rows, opts)].filter(Boolean);
  return rows.map((r) => {
    const label = describeRows([r]), fx = buildEffectData(name, type, [r], opts);
    return Object.assign(fx, { name: `${name}: ${label}`, flags: { sw25: { fromText: true, round70: true, choice: true, choiceLabel: label } } });
  });
}
export function buildEffectData(name, type, rows, { rounds = null, transfer = GEAR.includes(type), equip = false } = {}) {
  rows = rows.filter((r) => r.key && Number(r.value));
  if (!rows.length) return null;
  const fx = {
    name: `${name}: ${transfer ? L2("бонус экипировки", "equipment bonus") : L2("эффект", "effect")}`,
    img: transfer ? "icons/svg/ring.svg" : Number(rows[0].value) < 0 ? "icons/svg/downgrade.svg" : "icons/svg/upgrade.svg",
    transfer, disabled: transfer ? !equip : false,
    flags: { sw25: { fromText: true } },
    // a stat may drive several keys (resistance to an element: magical and physical damage of that element)
    system: { changes: rows.flatMap((r) => [r.key, ...(statByKey(r.key)?.more ?? [])].map((key) => ({ key, type: "add", value: Number(r.value), phase: "initial" }))) },
  };
  if (!transfer && rounds) fx.duration = { value: Number(rounds), units: "rounds" };
  return fx;
}
export function describeRows(rows) { return _describe(rows); }
const _describe = (rows) => rows.filter((r) => !r.silent).map((r) => {
  const ck = String(r.key).match(CHECK_RE);
  const label = ck ? L2(`проверка «${ck[1]}»`, `"${ck[1]}" check`) : statLabel(statByKey(r.key) ?? { label: [r.key, r.key] });
  return `${label} ${r.value > 0 ? "+" : ""}${r.value}`;
}).join(", ");

/* ------------------------------------------------------------------ *
 *  Dialog: edit the effect by hand
 * ------------------------------------------------------------------ */
const escH = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rowHtml = (r = {}) => `<tr class="sw25-fx-row"><td><select name="id"><option value="">—</option>${STATS.map((s) => `<option value="${s.id}"${s.id === r.id ? " selected" : ""}>${escH(statLabel(s))}</option>`).join("")}</select></td>`
  + `<td><input type="number" name="value" value="${Number(r.value) || 0}" step="1" style="width:5em"/></td><td><a class="sw25-fx-del" data-tooltip="${L2("Убрать строку", "Remove row")}"><i class="fas fa-trash"></i></a></td></tr>`;

export async function openEffectTextDialog(item) {
  if (!item?.isOwner) return ui.notifications.warn(L2("Нет прав на этот предмет.", "You do not own this item."));
  const DialogV2 = foundry.applications.api.DialogV2;
  const mine = item.effects.filter((e) => e.flags?.sw25?.fromText);
  const cur = mine[0];
  const fromText = () => parseEffectText(item.system.description ?? "", item.system.time ?? "");
  let st;
  if (cur) st = { rows: mine.flatMap((e) => e.system?.changes ?? e.changes ?? []).map((c) => ({ id: statByKey(c.key)?.id ?? "", key: c.key, value: Number(c.value) })).filter((r) => r.id), rounds: cur.duration?.units === "rounds" ? cur.duration.value : null, notes: [], choice: mine.some((e) => e.flags?.sw25?.choice) };
  else st = fromText();
  const transfer = cur ? cur.transfer : GEAR.includes(item.type);
  const others = item.effects.size - mine.length;
  const content = `<div class="sw25-fx-dlg">
    <p class="hint">${L2("Простые числовые бонусы и штрафы. Строки ниже — то, что получит владелец предмета или цель. Поправь, добавь или убери и нажми «Сохранить».", "Simple numeric bonuses and penalties. Edit, add or remove rows and press Save.")}</p>
    ${others ? `<p class="hint">${L2(`У предмета есть ещё эффекты, сделанные вручную: ${others}. Их это окно не трогает (вкладка «Эффекты»).`, `The item has ${others} more hand-made effect(s); this window does not touch them (Effects tab).`)}</p>` : ""}
    <table><thead><tr><th>${L2("Что меняется", "What changes")}</th><th>${L2("На сколько", "By")}</th><th></th></tr></thead><tbody class="sw25-fx-rows">${(st.rows.length ? st.rows : [{}]).map(rowHtml).join("")}</tbody></table>
    <p><a class="sw25-fx-add"><i class="fas fa-plus"></i> ${L2("Добавить строку", "Add row")}</a> &nbsp; <a class="sw25-fx-reread"><i class="fas fa-rotate"></i> ${L2("Прочитать из описания заново", "Re-read from the description")}</a></p>
    <p><label>${L2("Длительность, раундов (пусто — без срока)", "Duration, rounds (empty — none)")} <input type="number" name="rounds" min="0" step="1" value="${st.rounds ?? ""}" style="width:5em;display:inline-block"/></label></p>
    <p><label><input type="checkbox" name="transfer"${transfer ? " checked" : ""}/> ${L2("Действует, пока предмет надет (иначе — накладывается при использовании)", "Works while equipped (otherwise applied on use)")}</label></p>
    <p><label><input type="checkbox" name="choice"${st.choice ? " checked" : ""}/> ${L2("На выбор: при применении выбирается одна из строк", "Choice: one of the rows is picked when applied")}</label></p>
    <p class="hint sw25-fx-notes">${st.notes.map(escH).join("<br>")}</p></div>`;
  const read = (root) => ({
    rows: [...root.querySelectorAll(".sw25-fx-row")].map((tr) => { const s = statById(tr.querySelector("[name=id]").value); return s ? { id: s.id, key: s.key, value: Number(tr.querySelector("[name=value]").value) || 0 } : null; }).filter((r) => r && r.value),
    rounds: Number(root.querySelector("[name=rounds]").value) || null, transfer: root.querySelector("[name=transfer]").checked, choice: root.querySelector("[name=choice]").checked,
  });
  const res = await DialogV2.wait({
    window: { title: `${L2("Эффекты", "Effects")}: ${item.name}` }, position: { width: 460 }, content, rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element ?? dlg;
      root.addEventListener("click", (e) => {
        const t = e.target.closest("a"); if (!t) return;
        const body = root.querySelector(".sw25-fx-rows");
        if (t.classList.contains("sw25-fx-add")) body.insertAdjacentHTML("beforeend", rowHtml());
        else if (t.classList.contains("sw25-fx-del")) t.closest("tr").remove();
        else if (t.classList.contains("sw25-fx-reread")) {
          const p = fromText();
          body.innerHTML = (p.rows.length ? p.rows : [{}]).map(rowHtml).join("");
          root.querySelector("[name=rounds]").value = p.rounds ?? "";
          root.querySelector("[name=choice]").checked = !!p.choice;
          root.querySelector(".sw25-fx-notes").innerHTML = (p.rows.length ? p.notes : [L2("В описании не нашлось простых бонусов — добавь строки вручную.", "No simple bonuses found in the description — add rows by hand.")]).map(escH).join("<br>");
        }
      });
    },
    buttons: [
      { action: "save", label: L2("Сохранить", "Save"), icon: "fas fa-check", default: true, callback: (ev, btn, dlg) => read(dlg.element ?? dlg) },
      { action: "cancel", label: L2("Отмена", "Cancel"), icon: "fas fa-times", callback: () => null },
    ],
  }).catch(() => null);
  if (!res || res === "cancel") return null;
  const list = buildEffects(item.name, item.type, res.rows, { rounds: res.rounds, transfer: res.transfer, choice: res.choice, equip: item.system.equip === true });
  const data = list[0] ?? null;
  if (mine.length) await item.deleteEmbeddedDocuments("ActiveEffect", mine.map((e) => e.id));
  if (list.length) await item.createEmbeddedDocuments("ActiveEffect", list);
  if (data && !res.transfer && "useeffect" in (item.system ?? {}) && !item.system.useeffect) await item.update({ "system.useeffect": true });
  ui.notifications.info(data ? L2(`${item.name}: эффект сохранён — ${describeRows(res.rows)}.`, `${item.name}: effect saved — ${describeRows(res.rows)}.`) : L2(`${item.name}: эффект из текста убран.`, `${item.name}: text effect removed.`));
  return data;
}

export function registerEffectText() {
  Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
    const item = sheet.item ?? sheet.object;
    if (!item?.isOwner || item.pack && game.packs.get(item.pack)?.locked) return;
    buttons.unshift({ label: L2("Эффекты", "Effects"), class: "sw25-fx-text", icon: "fas fa-wand-magic-sparkles", onclick: () => openEffectTextDialog(item) });
  });
  game.sw25 = Object.assign(game.sw25 ?? {}, { effectText: { parse: parseEffectText, open: openEffectTextDialog, build: buildEffects, describeRows, roundsOf, STATS } });
}
