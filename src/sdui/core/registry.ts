import type { ComponentDefinition } from './types';
import { warn } from '../utils/devLog';

export class ComponentRegistry {
  private versionsByType = new Map<string, Map<number, ComponentDefinition<any>>>();

  register<P>(definition: ComponentDefinition<P>): void {
    if (!this.versionsByType.has(definition.type)) {
      this.versionsByType.set(definition.type, new Map());
    }
    this.versionsByType.get(definition.type)!.set(definition.typeVersion, definition);
  }

  resolve(type: string, typeVersion = 1): ComponentDefinition | undefined {
    const versions = this.versionsByType.get(type);
    if (!versions) {
      warn('registry', `unknown component type "${type}"`);
      return undefined;
    }

    const exact = versions.get(typeVersion);
    if (exact) return exact;

    const highestVersion = Math.max(...versions.keys());
    warn(
      'registry',
      `unknown typeVersion ${typeVersion} for "${type}", falling back to highest known version ${highestVersion}`
    );
    return versions.get(highestVersion);
  }

  has(type: string): boolean {
    return this.versionsByType.has(type);
  }

  list(): Array<{ type: string; typeVersion: number }> {
    return this.definitions().map(({ type, typeVersion }) => ({ type, typeVersion }));
  }

  /**
   * Every registration, in manifest order (type asc, then typeVersion asc).
   *
   * Read-only tooling access. `registry.manifest.json` and `npm run validate` are both
   * generated from this, which is what makes "the manifest is generated, never hand-edited"
   * (CLAUDE.md rule 12) enforceable rather than aspirational: there is no second list of
   * components anywhere that could drift from this one.
   */
  definitions(): ComponentDefinition<any>[] {
    const entries: ComponentDefinition<any>[] = [];
    for (const versions of this.versionsByType.values()) {
      for (const definition of versions.values()) entries.push(definition);
    }
    return entries.sort(
      (a, b) => a.type.localeCompare(b.type) || a.typeVersion - b.typeVersion
    );
  }
}

export const registry = new ComponentRegistry();
