/**
 * Mijn Afspraken — widget loader.
 *
 * Drop one script tag on any page and the appointment list appears where the
 * tag sits. It renders in an iframe, so nothing here can collide with the host
 * page's CSS or JavaScript, and the frame resizes itself as the list changes.
 *
 *   <script src="https://example.com/embed.js"
 *           data-mijn-afspraken
 *           data-tab="binnenkort"
 *           data-ics="https://…/basic.ics"></script>
 *
 * Attributes, all optional:
 *   data-tab     voorbij | binnenkort | later   (default: binnenkort)
 *   data-theme   light | dark | auto            (default: follow the device)
 *   data-ics     a calendar link to preload
 *   data-height  starting height in pixels      (default: 540)
 *   data-target  CSS selector to render into instead of next to the script
 *   data-origin  where the widget is hosted     (default: this script's origin)
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("embed.js") !== -1) {
        script = all[i];
        break;
      }
    }
  }
  if (!script || script.getAttribute("data-mijn-afspraken-ready")) return;
  script.setAttribute("data-mijn-afspraken-ready", "1");

  function attr(name, fallback) {
    var value = script.getAttribute("data-" + name);
    return value === null || value === "" ? fallback : value;
  }

  var origin = attr("origin", "");
  if (!origin) {
    try {
      origin = new URL(script.src, window.location.href).origin;
    } catch (e) {
      origin = "";
    }
  }

  var tab = attr("tab", "binnenkort");
  if (["voorbij", "binnenkort", "later"].indexOf(tab) === -1) tab = "binnenkort";

  var src = origin + "/embed/afspraken?tab=" + encodeURIComponent(tab);

  var theme = attr("theme", "");
  if (["light", "dark", "auto"].indexOf(theme) !== -1) src += "&theme=" + theme;

  var ics = attr("ics", "");
  if (ics) src += "&ics=" + encodeURIComponent(ics);

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Mijn Afspraken";
  iframe.loading = "lazy";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.allow = "clipboard-write";
  iframe.style.cssText =
    "display:block;width:100%;border:0;max-width:100%;height:" +
    (parseInt(attr("height", "540"), 10) || 540) +
    "px;transition:height .18s ease;color-scheme:normal;";

  var target = attr("target", "");
  var mount = target ? document.querySelector(target) : null;
  if (mount) mount.appendChild(iframe);
  else script.parentNode.insertBefore(iframe, script.nextSibling);

  window.addEventListener("message", function (event) {
    if (origin && event.origin !== origin) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== "mijn-afspraken:height") return;
    var height = parseInt(data.height, 10);
    if (height > 80 && height < 20000) iframe.style.height = height + "px";
  });
})();
