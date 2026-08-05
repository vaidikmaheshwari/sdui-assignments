import { registry } from '../core/registry';

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

export { registry };
