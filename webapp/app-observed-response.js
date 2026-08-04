'use strict';

(function(){
  const METRICS=['mood','anxiety','energy','focus','sedation','motivation','pleasure'];
  const LABELS={mood:'Humor',anxiety:'Ansiedade',energy:'Energia',focus:'Foco',sedation:'Sedação',motivation:'Motivação',pleasure:'Prazer/recompensa'};
  const key=v=>String(v||'').trim().toLowerCase();

  function ensure(){state.clinicalCheckins=state.clinicalCheckins||[];}
  function allIngestions(){return(state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>({...i,experienceId:e.id}))).sort((a,b)=>a.time-b.time)}
  function metric(c,k){const v=Number(c?.[k]);if(Number.isFinite(v))return v;const a=Number(c?.smartAnswers?.[k]?.value);return Number.isFinite(a)?a:null}
  function relevantCheckinsFor(name,windowH=24){ensure();const id=key(name),ings=allIngestions().filter(i=>key(i.substanceName)===id),out=[];for(const c of state.clinicalCheckins){const smart=(c.activeContext||[]).find(x=>key(x.substanceName)===id&&Number(x.contributionWeight)>=.06);if(smart){const ing=ings.find(i=>i.id===smart.dominantIngestionId)||ings.filter(i=>i.time<=c.time).at(-1)||null;out.push({checkin:c,ingestion:ing,hours:ing?Math.max(0,(c.time-ing.time)/3600000):null,phase:smart.phase||'unknown',weight:Number(smart.contributionWeight)||.1,effectIntensity:Number(smart.effectIntensity||0),pkLoad:Number(smart.pkLoad||0),smart:true});continue}if(Array.isArray(c.activeContext)&&c.activeContext.length)continue;let best=null;for(const i of ings){const h=(c.time-i.time)/3600000;if(h<0||h>windowH)continue;if(!best||h<best.hours)best={ing:i,hours:h}}if(best){const phase=window.ClinicalEngine?.currentJournalPhase?.(best.ing,c.time)?.phase||'unknown';out.push({checkin:c,ingestion:best.ing,hours:best.hours,phase,weight:.35,smart:false})}}return out}
  function avg(xs,k){let sw=0,s=0;for(const x of xs){const v=metric(x.checkin,k);if(v==null)continue;const w=Math.max(.03,Number(x.weight||.1));sw+=w;s+=v*w}return sw?s/sw:null}
  function profileFor(name){const rows=relevantCheckinsFor(name),groups={};for(const r of rows)(groups[r.phase]=groups[r.phase]||[]).push(r);const phases=Object.entries(groups).map(([phase,xs])=>({phase,n:xs.length,effectiveN:xs.reduce((s,x)=>s+Number(x.weight||0),0),metrics:Object.fromEntries(METRICS.map(k=>[k,avg(xs,k)]))}));const effective=rows.reduce((s,x)=>s+Math.min(1,Number(x.weight||0)*1.7),0),smartShare=rows.length?rows.filter(r=>r.smart).length/rows.length:0;return{name,n:rows.length,effectiveN:effective,rows,phases,confidence:Math.min(1,effective/7)*(.75+.25*smartShare)} }
  function learnedHTML(names){const ps=names.map(profileFor).filter(p=>p.n);if(!ps.length)return'';return `<div class="section-title">Resposta individual observada</div>${ps.map(p=>`<div class="card" style="margin-bottom:12px"><div class="kv"><span>${esc(p.name)}</span><b>${p.n} check-in(s) atribuíveis</b></div><div class="row-sub" style="padding:0 14px 10px">Camada individual ponderada pela participação farmacológica · confiança ${Math.round(p.confidence*100)}%</div>${p.phases.map(ph=>`<div class="summary" style="padding-top:10px"><b>${esc(ph.phase)}</b> · n=${ph.n}<br>${METRICS.map(k=>ph.metrics[k]==null?'':`${LABELS[k]} ${ph.metrics[k].toFixed(1)}/10`).filter(Boolean).join(' · ')}</div>`).join('')}</div>`).join('')}<div class="section-footer">Check-ins inteligentes podem contar para várias substâncias simultaneamente quando todas estavam ativas. Cada associação recebe um peso de participação; isso melhora atribuição temporal, mas não demonstra causalidade.</div>`}

  const baseRenderExperience=window.renderExperience||renderExperience;
  window.renderExperience=renderExperience=function(id){baseRenderExperience(id);const exp=getExperience(id);if(!exp)return;const names=[...new Set((exp.ingestions||[]).map(i=>i.substanceName))];const html=learnedHTML(names);if(html)$('#screen')?.insertAdjacentHTML('beforeend',html)};

  if(typeof window.renderCurrentEffects==='function'||typeof renderCurrentEffects==='function'){
    const base=window.renderCurrentEffects||renderCurrentEffects;
    window.renderCurrentEffects=renderCurrentEffects=function(){base();const names=[...new Set((window.LiveEffectsV2?.activeGroups?.(Date.now())||[]).map(g=>g.name))];const html=learnedHTML(names);if(html)$('#screen')?.insertAdjacentHTML('beforeend',html)};
  }

  window.ObservedResponse={version:'2.0',profileFor,relevantCheckinsFor,learnedHTML};
})();
