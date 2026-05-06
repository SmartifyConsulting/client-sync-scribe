(function () {
  "use strict";

  const LOGO = chrome.runtime.getURL("vula-symbol.png");

  function el(tag, cls, attrs = {}) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function mountTopLogo() {
    if (document.getElementById("vv-top")) return;
    const wrap = el("div", "vv-overlay vv-top");
    wrap.id = "vv-top";
    const img = el("img"); img.src = LOGO; img.alt = "Vula Vault";
    const word = el("div", "vv-word"); word.textContent = "Vula Vault";
    wrap.append(img, word);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("vv-show"));
  }

  function mountBottomLeft() {
    if (document.getElementById("vv-bl")) return;
    const wrap = el("div", "vv-overlay vv-bl");
    wrap.id = "vv-bl";
    const img = el("img"); img.src = LOGO; img.alt = "Vula";
    const span = el("span"); span.textContent = "Vula Vault";
    wrap.append(img, span);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("vv-show"));
  }

  function findNextButton() {
    const candidates = Array.from(
      document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a[role="button"]')
    );
    return candidates.find((b) => {
      const txt = (b.value || b.textContent || "").trim().toLowerCase();
      return txt === "next" || txt === "next >" || txt === "continue";
    });
  }

  let nextOverlay = null;
  let trackedBtn = null;

  function positionOverlay() {
    if (!trackedBtn || !nextOverlay) return;
    if (!document.body.contains(trackedBtn)) {
      nextOverlay.remove();
      nextOverlay = null;
      trackedBtn = null;
      return;
    }
    const r = trackedBtn.getBoundingClientRect();
    nextOverlay.style.position = "fixed";
    nextOverlay.style.left = r.left + "px";
    nextOverlay.style.top = r.top + "px";
    nextOverlay.style.width = r.width + "px";
    nextOverlay.style.height = r.height + "px";
  }

  function mountNextOverlay() {
    const btn = findNextButton();
    if (!btn) return;
    if (nextOverlay && trackedBtn === btn) { positionOverlay(); return; }
    if (nextOverlay) nextOverlay.remove();

    trackedBtn = btn;
    nextOverlay = el("button", "vv-overlay vv-next vv-show");
    nextOverlay.type = "button";
    nextOverlay.textContent = "NEXT";
    nextOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      try { trackedBtn.click(); } catch (_) {}
    });
    document.body.appendChild(nextOverlay);
    positionOverlay();
  }

  function init() {
    mountTopLogo();
    mountBottomLeft();
    mountNextOverlay();
  }

  window.addEventListener("resize", () => { positionOverlay(); mountNextOverlay(); }, { passive: true });
  window.addEventListener("scroll", positionOverlay, { passive: true });

  const mo = new MutationObserver(() => {
    if (!document.getElementById("vv-top")) mountTopLogo();
    if (!document.getElementById("vv-bl")) mountBottomLeft();
    mountNextOverlay();
  });

  function start() {
    init();
    mo.observe(document.body, { childList: true, subtree: true });
    setInterval(positionOverlay, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
