import { prisma } from "@/lib/prisma";

export function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Gera um slug único pro parceiro a partir do nome, acrescentando -2, -3... em caso de colisão.
export async function gerarSlugUnico(nome: string, ignorarId?: string) {
  const base = slugify(nome) || "parceiro";
  let slug = base;
  let contador = 2;

  while (
    await prisma.partner.findFirst({
      where: { slug, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    })
  ) {
    slug = `${base}-${contador}`;
    contador++;
  }

  return slug;
}
