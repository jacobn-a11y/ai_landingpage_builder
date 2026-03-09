/**
 * UTM capture and form-submit scripts injected into published pages.
 * - Reads utm_* from URL, stores in cookie (30 day TTL) or localStorage
 * - On form submit, includes utm_* from storage in payload
 */

const UTM_COOKIE_NAME = 'replica_utm';
const UTM_STORAGE_KEY = 'replica_utm';
const UTM_TTL_DAYS = 30;

/**
 * Inline UTM capture script: reads ?utm_source= etc from URL, saves to cookie and localStorage.
 * Runs on page load. Cookie has 30-day TTL for cross-page persistence.
 * Auto-derives utm_page from the page slug provided in __REPLICA_PAGE__.
 * Exposes captured UTM data as window.__REPLICA_UTM__ for form interception.
 */
export function getUtmCaptureScript(): string {
  return `
(function(){
  var params = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  var q = window.location.search || '';
  var utm = {};
  params.forEach(function(p){
    var m = q.match(new RegExp('[?&]' + p + '=([^&]*)'));
    if (m) utm[p] = decodeURIComponent(m[1].replace(/\\+/g,' '));
  });
  var cfg = window.__REPLICA_PAGE__ || {};
  var pageSlug = cfg.pageSlug || cfg.pageName || '';
  if (pageSlug) utm.utm_page = pageSlug;
  var hasUtmParams = params.some(function(p){ return !!utm[p]; });
  if (!hasUtmParams && !pageSlug) return;
  if (hasUtmParams) {
    var json = JSON.stringify(utm);
    try { localStorage.setItem('${UTM_STORAGE_KEY}', json); } catch(e){}
    document.cookie = '${UTM_COOKIE_NAME}=' + encodeURIComponent(json) + ';path=/;max-age=' + (${UTM_TTL_DAYS}*24*60*60) + ';SameSite=Lax';
  } else {
    try {
      var stored = localStorage.getItem('${UTM_STORAGE_KEY}');
      if (stored) { utm = JSON.parse(stored); utm.utm_page = pageSlug; }
    } catch(e){}
  }
  window.__REPLICA_UTM__ = utm;
})();
`;
}

/**
 * Form submit handler: intercepts data-replica-form submits, adds utm_* from cookie/localStorage to payload.
 * Uses fetch with FormData so we can append UTM before POST.
 */
export function getFormSubmitHandlerScript(): string {
  return `
(function(){
  function getUtmFromStorage(){
    try {
      var stored = localStorage.getItem('${UTM_STORAGE_KEY}');
      if (stored) return JSON.parse(stored);
    } catch(e){}
    var m = document.cookie.match(new RegExp('(?:^|;)\\\\s*${UTM_COOKIE_NAME}\\\\s*=\\\\s*([^;]*)'));
    if (m) {
      try { return JSON.parse(decodeURIComponent(m[1])); } catch(e){}
    }
    return {};
  }
  document.addEventListener('submit', function(ev){
    var form = ev.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-replica-form')) return;
    ev.preventDefault();
    var params = new URLSearchParams(new FormData(form));
    var utm = getUtmFromStorage();
    Object.keys(utm).forEach(function(k){ params.append(k, utm[k]); });
    var cfg = window.__REPLICA_PAGE__ || {};
    if (cfg.pageName) params.append('utm_page', cfg.pageName);
    params.append('landing_url', window.location.href);
    params.append('referrer', document.referrer || '');
    if (navigator && navigator.userAgent) params.append('user_agent', navigator.userAgent);
    var action = form.action || '/api/v1/submissions';
    fetch(action, { method: 'POST', body: params, credentials: 'same-origin', redirect: 'manual' })
      .then(function(r){
        if (r.type === 'opaqueredirect' || r.status === 302) {
          var loc = r.headers.get('Location');
          if (loc) { window.location.href = loc; return; }
        }
        return r.json();
      })
      .then(function(data){
        if (data && data.success) {
          var msg = form.querySelector('[data-success-msg]');
          if (msg) msg.textContent = msg.getAttribute('data-success-msg') || 'Thanks!';
          else form.innerHTML = '<p style="color:green">Thanks for submitting!</p>';
        }
      })
      .catch(function(){ form.innerHTML = '<p style="color:red">Something went wrong. Please try again.</p>'; });
  }, true);
})();
`;
}

/**
 * Countdown timer script: finds .rp-countdown elements and updates them every second.
 * Expects data-target (ISO date), data-days, data-hours, data-mins, data-secs (labels).
 */
export function getCountdownScript(): string {
  return `
(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    document.querySelectorAll('.rp-countdown').forEach(function(el){
      var target = el.getAttribute('data-target');
      if (!target) return;
      var t = new Date(target).getTime();
      if (isNaN(t)) return;
      var now = Date.now();
      var diff = Math.max(0, t - now);
      var d = Math.floor(diff/(24*60*60*1000));
      var h = Math.floor((diff%(24*60*60*1000))/(60*60*1000));
      var m = Math.floor((diff%(60*60*1000))/(60*1000));
      var s = Math.floor((diff%(60*1000))/1000);
      var sd = el.querySelector('.rp-cd-d'); if(sd) sd.textContent = pad(d);
      var sh = el.querySelector('.rp-cd-h'); if(sh) sh.textContent = pad(h);
      var sm = el.querySelector('.rp-cd-m'); if(sm) sm.textContent = pad(m);
      var ss = el.querySelector('.rp-cd-s'); if(ss) ss.textContent = pad(s);
    });
  }
  tick();
  setInterval(tick, 1000);
})();
`;
}
