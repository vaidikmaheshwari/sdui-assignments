/**
 * P7 item 4 — "move JSON.parse + Zod validation off the JS thread".
 *
 * React Native has no worker threads out of the box. The one mechanism available here without
 * writing a native module is `react-native-worklets` (already installed as reanimated 4's
 * dependency, so no new approved-dep is needed): `createWorkletRuntime` spins up a second JS
 * runtime on its own thread, and `runOnRuntime` schedules a worklet onto it.
 *
 * Two things are worth stating before the numbers, because they bound what item 4 can possibly
 * win:
 *
 * 1. **The result has to come back.** A worklet runtime does not share a heap with the JS
 *    runtime; anything returned across the boundary is deep-copied into a shareable
 *    representation. For a ~75KB payload that copy is not free, and it is paid on the JS thread
 *    on the way out. Moving `JSON.parse` off-thread therefore trades a parse for a serialize +
 *    copy, which may well be a net loss. That is a real result, not a failed implementation.
 *
 * 2. **Zod is not going off-thread this way.** A worklet must be workletizable: its captured
 *    values have to be shareable, and a Zod schema is a graph of closures and prototypes built
 *    by an imported module. `runOnRuntime` over a closure capturing the registry's schemas is
 *    expected to throw at capture time. The attempt is made below rather than asserted away,
 *    and whatever it actually throws is logged verbatim and reported.
 */
import { createWorkletRuntime, runOnRuntime, runOnJS } from 'react-native-worklets';

const parseRuntime = createWorkletRuntime({ name: 'sduiParseRuntime' });

export function parseJsonOffThread(text: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const deliver = (value: unknown) => resolve(value);
    const fail = (message: string) => reject(new Error(message));

    runOnRuntime(parseRuntime, (payloadText: string) => {
      'worklet';
      try {
        const parsed = JSON.parse(payloadText) as unknown;
        runOnJS(deliver)(parsed);
      } catch (error) {
        runOnJS(fail)(`worklet JSON.parse threw: ${String(error)}`);
      }
    })(text);
  });
}

/**
 * Logged with a distinct greppable tag so scripts/benchmark-p7.sh can flag any run where the
 * opt4 build silently fell back to a JS-thread parse — a run like that would otherwise be
 * indistinguishable from the baseline and would quietly report "no regression".
 */
export function offThreadParseFailure(error: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`SDUI_OPT4_FALLBACK ${String(error)}`);
}

/**
 * The Zod half of item 4, attempted honestly. Called once at startup by the opt4 build; its
 * only job is to produce evidence for the write-up, so it never affects the rendered payload.
 */
export function probeZodOffThread(validate: (value: unknown) => unknown): void {
  try {
    runOnRuntime(parseRuntime, (value: unknown) => {
      'worklet';
      // Capturing `validate` is the whole question: if the worklet runtime can accept a
      // closure over a Zod schema, this runs; if it can't, the failure happens right here.
      validate(value);
    })({});
    // eslint-disable-next-line no-console
    console.log('SDUI_OPT4_ZOD_PROBE scheduled-without-throwing');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`SDUI_OPT4_ZOD_PROBE threw: ${String(error)}`);
  }
}
