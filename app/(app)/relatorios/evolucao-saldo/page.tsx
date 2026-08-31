import { LineChart } from "lucide-react";
import ComingSoon from "../ComingSoon";
import ReportHeader from "../ReportHeader";

export default function EvolucaoSaldoPage() {
  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Evolução do Saldo"
        description="Acompanhe como o seu saldo total evoluiu mês a mês ao longo do tempo."
      />
      <ComingSoon
        icon={LineChart}
        message="Em breve você poderá acompanhar a evolução do seu saldo total ao longo do tempo."
      />
    </div>
  );
}
