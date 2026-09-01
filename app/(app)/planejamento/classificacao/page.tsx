import { getCurrentUserId } from "@/lib/auth";
import { sugerirContasRecorrentes } from "@/lib/fixedExpenseSuggestion";
import ClassificacaoClient from "./ClassificacaoClient";

export default async function ClassificacaoPage() {
  const userId = await getCurrentUserId();
  const sugestoes = await sugerirContasRecorrentes(userId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Classificar Fixo/Variável
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sugestões automáticas com base nos últimos 3 meses, olhando só
          boleto/débito/Pix — um comerciante que aparece em pelo menos 2 dos
          3 meses com valor parecido (variação de até 15%) vira candidato a
          conta fixa. Cartão de crédito, comida e farmácia ficam sempre fora
          da sugestão de fixo. Revise e confirme; nada muda até você
          confirmar.
        </p>
      </div>

      <ClassificacaoClient sugestoes={sugestoes} />
    </div>
  );
}
