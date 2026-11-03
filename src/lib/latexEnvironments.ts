export const LATEX_ENVIRONMENTS = [
  'none',
  'eqnarray',
  'align',
  'aligned',
  'gathered',
  'cases',
  'split',
  'array',
] as const

export type LatexEnvironment = (typeof LATEX_ENVIRONMENTS)[number]