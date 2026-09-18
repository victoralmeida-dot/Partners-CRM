import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ano = Number(searchParams.get("ano")) || new Date().getFullYear();

  const [metas, receitas] = await Promise.all([
    prisma.meta.findMany({ where: { periodo: { startsWith: String(ano) } } }),
    prisma.receita.findMany({
      where: {
        data: {
          gte: new Date(`${ano}-01-01T00:00:00`),
          lt: new Date(`${ano + 1}-01-01T00:00:00`),
        },
      },
    }),
  ]);

  const metaPorPeriodo: Record<string, number> = {};
  metas.forEach((m) => (metaPorPeriodo[m.periodo] = m.valorMeta));

  const meses = MESES.map((label, idx) => {
    const mesNum = idx + 1;
    const periodo = `${ano}-${String(mesNum).padStart(2, "0")}`;
    const atingido = receitas
      .filter((r) => new Date(r.data).getMonth() + 1 === mesNum)
      .reduce((sum, r) => sum + r.valor, 0);
    return { periodo, label, meta: metaPorPeriodo[periodo] ?? null, atingido };
  });

  const trimestres = [1, 2, 3, 4].map((q) => {
    const periodo = `${ano}-Q${q}`;
    const mesesDoTrimestre = meses.slice((q - 1) * 3, q * 3);
    const atingido = mesesDoTrimestre.reduce((sum, m) => sum + m.atingido, 0);
    const metaSomaMensal = mesesDoTrimestre.reduce((sum, m) => sum + (m.meta ?? 0), 0);
    return {
      periodo,
      label: `Q${q}`,
      meta: metaPorPeriodo[periodo] ?? (metaSomaMensal || null),
      atingido,
    };
  });

  return NextResponse.json({ ano, meses, trimestres });
}
