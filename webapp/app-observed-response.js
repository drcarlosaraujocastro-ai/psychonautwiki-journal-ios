'use strict';

(function(){
  const METRICS=['mood','anxiety','energy','focus','sedation'];
  const LABELS={mood:'Mood',anxiety:'Anxiety',energy:'Energy',focus:'Focus',sedation:'Sedation'};

  function ensure(){state.clinicalCheckins=state.clinicalCheckins||[];}
  function allIngestions(){return(state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>({...i,experienceId:e.id}))).sort((a,b)=>a.time-b.time)}
  function relevantCheckinsFor(name,windowH=24){ensure();const ings=allIngestions().filter(i=>String(i.substanceName).toLowerCase()===String(name).toLowerCase());if(!ings.length)return[];const out=[];for(const c of state.clinicalCheckins){let best=null;for(const i of ings){const h=(c.time-i.time)/3600000;if(h<0||h>windowH)continue;if(!best||h<best.hours)best={ing:i,hours:h}}if(best){const phase=window.ClinicalEngine?.currentJournalPhase?.(best.ing,c.time)?.phase||'unknown';out.push({checkin:c,ingestion:best.ing,hours:best.hours,phase})}}return out}
  function avg(xs,key){const vals=xs.map(x=>Number(x.checkin?.[key])).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}
  function profileFor(name){const rows=relevantCheckinsFor(name),groups={};for(const r of rows)(groups[r.phase]=groups[r.phase]||[]).push(r);const phases=Object.entries(groups).map(([phase,xs])=>({phase,n:xs.length,metrics:Object.fromEntries(METRICS.map(k=>[k,avg(xs,k)]))}));return{name,n:rows.length,rows,phases,confidence:Math.min(1,rows.length/12)} }
  function learnedHTML(names){const ps=names.map(profileFor).filter(p=>p.n);if(!ps.length)return'';return `<div class="section-title">Observed patient response</div>${ps.map(p=>`<div class="card" style="margin-bottom:12px"><div class="kv"><span>${esc(p.name)}</span><b>${p.n} linked check-in(s)</b></div><div class="row-sub">Patient-adjusted learning layer · confidence ${Math.round(p.confidence*100)}%</div>${p.phases.map(ph=>`<div class="summary" style="padding-top:10px"><b>${esc(ph.phase)}</b> · n=${ph.n}<br>${METRICS.map(k=>ph.metrics[k]==null?'':`${LABELS[k]} ${ph.metrics[k].toFixed(1)}/10`).filter(Boolean).join(' · ')}</div>`).join('')}</div>`).join('')}<div class="section-footer">Observed response is learned only from this device's check-ins temporally linked to prior doses. It does not overwrite the canonical PW/PK model.</div>`}

  const baseRenderExperience=window.renderExperience||renderExperience;
  window.renderExperience=renderExperience=function(id){baseRenderExperience(id);const exp=getExperience(id);if(!exp)return;const names=[...new Set((exp.ingestions||[]).map(i=>i.substanceName))];const html=learnedHTML(names);if(html)$('#screen')?.insertAdjacentHTML('beforeend',html)};

  if(typeof window.renderCurrentEffects==='function'||typeof renderCurrentEffects==='function'){
    const base=window.renderCurrentEffects||renderCurrentEffects;
    window.renderCurrentEffects=renderCurrentEffects=function(){base();const names=[...new Set(allIngestions().filter(i=>Date.now()-i.time<=72*3600000).map(i=>i.substanceName))];const html=learnedHTML(names);if(html)$('#screen')?.insertAdjacentHTML('beforeend',html)};
  }

  window.ObservedResponse={profileFor,relevantCheckinsFor,learnedHTML};
})();
