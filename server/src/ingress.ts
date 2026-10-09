// Applied before authentication/body parsing. Do not trust client-supplied proxy headers.
export function makeIngressLimiter(now: () => number = Date.now) {
  const addresses = new Map<string, { count: number; until: number }>();
  let windowEnd = 0;
  let total = 0;
  return (address: string) => {
    const time = now();
    if (time >= windowEnd) {
      windowEnd = time + 60000;
      total = 0;
    }
    for (const [key, value] of addresses)
      if (value.until <= time) addresses.delete(key);
    if (++total > 100 || (!addresses.has(address) && addresses.size >= 10000))
      return false;
    const bucket = addresses.get(address) ?? { count: 0, until: time + 60000 };
    bucket.count++;
    addresses.set(address, bucket);
    return bucket.count <= 30;
  };
}
