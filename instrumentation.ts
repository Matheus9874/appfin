/**
 * Fixa o fuso do processo Node em Brasília. Sem isso, todo código que lê
 * getFullYear()/getMonth()/getDate() de um Date (lib/dateLocal.ts,
 * lib/monthlyTotals.ts, o cálculo de dataReferencia em dashboard/page.tsx
 * etc.) usa o fuso *ambiente* do runtime — que é América/São_Paulo aqui no
 * dev (a máquina já está nesse fuso), mas UTC por padrão na Vercel. Uma
 * transação entre 21h e meia-noite (Brasília) cai num dia UTC seguinte,
 * então o servidor e o navegador do usuário (sempre em Brasília) acabavam
 * discordando sobre o mês/dia dela só em produção — daí o Dashboard mostrar
 * um total diferente do que a tela de Transações mostra pro mesmo dado.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "America/Sao_Paulo";
  }
}
