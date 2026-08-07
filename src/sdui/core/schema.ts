import { z } from 'zod';
import type { Payload, SDUINode } from './types';

const nodeStyleSchema = z.object({
  padding: z.string().optional(),
  paddingX: z.string().optional(),
  paddingY: z.string().optional(),
  margin: z.string().optional(),
  marginX: z.string().optional(),
  marginY: z.string().optional(),
  background: z.string().optional(),
  borderColor: z.string().optional(),
  radius: z.string().optional(),
  borderWidth: z.number().optional(),
  opacity: z.number().optional(),
  flex: z.number().optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
});

// `type` is validated as a string, not the Action literal union: an unknown action
// type must still parse successfully so it can no-op at dispatch (SCHEMA.md §8/§10.1),
// not fail node validation and blank the section.
const actionSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

const nodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    typeVersion: z.number().int().positive().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    style: nodeStyleSchema.optional(),
    // visibleIf's operator grammar is enforced by predicate.ts at evaluation time,
    // not here — an unrecognised operator hides the node, it doesn't fail parsing.
    visibleIf: z.unknown().optional(),
    actions: z.record(z.string(), actionSchema).optional(),
    children: z.array(nodeSchema).optional(),
    fallback: nodeSchema.optional(),
    // Additive and optional, so every existing payload stays valid unchanged (SCHEMA.md §10.3).
    deferred: z.boolean().optional(),
  })
);

const themeTokensSchema = z.object({
  color: z.record(z.string(), z.string()),
  space: z.record(z.string(), z.number()),
  radius: z.record(z.string(), z.number()),
  type: z.record(z.string(), z.object({ size: z.number(), weight: z.string() })),
});

const payloadSchema = z.object({
  schemaVersion: z.string(),
  screenId: z.string(),
  minClientSchemaVersion: z.string().optional(),
  theme: z.object({ tokens: themeTokensSchema }),
  data: z.record(z.string(), z.unknown()).optional(),
  state: z.record(z.string(), z.unknown()).optional(),
  analytics: z
    .object({ screenName: z.string(), context: z.record(z.string(), z.unknown()).optional() })
    .optional(),
  header: nodeSchema.optional(),
  sections: z.array(nodeSchema),
});

export type ParseResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

export function parseNode(input: unknown): ParseResult<SDUINode> {
  const result = nodeSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data as SDUINode };
  return { success: false, error: result.error };
}

export function parsePayload(input: unknown): ParseResult<Payload> {
  const result = payloadSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data as Payload };
  return { success: false, error: result.error };
}
