import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const data: any = {};
  if (body.item !== undefined) data.item = body.item;
  if (body.concluido !== undefined) {
    data.concluido = body.concluido;
    data.concluidoEm = body.concluido ? new Date() : null;
  }

  const item = await prisma.onboardingItem.update({
    where: { id: params.id },
    data,
  });

  if (body.concluido !== undefined) {
    await registrarAuditoria(
      "ATUALIZAR",
      "OnboardingItem",
      item.id,
      `${body.concluido ? "Concluiu" : "Reabriu"} item de onboarding: "${item.item}"`
    );
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.onboardingItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
