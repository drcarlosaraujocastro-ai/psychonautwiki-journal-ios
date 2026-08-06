'use strict';

/* Mobile UX Orchestrator v1
 * Makes the app feel like one product instead of stacked modules.
 * - 5-tab mobile navigation: Hoje / Journal / Clínico / Treino / Mais
 * - Patient-first Today dashboard with context-aware shortcuts
 * - Explicit exercise entry points in Workout
 * - Compact More screen for lower-frequency destinations
 * - Non-destructive: existing renderers/data remain source of truth
 */
(function(){
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const icon={
    patient:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4.2 3-6.2 7-6.2s6.2 2 7 6.2"/></svg>',
    journal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 4v16"/></svg>',
    clinical:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="M7 7h10v10H7z"/></svg>',
    workout:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>'
  };

  function activeGroups(){try{return window.LiveEffectsV2?.activeGroups?.(Date.now())||[]}catch{return[]}}
  function adherence(){try{return typeof adherenceForDay==='function'?adherenceForDay(Date.now()):[]}catch{return[]}}
  function workoutStatus(){try{return window.WorkoutAnalytics?.smartStatus?.()||null}catch{return null}}
  function lowStock(){try{return typeof lowStockAlerts==='function'?lowStockAlerts():[]}catch{return[]}}
  function lastCheckin(){return(state.clinicalCheckins||[]).slice().sort((a,b)=>Number(b.time)-Number(a.time))[0]||null}
  function rel(ts){if(!ts)return'—';const m=Math.max(0,Math.round((Date.now()-Number(ts))/60000));if(m<60)return`${m} min`;const h=m/60;if(h<24)return`${h.toFixed(h<10?1:0)} h`;return`${Math.round(h/24)} d`}

  function renderToday(){
    const gs=activeGroups(),adh=adherence(),wo=workoutStatus(),stock=lowStock(),ci=lastCheckin();
    const taken=adh.filter(x=>x.ing).length,miss=adh.filter(x=>x.status==='não registrado').length;
    topbar('Hoje',{large:'Hoje'});
    $('#screen').innerHTML=`
      <div class="ux-hero"><div><span>${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</span><b>${gs.length?`${gs.length} substância(s) contribuindo agora`:'Sem exposição ativa relevante'}</b></div><button class="ux-main" data-clinical-action="checkin">Check-in</button></div>
      <div class="ux-metrics">
        <button class="ux-metric" data-ux-go="meds"><span>Medicamentos</span><b>${taken}/${adh.length||0}</b><small>${miss?`${miss} sem registro`:'sem pendência detectada'}</small></button>
        <button class="ux-metric" data-clinical-action="now"><span>Ativos agora</span><b>${gs.length}</b><small>${gs.slice(0,2).map(g=>g.name).join(' · ')||'nenhum relevante'}</small></button>
        <button class="ux-metric" data-tab="workout"><span>Treino</span><b>${wo?.sub==null?'—':`${Math.round(wo.sub)}%`}</b><small>prontidão subjetiva</small></button>
        <button class="ux-metric" data-ux-go="inventory"><span>Estoque</span><b>${stock.length}</b><small>${stock.length?'alerta(s)':'sem alerta'}</small></button>
      </div>
      <div class="section-caption">Agora</div><div class="card">${gs.length?gs.slice(0,5).map(g=>`<button class="list-row" data-clinical-action="now"><div class="row-main"><div class="row-title strong">${escx(g.name)}</div><div class="row-sub">${escx(g.dominant?.phase?.phase||'fase incerta')} · efeito estimado ${Math.round(clamp(g.subjectiveIntensity,0,1)*100)}% · carga PK ${Math.round(clamp((g.pkLoad||0)/1.5,0,1)*100)}%</div></div><span class="chev">›</span></button>`).join(''):'<div class="summary">Nenhum medicamento/substância com contribuição relevante detectada agora.</div>'}</div>
      <div class="section-caption">Registrar</div><div class="ux-actions">
        <button data-clinical-action="checkin"><b>Check-in inteligente</b><span>Farmacologia ativa + sintomas</span></button>
        <button data-ux-go="patient-daily"><b>Diário do dia</b><span>Funcionamento e contexto</span></button>
        <button data-tab="workout"><b>Treino</b><span>Plano, exercícios e séries</span></button>
        <button data-ux-go="patient-consult"><b>Preparar consulta</b><span>Resumo e perguntas</span></button>
      </div>
      <div class="section-caption">Último check-in</div><div class="card"><div class="summary">${ci?`${rel(ci.time)} atrás · ${escx(ci.smartInterpretation?.classification||ci.smartInterpretation?.summary||'registro clínico')}`:'Ainda não há check-in registrado.'}</div></div>`;
  }

  function renderMore(){
    topbar('Mais',{large:'Mais'});
    $('#screen').innerHTML=`<div class="section-caption">Dados e conhecimento</div><div class="card">
      <button class="list-row" data-ux-open="substances"><div class="row-main"><div class="row-title strong">Substâncias</div><div class="row-sub">Banco, PK/PD e farmacologia avançada</div></div><span class="chev">›</span></button>
      <button class="list-row" data-ux-open="safer"><div class="row-main"><div class="row-title strong">Segurança</div><div class="row-sub">Interações e redução de danos</div></div><span class="chev">›</span></button>
      <button class="list-row" data-ux-open="settings"><div class="row-main"><div class="row-title strong">Ajustes e ferramentas</div><div class="row-sub">Backup, laboratório PK/PD, diagnóstico e preferências</div></div><span class="chev">›</span></button>
    </div><div class="section-caption">Atalhos clínicos</div><div class="card">
      <button class="list-row" data-clinical-action="inventory"><div class="row-main"><div class="row-title">Estoque</div><div class="row-sub">Lotes, saldo e validade</div></div><span class="chev">›</span></button>
      <button class="list-row" data-clinical-action="quality"><div class="row-main"><div class="row-title">Qualidade dos dados</div><div class="row-sub">Duplicidades e inconsistências</div></div><span class="chev">›</span></button>
      <button class="list-row" data-cal-open><div class="row-main"><div class="row-title">Calibração assistida</div><div class="row-sub">Aprendizado individual revisável</div></div><span class="chev">›</span></button>
    </div>`;
  }

  function renderTabs(){
    const el=document.querySelector('#tabbar');if(!el)return;
    const h=(location.hash||'').replace('#','');const active=h==='patient'||h==='today'?'patient':h==='journal'?'journal':h==='clinical'?'clinical':h==='workout'?'workout':['substances','safer','settings','more'].includes(h)?'more':'journal';
    const items=[['patient','Hoje'],['journal','Journal'],['clinical','Clínico'],['workout','Treino'],['more','Mais']];
    el.innerHTML=items.map(([id,label])=>`<button class="tab ${active===id?'active':''}" data-ux-tab="${id}">${icon[id]}<span>${label}</span></button>`).join('');
  }

  const legacyRenderTab=window.renderTab;
  window.tabs=renderTabs;
  window.renderTab=function(tab){
    if(tab==='patient'||tab==='today'){currentTab='patient';location.hash='patient';navStack=[];renderTabs();renderToday();return}
    if(tab==='more'){currentTab='more';location.hash='more';navStack=[];renderTabs();renderMore();return}
    if(typeof legacyRenderTab==='function'){legacyRenderTab(tab);renderTabs();return}
  };

  function enhanceWorkout(){
    const sc=$('#screen');if(!sc||document.querySelector('#ux-workout-entry'))return;
    const box=document.createElement('div');box.id='ux-workout-entry';box.innerHTML=`<div class="section-caption">Começar por aqui</div><div class="ux-actions"><button data-wo-library><b>Exercícios</b><span>Banco com técnica e músculos</span></button><button data-wo-plans><b>Meus treinos</b><span>Planos fixos por dia</span></button><button data-wo-progress><b>Progressão</b><span>Carga, reps, platôs e e1RM</span></button><button data-wo-recovery><b>Recuperação</b><span>Fadiga e prontidão muscular</span></button></div>`;sc.prepend(box);
  }
  const baseWorkout=window.renderWorkoutHub;
  if(typeof baseWorkout==='function')window.renderWorkoutHub=function(){const r=baseWorkout();requestAnimationFrame(enhanceWorkout);return r};

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-ux-tab]');if(tab){e.preventDefault();e.stopImmediatePropagation();window.renderTab(tab.dataset.uxTab);return}
    const open=e.target.closest?.('[data-ux-open]');if(open){e.preventDefault();e.stopImmediatePropagation();const a=open.dataset.uxOpen;if(a==='substances'){currentTab='substances';location.hash='substances';renderSearch()}else if(a==='safer'){currentTab='safer';location.hash='safer';renderSafer()}else{currentTab='settings';location.hash='settings';renderSettings()}renderTabs();return}
    const go=e.target.closest?.('[data-ux-go]');if(go){const a=go.dataset.uxGo;if(a==='inventory'){e.preventDefault();e.stopImmediatePropagation();typeof renderInventory==='function'&&renderInventory()}else if(a==='meds'){e.preventDefault();e.stopImmediatePropagation();if(typeof renderSchedules==='function')renderSchedules();else window.renderTab('clinical')}else if(a==='patient-daily'){e.preventDefault();const x=document.querySelector('[data-ph-daily]');if(x&&x!==go)x.click();else toast('Abra Paciente no Clínico para registrar o diário.')}else if(a==='patient-consult'){e.preventDefault();const x=document.querySelector('[data-ph-consult]');if(x&&x!==go)x.click();else toast('Abra Paciente no Clínico para preparar a consulta.')}}
  },true);

  const st=document.createElement('style');st.textContent=`
    #tabbar{grid-template-columns:repeat(5,1fr)!important}.tab{font-size:10px!important}.tab svg{width:23px!important;height:23px!important}
    .ux-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 14px;padding:15px;border-radius:18px;background:var(--surface);border:1px solid color-mix(in srgb,var(--line) 42%,transparent)}.ux-hero>div{min-width:0;display:flex;flex-direction:column;gap:4px}.ux-hero span{font-size:12px;color:var(--muted);text-transform:capitalize}.ux-hero b{font-size:18px}.ux-main{border:0;background:var(--blue);color:white;border-radius:12px;padding:10px 14px;font-weight:700}
    .ux-metrics{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ux-metric{border:1px solid color-mix(in srgb,var(--line) 42%,transparent);background:var(--surface);color:inherit;border-radius:16px;padding:13px;text-align:left;min-width:0}.ux-metric span,.ux-metric small{display:block;color:var(--muted);font-size:11px}.ux-metric b{display:block;font-size:22px;margin:2px 0}.ux-metric small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ux-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ux-actions>button{border:1px solid color-mix(in srgb,var(--line) 42%,transparent);background:var(--surface);color:inherit;border-radius:15px;padding:14px;text-align:left;min-height:82px}.ux-actions b{display:block;font-size:15px}.ux-actions span{display:block;margin-top:6px;color:var(--muted);font-size:11px;line-height:1.3}
    @media(max-width:370px){.ux-metrics,.ux-actions{grid-template-columns:1fr}.ux-hero{align-items:flex-start;flex-direction:column}.ux-main{width:100%}}
  `;document.head.appendChild(st);

  window.addEventListener('pageshow',()=>setTimeout(renderTabs,0));
  setTimeout(()=>{renderTabs();if(location.hash==='#patient'||location.hash==='#today')renderToday();if(location.hash==='#workout')enhanceWorkout()},0);
  window.UXOrchestrator={version:'1.0',renderToday,renderMore,enhanceWorkout};
})();