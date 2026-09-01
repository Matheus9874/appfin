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

const DATA_SOMENTE_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validates a required date field, returning the parsed Date.
 *
 * `<input type="date">` always submits "YYYY-MM-DD" — `new Date(raw)`
 * parses that specific format as UTC midnight per spec, which becomes the
 * previous calendar day once read back in Brasília (UTC-3). Building the
 * Date from its local year/month/day instead keeps it the same calendar
 * day the user picked, consistent with how it's grouped/displayed
 * elsewhere (lib/dateLocal.ts).
 */
export function parseRequiredDate(raw: string, label: string): Date {
  const valor = raw.trim();
  if (!valor) {
    throw new Error(`${label} é obrigatório.`);
  }
  const somenteDia = DATA_SOMENTE_DIA.exec(valor);
  const date = somenteDia
    ? new Date(Number(somenteDia[1]), Number(somenteDia[2]) - 1, Number(somenteDia[3]))
    : new Date(valor);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} não é uma data válida.`);
  }
  return date;
}
