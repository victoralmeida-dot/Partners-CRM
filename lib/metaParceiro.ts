// Projeção de meta mensal a partir da velocidade atual (run-rate simples):
// pega o que já foi realizado até hoje, divide pelos dias já decorridos no mês
// pra achar a "velocidade diária", e extrapola pros dias restantes do mês.
// Usado tanto na ficha do parceiro quanto no dashboard/indicações — mantém a
// mesma fórmula nos dois lugares (ver docs/decisoes.md sobre a duplicação que
// isso substitui).
export function calcularProjecaoMensal(realizado: number, valorMeta: number, hoje: Date = new Date()) {
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaAtual = hoje.getDate();

  const velocidadeDiaria = realizado / diaAtual;
  const projecaoFimMes = velocidadeDiaria * diasNoMes;
  const pctProjecao = valorMeta > 0 ? (projecaoFimMes / valorMeta) * 100 : 0;

  return {
    diasNoMes,
    diaAtual,
    projecaoFimMes,
    pctProjecao,
    vaiBaterMeta: projecaoFimMes >= valorMeta,
  };
}
