export const rupees = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 });
export const toPaise = (rupeesValue: number | string) => Math.round(Number(rupeesValue) * 100);

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function below100(n: number) { return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); }
function below1000(n: number) { return (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + below100(n % 100); }
export function amountInWords(paise: number): string {
  const r = Math.floor(paise / 100), p = paise % 100;
  const parts: string[] = [];
  const crore = Math.floor(r / 10000000), lakh = Math.floor((r % 10000000) / 100000), th = Math.floor((r % 100000) / 1000), rest = r % 1000;
  if (crore) parts.push(below1000(crore) + ' Crore');
  if (lakh) parts.push(below100(lakh) + ' Lakh');
  if (th) parts.push(below100(th) + ' Thousand');
  if (rest) parts.push(below1000(rest));
  let s = 'Rupees ' + (parts.join(' ') || 'Zero');
  if (p) s += ' and ' + below100(p) + ' Paise';
  return s + ' Only';
}
