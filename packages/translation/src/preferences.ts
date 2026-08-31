export type TranslationTone = 'natural' | 'casual' | 'professional'
export type TranslationLength = 'natural' | 'short' | 'detailed'

export interface TranslationStyle {
  tone: TranslationTone
  length: TranslationLength
  avoidTooFormal: boolean
  avoidLiteral: boolean
  avoidExcessivePunctuation: boolean
}

export const defaultTranslationStyle: TranslationStyle = {
  tone: 'natural',
  length: 'natural',
  avoidTooFormal: true,
  avoidLiteral: true,
  avoidExcessivePunctuation: true,
}

export interface DictionaryEntry {
  source: string
  target: string
}

/** Builds provider-neutral context for personal style and translation memory. */
export function buildTranslationContext(style: TranslationStyle, dictionary: DictionaryEntry[]): string[] {
  const context = [
    `Tone: ${style.tone}`,
    `Length: ${style.length}`,
    `Avoid too formal: ${style.avoidTooFormal ? 'yes' : 'no'}`,
    `Avoid literal translation: ${style.avoidLiteral ? 'yes' : 'no'}`,
    `Avoid excessive punctuation: ${style.avoidExcessivePunctuation ? 'yes' : 'no'}`,
  ]

  if (dictionary.length > 0) {
    context.push('Personal dictionary:')
    dictionary.forEach((entry) => context.push(`${entry.source} => ${entry.target}`))
  }

  return context
}
