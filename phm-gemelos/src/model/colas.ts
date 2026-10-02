// Teoría de colas para zonas de demanda espontánea.

// Erlang C con recursión de Erlang B. a = λ/μ en erlangs, c servidores.
export function erlangC(c: number, a: number): number {
  if (a >= c) return 1;
  let B = 1;
  for (let k = 1; k <= c; k++) B = (a * B) / (k + a * B);
  return (c * B) / (c - a * (1 - B));
}

export interface ResultadoCola {
  rho: number; // utilización
  pEspera: number; // probabilidad de esperar
  esperaMediaMin: number; // Wq aproximada G/G/c (Allen-Cunneen)
  pSuperaMeta: number; // P(W > meta)
  enColaMedia: number; // Lq
  estable: boolean;
}

// λ y μ por hora; meta en minutos. ca2 y cs2: variabilidad de llegadas y de servicio.
export function colaGGc(lambdaHora: number, muHora: number, c: number, metaMin: number, ca2 = 1.2, cs2 = 0.7): ResultadoCola {
  const a = lambdaHora / muHora;
  const rho = a / c;
  if (lambdaHora <= 0) return { rho: 0, pEspera: 0, esperaMediaMin: 0, pSuperaMeta: 0, enColaMedia: 0, estable: true };
  if (rho >= 1) return { rho, pEspera: 1, esperaMediaMin: Infinity, pSuperaMeta: 1, enColaMedia: Infinity, estable: false };
  const C = erlangC(c, a);
  const factor = (ca2 + cs2) / 2;
  const wqHoras = (C / (c * muHora - lambdaHora)) * factor;
  // Cola exponencial con tasa ajustada para que su media coincida con Wq G/G/c.
  const tasa = C / Math.max(1e-9, wqHoras);
  const pSuperaMeta = C * Math.exp((-tasa * metaMin) / 60);
  return { rho, pEspera: C, esperaMediaMin: wqHoras * 60, pSuperaMeta, enColaMedia: lambdaHora * wqHoras, estable: true };
}
