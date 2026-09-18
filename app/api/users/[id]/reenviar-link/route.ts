import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarSetupToken } from "@/lib/setupToken";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const { token, expira } = gerarSetupToken();

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { setupToken: token, setupTokenExpira: expira },
    select: { id: true, email: true, nome: true, setupToken: true, setupTokenExpira: true },
  });

  return NextResponse.json(user);
}
