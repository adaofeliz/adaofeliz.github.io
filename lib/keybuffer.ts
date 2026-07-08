export type KeyBufferEvent = {
  key: string
  isComposing: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  timeStamp: number
}

export function createKeyBuffer(target: string, idleMs = 2000) {
  const buffer: string[] = []
  const targetLength = target.length
  let lastAcceptedTimeStamp: number | undefined

  const resetBuffer = () => {
    buffer.length = 0
  }

  const push = (event: KeyBufferEvent): boolean => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
      return false
    }

    if (event.key.length !== 1) {
      return false
    }

    if (lastAcceptedTimeStamp !== undefined && event.timeStamp - lastAcceptedTimeStamp > idleMs) {
      resetBuffer()
    }

    if (buffer.length === targetLength) {
      buffer.shift()
    }

    buffer.push(event.key)
    lastAcceptedTimeStamp = event.timeStamp

    if (buffer.join('') === target) {
      resetBuffer()
      lastAcceptedTimeStamp = undefined
      return true
    }

    return false
  }

  return { push }
}

export function isEditableTarget(el: Element | null): boolean {
  return Boolean(
    el?.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'
    )
  )
}
