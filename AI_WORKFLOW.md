# AI_WORKFLOW.md

How this repo was actually built, what I rejected, and the place the AI took me somewhere wrong
and I nearly shipped it.

The contemporaneous record is [`docs/ai-log.md`](docs/ai-log.md) — eleven entries, each written at
the end of the session it describes, with a "Rejected / changed" block. Everything below is drawn
from it, not reconstructed afterwards.

---

## 1. Tool stack

| Tool | Used for |
|---|---|
| **Claude Code** (Opus) | Nearly all implementation, in one repo-scoped session per prompt |
| `tsc --noEmit`, Jest + `@testing-library/react-native` | The gate. Nothing lands red. |
| `adb`, `dumpsys gfxinfo`, Flashlight | On-device measurement, physical Android CPH2717 |
| Gradle `assembleRelease` | 11 release APKs, one per benchmark variant, kept in `bench/apks/` |

## 2. The context files I wrote before any code

The single highest-leverage thing I did was spend the first two commits on files that are not
code. Both are checked in deliberately.

**[`CLAUDE.md`](CLAUDE.md)** — the standing brief. Thirteen architecture rules, code rules, perf
rules, a commit convention, and a definition-of-done. Two clauses did most of the work:

> **Prime directive.** If a change makes the home page nicer but a hypothetical new screen
> harder, **reject it**.

> **The renderer knows nothing about cars.** No domain words (`car`, `emi`, `challan`, `fastag`,
> `tile`) anywhere in `src/sdui/core/**`.

The second is a *grep*, which matters more than it sounds: an instruction you can check
mechanically is an instruction that survives eleven sessions. It still returns nothing.

It also contains the rule that produced most of the material in §3:

> **Propose the design before writing code** for anything touching the schema, registry, or
> action system. One short paragraph of options + trade-offs, then wait.

**[`docs/SCHEMA.md`](docs/SCHEMA.md)** — the spec, written before the renderer existed, and the
tie-breaker: CLAUDE.md says explicitly that if the two disagree, SCHEMA wins. Thirteen sections
including the error semantics, the versioning story, a §12 of open questions, and — the part I'd
point at — §4.3, which left the `tile` composite *undecided pending measurement*, with the
decision rule fixed in advance so I couldn't move the goalposts after seeing the number.

**[`docs/PROMPTS.md`](docs/PROMPTS.md)** — the whole build sequenced as ten prompts (P0–P9) with a
**gate** under each: the thing I check before accepting the work. Writing the gates before the
prompts is what stopped me grading my own homework. P4.5's gate is representative:

> **Gate:** you make the call, not the AI. Rule from the spec: if composition costs <10% on both
> metrics it wins, and `tile` is never admitted.

**[`docs/OWNERSHIP_PLAYBOOK.md`](docs/OWNERSHIP_PLAYBOOK.md)** — the counterweight to working this
fast. Rule 1 is the narration test: before committing, close the editor and say out loud what the
file does, why it's a separate file, what happens on bad input, and what you'd change if the
requirement moved. *If you cannot narrate a file after two attempts, delete it.* Run after P1, P3
and P8.

---

## 3. Three prompt → outcome stories

### Story 1 — the type signature I made *worse* on purpose

**Prompt (P1, abridged):** implement `src/sdui/core/` only, eight files to a per-file behavioural
contract, including:

> `predicate.ts` — visibleIf with ONLY: eq neq gt lt gte lte in exists and or not. Unknown
> operator → node hidden + warn. No eval, no new Function, no JsonLogic dependency.

**What came back:** eight core files, 56 tests, `tsc` clean. The proposed signature was
`evaluatePredicate(predicate: Predicate | undefined, ctx)` — properly typed, exactly what a
reviewer would want to see.

**What I rejected, and why.** I made it `evaluatePredicate(predicate: unknown, ctx)`. Weaker
type, deliberately. `schema.ts` parses `visibleIf` as `z.unknown()` — it does *not* validate the
operator grammar — so `predicate.ts` is the real enforcement boundary for the closed operator set.
A function whose whole job is to be safe against a hostile payload shaped like `{eval: "…"}` must
not begin by assuming its input already has a trusted shape. TypeScript's guarantee stops at the
network boundary; the payload arrives as `unknown` and the type system cannot make it otherwise.

The comment is in the file so the next person doesn't "fix" it:

```ts
// Accepts `unknown`, not the `Predicate` type: visibleIf is server-controlled and only
// structurally checked by schema.ts (SCHEMA.md §7). This function is the actual
// enforcement point for the closed operator set, so it must not trust its input's shape.
```

Two other rewrites from the same session: `SDUIComponentProps.style` went from `NodeStyle` to
`ResolvedStyle` and `children` from `SDUINode[]` to `ReactNode` — components can't consume raw
token strings or unrendered node arrays; `SDUINode.tsx` has to own resolving style and
pre-rendering children before it hands anything to a registered component.

---

### Story 2 — I told it to fail, and the failure was the deliverable

**Prompt (P8, verbatim on the constraint):**

> Using ONLY the manifest, write `payloads/pdp.json` for a Cars24 car detail page […]
>
> **CRITICAL: do not add or modify any component while writing this payload. If something is
> genuinely impossible, STOP and tell me what's missing and what the minimal generic addition
> would be — I'll decide. I need to know exactly where the schema breaks.**

This is the prompt the whole repo exists to survive. The temptation — for me and for the model —
is to add a component the moment a screen resists, which would make the screen work and the
*coverage claim* worthless.

**Outcome:** a 147-node product detail page with a gallery, an EMI calculator whose tenure chips
re-read `data.emiByTenure[state.tenure]`, an accordion FAQ, a price-breakup bottom sheet, a sticky
CTA bar and a similar-cars rail. **Zero components added.** Then a listing screen, same rules,
**zero added**. Together with home: three screens, 486 nodes, 91% of surfaces rendering from JSON
alone.

**What I rejected.** Two things broke while writing the PDP, and both times the model was in a
position to quietly fix them:

1. Bindings inside an `open_sheet` subtree were destroyed at dispatch. `resolveActionPayload` ran
   binding resolution over the *entire* action payload against a context holding only `{event}` —
   no `state`, no `data` — so a sheet could be interactive but never data-driven.
   `"Tenure {{state.tenure}} months"` rendered as `"Tenure  months"`.
2. A `sticky{edge:'bottom'}` CTA bar scrolled away with the content, because `sticky` rendered as
   an ordinary section inside the scroll container.

I made it **stop and report both, and write the failing behaviour into a test as an asserted
defect** rather than patch them mid-payload. That is the point: a coverage number produced by a
run in which the AI was allowed to fix whatever it hit is not a measurement of anything. The
number *before* the fixes was 81%, and 81% is what the second screen was actually worth. Both
figures are kept in COVERAGE.md, in that order.

Only afterwards, as a separate change, did I have them fixed — about 15 lines between them, no new
component, no new schema field. The tell that made the whole exercise worth it: **both defects
were in core plumbing, not in the component vocabulary.** Three screens' worth of unit tests had
walked past them. Writing a payload found them in ten minutes.

---

### Story 3 — the prompt was wrong, and the right outcome was refusing it

**Prompt (P7 item 3, verbatim):**

> Memoize node → element by id + resolved props hash.

I wrote that. It's wrong, and I'm glad it got pushed back on rather than implemented.

It is right for **leaf** nodes, and was already implemented that way in P3. It is unsound for
**containers**: a `rail{ text: "{{state.tab}}" }` has a *constant* props hash while its subtree
changes underneath it. Key a container's cached element on its own props hash and you serve a
stale subtree after every `set_state` — a silent, intermittent freeze, the worst class of bug to
find later.

**What was built instead:** memoization keyed on the inputs the whole subtree can see — node
identity plus the identities of `state`, `data`, `theme`, `registry` and `dispatch`, all already
stable by reference. Reference equality, which is also strictly cheaper than the `JSON.stringify`
the leaf memo does.

`src/sdui/tests/core/nodeMemo.test.tsx` fails under the version my prompt asked for. That test is
the artefact I'd point at: the disagreement is recorded in code, not in a chat log.

The measured result was **−23ms, inside the 33ms noise floor** — i.e. no effect at all, exactly as
predicted before measuring, because a cold start performs exactly one render and there is nothing
for a memo to hit. It shipped disabled, and both facts are in PERF.md.

---

## 4. The AI failure

**Where it led me wrong: a headline metric that said "nothing happened" when something very bad
had happened.**

P7 item 5 was image preloading — prefetch above-fold images, mark them `preload` in the payload,
`priority: 'high'` on the `expo-image` component. Implemented exactly as I specified it. Ten cold
starts, release build, real device. The reported median came back **+2.1%**: inside the noise
floor, no change, move on. Written up that way, it would have been a perfectly respectable "tried
it, didn't help" row in the table.

**What was actually happening.** I asked for the per-run distribution behind that median before
accepting it. **Six of ten runs never finished loading the above-fold images inside an 8-second
window.** Of the four that completed, two took 6.6s and 8.7s. p90 was **7.4× worse** than
baseline — 8668ms against 1166ms. The median was clean because the median is the fifth value and
five runs were fine.

**Root cause.** The prefetch was requesting the same twenty URLs that the mounted `<Image>`
components were already requesting. That doesn't warm a cache — it opens a second connection for
the same bytes and competes with the request whose result the user is actually waiting for.

**How I caught it:** by refusing to accept a median without the distribution behind it. Nothing
cleverer than that. The distribution was in `bench/results-p7.json` all along; the summary just
never looked at it.

**What I did about it.** A v2 (`opt5b`) with `priority: 'high'` and no prefetch: 10/10 runs
complete, p90 1261ms against v1's 8668ms. The regression is gone — and v2 is **also not a win**
(1102ms against a baseline of 1105ms), because `home.json` marks every above-fold image `preload`,
and a priority that everything shares is not a priority. Both are reported as such. Neither is in
the shipped build; v1 is kept behind its own flag so the regression stays reproducible.

I also established a **noise floor** after this: the baseline was re-measured at the end of the
session with the same APK and came back 33ms (3.3%) faster. That number is stated *before* the
results table, and it is what lets a reader see that four of the eight rows are drift, not wins.

### Two smaller ones, same shape

- **A CLI that doesn't exist.** The first `scripts/benchmark-p6.sh` called
  `flashlight measure --bundleId --duration --resultsFilePath`, written from documentation memory
  before a device was available. Those flags don't exist; `measure` is an interactive mode, not a
  scriptable one. Caught only by connecting the device and reading `--help`. The real command is
  `flashlight test`, with a different results schema (`{iterations:[{measures:[{fps,…}]}]}` — flat
  numeric `fps`, no `jsFps` field). I'd flagged in advance that this command was
  unverified-against-hardware and to treat a failure as the AI-failure story; it duly failed.
- **A benchmark that would have measured the same thing twice.** Gradle doesn't treat
  `EXPO_PUBLIC_*` as a bundle input, so building the second variant silently reused the first
  variant's JS bundle. Two different APKs, same payload, and the comparison would have come out as
  "no difference" — which is a *believable* answer, the dangerous kind. Caught before running the
  benchmark by making each APK log the variant it was built with and checking it on the device.

The pattern in all three: the failure mode isn't code that doesn't compile. It's a plausible
number.

---

## 5. Verification strategy

**The gate.** Nothing is accepted without `tsc --noEmit` clean, the full suite green, and — since
P8 — `npm run validate` clean. Currently **40 suites / 296 tests**, plus 8 payload validations.

**Prove it mechanically or don't claim it.** Where a claim can be a check, it is one:

- `grep -riE "car|emi|challan|fastag|tile" src/sdui/core/` → empty. The prime directive, as a
  command.
- `registry.manifest.json` is *generated* from the live registry, and there is no second list of
  components anywhere that could drift from it.
- "No component was added while writing the PDP" is a test, not a sentence:
  every type in `pdp.json` must resolve against `registry.list()`, **and** the set of types new to
  that screen must equal exactly `['accordion','car_card','rating','spacer','sticky']` — all
  pre-existing. If the second assertion ever emptied out, the proof would be weak (the screen
  would only be re-walking ground home already covered) and the test would say so.

**Assert defects; never describe them.** When something is known-broken, the test asserts the
broken output, so a silent fix fails the suite and has to be acknowledged. `home-unknown.json`
deliberately contains one unknown type with no fallback, so the validator has
`EXPECTED_ERRORS = {'home-unknown.json': 1}` and fails **in either direction** — if the fixture
stops producing its error, it has silently stopped testing anything.

**Test the tool before trusting the tool.** Before claiming `npm run validate` was a real CI gate,
I planted six defects in a throwaway payload — duplicate id, wrong prop type, unknown component
type, invalid enum, unknown `visibleIf` operator, raw hex in a token-only slot — confirmed all six
caught and the exit code was 1, then deleted the probe.

**Verify against hardware, don't assert from memory.** Does `console.log` survive a *release*
build? Don't reason about it — install the APK, launch it, grep logcat. (It does, in this build
config, which is a fact about this project and not about React Native.)

**Check raw data, not summaries.** All 120 benchmark runs are checked in. §4 is what happens when
you don't.

**Refuse unverifiable evidence.** `adb shell screencap` returned a byte-identical solid-black PNG
regardless of app state — even the OS-drawn status bar had zero pixel variation, which is the tell
that the capture path was broken rather than the app. Confirmed by counting unique colours across
all 2.5M pixels (exactly one) rather than eyeballing a thumbnail. The bug was then diagnosed from
the native theme and the render tree instead, and the screenshot was not presented as proof of
anything.

**Own it or delete it.** The narration test from the playbook, run after P1, P3 and P8. A smaller
system I can defend line by line beats a larger one I'm renting.
