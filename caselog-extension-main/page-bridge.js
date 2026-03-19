window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'caselog-set-select') return;
  var el = document.getElementById(e.data.id);
  if (!el) return;
  if (typeof jQuery !== 'undefined') {
    jQuery(el).val(e.data.value).trigger('change');
  } else {
    el.value = e.data.value;
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }
});
