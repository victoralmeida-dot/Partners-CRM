import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Acao = "CRIAR" | "ATUALIZAR" | "REMOVER";

// Registra uma entrada na trilha de auditoria. Nunca deixa o app quebrar por
// causa disso — se a auditoria falhar, só loga no console e segue o fluxo
// normal (auditoria é observabilidade, não pode travar a operação real).
export async function registrarAuditoria(
  acao: Acao,
  entidade: string,
  entidadeId: string | null,
  detalhe?: string
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        userNome: user?.name ?? "Sistema",
        acao,
        entidade,
        entidadeId,
        detalhe: detalhe ?? null,
      },
    });
  } catch (e) {
    console.error("Falha ao registrar auditoria:", e);
  }
}
