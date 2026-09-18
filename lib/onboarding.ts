import { prisma } from "@/lib/prisma";

// Baseado no documento "Onboarding de Parcerias — Ecommerce Puro".
// Editável na prática: cada parceiro pode ter itens adicionados/removidos
// depois, isso aqui é só o ponto de partida padrão.
export const CHECKLIST_ONBOARDING_PADRAO = [
  "Contrato assinado e arquivado",
  "Dados cadastrais completos (CNPJ, razão social, endereço, contatos)",
  "Escopo de entregas traduzido em checklist operacional",
  "Reunião de kickoff realizada",
  "Calendário de eventos compartilhado",
  "Canal de comunicação oficial definido",
  "Primeira entrega/ativação realizada",
  "Cadastro completo no CRM (tier, contato, ICP, cota de eventos)",
];

export async function criarChecklistOnboarding(partnerId: string) {
  await prisma.onboardingItem.createMany({
    data: CHECKLIST_ONBOARDING_PADRAO.map((item, ordem) => ({
      partnerId,
      item,
      ordem,
    })),
  });
}
