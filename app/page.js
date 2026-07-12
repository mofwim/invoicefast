"use client";

import { useState, useEffect } from "react";
import { computeTotals } from "../lib/pdf";

const CUR = { USD: "$", EUR: "\u20ac", GBP: "\u00a3" };

const PAID_KEY = "invoicefast_paid";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [paid, setPaid] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const [data, setData] = useState({
    docType: "invoice",
    number: "1001",
    date: todayISO(),
    dueDate: "",
    currency: "USD",
    accent: "#2563eb",
    fromCompany: "",
    fromName: "",
    fromAddress: "",
    fromCityZip: "",
    fromTaxId: "",
    fromIban: "",
    fromEmail: "",
    toName: "",
    toAddress: "",
    toCityZip: "",
    toTaxId: "",
    toEmail: "",
    notes: "",
    items: [{ desc: "", qty: 1, price: 0, tax: 0 }],
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(PAID_KEY) === "1") setPaid(true);
      const saved = localStorage.getItem("invoicefast_data");
      if (saved) setData((d) => ({ ...d, ...JSON.parse(saved) }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("invoicefast_data", JSON.stringify(data));
    } catch (e) {}
  }, [data]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setItem = (i, k, v) =>
    setData((d) => {
      const items = d.items.slice();
      items[i] = { ...items[i], [k]: v };
      return { ...d, items };
    });
  const addItem = () =>
    setData((d) => ({ ...d, items: [...d.items, { desc: "", qty: 1, price: 0, tax: 0 }] }));
  const removeItem = (i) =>
    setData((d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }));

  const totals = computeTotals(data);
  const sym = CUR[data.currency] || "$";
  const canDownload = data.fromName && data.toName && data.items.some((it) => it.desc);

  async function download() {
    const { generatePdf } = await import("../lib/pdf");
    const doc = generatePdf(data, paid);
    doc.save(`${data.docType}-${data.number || "draft"}.pdf`);
  }

  function unlock() {
    // Demo unlock. In production, wire this to Stripe/LemonSqueezy checkout success.
    try { localStorage.setItem(PAID_KEY, "1"); } catch (e) {}
    setPaid(true);
    setShowPay(false);
  }

  return (
    <main className="wrap">
      <header className="top">
        <div className="brand">
          <span className="logo">▮▮</span> InvoiceFast
        </div>
        <div className="tagline">Free invoice generator — no signup</div>
        {paid ? (
          <span className="pro-badge">Pro</span>
        ) : (
          <button className="ghost" onClick={() => setShowPay(true)}>Remove watermark</button>
        )}
      </header>

      <div className="grid">
        {/* ---------- FORM ---------- */}
        <section className="form">
          <div className="card">
            <div className="row">
              <label>
                Type
                <select value={data.docType} onChange={(e) => set("docType", e.target.value)}>
                  <option value="invoice">Invoice</option>
                  <option value="credit">Credit note</option>
                </select>
              </label>
              <label>
                Currency
                <select value={data.currency} onChange={(e) => set("currency", e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </label>
            </div>
            <div className="row">
              <label>Number<input value={data.number} onChange={(e) => set("number", e.target.value)} /></label>
              <label>Date<input type="date" value={data.date} onChange={(e) => set("date", e.target.value)} /></label>
              <label>Due date<input type="date" value={data.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
            </div>
          </div>

          <div className="card">
            <h3>From</h3>
            <input placeholder="Business name" value={data.fromCompany} onChange={(e) => set("fromCompany", e.target.value)} />
            <input placeholder="Your name" value={data.fromName} onChange={(e) => set("fromName", e.target.value)} />
            <input placeholder="Address" value={data.fromAddress} onChange={(e) => set("fromAddress", e.target.value)} />
            <input placeholder="City, ZIP" value={data.fromCityZip} onChange={(e) => set("fromCityZip", e.target.value)} />
            <div className="row">
              <input placeholder="Tax ID / VAT (optional)" value={data.fromTaxId} onChange={(e) => set("fromTaxId", e.target.value)} />
              <input placeholder="Email" value={data.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} />
            </div>
            <input placeholder="Payment details / IBAN (optional)" value={data.fromIban} onChange={(e) => set("fromIban", e.target.value)} />
          </div>

          <div className="card">
            <h3>Bill to</h3>
            <input placeholder="Client name / company" value={data.toName} onChange={(e) => set("toName", e.target.value)} />
            <input placeholder="Address" value={data.toAddress} onChange={(e) => set("toAddress", e.target.value)} />
            <input placeholder="City, ZIP" value={data.toCityZip} onChange={(e) => set("toCityZip", e.target.value)} />
            <div className="row">
              <input placeholder="Tax ID / VAT (optional)" value={data.toTaxId} onChange={(e) => set("toTaxId", e.target.value)} />
              <input placeholder="Email" value={data.toEmail} onChange={(e) => set("toEmail", e.target.value)} />
            </div>
          </div>

          <div className="card">
            <h3>Items</h3>
            <div className="items-head">
              <span>Description</span><span>Qty</span><span>Price</span><span>Tax %</span><span></span>
            </div>
            {data.items.map((it, i) => (
              <div className="item-row" key={i}>
                <input placeholder="Service or product" value={it.desc} onChange={(e) => setItem(i, "desc", e.target.value)} />
                <input type="number" min="0" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
                <input type="number" min="0" step="0.01" value={it.price} onChange={(e) => setItem(i, "price", e.target.value)} />
                <input type="number" min="0" value={it.tax} onChange={(e) => setItem(i, "tax", e.target.value)} />
                <button className="del" onClick={() => removeItem(i)} aria-label="Remove">×</button>
              </div>
            ))}
            <button className="add" onClick={addItem}>+ Add item</button>
          </div>

          <div className="card">
            <h3>Notes</h3>
            <textarea placeholder="Thank you for your business. Payment due within 14 days." value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </section>

        {/* ---------- PREVIEW ---------- */}
        <aside className="preview-col">
          <div className="preview">
            <div className="pv-head">
              <div className="pv-title">{data.docType === "credit" ? "Credit note" : "Invoice"}</div>
              <div className="pv-meta">
                {data.number && <div>No. {data.number}</div>}
                {data.date && <div>Date: {data.date}</div>}
                {data.dueDate && <div>Due: {data.dueDate}</div>}
              </div>
            </div>
            <div className="pv-parties">
              <div>
                <div className="pv-label">From</div>
                <div>{data.fromCompany}</div><div>{data.fromName}</div>
                <div>{data.fromAddress}</div><div>{data.fromCityZip}</div>
              </div>
              <div>
                <div className="pv-label">Bill to</div>
                <div>{data.toName}</div><div>{data.toAddress}</div><div>{data.toCityZip}</div>
              </div>
            </div>
            <table className="pv-table">
              <thead style={{ background: data.accent }}>
                <tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.desc || "—"}</td>
                    <td>{it.qty}</td>
                    <td>{sym}{Number(it.price || 0).toFixed(2)}</td>
                    <td>{sym}{((Number(it.qty)||0)*(Number(it.price)||0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pv-totals">
              <div><span>Subtotal</span><span>{sym}{totals.subtotal.toFixed(2)}</span></div>
              <div><span>Tax</span><span>{sym}{totals.taxTotal.toFixed(2)}</span></div>
              <div className="pv-grand"><span>Total</span><span>{sym}{totals.total.toFixed(2)}</span></div>
            </div>
            {!paid && <div className="pv-watermark">Made with InvoiceFast</div>}
          </div>

          <button className="download" onClick={download} disabled={!canDownload}>
            {canDownload ? "Download PDF" : "Fill name, client, and one item"}
          </button>
          {!paid && (
            <p className="pv-hint">
              Free PDF includes a small watermark.{" "}
              <button className="link" onClick={() => setShowPay(true)}>Remove it for $9</button>
            </p>
          )}
        </aside>
      </div>

      {showPay && (
        <div className="modal-bg" onClick={() => setShowPay(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Remove the watermark</h2>
            <p>One-time payment. Unlock clean, watermark-free PDFs forever on this device, plus your logo color and saved details.</p>
            <div className="price">$9 <span>one-time</span></div>
            <button className="pay" onClick={unlock}>Unlock now</button>
            <p className="fineprint">
              This demo unlocks instantly. Before launch, connect this button to Stripe or Lemon Squeezy checkout and call unlock on success.
            </p>
            <button className="link" onClick={() => setShowPay(false)}>Maybe later</button>
          </div>
        </div>
      )}
    </main>
  );
}
