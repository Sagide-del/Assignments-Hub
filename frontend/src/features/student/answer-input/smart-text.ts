const SUPERSCRIPTS: Record<string, string> = {
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
};

const SUBSCRIPTS: Record<string, string> = {
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
};

const FRACTIONS: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

function convertCharacters(value: string, characterMap: Record<string, string>) {
  return Array.from(value, (character) => characterMap[character] ?? character).join('');
}

/**
 * Converts common keyboard-friendly school notation while preserving the
 * plain-string answer contract used by submission and auto-grading APIs.
 */
export function formatSmartText(value: string): string {
  let formatted = value
    .replace(/<->/g, '↔')
    .replace(/->/g, '→')
    .replace(/<-/g, '←')
    .replace(/\bsqrt(?=\s*(?:\(|\d|[a-z]))/gi, '√');

  for (const [fraction, symbol] of Object.entries(FRACTIONS)) {
    const escapedFraction = fraction.replace('/', '\\/');
    formatted = formatted.replace(
      new RegExp(`(^|[^\\d])${escapedFraction}(?=$|[^\\d])`, 'g'),
      (_, prefix: string) => `${prefix}${symbol}`,
    );
  }

  formatted = formatted.replace(/\^([0-9+-]+)/g, (_, exponent: string) =>
    convertCharacters(exponent, SUPERSCRIPTS),
  );

  // Convert digits only inside formula-shaped tokens containing at least two
  // chemical symbols. This formats H2O and CO2 without changing ordinary text.
  formatted = formatted.replace(/\b(?:[A-Z][a-z]?\d*){2,}\b/g, (formula) => {
    if (!/\d/.test(formula)) return formula;
    return formula.replace(/\d/g, (digit) => SUBSCRIPTS[digit] ?? digit);
  });

  return formatted;
}
