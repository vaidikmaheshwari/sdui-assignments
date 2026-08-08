import { registry } from '../core/registry';

/**
 * The registry — every type a payload is allowed to name, and nothing else.
 *
 * `./chrome/` is deliberately absent. `CollapsingHeader` and `DebugOverlay` are React components
 * that live under `components/` for filing convenience, but they carry no `type`, no
 * `typeVersion` and no `propsSchema`, and `SDUIScreen` mounts them directly. A payload cannot
 * reach them, and `CollapsingHeader` in particular must not become reachable: it is the declared
 * client-owned boundary (SCHEMA.md §4.4), where the header's *content* is SDUI but its
 * scroll-linked collapse is native. Registering it would be the first step toward an animation
 * DSL, which SCHEMA §11 cuts on purpose.
 *
 * `registry.manifest.json` is generated from `registry.list()`, not from this directory, so the
 * manifest stays correct either way — this comment exists so the next person reading
 * `components/` does not conclude that everything under it is addressable from JSON.
 */

import { stack } from './layout/stack';
import { spacer } from './layout/spacer';
import { divider } from './layout/divider';
import { zstack } from './layout/zstack';
import { sticky } from './layout/sticky';
import { rail } from './layout/rail';
import { grid } from './layout/grid';

import { text } from './atoms/text';
import { icon } from './atoms/icon';
import { badge } from './atoms/badge';
import { image } from './atoms/image';
import { button } from './atoms/button';
import { rating } from './atoms/rating';
import { chip_group } from './atoms/chip_group';
import { input } from './atoms/input';
import { accordion } from './atoms/accordion';

import { tile } from './composites/tile';
import { car_card, car_card_v2 } from './composites/car_card';

registry.register(stack);
registry.register(spacer);
registry.register(divider);
registry.register(zstack);
registry.register(sticky);
registry.register(rail);
registry.register(grid);
registry.register(text);
registry.register(icon);
registry.register(badge);
registry.register(image);
registry.register(button);
registry.register(rating);
registry.register(chip_group);
registry.register(input);
registry.register(accordion);
registry.register(tile);
registry.register(car_card);
registry.register(car_card_v2);

export { registry };
