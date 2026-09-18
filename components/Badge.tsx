const styles: Record<string, string> = {
  // Tier
  GOLD: "bg-amber/10 text-amber border-amber/30",
  SILVER: "bg-ink/5 text-ink/70 border-ink/20",
  BRONZE: "bg-ink/5 text-ink/50 border-ink/10",
  // Partner status
  ATIVO: "bg-accent/10 text-accent border-accent/30",
  EM_ATIVACAO: "bg-amber/10 text-amber border-amber/30",
  PAUSADO: "bg-ink/5 text-ink/40 border-ink/10",
  MANTENEDOR: "bg-ink/10 text-ink border-ink/30",
  // Indicação status
  LEAD_POTENCIAL: "bg-[rgb(139_92_246_/_0.1)] text-[rgb(139_92_246)] border-[rgb(139_92_246_/_0.3)]",
  ENVIADA: "bg-ink/5 text-ink/60 border-ink/15",
  NEGOCIACAO: "bg-amber/10 text-amber border-amber/30",
  EM_ESPERA: "bg-ink/10 text-ink/70 border-ink/25",
  CONVERTIDA: "bg-accent/10 text-accent border-accent/30",
  PERDIDA: "bg-rose/10 text-rose border-rose/30",
  // Pagamento
  PENDENTE: "bg-amber/10 text-amber border-amber/30",
  PAGO: "bg-accent/10 text-accent border-accent/30",
  // Ação status
  PLANEJADA: "bg-ink/5 text-ink/60 border-ink/15",
  CONCLUIDA: "bg-accent/10 text-accent border-accent/30",
  CANCELADA: "bg-rose/10 text-rose border-rose/30",
  // Evento status
  PLANEJADO: "bg-accent/10 text-accent border-accent/30",
  REALIZADO: "bg-[rgb(var(--c-success)/0.1)] text-[rgb(var(--c-success))] border-[rgb(var(--c-success)/0.3)]",
  CANCELADO: "bg-rose/10 text-rose border-rose/30",
  // Tipo de meta
  MENSAL: "bg-ink/5 text-ink/60 border-ink/15",
  TRIMESTRAL: "bg-accent/10 text-accent border-accent/30",
  ANUAL: "bg-amber/10 text-amber border-amber/30",
  // Origem de receita
  INDICACAO: "bg-accent/10 text-accent border-accent/30",
  CONTRATO: "bg-ink/5 text-ink/60 border-ink/15",
  COMISSAO: "bg-amber/10 text-amber border-amber/30",
  NOVO_CONTRATO: "bg-accent/10 text-accent border-accent/30",
  EVENTO: "bg-ink/10 text-ink border-ink/30",
  INFLUENCIA: "bg-ink/5 text-ink/60 border-ink/25",
  LOCACAO_ESPACO: "bg-[rgb(167_139_250_/_0.1)] text-[rgb(167_139_250)] border-[rgb(167_139_250_/_0.3)]",
  OUTRO: "bg-ink/5 text-ink/40 border-ink/10",
};

const labels: Record<string, string> = {
  MANTENEDOR: "Mantenedor",
  EM_ATIVACAO: "Em ativação",
  LEAD_POTENCIAL: "Lead Potencial",
  NEGOCIACAO: "Negociação",
  EM_ESPERA: "Em espera / Revisitar",
  CONVERTIDA: "Convertida",
  PERDIDA: "Perdida",
  PENDENTE: "Pendente",
  PAGO: "Pago",
  PLANEJADA: "Planejada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  PLANEJADO: "Planejado",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
  FOLLOW_UP: "Follow-up",
  EP_PARA_PARCEIRO: "EP → Parceiro",
  PARCEIRO_PARA_EP: "Parceiro → EP",
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  ANUAL: "Anual",
  INDICACAO: "Indicação convertida",
  CONTRATO: "Parcela de contrato",
  COMISSAO: "Comissão",
  NOVO_CONTRATO: "Novo contrato",
  EVENTO: "Patrocínio de evento",
  INFLUENCIA: "Influência",
  LOCACAO_ESPACO: "Locação de espaço",
  OUTRO: "Outro",
};

export default function Badge({ value }: { value: string }) {
  const cls = styles[value] ?? "bg-ink/5 text-ink/60 border-ink/15";
  const label = labels[value] ?? value.replaceAll("_", " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {label}
    </span>
  );
}
