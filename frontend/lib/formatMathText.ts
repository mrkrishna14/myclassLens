const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
}

const COMMAND_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\times\b/g, '×'],
  [/\\cdot\b/g, '·'],
  [/\\div\b/g, '÷'],
  [/\\pm\b/g, '±'],
  [/\\mp\b/g, '∓'],
  [/\\neq\b/g, '≠'],
  [/\\ne\b/g, '≠'],
  [/\\leq\b/g, '≤'],
  [/\\le\b/g, '≤'],
  [/\\geq\b/g, '≥'],
  [/\\ge\b/g, '≥'],
  [/\\approx\b/g, '≈'],
  [/\\sim\b/g, '∼'],
  [/\\infty\b/g, '∞'],
  [/\\to\b/g, '→'],
  [/\\rightarrow\b/g, '→'],
  [/\\leftarrow\b/g, '←'],
  [/\\Rightarrow\b/g, '⇒'],
  [/\\Leftarrow\b/g, '⇐'],
  [/\\iff\b/g, '⇔'],
  [/\\sum\b/g, '∑'],
  [/\\prod\b/g, '∏'],
  [/\\int\b/g, '∫'],
  [/\\partial\b/g, '∂'],
  [/\\nabla\b/g, '∇'],
  [/\\alpha\b/g, 'α'],
  [/\\beta\b/g, 'β'],
  [/\\gamma\b/g, 'γ'],
  [/\\delta\b/g, 'δ'],
  [/\\theta\b/g, 'θ'],
  [/\\lambda\b/g, 'λ'],
  [/\\mu\b/g, 'μ'],
  [/\\pi\b/g, 'π'],
  [/\\sigma\b/g, 'σ'],
  [/\\phi\b/g, 'φ'],
  [/\\omega\b/g, 'ω'],
]

const toMappedText = (value: string, map: Record<string, string>) => {
  return value
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
}

export const formatMathText = (text: string) => {
  if (!text) return text

  let formatted = text
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\\\[/g, '')
    .replace(/\\\]/g, '')

  for (const [pattern, replacement] of COMMAND_REPLACEMENTS) {
    formatted = formatted.replace(pattern, replacement)
  }

  formatted = formatted
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
    .replace(/\bsqrt\s*\(([^)]+)\)/g, '√($1)')

  for (let i = 0; i < 4; i += 1) {
    const next = formatted.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)⁄($2)')
    if (next === formatted) break
    formatted = next
  }

  formatted = formatted
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\bpi\b/gi, 'π')
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1⁄$2')

  formatted = formatted
    .replace(/([A-Za-z0-9)\]}])\^(\{([^{}]+)\}|([A-Za-z0-9+\-=()]+))/g, (_, base, raw, braced, plain) => {
      const exponent = (braced ?? plain ?? raw).trim()
      return `${base}${toMappedText(exponent, SUPERSCRIPT_MAP)}`
    })
    .replace(/([A-Za-z0-9)\]}])_(\{([^{}]+)\}|([A-Za-z0-9+\-=()]+))/g, (_, base, raw, braced, plain) => {
      const subscript = (braced ?? plain ?? raw).trim()
      return `${base}${toMappedText(subscript, SUBSCRIPT_MAP)}`
    })
    .replace(/\s{2,}/g, ' ')

  return formatted.trim()
}
