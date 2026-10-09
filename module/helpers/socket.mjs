/**
 * SW25-RU: player -> GM socket relay.
 *
 * Foundry only relays socket messages on the channel `system.<system id>`.
 * The upstream system used the id "sw25" and hardcoded "system.sw25";
 * after the fork was renamed to "sw25-ru" that channel was silently dropped
 * by the server, so no player-initiated apply ever reached the GM.
 */

/** Socket channel for this system (derived from the manifest id). */
export function socketName() {
  return `system.${game.system.id}`;
}

/**
 * Send a request to the active GM.
 * Adds the sender id and the sender's current scene so the GM can resolve
 * tokens even when viewing a different scene.
 * @returns {boolean} false if no GM is online (the request is not sent).
 */
export function emitToGM(data) {
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("SW25.Socket.NoGM"));
    return false;
  }
  data.userId = game.user.id;
  data.sceneId ??= canvas?.scene?.id ?? null;
  game.socket.emit(socketName(), data);
  return true;
}

/**
 * Resolve a token id to its (synthetic, for unlinked tokens) actor.
 * Search order: the given scene, the GM's current canvas, all scenes.
 */
export function resolveTokenActor(tokenId, sceneId) {
  if (!tokenId) return null;
  const fromScene = game.scenes.get(sceneId)?.tokens.get(tokenId);
  if (fromScene?.actor) return fromScene.actor;
  const fromCanvas = canvas?.tokens?.get(tokenId);
  if (fromCanvas?.actor) return fromCanvas.actor;
  for (const scene of game.scenes) {
    const td = scene.tokens.get(tokenId);
    if (td?.actor) return td.actor;
  }
  return null;
}

/**
 * Compute the value to write for a resource given what the sender saw.
 * If the sender reported its "before" value, apply the difference to the
 * GM's current value (so two quick applies don't overwrite each other);
 * otherwise fall back to the absolute value (old behaviour).
 */
function nextValue(current, result, before, max) {
  if (result === undefined || result === null) return undefined;
  const cur = Number(current) || 0;
  if (before === undefined || before === null) return Number(result);
  const delta = Number(result) - Number(before);
  if (!delta) return cur;
  let next = cur + delta;
  // healing / restoring never overshoots the maximum
  if (delta > 0 && Number.isFinite(Number(max))) next = Math.min(next, Number(max));
  return next;
}

/** GM-side handler. Registered once from the `ready` hook. */
export function registerSocketHandler() {
  game.socket.on(socketName(), async (data) => {
    // Only the single active GM processes requests (no double apply).
    if (!game.user.isGM || game.user !== game.users.activeGM) return;
    try {
      await handle(data);
    } catch (err) {
      console.error("SW25 | socket request failed", data, err);
    }
  });
}

async function handle(data) {
  switch (data.method) {
    case "applyRoll":
    case "applyHp":
    case "applyMp": {
      const target = resolveTokenActor(data.targetToken, data.sceneId);
      if (!target) {
        console.warn("SW25 | socket: target token not found", data);
        return;
      }
      const sys = target.system;
      const update = {};
      const hp = nextValue(sys.hp?.value, data.resultHP, data.beforeHP, sys.hp?.max);
      const mp = nextValue(sys.mp?.value, data.resultMP, data.beforeMP, sys.mp?.max);
      if (hp !== undefined && data.method !== "applyMp") update["system.hp.value"] = hp;
      if (mp !== undefined && data.method !== "applyHp") update["system.mp.value"] = mp;
      if (mp !== undefined && update["system.mp.value"] < 0) update["system.mp.value"] = 0;
      if (Object.keys(update).length) await target.update(update);
      return;
    }

    case "applyEffect": {
      const ids = Array.isArray(data.targetTokens) ? data.targetTokens : [data.targetTokens];
      for (const id of ids) {
        const targetActor = resolveTokenActor(id, data.sceneId);
        if (!targetActor) continue;
        const effects = (data.targetEffects ?? []).map((effect) => {
          const e = foundry.utils.duplicate(effect);
          e.disabled = false;
          e.sourceName = data.orgActor;
          e.flags = {
            ...(e.flags ?? {}),
            sw25: {
              ...(e.flags?.sw25 ?? {}),
              sourceName: data.orgActor,
              sourceId: `Actor.${data.orgId}`,
            },
          };
          return e;
        });
        // [Round 88] the same spell recast on the same target replaces its effect (no stacking)
        const dup = targetActor.effects.filter((x) => x.origin && effects.some((n) => n.origin === x.origin && n.name === x.name)).map((x) => x.id);
        if (dup.length) await targetActor.deleteEmbeddedDocuments("ActiveEffect", dup);
        if (effects.length) await targetActor.createEmbeddedDocuments("ActiveEffect", effects);
      }
      return;
    }

    case "updateChat": {
      const chatMessage = game.messages.get(data.id);
      if (!chatMessage) {
        console.warn(`SW25 | socket: ChatMessage ${data.id} not found`);
        return;
      }
      // Only system chat cards may be rewritten through the relay.
      if (!chatMessage.flags?.sw25) return;
      const updateData = {};
      if (data.content !== null && data.content !== undefined) updateData.content = data.content;
      if (data.flags?.sw25) updateData.flags = { sw25: data.flags.sw25 };
      if (Object.keys(updateData).length) await chatMessage.update(updateData);
      return;
    }
  }
}
