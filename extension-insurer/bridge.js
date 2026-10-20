// Runs inside Holarc Wealth. Passes messages between the page and the add-on.
(function () {
  document.documentElement.dataset.holarcAddon = "1";
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.source !== "holarc") return;
    const d = e.data;
    if (!["insurer-login", "insurer-otp", "insurer-email-check"].includes(d.type)) return;
    // Tell the page straight away that the add-on picked it up.
    window.postMessage({ source: "holarc-extension", type: "insurer-login-progress", insurer: d.insurer, workflowId: d.workflowId, state: "connecting" }, location.origin);
    chrome.runtime.sendMessage(d);
  });
  chrome.runtime.onMessage.addListener((msg) => {
    window.postMessage({ ...msg, source: "holarc-extension" }, location.origin);
  });
})();
