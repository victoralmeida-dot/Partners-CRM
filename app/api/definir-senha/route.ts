import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Valida se o token existe e não expirou — usado pra tela decidir o que mostrar.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valido: false, erro: "Token não informado." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { setupToken: token } });

  if (!user) {
    return NextResponse.json({ valido: false, erro: "Link inválido ou já utilizado." });
  }
  if (!user.setupTokenExpira || user.setupTokenExpira < new Date()) {
    return NextResponse.json({ valido: false, erro: "Este link expirou. Peça um novo ao administrador." });
  }

  return NextResponse.json({ valido: true, nome: user.nome, email: user.email });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, novaSenha } = body;

  if (!token || !novaSenha) {
    return NextResponse.json({ error: "Token e nova senha são obrigatórios." }, { status: 400 });
  }
  if (novaSenha.length < 6) {
    return NextResponse.json({ error: "Use pelo menos 6 caracteres." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { setupToken: token } });

  if (!user) {
    return NextResponse.json({ error: "Link inválido ou já utilizado." }, { status: 400 });
  }
  if (!user.setupTokenExpira || user.setupTokenExpira < new Date()) {
    return NextResponse.json(
      { error: "Este link expirou. Peça um novo ao administrador." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      senhaHash: await bcrypt.hash(novaSenha, 10),
      setupToken: null, // uso único — invalida o link depois de usado
      setupTokenExpira: null,
    },
  });

  return NextResponse.json({ ok: true });
}
