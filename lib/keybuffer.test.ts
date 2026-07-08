import { describe, expect, it } from 'vitest'
import { createKeyBuffer, isEditableTarget, type KeyBufferEvent } from './keybuffer'

const makeEvent = (key: string, overrides?: Partial<KeyBufferEvent>): KeyBufferEvent => ({
  key,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  timeStamp: 0,
  ...overrides,
})

describe('createKeyBuffer', () => {
  it('returns true only when the full target typed sequentially', () => {
    const buffer = createKeyBuffer('abc')

    expect(buffer.push(makeEvent('a', { timeStamp: 1 }))).toBe(false)
    expect(buffer.push(makeEvent('b', { timeStamp: 2 }))).toBe(false)
    expect(buffer.push(makeEvent('c', { timeStamp: 3 }))).toBe(true)
    expect(buffer.push(makeEvent('a', { timeStamp: 4 }))).toBe(false)
  })

  it('does not emit match when only a prefix appears', () => {
    const buffer = createKeyBuffer('abc')

    expect(buffer.push(makeEvent('a', { timeStamp: 0 }))).toBe(false)
    expect(buffer.push(makeEvent('b', { timeStamp: 10 }))).toBe(false)
    expect(buffer.push(makeEvent('x', { timeStamp: 20 }))).toBe(false)
  })

  it('rolls the rolling buffer when extra keys arrive', () => {
    const buffer = createKeyBuffer('bcd')

    buffer.push(makeEvent('a', { timeStamp: 0 }))
    buffer.push(makeEvent('b', { timeStamp: 5 }))
    buffer.push(makeEvent('c', { timeStamp: 10 }))

    expect(buffer.push(makeEvent('d', { timeStamp: 15 }))).toBe(true)
  })

  it('resets stored keys when idle threshold exceeded', () => {
    const buffer = createKeyBuffer('abc', 100)

    buffer.push(makeEvent('a', { timeStamp: 0 }))
    buffer.push(makeEvent('b', { timeStamp: 50 }))

    expect(buffer.push(makeEvent('c', { timeStamp: 200 }))).toBe(false)
    expect(buffer.push(makeEvent('a', { timeStamp: 210 }))).toBe(false)
    expect(buffer.push(makeEvent('b', { timeStamp: 220 }))).toBe(false)
    expect(buffer.push(makeEvent('c', { timeStamp: 230 }))).toBe(true)
  })

  it('ignores non-printable keys such as Shift, Enter, or Process', () => {
    const buffer = createKeyBuffer('a')

    expect(buffer.push(makeEvent('Shift', { timeStamp: 0 }))).toBe(false)
    expect(buffer.push(makeEvent('Enter', { timeStamp: 10 }))).toBe(false)
    expect(buffer.push(makeEvent('Process', { timeStamp: 20 }))).toBe(false)
    expect(buffer.push(makeEvent('a', { timeStamp: 30 }))).toBe(true)
  })

  it('rejects composing input events', () => {
    const buffer = createKeyBuffer('x')

    expect(buffer.push(makeEvent('x', { isComposing: true, timeStamp: 0 }))).toBe(false)
    expect(buffer.push(makeEvent('x', { timeStamp: 10 }))).toBe(true)
  })

  it('ignores input when modifier keys are held', () => {
    const buffer = createKeyBuffer('x')

    expect(buffer.push(makeEvent('x', { ctrlKey: true, timeStamp: 0 }))).toBe(false)
    expect(buffer.push(makeEvent('x', { timeStamp: 5 }))).toBe(true)
  })

  it('supports targets with spaces such as sudo rm -rf /', () => {
    const target = 'sudo rm -rf /'
    const buffer = createKeyBuffer(target)

    target.split('').forEach((char, index) => {
      const result = buffer.push(makeEvent(char, { timeStamp: index }))
      if (index === target.length - 1) {
        expect(result).toBe(true)
      } else {
        expect(result).toBe(false)
      }
    })
  })
})

const createStubElement = (closestResult: Element | null): Element =>
  ({
    closest: (_selector: string) => closestResult,
  }) as Element

describe('isEditableTarget', () => {
  it('returns true when the closest editable selector exists (input)', () => {
    const stub = createStubElement({} as Element)
    expect(isEditableTarget(stub)).toBe(true)
  })

  it('returns true for textarea matches', () => {
    const stub = createStubElement({} as Element)
    expect(isEditableTarget(stub)).toBe(true)
  })

  it('returns false when no editable ancestor is found (div)', () => {
    const stub = createStubElement(null)
    expect(isEditableTarget(stub)).toBe(false)
  })

  it('returns false for null elements', () => {
    expect(isEditableTarget(null)).toBe(false)
  })
})
