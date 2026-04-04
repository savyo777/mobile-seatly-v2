import type { ReceiptPayload } from '@/lib/receipt/receiptTypes';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(n);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function buildReceiptHtml(payload: ReceiptPayload): string {
  const title = payload.kind === 'booking' ? 'Booking receipt' : 'Order receipt';
  const rows =
    payload.items.length === 0
      ? `<tr><td colspan="4" style="padding:16px 0;color:#888;font-size:13px;">No line items on this receipt.</td></tr>`
      : payload.items
          .map(
            (it) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #2a2a2a;">${escapeHtml(it.name)}${it.note ? `<div style="font-size:11px;color:#888;margin-top:4px;">${escapeHtml(it.note)}</div>` : ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #2a2a2a;text-align:center;">${it.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #2a2a2a;text-align:right;">${formatMoney(it.unitPrice, payload.currency)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #2a2a2a;text-align:right;">${formatMoney(it.lineTotal, payload.currency)}</td>
    </tr>`,
          )
          .join('');

  const totals =
    payload.items.length === 0 && !payload.footerNote
      ? ''
      : `
  <table style="width:100%;max-width:400px;margin-left:auto;margin-top:16px;font-size:13px;">
    <tr><td style="padding:6px 0;color:#aaa;">Subtotal</td><td style="text-align:right;color:#eee;">${formatMoney(payload.subtotal, payload.currency)}</td></tr>
    <tr><td style="padding:6px 0;color:#aaa;">Tax</td><td style="text-align:right;color:#eee;">${formatMoney(payload.taxAmount, payload.currency)}</td></tr>
    <tr><td style="padding:6px 0;color:#aaa;">Tip</td><td style="text-align:right;color:#eee;">${formatMoney(payload.tipAmount, payload.currency)}</td></tr>
    <tr><td style="padding:12px 0 6px;font-weight:700;color:#C9A84C;font-size:15px;">Total</td><td style="text-align:right;font-weight:700;color:#C9A84C;font-size:15px;">${formatMoney(payload.totalAmount, payload.currency)}</td></tr>
  </table>`;

  const footerNote = payload.footerNote
    ? `<p style="margin-top:20px;font-size:12px;color:#777;line-height:1.5;">${escapeHtml(payload.footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — ${escapeHtml(payload.referenceId)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 24px 48px; background: #0a0a0a; color: #e8e8e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .brand { font-size: 11px; letter-spacing: 4px; color: #C9A84C; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; }
    h1 { font-size: 22px; font-weight: 700; color: #C9A84C; margin: 0 0 24px; letter-spacing: -0.5px; }
    .meta { font-size: 13px; line-height: 1.7; color: #ccc; margin-bottom: 8px; }
    .meta strong { color: #fff; font-weight: 600; }
    table.items { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px; }
    th { text-align: left; padding: 8px; color: #C9A84C; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #C9A84C44; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: inherit; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .guest { margin-top: 28px; padding-top: 20px; border-top: 1px solid #2e2e2e; font-size: 13px; color: #aaa; }
  </style>
</head>
<body>
  <div class="brand">SEATLY</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta"><strong>${escapeHtml(payload.restaurantName)}</strong></div>
  <div class="meta">${escapeHtml(formatWhen(payload.dateTimeIso))}</div>
  <div class="meta">Status: <strong>${escapeHtml(payload.statusLabel)}</strong></div>
  <div class="meta">Party size: ${payload.partySize}</div>
  <div class="meta">Reference: <strong>${escapeHtml(payload.referenceId)}</strong></div>

  <table class="items">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;width:48px;">Qty</th>
        <th style="text-align:right;width:72px;">Each</th>
        <th style="text-align:right;width:80px;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${totals}
  ${footerNote}
  <div class="guest">
    <div><strong style="color:#ddd;">Guest</strong></div>
    <div>${escapeHtml(payload.guestName)}</div>
    ${payload.guestEmail ? `<div>${escapeHtml(payload.guestEmail)}</div>` : ''}
  </div>
  <p style="margin-top:32px;font-size:11px;color:#555;">This is a computer-generated receipt for your records.</p>
</body>
</html>`;
}
