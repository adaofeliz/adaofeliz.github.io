export function getRoadmapAuthToken(dateKey: string): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  let seed = 0
  for (const char of dateKey) {
    seed = (seed * 131 + char.charCodeAt(0)) >>> 0
  }
  let token = ''
  for (let i = 0; i < 6; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    token += alphabet[seed % alphabet.length]
  }
  return token
}
