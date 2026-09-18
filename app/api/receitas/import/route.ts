import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORIGENS_VALIDAS = [
  "INDICACAO",
  "CONTRATO",
  "COMISSAO",
  "NOVO_CONTRATO",
  "EVENTO",
  "INFLUENCIA",
  "OUTRO",
];

function parseValor(raw: string): number {
  if (!raw) return 0;
  let s = raw.replace(/[^\d,.-]/g, "").trim();
  if (s.includes(",") && s.includes(".")) {
    // formato BR: 1.234,56 -> remove separador de milhar, vírgula vira ponto
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // só vírgula: assume que é decimal (ex: 1234,56)
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseData(raw: string): Date {
  const s = raw.trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const ano = y.length === 2 ? `20${y}` : y;
    return new Date(`${ano}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  // yyyy-mm-dd ou outros formatos ISO
  return new Date(s);
}

function normalizaOrigem(raw: string): string {
  const s = (raw || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (ORIGENS_VALIDAS.includes(s)) return s;
  const mapa: Record<string, string> = {
    "INDICAÇÃO": "INDICACAO",
    "INDICAÇÃO_CONVERTIDA": "INDICACAO",
    "INDICACAO_CONVERTIDA": "INDICACAO",
    "COMISSÃO": "COMISSAO",
    "COMISSIONAMENTO": "COMISSAO",
    "PARCELA_DE_CONTRATO": "CONTRATO",
    "NOVO_CONTRATO": "NOVO_CONTRATO",
    "PATROCINIO": "EVENTO",
    "PATROCÍNIO": "EVENTO",
    "PATROCINIO_DE_EVENTO": "EVENTO",
    "EVENTO": "EVENTO",
    "INFLUÊNCIA": "INFLUENCIA",
    "INFLUENCIADOR": "INFLUENCIA",
    "MARKETING_DE_INFLUENCIA": "INFLUENCIA",
    "MARKETING_DE_INFLUÊNCIA": "INFLUENCIA",
  };
  return mapa[s] || "OUTRO";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: Record<string, string>[] = body.receitas ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nenhuma linha para importar." }, { status: 400 });
  }

  const partners = await prisma.partner.findMany({ select: { id: true, nome: true } });
  const partnerPorNome = new Map(partners.map((p) => [p.nome.trim().toLowerCase(), p.id]));

  let criados = 0;
  const erros: string[] = [];

  for (const row of rows) {
    const valor = parseValor(row.valor);
    const dataRaw = row.data;

    if (!valor || !dataRaw) {
      erros.push(`Linha ignorada (valor ou data ausente): ${JSON.stringify(row)}`);
      continue;
    }

    const data = parseData(dataRaw);
    if (isNaN(data.getTime())) {
      erros.push(`Data inválida ignorada: "${dataRaw}"`);
      continue;
    }

    const nomeParceiro = (row.parceiro || row.partner || "").trim().toLowerCase();
    const partnerId = nomeParceiro ? partnerPorNome.get(nomeParceiro) ?? null : null;

    await prisma.receita.create({
      data: {
        origem: normalizaOrigem(row.origem),
        valor,
        data,
        partnerId,
        descricao: row.descricao || null,
      },
    });
    criados++;
  }

  return NextResponse.json({ criados, erros });
}
