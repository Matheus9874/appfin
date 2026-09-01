import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Toda página que lê a tabela Transaction (direta ou indiretamente, via
 * despesa média/saldo/investimentos). Centralizado aqui porque múltiplos
 * pontos de mutação (ações manuais, sync do Pluggy) precisam revalidar o
 * mesmo conjunto — listar em cada um separadamente é como esse conjunto
 * ficou incompleto da última vez (Reserva/Metas/Relatórios ficavam com dado
 * velho depois de excluir ou editar uma transação).
 */
export function revalidateFinancialPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  revalidatePath("/reserva-investimentos");
  revalidatePath("/metas");
  revalidatePath("/relatorios/extrato");
  revalidatePath("/relatorios/gastos-por-categoria");
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/classificacao");
}
