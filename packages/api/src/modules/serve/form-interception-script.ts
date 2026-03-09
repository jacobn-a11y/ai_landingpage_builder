/**
 * Generates a self-contained form interception script for injection into
 * published pages via the renderer.
 *
 * When a page has "hooked" form bindings, this script intercepts form submits,
 * maps fields through the stored mapping, builds a CanonicalSubmissionPayload,
 * and POSTs to /api/v1/submissions/submit.
 */

export interface HookedFormBinding {
  selector: string;
  fieldMappings: Record<string, string>; // formFieldName → canonical key (or "custom:<label>")
}

export interface FormSuccessConfig {
  behavior: 'inline' | 'redirect' | 'modal';
  redirectUrl?: string;
  message?: string;
}

export interface FormInterceptionParams {
  pageId: string;
  pageName: string;
  pageSlug: string;
  bindings: HookedFormBinding[];
  success: FormSuccessConfig;
}

/**
 * Build the complete <script> body for form interception.
 * Returns a self-contained IIFE string (no external deps, ES5-compatible).
 */
export function getFormInterceptionScript(params: FormInterceptionParams): string {
  const bindingsJson = JSON.stringify(params.bindings);
  const successJson = JSON.stringify(params.success);
  const pageId = escapeForJs(params.pageId);
  const pageName = escapeForJs(params.pageName);
  const pageSlug = escapeForJs(params.pageSlug);

  return `(function(){
"use strict";
var BINDINGS=${bindingsJson};
var SUCCESS=${successJson};
var PAGE_ID="${pageId}";
var PAGE_NAME="${pageName}";
var PAGE_SLUG="${pageSlug}";
var SUBMIT_URL="/api/v1/submissions/submit";
${utmReaderJs()}
${formMatcherJs()}
${payloadBuilderJs()}
${submitHandlerJs()}
${successHandlerJs()}
rpFormInit();
})();`;
}

/* ── JS snippet generators ── */

function utmReaderJs(): string {
  return `
function rpGetUtm(){
  try{var s=localStorage.getItem("replica_utm");if(s)return JSON.parse(s);}catch(e){}
  var m=document.cookie.match(/(?:^|;)\\s*replica_utm\\s*=\\s*([^;]*)/);
  if(m){try{return JSON.parse(decodeURIComponent(m[1]));}catch(e){}}
  return {};
}`;
}

function formMatcherJs(): string {
  return `
function rpFormInit(){
  BINDINGS.forEach(function(b){
    var forms=document.querySelectorAll(b.selector);
    for(var i=0;i<forms.length;i++){
      var form=forms[i];
      if(form.__rp_hooked)continue;
      form.__rp_hooked=true;
      (function(f,binding){
        f.addEventListener("submit",function(ev){
          ev.preventDefault();
          rpHandleSubmit(f,binding);
        });
      })(form,b);
    }
  });
}`;
}

function payloadBuilderJs(): string {
  return `
function rpBuildPayload(form,binding){
  var fd=new FormData(form);
  var mapped={};var custom={};
  var entries=binding.fieldMappings||{};
  for(var name in entries){
    if(!entries.hasOwnProperty(name))continue;
    var canonical=entries[name];
    var val=fd.get(name);
    if(val==null)val="";
    val=String(val);
    if(canonical.indexOf("custom:")===0){
      custom[canonical.slice(7)]=val;
    }else{
      mapped[canonical]=val;
    }
  }
  var utm=rpGetUtm();
  var payload={
    page_id:PAGE_ID,
    page_name:PAGE_NAME,
    page_slug:PAGE_SLUG,
    page_url:window.location.href,
    utm_page:PAGE_NAME||PAGE_SLUG,
    utm_source:utm.utm_source||"",
    utm_medium:utm.utm_medium||"",
    utm_campaign:utm.utm_campaign||"",
    utm_term:utm.utm_term||"",
    utm_content:utm.utm_content||"",
    referrer:document.referrer||"",
    landing_url:window.location.href,
    timestamp:new Date().toISOString(),
    user_agent:navigator.userAgent||""
  };
  for(var k in mapped){if(mapped.hasOwnProperty(k))payload[k]=mapped[k];}
  if(Object.keys(custom).length>0)payload.custom_fields=custom;
  return payload;
}`;
}

function submitHandlerJs(): string {
  return `
function rpHandleSubmit(form,binding){
  var payload=rpBuildPayload(form,binding);
  var btn=form.querySelector("[type=submit]");
  var origText=btn?btn.textContent:"";
  if(btn){btn.disabled=true;btn.textContent="Submitting...";}
  fetch(SUBMIT_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),
    credentials:"same-origin"
  })
  .then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d};});})
  .then(function(res){
    if(res.ok&&res.data.success){rpOnSuccess(form);}
    else{rpOnError(form,res.data.error||"Submission failed",btn,origText);}
  })
  .catch(function(){rpOnError(form,"Network error. Please try again.",btn,origText);});
}`;
}

function successHandlerJs(): string {
  return `
function rpOnSuccess(form){
  var msg=SUCCESS.message||"Thanks for submitting!";
  if(SUCCESS.behavior==="redirect"&&SUCCESS.redirectUrl){
    window.location.href=SUCCESS.redirectUrl;return;
  }
  if(SUCCESS.behavior==="modal"){
    rpShowModal(msg);form.reset();
    var btn=form.querySelector("[type=submit]");
    if(btn){btn.disabled=false;btn.textContent="Submit";}
    return;
  }
  form.innerHTML='<div style="padding:12px;color:#16a34a;font-weight:500">'+rpEsc(msg)+"</div>";
}
function rpShowModal(msg){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center";
  var bx=document.createElement("div");
  bx.style.cssText="background:#fff;border-radius:8px;padding:24px 32px;max-width:400px;text-align:center";
  bx.innerHTML='<p style="font-size:1rem;margin:0 0 16px">'+rpEsc(msg)+'</p><button style="padding:6px 20px;border:1px solid #ccc;border-radius:4px;cursor:pointer">Close</button>';
  bx.querySelector("button").addEventListener("click",function(){document.body.removeChild(ov);});
  ov.appendChild(bx);document.body.appendChild(ov);
}
function rpOnError(form,msg,btn,origText){
  if(btn){btn.disabled=false;btn.textContent=origText||"Submit";}
  var el=form.querySelector(".rp-hook-error");
  if(!el){el=document.createElement("div");el.className="rp-hook-error";el.style.cssText="color:#dc2626;font-size:0.875rem;margin-top:8px";form.appendChild(el);}
  el.textContent=msg;
}
function rpEsc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}`;
}

/* ── Helpers ── */

function escapeForJs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
