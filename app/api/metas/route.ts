import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const metas = await prisma.meta.findMany({ orderBy: { periodo: "asc" } });
  return NextResponse.json(metas);
}

// Upsert por período: se já existe uma meta pra esse período, atualiza o valor
// em vez de duplicar. Facilita "configurar a meta de julho" sem se preocupar
// se ela já existe ou não.
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.periodo || !body.tipo || body.valorMeta == null) {
    return NextResponse.json(
      { error: "periodo, tipo e valorMeta são obrigatórios." },
      { status: 400 }
    );
  }

  const meta = await prisma.meta.upsert({
    where: { periodo: body.periodo },
    create: { periodo: body.periodo, tipo: body.tipo, valorMeta: body.valorMeta },
    update: { valorMeta: body.valorMeta, tipo: body.tipo },
  });

  return NextResponse.json(meta, { status: 201 });
}
