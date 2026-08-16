/**
 * Test Tags for categorizing and filtering tests
 * Usage: test('Test name', { tag: [tags.SMOKE, tags.REGRESSION] }, async () => {...})
 */

export const tags = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
} as const

export type TagType = (typeof tags)[keyof typeof tags]
