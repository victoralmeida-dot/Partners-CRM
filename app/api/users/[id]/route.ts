import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const body = await req.json();

  if (body.role === "PARCEIRO" && !body.partnerId) {
    return NextResponse.json(
      { error: "Selecione qual parceiro esse usuário representa." },
      { status: 400 }
    );
  }

  const data: any = {
    nome: body.nome,
    role: body.role,
    partnerId: body.role === "PARCEIRO" ? body.partnerId : null,
    ativo: body.ativo,
  };

  if (body.email) {
    data.email = body.email.toLowerCase().trim();
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, nome: true, role: true, partnerId: true, ativo: true },
    });

    await registrarAuditoria(
      "ATUALIZAR",
      "User",
      user.id,
      `Editou o usuário "${user.nome}" — ${user.ativo ? "ativo" : "desativado"}, papel ${user.role}`
    );

    return NextResponse.json(user);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  await prisma.user.delete({ where: { id: params.id } });
  await registrarAuditoria("REMOVER", "User", params.id, `Removeu o usuário "${user?.nome ?? params.id}"`);
  return NextResponse.json({ ok: true });
}
