/**
 * Temporary instrumentation for the §4.3 tile benchmark (docs/SCHEMA.md §4.3,
 * docs/PROMPTS.md P4.5). Logs two greppable markers to logcat, each firing once:
 *  - SDUI_TTR: the SDUI root has committed its first layout.
 *  - SDUI_FULL_RENDER: the scroll content has reported its final measured size,
 *    i.e. the whole node tree has laid out (not waiting on network image loads,
 *    which are identical across both payload variants and would only add noise).
 * Not part of the renderer — delete this file and its two call sites once the
 * tile question is resolved.
 */
let ttrLogged = false;
let fullRenderLogged = false;

export function markTTR(): void {
  if (ttrLogged) return;
  ttrLogged = true;
  // eslint-disable-next-line no-console
  console.log(`SDUI_TTR ${Date.now()}`);
}

export function markFullRender(): void {
  if (fullRenderLogged) return;
  fullRenderLogged = true;
  // eslint-disable-next-line no-console
  console.log(`SDUI_FULL_RENDER ${Date.now()}`);
}
