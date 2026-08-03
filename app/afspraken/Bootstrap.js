"use client";

import { useEffect } from "react";

/**
 * Page-level odds and ends: mark the document as Dutch for screen readers and
 * translators, and register the service worker that makes the app installable
 * and usable without a connection.
 */
export default function Bootstrap({ serviceWorker = true }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = "nl";
    return () => {
      document.documentElement.lang = previous;
    };
  }, []);

  useEffect(() => {
    if (!serviceWorker) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, [serviceWorker]);

  return null;
}
