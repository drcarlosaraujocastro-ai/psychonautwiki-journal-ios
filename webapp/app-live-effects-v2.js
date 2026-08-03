'use strict';

/* Live Effects v2
 * Cross-session active-medication model + patient-history context + layered timeline.
 * The percentage shown to the user is EFFECT INTENSITY (0–100), not serum concentration.
 * Local-first and descriptive: no redose recommendation or prescriptive dose optimization.
 */
(function(){
  const HOUR=3600e3, DAY=24*HOUR;
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const n=v=>{if(v===''||v==null)return null;const x=Number(v);return Number.isFinite(x)?x:null};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const key=v=>String(v||'').trim().toLowerCase();
  const same=(a,b)=>key(a)===key(b);
  const allIngs=()=> (state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>({...i,experienceId:e.id,experienceSortDate:e.sortDate||e.creationDate}))).filter(i=>Number.isFinite(Number(i.time))).sort((a,b)=>a.time-b.time);
  const profile=name=>{try{return typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||{})}catch{return{}}};
  const doseMg=i=>{const d=n(i?.dose);if(d==null)return null;const u=key(i.units||'mg');if(u==='mg')return d;if(u==='g')return d*1000;if(['µg','ug','mcg'].includes(u))return d/1000;return d};
  const fmtHours=h=>h<1?`${Math.round(h*60)} min`:h<24?`${h.toFixed(h<10?1:0)} h`:`${(h/24).toFixed(h<48?1:0)} d`;
  const PHASE_PT={
    'pre-onset':'pré-início','onset':'início','come-up':'subindo','peak':'pico','plateau':'platô','offset':'queda / offset','residual':'cauda residual','post-effect':'pós-efeito','unknown':'fase incerta'
  };
  const BENEFIT_LABEL={mood:'Humor / efeito antidepressivo',anhedonia:'Resposta à recompensa / anedonia',motivation:'Motivação / esforço',energy:'Energia / ativação',attention:'Atenção',executiveFunction:'Função executiva',anxiolysis:'Ansiólise',antiHyperarousal:'Redução de hiperalerta',sleepInitiation:'Início do sono',sleepMaintenance:'Manutenção do sono',antipsychotic:'Efeito antipsicótico',antiMania:'Efeito antimaníaco',anticonvulsant:'Efeito anticonvulsivante',impulseControlBenefit:'Controle de impulsos',cognitionBenefit:'Benefício cognitivo'};
  const ADVERSE_LABEL={sedation:'Sedação',cognitiveImpairment:'Prejuízo cognitivo',memoryImpairment:'Prejuízo de memória',anxietyActivation:'Ansiedade / ativação',insomnia:'Insônia',sympatheticActivation:'Ativação simpática',orthostasis:'Ortostase / hipotensão',bradycardia:'Bradicardia',tachycardia:'Taquicardia',nausea:'Náusea / GI',appetiteWeight:'Apetite / peso',metabolic:'Carga metabólica',epsAkathisia:'EPS / acatisia',prolactin:'Prolactina',qt:'QT',seizure:'Risco convulsivo',respiratoryDepression:'Depressão respiratória',serotoninSyndrome:'Carga serotoninérgica adversa',impulseControlRisk:'Risco de impulsividade',abuseReinforcement:'Reforço / repetição compulsiva',withdrawal:'Abstinência / descontinuação',rebound:'Rebote',maniaPsychosis:'Ativação mania / psicose'};
  const AXIS_LABEL={dopamine:'Dopamina',norepinephrine:'Noradrenalina',serotonin:'Serotonina',gabaA:'GABA-A',glutamate:'Glutamato',histamineH1:'Histamina H1',alpha1:'Alpha-1',alpha2:'Alpha-2',muscarinic:'Muscarínico',arousal:'Arousal',sympatheticTone:'Tônus simpático',rewardSalience:'Saliência de recompensa'};

  function smart(i,at=Date.now()){
    try{const x=window.SmartPKPD?.smartPrediction?.(i,at);if(x)return x}catch(e){}
    const ph=window.ClinicalEngine?.currentJournalPhase?.(i,at)||{phase:'unknown',progress:0};
    const ex=window.ClinicalEngine?.clinicalExposure?.(i,at)||null;
    const p=profile(i.substanceName)?.pd||{};
    return{phase:{...ph,hours:Math.max(0,(at-i.time)/HOUR)},weight:ex?.remainingFraction??1,pd:{axes:p.axes||{},benefits:p.benefits||{},adverse:p.adverse||{},profile:null}};
  }
  function phaseEnvelope(phase,progress=0){
    const p=clamp(progress,0,1);
    if(phase==='pre-onset')return 0;
    if(phase==='onset')return .08+.27*p;
    if(phase==='come-up')return .35+.55*p;
    if(phase==='peak')return .90+.10*Math.sin(Math.PI*p);
    if(phase==='plateau')return 1-.08*p;
    if(phase==='offset')return .92-.67*p;
    if(phase==='residual')return .25-.22*p;
    return 0;
  }
  function doseFactor(i){
    const p=profile(i.substanceName),db=p?.doseBands||{},d=doseMg(i);if(!(d>0))return 1;
    let ref=n(db.maxTherapeutic??db.maxTherapeuticSingle??db.high??db.standard);
    if(!(ref>0))return 1;
    return clamp(Math.sqrt(d/ref),.35,1.15);
  }
  function isTonicProfile(name){
    const p=profile(name),pk=p?.pk||{},c=key(p?.class||'');
    return Boolean(pk.timeline?.steadyState||pk.steadyStateDays||/antidepress|mood stabil|antipsychotic/.test(c));
  }
  function pkRemaining(i,at=Date.now()){
    try{const ex=window.ClinicalEngine?.clinicalExposure?.(i,at);if(ex?.remainingFraction!=null)return clamp(ex.remainingFraction,0,1)}catch(e){}
    return clamp(smart(i,at)?.weight??0,0,1);
  }
  function singleContribution(i,at=Date.now()){
    const s=smart(i,at),ph=s.phase||{},env=phaseEnvelope(ph.phase,ph.progress),pk=pkRemaining(i,at),df=doseFactor(i);
    let curve=env*(.72+.28*pk)*df;
    if(ph.phase==='post-effect'&&isTonicProfile(i.substanceName)&&pk>.08)curve=Math.max(curve,.18*pk*df);
    return{ing:i,smart:s,phase:ph,pk,curve:clamp(curve,0,1)};
  }

  function historyPattern(name,at=Date.now()){
    const p=profile(name),max=n(p?.doseBands?.maxTherapeutic??p?.doseBands?.maxTherapeuticSingle),xs=allIngs().filter(i=>same(i.substanceName,name)&&i.time<=at&&at-i.time<=30*DAY);
    if(!xs.length)return{activeDays:0,clusterDays:0,supraDays:0,spanDays:0,adaptivePressure:0,reboundPressure:0};
    const days=new Map();for(const i of xs){const d=new Date(i.time),k=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;(days.get(k)||days.set(k,[]).get(k)).push(i)}
    const dayRows=[...days.values()],clusterDays=dayRows.filter(r=>r.length>=2).length;
    const supraDays=max>0?dayRows.filter(r=>r.reduce((s,i)=>s+(doseMg(i)||0),0)>max*1.25).length:0;
    const activeDays=dayRows.length,spanDays=(xs[xs.length-1].time-xs[0].time)/DAY;
    // Intentionally conservative: a few isolated redose days do NOT imply durable receptor dysregulation.
    let adaptivePressure=0;
    if(activeDays>=5&&spanDays>=7){adaptivePressure+=(Math.min(activeDays,21)-4)/17*.12;adaptivePressure+=Math.min(clusterDays/10,.10);adaptivePressure+=Math.min(supraDays/6,.10)}
    const c=key(p?.class||''),tolSensitive=/stimulant|amphetamine|benzodiazep|dopamine agonist|sedative/.test(c)||/moderate|high/.test(key(p?.tolerance?.dependenceRisk||''));
    if(!tolSensitive)adaptivePressure*=.45;
    adaptivePressure=clamp(adaptivePressure,0,.28);
    const latest=xs[xs.length-1],hoursSince=(at-latest.time)/HOUR;
    // Recovery is represented as fading adaptive pressure with time off; not as a claim of "receptor repair" by another drug.
    adaptivePressure*=Math.exp(-Math.max(0,hoursSince-24)/(14*24));
    return{activeDays,clusterDays,supraDays,spanDays,adaptivePressure,reboundPressure:clamp(adaptivePressure*(clusterDays?1.35:1),0,.45)};
  }

  function groupAt(name,ings,at=Date.now()){
    const cs=ings.filter(i=>i.time<=at).map(i=>singleContribution(i,at)).filter(x=>x.pk>.01||x.curve>.005);
    if(!cs.length)return null;
    const relevant=cs.filter(x=>at-x.ing.time<=21*DAY);
    if(!relevant.length)return null;
    let pharmacologic=1;for(const x of relevant)pharmacologic*=1-clamp(x.curve,0,.95);pharmacologic=1-pharmacologic;
    const hist=historyPattern(name,at),subjective=clamp(pharmacologic*(1-hist.adaptivePressure),0,1);
    const dominant=relevant.slice().sort((a,b)=>b.curve-a.curve)[0];
    const last=relevant.slice().sort((a,b)=>b.ing.time-a.ing.time)[0];
    const pkLoad=clamp(relevant.reduce((s,x)=>s+x.pk*doseFactor(x.ing),0),0,2.5);
    return{name,contributions:relevant,dominant,last,pharmacologicIntensity:pharmacologic,subjectiveIntensity:subjective,pkLoad,hist};
  }
  function activeGroups(at=Date.now()){
    const src=allIngs().filter(i=>i.time<=at&&at-i.time<=21*DAY),map=new Map();for(const i of src){const k=key(i.substanceName);if(!map.has(k))map.set(k,{name:i.substanceName,ings:[]});map.get(k).ings.push(i)}
    return[...map.values()].map(g=>groupAt(g.name,g.ings,at)).filter(Boolean).filter(g=>g.subjectiveIntensity>=.02||g.pkLoad>=.08).sort((a,b)=>b.subjectiveIntensity-a.subjectiveIntensity);
  }
  function observedContext(g){
    try{const p=window.ObservedResponse?.profileFor?.(g.name);if(!p?.n)return null;const phase=g.dominant?.phase?.phase;const row=(p.phases||[]).find(x=>x.phase===phase)||null;return{n:p.n,confidence:p.confidence||0,phase,row}}catch{return null}
  }
  function phaseDetail(g,at=Date.now()){
    const d=g.dominant,ph=d?.phase||{},h=Math.max(0,(at-d.ing.time)/HOUR),lbl=PHASE_PT[ph.phase]||ph.phase||'fase incerta',pct=Math.round(g.subjectiveIntensity*100);
    const nActive=g.contributions.filter(x=>x.curve>.02).length;
    return{label:lbl,h,pct,nActive};
  }
  function riskText(v){return v>=.30?'alta':v>=.15?'moderada':v>=.06?'leve':'baixa'}

  function combinedEffects(groups,at=Date.now()){
    const b={},a={},axes={},contributors={};
    for(const g of groups){
      for(const c of g.contributions){const s=c.smart||{},w=c.curve*(1-g.hist.adaptivePressure);if(w<=.01)continue;
        for(const [k,v] of Object.entries(s.pd?.benefits||{})){b[k]=(b[k]||0)+Number(v||0)*w;(contributors[`b:${k}`]||=[]).push([g.name,Number(v||0)*w])}
        for(const [k,v] of Object.entries(s.pd?.adverse||{})){a[k]=(a[k]||0)+Number(v||0)*w;(contributors[`a:${k}`]||=[]).push([g.name,Number(v||0)*w])}
        for(const [k,v] of Object.entries(s.pd?.axes||{})){axes[k]=(axes[k]||0)+Number(v||0)*w;(contributors[`x:${k}`]||=[]).push([g.name,Math.abs(Number(v||0)*w)])}
      }
    }
    const saturate=v=>100*(1-Math.exp(-Math.max(0,v)/100));for(const o of [b,a])for(const k of Object.keys(o))o[k]=saturate(o[k]);
    for(const k of Object.keys(axes))axes[k]=clamp(axes[k],-1.5,1.5);
    const rows=[];
    for(const [k,v] of Object.entries(b))if(v>=18)rows.push({kind:'benefit',key:k,label:BENEFIT_LABEL[k]||k,score:v});
    for(const [k,v] of Object.entries(a))if(v>=18)rows.push({kind:'adverse',key:k,label:ADVERSE_LABEL[k]||k,score:v});
    rows.sort((x,y)=>y.score-x.score);
    for(const r of rows){const xs=(contributors[`${r.kind==='benefit'?'b':'a'}:${r.key}`]||[]).sort((x,y)=>y[1]-x[1]);r.sources=[...new Set(xs.slice(0,3).map(x=>x[0]))]}
    return{benefits:b,adverse:a,axes,rows:rows.slice(0,10)};
  }

  function currentEffectsHTML(){
    const at=Date.now(),groups=activeGroups(at),combo=combinedEffects(groups,at),lastCi=(state.clinicalCheckins||[]).filter(c=>Number(c.time)<=at).sort((a,b)=>b.time-a.time)[0];
    return `<div class="section-title">O que provavelmente está acontecendo agora?</div><div class="card livev2-card">
      <div class="livev2-intro">Modelo integrado das substâncias ainda ativas, mesmo quando foram registradas em outras sessões. A porcentagem abaixo é <b>intensidade de efeito estimada agora (0–100%)</b>, não concentração sérica.</div>
      ${groups.length?groups.map(g=>{const d=phaseDetail(g,at),obs=observedContext(g),ad=Math.round(g.hist.adaptivePressure*100);return`<div class="livev2-drug"><div class="livev2-drug-head"><div><strong>${escx(g.name)}</strong><div class="row-sub">${escx(d.label)} · ${fmtHours(d.h)} desde a dose dominante${d.nActive>1?` · ${d.nActive} doses ainda contribuindo`:''}</div></div><div class="livev2-score"><b>${d.pct}%</b><span>intensidade</span></div></div><div class="livev2-meter"><i style="width:${d.pct}%"></i></div><div class="livev2-meta"><span>Carga PK relativa: ${Math.round(clamp(g.pkLoad/1.5,0,1)*100)}/100</span>${ad>=3?`<span>Pressão adaptativa: ${ad}/100</span>`:''}${g.hist.reboundPressure>=.06?`<span>Rebote: ${riskText(g.hist.reboundPressure)}</span>`:''}</div>${obs?`<div class="row-sub">Histórico individual: ${obs.n} check-in(s) associado(s) · confiança ${Math.round(obs.confidence*100)}%${obs.row?` · ${obs.row.n} na fase semelhante`:''}</div>`:''}</div>`}).join(''):'<div class="empty">Nenhuma substância com contribuição relevante detectada agora.</div>'}
      ${combo.rows.length?`<div class="section-caption livev2-caption">Efeitos combinados mais prováveis agora</div>${combo.rows.map(r=>`<div class="livev2-effect"><div><span>${r.kind==='benefit'?'↑':'⚠'} ${escx(r.label)}</span><div class="row-sub">principal contribuição: ${r.sources.map(escx).join(' + ')||'modelo combinado'}</div></div><b>${Math.round(r.score)}/100</b></div>`).join('')}`:''}
      ${Object.keys(combo.axes).length?`<div class="section-caption livev2-caption">Sistemas predominantes</div><div class="livev2-chips">${Object.entries(combo.axes).map(([k,v])=>({k,v:Number(v)})).filter(x=>Math.abs(x.v)>=.22).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,6).map(x=>`<span class="chip">${escx(AXIS_LABEL[x.k]||x.k)} ${x.v>0?'↑':'↓'} ${Math.round(Math.abs(x.v)*100)}</span>`).join('')}</div>`:''}
      ${lastCi&&at-lastCi.time<=12*HOUR?`<div class="section-caption livev2-caption">Último estado observado</div><div class="livev2-observed"><span>Humor ${lastCi.mood??'—'}/10</span><span>Ansiedade ${lastCi.anxiety??'—'}/10</span><span>Energia ${lastCi.energy??'—'}/10</span><span>Foco ${lastCi.focus??'—'}/10</span><span>Sedação ${lastCi.sedation??'—'}/10</span>${lastCi.heartRate?`<span>FC ${lastCi.heartRate}</span>`:''}${lastCi.bloodPressure?`<span>PA ${escx(lastCi.bloodPressure)}</span>`:''}</div>`:''}
      <div class="section-footer livev2-note">A intensidade usa fase da curva, sobreposição de doses, meia-vida/PK, dose relativa, formulação, perfis PD por dose e ajustes individuais existentes. Padrões repetidos por vários dias podem reduzir a expressão subjetiva prevista e aumentar rebote; alguns dias isolados de redose não são tratados automaticamente como adaptação duradoura. Tempo sem exposição pode reduzir essa pressão ao longo do tempo. O modelo não assume que outro medicamento “repare receptores” sem evidência específica.</div>
    </div>`;
  }

  function groupIntensitySeries(name,ings,times){return times.map(t=>groupAt(name,ings,t)?.subjectiveIntensity||0)}
  function groupPKSeries(name,ings,times){return times.map(t=>{const g=groupAt(name,ings,t);return g?clamp(g.pkLoad/1.5,0,1):0})}
  function polyline(xs,ys,left,top,w,h){const max=Math.max(1,xs.length-1);return xs.map((_,i)=>`${left+i/max*w},${top+h-clamp(ys[i],0,1)*h}`).join(' ')}
  function advancedTimeline(exp){
    state.settings=state.settings||{};state.settings.timelineV2Layers={pw:true,pk:true,pd:true,observed:true,vitals:true,...(state.settings.timelineV2Layers||{})};const L=state.settings.timelineV2Layers;
    const expTimes=(exp.ingestions||[]).map(i=>Number(i.time)).filter(Number.isFinite),anchor=Number(exp.sortDate||exp.creationDate||Date.now());
    const start=Math.min(...expTimes,anchor)-6*HOUR,end=Math.max(Date.now(),...expTimes,anchor)+18*HOUR,total=Math.max(6*HOUR,end-start),samples=72,times=Array.from({length:samples},(_,i)=>start+i/(samples-1)*total);
    const source=allIngs().filter(i=>i.time<=end&&end-i.time<=14*DAY),map=new Map();for(const i of source){const k=key(i.substanceName);if(!map.has(k))map.set(k,{name:i.substanceName,ings:[]});map.get(k).ings.push(i)}
    const W=760,H=235,left=42,top=18,plotW=700,plotH=150;
    let svg=`<svg class="livev2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMin meet">`;
    for(let j=0;j<=6;j++){const x=left+j/6*plotW,ts=start+j/6*total;svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${top+plotH}" class="livev2-grid"/><text x="${x}" y="${top+plotH+20}" class="livev2-axis" text-anchor="middle">${new Date(ts).toLocaleString('pt-BR',{day:'2-digit',hour:'2-digit',minute:'2-digit'})}</text>`}
    for(const g of map.values()){
      const color=typeof colorFor==='function'?colorFor(g.name):'#007aff';
      if(L.pk){const ys=groupPKSeries(g.name,g.ings,times);if(Math.max(...ys)>.02)svg+=`<polyline points="${polyline(times,ys,left,top,plotW,plotH)}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6 4" opacity=".55"/>`}
      if(L.pd){const ys=groupIntensitySeries(g.name,g.ings,times);if(Math.max(...ys)>.02)svg+=`<polyline points="${polyline(times,ys,left,top,plotW,plotH)}" fill="none" stroke="${color}" stroke-width="3" opacity=".92"/>`}
    }
    const cis=(state.clinicalCheckins||[]).filter(c=>c.time>=start&&c.time<=end);
    if(L.observed)for(const c of cis){const x=left+(c.time-start)/total*plotW,y=top+plotH-clamp(((Number(c.focus)||5)+(Number(c.energy)||5)+(10-(Number(c.sedation)||5)))/30,0,1)*plotH;svg+=`<circle cx="${x}" cy="${y}" r="5" class="livev2-observed-dot"/><text x="${x+7}" y="${y-7}" class="livev2-mini">F${c.focus??'—'} E${c.energy??'—'} S${c.sedation??'—'}</text>`}
    if(L.vitals)for(const c of cis){if(!c.heartRate&&!c.bloodPressure)continue;const x=left+(c.time-start)/total*plotW,label=[c.heartRate?`FC ${c.heartRate}`:'',c.bloodPressure?`PA ${c.bloodPressure}`:''].filter(Boolean).join(' ');svg+=`<text x="${x}" y="${top+10}" class="livev2-vital" text-anchor="middle">${escx(label)}</text>`}
    const nowX=left+(Date.now()-start)/total*plotW;if(nowX>=left&&nowX<=left+plotW)svg+=`<line x1="${nowX}" y1="${top}" x2="${nowX}" y2="${top+plotH}" class="livev2-now"/><text x="${nowX}" y="${top+plotH+38}" class="livev2-mini" text-anchor="middle">agora</text>`;
    svg+='</svg>';
    return `<div id="timeline-v2-wrap"><div class="section-title">Curvas avançadas</div><div class="card livev2-timeline-controls">${[['pw','PW fenomenologia'],['pk','PK proxy'],['pd','PD previsto'],['observed','Observado'],['vitals','FC/PA']].map(([k,l])=>`<button class="chip ${L[k]?'on':''}" data-livev2-layer="${k}">${escx(l)}</button>`).join('')}</div><div class="timeline-card livev2-timeline">${svg}</div><div class="section-footer">Linha contínua = intensidade PD prevista. Tracejada = carga PK relativa normalizada. Pontos = check-ins. O gráfico inclui carry-over de outras sessões. “Observado” é temporalmente associado, não prova causalidade.</div></div>`;
  }
  function injectTimeline(exp){const old=document.querySelector('.timeline-card');if(!old||document.querySelector('#timeline-v2-wrap'))return;const html=advancedTimeline(exp);old.insertAdjacentHTML('afterend',html);const L=state.settings?.timelineV2Layers||{};old.style.display=L.pw===false?'none':''}

  // Replace the weak current-session-only card with the cross-session model.
  if(window.ClinicalUI){window.ClinicalUI.currentEffectsHTML=currentEffectsHTML}
  const baseRenderExperience=window.renderExperience||renderExperience;
  window.renderExperience=renderExperience=function(id){const r=baseRenderExperience(id);try{const exp=typeof getExperience==='function'?getExperience(id):state.experiences?.find(e=>e.id===id);if(exp)injectTimeline(exp);window.PWJ_PTBR?.localize?.(document)}catch(e){console.warn('Live Effects v2 render',e)}return r};

  document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-livev2-layer]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();state.settings=state.settings||{};state.settings.timelineV2Layers={pw:true,pk:true,pd:true,observed:true,vitals:true,...(state.settings.timelineV2Layers||{})};const k=b.dataset.livev2Layer;state.settings.timelineV2Layers[k]=!state.settings.timelineV2Layers[k];try{await saveState()}catch(_){}if(selectedExperienceId)renderExperience(selectedExperienceId)},true);

  const style=document.createElement('style');style.textContent=`
    .livev2-card{overflow:hidden}.livev2-intro{padding:14px;font-size:13px;line-height:1.45;color:var(--secondary,#8e8e93);border-bottom:1px solid rgba(127,127,127,.14)}
    .livev2-drug{padding:14px;border-bottom:1px solid rgba(127,127,127,.15)}.livev2-drug-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.livev2-score{text-align:right;white-space:nowrap}.livev2-score b{display:block;font-size:22px}.livev2-score span{font-size:10px;color:var(--secondary,#8e8e93)}
    .livev2-meter{height:6px;border-radius:6px;background:rgba(127,127,127,.14);overflow:hidden;margin:10px 0 8px}.livev2-meter i{display:block;height:100%;background:currentColor;border-radius:6px}.livev2-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--secondary,#8e8e93)}.livev2-meta span{padding:4px 7px;border-radius:8px;background:rgba(127,127,127,.10)}
    .livev2-caption{padding:14px 14px 6px}.livev2-effect{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 14px;border-top:1px solid rgba(127,127,127,.10)}.livev2-effect>div{min-width:0}.livev2-effect>b{white-space:nowrap}.livev2-chips,.livev2-observed{display:flex;gap:7px;flex-wrap:wrap;padding:8px 14px 14px}.livev2-observed span{font-size:12px;padding:6px 8px;border-radius:9px;background:rgba(127,127,127,.10)}.livev2-note{padding:12px 14px!important}
    .livev2-timeline-controls{display:flex;gap:6px;flex-wrap:wrap;padding:9px}.livev2-timeline-controls .chip{border:0;opacity:.52}.livev2-timeline-controls .chip.on{opacity:1;font-weight:700}.livev2-timeline{overflow-x:auto}.livev2-svg{min-width:720px;width:100%;height:auto}.livev2-grid{stroke:rgba(127,127,127,.18);stroke-width:1}.livev2-axis,.livev2-mini,.livev2-vital{font-size:10px;fill:var(--secondary,#8e8e93)}.livev2-vital{font-size:9px;font-weight:700}.livev2-observed-dot{fill:var(--text,#fff);stroke:#8e8e93;stroke-width:2}.livev2-now{stroke:#ff3b30;stroke-width:2;stroke-dasharray:3 3}
  `;document.head.appendChild(style);

  window.LiveEffectsV2={version:'2.0',activeGroups,combinedEffects,currentEffectsHTML,historyPattern,advancedTimeline};
})();
