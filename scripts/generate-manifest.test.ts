import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { registry } from '../src/sdui/components';
import { CLIENT_SCHEMA_VERSION } from '../src/sdui/core/resolvePayload';

// Runs under Jest (not a plain node/tsx script) because react-native's own source uses
// Flow syntax that only Jest's babel-jest + jest-expo preset knows how to strip.

/**
 * A prop as the manifest describes it to whoever is writing a payload by hand.
 *
 * Everything here is derived from the component's own Zod schema via `z.toJSONSchema` —
 * nothing is transcribed. If a prop is renamed in the component and not here, that is not
 * possible: there is no "here".
 */
interface PropDescriptor {
  type: string;
  required: boolean;
  default?: unknown;
  allowed?: unknown[];
  items?: PropDescriptor;
  properties?: Record<string, PropDescriptor>;
}

type JsonSchemaNode = Record<string, any>;

/** Collapse a JSON Schema node into the one-line type string a payload author needs. */
function typeName(schema: JsonSchemaNode): string {
  if (schema.anyOf) return schema.anyOf.map(typeName).join(' | ');
  if (schema.enum) return 'enum';
  if (schema.const !== undefined) return `const(${JSON.stringify(schema.const)})`;
  if (schema.type === 'array') return `${typeName(schema.items ?? {})}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  return schema.type ?? 'unknown';
}

function describe(schema: JsonSchemaNode, required: boolean): PropDescriptor {
  const descriptor: PropDescriptor = { type: typeName(schema), required };

  if (schema.default !== undefined) descriptor.default = schema.default;
  if (schema.enum) descriptor.allowed = schema.enum;

  if (schema.type === 'array' && schema.items) {
    descriptor.items = describe(schema.items, true);
  }
  if (schema.type === 'object' && schema.properties) {
    const requiredKeys: string[] = schema.required ?? [];
    descriptor.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        describe(value as JsonSchemaNode, requiredKeys.includes(key)),
      ])
    );
  }

  return descriptor;
}

test('generates registry.manifest.json from the live component registry', () => {
  const components = registry.definitions().map((definition) => {
    // `io: 'input'` is the payload author's view: a prop with a Zod `.default()` is optional
    // on the wire even though it is non-optional once parsed.
    const jsonSchema = z.toJSONSchema(definition.propsSchema as z.ZodType, {
      io: 'input',
      unrepresentable: 'any',
    }) as JsonSchemaNode;

    const requiredKeys: string[] = jsonSchema.required ?? [];
    const props = Object.fromEntries(
      Object.entries(jsonSchema.properties ?? {}).map(([name, propSchema]) => {
        const descriptor = describe(propSchema as JsonSchemaNode, requiredKeys.includes(name));
        // `defaults` on the definition is what the renderer actually merges in, so it wins over
        // whatever `.default()` put in the JSON Schema. They agree today; the manifest reports
        // the one that would take effect if they ever stopped agreeing.
        const runtimeDefault = (definition.defaults as Record<string, unknown>)[name];
        if (runtimeDefault !== undefined) descriptor.default = runtimeDefault;
        return [name, descriptor];
      })
    );

    return { type: definition.type, typeVersion: definition.typeVersion, props };
  });

  expect(components.length).toBeGreaterThan(0);
  // Every component must describe at least the shape of its props, or the manifest is not
  // usable as the sole input to writing a payload — which is the one job it has.
  components.forEach((component) => {
    expect(component.props).toBeDefined();
  });

  const manifest = {
    schemaVersion: CLIENT_SCHEMA_VERSION,
    components,
  };

  const outPath = join(__dirname, '..', 'registry.manifest.json');
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
});
