import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarSetupToken } from "@/lib/setupToken";
import { registrarAuditoria } from "@/lib/auditoria";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      partnerId: true,
      ativo: true,
      createdAt: true,
      setupToken: true,
      setupTokenExpira: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const body = await req.json();

  if (!body.email || !body.nome) {
    return NextResponse.json({ error: "E-mail e nome são obrigatórios." }, { status: 400 });
  }

  if (body.role === "PARCEIRO" && !body.partnerId) {
    return NextResponse.json(
      { error: "Selecione qual parceiro esse usuário representa." },
      { status: 400 }
    );
  }

  // Ninguém escolhe a senha por fora — gera uma senha interna aleatória
  // (descartada) e um link de uso único pra pessoa definir a própria senha.
  const senhaInterna = crypto.randomBytes(24).toString("hex");
  const senhaHash = await bcrypt.hash(senhaInterna, 10);
  const { token, expira } = gerarSetupToken();

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase().trim(),
        senhaHash,
        nome: body.nome,
        role: body.role ?? "ANALISTA",
        partnerId: body.role === "PARCEIRO" ? body.partnerId : null,
        setupToken: token,
        setupTokenExpira: expira,
      },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        partnerId: true,
        ativo: true,
        setupToken: true,
        setupTokenExpira: true,
      },
    });
    await registrarAuditoria(
      "CRIAR",
      "User",
      user.id,
      `Criou o usuário "${user.nome}" (${user.email}) com papel ${user.role}`
    );
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    throw e;
  }
}
