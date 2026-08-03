'use strict';

/* Formulation Manager
 * Adds IR/XR/etc context to ingestions without changing the Journal schema contract.
 * Existing records can inherit a per-substance default formulation.
 */
(function(){
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const keyOf=v=>String(v||'').trim().toLowerCase();
  function ensure(){state.defaultFormulations=state.defaultFormulations&&typeof state.defaultFormulations==='object'?state.defaultFormulations:{}}
  function names(){const m=new Map();for(const e of state.experiences||[])for(const i of e.ingestions||[])m.set(keyOf(i.substanceName),i.substanceName);for(const k of Object.keys(state.clinicalOverrides||{}))if(!m.has(k))m.set(k,state.substanceOverrides?.[k]?.name||k);return[...m.values()].sort((a,b)=>a.localeCompare(b))}
  function defaultFor(name){ensure();return String(state.defaultFormulations[keyOf(name)]||'').trim()}
  function available(name){const xs=(state.dosePDProfiles?.[keyOf(name)]||[]).map(x=>String(x.formulation||'').trim()).filter(x=>x&&x.toLowerCase()!=='any');return[...new Set(xs)]}
  function applyMissing(name,form){let count=0;for(const e of state.experiences||[])for(const i of e.ingestions||[])if(keyOf(i.substanceName)===keyOf(name)&&!String(i.formulation||'').trim()){i.formulation=form;count++}return count}

  function renderManager(){ensure();topbar('Formulações',{back:true,backLabel:'Clínico'});$('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">Formulação por medicamento</div><div class="row-sub">IR, XR, ER e outras variantes para o motor PK/PD</div></div></div><div class="card">${names().map(name=>`<button class="list-row" data-formulation-edit="${escx(name)}"><div class="row-main"><div class="row-title strong">${escx(name)}</div><div class="row-sub">Padrão: ${escx(defaultFor(name)||'não definido')} · ${(state.dosePDProfiles?.[keyOf(name)]||[]).length} perfil(is) PD</div></div><span class="chev">›</span></button>`).join('')||'<div class="empty">Nenhum medicamento registrado.</div>'}</div><div class="section-footer">A formulação padrão é aplicada automaticamente a novas ingestões e pode ser aplicada aos registros antigos que ainda não possuem formulação. Ela não altera dose, horário ou via.</div>`}
  function form(name){const current=defaultFor(name),opts=available(name);modal(`${modalHeader('Formulação padrão',`<button class="navbtn" data-formulation-save="${escx(name)}">Salvar</button>`,'Cancelar')}<div style="padding:10px 14px 34px"><div class="section-caption">${escx(name)}</div><div class="card"><div class="fieldrow"><label>Formulação</label><input id="fm-value" list="fm-options" value="${escx(current)}" placeholder="IR, XR, ER, solução..."></div><datalist id="fm-options">${opts.map(x=>`<option value="${escx(x)}"></option>`).join('')}</datalist><label class="list-row"><div class="row-main"><div class="row-title">Aplicar aos registros antigos sem formulação</div><div class="row-sub">Não substitui formulações já registradas.</div></div><input id="fm-backfill" type="checkbox" checked></label></div></div>`)}
  async function save(name){ensure();const form=String($('#fm-value')?.value||'').trim();if(!form){toast('Informe a formulação.');return}state.defaultFormulations[keyOf(name)]=form;let n=0;if($('#fm-backfill')?.checked)n=applyMissing(name,form);await saveState();closeModal();toast(`Formulação salva${n?` · ${n} registro(s) atualizado(s)`:''}.`);renderManager()}

  if(typeof finishIngestionWizard==='function'){
    const base=finishIngestionWizard;finishIngestionWizard=async function(){ensure();const before=new Set((state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>i.id)));await base();const created=(state.experiences||[]).flatMap(e=>e.ingestions||[]).find(i=>!before.has(i.id));if(created&&!created.formulation){const f=defaultFor(created.substanceName);if(f){created.formulation=f;await saveState()}}}
  }
  if(typeof ingestionList==='function'){
    const base=ingestionList;ingestionList=function(exp){const html=base(exp);requestAnimationFrame(()=>{for(const row of document.querySelectorAll('.ingestion-row')){const id=row.dataset.editIngestion,i=(exp.ingestions||[]).find(x=>x.id===id);if(!i?.formulation)continue;const sub=row.querySelector('.row-sub');if(sub&&!sub.dataset.formulationShown){sub.textContent+=` · ${i.formulation}`;sub.dataset.formulationShown='1'}}});return html}
  }
  const baseHub=window.renderClinicalHub;if(baseHub){window.renderClinicalHub=renderClinicalHub=function(){baseHub();const screen=$('#screen');if(!screen||document.querySelector('#formulation-hub'))return;const box=document.createElement('div');box.id='formulation-hub';box.innerHTML=`<div class="section-caption">Formulações</div><div class="card clinical-menu-card"><button class="list-row" data-formulation-manager><div class="row-main"><div class="row-title">Gerenciar IR / XR / ER</div><div class="row-sub">Define formulação padrão usada nos perfis PK/PD</div></div><span class="chev">›</span></button></div>`;screen.appendChild(box)}}

  document.addEventListener('click',async e=>{const mgr=e.target.closest('[data-formulation-manager]');if(mgr){e.preventDefault();e.stopImmediatePropagation();renderManager();return}const ed=e.target.closest('[data-formulation-edit]');if(ed){e.preventDefault();e.stopImmediatePropagation();form(ed.dataset.formulationEdit);return}const sv=e.target.closest('[data-formulation-save]');if(sv){e.preventDefault();e.stopImmediatePropagation();await save(sv.dataset.formulationSave);return}},true);

  if(typeof journalPayload==='function'){
    const base=journalPayload;journalPayload=function(){ensure();const p=base();p.clinicalData={...(p.clinicalData||{}),defaultFormulations:state.defaultFormulations||{}};for(const [ei,e] of (state.experiences||[]).entries()){const pe=p.experiences?.[ei];if(!pe)continue;for(const [ii,i] of (e.ingestions||[]).entries()){if(pe.ingestions?.[ii]&&i.formulation)pe.ingestions[ii].formulation=i.formulation}}return p}
  }
  if(typeof importJournal==='function'){
    const base=importJournal;importJournal=async function(file){let raw=null;try{raw=JSON.parse(await file.text())}catch{}await base(file);if(raw){ensure();state.defaultFormulations=raw.clinicalData?.defaultFormulations||state.defaultFormulations||{};for(const [ei,e] of (raw.experiences||[]).entries()){for(const [ii,i] of (e.ingestions||[]).entries()){if(i.formulation&&state.experiences?.[ei]?.ingestions?.[ii])state.experiences[ei].ingestions[ii].formulation=i.formulation}}await saveState()}}
  }
  ensure();window.FormulationManager={version:'1.0',defaultFor,applyMissing,render:renderManager};
})();
