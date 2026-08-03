'use strict';

/* Smart PK/PD Lab v1
 * - Dose/formulation-dependent PD profiles
 * - Patient-specific PD modifiers
 * - Rich timeline phase resolver using Advanced Pharmacology v2 PK timeline
 * - Current model lab + data completeness dashboard
 * - Local-only; does not overwrite canonical PsychonautWiki data
 */
(function(){
  const SYSTEMS=[['dopamine','Dopamine'],['norepinephrine','Norepinephrine'],['serotonin','Serotonin'],['gabaA','GABA-A'],['glutamate','Glutamate'],['histamineH1','Histamine H1'],['alpha1','Alpha-1'],['alpha2','Alpha-2'],['muscarinic','Muscarinic'],['arousal','Arousal'],['sympatheticTone','Sympathetic tone'],['rewardSalience','Reward salience']];
  const BENEFITS=[['mood','Humor / antidepressivo'],['anhedonia','Anedonia / recompensa'],['motivation','Motivação / esforço'],['energy','Energia / ativação'],['attention','Atenção'],['executiveFunction','Função executiva'],['anxiolysis','Ansiolítico'],['antiHyperarousal','Anti-hiperalerta'],['sleepInitiation','Início do sono'],['sleepMaintenance','Manutenção do sono'],['antipsychotic','Antipsicótico'],['antiMania','Antimaníaco'],['anticonvulsant','Anticonvulsivante'],['impulseControlBenefit','Controle de impulsos'],['cognitionBenefit','Benefício cognitivo']];
  const ADVERSE=[['sedation','Sedação'],['cognitiveImpairment','Prejuízo cognitivo'],['memoryImpairment','Prejuízo de memória'],['anxietyActivation','Ansiedade / ativação'],['insomnia','Insônia'],['sympatheticActivation','Ativação simpática'],['orthostasis','Ortostase / hipotensão'],['bradycardia','Bradicardia'],['tachycardia','Taquicardia'],['nausea','Náusea / GI'],['appetiteWeight','Apetite / peso'],['metabolic','Carga metabólica'],['epsAkathisia','EPS / acatisia'],['prolactin','Prolactina'],['qt','QT'],['seizure','Risco convulsivo'],['respiratoryDepression','Depressão respiratória'],['serotoninSyndrome','Toxicidade serotoninérgica'],['impulseControlRisk','Risco de impulsividade'],['abuseReinforcement','Reforço / abuso'],['withdrawal','Abstinência / descontinuação'],['rebound','Rebote'],['maniaPsychosis','Ativação mania / psicose']];
  const CALIBRATION=[['mood','Humor'],['anhedonia','Anedonia / recompensa'],['motivation','Motivação'],['energy','Energia'],['attention','Atenção'],['executiveFunction','Função executiva'],['anxiolysis','Ansiolítico'],['sedation','Sedação'],['anxietyActivation','Ansiedade / ativação'],['insomnia','Insônia']];
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const n=v=>{if(v===''||v==null)return null;const x=Number(v);return Number.isFinite(x)?x:null};
  const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
  const keyOf=v=>String(v||'').trim().toLowerCase();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const unitH={minutes:1/60,hours:1,days:24,weeks:168};

  function ensure(){
    state.dosePDProfiles=state.dosePDProfiles&&typeof state.dosePDProfiles==='object'?state.dosePDProfiles:{};
    state.patientPDModifiers=state.patientPDModifiers&&typeof state.patientPDModifiers==='object'?state.patientPDModifiers:{};
    state.smartPKPDSettings={applyPatientModifiers:true,...(state.smartPKPDSettings||{})};
  }
  function allIngs(){return(state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>({...i,experienceId:e.id}))).filter(i=>Number.isFinite(Number(i.time))).sort((a,b)=>a.time-b.time)}
  function baseProfile(name){try{return typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||{})}catch{return{}}}
  function profiles(name){ensure();return Array.isArray(state.dosePDProfiles[keyOf(name)])?state.dosePDProfiles[keyOf(name)]:[]}
  function modifier(name){ensure();return state.patientPDModifiers[keyOf(name)]||{}}
  function doseMg(ing){const d=n(ing?.dose);if(d==null)return null;const u=String(ing.units||'mg').toLowerCase();if(u==='mg')return d;if(u==='g')return d*1000;if(['ug','mcg','µg'].includes(u))return d/1000;return null}
  function doseInUnit(ing,unit){const mg=doseMg(ing);if(mg==null)return n(ing?.dose);if(unit==='g')return mg/1000;if(['ug','mcg','µg'].includes(String(unit).toLowerCase()))return mg*1000;return mg}
  function formulationOf(ing){return String(ing?.formulation||ing?.formulationName||'').trim()}
  function profileForIngestion(ing){
    const xs=profiles(ing.substanceName).filter(x=>x.active!==false),doseRaw=n(ing.dose),form=formulationOf(ing).toLowerCase();
    const scored=[];
    for(const p of xs){const d=doseInUnit(ing,p.unit||ing.units||'mg'),lo=n(p.minDose),hi=n(p.maxDose);if(d==null)continue;if(lo!=null&&d<lo)continue;if(hi!=null&&d>hi)continue;const pf=String(p.formulation||'').trim().toLowerCase();if(pf&&pf!=='any'&&form&&pf!==form)continue;if(pf&&pf!=='any'&&!form)continue;let score=0;if(pf&&pf!=='any'&&pf===form)score+=10;if(lo!=null||hi!=null)score+=5;const width=(hi??d)-(lo??d);score+=Math.max(0,5-Math.min(5,Math.abs(width)));scored.push({p,score})}
    scored.sort((a,b)=>b.score-a.score);return scored[0]?.p||null
  }
  function mergePD(name,ing){
    const base=baseProfile(name)?.pd||{},sp=ing?profileForIngestion(ing):null;
    const axes={...(base.axes||{}),...(sp?.axes||{})},benefits={...(base.benefits||{}),...(sp?.benefits||{})},adverse={...(base.adverse||{}),...(sp?.adverse||{})};
    if(state.smartPKPDSettings?.applyPatientModifiers!==false){const m=modifier(name);for(const [k,v] of Object.entries(m.benefits||{}))benefits[k]=clamp((benefits[k]||0)+Number(v),0,100);for(const [k,v] of Object.entries(m.adverse||{}))adverse[k]=clamp((adverse[k]||0)+Number(v),0,100);for(const [k,v] of Object.entries(m.axes||{}))axes[k]=clamp((axes[k]||0)+Number(v)/100,-1,1)}
    return{axes,benefits,adverse,profile:sp}
  }
  function rangeHours(r){if(!r)return null;const min=n(r.min),max=n(r.max),f=unitH[r.unit||'hours']||1;if(min==null&&max==null)return null;return[(min??max)*f,(max??min)*f]}
  function richTimeline(name){const p=baseProfile(name),pk=p?.pk||{},t=pk.timeline||{};return{onset:t.onset,comeup:t.comeup,peak:t.peak,plateau:t.plateau,offset:t.offset,residualTail:t.residualTail,totalDuration:t.totalDuration,halfLife:t.halfLife,tmax:t.tmax}}
  function phaseFor(ing,at=Date.now()){
    const h=Math.max(0,(at-Number(ing.time))/3600000),tl=richTimeline(ing.substanceName);
    const seq=[['onset',tl.onset],['come-up',tl.comeup],['peak',tl.peak],['plateau',tl.plateau],['offset',tl.offset],['residual',tl.residualTail]];let cursor=0;
    for(const [label,r] of seq){const rr=rangeHours(r);if(!rr)continue;const dur=(rr[0]+rr[1])/2;if(h<cursor+dur)return{phase:label,hours:h,progress:dur?(h-cursor)/dur:1,source:'rich-timeline'};cursor+=dur}
    if(cursor>0)return{phase:'post-effect',hours:h,progress:1,source:'rich-timeline'};
    try{return{...(window.ClinicalEngine?.currentJournalPhase?.(ing,at)||{phase:'unknown',progress:0}),hours:h,source:'legacy'}}catch{return{phase:'unknown',hours:h,progress:0,source:'none'}}
  }
  function phaseWeight(ph){return{'onset':.25,'come-up':.65,'peak':1,'plateau':.9,'offset':.55,'residual':.2,'post-effect':.05}[ph]??.5}
  function exposureWeight(ing,at=Date.now()){
    try{const ex=window.ClinicalEngine?.clinicalExposure?.(ing,at);if(ex?.remainingFraction!=null)return clamp(ex.remainingFraction,0,1)}catch{}
    const hl=rangeHours(richTimeline(ing.substanceName).halfLife);if(hl){const mean=(hl[0]+hl[1])/2,h=Math.max(0,(at-ing.time)/3600000);return Math.pow(.5,h/mean)}return 1
  }
  function smartPrediction(ing,at=Date.now()){
    const pd=mergePD(ing.substanceName,ing),phase=phaseFor(ing,at),w=phaseWeight(phase.phase)*exposureWeight(ing,at);
    const topB=Object.entries(pd.benefits).map(([k,v])=>({k,v:Number(v)||0,weighted:(Number(v)||0)*w})).filter(x=>x.weighted>=15).sort((a,b)=>b.weighted-a.weighted).slice(0,4);
    const topA=Object.entries(pd.adverse).map(([k,v])=>({k,v:Number(v)||0,weighted:(Number(v)||0)*w})).filter(x=>x.weighted>=15).sort((a,b)=>b.weighted-a.weighted).slice(0,4);
    return{pd,phase,weight:w,topBenefits:topB,topAdverse:topA}
  }
  function labelFor(kind,k){const arr=kind==='benefit'?BENEFITS:ADVERSE;return arr.find(x=>x[0]===k)?.[1]||k}

  function completeness(name){
    const p=baseProfile(name)||{},pk=p.pk||{},pd=p.pd||{},t=pk.timeline||{};const checks=[!!p.class,!!p.mechanism,(pd.targets||[]).length>0,!!t.onset,!!t.peak,!!t.offset,!!t.halfLife||!!pk.halfLifeH||!!pk.halfLifeActiveH,!!t.tmax||!!pk.tmaxH||!!pk.tmaxActiveH,Object.keys(pd.axes||{}).length>=4,Object.keys(pd.benefits||{}).length>=5,Object.keys(pd.adverse||{}).length>=5,(p.sources?.secondary||[]).length>0,!!p.evidenceNote];return{score:Math.round(100*checks.filter(Boolean).length/checks.length),missing:checks.filter(x=>!x).length,total:checks.length}
  }

  function substancesForLab(){const seen=new Map();for(const i of allIngs())seen.set(keyOf(i.substanceName),i.substanceName);for(const k of Object.keys(state.clinicalOverrides||{}))if(!seen.has(k))seen.set(k,state.substanceOverrides?.[k]?.name||k);return[...seen.values()].sort((a,b)=>a.localeCompare(b))}

  function renderLab(){
    ensure();topbar('Laboratório PK/PD',{back:true,backLabel:'Clínico'});const recent=allIngs().filter(i=>Date.now()-i.time<=72*3600e3).reverse(),names=substancesForLab();
    $('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">Modelo inteligente</div><div class="row-sub">Dose + formulação + timeline rica + resposta individual</div></div></div>
      <div class="section-caption">Agora / últimas 72 h</div><div class="card">${recent.map(i=>{const x=smartPrediction(i),prof=x.pd.profile;return`<div class="smart-ing"><div class="smart-ing-head"><div><strong>${escx(i.substanceName)}</strong> <span class="row-sub">${i.dose??'—'} ${escx(i.units||'')}</span></div><b>${escx(x.phase.phase)}</b></div><div class="row-sub">${fmtDate(i.time)} ${fmtTime(i.time)} · peso atual ${Math.round(x.weight*100)}%${prof?` · perfil ${escx(prof.label||'dose/formulação')}`:' · PD-base'}</div>${x.topBenefits.length?`<div class="smart-chips">${x.topBenefits.map(v=>`<span class="chip">↑ ${escx(labelFor('benefit',v.k))} ${Math.round(v.weighted)}</span>`).join('')}</div>`:''}${x.topAdverse.length?`<div class="smart-chips">${x.topAdverse.map(v=>`<span class="chip unsafe">⚠ ${escx(labelFor('adverse',v.k))} ${Math.round(v.weighted)}</span>`).join('')}</div>`:''}</div>`}).join('')||'<div class="empty">Nenhuma ingestão nas últimas 72 h.</div>'}</div>
      <div class="section-caption">Qualidade dos modelos</div><div class="card">${names.map(name=>{const c=completeness(name),pc=profiles(name).length,obs=window.ObservedResponse?.profileFor?.(name);return`<button class="list-row" data-smart-substance="${escx(name)}"><div class="row-main"><div class="row-title strong">${escx(name)}</div><div class="row-sub">completude ${c.score}% · ${pc} perfil(is) dose/formulação${obs?.n?` · ${obs.n} check-in(s) associado(s)`:''}</div><div class="smart-meter"><i style="width:${c.score}%"></i></div></div><span class="chev">›</span></button>`}).join('')||'<div class="empty">Sem modelos clínicos ainda.</div>'}</div>
      <div class="section-footer">Os escores são pesos do modelo, não probabilidades clínicas. A associação com check-ins é temporal e não prova causalidade.</div>`;
  }

  function renderProfiles(name){
    ensure();const xs=profiles(name),c=completeness(name);topbar('PD por dose',{back:true,backLabel:'Laboratório',right:`<button class="navbtn" data-smart-new-profile="${escx(name)}">＋</button>`});
    $('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">${escx(name)}</div><div class="row-sub">Completude farmacológica ${c.score}%</div></div><button class="primary compact" data-smart-new-profile="${escx(name)}">＋ Perfil</button></div>
      <div class="section-caption">Perfis de dose / formulação</div>${xs.map(p=>`<div class="card" style="margin-bottom:10px"><button class="list-row" data-smart-edit-profile="${escx(p.id)}" data-smart-name="${escx(name)}"><div class="row-main"><div class="row-title strong">${escx(p.label||'Perfil')}</div><div class="row-sub">${p.minDose??'—'}–${p.maxDose??'—'} ${escx(p.unit||'mg')} · ${escx(p.formulation||'any')}</div></div><span class="chev">›</span></button></div>`).join('')||'<div class="card empty">Nenhum perfil dependente de dose. O motor usa o PD-base.</div>'}
      <div class="section-caption">Calibração individual</div><div class="card"><button class="list-row" data-smart-calibrate="${escx(name)}"><div class="row-main"><div class="row-title strong">Ajustes do paciente</div><div class="row-sub">Correções locais aplicadas após o PD-base/perfil</div></div><span class="chev">›</span></button></div>
      <div class="section-footer">Perfis específicos têm prioridade sobre o PD-base quando dose e formulação correspondem.</div>`;
  }

  function slider(kind,key,label,val,min=0,max=100){const v=clamp(val,min,max);return`<div class="pdv2-row"><div class="pdv2-head"><span>${escx(label)}</span><b data-smart-value="${kind}:${key}">${v}</b></div><input data-smart-slider="${kind}:${key}" type="range" min="${min}" max="${max}" step="1" value="${v}"></div>`}
  function profileForm(name,id=null){
    ensure();const base=baseProfile(name)?.pd||{},old=id?profiles(name).find(x=>x.id===id):null,p=old||{id:uuid(),label:'',formulation:'any',minDose:null,maxDose:null,unit:'mg',active:true,axes:{...(base.axes||{})},benefits:{...(base.benefits||{})},adverse:{...(base.adverse||{})},notes:''};
    modal(`${modalHeader(old?'Editar perfil PD':'Novo perfil PD',`<button class="navbtn" data-smart-save-profile="${escx(p.id)}" data-smart-name="${escx(name)}">Salvar</button>`,'Cancelar')}<div class="smart-form">
      <div class="section-caption">Identificação</div><div class="card"><div class="fieldrow"><label>Nome do perfil</label><input id="spp-label" value="${escx(p.label||'')}" placeholder="ex.: baixa exposição, IR terapêutica"></div><div class="fieldrow"><label>Formulação</label><input id="spp-form" value="${escx(p.formulation||'any')}" placeholder="any, IR, XR..."></div><div class="fieldrow"><label>Dose mínima</label><input id="spp-min" type="number" step="any" inputmode="decimal" value="${p.minDose??''}"></div><div class="fieldrow"><label>Dose máxima</label><input id="spp-max" type="number" step="any" inputmode="decimal" value="${p.maxDose??''}"></div><div class="fieldrow"><label>Unidade</label><input id="spp-unit" value="${escx(p.unit||'mg')}"></div><div class="fieldrow"><textarea id="spp-notes" placeholder="Racional / observações">${escx(p.notes||'')}</textarea></div></div>
      <details class="card smart-details" open><summary class="row-title strong">Sistemas / receptores (-100 a +100)</summary>${SYSTEMS.map(([k,l])=>slider('axis',k,l,Math.round((p.axes?.[k]||0)*100),-100,100)).join('')}</details>
      <details class="card smart-details"><summary class="row-title strong">Benefícios (0–100)</summary>${BENEFITS.map(([k,l])=>slider('benefit',k,l,p.benefits?.[k]||0)).join('')}</details>
      <details class="card smart-details"><summary class="row-title strong">Adversos (0–100)</summary>${ADVERSE.map(([k,l])=>slider('adverse',k,l,p.adverse?.[k]||0)).join('')}</details>
      ${old?`<div class="section-caption">Ações</div><div class="card"><button class="destructive" data-smart-delete-profile="${escx(p.id)}" data-smart-name="${escx(name)}">Excluir perfil</button></div>`:''}
    </div>`);
    document.querySelectorAll('[data-smart-slider]').forEach(el=>el.oninput=()=>{const b=document.querySelector(`[data-smart-value="${el.dataset.smartSlider}"]`);if(b)b.textContent=el.value});
  }
  async function saveProfile(name,id){
    ensure();const min=n($('#spp-min')?.value),max=n($('#spp-max')?.value);if(min!=null&&max!=null&&max<min){toast('Dose máxima não pode ser menor que a mínima.');return}const axes={},benefits={},adverse={};document.querySelectorAll('[data-smart-slider]').forEach(el=>{const [kind,k]=el.dataset.smartSlider.split(':');if(kind==='axis')axes[k]=Number(el.value)/100;else if(kind==='benefit')benefits[k]=Number(el.value);else adverse[k]=Number(el.value)});
    const obj={id,label:$('#spp-label')?.value.trim()||'Perfil',formulation:$('#spp-form')?.value.trim()||'any',minDose:min,maxDose:max,unit:$('#spp-unit')?.value.trim()||'mg',axes,benefits,adverse,notes:$('#spp-notes')?.value.trim()||'',active:true,updatedAt:Date.now()};const k=keyOf(name),arr=profiles(name).slice(),idx=arr.findIndex(x=>x.id===id);if(idx>=0)arr[idx]=obj;else arr.push(obj);state.dosePDProfiles[k]=arr;await saveState();closeModal();toast('Perfil PD salvo.');renderProfiles(name)
  }

  function calibrationForm(name){
    ensure();const m=modifier(name),obs=window.ObservedResponse?.profileFor?.(name);topbar('Calibração individual',{back:true,backLabel:'PD por dose'});const phaseText=obs?.phases?.map(ph=>`${ph.phase}: n=${ph.n}${ph.metrics?.mood!=null?` · humor ${ph.metrics.mood.toFixed(1)}`:''}${ph.metrics?.anxiety!=null?` · ansiedade ${ph.metrics.anxiety.toFixed(1)}`:''}${ph.metrics?.energy!=null?` · energia ${ph.metrics.energy.toFixed(1)}`:''}${ph.metrics?.focus!=null?` · foco ${ph.metrics.focus.toFixed(1)}`:''}${ph.metrics?.sedation!=null?` · sedação ${ph.metrics.sedation.toFixed(1)}`:''}`).join('<br>')||'Sem check-ins associados.';
    $('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">${escx(name)}</div><div class="row-sub">Correção personalizada sobre o modelo canônico</div></div></div><div class="section-caption">Observado</div><div class="card"><div class="summary">${phaseText}</div></div><div class="section-caption">Modificadores (-50 a +50)</div><div class="card">${CALIBRATION.map(([k,l])=>{const kind=['sedation','anxietyActivation','insomnia'].includes(k)?'adverse':'benefit',v=m?.[kind+'s']?.[k]??0;return slider('cal-'+kind,k,l,v,-50,50)}).join('')}</div><button class="primary" data-smart-save-calibration="${escx(name)}">Salvar calibração</button><button class="secondary" data-smart-reset-calibration="${escx(name)}">Zerar calibração</button><div class="section-footer">+ aumenta e − reduz o peso individual daquele domínio. Check-ins são apenas contexto temporal; o app não aplica ajuste causal automaticamente.</div>`;document.querySelectorAll('[data-smart-slider]').forEach(el=>el.oninput=()=>{const b=document.querySelector(`[data-smart-value="${el.dataset.smartSlider}"]`);if(b)b.textContent=(Number(el.value)>0?'+':'')+el.value});
  }
  async function saveCalibration(name){ensure();const benefits={},adverse={};document.querySelectorAll('[data-smart-slider^="cal-"]').forEach(el=>{const [prefix,kind,k]=el.dataset.smartSlider.split(':').length===3?el.dataset.smartSlider.split(':'):[null,null,null]});document.querySelectorAll('[data-smart-slider]').forEach(el=>{if(!el.dataset.smartSlider.startsWith('cal-'))return;const raw=el.dataset.smartSlider.slice(4),idx=raw.indexOf(':');const kind=raw.slice(0,idx),k=raw.slice(idx+1);if(kind==='benefit')benefits[k]=Number(el.value);else adverse[k]=Number(el.value)});state.patientPDModifiers[keyOf(name)]={benefits,adverse,updatedAt:Date.now()};await saveState();toast('Calibração salva.');renderProfiles(name)}

  function injectHub(){const screen=$('#screen');if(!screen||document.querySelector('#smart-pkpd-hub'))return;const wrap=document.createElement('div');wrap.id='smart-pkpd-hub';wrap.innerHTML=`<div class="section-caption">Modelagem inteligente</div><div class="card clinical-menu-card"><button class="list-row" data-smart-action="lab"><div class="row-main"><div class="row-title strong">Laboratório PK/PD</div><div class="row-sub">Dose, formulação, fase, efeitos previstos e completude</div></div><span class="chev">›</span></button><button class="list-row" data-smart-action="profiles"><div class="row-main"><div class="row-title">PD dependente de dose/formulação</div><div class="row-sub">Perfis diferentes para baixa, média, alta exposição, IR/XR</div></div><span class="chev">›</span></button></div>`;screen.appendChild(wrap)}
  function renderProfileIndex(){ensure();topbar('Perfis PD',{back:true,backLabel:'Clínico'});const names=substancesForLab();$('#screen').innerHTML=`<div class="section-caption">Substâncias</div><div class="card">${names.map(name=>`<button class="list-row" data-smart-substance="${escx(name)}"><div class="row-main"><div class="row-title strong">${escx(name)}</div><div class="row-sub">${profiles(name).length} perfil(is) · completude ${completeness(name).score}%</div></div><span class="chev">›</span></button>`).join('')||'<div class="empty">Nenhuma substância registrada.</div>'}</div>`}

  const baseHub=window.renderClinicalHub||window.ClinicalSuite?.render;if(baseHub){window.renderClinicalHub=renderClinicalHub=function(){baseHub();injectHub()}}
  if(typeof clinicalSubstanceHTML==='function'){
    const baseHTML=clinicalSubstanceHTML;window.clinicalSubstanceHTML=clinicalSubstanceHTML=function(name){return baseHTML(name)+`<div class="section-caption">Dose / formulação</div><div class="card"><button class="linkrow" data-smart-substance="${escx(name)}">Editar perfis PD dependentes de dose <span style="float:right">›</span></button></div>`}
  }

  document.addEventListener('click',async e=>{
    const a=e.target.closest('[data-smart-action]');if(a){e.preventDefault();e.stopImmediatePropagation();a.dataset.smartAction==='lab'?renderLab():renderProfileIndex();return}
    const sub=e.target.closest('[data-smart-substance]');if(sub){e.preventDefault();e.stopImmediatePropagation();renderProfiles(sub.dataset.smartSubstance);return}
    const nw=e.target.closest('[data-smart-new-profile]');if(nw){e.preventDefault();e.stopImmediatePropagation();profileForm(nw.dataset.smartNewProfile);return}
    const ed=e.target.closest('[data-smart-edit-profile]');if(ed){e.preventDefault();e.stopImmediatePropagation();profileForm(ed.dataset.smartName,ed.dataset.smartEditProfile);return}
    const sv=e.target.closest('[data-smart-save-profile]');if(sv){e.preventDefault();e.stopImmediatePropagation();await saveProfile(sv.dataset.smartName,sv.dataset.smartSaveProfile);return}
    const del=e.target.closest('[data-smart-delete-profile]');if(del){e.preventDefault();e.stopImmediatePropagation();if(confirm('Excluir este perfil PD?')){const k=keyOf(del.dataset.smartName);state.dosePDProfiles[k]=profiles(del.dataset.smartName).filter(x=>x.id!==del.dataset.smartDeleteProfile);await saveState();closeModal();renderProfiles(del.dataset.smartName)}return}
    const cal=e.target.closest('[data-smart-calibrate]');if(cal){e.preventDefault();e.stopImmediatePropagation();calibrationForm(cal.dataset.smartCalibrate);return}
    const sc=e.target.closest('[data-smart-save-calibration]');if(sc){e.preventDefault();e.stopImmediatePropagation();await saveCalibration(sc.dataset.smartSaveCalibration);return}
    const rc=e.target.closest('[data-smart-reset-calibration]');if(rc){e.preventDefault();e.stopImmediatePropagation();state.patientPDModifiers[keyOf(rc.dataset.smartResetCalibration)]={};await saveState();toast('Calibração zerada.');calibrationForm(rc.dataset.smartResetCalibration);return}
  },true);

  if(typeof journalPayload==='function'){
    const base=journalPayload;journalPayload=function(){ensure();const p=base();p.clinicalData={...(p.clinicalData||{}),dosePDProfiles:state.dosePDProfiles||{},patientPDModifiers:state.patientPDModifiers||{},smartPKPDSettings:state.smartPKPDSettings||{}};return p}
  }
  if(typeof importJournal==='function'){
    const base=importJournal;importJournal=async function(file){let extra=null;try{extra=JSON.parse(await file.text())?.clinicalData||null}catch{}await base(file);if(extra){state.dosePDProfiles=extra.dosePDProfiles||state.dosePDProfiles||{};state.patientPDModifiers=extra.patientPDModifiers||state.patientPDModifiers||{};state.smartPKPDSettings=extra.smartPKPDSettings||state.smartPKPDSettings||{};ensure();await saveState()}}
  }

  const style=document.createElement('style');style.textContent=`.smart-ing{padding:12px 0;border-bottom:1px solid rgba(127,127,127,.14)}.smart-ing:last-child{border-bottom:0}.smart-ing-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.smart-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.smart-meter{height:4px;border-radius:4px;background:rgba(127,127,127,.15);overflow:hidden;margin-top:7px}.smart-meter i{display:block;height:100%;background:currentColor;opacity:.65}.smart-form{padding:0 14px 36px}.smart-details{padding:12px 14px;margin-top:12px}.smart-details summary{cursor:pointer;margin-bottom:6px}.secondary{width:100%;border:0;border-radius:12px;padding:13px;margin-top:8px;font-weight:600}`;document.head.appendChild(style);
  ensure();window.SmartPKPD={version:'4.1',profileForIngestion,mergePD,phaseFor,smartPrediction,completeness,renderLab};
})();
