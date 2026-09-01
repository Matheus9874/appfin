/** Validation helpers for Server Action inputs — throw a clear Error on failure. */

export function requireNonEmpty(raw: string, label: string): string {
  const value = raw.trim();
  if (!value) {
    throw new Error(`${label} é obrigatório.`);
  }
  return value;
}

function parseFiniteNumber(raw: string, label: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${label} é obrigatório.`);
  }
  // Accepts both plain ("1500.5") and Brazilian ("1.500,50") number formats —
  // mobile numeric keypads under a pt-BR locale insert "," for decimals.
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} deve ser um número válido.`);
  }
  return value;
}

/** Validates a required numeric field that must be strictly greater than zero. */
export function parsePositiveNumber(raw: string, label: string): number {
  const value = parseFiniteNumber(raw, label);
  if (value <= 0) {
    throw new Error(`${label} deve ser maior que zero.`);
  }
  return value;
}

/** Validates a required numeric field that must not be negative (zero is allowed). */
export function parseNonNegativeNumber(raw: string, label: string): number {
  const value = parseFiniteNumber(raw, label);
  if (value < 0) {
    throw new Error(`${label} não pode ser negativo.`);
  }
  return value;
}

/** Validates a required date field, returning the parsed Date. */
export function parseRequiredDate(raw: string, label: string): Date {
  if (!raw.trim()) {
    throw new Error(`${label} é obrigatório.`);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} não é uma data válida.`);
  }
  return date;
}
