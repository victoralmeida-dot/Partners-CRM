import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json();
  if (!body.senhaAtual || !body.novaSenha) {
    return NextResponse.json({ error: "Preencha a senha atual e a nova senha." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const senhaValida = await bcrypt.compare(body.senhaAtual, user.senhaHash);
  if (!senhaValida) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: await bcrypt.hash(body.novaSenha, 10) },
  });

  return NextResponse.json({ ok: true });
}
