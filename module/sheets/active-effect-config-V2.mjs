/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActiveEffectConfig}
 */
export class SW25ActiveEffectConfigV2 extends ActiveEffectConfig {
  static PARTS = {
    header: { template: "templates/sheets/active-effect/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "templates/sheets/active-effect/details.hbs",
      scrollable: [""],
    },
    duration: { template: "templates/sheets/active-effect/duration.hbs" },
    changes: {
      template: "systems/sw25-ru/templates/effect/changes.hbs",
      scrollable: ["ol[data-changes]"],
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext();

    const systemPrefixedEffects = {};
    for (const [category, entries] of Object.entries(CONFIG.SW25.Effect)) {
      if (category === "keyClassifications") {
        systemPrefixedEffects[category] = entries;
        continue;
      }

      systemPrefixedEffects[category] = Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [`system.${key}`, value])
      );
    }

    context.effectOptions = systemPrefixedEffects;

    // checkinput , input 
    if (context.source?.changes) {
      context.source.changes = context.source.changes.map((change) => {
        if (!change.key) return change;

        const match = change.key.match(/^system\.effect\.checkinputmod\.(.+)$/);

        if (match) {
          const [, checkname] = match;
          change.keyClassification = "checkinput";
          change.checkname = checkname;
        } else {
          let isInput = true;

          const categories = Object.keys(systemPrefixedEffects).filter(k => k !== "keyClassifications");
          for (const category of categories) {
            const keys = Object.keys(systemPrefixedEffects[category]);
            if (keys.includes(change.key)) isInput = false;
          }
          if (isInput) {
            change.keyClassification = "input";
          }
        }
        return change;
      });
    }

    return context;
  }

  /**
   * [Round 66] One delegated "change" listener on this window's own element
   * (was: a new MutationObserver on document.body on EVERY render, never
   * disconnected — they piled up and slowed the whole UI over a session).
   */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    if (!root || root.dataset.sw25KeyListener) return;
    root.dataset.sw25KeyListener = "true";
    root.addEventListener("change", (event) => {
      const select = event.target.closest?.(".select-keyname");
      if (!select) return;
      const container = select.closest(".key");
      if (!container) return;

      container
        .querySelectorAll("input.dynamic-input")
        .forEach((el) => el.remove());

      const value = select.value;
      if (value === "checkinput" || value === "input") {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("dynamic-input");
        input.style.maxWidth = "calc(60% - 7px)";
        input.name = select.name;
        container.appendChild(input);
      }
    });
  }
}
