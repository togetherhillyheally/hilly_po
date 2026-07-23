export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidKoreanMobile(digits: string): boolean {
  return /^01[016789]\d{7,8}$/.test(digits);
}

export function toE164(digits: string): string {
  if (!digits.startsWith("0")) return "+" + digits;
  return "+82" + digits.slice(1);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function maskPhone(digits: string): string {
  if (digits.length < 7) return digits;
  return digits.slice(0, 3) + "-****-" + digits.slice(-4);
}
