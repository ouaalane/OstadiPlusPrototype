/**
 * Resolver hook so plain `node` can import the TypeScript sources of
 * `@ostadiplus/shared` (and any other extensionless TS import):
 *
 *  - relative specifiers without an extension try `.ts` then `/index.ts`;
 *  - JSON imports get the `type: json` attribute Node ESM requires.
 *
 * Node ≥ 23.6 strips the types natively; no dependencies involved.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[a-z]+$/i.test(specifier)
  ) {
    for (const suffix of ['.ts', '/index.ts']) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // try the next candidate
      }
    }
  }
  const result = await nextResolve(specifier, context);
  if (result.url.endsWith('.json')) {
    return { ...result, importAttributes: { type: 'json' } };
  }
  return result;
}
