import { describe, expect, it } from 'vitest'

// Toolchain smoke test only. Real business-logic tests arrive with M2.
describe('test toolchain', () => {
  it('runs TypeScript unit tests', () => {
    const sum = (a: number, b: number): number => a + b
    expect(sum(1, 2)).toBe(3)
  })
})
