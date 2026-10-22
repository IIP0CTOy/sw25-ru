/**
 * Golem enhancing items. The system ships no list of them: the GM makes them in the item constructor
 * (kind «Golem part»), or module data adds a compendium (catalog.mjs).
 *   flags.sw25.golemPart = { id, size: small|medium|large, needs, replaces, ab{ru,en,ja}, hp?, hit?, mdmg?, move?, weak?, resist? }
 *
 * Rules kept here: the size is the one the golem template asks for, a golem takes up to its maximum
 * number of items, the same item twice does nothing, an item that needs a base item replaces its
 * ability. The items are chosen when the golem is made and come back afterwards (flag inGolem on
 * the creator's item while the golem exists).
 *
 * applyParts() changes ACTOR DATA (a copy), never the template.
 */
import { L2, uiLang } from "./monstergen-i18n.mjs";
import { flaggedItems } from "./catalog.mjs";

const N = (v) => Math.max(0, Math.floor(Number(v) || 0));
export const partOf = (i) => i?.flags?.sw25?.golemPart ?? null;
export const SIZE_NAME = { small: ["малый", "small"], medium: ["средний", "medium"], large: ["большой", "large"] };
export const ELEMENTS = [["earth", ["Земля", "Earth"]], ["ice", ["Вода/лёд", "Water/Ice"]], ["wind", ["Ветер", "Wind"]], ["fire", ["Огонь", "Fire"]], ["thunder", ["Молния", "Lightning"]], ["energy", ["Энергия", "Energy"]]];
export const elName = (k) => { const e = ELEMENTS.find((x) => x[0] === k); return e ? L2(e[1][0], e[1][1]) : String(k ?? ""); };
const abName = (p) => { const L = uiLang(); return p.ab?.[L] ?? p.ab?.en ?? p.id; };

/** Check a set of parts (plain golemPart objects). Returns an error text or "". */
export function checkParts(parts, max) {
  const ids = parts.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return L2("Один и тот же предмет дважды не действует.", "The same item twice has no effect.");
  if (max && parts.length > max) return L2(`Не больше ${max} предметов для этого голема.`, `No more than ${max} items for this golem.`);
  const miss = parts.find((p) => p.needs && !ids.includes(p.needs));
  if (miss) return L2(`«${abName(miss)}» требует базовый предмет.`, `«${abName(miss)}» needs its base item.`);
  return "";
}

/**
 * Put the parts into actor data (toObject() of the golem). parts: [{ ...golemPart, name, text }],
 * resist: element key for the Quartz Disruptor.
 */
export function applyParts(data, parts, { resist = "" } = {}) {
  if (!parts?.length) return data;
  const sys = (data.system ??= {});
  const replaced = new Set(parts.filter((p) => p.replaces).map((p) => p.needs));   // a gold item takes over its base item's ability
  const changes = [];
  const hp = parts.reduce((s, p) => s + N(p.hp), 0);
  const hit = parts.reduce((s, p) => s + N(p.hit), 0);
  const mdmg = parts.reduce((s, p) => s + N(p.mdmg), 0);
  const move = parts.reduce((s, p) => s + N(p.move), 0);
  if (hp) changes.push({ key: "system.hp.efhpmod", type: "add", value: String(hp), phase: "initial" });
  if (hit) changes.push({ key: "system.attributes.efhitmod", type: "add", value: String(hit), phase: "initial" });
  if (mdmg) changes.push({ key: "system.attributes.decay.magic.flat", type: "add", value: String(mdmg), phase: "initial" });
  data.effects ??= [];
  if (changes.length) data.effects.push({ name: L2("Улучшающие предметы", "Enhancing Items"), img: "icons/commodities/gems/gem-rough-cushion-violet.webp", transfer: false, disabled: false, changes, flags: { sw25: { golemParts: true } } });
  if (hp && sys.hp) sys.hp.value = N(sys.hp.value) + hp;   // max comes from the effect; start at full
  // movement: every number in the text +N («9/—» -> «14/—»)
  if (move && typeof sys.move === "string" && /\d/.test(sys.move)) sys.move = sys.move.replace(/\d+/g, (x) => String(N(x) + move));
  else if (move) sys.move = `${sys.move ?? ""} (+${move})`.trim();
  // Moonstone: no weak point
  if (parts.some((p) => p.weak)) {
    sys.weakness = L2("Нет", "None");
    data.effects = data.effects.filter((e) => !/^(Слабое место|Weak point|弱点)/.test(String(e.name ?? "")));
  }
  // abilities as text (a gold item replaces its base item's ability)
  data.items ??= [];
  for (const p of parts) {
    if (replaced.has(p.id)) continue;
    const tag = String(p.ab?.ru ?? "").trim();
    const el = p.resist && resist ? ` — ${elName(resist)}` : "";
    data.items.push({
      name: `${abName(p).replace(/^[◯►△🗨]+\s*/u, "")}${el}`, type: "monsterability",   // the mark is in the flags below, not in the name
      system: { description: "", overview: `${p.text ?? ""}${el}`, remark: p.name ?? "", constant: tag.startsWith("◯"), main: tag.startsWith("►"), prep: /^[🗨◯►]*△/u.test(tag), aux: false, decla: tag.startsWith("🗨") },
      flags: { sw25: { golemPartAbility: p.id } },
    });
  }
  foundry.utils.setProperty(data, "flags.sw25.golemParts", parts.map((p) => p.id));
  return data;
}

/** Plain part record from an item (what is sent to the GM). */
export function partRecord(item) {
  const p = partOf(item);
  if (!p) return null;
  const text = String(item.system?.description ?? "").replace(/<[^>]+>/g, "").replace(/^[^:：]*[:：]\s*/, "").trim();
  return { ...p, name: item.name, text, itemId: item.id };
}

/** GM tool on a monster sheet: a saved enhanced copy of a golem (template untouched). */
export async function openPartsCopy(actor) {
  if (!game.user.isGM || actor?.type !== "monster") return;
  // every golem part the GM has: world items and Item compendiums
  const docs = (await Promise.all((await flaggedItems("golemPart")).map((e) => fromUuid(e.uuid)))).filter((d) => partOf(d));
  if (!docs.length) return ui.notifications.warn(L2("Нет ни одного улучшающего предмета голема: сделайте их в конструкторе предметов («Деталь голема»).", "No golem enhancing items: make them in the item constructor («Golem part»)."));
  const { DialogV2 } = foundry.applications.api;
  const sizes = Object.keys(SIZE_NAME);
  const rows = (size) => docs.filter((d) => partOf(d)?.size === size).sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => `<label style="display:block"><input type="checkbox" name="p" value="${d.uuid}"> ${foundry.utils.escapeHTML(d.name)} ${d.system.price ? `<small>(${d.system.price} G)</small>` : ""}</label>`).join("");
  const content = `<div class="sw25-gparts">
    <p>${L2("Создаётся копия монстра с выбранными предметами. Сам шаблон не меняется.", "A copy of the monster is made with the chosen items. The template is not changed.")}</p>
    <label>${L2("Размер", "Size")} <select name="size">${sizes.map((s) => `<option value="${s}">${L2(SIZE_NAME[s][0], SIZE_NAME[s][1])}</option>`).join("")}</select></label>
    <label style="margin-left:8px">${L2("Максимум", "Maximum")} <input type="number" name="max" min="1" value="4" style="width:4em"></label>
    <label style="margin-left:8px">${L2("Стихия рассеивателя", "Disruptor type")} <select name="res">${ELEMENTS.map(([k, n]) => `<option value="${k}">${L2(n[0], n[1])}</option>`).join("")}</select></label>
    <div class="gp-list" style="max-height:340px;overflow:auto;margin-top:6px"></div></div>`;
  const res = await DialogV2.wait({
    window: { title: L2(`${actor.name}: улучшенная копия`, `${actor.name}: enhanced copy`) },
    position: { width: 480 },
    content,
    buttons: [
      { action: "ok", label: L2("Создать копию", "Make a copy"), default: true, callback: (ev, btn) => ({ ids: [...btn.form.querySelectorAll('[name="p"]:checked')].map((x) => x.value), max: N(btn.form.elements.max.value), res: btn.form.elements.res.value }) },
      { action: "cancel", label: L2("Отмена", "Cancel") },
    ],
    rejectClose: false,
    render: (ev, dlg) => {
      const root = dlg.element, list = root.querySelector(".gp-list");
      const fill = () => { list.innerHTML = rows(root.querySelector('[name="size"]').value); };
      root.querySelector('[name="size"]').addEventListener("change", fill);
      fill();
    },
  });
  if (!res || res === "cancel") return;
  const parts = res.ids.map((id) => partRecord(docs.find((d) => d.uuid === id))).filter(Boolean);
  const err = checkParts(parts, res.max);
  if (err) return ui.notifications.warn(err);
  const data = actor.toObject();
  delete data._id;
  applyParts(data, parts, { resist: res.res });
  data.name = `${actor.name} [${parts.map((p) => p.ab?.[uiLang()] ?? p.id).map((s) => s.replace(/^[◯►△🗨]+\s*/u, "")).join(", ")}]`;
  const made = await Actor.create(data);
  made?.sheet?.render(true);
}
