import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { calcularRealizadoDoMes } from "@/lib/monthlyPlanActuals";
import PlanejamentoClient from "./PlanejamentoClient";

const MES_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function PlanejamentoPage() {
  const userId = await getCurrentUserId();
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const [planoExistente, realizado] = await Promise.all([
    prisma.monthlyPlan.findUnique({
      where: { userId_mes_ano: { userId, mes, ano } },
    }),
    calcularRealizadoDoMes(userId, mes, ano),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planejamento</h1>
        <p className="mt-1 text-sm text-muted">
          Distribua a renda de {capitalizar(MES_LABEL_FORMATTER.format(agora))}{" "}
          em grandes fatias e acompanhe o realizado
        </p>
      </div>

      <PlanejamentoClient
        mes={mes}
        ano={ano}
        planoExistente={
          planoExistente
            ? {
                rendaPlanejada: Number(planoExistente.rendaPlanejada),
                percentualEssencial: Number(planoExistente.percentualEssencial),
                percentualPessoal: Number(planoExistente.percentualPessoal),
                percentualReserva: Number(planoExistente.percentualReserva),
                percentualInvestimento: Number(
                  planoExistente.percentualInvestimento,
                ),
              }
            : null
        }
        realizado={realizado}
      />
    </div>
  );
}
