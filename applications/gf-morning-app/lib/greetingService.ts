export function getGreeting(sydneyHour: number, sydneyMinute: number): string {
  const t = sydneyHour * 60 + sydneyMinute;
  if (t < 6 * 60 + 30) return "Gyad daym its too early peen";
  if (t < 12 * 60) return "Good morning pookie!";
  if (t < 17 * 60) return "Good afternoon peen";
  if (t < 21 * 60) return "Good evening peen";
  if (t < 21 * 60 + 30) return "Good night peen";
  return "Sleep well peen";
}
