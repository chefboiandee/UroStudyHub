// ═══════════════════════════════════════════════════════════════
// SurgiLog — ACGME Auto-Filler (Content Script)
// Injected automatically on ACGME case log pages
// ═══════════════════════════════════════════════════════════════

(function(){
if(document.getElementById('surgilog-fill-btn')) return;

var isFilling = false;

// ── Dynamic Role Matching ──
// Searches the actual ACGME ResidentRoles dropdown — works for any program
function findRoleValue(roleName) {
  if (!roleName) return null;
  function normRoleText(v) {
    return String(v || '')
      .toLowerCase()
      .replace(/\basst\b/g, 'assistant')
      .replace(/\bjr\b/g, 'junior')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var full = normRoleText(roleName);
  var rk = full.replace(/\b(primary|chief|junior|jr|sr|senior|resident)\b/g, '').replace(/\s+/g, ' ').trim();
  var wantsTeaching = full.indexOf('teaching') !== -1;
  var wantsSurgeon = full.indexOf('surgeon') !== -1;
  var wantsJunior = full.indexOf('junior') !== -1;
  var wantsChief = full.indexOf('chief') !== -1 || full.indexOf('primary') !== -1;
  var wantsAssistant = full.indexOf('assistant') !== -1;
  var sel = document.getElementById('ResidentRoles');
  if (!sel) return null;
  var opts = sel.querySelectorAll('option');
  // Exact match first
  for (var i = 0; i < opts.length; i++) {
    var ot = normRoleText(opts[i].textContent);
    if (!opts[i].value) continue;
    if (ot === full) return opts[i].value;
  }
  // Explicit "Surgeon Chief" / "Surgeon Jr." style match before generic keyword mapping
  if (wantsSurgeon && wantsChief) {
    for (var i = 0; i < opts.length; i++) {
      var ot = normRoleText(opts[i].textContent);
      if (!opts[i].value) continue;
      if (ot.indexOf('surgeon') !== -1 && (ot.indexOf('chief') !== -1 || ot.indexOf('primary') !== -1)) return opts[i].value;
    }
  }
  if (wantsSurgeon && wantsJunior) {
    for (var i = 0; i < opts.length; i++) {
      var ot = normRoleText(opts[i].textContent);
      if (!opts[i].value) continue;
      if (ot.indexOf('surgeon') !== -1 && ot.indexOf('junior') !== -1) return opts[i].value;
    }
  }
  // Key word matching — map LLM output to ACGME role options
  // "Surgeon Chief" / "Surgeon" → first option containing "surgeon"
  // "First Assistant" / "Assistant" → first option containing "assistant" (not "teaching")
  // "Teaching Asst." → option containing "teaching"
  for (var i = 0; i < opts.length; i++) {
    var ot = normRoleText(opts[i].textContent);
    if (!opts[i].value) continue;
    if (wantsTeaching && ot.indexOf('teaching') !== -1) return opts[i].value;
    if (wantsSurgeon && ot.indexOf('surgeon') !== -1) {
      if (!wantsTeaching && ot.indexOf('teaching') !== -1) continue;
      return opts[i].value;
    }
    if (wantsAssistant && !wantsTeaching && ot.indexOf('assistant') !== -1 && ot.indexOf('teaching') === -1) return opts[i].value;
  }
  // Partial fallback
  for (var i = 0; i < opts.length; i++) {
    var ot = normRoleText(opts[i].textContent);
    if (!opts[i].value) continue;
    if (!wantsTeaching && ot.indexOf('teaching') !== -1) continue;
    if (ot.indexOf(rk) !== -1 || rk.indexOf(ot) !== -1) return opts[i].value;
  }
  return null;
}

// ── Dynamic Dropdown Setter ──
// clearFirst=true for Select2 dropdowns that get "sticky" (like Attendings)
// clearFirst=false for regular selects where clearing causes resets (like Institutions)
async function setDropdown(domId, value, label, L, clearFirst) {
  if (!value) { L.push('MISS '+label+' - no match found, set manually'); return; }

  var nativeEl = document.getElementById(domId);

  // Step 1: Native DOM — set .selected on the right option
  if (nativeEl && nativeEl.options) {
    for (var i = 0; i < nativeEl.options.length; i++) {
      nativeEl.options[i].selected = (nativeEl.options[i].value === value);
    }
    nativeEl.value = value;
    nativeEl.dispatchEvent(new Event('change', {bubbles:true}));
    nativeEl.dispatchEvent(new Event('input', {bubbles:true}));
  }

  // Step 2: jQuery / Select2 — only clear first if explicitly requested
  if (typeof $ !== 'undefined') {
    try {
      var $el = $('#'+domId);
      if ($el.length) {
        if (clearFirst) {
          try { $el.val(null).trigger('change'); } catch(e){}
          await wait(150);
        }
        $el.val(value).trigger('change');
        try { $el.trigger('change.select2'); } catch(e){}
      }
    } catch(e){}
  }

  // Step 3: Re-confirm native value (jQuery may have changed it)
  if (nativeEl) {
    if (nativeEl.value !== value) {
      nativeEl.value = value;
      nativeEl.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  await wait(100);
  L.push(label);
}

// Dynamic attending match — searches the actual ACGME dropdown instead of hardcoded IDs
// Works for ANY residency program
function findAttendingValue(name) {
  var ak = name.toLowerCase().replace(/^dr\.?\s*/, '');
  // Try Select2 data first (jQuery select2 stores all options)
  if (typeof $ !== 'undefined') {
    try {
      var data = $('#Attendings').find('option');
      if (data && data.length) {
        // Try exact last-name match first
        for (var i = 0; i < data.length; i++) {
          var optText = data[i].textContent.toLowerCase().trim();
          var optVal = data[i].value;
          if (!optVal) continue;
          // Last name match: "smith" matches "Smith, John"
          var optLast = optText.split(',')[0].trim();
          if (optLast === ak || ak === optText) return optVal;
        }
        // Fuzzy: partial match
        for (var i = 0; i < data.length; i++) {
          var optText = data[i].textContent.toLowerCase().trim();
          var optVal = data[i].value;
          if (!optVal) continue;
          if (optText.indexOf(ak) !== -1 || ak.indexOf(optText.split(',')[0].trim()) !== -1) return optVal;
        }
      }
    } catch(e) {}
  }
  // Fallback: native DOM select
  var sel = document.getElementById('Attendings');
  if (sel) {
    var opts = sel.querySelectorAll('option');
    for (var i = 0; i < opts.length; i++) {
      var ot = opts[i].textContent.toLowerCase().trim();
      var ov = opts[i].value;
      if (!ov) continue;
      var oLast = ot.split(',')[0].trim();
      if (oLast === ak || ak === ot) return ov;
    }
    for (var i = 0; i < opts.length; i++) {
      var ot = opts[i].textContent.toLowerCase().trim();
      var ov = opts[i].value;
      if (!ov) continue;
      if (ot.indexOf(ak) !== -1 || ak.indexOf(ot.split(',')[0].trim()) !== -1) return ov;
    }
  }
  return null;
}

function wait(ms){ return new Promise(function(r){ setTimeout(r,ms) }) }

// ── Page-Context jQuery Bridge ──
// Content scripts run in Chrome's isolated world and can't access the page's jQuery.
// This injects a persistent listener into the page's main world at load time.
// During fill, we use window.postMessage to tell it to set dropdown values via jQuery.
(function injectPageBridge() {
  var bridge = document.createElement('script');
  bridge.src = chrome.runtime.getURL('page-bridge.js');
  document.documentElement.appendChild(bridge);
  bridge.onload = function() { bridge.remove(); };
})();

function setSelectViaPageContext(selectId, value) {
  window.postMessage({ type: 'caselog-set-select', id: selectId, value: String(value) }, '*');
}

function isRowPediatric(row) {
  var txt = row.textContent.toLowerCase();
  return (txt.indexOf('pediatric') !== -1 ||
          txt.indexOf('infant') !== -1 ||
          txt.indexOf('preterm') !== -1 ||
          txt.indexOf('< 6 month') !== -1 ||
          txt.indexOf('orchiopexy') !== -1 && txt.indexOf('minor') !== -1);
}

function matchSite(siteName) {
  // Dynamic site matching — searches the actual ACGME dropdown
  // Works for ANY residency program
  var sk = siteName.toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();
  var words = sk.split(/\s+/);
  var sel = document.getElementById('Institutions');
  if(sel){
    var opts = sel.querySelectorAll('option');
    // Exact match first
    for(var o=0;o<opts.length;o++){
      var ot = opts[o].textContent.toLowerCase().trim();
      if(ot === sk) return opts[o].value;
    }
    // Substring match
    for(var o=0;o<opts.length;o++){
      var ot = opts[o].textContent.toLowerCase().trim();
      if(!opts[o].value) continue;
      if(ot.indexOf(sk)!==-1 || sk.indexOf(ot)!==-1) return opts[o].value;
    }
    // Word match — score by number of matching words, pick best match
    // (old code returned first single-word hit, e.g. "hospital" always matched Children's)
    var bestScore = 0, bestVal = null;
    for(var o=0;o<opts.length;o++){
      var ot = opts[o].textContent.toLowerCase();
      if(!opts[o].value) continue;
      var score = 0;
      for(var w=0;w<words.length;w++){
        if(words[w].length>=4 && ot.indexOf(words[w])!==-1) score++;
      }
      if(score > bestScore){ bestScore = score; bestVal = opts[o].value; }
    }
    if(bestVal) return bestVal;
  }
  return null;
}

function checkAttributes(row, attrs, L, cpt) {
  if(!attrs||!attrs.length) return;
  var cbs=row.querySelectorAll('input.cbCodeAttribute');
  for(var i=0;i<cbs.length;i++){
    var lb=cbs[i].closest('label');
    var lt=lb?lb.textContent.trim().toLowerCase():'';
    for(var a=0;a<attrs.length;a++){
      if(lt.indexOf(attrs[a])!==-1){
        cbs[i].checked=true;
        cbs[i].dispatchEvent(new Event('change',{bubbles:true}));
        if(L) L.push('['+cpt+'] checked: '+lb.textContent.trim());
      }
    }
  }
}

function clickAdd(row) {
  var btns=row.querySelectorAll('button');
  for(var i=0;i<btns.length;i++){
    var t=btns[i].textContent.trim();
    if(t==='Add'||btns[i].classList.contains('btnCodeAdd')){
      btns[i].disabled=false;
      btns[i].click();
      return true;
    }
  }
  return false;
}

function setInputValue(el, value) {
  if (!el) return false;
  try {
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, value);
    else el.value = value;
  } catch(_) {
    el.value = value;
  }
  el.setAttribute('value', value);
  el.focus();
  el.dispatchEvent(new Event('focus', { bubbles: true }));
  try { el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); }
  catch(_) { el.dispatchEvent(new Event('input', { bubbles: true })); }
  el.dispatchEvent(new Event('keyup', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  return normalizeCaseIdForForm(el.value) === normalizeCaseIdForForm(value);
}

function normalizeCaseIdForForm(v) {
  return String(v || '').replace(/\D/g, '').slice(0, 24);
}
function generateCaseIdLocal(d) {
  var dateRaw = String((d && d.date) || '');
  var m = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  var now = new Date();
  var yy = m ? String(m[3]).slice(2) : String(now.getFullYear()).slice(2);
  var mm = m ? String(m[1]).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
  var dd = m ? String(m[2]).padStart(2, '0') : String(now.getDate()).padStart(2, '0');
  var cpt = '0000';
  if (d && d.cpt_codes && d.cpt_codes.length) {
    var first = d.cpt_codes[0];
    cpt = String((first && first.code) || '').replace(/\D/g, '').slice(0, 4).padEnd(4, '0') || '0000';
  }
  var suffix = String(Date.now()).slice(-6);
  return normalizeCaseIdForForm(yy + mm + dd + cpt + suffix);
}
function isVisibleEditableInput(el) {
  if (!el || el.tagName !== 'INPUT') return false;
  if (el.disabled || el.readOnly) return false;
  if (el.type && ['hidden', 'checkbox', 'radio', 'submit', 'button'].indexOf(el.type.toLowerCase()) !== -1) return false;
  return !!(el.offsetParent || el.getClientRects().length);
}

function findCaseIdInput() {
  // ACGME often renders randomized id/name, but keeps validation metadata.
  var byValidation = document.querySelectorAll('input[data-val-required], input[data-valmsg-replace], input[maxlength="25"]');
  for (var vi = 0; vi < byValidation.length; vi++) {
    var v = byValidation[vi];
    if (!isVisibleEditableInput(v)) continue;
    var req = String(v.getAttribute('data-val-required') || '').toLowerCase();
    var title = String(v.getAttribute('data-bs-original-title') || '').toLowerCase();
    var aria = String(v.getAttribute('aria-label') || '').toLowerCase();
    var meta = req + ' ' + title + ' ' + aria;
    if (meta.indexOf('case id') !== -1 || meta.indexOf('case identifier') !== -1) return v;
  }

  var ids = ['CaseId', 'CaseID', 'CaseIdentifier', 'CaseNumber', 'ProcedureCaseId', 'UniqueCaseId', 'ProcedureCaseNumber', 'CaseLogId', 'CaseCode'];
  for (var i = 0; i < ids.length; i++) {
    var byId = document.getElementById(ids[i]);
    if (isVisibleEditableInput(byId)) return byId;
  }

  var named = document.querySelectorAll('input[name], input[id]');
  for (var ni = 0; ni < named.length; ni++) {
    var n = named[ni];
    if (!isVisibleEditableInput(n)) continue;
    var key = ((n.name || '') + ' ' + (n.id || '')).toLowerCase();
    if (/(^|[^a-z])(case[\s_-]*id|case[\s_-]*identifier|procedure[\s_-]*case[\s_-]*id|unique[\s_-]*case[\s_-]*id)([^a-z]|$)/.test(key)) {
      return n;
    }
  }

  var labels = document.querySelectorAll('label');
  for (var li = 0; li < labels.length; li++) {
    var lt = (labels[li].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (lt.indexOf('case id') !== -1 || lt.indexOf('case identifier') !== -1) {
      var forId = labels[li].getAttribute('for');
      if (forId) {
        var byFor = document.getElementById(forId);
        if (isVisibleEditableInput(byFor)) return byFor;
      }
      var wrapped = labels[li].querySelector('input');
      if (isVisibleEditableInput(wrapped)) return wrapped;
    }
  }

  // Some ACGME pages render "Case ID*" in plain div/span text instead of <label>.
  var nodes = document.querySelectorAll('div, span, p, td, th, strong, b');
  for (var k = 0; k < nodes.length; k++) {
    var txt = (nodes[k].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (txt === 'case id*' || txt === 'case id' || txt.indexOf('case id*') === 0 || txt.indexOf('case id') === 0) {
      var container = nodes[k].closest('div, td, th, tr, section, form');
      if (!container) continue;
      var localInput = container.querySelector('input');
      if (isVisibleEditableInput(localInput)) return localInput;
      var sib = nodes[k].nextElementSibling;
      while (sib) {
        var sibInput = sib.querySelector ? sib.querySelector('input') : null;
        if (isVisibleEditableInput(sibInput)) return sibInput;
        sib = sib.nextElementSibling;
      }
    }
  }
  return null;
}

function getArea(row) {
  var cells=row.querySelectorAll('td');
  return cells.length>2 ? cells[2].textContent.trim() : '?';
}
function getType(row) {
  var cells=row.querySelectorAll('td');
  return cells.length>3 ? cells[3].textContent.trim() : '';
}
function getDescription(row) {
  var cells=row.querySelectorAll('td');
  return cells.length>1 ? cells[1].textContent.trim() : '';
}
function getRowText(row) {
  return (getArea(row) + ' ' + getType(row) + ' ' + getDescription(row) + ' ' + row.textContent).toLowerCase();
}
function hasAnyToken(text, tokens) {
  for (var i = 0; i < tokens.length; i++) {
    if (text.indexOf(tokens[i]) !== -1) return true;
  }
  return false;
}
function scoreRowMatch(match, specialty, isPeds, cpt) {
  var score = 0;
  if (isPeds && match.isPedsRow) score += 200;
  if (!isPeds && !match.isPedsRow) score += 20;

  var t = match.rowText || '';
  if (specialty === 'vascular') {
    if (hasAnyToken(t, ['vascular', 'minor vascular', 'amputation', 'arterial', 'venous', 'endovascular', 'fistula', 'dialysis'])) score += 80;
    if (hasAnyToken(t, ['trauma', 'traumop', 'other major trauma'])) score -= 120;
    if ((cpt === '27880' || cpt === '27590') && hasAnyToken(t, ['amputation'])) score += 60;
  } else if (specialty === 'gen_surg') {
    if (hasAnyToken(t, ['trauma', 'general surgery', '(gs)'])) score += 20;
    if (hasAnyToken(t, ['vascular', 'minor vascular'])) score -= 20;
  } else if (specialty === 'urology') {
    if (hasAnyToken(t, ['urology', 'prostate', 'bladder', 'kidney', 'ureter', 'urethra', 'testis', 'penis'])) score += 20;
  }
  return score;
}

// ── Auto-scrape ACGME dropdown IDs on first visit ──
chrome.storage.local.get("surgilog-sites-bootstrapped", function(result) {
  if (result["surgilog-sites-bootstrapped"]) return;
  var siteSel = document.getElementById('Institutions');
  if (!siteSel) return;
  var sites = {};
  siteSel.querySelectorAll('option').forEach(function(opt) {
    if (opt.value && opt.value !== "") sites[opt.textContent.trim().toLowerCase()] = opt.value;
  });
  if (Object.keys(sites).length > 0) {
    chrome.storage.local.set({
      "surgilog-scraped-sites": sites,
      "surgilog-sites-bootstrapped": true
    });
    console.log('%c SurgiLog: Auto-scraped '+Object.keys(sites).length+' site IDs from ACGME ','background:#10b981;color:#fff;padding:4px 8px;border-radius:4px');
  }
});

// ── Fill Logic ──
async function fillFromStorage(autoTriggered) {
  if (isFilling) return;
  isFilling = true;
  return new Promise(function(resolve) {
    chrome.storage.local.get("surgilog-pending-case", async function(result) {
      var d = result["surgilog-pending-case"];
      if (!d || d.source !== 'surgilog') {
        isFilling = false;
        updateBtnState('empty');
        if (!autoTriggered) alert('No pending case. Click the Log button in SurgiLog first.');
        resolve(); return;
      }

      updateBtnState('filling');
      var L = [];
      var isPeds = d.is_pediatric || false;
      var specialty = (d.specialty || '').toLowerCase();
      var caseIdForForm = normalizeCaseIdForForm(d.case_id || generateCaseIdLocal(d));
      async function applyCaseId(retries) {
        var tries = retries || 1;
        for (var ri = 0; ri < tries; ri++) {
          var cid = findCaseIdInput();
          if (cid && setInputValue(cid, caseIdForForm)) { L.push('Case ID: '+caseIdForForm); return true; }
          await wait(250);
        }
        return false;
      }

      if(d.date){
        var di=document.querySelector('.ProcedureDate input');
        if(di){ di.value=d.date; di.dispatchEvent(new Event('change',{bubbles:true})); di.dispatchEvent(new Event('input',{bubbles:true})); L.push('Date: '+d.date); }
      }
      await applyCaseId(6);

      if(d.role){
        var rv = findRoleValue(d.role);
        await setDropdown('ResidentRoles', rv, 'Role: '+d.role, L, false);
      }

      if(d.attending){
        var av = findAttendingValue(d.attending);
        await setDropdown('Attendings', av, 'Attending: '+d.attending, L, true);
      }

      if(d.cpt_codes && d.cpt_codes.length>0){
        var ct=document.querySelector('a[href="#area-type"]');
        if(ct) ct.click();
        await wait(500);

        for(var ci=0; ci<d.cpt_codes.length; ci++){
          var raw=d.cpt_codes[ci];
          var co=(typeof raw==='string') ? {code:raw, attributes:[]} : raw;
          var cpt=co.code;
          var attrs=(co.attributes||[]).map(function(x){ return x.toLowerCase() });

          var searchBox=document.getElementById('CodeDescription');
          if(!searchBox) continue;
          searchBox.value=cpt;
          searchBox.dispatchEvent(new Event('input',{bubbles:true}));
          searchBox.dispatchEvent(new Event('keyup',{bubbles:true}));
          await wait(300);

          var searchBtn=document.getElementById('searchByAreaTypeButton');
          if(searchBtn){
            searchBtn.click();
            try{ codeSearchByAreaType.handlers.performSearchByAreaType(searchBtn); }catch(e){}
          }
          // Smart poll: wait for search results to stabilize (up to 3.2s)
          var prevRowCount = -1;
          for (var wi = 0; wi < 8; wi++) {
            await wait(400);
            var curRows = document.querySelectorAll('#code-search-area-type-body tr');
            var curRowCount = 0;
            for (var cr = 0; cr < curRows.length; cr++) {
              var cv = curRows[cr].querySelector('#code-value');
              if (cv && cv.textContent.trim() === cpt) curRowCount++;
            }
            if (curRowCount > 0 && curRowCount === prevRowCount) break;
            prevRowCount = curRowCount;
          }

          var allRows=document.querySelectorAll('#code-search-area-type-body tr');
          var matchingRows=[];
          for(var ri=0; ri<allRows.length; ri++){
            var cc=allRows[ri].querySelector('#code-value');
            if(cc && cc.textContent.trim()===cpt){
              matchingRows.push({
                row: allRows[ri],
                isPedsRow: isRowPediatric(allRows[ri]),
                area: getArea(allRows[ri]),
                type: getType(allRows[ri]),
                rowText: getRowText(allRows[ri])
              });
            }
          }

          var found=false;

          if(matchingRows.length===0){
            L.push('MISS CPT: '+cpt+' - not found, add manually');
          }
          else if(matchingRows.length===1){
            console.log('[SurgiLog] CPT '+cpt+' single match: area='+matchingRows[0].area+' type='+matchingRows[0].type);
            checkAttributes(matchingRows[0].row, attrs, L, cpt);
            await wait(200);
            if(clickAdd(matchingRows[0].row)){
              found=true;
              L.push('CPT: '+cpt+' ('+matchingRows[0].area+(matchingRows[0].type ? ' / '+matchingRows[0].type : '')+')');
            }
          }
          else {
            var chosen=null;
            var bestScore=-Infinity;
            for(var mi=0; mi<matchingRows.length; mi++){
              var m=matchingRows[mi];
              var score=scoreRowMatch(m, specialty, isPeds, cpt);
              console.log('[SurgiLog] CPT '+cpt+' row '+mi+': area='+m.area+' type='+m.type+' score='+score);
              if(score>bestScore){
                bestScore=score;
                chosen=m;
              }
            }
            if(!chosen) chosen=matchingRows[0];
            if(chosen){
              checkAttributes(chosen.row, attrs, L, cpt);
              await wait(200);
              if(clickAdd(chosen.row)){
                found=true;
                var tag=' [pick:'+bestScore+']';
                L.push('CPT: '+cpt+' ('+chosen.area+(chosen.type ? ' / '+chosen.type : '')+')'+tag);
              }
            }
          }

          if(!found && matchingRows.length>0){
            L.push('MISS CPT: '+cpt+' - found but could not click Add');
          }

          await wait(1000);
        }
      }

      // Set site LAST — CPT "Add" button clicks reset the Institutions dropdown
      if(d.site){
        await wait(1500);
        var siteValue = matchSite(d.site);
        if(siteValue){
          // Use jQuery bridge (page context) — the native DOM approach doesn't stick
          setSelectViaPageContext('Institutions', siteValue);
          // Also set natively as fallback
          var ss = document.getElementById('Institutions');
          if(ss){ ss.value = siteValue; ss.dispatchEvent(new Event('change',{bubbles:true})); }
          await wait(300);
          // Verify and retry if needed
          if(ss && ss.value !== siteValue){
            setSelectViaPageContext('Institutions', siteValue);
            await wait(200);
          }
          L.push('Site: '+d.site);
        } else {
          L.push('MISS Site: "'+d.site+'" - set manually');
        }
      }
      // Some ACGME interactions can reset text fields; enforce Case ID again at end.
      await applyCaseId(8);

      // Clear pending case from storage
      chrome.storage.local.remove("surgilog-pending-case");

      updateBtnState('done');
      var badge=document.getElementById('badge-counter');

      // Non-blocking toast instead of alert() — alert() resets form dropdowns
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#065f46;color:#ecfdf5;padding:16px 20px;border-radius:12px;font-family:-apple-system,system-ui,sans-serif;font-size:13px;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.3);line-height:1.5;white-space:pre-line;cursor:pointer;';
      toast.textContent = 'SurgiLog Done:\n'+L.join('\n')+'\nCodes: '+(badge?badge.textContent.trim():'?')+'\n\nClick to dismiss. Review then Submit.';
      toast.addEventListener('click', function(){ toast.remove(); });
      document.body.appendChild(toast);
      setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 15000);

      // Re-set site AFTER toast (no alert to interfere)
      if(siteValue){
        await wait(200);
        setSelectViaPageContext('Institutions', siteValue);
        var ss2 = document.getElementById('Institutions');
        if(ss2){ ss2.value = siteValue; ss2.dispatchEvent(new Event('change',{bubbles:true})); }
      }

      setTimeout(function(){ updateBtnState('empty'); }, 3000);
      isFilling = false;
      resolve();
    });
  });
}

// ── Button State Manager ──
function updateBtnState(mode) {
  var btn = document.getElementById('surgilog-fill-btn');
  if (!btn) return;
  if (mode === 'ready') {
    btn.textContent = 'Fill from SurgiLog';
    btn.style.background = 'linear-gradient(135deg,#34d399,#10b981)';
    btn.style.boxShadow = '0 4px 20px rgba(52,211,153,0.4), 0 0 0 3px rgba(52,211,153,0.2)';
    btn.style.animation = 'surgilog-pulse 2s infinite';
  } else if (mode === 'filling') {
    btn.textContent = 'Filling...';
    btn.style.background = 'linear-gradient(135deg,#fbbf24,#f59e0b)';
    btn.style.boxShadow = '0 4px 16px rgba(251,191,36,0.4)';
    btn.style.animation = 'none';
  } else if (mode === 'done') {
    btn.textContent = 'Done!';
    btn.style.background = 'linear-gradient(135deg,#34d399,#059669)';
    btn.style.boxShadow = '0 4px 16px rgba(52,211,153,0.4)';
    btn.style.animation = 'none';
  } else {
    btn.textContent = 'Fill from SurgiLog';
    btn.style.background = 'linear-gradient(135deg,#34d399,#065f46)';
    btn.style.boxShadow = '0 4px 16px rgba(52,211,153,0.3)';
    btn.style.animation = 'none';
  }
}

// ── Inject Styles ──
var style = document.createElement('style');
style.textContent = `
  @keyframes surgilog-pulse {
    0%, 100% { box-shadow: 0 4px 20px rgba(52,211,153,0.4), 0 0 0 3px rgba(52,211,153,0.2); }
    50% { box-shadow: 0 4px 20px rgba(52,211,153,0.6), 0 0 0 6px rgba(52,211,153,0.1); }
  }
`;
document.head.appendChild(style);

// ── Create Button ──
var btn = document.createElement('button');
btn.id = 'surgilog-fill-btn';
btn.textContent = 'Fill from SurgiLog';
btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:14px 24px;background:linear-gradient(135deg,#34d399,#065f46);color:#022c22;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(52,211,153,0.3);font-family:-apple-system,system-ui,sans-serif;transition:transform 0.15s,box-shadow 0.15s;letter-spacing:-0.01em;';

btn.addEventListener('mouseenter', function(){ btn.style.transform='translateY(-2px)'; });
btn.addEventListener('mouseleave', function(){ btn.style.transform='translateY(0)'; });
btn.addEventListener('click', function(){ fillFromStorage(false); });

document.body.appendChild(btn);

// ── Listen for new cases from the sidepanel ──
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'local' && changes['surgilog-pending-case']) {
    if (changes['surgilog-pending-case'].newValue) {
      updateBtnState('ready');
      // Auto-fill after short delay (lets tab activation settle)
      setTimeout(function() { fillFromStorage(true); }, 600);
    } else {
      updateBtnState('empty');
    }
  }
});

// ── Check if there's already a pending case ──
chrome.storage.local.get("surgilog-pending-case", function(result) {
  if (result["surgilog-pending-case"] && result["surgilog-pending-case"].source === 'surgilog') {
    updateBtnState('ready');
    // Auto-fill if data was waiting when page loaded
    setTimeout(function() { fillFromStorage(true); }, 800);
  }
});

console.log('%c SurgiLog extension ready! Green button auto-fills from sidepanel. ','background:#34d399;color:#022c22;padding:4px 8px;border-radius:4px;font-weight:bold');
})();
