import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { buscarEPersistirCorrespondencias } from "@/lib/fixedBillService";
import ContasFixasClient from "./ContasFixasClient";

const MES_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function ContasFixasPage() {
  const userId = await getCurrentUserId();
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const [contas, categorias] = await Promise.all([
    buscarEPersistirCorrespondencias(userId, mes, ano),
    prisma.category.findMany({
      where: { userId, tipo: "DESPESA" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas Fixas</h1>
        <p className="mt-1 text-sm text-muted">
          Cadastre as contas que você já sabe que são fixas (aluguel, água,
          parcela do carro etc.) com a faixa de valor esperado. Todo mês o
          sistema procura, entre suas transações de{" "}
          {capitalizar(MES_LABEL_FORMATTER.format(agora))}, qual bate com
          cada conta — quando só existe uma candidata na faixa, vincula
          sozinho e marca como Fixo; quando fica em dúvida entre duas ou não
          acha nenhuma, pede pra você resolver.
        </p>
      </div>

      <ContasFixasClient contas={contas} categorias={categorias} />
    </div>
  );
}
