const GB = 1024 ** 3;
const MB = 1024 ** 2;

const oneDecimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const whole = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

export function formatSize(bytes: number): string {
  if (bytes >= GB) return `${oneDecimal.format(bytes / GB)} ГБ`;
  if (bytes >= MB) return `${whole.format(bytes / MB)} МБ`;
  if (bytes > 0) return '< 1 МБ';
  return '0';
}
