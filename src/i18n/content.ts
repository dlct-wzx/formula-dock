import type { FormulaCategory, FormulaTemplate } from '../data/formulaTemplates'
import type { QuickToolCategory, QuickToolItem } from '../data/quickTools'
import { translate, type UiLocale, type MessageKey } from './messages'

const formulaCategoryEn: Record<string, { title: string; description: string }> = {
  algebra: { title: 'Algebra', description: 'Equations, factoring, and identities' },
  geometry: { title: 'Geometry', description: 'Analytic and spatial geometry' },
  inequality: { title: 'Inequalities', description: 'Classical inequalities and estimates' },
  calculus: { title: 'Calculus', description: 'Integrals, derivatives, and limits' },
  matrix: { title: 'Matrices', description: 'Linear algebra and matrix operations' },
  trigonometry: { title: 'Trigonometry', description: 'Identities and triangle formulas' },
  statistics: { title: 'Statistics', description: 'Probability distributions and estimators' },
  sequence: { title: 'Sequences', description: 'Terms, sums, and recurrences' },
  physics: { title: 'Physics', description: 'Classical and modern physics formulas' },
  chemistry: { title: 'Chemistry', description: 'Thermodynamics, equilibrium, and kinetics' },
}

const formulaTemplateEn: Record<string, { title: string; description: string }> = {
  'algebra-quadratic': { title: 'Quadratic formula', description: 'Roots of ax² + bx + c = 0.' },
  'algebra-difference-squares': { title: 'Difference of squares', description: 'Factor a difference of two squares.' },
  'algebra-binomial': { title: 'Binomial theorem', description: 'Expansion of (a + b)ⁿ.' },
  'algebra-vieta': { title: "Vieta's formulas", description: 'Relations between roots and coefficients.' },
  'algebra-log-base': { title: 'Change of base', description: 'Convert logarithms between bases.' },
  'algebra-perfect-cube': { title: 'Perfect cube', description: 'Expansion of (a + b)³.' },
  'geometry-distance': { title: 'Distance between points', description: 'Distance formula in the plane.' },
  'geometry-line': { title: 'Point-slope line', description: 'Line through a point with a known slope.' },
  'geometry-circle': { title: 'Standard circle equation', description: 'Circle centered at (a,b) with radius r.' },
  'geometry-ellipse': { title: 'Standard ellipse equation', description: 'Ellipse centered at (h,k).' },
  'geometry-triangle-area': { title: 'Triangle area', description: 'Area from two sides and the included angle.' },
  'geometry-sphere': { title: 'Sphere volume', description: 'Volume of a sphere with radius r.' },
  'inequality-amgm': { title: 'AM–GM inequality', description: 'Arithmetic mean versus geometric mean.' },
  'inequality-cauchy': { title: 'Cauchy–Schwarz inequality', description: 'Two-dimensional Cauchy–Schwarz form.' },
  'inequality-triangle': { title: 'Absolute-value triangle inequality', description: 'Bound for the sum of two real numbers.' },
  'inequality-bernoulli': { title: "Bernoulli's inequality", description: 'Standard estimate for (1+x)ⁿ.' },
  'inequality-jensen': { title: "Jensen's inequality", description: 'Convexity inequality for weighted averages.' },
  'inequality-holder': { title: "Hölder's inequality", description: 'Discrete Hölder inequality for conjugate exponents.' },
  'calculus-power-rule': { title: 'Power-rule integral', description: 'Indefinite integral of xⁿ.' },
  'calculus-by-parts': { title: 'Integration by parts', description: 'Integral of a product.' },
  'calculus-ftc': { title: 'Fundamental theorem of calculus', description: 'Definite integral from an antiderivative.' },
  'calculus-substitution': { title: 'Integration by substitution', description: 'Chain-rule integral form.' },
  'calculus-gaussian': { title: 'Gaussian integral', description: 'Classical probability integral result.' },
  'calculus-taylor': { title: 'Taylor expansion', description: 'Taylor polynomial with remainder.' },
  'matrix-determinant': { title: '2×2 determinant', description: 'Determinant of a 2×2 matrix.' },
  'matrix-inverse': { title: 'Matrix inverse', description: 'Adjugate formula for an invertible matrix.' },
  'matrix-eigen': { title: 'Eigenvalue equation', description: 'Relationship between eigenvalues and eigenvectors.' },
  'matrix-characteristic': { title: 'Characteristic polynomial', description: 'Eigenvalue equation from the characteristic polynomial.' },
  'matrix-rotation': { title: '2D rotation matrix', description: 'Counterclockwise rotation by θ.' },
  'matrix-multiplication': { title: 'Matrix multiplication', description: 'Element definition for C = AB.' },
  'trig-pythagorean': { title: 'Pythagorean identity', description: 'Sine and cosine identity.' },
  'trig-angle-sum': { title: 'Sine addition formula', description: 'Sine of the sum of two angles.' },
  'trig-double-angle': { title: 'Cosine double-angle', description: 'Three equivalent forms of cos 2x.' },
  'trig-product-sum': { title: 'Product-to-sum', description: 'Convert sine-times-cosine to sums.' },
  'trig-law-sines': { title: 'Law of sines', description: 'Sides and opposite angles of a triangle.' },
  'trig-euler': { title: "Euler's formula", description: 'Complex exponential and trigonometric functions.' },
  'statistics-mean': { title: 'Sample mean', description: 'Arithmetic mean of n observations.' },
  'statistics-variance': { title: 'Sample variance', description: 'Unbiased variance with n−1 denominator.' },
  'statistics-normal': { title: 'Normal density', description: 'Normal distribution with mean μ and standard deviation σ.' },
  'statistics-binomial': { title: 'Binomial probability', description: 'Probability of k successes in n trials.' },
  'statistics-bayes': { title: "Bayes' theorem", description: 'Reverse conditional probability.' },
  'statistics-covariance': { title: 'Covariance', description: 'Covariance of random variables X and Y.' },
  'sequence-arithmetic': { title: 'Arithmetic sequence term', description: 'n-th term from first term and common difference.' },
  'sequence-arithmetic-sum': { title: 'Arithmetic series sum', description: 'Sum of the first n terms.' },
  'sequence-geometric': { title: 'Geometric sequence term', description: 'n-th term from first term and common ratio.' },
  'sequence-geometric-sum': { title: 'Geometric series sum', description: 'Sum of the first n terms for q ≠ 1.' },
  'sequence-fibonacci': { title: 'Binet formula', description: 'Closed form for the Fibonacci sequence.' },
  'sequence-recurrence': { title: 'First-order recurrence', description: 'Recurrence aₙ = paₙ₋₁ + q.' },
  'physics-newton': { title: "Newton's second law", description: 'Force, mass, and acceleration.' },
  'physics-uniform-acceleration': { title: 'Uniform acceleration', description: 'Velocity after time t with acceleration a.' },
  'physics-gravity': { title: 'Universal gravitation', description: 'Gravitational force between two masses.' },
  'physics-mass-energy': { title: 'Mass–energy equivalence', description: 'Mass and energy relation.' },
  'physics-de-broglie': { title: 'de Broglie wavelength', description: 'Matter wavelength from momentum.' },
  'physics-schrodinger': { title: 'Time-independent Schrödinger equation', description: 'One-dimensional energy eigenstate equation.' },
  'chemistry-ideal-gas': { title: 'Ideal gas law', description: 'Pressure, volume, amount, and temperature.' },
  'chemistry-concentration': { title: 'Molar concentration', description: 'Amount of solute divided by solution volume.' },
  'chemistry-equilibrium': { title: 'Equilibrium constant', description: 'Equilibrium constant from activities.' },
  'chemistry-gibbs': { title: 'Gibbs free energy', description: 'Spontaneity criterion at constant T and p.' },
  'chemistry-nernst': { title: 'Nernst equation', description: 'Electrode potential and reaction quotient.' },
  'chemistry-half-life': { title: 'First-order half-life', description: 'Time for a first-order reactant to halve.' },
}

const quickGroupEn: Record<string, string> = {
  '二元运算符': 'Binary operators',
  '关系与集合': 'Relations & sets',
  '箭头': 'Arrows',
  '其他': 'Other',
  '小写字母': 'Lowercase',
  '大写字母': 'Uppercase',
  '分式': 'Fractions',
  '导数与微分': 'Derivatives & differentials',
  '常用结构': 'Common structures',
  '根式': 'Roots',
  '上下标': 'Scripts',
  '重音与上下括号': 'Accents & braces',
  '极限': 'Limits',
  '对数与指数': 'Logs & exponentials',
  '三角函数': 'Trigonometric functions',
  '常用组合': 'Common combinations',
  '积分号': 'Integral signs',
  '微分与区域': 'Differentials & regions',
  '求和与乘积': 'Sums & products',
  '集合与逻辑': 'Sets & logic',
  '堆叠与装饰': 'Stacking & decorations',
  '普通括号': 'Basic brackets',
  '自动伸缩括号': 'Auto-sized brackets',
  '其他围栏': 'Other delimiters',
  '矩阵环境': 'Matrix environments',
  '对齐与分段': 'Alignment & cases',
  '矩阵符号': 'Matrix symbols',
}

export function localisedFormulaCategory(category: FormulaCategory, locale: UiLocale) {
  if (locale === 'zh') return category
  return { ...category, ...formulaCategoryEn[category.id] }
}

export function localisedFormulaTemplate(template: FormulaTemplate, locale: UiLocale) {
  if (locale === 'zh') return template
  return { ...template, ...formulaTemplateEn[template.id] }
}

export function localisedQuickCategory(category: QuickToolCategory, locale: UiLocale) {
  if (locale === 'zh') return { title: category.title, description: category.description }
  return {
    title: translate(locale, `quick.category.${category.id}` as MessageKey),
    description: translate(locale, `quick.category.${category.id}.desc` as MessageKey),
  }
}

export function localisedQuickGroupTitle(title: string, locale: UiLocale) {
  return locale === 'zh' ? title : quickGroupEn[title] || title
}

export function localisedQuickItemLabel(item: QuickToolItem, locale: UiLocale) {
  if (locale === 'zh') return item.label
  const command = item.latex.match(/^\\([A-Za-z]+)/)?.[1]
  if (command) return command.replace(/([A-Z])/g, ' $1').trim()
  if (/^[\x00-\x7F]+$/.test(item.label)) return item.label
  return item.id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
