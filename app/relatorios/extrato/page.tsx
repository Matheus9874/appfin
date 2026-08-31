import { FileText } from "lucide-react";
import ComingSoon from "../ComingSoon";
import ReportHeader from "../ReportHeader";

export default function ExtratoPage() {
  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Extrato de Transações"
        description="Um extrato completo e filtrável de todas as suas transações, pronto para exportar."
      />
      <ComingSoon
        icon={FileText}
        message="Em breve você poderá gerar e exportar um extrato completo das suas transações."
      />
    </div>
  );
}
