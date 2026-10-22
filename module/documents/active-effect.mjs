/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {ActiveEffect}
 */
export class SW25ActiveEffect extends ActiveEffect {
  /** @override */
  prepareData() {
    // Prepare data for the active effect.
    super.prepareData();
  }

  /** Racial growth effects (flags.sw25.minAdv) stay off below that adventurer level. */
  get isSuppressed() {
    const min = Number(this.flags?.sw25?.minAdv) || 0;
    if (min) {
      const actor = this.target ?? this.parent?.actor ?? this.parent;
      const items = actor?.items;
      if (items) {
        let lv = 0;
        for (const i of items) if (i.type === "skill") lv = Math.max(lv, Number(i.system?.skilllevel) || 0);
        if (lv < min) return true;
      }
    }
    return super.isSuppressed;
  }

  /** @override */
  prepareDerivedData() {
    // preparation methods overridden (such as prepareBaseData()).
    const effectData = this;
  }

  /** @override */
  async update(data, options = {}) {
    SW25ActiveEffect.#fixChanges(data);
    return super.update(data, options);
  }

  /** @override */
  static async create(data, options = {}) {
    SW25ActiveEffect.#fixChanges(data);
    return super.create(data, options);
  }

  /** [ru.11] v14 keeps the changes in system.changes (also accepts the old top-level «changes»). */
  static #fixChanges(data) {
    if (!data || typeof data !== "object") return;
    if (data.changes) data.changes = SW25ActiveEffect.applyChangeData(data.changes);
    if (data.system?.changes) data.system.changes = SW25ActiveEffect.applyChangeData(data.system.changes);
    if (data["system.changes"]) data["system.changes"] = SW25ActiveEffect.applyChangeData(data["system.changes"]);
  }

  static applyChangeData(changes) {
    if (!Array.isArray(changes)) changes = Object.values(changes ?? {});
    return changes.map((change) => {
      if (!change || typeof change !== "object") return change;
      if (!change.keyClassification) {
        change.keyClassification = "";
      }
      if (!change.keyname) {
        change.keyname = "";
      }
      if (!change.key) {
        if (change.keyname != "") change.key = "system." + change.keyname;
        else change.key = "";
      }
      if (change.keyClassification == "checkname")
        change.key = "system.effect.checkinputmod." + change.checkname;

      if (change.key.startsWith("input,")) {
        change.key = change.key.replace(/^input,/, "");
      } else if (change.key.startsWith("checkinput,")) {
        change.key = change.key.replace(/^checkinput,/,"system.effect.checkinputmod.");
      }
      return change;
    });
  }
}
