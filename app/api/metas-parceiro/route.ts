import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get("partnerId");

  const metas = await prisma.metaParceiro.findMany({
    where: partnerId ? { partnerId } : undefined,
    orderBy: [{ periodo: "asc" }, { tipo: "asc" }],
  });
  return NextResponse.json(metas);
}

// Upsert por partnerId+tipo+periodo — evita duplicar meta do mesmo mês/tipo.
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.partnerId || !body.tipo || !body.periodo || body.valorMeta == null) {
    return NextResponse.json(
      { error: "partnerId, tipo, periodo e valorMeta são obrigatórios." },
      { status: 400 }
    );
  }

  const fixa = !!body.fixa;

  if (fixa) {
    // Meta fixa (contratual) — só uma por parceiro+tipo; se já existir, atualiza em vez de duplicar.
    const existente = await prisma.metaParceiro.findFirst({
      where: { partnerId: body.partnerId, tipo: body.tipo, fixa: true },
    });
    const meta = existente
      ? await prisma.metaParceiro.update({
          where: { id: existente.id },
          data: { valorMeta: Number(body.valorMeta) },
        })
      : await prisma.metaParceiro.create({
          data: {
            partnerId: body.partnerId,
            tipo: body.tipo,
            periodo: body.periodo,
            valorMeta: Number(body.valorMeta),
            fixa: true,
          },
        });
    return NextResponse.json(meta, { status: 201 });
  }

  const meta = await prisma.metaParceiro.upsert({
    where: {
      partnerId_tipo_periodo: {
        partnerId: body.partnerId,
        tipo: body.tipo,
        periodo: body.periodo,
      },
    },
    create: {
      partnerId: body.partnerId,
      tipo: body.tipo,
      periodo: body.periodo,
      valorMeta: Number(body.valorMeta),
    },
    update: { valorMeta: Number(body.valorMeta) },
  });

  return NextResponse.json(meta, { status: 201 });
}
