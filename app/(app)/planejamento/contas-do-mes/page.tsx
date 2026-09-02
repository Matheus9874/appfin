import Link from "next/link";
import { CheckCircle2, Clock3, HelpCircle } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { buscarEPersistirCorrespondencias } from "@/lib/fixedBillService";

const MES_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContasDoMesPage() {
  const userId = await getCurrentUserId();
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const contas = await buscarEPersistirCorrespondencias(userId, mes, ano);

  const pagas = contas.filter(
    (c) => c.estado.tipo === "RESOLVIDA" && c.estado.transacao,
  );
  const pendentes = contas.filter(
    (c) => !(c.estado.tipo === "RESOLVIDA" && c.estado.transacao),
  );

  const totalPago = pagas.reduce(
    (soma, c) => soma + (c.estado.tipo === "RESOLVIDA" && c.estado.transacao ? c.estado.transacao.valor : 0),
    0,
  );
  const totalPendente = pendentes.reduce((soma, c) => soma + c.valorEsperado, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas do mês</h1>
        <p className="mt-1 text-sm text-muted">
          Suas contas fixas em {capitalizar(MES_LABEL_FORMATTER.format(agora))}: o
          que já foi identificado como pago e o que ainda está por vir, pra
          planejar o que falta no mês.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted">Pagas</p>
            <p className="mt-1 text-xl font-semibold text-positive">
              {formatMoeda(totalPago)}
            </p>
            <p className="text-xs text-muted">
              {pagas.length} de {contas.length} conta{contas.length === 1 ? "" : "s"}
            </p>
          </div>
          <CheckCircle2 size={28} className="text-positive" />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted">Pendentes (previsão)</p>
            <p className="mt-1 text-xl font-semibold">{formatMoeda(totalPendente)}</p>
            <p className="text-xs text-muted">
              {pendentes.length} de {contas.length} conta{contas.length === 1 ? "" : "s"}
            </p>
          </div>
          <Clock3 size={28} className="text-muted" />
        </div>
      </div>

      {contas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <p className="text-sm text-muted">
            Nenhuma conta fixa cadastrada ainda.{" "}
            <Link href="/planejamento/contas-fixas" className="font-medium text-accent hover:underline">
              Cadastre a primeira
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contas.map((c) => {
            const paga = c.estado.tipo === "RESOLVIDA" && c.estado.transacao;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {paga ? (
                    <CheckCircle2 size={18} className="shrink-0 text-positive" />
                  ) : c.estado.tipo === "AMBIGUO" ? (
                    <HelpCircle size={18} className="shrink-0 text-warning" />
                  ) : (
                    <Clock3 size={18} className="shrink-0 text-muted" />
                  )}
                  <div>
                    <p className="font-medium">{c.nome}</p>
                    {c.categoryNome && <p className="text-xs text-muted">{c.categoryNome}</p>}
                  </div>
                </div>

                <div className="text-right">
                  {paga && c.estado.tipo === "RESOLVIDA" && c.estado.transacao ? (
                    <>
                      <p className="text-sm font-medium text-positive">
                        {formatMoeda(c.estado.transacao.valor)}
                      </p>
                      <p className="text-xs text-muted">
                        Paga em {c.estado.transacao.dataFormatada}
                      </p>
                    </>
                  ) : c.estado.tipo === "AMBIGUO" ? (
                    <>
                      <p className="text-sm font-medium text-warning">
                        {formatMoeda(c.valorEsperado)} (previsto)
                      </p>
                      <Link
                        href="/planejamento/contas-fixas"
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Confirmar candidata →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted">
                        {formatMoeda(c.valorEsperado)} (previsto)
                      </p>
                      <p className="text-xs text-muted">Ainda não encontrada</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
