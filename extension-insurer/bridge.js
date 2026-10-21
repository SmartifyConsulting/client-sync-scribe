// Runs inside Holarc Wealth. Passes messages between the page and the add-on.
(function () {
  document.documentElement.dataset.holarcAddon = "1";
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin || e.data?.source !== "holarc") return;
    const d = e.data;
    if (!["insurer-login", "insurer-otp", "insurer-email-check", "insurer-pdf-ack", "insurer-scan", "insurer-quote-submit"].includes(d.type)) return;
    // Tell the page straight away that the add-on picked it up.
    if (!["insurer-pdf-ack", "insurer-scan", "insurer-quote-submit"].includes(d.type)) window.postMessage({ source: "holarc-extension", type: "insurer-login-progress", insurer: d.insurer, workflowId: d.workflowId, state: "connecting" }, location.origin);
    chrome.runtime.sendMessage(d).catch(() => window.postMessage({ source: "holarc-extension", type: "insurer-login-result", insurer: d.insurer, workflowId: d.workflowId, ok: false, message: "Refresh Holarc Wealth to reconnect the Companion." }, location.origin));
  });
  chrome.runtime.onMessage.addListener((msg) => {
    window.postMessage({ ...msg, source: "holarc-extension" }, location.origin);
  });
})();
