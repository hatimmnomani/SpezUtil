const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MARK_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const defaultRandom = (bytes: Uint8Array): Uint8Array => crypto.getRandomValues(bytes);

/** ULID: 48-bit ms timestamp (10 chars) + 80 random bits (16 chars), Crockford base32. */
export function generateMarkId(
  now: number = Date.now(),
  random: (bytes: Uint8Array) => Uint8Array = defaultRandom,
): string {
  let time = "";
  let t = Math.max(0, Math.floor(now));
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32]! + time;
    t = Math.floor(t / 32);
  }
  const bytes = random(new Uint8Array(10));
  let rand = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      rand += CROCKFORD[(buffer >> bits) & 31]!;
    }
    buffer &= (1 << bits) - 1;
  }
  return time + rand;
}

export function isMarkId(id: string): boolean {
  return MARK_ID.test(id);
}
