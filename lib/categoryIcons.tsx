import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Building2,
  Car,
  Coins,
  CreditCard,
  Dumbbell,
  Fuel,
  Gamepad2,
  GraduationCap,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  type LucideIcon,
  MoreHorizontal,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Casa o nome de uma categoria com um ícone por palavra-chave (prefixo de
 * palavra, sem acento), em vez de exigir bater com o nome exato — assim
 * cobre tanto as categorias padrão do app quanto as centenas de nomes que o
 * Pluggy importa (ex.: "Restaurantes, bares e lanchonetes", "Pagamento de
 * cartão de crédito"), sem precisar listar cada uma. Ordem importa: o
 * primeiro grupo cuja palavra-chave aparece no nome vence, então grupos
 * mais específicos (ex.: cartão de crédito) vêm antes dos mais genéricos.
 */
const GRUPOS: { icon: LucideIcon; palavras: string[] }[] = [
  { icon: CreditCard, palavras: ["cartao"] },
  { icon: ArrowLeftRight, palavras: ["transferenc"] },
  { icon: Landmark, palavras: ["emprestim", "financiament", "juro", "divida"] },
  { icon: TrendingUp, palavras: ["investiment", "renda fixa", "fundo"] },
  { icon: Coins, palavras: ["cashback", "reembolso"] },
  { icon: Banknote, palavras: ["salario", "prolabore", "pagamento de sal"] },
  { icon: PiggyBank, palavras: ["renda extra", "poupanca", "reserva"] },
  { icon: Receipt, palavras: ["imposto", "tributo", "taxa"] },
  { icon: Fuel, palavras: ["combustivel", "gasolina", "posto", "etanol"] },
  { icon: Car, palavras: ["carro", "veicul", "automotiv", "estacionament", "pedagi", "taxi", "transporte"] },
  { icon: Wrench, palavras: ["manutenc", "reparo", "conserto"] },
  { icon: ShieldCheck, palavras: ["seguro"] },
  { icon: Wifi, palavras: ["internet", "wifi", "telecomunicac"] },
  { icon: Phone, palavras: ["telefone", "celular"] },
  { icon: Zap, palavras: ["eletricidade", "energia", "luz"] },
  { icon: Repeat, palavras: ["assinatur", "streaming", "digita"] },
  { icon: Dumbbell, palavras: ["gym", "academia", "fitness"] },
  { icon: UtensilsCrossed, palavras: ["restaurant", "lanchonete", "bar", "comida", "alimentac"] },
  { icon: ShoppingCart, palavras: ["supermercad", "mercado", "compras", "eletronic", "papelaria", "utensilio", "esportiv"] },
  { icon: HeartPulse, palavras: ["saude", "farmacia", "hospital", "clinica", "medic", "otica", "dentist"] },
  { icon: GraduationCap, palavras: ["educac", "escola", "curso", "faculdade", "universidade"] },
  { icon: Ticket, palavras: ["cinema", "teatro", "concerto", "bilhete", "show"] },
  { icon: Plane, palavras: ["hospedagem", "viagem", "hotel"] },
  { icon: Gamepad2, palavras: ["lazer", "jogo", "diversao"] },
  { icon: Sparkles, palavras: ["cuidado", "beleza", "estetica"] },
  { icon: Shirt, palavras: ["vestuari", "vestiari", "roupa", "moda", "calcado"] },
  { icon: Gift, palavras: ["presente", "doacao", "doacoes"] },
  { icon: Building2, palavras: ["condomini"] },
  { icon: Home, palavras: ["moradia", "aluguel", "residenc", "casa"] },
  { icon: AlertTriangle, palavras: ["multa"] },
  { icon: Briefcase, palavras: ["servico"] },
  { icon: MoreHorizontal, palavras: ["diverso", "outro"] },
];

const IR_EXATO = new Set(["ir"]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function getCategoryIcon(nome: string): LucideIcon {
  const normalizado = normalizar(nome);
  if (IR_EXATO.has(normalizado.trim())) return Receipt;

  for (const grupo of GRUPOS) {
    if (grupo.palavras.some((p) => normalizado.includes(p))) {
      return grupo.icon;
    }
  }
  return Tag;
}
