// Gera e baixa um CSV direto no navegador, sem precisar de backend nem lib externa.
export function exportarCSV(nomeArquivo: string, linhas: Record<string, any>[]) {
  if (linhas.length === 0) return;

  const headers = Object.keys(linhas[0]);

  const escapar = (v: any) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csv = [
    headers.join(","),
    ...linhas.map((linha) => headers.map((h) => escapar(linha[h])).join(",")),
  ].join("\n");

  // \ufeff (BOM) garante acentuação correta ao abrir no Excel
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
