"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Actions, Field, Note, Panel, Segmented, Slider, download, Icon } from "../ui";
import { EC_LEVELS, encodeQr, qrToSvg, wifiPayload } from "../../../lib/tools/qr";
import { describeError } from "../../../lib/tools/errors";
import { toolStrings } from "../../../lib/i18n/tools";

/** What the phone should do with it, built from the fields for that kind. */
function payloadFor(kind, fields) {
  if (kind === "url") {
    const value = fields.url.trim();
    if (!value) return "";
    // A bare domain is what people type; a scheme is what a scanner needs.
    return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  }
  if (kind === "wifi") {
    return fields.ssid.trim()
      ? wifiPayload({
          ssid: fields.ssid,
          password: fields.password,
          security: fields.security,
          hidden: fields.hidden,
        })
      : "";
  }
  if (kind === "phone") {
    const number = fields.phone.replace(/[^\d+]/g, "");
    return number ? `tel:${number}` : "";
  }
  if (kind === "email") {
    if (!fields.email.trim()) return "";
    const query = [
      fields.subject && `subject=${encodeURIComponent(fields.subject)}`,
      fields.body && `body=${encodeURIComponent(fields.body)}`,
    ]
      .filter(Boolean)
      .join("&");
    return `mailto:${fields.email.trim()}${query ? `?${query}` : ""}`;
  }
  return fields.text;
}

export default function QrCode({ locale = "nl" }) {
  const t = toolStrings("qr-code", locale);
  const [kind, setKind] = useState("url");
  const [level, setLevel] = useState("M");
  const [scale, setScale] = useState(8);
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [fields, setFields] = useState({
    text: "",
    url: "",
    ssid: "",
    password: "",
    security: "WPA",
    hidden: false,
    phone: "",
    email: "",
    subject: "",
    body: "",
  });

  const set = (key) => (event) =>
    setFields((current) => ({
      ...current,
      [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
    }));

  const payload = payloadFor(kind, fields);

  const { svg, qr, error } = useMemo(() => {
    if (!payload) return { svg: "", qr: null, error: "" };
    try {
      const code = encodeQr(payload, { level });
      return { svg: qrToSvg(code, { scale, margin: 4, dark, light }), qr: code, error: "" };
    } catch (err) {
      return { svg: "", qr: null, error: describeError(t, err) };
    }
  }, [payload, level, scale, dark, light, t]);

  // The PNG is drawn from the SVG rather than from a second renderer, so the
  // file that gets saved is the picture that was on screen.
  const canvasRef = useRef(null);
  const [pngUrl, setPngUrl] = useState("");
  useEffect(() => {
    if (!svg) {
      setPngUrl("");
      return undefined;
    }
    let cancelled = false;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current || document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => !cancelled && blob && setPngUrl(URL.createObjectURL(blob)), "image/png");
      URL.revokeObjectURL(url);
    };
    image.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [svg, light]);

  useEffect(() => () => pngUrl && URL.revokeObjectURL(pngUrl), [pngUrl]);

  return (
    <>
      <Panel>
        <Field label={t("kind")}>
          <Segmented
            label={t("kind")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "url", label: t("kindUrl") },
              { value: "text", label: t("kindText") },
              { value: "wifi", label: t("kindWifi") },
              { value: "phone", label: t("kindPhone") },
              { value: "email", label: t("kindEmail") },
            ]}
          />
        </Field>

        {kind === "url" && (
          <Field label={t("urlLabel")}>
            {(id) => (
              <input
                id={id}
                type="text"
                inputMode="url"
                value={fields.url}
                onChange={set("url")}
                placeholder="invoicefast.app"
              />
            )}
          </Field>
        )}

        {kind === "text" && (
          <textarea
            className="tp-text"
            rows={4}
            value={fields.text}
            onChange={set("text")}
            placeholder={t("textPlaceholder")}
            aria-label={t("textLabel")}
          />
        )}

        {kind === "wifi" && (
          <>
            <Field label={t("ssid")}>
              {(id) => <input id={id} type="text" value={fields.ssid} onChange={set("ssid")} />}
            </Field>
            <Field label={t("security")}>
              <Segmented
                label={t("security")}
                value={fields.security}
                onChange={(value) => setFields((current) => ({ ...current, security: value }))}
                options={[
                  { value: "WPA", label: "WPA/WPA2" },
                  { value: "WEP", label: "WEP" },
                  { value: "nopass", label: t("open") },
                ]}
              />
            </Field>
            {fields.security !== "nopass" && (
              <Field label={t("password")}>
                {(id) => <input id={id} type="text" value={fields.password} onChange={set("password")} />}
              </Field>
            )}
            <Field label={t("hidden")}>
              <input type="checkbox" className="tp-switch" checked={fields.hidden} onChange={set("hidden")} />
            </Field>
          </>
        )}

        {kind === "phone" && (
          <Field label={t("phoneLabel")}>
            {(id) => (
              <input id={id} type="tel" value={fields.phone} onChange={set("phone")} placeholder="+31 6 1234 5678" />
            )}
          </Field>
        )}

        {kind === "email" && (
          <>
            <Field label={t("emailLabel")}>
              {(id) => <input id={id} type="email" value={fields.email} onChange={set("email")} />}
            </Field>
            <Field label={t("subject")}>
              {(id) => <input id={id} type="text" value={fields.subject} onChange={set("subject")} />}
            </Field>
            <Field label={t("body")}>
              {(id) => <input id={id} type="text" value={fields.body} onChange={set("body")} />}
            </Field>
          </>
        )}
      </Panel>

      <Panel title={t("look")}>
        <Field label={t("level")} hint={t("levelHint")}>
          <Segmented
            label={t("level")}
            value={level}
            onChange={setLevel}
            options={EC_LEVELS.map((value) => ({ value, label: value }))}
          />
        </Field>
        <Field label={t("scale")}>
          <Slider value={scale} onChange={setScale} min={4} max={20} suffix="×" />
        </Field>
        <Field label={t("dark")}>
          {(id) => <input id={id} type="color" value={dark} onChange={(event) => setDark(event.target.value)} />}
        </Field>
        <Field label={t("light")}>
          {(id) => <input id={id} type="color" value={light} onChange={(event) => setLight(event.target.value)} />}
        </Field>
      </Panel>

      {error && <Note kind="error">{error}</Note>}

      {!payload && !error && <Note kind="warn">{t("nothing")}</Note>}

      {svg && qr && (
        <Panel title={t("result")}>
          <div
            className="tp-qr"
            role="img"
            aria-label={t("alt")}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="tp-hint">{t("made", { version: qr.version, size: qr.size })}</p>
          <Actions>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!pngUrl}
              onClick={() => {
                const link = document.createElement("a");
                link.href = pngUrl;
                link.download = "qr-code.png";
                link.click();
              }}
            >
              <Icon name="download" size={16} /> {t("savePng")}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => download("qr-code.svg", svg, "image/svg+xml")}
            >
              <Icon name="download" size={16} /> {t("saveSvg")}
            </button>
          </Actions>
          <p className="tp-hint">{t("svgHint")}</p>
        </Panel>
      )}
    </>
  );
}
