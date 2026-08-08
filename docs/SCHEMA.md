# SDUI Schema Specification v1.1.0

> This document is the contract. The renderer implements this; this does not describe the renderer.
> If code and this document disagree, the code is wrong.
>
> **v1.1 changelog:** revised against the live Cars24 Android home screen (Aug 2026). Added `zstack` and `header`. Moved the `tile` composite decision from assumption to measurement. Added §13 section inventory.

---

## 1. Design principles

1. **The renderer knows nothing about cars.** No domain concept appears in the core. Domain lives in payloads.
2. **Composition over configuration.** A new screen's *structure* should be expressible by nesting existing primitives, not by adding a new component with 14 props.
3. **Failure is node-local.** A single bad node degrades itself. It never blanks, crashes, or blocks the page.
4. **The server can't do damage.** Styles reference tokens only; predicates use a closed operator set; no code is ever transmitted.
5. **Every node is addressable.** `id` powers memoization, analytics, action targeting, and debugging.
6. **Additive by default.** New props are optional with defaults. Breaking a prop means a new `typeVersion`.
7. **Composites are earned with data, not opinion.** See §4.3.

---

## 2. Envelope

```jsonc
{
  "schemaVersion": "1.1.0",
  "screenId": "home",
  "minClientSchemaVersion": "1.0.0",
  "theme":    { "tokens": { ... } },
  "data":     { ... },
  "state":    { ... },
  "analytics": { "screenName": "home", "context": { "city": "Bhilwara" } },
  "header":   Node,
  "sections": [ Node, ... ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `schemaVersion` | yes | Semver of *this spec* the payload was authored against. |
| `screenId` | yes | Stable screen key. Used for analytics and cache keys. |
| `minClientSchemaVersion` | no | If the client's supported version is lower, discard this payload and render the bundled last-known-good. Kill switch. |
| `theme.tokens` | yes | The only source of colour, spacing, radius and type. |
| `data` | no | Server truth. Read-only. Bindable as `{{data.*}}`. |
| `state` | no | Initial page-local state. Mutable by actions. Bindable as `{{state.*}}`. |
| `header` | no | A single `header` node pinned above `sections`. Separated because its collapse behaviour is scroll-linked and client-owned (§4.4). |
| `sections` | yes | Ordered list of root nodes. |

### Why `data` and `state` are separate
`data` is what the server knows (prices, EMI tables, inventory). `state` is what the user has done (selected tab, active chip). Actions may only write to `state`. This keeps the mutation surface tiny and makes re-render invalidation trivial: a `set_state` dirties exactly the nodes whose resolved bindings referenced that key.

---

## 3. Node

```jsonc
{
  "id": "home.usedCars.tabs",
  "type": "chip_group",
  "typeVersion": 1,
  "props": { "options": [...], "selected": "{{state.carListTab}}" },
  "style": { "paddingX": "space.lg", "background": "color.surfaceRaised" },
  "visibleIf": { "exists": ["{{data.carLists}}"] },
  "actions": { "onSelect": Action },
  "children": [ Node ],
  "fallback": Node
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Dotted, stable, unique within the payload. `screenId.section.element`. |
| `type` | yes | Registry key. |
| `typeVersion` | no, default `1` | Contract version of the component. |
| `props` | no | Validated by that component's Zod schema. Every optional prop has a `.default()`. |
| `style` | no | Token references only. See §5. |
| `visibleIf` | no | Predicate. Falsy → node and subtree not rendered. See §7. |
| `actions` | no | Map of event name → Action. Which events exist is per-component. |
| `children` | no | Only meaningful for container components. |
| `fallback` | no | Rendered in this node's place if `type@typeVersion` is unknown or props fail validation. |
| `deferred` | no, default `false` | Server's declaration that this node is below the fold. A client **may** hold it back until after first interaction. Only meaningful on section roots. |

**`deferred` is a hint, not an instruction.** A client that ignores it renders a correct page, just a slower one; a client that honours it must still render the node eventually, without user action. It exists because the fold is a fact the *server* knows (it authored the section order and heights) and the client does not. The alternative — a client constant like "render the first six sections eagerly" — would be the renderer holding an opinion about one specific screen, which §1.1 forbids. Added in v1.1.1; measured in `PERF.md` P7 item 2.

**Resolution order:** `visibleIf` → resolve bindings in `props`/`style` → registry lookup → props validation → render.
Failure after `visibleIf` routes to `fallback`, then to the dev placeholder, then to nothing.

---

## 4. Component registry

### 4.1 Layout primitives — structure, zero domain knowledge

| type | key props | events |
|---|---|---|
| `stack` | `direction` (`vertical`\|`horizontal`), `spacing`, `align`, `justify`, `wrap` | `onTap` |
| `zstack` | `align` (9-point), children layered in source order | `onTap` |
| `rail` | `spacing`, `snap`, `peek`, `contentInset`, `showsIndicator` | — |
| `grid` | `columns`, `gap`, `aspectRatio` | — |
| `sticky` | `edge` (`top`\|`bottom`), `elevation` | — |
| `spacer` | `size` | — |
| `divider` | `inset`, `thickness` | — |

`rail` and `grid` render `children` and must virtualize (FlashList).

**`zstack` exists because of the promo banners.** The Spotify, CrashFree India and 30-day-return cards are a full-bleed image with a headline, body and CTA layered on top. Without an overlay primitive, every such banner is either a flat baked image (no localisable text, no separately-tappable CTA) or a new composite. `zstack` makes all of them `zstack{ image, stack{ text, text, button } }` — JSON only, forever. This gap was found by auditing the real screen, not by designing in the abstract.

**A photo-backed banner needs three layers, not two.** The shape above shipped first and was wrong: white copy sits directly on the photo, so whether it is readable depends on what the photo happens to look like, which the payload cannot know. The correct shape is `zstack{ image, stack(background: color.scrim), stack{ text, text, button } }` — the background image must also carry `style.width/height: "100%"`, because `align` positions *every* layer, including the one meant to be full-bleed. `npm run validate` fails any payload that layers text straight onto an image.

### 4.2 Atoms — content, zero domain knowledge

| type | key props | events |
|---|---|---|
| `text` | `value`, `variant`, `color`, `maxLines`, `align`, `opacity` | `onTap` |
| `image` | `url`, `aspectRatio`, `radius`, `contentMode`, `preload`, `placeholder` | `onTap` |
| `icon` | `name`, `size`, `color` | `onTap` |
| `button` | `label`, `variant`, `size`, `icon`, `iconPosition`, `fullWidth`, `enabled` | `onTap` |
| `chip_group` | `options[{label,value,icon}]`, `selected`, `scrollable`, `multi` | `onSelect` |
| `badge` | `label`, `tone`, `icon` | — |
| `input` | `placeholder`, `placeholderRotation[]`, `rotationMs`, `value`, `keyboard`, `readOnly` | `onChange`, `onTap` |
| `rating` | `value`, `max` | — |
| `accordion` | `title`, `expanded` (children = body) | `onToggle` |

`input.placeholderRotation` is why the Cars24 search bar cycles through "Search Baleno / Ertiga / Tata cars / FASTag". Modelled as data (an array plus an interval) rather than behaviour, so marketing can change the rotation from the server.

### 4.3 Composites — domain-aware, coverage tax

**Admission rule: ≥2 usages across ≥2 screens, *or* a measured perf win. "It feels cleaner" is not an admission criterion.**

| type | status | justification |
|---|---|---|
| `car_card` | **admitted** | Home "Used cars you'll love" rail, PDP "similar cars", listing page, wishlist. 4 usages. Also has conditional internal rows (EMI line vs "Price negotiable"; "Zero Worry" vs "Zero Worry Max") that would need `visibleIf` on ~6 sibling nodes to express primitively. |
| `banner_carousel` | **admitted** | Auto-advance timer plus page dots is stateful behaviour a `rail` cannot express declaratively. |
| `tile` | **pending measurement** | See below. Decision deferred to `PERF.md`. |

#### The `tile` decision — deliberately unresolved until measured

Five home sections (Buy car, Sell your car, Car check services, Manage your vehicle, Get loans) are the same structural pattern: an illustration, a label, a background, a tap action — differing only in container (`rail` vs `grid`), token set, and image position. Roughly 30 tiles on the home screen.

- **As composition:** `stack{ image, text }` inside a `rail`/`grid` ≈ 6 nodes per tile ≈ 180 nodes. Maximum coverage — a new screen's tile grid is pure JSON, in any skin.
- **As a `tile` composite:** 1 node per tile ≈ 30 nodes. Fewer render passes, but every unanticipated tile variant becomes a client change.

Both will be built and benchmarked (scroll jank + TTR). **If composition costs less than ~10% on both metrics, it wins and `tile` is never admitted** — coverage is worth more than a small constant. If it is materially worse, `tile` is admitted and the cost is recorded honestly in `COVERAGE.md`. Either way the number goes in `PERF.md`.

This is the schema's most consequential open decision and it is being made with numbers.

### 4.4 `header` — a declared client-owned boundary

The Cars24 header is a search field plus a four-item nav row that transitions from circular-icon tiles to a text-only tab bar as the page scrolls, then pins.

**Modelled as SDUI:** the search placeholder rotation, the four nav items (label, icon, action), selected index, location label and its action, profile action, colours.
**Client-owned:** the scroll-linked collapse animation itself.

Scroll-position-driven interpolation is per-frame UI-thread work. Expressing it declaratively means shipping an animation DSL, which is explicitly out of scope (§11). The server controls *what is in* the header; the client controls *how it collapses*. Changing the nav items, labels, icons, order or actions is a JSON change. Changing the collapse curve is a release.

This is a real limitation of the system and it is stated here rather than discovered in the debrief.

---

## 5. Theme and style

```jsonc
"theme": {
  "tokens": {
    "color":  { "brand": "#3B24C4", "brandSurface": "#4A32E0", "bg": "#FFFFFF",
                "surfaceRaised": "#F5F6F8", "tileBlue": "#123FA8", "tileGreen": "#1F6A4A",
                "tileCream": "#FBF3E4", "textPrimary": "#101828", "textOnBrand": "#FFFFFF",
                "textMuted": "#667085", "accent": "#3B24C4", "danger": "#E03131",
                "success": "#12B76A", "border": "#EAECF0",
                "scrim": "rgba(16,24,40,0.55)" },
    "space":  { "xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 24 },
    "radius": { "sm": 6, "md": 12, "lg": 16, "pill": 999 },
    "type":   { "h1": {"size":24,"weight":"600"}, "h2": {"size":20,"weight":"600"},
                "body": {"size":14,"weight":"400"}, "caption": {"size":12,"weight":"400"},
                "ghost": {"size":72,"weight":"700"} }
  }
}
```

`style` accepts `padding|paddingX|paddingY|margin|marginX|marginY` (→ `space.*`), `background|borderColor` (→ `color.*`), `radius` (→ `radius.*`), `borderWidth`, `opacity`, `flex`, `width`, `height`.

**Values must be token references.** `"background": "color.tileBlue"` is valid; `"background": "#123FA8"` is rejected at validation and the prop falls back to its default.

**Why:** the server physically cannot ship an off-brand or inaccessible screen, dark mode is a token swap, and a buggy or compromised CMS cannot produce white-on-white text. This is a security and brand-safety property, not a styling convenience.

---

## 6. Bindings

Resolved against `{ state, data, event }`:

- **Interpolation** — `"EMI ₹{{data.cars.c_889.emi}}/m*"` → string substitution.
- **Whole-value** — `"items": "{{data.carLists[state.carListTab]}}"` → resolved value keeps its type (arrays stay arrays).
- **Event** — `"$event.value"`, valid only inside an action payload, resolved at dispatch time.

**Missing path is never fatal.** Resolution returns the prop's schema default and logs a warning to the debug overlay. A partially-broken payload should still render a mostly-correct page.

Paths are dot/bracket and may nest a state read inside a data read: `data.carLists[state.carListTab]`. That single expression is what makes the Wishlisted / Hot deals tab switch a zero-network, zero-code interaction.

---

## 7. `visibleIf`

A closed grammar. **There is no expression evaluator, and there must never be one.**

```jsonc
{ "eq":  ["{{state.carListTab}}", "wishlisted"] }
{ "neq": ["{{data.car.priceNegotiable}}", true] }
{ "gt":  ["{{data.dealCount}}", 0] }
{ "in":  ["{{state.city}}", ["Bhilwara", "Delhi NCR", "Mumbai"]] }
{ "exists": ["{{data.banner}}"] }
{ "and": [ {...}, {...} ] }   { "or": [ {...}, {...} ] }   { "not": { ... } }
```

Operators: `eq neq gt lt gte lte in exists and or not`. Nothing else. Unknown operator → node hidden, warning logged.

**Rationale:** a general expression evaluator (`eval`, `new Function`, or a full JsonLogic port) lets the server execute arbitrary code on device — a remote code execution surface reachable by anyone who can write to the CMS or MITM the payload. A closed operator set covers every conditional this product actually needs and cannot execute anything. Explicitly rejected during design.

---

## 8. Actions

Actions are data. They are dispatched to a reducer; components never perform side effects.

```jsonc
{ "type": "set_state",  "payload": { "key": "carListTab", "value": "$event.value" } }
{ "type": "navigate",   "payload": { "route": "pdp", "params": { "carId": "c_889" } } }
{ "type": "open_sheet", "payload": { "title": "Price breakup", "node": { /* SDUI subtree */ } } }
{ "type": "open_url",   "payload": { "url": "https://..." } }
{ "type": "sequence",   "payload": { "actions": [ {...}, {...} ] } }
{ "type": "track",      "payload": { "event": "car_list_tab_changed", "props": { ... } } }
{ "type": "refresh",    "payload": { "endpoint": "/section/deals", "targetId": "home.deals" } }
```

- Unknown `type` → no-op, warning logged, **never a crash**. This is the action-level equivalent of unknown-component fallback and is what lets an old client survive a payload built for a newer one.
- `set_state` is the only writer to `state`.
- `sequence` runs in order; a failing member does not abort the rest.

### `open_sheet` is the important one
The sheet's content is an SDUI node rendered by the same renderer. There is no `PriceBreakupSheet` component anywhere in the codebase. Consequence: **every future sheet, modal, tooltip and dialog on any screen is a JSON change.**

---

## 9. Error semantics

| Condition | Behaviour |
|---|---|
| Unknown `type` | render `fallback` → else dev placeholder → else nothing. Log. |
| Known type, unknown `typeVersion` | render highest known version with the props it understands. Log. |
| Props fail validation | apply defaults for failing props; if a *required* prop fails, route to `fallback`. Log. |
| Unknown style token | drop that style prop, keep the rest. Log. |
| Binding path missing | prop default. Log. |
| Unknown `visibleIf` operator | node hidden. Log. |
| Unknown action `type` | no-op. Log. |
| Component throws at render | error boundary catches, renders `fallback`. Page keeps scrolling. |
| Malformed payload / invalid envelope | render bundled last-known-good payload. |
| `minClientSchemaVersion` > client version | render bundled last-known-good payload. |

All logs surface in a dev-only debug overlay listing every degradation in the last render.

---

## 10. Versioning

1. **Client advertises capability.** `X-SDUI-Schema: 1.1.0` plus a registry manifest hash. The server may tailor payloads but is not required to.
2. **Inline `fallback` is the primary mechanism.** The server sends `video_banner` with `fallback: { type: "zstack", children: [image, ...] }`. New clients get video, old clients get the layered banner, and the server sends one payload to everyone. No server-side version branching.
3. **Additive-only props.** Adding an optional prop with a default is always safe. Removing or retyping requires a new `typeVersion`.
4. **`typeVersion` coexists.** `car_card@1` and `car_card@2` both registered during migration.
5. **Unknown enum values** resolve to the prop's schema default rather than failing the node.
6. **Bundled last-known-good payload** is the floor. It doubles as the cold-start cache and the offline story. One mechanism, three benefits.

---

## 11. Non-goals for v1 (deliberate cuts)

| Cut | Why | Cost if we need it |
|---|---|---|
| Animation/transition DSL | Large surface area; not needed to prove the thesis. Forces the §4.4 header boundary. | Additive `animate` block on Node. |
| Scroll-linked / collapsing behaviour | Per-frame UI-thread work; declarative expression is a research project. | Client release. |
| Server-driven navigation graph | Routes stay client-owned; `navigate` carries an intent, not a screen definition. | Deep-link table update. |
| A/B / personalisation engine | Out of scope for a renderer. `variantKey` hook exists on the envelope, unused. | Server-side only. |
| Client-side formula evaluation (EMI maths) | Server sends `data.emiByTenure` as a lookup table. Keeps the client dumb and the maths auditable in one place. | A tiny closed numeric grammar — the one place I'd accept one. |
| Full offline sync | Last-known-good payload only. | — |

---

## 12. Open questions
- Does `zstack` need explicit z-index, or is source order sufficient? (Source order assumed.)
- Should `grid` support per-child span for feature rows, or is a nested `stack` enough?
- `refresh`: optimistic placeholder nodes, or is a `skeleton` prop on the target enough?
- Is `tile` admitted? — resolved by measurement, §4.3.

---

## 13. Appendix — Cars24 home screen inventory

Audited against the live Android app (Bhilwara, Aug 2026). 13 SDUI sections plus a header. The brief requires ≥5 distinct section types, ≥1 rail, ≥1 grid, ≥1 SDUI-driven interaction.

| # | Section | Node composition | Notes |
|---|---|---|---|
| — | **Header** | `header` | Location + chevron, avatar, rotating-placeholder search, 4-item nav. Collapse client-owned (§4.4). |
| 1 | Buy car | `stack{ stack{text, badge}, rail{ tile… } }` | Header carries a `badge` ("Up to ₹80,000 off"). Blue tiles, image bottom-right. |
| 2 | Sell your car | `stack{ text, rail{ tile… } }` | Same as #1, green tokens. **Proof the pattern generalises.** |
| 3 | Get loans | `stack{ text, rail{ stack{ image(circle), text } } }` | Same pattern, label *below* a circular image. Skin-only difference. |
| 4 | Car check services | `stack{ text, grid(columns:3){ tile… } }` | **The required grid.** Cream tokens. |
| 5 | Used cars you'll love | `stack{ stack{text, text(link)}, chip_group, rail{ car_card… } }` | **The required interaction.** Chips → `set_state` → rail items rebind. |
| 6 | Manage your vehicle | `stack{ stack{text, text(link)}, grid(columns:3){ tile… } }` | Section has its own brand background — full-bleed `style.background`. |
| 7 | Spotify promo | `zstack{ image, stack{ image(logo), text, text, button } }` | Needs `zstack`. |
| 8 | Trending new cars | `stack{ stack{text, text(link)}, rail{ zstack{ text(ghost numeral), stack{text,text,image} } } }` | Ranked. Ghost numeral is `text` + `type.ghost` + `opacity`. |
| 9 | Let us find your match | `stack{ stack(horizontal){ image, stack{badge, text, text} }, divider, stack(horizontal){ text, icon } }` | Pure primitives. |
| 10 | Promo rail (30-day return) | `rail(peek){ zstack… }` or `banner_carousel` | Peeking neighbours. |
| 11 | CrashFree India | `zstack{ image, stack{ text, text, text, button } }` | Single full-width. |
| 12 | Footer | `stack{ text, text }` | Full-bleed brand background. |
| — | Bottom tab bar | *not SDUI* | App-level navigation, client-owned. Declared. |

**Section-header pattern.** Items 1, 5, 6, 8, 10 share a title + optional badge + optional right-aligned action link. Composed from `stack(horizontal, justify:space-between){ stack(horizontal){ text, badge }, text }`. Five usages and it stays composition — no `section_header` composite. That restraint is the point.

**Coverage claim to verify empirically after `pdp.json`:** every section above except the header is expressible in JSON given the §4.1/§4.2 registry plus `car_card`. The header is the one declared client-owned boundary on this screen.
