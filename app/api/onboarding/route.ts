import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.partnerId || !body.item) {
    return NextResponse.json({ error: "partnerId e item são obrigatórios." }, { status: 400 });
  }

  const maiorOrdem = await prisma.onboardingItem.aggregate({
    where: { partnerId: body.partnerId },
    _max: { ordem: true },
  });

  const item = await prisma.onboardingItem.create({
    data: {
      partnerId: body.partnerId,
      item: body.item,
      ordem: (maiorOrdem._max.ordem ?? -1) + 1,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
