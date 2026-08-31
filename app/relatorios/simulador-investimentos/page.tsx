import InvestmentSimulator from "../InvestmentSimulator";
import ReportHeader from "../ReportHeader";

export default function SimuladorInvestimentosPage() {
  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Simulador de Investimentos"
        description="Simulação educativa de juros compostos — não é uma recomendação de investimento."
      />
      <InvestmentSimulator />
    </div>
  );
}
