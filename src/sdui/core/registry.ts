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
    const entries: Array<{ type: string; typeVersion: number }> = [];
    for (const [type, versions] of this.versionsByType) {
      for (const typeVersion of versions.keys()) {
        entries.push({ type, typeVersion });
      }
    }
    return entries.sort((a, b) => a.type.localeCompare(b.type) || a.typeVersion - b.typeVersion);
  }
}

export const registry = new ComponentRegistry();
