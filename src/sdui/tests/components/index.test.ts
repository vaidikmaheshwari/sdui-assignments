import { registry } from '../../components';

describe('components/index', () => {
  test('registers every layout primitive and atom exactly once, at typeVersion 1', () => {
    expect(registry.list()).toEqual([
      { type: 'accordion', typeVersion: 1 },
      { type: 'badge', typeVersion: 1 },
      { type: 'button', typeVersion: 1 },
      { type: 'chip_group', typeVersion: 1 },
      { type: 'divider', typeVersion: 1 },
      { type: 'grid', typeVersion: 1 },
      { type: 'icon', typeVersion: 1 },
      { type: 'image', typeVersion: 1 },
      { type: 'input', typeVersion: 1 },
      { type: 'rail', typeVersion: 1 },
      { type: 'rating', typeVersion: 1 },
      { type: 'spacer', typeVersion: 1 },
      { type: 'stack', typeVersion: 1 },
      { type: 'sticky', typeVersion: 1 },
      { type: 'text', typeVersion: 1 },
      { type: 'tile', typeVersion: 1 },
      { type: 'zstack', typeVersion: 1 },
    ]);
  });
});
