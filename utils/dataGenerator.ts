const OPERATOR_PREFIX_LENGTH = 3

export interface GeneratedPhone {
  nationalDigits: string
  formatted: string
}

export function buildUniquePhone(mask: string): GeneratedPhone {
  const groups = mask.trim().split(/\s+/)
  const countryCode = groups[0]
  const nationalMask = groups.slice(1).join('')

  if (!countryCode.startsWith('+') || nationalMask.length <= OPERATOR_PREFIX_LENGTH) {
    throw new Error(`Unexpected phone mask: "${mask}"`)
  }

  const prefix = nationalMask.slice(0, OPERATOR_PREFIX_LENGTH)
  const tailLength = nationalMask.length - OPERATOR_PREFIX_LENGTH
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const tail = seed.slice(-tailLength)

  return {
    nationalDigits: `${prefix}${tail}`,
    formatted: `${countryCode}${prefix}${tail}`,
  }
}

export function buildUniqueEmail(domain: string): string {
  return `autotest.${Date.now()}@${domain}`
}
