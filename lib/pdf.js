import { jsPDF } from "jspdf";

const CURRENCY = {
  USD: { sym: "$", code: "USD" },
  EUR: { sym: "\u20ac", code: "EUR" },
  GBP: { sym: "\u00a3", code: "GBP" },
};

function money(n, cur) {
  const c = CURRENCY[cur] || CURRENCY.USD;
  const v = (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${c.sym}${v}`;
}

export function computeTotals(data) {
  let subtotal = 0;
  let taxTotal = 0;
  (data.items || []).forEach((it) => {
    const line = (Number(it.qty) || 0) * (Number(it.price) || 0);
    subtotal += line;
    taxTotal += line * ((Number(it.tax) || 0) / 100);
  });
  return {
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
  };
}

export function generatePdf(data, isPaid) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const accent = data.accent || "#2563eb";
  const cur = data.currency || "USD";
  let y = 56;

  // --- header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text(data.docType === "credit" ? "Credit note" : "Invoice", M, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const rightX = W - M;
  let hy = 44;
  if (data.number) { doc.text(`No. ${data.number}`, rightX, hy, { align: "right" }); hy += 15; }
  if (data.date) { doc.text(`Date: ${data.date}`, rightX, hy, { align: "right" }); hy += 15; }
  if (data.dueDate) { doc.text(`Due: ${data.dueDate}`, rightX, hy, { align: "right" }); hy += 15; }

  y += 30;

  // --- from / to ---
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("FROM", M, y);
  doc.text("BILL TO", W / 2 + 10, y);
  y += 15;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const fromLines = [
    data.fromCompany, data.fromName, data.fromAddress, data.fromCityZip,
    data.fromTaxId ? `Tax ID: ${data.fromTaxId}` : "", data.fromEmail,
  ].filter(Boolean);
  const toLines = [
    data.toName, data.toAddress, data.toCityZip,
    data.toTaxId ? `Tax ID: ${data.toTaxId}` : "", data.toEmail,
  ].filter(Boolean);

  const blockY = y;
  fromLines.forEach((l, i) => doc.text(String(l), M, blockY + i * 14));
  toLines.forEach((l, i) => doc.text(String(l), W / 2 + 10, blockY + i * 14));

  y = blockY + Math.max(fromLines.length, toLines.length) * 14 + 24;

  // --- table header ---
  doc.setFillColor(accent);
  doc.rect(M, y, W - M * 2, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", M + 8, y + 16);
  doc.text("QTY", W - M - 250, y + 16, { align: "right" });
  doc.text("PRICE", W - M - 160, y + 16, { align: "right" });
  doc.text("TAX", W - M - 90, y + 16, { align: "right" });
  doc.text("AMOUNT", W - M - 8, y + 16, { align: "right" });
  y += 24;

  // --- rows ---
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  (data.items || []).forEach((it, idx) => {
    const line = (Number(it.qty) || 0) * (Number(it.price) || 0);
    if (idx % 2 === 1) {
      doc.setFillColor(247, 248, 250);
      doc.rect(M, y, W - M * 2, 22, "F");
    }
    doc.setFontSize(10);
    doc.text(String(it.desc || ""), M + 8, y + 15, { maxWidth: 220 });
    doc.text(String(it.qty || 0), W - M - 250, y + 15, { align: "right" });
    doc.text(money(it.price, cur), W - M - 160, y + 15, { align: "right" });
    doc.text(`${Number(it.tax) || 0}%`, W - M - 90, y + 15, { align: "right" });
    doc.text(money(line, cur), W - M - 8, y + 15, { align: "right" });
    y += 22;
  });

  // --- totals ---
  const t = computeTotals(data);
  y += 12;
  const tx = W - M - 8;
  const lx = W - M - 170;
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("Subtotal", lx, y, { align: "left" });
  doc.text(money(t.subtotal, cur), tx, y, { align: "right" });
  y += 18;
  doc.text("Tax", lx, y, { align: "left" });
  doc.text(money(t.taxTotal, cur), tx, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(lx, y, tx, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Total", lx, y, { align: "left" });
  doc.text(money(t.total, cur), tx, y, { align: "right" });

  // --- payment / notes ---
  y += 34;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  if (data.fromIban) { doc.text(`Payment: ${data.fromIban}`, M, y); y += 14; }
  if (data.notes) { doc.text(String(data.notes), M, y, { maxWidth: W - M * 2 }); y += 14; }

  // --- watermark for free tier ---
  if (!isPaid) {
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text(
      "Made with InvoiceFast \u2014 invoicefast.app",
      W / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: "center" }
    );
  }

  return doc;
}
