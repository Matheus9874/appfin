const BOM = "﻿";

/**
 * Builds a CSV string for pt-BR Excel: `;` as the field delimiter (since `,`
 * is the decimal separator in this locale) and a UTF-8 BOM prefix so
 * accented characters render correctly when opened directly.
 */
export function paraCsv(cabecalho: string[], linhas: string[][]): string {
  const escapar = (campo: string) => {
    if (/[";\n]/.test(campo)) {
      return `"${campo.replace(/"/g, '""')}"`;
    }
    return campo;
  };
  const todasAsLinhas = [cabecalho, ...linhas].map((linha) =>
    linha.map(escapar).join(";"),
  );
  return BOM + todasAsLinhas.join("\r\n");
}
