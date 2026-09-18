import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.notaIndicacao.delete({ where: { id: params.id } });
  await registrarAuditoria("REMOVER", "NotaIndicacao", params.id, `Removeu nota ${params.id}`);
  return NextResponse.json({ ok: true });
}
