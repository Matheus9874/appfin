/**
 * Formata uma data como "YYYY-MM-DD" no fuso horário LOCAL do processo, não
 * UTC. `date.toISOString().slice(0, 10)` converte para UTC antes de cortar
 * — como o Brasil é UTC-3, uma transação lançada tarde da noite no último
 * dia do mês (ex.: 31/07 23h local = 01/08 02h UTC) "vaza" para o mês
 * seguinte quando cortada em UTC. Usada para filtros de mês, campos de data
 * de formulário e qualquer lugar que precise da data como o usuário a vê.
 */
export function paraDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** "YYYY-MM" no fuso local — mesma lógica de `paraDataLocal`, sem o dia. */
export function paraMesLocal(data: Date): string {
  return paraDataLocal(data).slice(0, 7);
}
