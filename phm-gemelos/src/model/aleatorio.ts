// Generadores pseudoaleatorios con semilla, para que la simulación sea reproducible.

export function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Aleatorio = () => number;

export function normal(r: Aleatorio): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Gamma por Marsaglia-Tsang (forma k >= 1) con ajuste para k < 1.
export function gamma(r: Aleatorio, k: number, theta = 1): number {
  if (k < 1) return gamma(r, k + 1, theta) * Math.pow(r(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      x = normal(r);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
  }
}

// Multiplicador con media 1 y coeficiente de variación cv.
export function multGamma(r: Aleatorio, cv: number): number {
  if (cv <= 0) return 1;
  const k = 1 / (cv * cv);
  return gamma(r, k, 1 / k);
}

export function beta(r: Aleatorio, a: number, b: number): number {
  const x = gamma(r, a);
  const y = gamma(r, b);
  return x / (x + y);
}

// PERT (mín, moda, máx).
export function pert(r: Aleatorio, min: number, moda: number, max: number): number {
  if (max === min) return moda;
  const a = 1 + (4 * (moda - min)) / (max - min);
  const b = 1 + (4 * (max - moda)) / (max - min);
  return min + beta(r, a, b) * (max - min);
}

// Conteo con sobredispersión (binomial negativa como Poisson-Gamma), aproximado por normal para medias grandes.
export function conteoSobredisperso(r: Aleatorio, media: number, k: number): number {
  if (media <= 0) return 0;
  const lambda = media * multGamma(r, 1 / Math.sqrt(k));
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(r)));
  const L = Math.exp(-lambda);
  let p = 1;
  let n = 0;
  do {
    n++;
    p *= r();
  } while (p > L);
  return n - 1;
}

export function percentil(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
