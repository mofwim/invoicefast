"use client";

import { useEffect, useState } from "react";
import Icon from "../../../../components/Icons";

export default function CopyBlock({ code }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard permission denied — the code is on screen to select by hand.
      setCopied(false);
    }
  };

  return (
    <div className="ma-code">
      <pre><code>{code}</code></pre>
      <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
        <Icon name={copied ? "check" : "file"} size={14} />
        {copied ? "Gekopieerd" : "Kopiëren"}
      </button>
    </div>
  );
}
