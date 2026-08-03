'use strict';

function ensureClinicalState(){
  state.clinicalOverrides=state.clinicalOverrides||{};
  state.substanceOverrides=state.substanceOverrides||{};
  state.settings.hiddenTimelineSubstances=state.settings.hiddenTimelineSubstances||{};
}

function deepMerge(a,b){
  if(Array.isArray(a)||Array.isArray(b)) return b===undefined?a:b;
  if(!a||typeof a!=='object') return b===undefined?a:b;
  if(!b||typeof b!=='object') return b===undefined?a:b;
  const out={...a};
  for(const [k,v] of Object.entries(b)) out[k]=deepMerge(a[k],v);
  return out;
}

const __rawAllSubstances=allSubstances;
const __rawFindSubstance=findSubstance;
allSubstances=function(){
  ensureClinicalState();
  return __rawAllSubstances().map(s=>{
    const o=state.substanceOverrides?.[String(s.name).toLowerCase()];
    return o?deepMerge(s,o):s;
  });
};
findSubstance=function(name){
  const target=String(name||'').toLowerCase();
  return allSubstances().find(s=>String(s.name).toLowerCase()===target||(s.commonNames||[]).some(n=>String(n).toLowerCase()===target));
};

function clinicalOverrideKey(name){return String(name||'').toLowerCase()}
function clinicalProfileEffective(name){
  ensureClinicalState();
  const base=window.ClinicalEngine?.profile(name)||null;
  const over=state.clinicalOverrides?.[clinicalOverrideKey(name)]||null;
  return base||over?deepMerge(base||{},over||{}):null;
}

function numField(id){const el=$(id);if(!el||el.value==='')return null;const n=Number(el.value);return Number.isFinite(n)?n:null}
function splitCSV(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
function jsonAxes(v){try{const x=JSON.parse(v||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}

function clinicalEditorSheet(name){
  ensureClinicalState();
  const s=findSubstance(name),p=clinicalProfileEffective(name)||{},raw=state.substanceOverrides?.[clinicalOverrideKey(name)]||{};
  const db=p.doseBands||{},pk=p.pk||{},pd=p.pd||{},tol=p.tolerance||{},src=p.sources||{};
  modal(`${modalHeader('Advanced Pharmacology',`<button class="navbtn" data-clinical-save="${esc(name)}">Done</button>`)}
  <div style="padding:0 14px 36px">
    <div class="section-title">Identity & article</div><div class="card">
      <div class="fieldrow"><label>Name override</label><input id="ce-name" value="${esc(raw.name||s?.name||name)}"></div>
      <div class="fieldrow"><label>Categories</label><input id="ce-categories" value="${esc((raw.categories||s?.categories||[]).join(', '))}"></div>
      <div class="fieldrow"><textarea id="ce-summary" placeholder="Local article/summary override">${esc(raw.summary||s?.summary||s?.description||'')}</textarea></div>
    </div>
    <div class="section-title">Clinical classification</div><div class="card">
      <div class="fieldrow"><label>Class</label><input id="ce-class" value="${esc(p.class||'')}"></div>
      <div class="fieldrow"><label>Mechanism</label><textarea id="ce-mechanism">${esc(p.mechanism||'')}</textarea></div>
      <div class="fieldrow"><label>Targets</label><input id="ce-targets" value="${esc((pd.targets||[]).join(', '))}"></div>
      <div class="fieldrow"><label>PD axes JSON</label><textarea id="ce-axes">${esc(JSON.stringify(pd.axes||{},null,2))}</textarea></div>
    </div>
    <div class="section-title">Clinical dose bands</div><div class="card">
      <div class="fieldrow"><label>Unit</label><input id="ce-dose-unit" value="${esc(db.unit||'mg')}"></div>
      ${[['minimum','Minimum'],['veryLow','Very low'],['low','Low'],['standard','Standard'],['high','High'],['maxTherapeutic','Maximum']].map(([k,l])=>`<div class="fieldrow"><label>${l}</label><input id="ce-dose-${k}" type="number" step="any" inputmode="decimal" value="${db[k]??''}"></div>`).join('')}
    </div>
    <div class="section-title">PK</div><div class="card">
      <div class="fieldrow"><label>Tmax h</label><input id="ce-tmax-min" type="number" step="any" value="${(pk.tmaxH||pk.tmaxActiveH||[])[0]??''}"><span>–</span><input id="ce-tmax-max" type="number" step="any" value="${(pk.tmaxH||pk.tmaxActiveH||[])[1]??''}"></div>
      <div class="fieldrow"><label>Half-life h</label><input id="ce-hl-min" type="number" step="any" value="${(pk.halfLifeH||pk.halfLifeActiveH||[])[0]??''}"><span>–</span><input id="ce-hl-max" type="number" step="any" value="${(pk.halfLifeH||pk.halfLifeActiveH||[])[1]??''}"></div>
      <div class="fieldrow"><label>Bioavailability %</label><input id="ce-ba-min" type="number" step="any" value="${(pk.bioavailabilityPct||[])[0]??''}"><span>–</span><input id="ce-ba-max" type="number" step="any" value="${(pk.bioavailabilityPct||[])[1]??''}"></div>
      <div class="fieldrow"><label>Metabolism / elimination</label><textarea id="ce-pknotes">${esc(pk.notes||pk.metabolism||pk.bioavailabilityNote||'')}</textarea></div>
    </div>
    <div class="section-title">Tolerance, adaptation & dependence</div><div class="card">
      ${[['acute','Acute tolerance'],['chronic','Chronic tolerance'],['receptorAdaptation','Receptor adaptation'],['dependenceRisk','Physiologic dependence'],['withdrawalRisk','Withdrawal'],['reboundRisk','Rebound'],['sensitizationRisk','Sensitization']].map(([k,l])=>`<div class="fieldrow"><label>${l}</label><textarea id="ce-tol-${k}">${esc(tol[k]||'')}</textarea></div>`).join('')}
      <div class="fieldrow"><label>Cross-tolerance</label><input id="ce-cross" value="${esc((tol.crossTolerance||[]).join(', '))}"></div>
    </div>
    <div class="section-title">Clinical / off-label</div><div class="card">
      <div class="fieldrow"><label>Approved uses</label><textarea id="ce-approved">${esc((p.approvedUses||[]).join('\n'))}</textarea></div>
      <div class="fieldrow"><label>Evidence-supported off-label</label><textarea id="ce-offlabel">${esc((p.offLabelUses||[]).join('\n'))}</textarea></div>
      <div class="fieldrow"><label>Mechanistic hypotheses</label><textarea id="ce-mechanistic">${esc((p.mechanisticUses||[]).join('\n'))}</textarea></div>
    </div>
    <div class="section-title">Evidence & provenance</div><div class="card">
      <div class="fieldrow"><label>Primary / phenomenology</label><input id="ce-src-primary" value="${esc((src.primary||[]).join(', '))}"></div>
      <div class="fieldrow"><label>Experiential</label><input id="ce-src-exp" value="${esc((src.experiential||[]).join(', '))}"></div>
      <div class="fieldrow"><label>Technical</label><input id="ce-src-secondary" value="${esc((src.secondary||[]).join(', '))}"></div>
      <div class="fieldrow"><textarea id="ce-evidence-note" placeholder="Evidence consensus / disagreements / review notes">${esc(p.evidenceNote||'')}</textarea></div>
    </div>
    <div class="section-title">Local override</div><div class="card"><button class="destructive" data-clinical-reset="${esc(name)}">Reset local pharmacology overrides</button></div>
  </div>`);
}

async function saveClinicalEditor(name){
  ensureClinicalState();
  const key=clinicalOverrideKey(name),tmin=numField('#ce-tmax-min'),tmax=numField('#ce-tmax-max'),hmin=numField('#ce-hl-min'),hmax=numField('#ce-hl-max'),bmin=numField('#ce-ba-min'),bmax=numField('#ce-ba-max');
  const doseBands={unit:$('#ce-dose-unit').value||'mg'};
  for(const k of ['minimum','veryLow','low','standard','high','maxTherapeutic']){const v=numField(`#ce-dose-${k}`);if(v!=null)doseBands[k]=v}
  state.clinicalOverrides[key]={
    class:$('#ce-class').value.trim(),mechanism:$('#ce-mechanism').value.trim(),doseBands,
    pk:{...(tmin!=null||tmax!=null?{tmaxH:[tmin??tmax,tmax??tmin]}:{}),...(hmin!=null||hmax!=null?{halfLifeH:[hmin??hmax,hmax??hmin]}:{}),...(bmin!=null||bmax!=null?{bioavailabilityPct:[bmin??bmax,bmax??bmin]}:{}),notes:$('#ce-pknotes').value.trim()},
    pd:{targets:splitCSV($('#ce-targets').value),axes:jsonAxes($('#ce-axes').value)},
    tolerance:{acute:$('#ce-tol-acute').value.trim(),chronic:$('#ce-tol-chronic').value.trim(),receptorAdaptation:$('#ce-tol-receptorAdaptation').value.trim(),dependenceRisk:$('#ce-tol-dependenceRisk').value.trim(),withdrawalRisk:$('#ce-tol-withdrawalRisk').value.trim(),reboundRisk:$('#ce-tol-reboundRisk').value.trim(),sensitizationRisk:$('#ce-tol-sensitizationRisk').value.trim(),crossTolerance:splitCSV($('#ce-cross').value)},
    approvedUses:$('#ce-approved').value.split('\n').map(x=>x.trim()).filter(Boolean),offLabelUses:$('#ce-offlabel').value.split('\n').map(x=>x.trim()).filter(Boolean),mechanisticUses:$('#ce-mechanistic').value.split('\n').map(x=>x.trim()).filter(Boolean),
    sources:{primary:splitCSV($('#ce-src-primary').value),experiential:splitCSV($('#ce-src-exp').value),secondary:splitCSV($('#ce-src-secondary').value)},evidenceNote:$('#ce-evidence-note').value.trim(),updatedAt:Date.now()
  };
  const original=findSubstance(name);const newName=$('#ce-name').value.trim()||name;
  state.substanceOverrides[key]={name:newName,summary:$('#ce-summary').value.trim(),categories:splitCSV($('#ce-categories').value),commonNames:[newName,...(original?.commonNames||[]).filter(x=>x!==original?.name&&x!==newName)]};
  await saveState();closeModal();toast('Advanced pharmacology saved');renderSearch();navigate('substance',newName);
}

function rangeText(r,unit='h'){if(!r)return'—';return Array.isArray(r)?`${r[0]}–${r[1]} ${unit}`:`${r} ${unit}`}
function clinicalSubstanceHTML(name){
  const p=clinicalProfileEffective(name);if(!p)return`<div class="section-caption">Clinical pharmacology</div><div class="card"><button class="linkrow" data-clinical-edit="${esc(name)}">＋ Add advanced pharmacology</button></div>`;
  const pk=p.pk||{},pd=p.pd||{},db=p.doseBands||{},tol=p.tolerance||{};
  const doseRows=[['Minimum',db.minimum],['Very low',db.veryLow],['Low',db.low],['Standard',db.standard],['High',db.high],['Maximum',db.maxTherapeutic??db.maxTherapeuticSingle]].filter(x=>x[1]!=null);
  return `<div class="section-caption">Clinical pharmacology</div><div class="card"><div class="kv"><span>Class</span><b>${esc(p.class||'—')}</b></div>${p.mechanism?`<div class="summary" style="padding:12px 0">${esc(p.mechanism)}</div>`:''}<button class="linkrow" data-clinical-edit="${esc(name)}">Edit advanced pharmacology <span style="float:right">›</span></button></div>
  ${doseRows.length?`<div class="section-caption">Clinical dose bands</div><div class="card">${doseRows.map(([l,v])=>`<div class="kv"><span>${l}</span><b>${v} ${esc(db.unit||'mg')}</b></div>`).join('')}</div>`:''}
  <div class="section-caption">PK</div><div class="card">${(pk.tmaxH||pk.tmaxActiveH)?`<div class="kv"><span>Tmax</span><b>${rangeText(pk.tmaxH||pk.tmaxActiveH)}</b></div>`:''}${(pk.halfLifeH||pk.halfLifeActiveH)?`<div class="kv"><span>Half-life</span><b>${rangeText(pk.halfLifeH||pk.halfLifeActiveH)}</b></div>`:''}${pk.bioavailabilityPct?`<div class="kv"><span>Bioavailability</span><b>${rangeText(pk.bioavailabilityPct,'%')}</b></div>`:''}${pk.steadyStateDays?`<div class="kv"><span>Steady state</span><b>${rangeText(pk.steadyStateDays,'d')}</b></div>`:''}${pk.notes?`<div class="summary" style="padding:12px 0">${esc(pk.notes)}</div>`:''}</div>
  <div class="section-caption">PD / targets</div><div class="card"><div class="summary">${esc((pd.targets||[]).join(' · ')||'—')}</div>${Object.keys(pd.axes||{}).length?`<div style="padding-top:10px">${Object.entries(pd.axes).map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b>${Number(v)>0?'+':''}${Number(v).toFixed(2)}</b></div>`).join('')}</div>`:''}</div>
  <div class="section-caption">Tolerance & adaptation</div><div class="card">${[['Acute',tol.acute],['Chronic',tol.chronic],['Receptor adaptation',tol.receptorAdaptation],['Dependence',tol.dependenceRisk],['Withdrawal',tol.withdrawalRisk],['Rebound',tol.reboundRisk],['Sensitization',tol.sensitizationRisk]].filter(x=>x[1]).map(([l,v])=>`<div class="kv"><span>${l}</span><b>${esc(v)}</b></div>`).join('')||'<div class="summary">No clinical adaptation model yet.</div>'}</div>
  ${(p.offLabelUses?.length||p.mechanisticUses?.length)?`<div class="section-caption">Off-label / mechanism-first</div><div class="card">${(p.offLabelUses||[]).map(x=>`<div class="summary">• ${esc(x)}</div>`).join('')}${(p.mechanisticUses||[]).map(x=>`<div class="summary">◇ ${esc(x)}</div>`).join('')}</div>`:''}
  <div class="section-caption">Evidence layers</div><div class="card"><div class="kv"><span>Primary / phenomenology</span><b>${esc((p.sources?.primary||[]).join(', ')||'—')}</b></div><div class="kv"><span>Experiential</span><b>${esc((p.sources?.experiential||[]).join(', ')||'—')}</b></div><div class="kv"><span>Technical</span><b>${esc((p.sources?.secondary||[]).join(', ')||'—')}</b></div>${p.evidenceNote?`<div class="summary" style="padding-top:10px">${esc(p.evidenceNote)}</div>`:''}</div>`;
}

function effectStrengthLabel(v){const a=Math.abs(Number(v)||0);return a>=.8?'high':a>=.55?'moderate':'mild'}
function currentEffectsHTML(exp){
  const ings=(exp.ingestions||[]).filter(i=>!state.settings.hiddenTimelineSubstances?.[String(i.substanceName).toLowerCase()]);
  const inf=window.ClinicalEngine?.inferCurrentEffects(ings,Date.now());if(!inf)return'';
  const active=inf.active||[];
  return `<div class="section-title">What should be happening now?</div><div class="card">
    ${active.length?active.map(x=>{const i=x.ing,ex=x.exposure,adj=window.ClinicalEngine?.stomachAdjustment(i.substanceName,i.stomachFullness);return`<div class="kv"><span>${esc(i.substanceName)}<div class="row-sub">${esc(x.phase.phase)} · ${ex?`${ex.hoursSinceDose.toFixed(1)} h since dose`:''}${adj?.tmaxShiftH?` · food Tmax +${adj.tmaxShiftH} h`:''}</div></span><b>${ex?.remainingFraction!=null?`${Math.round(ex.remainingFraction*100)}% PK remainder*`:''}</b></div>`}).join(''):'<div class="summary">No modeled active substances at the current time.</div>'}
    ${(inf.effects||[]).length?`<div style="padding-top:10px">${inf.effects.map(e=>`<div class="kv"><span>${esc(e.label)}</span><b>${e.direction==='increase'?'↑':'↓'} ${effectStrengthLabel(e.strength)}</b></div><div class="row-sub" style="padding:0 0 8px">${esc(e.reason)}</div>`).join('')}</div>`:''}
    <div class="row-sub" style="padding-top:10px">*Model estimate, not measured serum concentration. It combines Journal phase, elimination proxy and PD axes. Patient observations should override confidence, not canonical source data.</div>
  </div>`;
}

function curveLegendHTML(exp){
  ensureClinicalState();const names=[...new Set((exp.ingestions||[]).map(i=>i.substanceName))];
  return names.length?`<div class="card" style="margin-top:10px">${names.map(n=>{const hidden=!!state.settings.hiddenTimelineSubstances[clinicalOverrideKey(n)];return`<button class="list-row" data-toggle-curve="${esc(n)}"><span class="dot" style="background:${colorFor(n)}"></span><div class="row-main"><div class="row-title">${esc(n)}</div><div class="row-sub">${hidden?'Hidden from graph':'Visible on graph'}</div></div><span style="font-size:22px">${hidden?'◉̸':'◉'}</span></button>`}).join('')}</div>`:'';
}

document.addEventListener('click',async e=>{
  const edit=e.target.closest('[data-clinical-edit]');if(edit){e.preventDefault();e.stopPropagation();clinicalEditorSheet(edit.dataset.clinicalEdit);return}
  const save=e.target.closest('[data-clinical-save]');if(save){e.preventDefault();e.stopPropagation();await saveClinicalEditor(save.dataset.clinicalSave);return}
  const reset=e.target.closest('[data-clinical-reset]');if(reset){e.preventDefault();e.stopPropagation();ensureClinicalState();delete state.clinicalOverrides[clinicalOverrideKey(reset.dataset.clinicalReset)];delete state.substanceOverrides[clinicalOverrideKey(reset.dataset.clinicalReset)];await saveState();closeModal();toast('Local override reset');renderSearch();navigate('substance',reset.dataset.clinicalReset);return}
  const toggle=e.target.closest('[data-toggle-curve]');if(toggle){e.preventDefault();e.stopPropagation();ensureClinicalState();const k=clinicalOverrideKey(toggle.dataset.toggleCurve);state.settings.hiddenTimelineSubstances[k]=!state.settings.hiddenTimelineSubstances[k];await saveState();if(selectedExperienceId)renderExperience(selectedExperienceId);return}
},true);

window.ClinicalUI={ensureClinicalState,profile:clinicalProfileEffective,substanceHTML:clinicalSubstanceHTML,currentEffectsHTML,curveLegendHTML,editor:clinicalEditorSheet};
