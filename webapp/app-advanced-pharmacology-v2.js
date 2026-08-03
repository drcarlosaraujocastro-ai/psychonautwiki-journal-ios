'use strict';

/* Advanced Pharmacology v2
 * Rich PK timeline + PD benefits/adverse sliders inspired by PsicoNorte editor.
 * Backward compatible: preserves legacy pk.tmaxH/halfLifeH/bioavailabilityPct and pd.axes.
 */
(function(){
  const TIME_UNITS=['minutes','hours','days','weeks'];
  const BENEFITS=[
    ['mood','Mood / antidepressant effect'],['anhedonia','Anhedonia / reward responsiveness'],['motivation','Motivation / effort'],
    ['energy','Energy / activation'],['attention','Attention'],['executiveFunction','Executive function'],['anxiolysis','Anxiolysis'],
    ['antiHyperarousal','Anti-hyperarousal'],['sleepInitiation','Sleep initiation'],['sleepMaintenance','Sleep maintenance'],
    ['antipsychotic','Antipsychotic effect'],['antiMania','Anti-manic effect'],['anticonvulsant','Anticonvulsant effect'],
    ['impulseControlBenefit','Impulse control'],['cognitionBenefit','Cognitive benefit']
  ];
  const ADVERSE=[
    ['sedation','Sedation'],['cognitiveImpairment','Cognitive impairment'],['memoryImpairment','Memory impairment'],
    ['anxietyActivation','Anxiety / activation'],['insomnia','Insomnia'],['sympatheticActivation','Sympathetic activation'],
    ['orthostasis','Orthostasis / hypotension'],['bradycardia','Bradycardia'],['tachycardia','Tachycardia'],['nausea','Nausea / GI'],
    ['appetiteWeight','Appetite / weight'],['metabolic','Metabolic burden'],['epsAkathisia','EPS / akathisia'],['prolactin','Prolactin'],
    ['qt','QT prolongation'],['seizure','Seizure risk'],['respiratoryDepression','Respiratory depression'],
    ['serotoninSyndrome','Serotonergic toxicity'],['impulseControlRisk','Impulse-control risk'],['abuseReinforcement','Abuse / reinforcement'],
    ['withdrawal','Withdrawal / discontinuation'],['rebound','Rebound'],['maniaPsychosis','Mania / psychosis activation']
  ];
  const SYSTEM_AXES=[
    ['dopamine','Dopamine'],['norepinephrine','Norepinephrine'],['serotonin','Serotonin'],['gabaA','GABA-A'],['glutamate','Glutamate'],
    ['histamineH1','Histamine H1'],['alpha1','Alpha-1'],['alpha2','Alpha-2'],['muscarinic','Muscarinic'],['arousal','Arousal'],
    ['sympatheticTone','Sympathetic tone'],['rewardSalience','Reward salience']
  ];
  const RANGE_FIELDS=[
    ['onset','Onset'],['comeup','Come-up'],['peak','Peak'],['plateau','Plateau'],['offset','Offset'],['residualTail','Residual tail'],
    ['steadyState','Steady state'],['halfLife','Half-life'],['totalDuration','Total duration'],['tmax','Tmax']
  ];
  const esc2=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=v=>{if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null};
  const toHours=(v,u)=>{if(v==null)return null;const f={minutes:1/60,hours:1,days:24,weeks:168}[u||'hours']||1;return Number(v)*f};
  const fromLegacyRange=(r,unit='hours')=>Array.isArray(r)?{min:r[0]??null,max:r[1]??null,unit}:null;
  function ensurePharm(){state.clinicalOverrides=state.clinicalOverrides||{};state.substanceOverrides=state.substanceOverrides||{}}
  function effective(name){return typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||state.clinicalOverrides?.[String(name).toLowerCase()]||{})}
  function currentRichPK(p){const pk=p?.pk||{},t=pk.timeline||{};return{
    onset:t.onset||null,comeup:t.comeup||null,peak:t.peak||null,plateau:t.plateau||null,offset:t.offset||null,
    residualTail:t.residualTail||null,steadyState:t.steadyState||fromLegacyRange(pk.steadyStateDays,'days'),
    halfLife:t.halfLife||fromLegacyRange(pk.halfLifeH||pk.halfLifeActiveH,'hours'),totalDuration:t.totalDuration||null,
    tmax:t.tmax||fromLegacyRange(pk.tmaxH||pk.tmaxActiveH,'hours')
  }}
  function rangeRow(key,label,r,optional=false){r=r||{min:null,max:null,unit:key==='steadyState'?'days':'hours'};return `<div class="pkv2-row" data-pk-range="${key}">
    <div class="pkv2-label"><strong>${label}</strong>${optional?`<label class="pkv2-switch"><input type="checkbox" id="pk-${key}-enabled" ${r?.enabled!==false&&r&&(r.min!=null||r.max!=null)?'checked':''}> usar</label>`:''}</div>
    <div class="pkv2-grid"><input id="pk-${key}-min" type="number" step="any" inputmode="decimal" placeholder="mín" value="${r?.min??''}"><input id="pk-${key}-max" type="number" step="any" inputmode="decimal" placeholder="máx" value="${r?.max??''}"><select id="pk-${key}-unit">${TIME_UNITS.map(u=>`<option value="${u}" ${u===(r?.unit||'hours')?'selected':''}>${u}</option>`).join('')}</select></div>
  </div>`}
  function sliderRow(kind,key,label,value){const v=Math.max(0,Math.min(100,Number(value)||0));return `<div class="pdv2-row"><div class="pdv2-head"><span>${esc2(label)}</span><b id="pd-${kind}-${key}-value">${v}</b></div><input id="pd-${kind}-${key}" data-pd-slider="${kind}:${key}" type="range" min="0" max="100" step="1" value="${v}"></div>`}
  function axisRow(key,label,value){const v=Math.max(-100,Math.min(100,Math.round((Number(value)||0)*100)));return `<div class="pdv2-row"><div class="pdv2-head"><span>${esc2(label)}</span><b id="pd-axis-${key}-value">${v>0?'+':''}${v}</b></div><input id="pd-axis-${key}" data-pd-axis="${key}" type="range" min="-100" max="100" step="1" value="${v}"></div>`}

  function editor(name){
    ensurePharm();const s=findSubstance(name),p=effective(name)||{},raw=state.substanceOverrides?.[String(name).toLowerCase()]||{},db=p.doseBands||{},pk=p.pk||{},pd=p.pd||{},tol=p.tolerance||{},src=p.sources||{},tl=currentRichPK(p);
    const benefits=pd.benefits||{},adverse=pd.adverse||{},customBenefits=pd.customBenefits||[],customAdverse=pd.customAdverse||[];
    modal(`${modalHeader('Advanced Pharmacology',`<button class="navbtn" data-pharmv2-save="${esc2(name)}">Save</button>`,'Cancel')}<div class="pharmv2-wrap">
      <div class="section-title">Identity & article</div><div class="card"><div class="fieldrow"><label>Name override</label><input id="ce-name" value="${esc2(raw.name||s?.name||name)}"></div><div class="fieldrow"><label>Categories</label><input id="ce-categories" value="${esc2((raw.categories||s?.categories||[]).join(', '))}"></div><div class="fieldrow"><textarea id="ce-summary" placeholder="Local article / summary override">${esc2(raw.summary||s?.summary||s?.description||'')}</textarea></div></div>
      <div class="section-title">Clinical classification</div><div class="card"><div class="fieldrow"><label>Class</label><input id="ce-class" value="${esc2(p.class||'')}"></div><div class="fieldrow"><label>Mechanism</label><textarea id="ce-mechanism">${esc2(p.mechanism||'')}</textarea></div><div class="fieldrow"><label>Targets / receptors</label><input id="ce-targets" value="${esc2((pd.targets||[]).join(', '))}"></div></div>
      <div class="section-title">Clinical dose bands</div><div class="card"><div class="fieldrow"><label>Unit</label><input id="ce-dose-unit" value="${esc2(db.unit||'mg')}"></div>${[['minimum','Minimum'],['veryLow','Very low'],['low','Low'],['standard','Standard'],['high','High'],['maxTherapeutic','Maximum']].map(([k,l])=>`<div class="fieldrow"><label>${l}</label><input id="ce-dose-${k}" type="number" step="any" inputmode="decimal" value="${db[k]??db.maxTherapeuticSingle&&k==='maxTherapeutic'?db.maxTherapeuticSingle:''}"></div>`).join('')}</div>
      <div class="section-title">PK / timeline</div><div class="card"><div class="section-footer" style="padding:0 0 10px">Each phase stores a minimum, maximum and its own time unit. These are phenomenologic/clinical timeline fields; Tmax and half-life remain pharmacokinetic fields.</div>${rangeRow('onset','Onset',tl.onset)}${rangeRow('comeup','Come-up',tl.comeup)}${rangeRow('peak','Peak',tl.peak)}${rangeRow('plateau','Plateau',tl.plateau)}${rangeRow('offset','Offset',tl.offset)}${rangeRow('residualTail','Residual tail',tl.residualTail,true)}${rangeRow('steadyState','Steady state',tl.steadyState,true)}${rangeRow('halfLife','Half-life',tl.halfLife)}${rangeRow('totalDuration','Total duration',tl.totalDuration)}${rangeRow('tmax','Tmax',tl.tmax)}
        <div class="fieldrow"><label>Bioavailability %</label><input id="ce-ba-min" type="number" step="any" value="${(pk.bioavailabilityPct||[])[0]??''}" placeholder="min"><span>–</span><input id="ce-ba-max" type="number" step="any" value="${(pk.bioavailabilityPct||[])[1]??''}" placeholder="max"></div>
        <div class="fieldrow"><label>Route / formulation</label><input id="pk-formulation" value="${esc2(pk.formulation||pk.route||'oral')}" placeholder="oral IR, XR, transdermal..."></div>
        <div class="fieldrow"><label>Absorption</label><textarea id="pk-absorption">${esc2(pk.absorption||pk.bioavailabilityNote||'')}</textarea></div>
        <div class="fieldrow"><label>Metabolism</label><textarea id="pk-metabolism">${esc2(pk.metabolism||'')}</textarea></div>
        <div class="fieldrow"><label>Active metabolite(s)</label><textarea id="pk-metabolites">${esc2(pk.activeMetabolites||'')}</textarea></div>
        <div class="fieldrow"><label>Elimination</label><textarea id="pk-elimination">${esc2(pk.elimination||pk.notes||'')}</textarea></div>
        <div class="fieldrow"><label>Food effect</label><textarea id="pk-food">${esc2(typeof pk.food==='string'?pk.food:pk.food?JSON.stringify(pk.food):'')}</textarea></div>
        <div class="fieldrow"><label>Renal / hepatic considerations</label><textarea id="pk-organs">${esc2(pk.organConsiderations||'')}</textarea></div>
      </div>
      <div class="section-title">PD / systems (-100 to +100)</div><div class="card">${SYSTEM_AXES.map(([k,l])=>axisRow(k,l,pd.axes?.[k])).join('')}</div>
      <div class="section-title">PD / beneficial effects (0–100)</div><div class="card">${BENEFITS.map(([k,l])=>sliderRow('benefit',k,l,benefits[k])).join('')}<div id="pd-custom-benefits">${customBenefits.map((x,i)=>`<div class="pdv2-custom" data-custom-benefit="${i}"><input value="${esc2(x.label||'')}" placeholder="Custom beneficial effect"><input type="range" min="0" max="100" value="${Number(x.value)||0}"><b>${Number(x.value)||0}</b></div>`).join('')}</div><button class="linkrow" data-pharmv2-add="benefit">＋ Add custom beneficial effect</button></div>
      <div class="section-title">PD / adverse effects (0–100)</div><div class="card">${ADVERSE.map(([k,l])=>sliderRow('adverse',k,l,adverse[k])).join('')}<div id="pd-custom-adverse">${customAdverse.map((x,i)=>`<div class="pdv2-custom" data-custom-adverse="${i}"><input value="${esc2(x.label||'')}" placeholder="Custom adverse effect"><input type="range" min="0" max="100" value="${Number(x.value)||0}"><b>${Number(x.value)||0}</b></div>`).join('')}</div><button class="linkrow" data-pharmv2-add="adverse">＋ Add custom adverse effect</button></div>
      <details class="card"><summary class="row-title strong">Advanced raw PD JSON</summary><div class="fieldrow" style="margin-top:10px"><textarea id="ce-axes">${esc2(JSON.stringify(pd.axes||{},null,2))}</textarea></div><div class="section-footer">Optional. Sliders above are the primary editor; raw JSON remains for compatibility and expert editing.</div></details>
      <div class="section-title">Tolerance, adaptation & dependence</div><div class="card">${[['acute','Acute tolerance'],['chronic','Chronic tolerance'],['receptorAdaptation','Receptor adaptation'],['dependenceRisk','Physiologic dependence'],['withdrawalRisk','Withdrawal'],['reboundRisk','Rebound'],['sensitizationRisk','Sensitization']].map(([k,l])=>`<div class="fieldrow"><label>${l}</label><textarea id="ce-tol-${k}">${esc2(tol[k]||'')}</textarea></div>`).join('')}<div class="fieldrow"><label>Cross-tolerance</label><input id="ce-cross" value="${esc2((tol.crossTolerance||[]).join(', '))}"></div></div>
      <div class="section-title">Clinical / off-label</div><div class="card"><div class="fieldrow"><label>Approved uses</label><textarea id="ce-approved">${esc2((p.approvedUses||[]).join('\n'))}</textarea></div><div class="fieldrow"><label>Evidence-supported off-label</label><textarea id="ce-offlabel">${esc2((p.offLabelUses||[]).join('\n'))}</textarea></div><div class="fieldrow"><label>Mechanistic hypotheses</label><textarea id="ce-mechanistic">${esc2((p.mechanisticUses||[]).join('\n'))}</textarea></div></div>
      <div class="section-title">Evidence & provenance</div><div class="card"><div class="fieldrow"><label>Primary / phenomenology</label><input id="ce-src-primary" value="${esc2((src.primary||[]).join(', '))}"></div><div class="fieldrow"><label>Experiential</label><input id="ce-src-exp" value="${esc2((src.experiential||[]).join(', '))}"></div><div class="fieldrow"><label>Technical</label><input id="ce-src-secondary" value="${esc2((src.secondary||[]).join(', '))}"></div><div class="fieldrow"><textarea id="ce-evidence-note" placeholder="Evidence consensus / disagreements / review notes">${esc2(p.evidenceNote||'')}</textarea></div></div>
    </div>`);
    document.querySelectorAll('[data-pd-slider]').forEach(el=>el.addEventListener('input',()=>{const [kind,key]=el.dataset.pdSlider.split(':');const b=document.querySelector(`#pd-${kind}-${key}-value`);if(b)b.textContent=el.value}));
    document.querySelectorAll('[data-pd-axis]').forEach(el=>el.addEventListener('input',()=>{const b=document.querySelector(`#pd-axis-${el.dataset.pdAxis}-value`);if(b)b.textContent=(Number(el.value)>0?'+':'')+el.value}));
    document.querySelectorAll('.pdv2-custom input[type="range"]').forEach(el=>el.addEventListener('input',()=>{const b=el.parentElement.querySelector('b');if(b)b.textContent=el.value}));
  }
  function readRange(key,optional=false){if(optional&&!document.querySelector(`#pk-${key}-enabled`)?.checked)return null;const min=num(document.querySelector(`#pk-${key}-min`)?.value),max=num(document.querySelector(`#pk-${key}-max`)?.value),unit=document.querySelector(`#pk-${key}-unit`)?.value||'hours';if(min==null&&max==null)return null;return{min:min??max,max:max??min,unit,enabled:true}}
  function splitCSV2(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
  function collectCustom(selector){return [...document.querySelectorAll(selector)].map(row=>{const ins=row.querySelectorAll('input');return{label:ins[0]?.value.trim()||'',value:Number(ins[1]?.value)||0}}).filter(x=>x.label)}
  async function save(name){
    ensurePharm();const key=String(name).toLowerCase(),timeline={};for(const [k] of RANGE_FIELDS){const r=readRange(k,k==='residualTail'||k==='steadyState');if(r)timeline[k]=r}
    const axes={};for(const [k] of SYSTEM_AXES){const el=document.querySelector(`#pd-axis-${k}`);if(el)axes[k]=Number(el.value)/100}
    // If raw JSON is valid, merge keys not represented by sliders, but sliders win for represented axes.
    try{const raw=JSON.parse(document.querySelector('#ce-axes')?.value||'{}');Object.assign(axes,raw,axes)}catch(e){}
    const benefits={},adverse={};for(const [k] of BENEFITS)benefits[k]=Number(document.querySelector(`#pd-benefit-${k}`)?.value)||0;for(const [k] of ADVERSE)adverse[k]=Number(document.querySelector(`#pd-adverse-${k}`)?.value)||0;
    const tmax=timeline.tmax?[toHours(timeline.tmax.min,timeline.tmax.unit),toHours(timeline.tmax.max,timeline.tmax.unit)]:undefined;
    const hl=timeline.halfLife?[toHours(timeline.halfLife.min,timeline.halfLife.unit),toHours(timeline.halfLife.max,timeline.halfLife.unit)]:undefined;
    const ss=timeline.steadyState?[toHours(timeline.steadyState.min,timeline.steadyState.unit)/24,toHours(timeline.steadyState.max,timeline.steadyState.unit)/24]:undefined;
    const bmin=num(document.querySelector('#ce-ba-min')?.value),bmax=num(document.querySelector('#ce-ba-max')?.value),doseBands={unit:document.querySelector('#ce-dose-unit')?.value||'mg'};
    for(const k of ['minimum','veryLow','low','standard','high','maxTherapeutic']){const v=num(document.querySelector(`#ce-dose-${k}`)?.value);if(v!=null)doseBands[k]=v}
    state.clinicalOverrides[key]={
      class:document.querySelector('#ce-class')?.value.trim()||'',mechanism:document.querySelector('#ce-mechanism')?.value.trim()||'',doseBands,
      pk:{timeline,...(tmax?{tmaxH:tmax}:{}),...(hl?{halfLifeH:hl}:{}),...(ss?{steadyStateDays:ss}:{}),...(bmin!=null||bmax!=null?{bioavailabilityPct:[bmin??bmax,bmax??bmin]}:{}),formulation:document.querySelector('#pk-formulation')?.value.trim()||'',absorption:document.querySelector('#pk-absorption')?.value.trim()||'',metabolism:document.querySelector('#pk-metabolism')?.value.trim()||'',activeMetabolites:document.querySelector('#pk-metabolites')?.value.trim()||'',elimination:document.querySelector('#pk-elimination')?.value.trim()||'',food:document.querySelector('#pk-food')?.value.trim()||'',organConsiderations:document.querySelector('#pk-organs')?.value.trim()||''},
      pd:{targets:splitCSV2(document.querySelector('#ce-targets')?.value),axes,benefits,adverse,customBenefits:collectCustom('[data-custom-benefit]'),customAdverse:collectCustom('[data-custom-adverse]')},
      tolerance:{acute:document.querySelector('#ce-tol-acute')?.value.trim()||'',chronic:document.querySelector('#ce-tol-chronic')?.value.trim()||'',receptorAdaptation:document.querySelector('#ce-tol-receptorAdaptation')?.value.trim()||'',dependenceRisk:document.querySelector('#ce-tol-dependenceRisk')?.value.trim()||'',withdrawalRisk:document.querySelector('#ce-tol-withdrawalRisk')?.value.trim()||'',reboundRisk:document.querySelector('#ce-tol-reboundRisk')?.value.trim()||'',sensitizationRisk:document.querySelector('#ce-tol-sensitizationRisk')?.value.trim()||'',crossTolerance:splitCSV2(document.querySelector('#ce-cross')?.value)},
      approvedUses:String(document.querySelector('#ce-approved')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean),offLabelUses:String(document.querySelector('#ce-offlabel')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean),mechanisticUses:String(document.querySelector('#ce-mechanistic')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean),
      sources:{primary:splitCSV2(document.querySelector('#ce-src-primary')?.value),experiential:splitCSV2(document.querySelector('#ce-src-exp')?.value),secondary:splitCSV2(document.querySelector('#ce-src-secondary')?.value)},evidenceNote:document.querySelector('#ce-evidence-note')?.value.trim()||'',updatedAt:Date.now()
    };
    const original=findSubstance(name),newName=document.querySelector('#ce-name')?.value.trim()||name;state.substanceOverrides[key]={name:newName,summary:document.querySelector('#ce-summary')?.value.trim()||'',categories:splitCSV2(document.querySelector('#ce-categories')?.value),commonNames:[newName,...(original?.commonNames||[]).filter(x=>x!==original?.name&&x!==newName)]};
    await saveState();closeModal();toast('Advanced pharmacology saved');renderSearch();navigate('substance',newName)
  }
  function addCustom(kind){const box=document.querySelector(kind==='benefit'?'#pd-custom-benefits':'#pd-custom-adverse');if(!box)return;const i=box.children.length,row=document.createElement('div');row.className='pdv2-custom';row.setAttribute(kind==='benefit'?'data-custom-benefit':'data-custom-adverse',i);row.innerHTML=`<input placeholder="Custom ${kind==='benefit'?'beneficial':'adverse'} effect"><input type="range" min="0" max="100" value="0"><b>0</b>`;box.appendChild(row);row.querySelector('input[type="range"]').oninput=e=>row.querySelector('b').textContent=e.target.value}
  const style=document.createElement('style');style.textContent=`.pharmv2-wrap{padding:0 14px 36px}.pkv2-row{padding:11px 0;border-bottom:1px solid rgba(127,127,127,.15)}.pkv2-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.pkv2-grid{display:grid;grid-template-columns:1fr 1fr 110px;gap:7px}.pkv2-grid input,.pkv2-grid select{min-width:0}.pkv2-switch{font-size:12px;font-weight:400;display:flex;gap:5px;align-items:center}.pdv2-row{padding:9px 0;border-bottom:1px solid rgba(127,127,127,.12)}.pdv2-head{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:4px}.pdv2-row input[type=range]{width:100%}.pdv2-custom{display:grid;grid-template-columns:1fr minmax(90px,1fr) 35px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(127,127,127,.12)}@media(max-width:430px){.pkv2-grid{grid-template-columns:1fr 1fr}.pkv2-grid select{grid-column:1/-1}.pdv2-custom{grid-template-columns:1fr 80px 30px}}`;document.head.appendChild(style);
  clinicalEditorSheet=editor;window.clinicalEditorSheet=editor;saveClinicalEditor=save;window.saveClinicalEditor=save;
  document.addEventListener('click',async e=>{const sv=e.target.closest('[data-pharmv2-save]');if(sv){e.preventDefault();e.stopImmediatePropagation();await save(sv.dataset.pharmv2Save);return}const ad=e.target.closest('[data-pharmv2-add]');if(ad){e.preventDefault();e.stopImmediatePropagation();addCustom(ad.dataset.pharmv2Add);return}},true);
  window.PWJ_ADVANCED_PHARMACOLOGY_V2={version:'4.0',benefits:BENEFITS,adverse:ADVERSE,systems:SYSTEM_AXES};
})();