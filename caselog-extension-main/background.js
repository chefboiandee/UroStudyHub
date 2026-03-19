// Open side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ── External Message Handler (UroStudyHub integration) ──
// Allows external web pages to push cases into SurgiLog
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "surgilog-push-case" && message.case) {
    // Add case to SurgiLog's case list
    chrome.storage.local.get("surgilog-cases", (result) => {
      const cases = result["surgilog-cases"] || [];
      const c = message.case;
      // Ensure required fields
      if (!c.procedure_name) { sendResponse({ ok: false, error: "Missing procedure_name" }); return; }
      c.id = c.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 4));
      cases.push(c);
      chrome.storage.local.set({ "surgilog-cases": cases }, () => {
        sendResponse({ ok: true, count: cases.length, id: c.id });
      });
    });
    return true; // keep channel open for async response
  }

  if (message.type === "surgilog-push-pending" && message.case) {
    // Push directly to pending (auto-fills ACGME on the active tab)
    chrome.storage.local.set({ "surgilog-pending-case": message.case }, () => {
      chrome.tabs.query({ url: "https://apps.acgme.org/*" }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        }
        sendResponse({ ok: true, acgmeTabOpen: !!(tabs && tabs.length > 0) });
      });
    });
    return true;
  }

  if (message.type === "surgilog-ping") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (message.type === "surgilog-get-cases") {
    // Return all cases so external apps can tally ACGME categories
    chrome.storage.local.get("surgilog-cases", (result) => {
      const cases = result["surgilog-cases"] || [];
      // Return lightweight version: just what's needed for counting
      const slim = cases.map(c => ({
        procedure_name: c.procedure_name || "",
        date: c.date || "",
        role: c.role || "",
        attending: c.attending || "",
        hospital: c.hospital || "",
        approach: c.approach || "",
        laterality: c.laterality || "",
        cpt_codes: (c.cpt_codes || []).map(x => x.code || ""),
        is_pediatric: c.is_pediatric || false,
        notes: c.notes || ""
      }));
      sendResponse({ ok: true, cases: slim, count: slim.length });
    });
    return true;
  }
});
