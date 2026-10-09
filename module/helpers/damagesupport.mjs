import { isLabel } from "./utils.mjs";
// [2026-10-07] spells, songs and class abilities name their element in system.prop
// (system.elements is only filled on weapons and monster abilities), so weaknesses
// and immunities never saw it. Derive the element tags from prop when none are set.
const PROP_ELEMENTS = {
  fire: ["fire"], ice: ["ice"], thunder: ["thunder"], wind: ["wind"], earth: ["earth"], energy: ["energy"],
  poison: ["poison"], disease: ["disease"], curse: ["curse"], mental: ["mental"], mentalw: ["mentalw"],
  cut: ["cut"], impact: ["impact"],
  windthunder: ["wind", "thunder"], fandw: ["fire", "wind"], iandt: ["ice", "thunder"],
  curseMental: ["curse", "mental"], mentalPoison: ["mental", "poison"],
};
export class DamageSupporter {
  /** system.elements of an item, completed from system.prop when it carries no element of its own */
  static elementsOf(item) {
    const src = item?.system?.elements;
    const el = src && typeof src === "object" ? foundry.utils.deepClone(src) : {};
    const any = (g) => g && typeof g === "object" && Object.values(g).some((v) => v === true);
    if (!any(el.magic) && !any(el.physical)) {
      const keys = PROP_ELEMENTS[item?.system?.prop] ?? [];
      if (keys.length) {
        if (!el.magic || typeof el.magic !== "object") el.magic = {};
        for (const k of keys) el.magic[k] = true;
      }
    }
    return el;
  }
  // create chat-tags
  static createChatTag(elements, damage, attackerClass, isWeapon = false) {
    const result = {
      condition: elements?.type || undefined,
      attackerClass: attackerClass || null,
      classType: [],
      elements: {
        magic: [],
        physical: [],
      },
    };

    const elementsMagic = elements?.magic || {};
    const elementsPhysical = elements?.physical || {};

    const mdMagic = damage?.magic?.element?.magic || {};
    const mdPhysical = damage?.magic?.element?.physical || {};
    const pdMagic = damage?.physical?.element?.magic || {};
    const pdPhysical = damage?.physical?.element?.physical || {};

    const mdClass = damage?.magic?.classType || {};
    const pdClass = damage?.physical?.classType || {};

    // classType mod
    const allClassKeys = new Set([
      ...Object.keys(mdClass),
      ...Object.keys(pdClass),
    ]);
    for (const key of allClassKeys) {
      result.classType.push({
        key,
        pd: Number(pdClass[key] ?? 0),
        md: Number(mdClass[key] ?? 0),
      });
    }

    // Element mod
    const magicKeys = new Set([
      ...Object.entries(elementsMagic)
        .filter(([_, v]) => v === true)
        .map(([k]) => k),
      ...(isWeapon ? [...Object.keys(mdMagic), ...Object.keys(pdMagic)] : []),
    ]);

    const physicalKeys = new Set([
      ...Object.entries(elementsPhysical)
        .filter(([_, v]) => v === true)
        .map(([k]) => k),
      ...(isWeapon
        ? [...Object.keys(mdPhysical), ...Object.keys(pdPhysical)]
        : []),
    ]);

    // magic element
    for (const key of magicKeys) {
      result.elements.magic.push({
        key,
        pd: Number(pdMagic[key] ?? 0),
        md: Number(mdMagic[key] ?? 0),
      });
    }

    // physical element
    for (const key of physicalKeys) {
      result.elements.physical.push({
        key,
        pd: Number(pdPhysical[key] ?? 0),
        md: Number(mdPhysical[key] ?? 0),
      });
    }
    return result;
  }

  static calcDamage(damageVal, tags, decay, targetClass, buttonType) {
    if (!tags) return null;

    let total = damageVal;
    const damageType = buttonType.replace("button", "");
    const tagKey = damageType === "pd" ? "pd" : "md";
    const decayKey = damageType === "pd" ? "physical" : "magic";

    const result = {
      base: damageVal,
      damageType,
      bonus: 0,
      resist: 0,
      total: damageVal,
      detail: [],
      elementAnalysis: {
        magic: { selected: null, elements: [] },
        physical: { selected: null, elements: [] },
      },
    };

    if (["cd", "hr", "mr"].includes(damageType)) {
      result.total = total;
      result.detail.push({ type: "fixed", value: total, bonus: 0, decay: 0 });
      return result;
    }

    // class decay
    const attackerClass = tags.attackerClass;
    const decayClassType = decay?.[decayKey]?.classType || {};
    if (attackerClass && decayClassType[attackerClass]) {
      const resist = decayClassType[attackerClass];
      total -= resist;
      result.resist += resist;
      result.detail.push({
        type: "attackerClassDecay",
        key: attackerClass,
        bonus: 0,
        decay: resist,
        value: -resist,
      });
    }

    // SW25-RU: flat (element-agnostic) category decay — covers book
    // "weakness" text like "Физический урон +N"/"Магический урон +N"
    // that doesn't name a specific element, so it can't be matched by
    // the per-element decay loop below (that loop only fires for
    // elements actually tagged on the attacking item). A positive
    // flatDecay value resists ALL damage of this category, negative
    // makes the target more vulnerable to ALL damage of this category
    // — applies unconditionally, regardless of any element tags.
    const flatDecay = Number(decay?.[decayKey]?.flat) || 0;
    if (flatDecay !== 0) {
      total -= flatDecay;
      result.resist += flatDecay;
      result.detail.push({
        type: "flatDecay",
        key: decayKey,
        bonus: 0,
        decay: flatDecay,
        value: -flatDecay,
      });
    }

    // class mod
    const classTypeList = tags.classType || [];
    for (const entry of classTypeList) {
      if (entry.key === targetClass && typeof entry[tagKey] === "number") {
        const bonus = entry[tagKey];
        total += bonus;
        result.bonus += bonus;
        result.detail.push({
          type: "targetClassBonus",
          key: targetClass,
          bonus,
          decay: 0,
          value: bonus,
        });
      }
    }

    // element
    for (const type of ["magic", "physical"]) {
      const tagElems = tags.elements?.[type] || [];
      const decayMagic = decay?.[decayKey]?.element?.magic || {};
      const decayPhysical = decay?.[decayKey]?.element?.physical || {};
      const elementMap = new Map();

      // elements bonus
      for (const elem of tagElems) {
        const key = elem.key;
        const bonus = elem[tagKey] ?? 0;
        if (!elementMap.has(key)) {
          elementMap.set(key, { key, bonus: 0, decay: 0 });
        }
        elementMap.get(key).bonus += bonus;
      }

      // element decay
      for (const [key, val] of Object.entries(decayMagic)) {
        if (elementMap.has(key)) {
          elementMap.get(key).decay += val;
        }
      }
      for (const [key, val] of Object.entries(decayPhysical)) {
        if (elementMap.has(key)) {
          elementMap.get(key).decay += val;
        }
      }

      const elements = Array.from(elementMap.values());
      result.elementAnalysis[type].elements = elements;

      if (elements.length > 0) {
        let maxElem = elements[0];
        let maxValue = maxElem.bonus - maxElem.decay;
        for (const elem of elements) {
          const value = elem.bonus - elem.decay;
          if (value > maxValue && elem.key !== "mithril") {
            maxValue = value;
            maxElem = elem;
          }
        }

        result.elementAnalysis[type].selected = maxElem.key;

        // blade / blow
        if (maxElem.key !== "mithril") {
          if (maxElem.bonus !== 0) {
            total += maxElem.bonus;
            result.bonus += maxElem.bonus;
            result.detail.push({
              type: `elementTagBonus-${type}`,
              key: maxElem.key,
              bonus: maxElem.bonus,
              decay: 0,
              value: maxElem.bonus,
            });
          }
          if (maxElem.decay !== 0) {
            total -= maxElem.decay;
            result.resist += maxElem.decay;
            result.detail.push({
              type: `elementDecayResist-${type}`,
              key: maxElem.key,
              bonus: 0,
              decay: maxElem.decay,
              value: -maxElem.decay,
            });
          }
        }

        // mithril
        if (type === "physical") {
          const mithrilElem = elements.find((e) => e.key === "mithril");
          if (mithrilElem) {
            if (mithrilElem.bonus !== 0) {
              total += mithrilElem.bonus;
              result.bonus += mithrilElem.bonus;
              result.detail.push({
                type: `elementTagBonus-${type}-mithril`,
                key: "mithril",
                bonus: mithrilElem.bonus,
                decay: 0,
                value: mithrilElem.bonus,
              });
            }
            if (mithrilElem.decay !== 0) {
              total -= mithrilElem.decay;
              result.resist += mithrilElem.decay;
              result.detail.push({
                type: `elementDecayResist-${type}-mithril`,
                key: "mithril",
                bonus: 0,
                decay: mithrilElem.decay,
                value: -mithrilElem.decay,
              });
            }
          }
        }
      }
    }

    result.total = total;
    return result;
  }
  
  static getWeaponAttributes(item) {
    if (!item) return false;
    let isWeapon = ["weapon"].includes(item.type);
    
    if (item.type == "monsterability") {
        if (
          isLabel(item.system.label1, "MonDmg") ||
          isLabel(item.system.label2, "MonDmg") ||
          isLabel(item.system.label3, "MonDmg") 
        ) {
          isWeapon = true;
        }
    }

    if (item.type != "weapon") {
      if (item.system.elements?.physical?.blade == true ||
        item.system.elements?.physical?.blow == true ||
        item.system.elements?.physical?.gun == true){
          isWeapon = true;
        }
    }

    return isWeapon;
  }
}
