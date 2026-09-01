import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { paraDataLocal } from "@/lib/dateLocal";
import ReportHeader from "../ReportHeader";
import ExtratoClient from "./ExtratoClient";

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function ExtratoPage() {
  const userId = await getCurrentUserId();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { data: "desc" },
    include: { category: true },
  });

  const linhas = transactions.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    valor: Number(t.valor),
    categoryNome: t.category.nome,
    descricao: t.descricao,
    dataFormatada: formatData(t.data),
    dataISO: paraDataLocal(t.data),
    origem: t.origem,
    meioPagamento: t.meioPagamento,
    natureza: t.natureza,
    transferenciaInterna: t.transferenciaInterna,
  }));

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Extrato de Transações"
        description="Veja e exporte suas transações de um mês específico em CSV."
      />
      <ExtratoClient transactions={linhas} />
    </div>
  );
}
