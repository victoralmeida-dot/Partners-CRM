import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarSlugUnico } from "@/lib/slug";
import { criarChecklistOnboarding } from "@/lib/onboarding";

const validTier = (v: string) => ["GOLD", "SILVER", "BRONZE"].includes(v) ? v : "BRONZE";
const validStatus = (v: string) =>
  ["ATIVO", "EM_ATIVACAO", "PAUSADO"].includes(v) ? v : "EM_ATIVACAO";
const asBool = (v: string) => ["true", "1", "sim", "yes", "x"].includes((v ?? "").toLowerCase());

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: Record<string, string>[] = body.partners ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nenhuma linha para importar." }, { status: 400 });
  }

  let criados = 0;
  let atualizados = 0;
  const erros: string[] = [];

  for (const row of rows) {
    const nome = (row.nome ?? "").trim();
    if (!nome) {
      erros.push("Linha sem nome — ignorada.");
      continue;
    }

    const data = {
      nome,
      tier: validTier((row.tier ?? "").toUpperCase()),
      status: validStatus((row.status ?? "").toUpperCase()),
      categoria: row.categoria || null,
      prioritario: asBool(row.prioritario),
      mantenedor: asBool(row.mantenedor),
      contatoPrincipal: row.contatoPrincipal || null,
      contatoEmail: row.contatoEmail || null,
      contatoSecund: row.contatoSecund || null,
      observacoes: row.observacoes || null,
      clickupCardId: row.clickupCardId || null,
    };

    const existente = await prisma.partner.findFirst({
      where: { nome: { equals: nome } },
    });

    if (existente) {
      await prisma.partner.update({ where: { id: existente.id }, data });
      atualizados++;
    } else {
      const slug = await gerarSlugUnico(nome);
      const novo = await prisma.partner.create({ data: { ...data, slug } });
      await criarChecklistOnboarding(novo.id);
      criados++;
    }
  }

  return NextResponse.json({ criados, atualizados, erros });
}
