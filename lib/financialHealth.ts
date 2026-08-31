export type MensagemSaudeFinanceira = {
  texto: string;
  tipo: "alerta" | "positiva";
};

export type SaudeFinanceira = {
  percentualDespesasFixas: number;
  percentualDespesasVariaveis: number;
  mesesReservaEmergencia: number | null;
  mensagens: MensagemSaudeFinanceira[];
};

export const LIMITE_DESPESAS_FIXAS_ALTO = 60;
export const MESES_RESERVA_RECOMENDADO_MIN = 3;

const MENSAGEM_DESPESAS_FIXAS_ALTAS =
  "Suas despesas fixas estão consumindo uma parte grande da sua renda.";
const MENSAGEM_RESERVA_BAIXA =
  "Sua reserva de emergência está abaixo do recomendado (3 a 6 meses de despesas).";
const MENSAGEM_SITUACAO_EQUILIBRADA =
  "Sua situação financeira está equilibrada: despesas fixas sob controle e reserva de emergência dentro do recomendado.";

/**
 * Indicador de saúde financeira a partir de médias mensais já calculadas
 * (renda, despesas totais, despesas fixas e variáveis) e do valor atual da
 * reserva de emergência. Não persiste nada — é só leitura/derivação.
 */
export function calcularSaudeFinanceira({
  rendaMedia,
  despesaMedia,
  despesaFixaMedia,
  despesaVariavelMedia,
  reservaEmergencia,
}: {
  rendaMedia: number;
  despesaMedia: number;
  despesaFixaMedia: number;
  despesaVariavelMedia: number;
  reservaEmergencia: number;
}): SaudeFinanceira {
  const pct = (valor: number) =>
    rendaMedia > 0 ? (valor / rendaMedia) * 100 : 0;

  const percentualDespesasFixas = pct(Math.max(0, despesaFixaMedia));
  const percentualDespesasVariaveis = pct(Math.max(0, despesaVariavelMedia));
  const mesesReservaEmergencia =
    despesaMedia > 0 ? Math.max(0, reservaEmergencia) / despesaMedia : null;

  const mensagens: MensagemSaudeFinanceira[] = [];

  if (percentualDespesasFixas > LIMITE_DESPESAS_FIXAS_ALTO) {
    mensagens.push({ texto: MENSAGEM_DESPESAS_FIXAS_ALTAS, tipo: "alerta" });
  }

  if (
    mesesReservaEmergencia !== null &&
    mesesReservaEmergencia < MESES_RESERVA_RECOMENDADO_MIN
  ) {
    mensagens.push({ texto: MENSAGEM_RESERVA_BAIXA, tipo: "alerta" });
  }

  if (mensagens.length === 0) {
    mensagens.push({ texto: MENSAGEM_SITUACAO_EQUILIBRADA, tipo: "positiva" });
  }

  return {
    percentualDespesasFixas,
    percentualDespesasVariaveis,
    mesesReservaEmergencia,
    mensagens,
  };
}
