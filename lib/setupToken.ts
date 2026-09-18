import crypto from "crypto";

const DIAS_VALIDADE = 7;

export function gerarSetupToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000);
  return { token, expira };
}
