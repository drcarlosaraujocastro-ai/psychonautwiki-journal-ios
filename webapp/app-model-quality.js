'use strict';

/* Model Quality v1
 * - Standardizes formulation names used by dose-dependent PD profiles.
 * - Adds effect / PK / individual-confidence triad to Live Effects.
 * - Audits dose-profile overlaps and gaps without changing canonical source data.
 * - Local-only; confidence is model confidence, never clinical certainty.
 */
(function(){
  const FORMULATIONS=[
    ['ANY','Qualquer / não específica'],['IR','IR — liberação imediata'],['ER','ER — liberação prolongada'],['XR','XR — liberação estendida'],
    ['DR','DR — liberação retardada'],['ODT','ODT — orodispersível'],['SL','SL — sublingual'],['BUCCAL','Bucal'],
    ['TRANSDERMAL','Transdérmica'],['DEPOT','Depot / longa ação'],['PRODRUG','Pró-fármaco oral'],['SOLUTION','Solução'],
    ['SUSPENSION','Suspensão'],['INHALATION','Inalatória'],['OTHER','Outra']
  ];
  const ALIAS={
    '':'ANY','any':'ANY','qualquer':'ANY','none':'ANY','n/a':'ANY',
    'ir':'IR','immediate release':'IR','immediate-release':'IR','immediate_release':'IR','liberação imediata':'IR','liberacao imediata':'IR',
    'er':'ER','extended release':'ER','extended-release':'ER','extended_release':'ER','prolonged release':'ER','liberação prolongada':'ER','liberacao prolongada':'ER',
    'xr':'XR','extended release xr':'XR','extended-release xr':'XR','liberação estendida':'XR','liberacao estendida':'XR',
    'dr':'DR','delayed release':'DR','delayed-release':'DR','liberação retardada':'DR','liberacao retardada':'DR',
    'odt':'ODT','orodispersible':'ODT','orodispersível':'ODT','orodispersivel':'ODT',
    'sl':'SL','sublingual':'SL','buccal':'BUCCAL','bucal':'BUCCAL','transdermal':'TRANSDERMAL','transdérmica':'TRANSDERMAL','transdermica':'TRANSDERMAL',
    'depot':'DEPOT','lai':'DEPOT','long acting injectable':'DEPOT','long-acting injectable':'DEPOT',
    'prodrug':'PRODRUG','oral prodrug':'PRODRUG','pró-fármaco oral':'PRODRUG','pro-farmaco oral':'PRODRUG',
    'solution':'SOLUTION','solução':'SOLUTION','solucao':'SOLUTION','suspension':'SUSPENSION','suspensão':'SUSPENSION','suspensao':'SUSPENSION',
    'inhalation':'INHALATION','inhaled':'INHALATION','inalatória':'INHALATION','inalatoria':'INHALATION','other':'OTHER','outra':'OTHER'
  };
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const key=v=>String(v||'').trim().toLowerCase();
  const normalizeForm=v=>ALIAS[key(v)]||String(v||'').trim().toUpperCase()||'ANY';

  function migrateFormulations(){
    if(typeof state==='undefined'||!state)return false;let changed=false;
    state.dosePDProfiles=state.dosePDProfiles&&typeof state.dosePDProfiles==='object'?state.dosePDProfiles:{};
    for(const xs of Object.values(state.dosePDProfiles))for(const p of Array.isArray(xs)?xs:[]){const n=normalizeForm(p.formulation);if(p.formulation!==n){p.formulation=n;changed=true}}
    for(const e of state.experiences||[])for(const i of e.ingestions||[]){if(!i.formulation)continue;const n=normalizeForm(i.formulation);if(i.formulation!==n){i.formulation=n;changed=true}}
    if(state.formulationDefaults&&typeof state.formulationDefaults==='object')for(const k of Object.keys(state.formulationDefaults)){const n=normalizeForm(state.formulationDefaults[k]);if(state.formulationDefaults[k]!==n){state.formulationDefaults[k]=n;changed=true}}
    return changed;
  }

  function replaceProfileFormulationInput(){
    const old=document.querySelector('#spp-form');if(!old||old.tagName==='SELECT'||old.dataset.standardized==='1')return;
    const current=normalizeForm(old.value),select=document.createElement('select');select.id='spp-form';select.dataset.standardized='1';
    for(const [v,l] of FORMULATIONS){const o=document.createElement('option');o.value=v;o.textContent=l;if(v===current)o.selected=true;select.appendChild(o)}
    if(!FORMULATIONS.some(x=>x[0]===current)){const o=document.createElement('option');o.value=current;o.textContent=`Personalizada — ${current}`;o.selected=true;select.appendChild(o)}
    old.replaceWith(select);
  }

  function observedConfidence(name){
    try{const p=window.ObservedResponse?.profileFor?.(name);if(!p?.n)return{n:0,score:0};return{n:p.n,score:clamp(Math.round((p.confidence??Math.min(1,p.n/12))*100),0,100)}}catch{return{n:0,score:0}}
  }
  function completeness(name){try{return window.SmartPKPD?.completeness?.(name)?.score??0}catch{return 0}}
  function profileSpecificity(g){
    const c=g?.dominant;if(!c)return 0;
    try{const p=window.SmartPKPD?.profileForIngestion?.(c.ing);if(!p)return 45;const f=normalizeForm(p.formulation);return f==='ANY'?70:100}catch{return 45}
  }
  function confidenceFor(g){
    const evidence=completeness(g.name),obs=observedConfidence(g.name),specificity=profileSpecificity(g);
    // Confidence in the model architecture, NOT likelihood of clinical correctness.
    const score=Math.round(evidence*.50+obs.score*.35+specificity*.15);
    return{score:clamp(score,0,100),evidence,observed:obs.score,n:obs.n,specificity};
  }

  function qualityHTML(){
    if(!window.LiveEffectsV2?.activeGroups)return'';const gs=window.LiveEffectsV2.activeGroups(Date.now());if(!gs.length)return'';
    return `<div class="section-title">Qualidade do modelo atual</div><div class="card modelq-card">
      <div class="modelq-intro">Três medidas separadas: <b>efeito previsto</b>, <b>carga PK relativa</b> e <b>confiança individual do modelo</b>. Confiança não significa probabilidade de segurança ou de resposta clínica.</div>
      ${gs.map(g=>{const c=confidenceFor(g),effect=Math.round(clamp(g.subjectiveIntensity,0,1)*100),pk=Math.round(clamp(g.pkLoad/1.5,0,1)*100);return`<div class="modelq-row"><div class="modelq-name"><strong>${escx(g.name)}</strong><span>${c.n?`${c.n} check-in(s) associados`:'sem calibração individual suficiente'}</span></div><div class="modelq-triplet"><div><b>${effect}%</b><span>Efeito</span></div><div><b>${pk}%</b><span>PK</span></div><div><b>${c.score}%</b><span>Confiança</span></div></div><div class="modelq-meter"><i style="width:${c.score}%"></i></div><div class="row-sub">Base farmacológica ${c.evidence}% · dados individuais ${c.observed}% · perfil dose/formulação ${c.specificity}%</div></div>`}).join('')}
      <div class="section-footer">Efeito e PK são estimativas relativas do motor. A confiança aumenta com completude farmacológica, correspondência de dose/formulação e histórico individual; não valida causalidade nem substitui avaliação clínica.</div>
    </div>`;
  }

  function auditProfiles(){
    if(typeof state==='undefined'||!state)return[];const out=[];
    for(const [name,xs0] of Object.entries(state.dosePDProfiles||{})){
      const xs=(Array.isArray(xs0)?xs0:[]).filter(x=>x.active!==false).map(x=>({...x,formulation:normalizeForm(x.formulation),lo:Number(x.minDose),hi:Number(x.maxDose)})).filter(x=>Number.isFinite(x.lo)&&Number.isFinite(x.hi)).sort((a,b)=>a.lo-b.lo);
      const by=new Map();for(const p of xs){const k=p.formulation||'ANY';if(!by.has(k))by.set(k,[]);by.get(k).push(p)}
      for(const [form,arr] of by)for(let i=1;i<arr.length;i++){
        const a=arr[i-1],b=arr[i];if(b.lo<=a.hi)out.push({sev:'sobreposição',name,form,a,b});else if(b.lo-a.hi>0.000001)out.push({sev:'lacuna',name,form,a,b})
      }
    }
    return out;
  }
  function injectAudit(){
    const screen=document.querySelector('#screen');if(!screen||document.querySelector('#modelq-audit'))return;const rows=auditProfiles();
    const box=document.createElement('div');box.id='modelq-audit';box.innerHTML=`<div class="section-caption">Auditoria dos perfis PD</div><div class="card">${rows.length?rows.slice(0,30).map(r=>`<div class="list-row"><div class="row-main"><div class="row-title">${r.sev==='sobreposição'?'⚠ Sobreposição':'◇ Lacuna'} · ${escx(r.name)}</div><div class="row-sub">${escx(r.form)} · ${r.a.lo}–${r.a.hi} → ${r.b.lo}–${r.b.hi} ${escx(r.b.unit||r.a.unit||'mg')}</div></div></div>`).join(''):'<div class="empty">Nenhuma sobreposição ou lacuna detectada entre perfis ativos da mesma formulação.</div>'}</div><div class="section-footer">Sobreposições podem tornar a escolha do perfil ambígua. Lacunas fazem o motor voltar ao PD-base quando nenhuma faixa corresponde.</div>`;screen.appendChild(box);
  }

  // Enhance current-effects card with a separate model-quality section.
  if(window.ClinicalUI?.currentEffectsHTML){const base=window.ClinicalUI.currentEffectsHTML.bind(window.ClinicalUI);window.ClinicalUI.currentEffectsHTML=function(...args){return base(...args)+qualityHTML()}}

  // Standardized formulation selector after the existing profile editor opens.
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-smart-new-profile],[data-smart-edit-profile]'))requestAnimationFrame(()=>requestAnimationFrame(replaceProfileFormulationInput))},true);

  // Append audit whenever PK/PD lab/profile screens are rendered.
  const wrap=(name)=>{const base=window[name];if(typeof base!=='function'||base.__modelq)return;const fn=function(...args){const r=base.apply(this,args);requestAnimationFrame(()=>{try{replaceProfileFormulationInput();if(document.querySelector('[data-smart-substance], [data-smart-new-profile]'))injectAudit()}catch(err){console.warn('Model Quality UI',err)}});return r};fn.__modelq=true;window[name]=fn;try{eval(`${name}=window[name]`)}catch{}};
  wrap('renderSettings');

  window.addEventListener('load',async()=>{try{const changed=migrateFormulations();if(changed&&typeof saveState==='function')await saveState()}catch(e){console.warn('Formulation normalization skipped',e)}});

  const style=document.createElement('style');style.textContent=`.modelq-intro{padding:13px 14px;font-size:12.5px;line-height:1.45;color:var(--secondary,#8e8e93);border-bottom:1px solid rgba(127,127,127,.14)}.modelq-row{padding:13px 14px;border-bottom:1px solid rgba(127,127,127,.13)}.modelq-row:last-of-type{border-bottom:0}.modelq-name{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.modelq-name span{font-size:11px;color:var(--secondary,#8e8e93);text-align:right}.modelq-triplet{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.modelq-triplet>div{padding:8px;border-radius:10px;background:rgba(127,127,127,.09);text-align:center}.modelq-triplet b{display:block;font-size:18px}.modelq-triplet span{font-size:10px;color:var(--secondary,#8e8e93)}.modelq-meter{height:4px;border-radius:4px;background:rgba(127,127,127,.13);overflow:hidden;margin:9px 0 6px}.modelq-meter i{display:block;height:100%;background:currentColor;opacity:.7}`;document.head.appendChild(style);

  window.ModelQuality={version:'1.0',normalizeForm,confidenceFor,auditProfiles,qualityHTML,migrateFormulations};
})();
