// ============================================================================
// Rate limiter simples, em memória, por instância do processo. Suficiente
// para mitigar tentativas de força bruta num único runtime serverless "quente".
// Nota: o Vercel pode ter múltiplas instâncias em paralelo, cada uma com o
// seu próprio contador — para um limite verdadeiramente global entre
// instâncias seria preciso um armazenamento partilhado (ex: Redis / Upstash),
// o que fica marcado como melhoria futura (P15).
// ============================================================================

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

// Limpeza ocasional para não crescer indefinidamente em memória.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
