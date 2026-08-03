'use strict';

// Refinements and PsicoNorte-style intelligence views layered on the reasoning engine.
nr=function(v){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null};

const __baseClinicalFormulation=clinicalFormulation;
clinicalFormulation=function(){
  const axes=__baseClinicalFormulation();
  const hits=interpretClinicalTexts();
  const sleepValues=(state.clinicalCheckins||[]).filter(c=>c.sleepHours!=null&&Number.isFinite(Number(c.sleepHours)));
  if(!themeCount(hits,'sleep')&&!sleepValues.length)axes.acute=(axes.acute||[]).filter(x=>x!=='sleep disturbance');
  return axes;
};

function renderTextInterpretation(){
  ensureReasoningState();topbar('Text Interpretation',{back:true,backLabel:'Intelligence'});
  const hits=interpretClinicalTexts(),positive=hits.filter(h=>!h.negated),negative=hits.filter(h=>h.negated);
  const grouped={};for(const h of positive)(grouped[h.themeId]=grouped[h.themeId]||[]).push(h);
  $('#screen').innerHTML=`<div class="section-title">Positive signals</div>${Object.entries(grouped).map(([id,hs])=>`<div class="card" style="margin-bottom:12px"><div class="kv"><span>${esc(hs[0].label)}</span><b>${hs.length} signal(s)</b></div>${hs.slice(-6).reverse().map(h=>`<div class="summary" style="padding-top:9px"><b>${esc(h.sourceLabel)}</b>${h.time?` · ${fmtDate(h.time)} ${fmtTime(h.time)}`:''}<br>${esc(h.excerpt)}</div>`).join('')}</div>`).join('')||'<div class="card empty">No positive text signals yet.</div>'}<div class="section-title">Negated / contradictory evidence</div><div class="card">${negative.slice(-12).reverse().map(h=>`<div class="summary" style="padding:8px 0"><b>${esc(h.label)}</b> · ${esc(h.sourceLabel)}<br>${esc(h.excerpt)}</div>`).join('')||'<div class="empty">No explicit negated signals detected.</div>'}</div><div class="section-footer">Negation is preserved so “denies paranoia” is not converted into a positive psychosis signal. Text interpretation remains heuristic and reviewable.</div>`;
}

function renderAnalysisSnapshots(){
  ensureReasoningState();topbar('Analyses',{back:true,backLabel:'Intelligence'});
  const xs=(state.clinicalAnalyses||[]).slice().sort((a,b)=>b.time-a.time);
  $('#screen').innerHTML=`<div class="section-title">Saved clinical snapshots</div>${xs.map((x,i)=>`<div class="card" style="margin-bottom:12px"><div class="kv"><span>${fmtDate(x.time)} ${fmtTime(x.time)}</span><b>${x.hypotheses?.length||0} hypotheses</b></div><div class="row-sub">sources · check-ins ${x.sourceCounts?.checkins||0} · ingestions ${x.sourceCounts?.ingestions||0} · texts ${x.sourceCounts?.texts||0} · targets ${x.sourceCounts?.targets||0}</div>${(x.hypotheses||[]).slice(0,3).map((h,n)=>`<div class="summary" style="padding-top:8px">#${n+1} ${esc(h.title)} · score ${Math.round(h.score||0)}</div>`).join('')}<button class="linkrow" data-reason-action="delete-analysis" data-analysis-id="${x.id}">Delete snapshot</button></div>`).join('')||'<div class="card empty">No saved analyses yet. Use Save on the Hypotheses screen.</div>'}`;
}

function recordedDiagnosticContextHTML(){
 const p=state.clinicalProfile||{},dx=splitLines(p.establishedDiagnoses),diff=splitLines(p.differentials);if(!dx.length&&!diff.length)return'';
 return `<div class="section-title">Recorded diagnostic context</div><div class="card">${dx.length?`<div class="summary"><b>Established / carried diagnoses</b><br>${dx.map(x=>`• ${esc(x)}`).join('<br>')}</div>`:''}${diff.length?`<div class="summary" style="padding-top:10px"><b>Clinician-entered differentials</b><br>${diff.map(x=>`• ${esc(x)}`).join('<br>')}</div>`:''}</div>`;
}
const __baseRenderHypotheses=renderHypotheses;
renderHypotheses=function(){__baseRenderHypotheses();$('#screen').insertAdjacentHTML('afterbegin',recordedDiagnosticContextHTML())};

const __baseRenderIntelligenceV2=renderClinicalIntelligenceV2;
renderClinicalIntelligenceV2=function(){
  __baseRenderIntelligenceV2();
  const extra=`<div class="section-caption">PsicoNorte-style modules</div><div class="card"><button class="list-row" data-reason-action="texts"><div class="row-main"><div class="row-title">Texts</div><div class="row-sub">Sources, positive findings, negations and contradictions</div></div><span class="chev">›</span></button><button class="list-row" data-clinical-action="redose"><div class="row-main"><div class="row-title">Redose</div><div class="row-sub">Repeated-dose overlap, extension and carry-over</div></div><span class="chev">›</span></button><button class="list-row" data-reason-action="management"><div class="row-main"><div class="row-title">Management</div><div class="row-sub">Target hierarchy, current regimen and mechanism-first options</div></div><span class="chev">›</span></button><button class="list-row" data-reason-action="analyses"><div class="row-main"><div class="row-title">Analyses</div><div class="row-sub">Versioned local snapshots for longitudinal comparison</div></div><span class="chev">›</span></button></div>`;
  $('#screen').insertAdjacentHTML('beforeend',extra);
};
renderClinicalIntelligence=renderClinicalIntelligenceV2;

// Auto-link each saved general check-in to explicit target measurements when a domain mapping exists.
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-clinical-action="save-checkin"]');if(!t)return;
 setTimeout(async()=>{try{ensureReasoningState();const n=mapLastCheckinToTargets();if(n){await saveState();toast(`Check-in saved · ${n} target measurement(s) updated`)}}catch(err){console.warn(err)}},80);
});

document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-reason-action="texts"],[data-reason-action="analyses"],[data-reason-action="delete-analysis"]');if(!t)return;
 if(t.dataset.reasonAction==='texts')renderTextInterpretation();
 else if(t.dataset.reasonAction==='analyses')renderAnalysisSnapshots();
 else if(t.dataset.reasonAction==='delete-analysis'){if(confirm('Delete this saved clinical analysis snapshot?')){state.clinicalAnalyses=state.clinicalAnalyses.filter(x=>x.id!==t.dataset.analysisId);await saveState();renderAnalysisSnapshots()}}
});

window.ClinicalReasoning.renderTexts=renderTextInterpretation;
window.ClinicalReasoning.renderAnalyses=renderAnalysisSnapshots;
