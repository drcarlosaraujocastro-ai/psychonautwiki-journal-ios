'use strict';
/* Pharmacology Knowledge Graph v6.1
 * Structured claim-level evidence, targets, enzymes, metabolites and clinical-risk links.
 * Local-first and editorial: never upgrades review status automatically.
 */
(function(){
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const key=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const EVIDENCE={strong_clinical:'Evidência clínica forte',established_pharmacology:'Farmacologia/toxicologia estabelecida',observational:'Evidência observacional',case_reports:'Relatos clínicos',mechanistic:'Extrapolação farmacológica',insufficient:'Evidência insuficiente'};
  const TYPE={target:'Alvo',enzyme:'Enzima',metabolite:'Metabólito',mechanism:'Mecanismo',risk:'Risco clínico',effect:'Efeito',interaction:'Interação'};
  function ensure(){
    state.pharmKnowledgeGraph=state.pharmKnowledgeGraph&&typeof state.pharmKnowledgeGraph==='object'?state.pharmKnowledgeGraph:{};
    state.pharmClaims=state.pharmClaims&&typeof state.pharmClaims==='object'?state.pharmClaims:{};
  }
  function article(name){return window.LibraryKnowledge?.article?.(name)||state.knowledgeArticles?.[key(name)]||null}
  function effective(name){try{return typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||{})}catch{return{}}}
  function nodesFor(name){ensure();const p=effective(name)||{},a=article(name)||{},custom=state.pharmKnowledgeGraph[key(name)]||{},nodes=[];
    const add=(type,label,meta={})=>{if(!label)return;const id=type+':'+key(label);if(!nodes.some(n=>n.id===id))nodes.push({id,type,label,...meta})};
    for(const t of p.pd?.targets||[])add('target',t);
    const pkText=[p.pk?.metabolismElimination,a.sections?.pharmacokinetics].filter(Boolean).join(' ');
    for(const e of ['CYP2D6','CYP3A4','CYP3A5','CYP2C19','CYP2C9','CYP2A6','CYP2C8','CYP2B6','UGT1A4','UGT2B7'])if(new RegExp(e,'i').test(pkText))add('enzyme',e);
    for(const n of custom.nodes||[])add(n.type,n.label,n);
    return nodes;
  }
  function claims(name){ensure();return Array.isArray(state.pharmClaims[key(name)])?state.pharmClaims[key(name)]:[]}
  function saveClaim(name,c){ensure();const xs=claims(name),i=xs.findIndex(x=>x.id===c.id);if(i>=0)xs[i]=c;else xs.push(c);state.pharmClaims[key(name)]=xs;return saveState()}
  function render(name){
    const a=article(name)||{},nodes=nodesFor(name),cs=claims(name);topbar('Mapa farmacológico',{back:true,backLabel:a.title||name,right:`<button class="navbtn" data-pkg-new="${escx(name)}">＋</button>`});
    $('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">${escx(a.title||name)}</div><div class="row-sub">Alvos → mecanismos → efeitos → riscos → evidência</div></div></div>
      <div class="section-caption">Knowledge graph</div><div class="card"><div class="pkg-flow"><span class="pkg-origin">${escx(a.title||name)}</span>${nodes.map(n=>`<span class="pkg-node pkg-${escx(n.type)}"><small>${escx(TYPE[n.type]||n.type)}</small>${escx(n.label)}</span>`).join('')}</div>${nodes.length?'':'<div class="empty">Nenhum nó estruturado ainda. Complete a farmacologia avançada ou adicione relações editoriais.</div>'}</div>
      <div class="section-caption">Afirmações com evidência</div><div class="card">${cs.map(c=>`<button class="list-row" data-pkg-edit="${escx(c.id)}" data-pkg-name="${escx(name)}"><div class="row-main"><div class="row-title strong">${escx(c.claim)}</div><div class="row-sub">${escx(EVIDENCE[c.evidenceLevel]||'Evidência insuficiente')} · ${escx(c.population||'população não especificada')}</div><div class="row-sub">${escx(c.source||'Sem referência vinculada')}</div></div><span class="chev">›</span></button>`).join('')||'<div class="empty">Nenhuma afirmação revisável cadastrada.</div>'}</div>
      <button class="primary wide" data-pkg-new="${escx(name)}">＋ Adicionar afirmação com evidência</button><div class="section-footer">Afinidade, mecanismo e plausibilidade não equivalem automaticamente a benefício ou dano clínico. Cada afirmação pode receber sua própria fonte e nível de evidência.</div>`;
  }
  function edit(name,id){const old=claims(name).find(x=>x.id===id)||{id:'claim-'+Date.now(),claim:'',evidenceLevel:'insufficient',source:'',population:'',route:'',limitations:'',reviewer:'',reviewDate:'',status:'development_mock'};modal(`<div class="modal-head"><strong>Afirmação clínica</strong><button class="iconbtn" data-modal-close>×</button></div><form id="pkg-form" class="form"><label>Afirmação<textarea name="claim" rows="3">${escx(old.claim)}</textarea></label><label>Nível de evidência<select name="evidenceLevel">${Object.entries(EVIDENCE).map(([k,v])=>`<option value="${k}" ${old.evidenceLevel===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Fonte / DOI / PMID / referência<input name="source" value="${escx(old.source)}"></label><div class="form-grid"><label>População<input name="population" value="${escx(old.population)}"></label><label>Via<input name="route" value="${escx(old.route)}"></label></div><label>Limitações<textarea name="limitations" rows="3">${escx(old.limitations)}</textarea></label><div class="form-grid"><label>Revisor<input name="reviewer" value="${escx(old.reviewer)}"></label><label>Data de revisão<input type="date" name="reviewDate" value="${escx(old.reviewDate)}"></label></div><button class="primary wide" type="submit">Salvar afirmação</button></form>`);$('#pkg-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await saveClaim(name,{...old,claim:String(f.get('claim')||'').trim(),evidenceLevel:String(f.get('evidenceLevel')||'insufficient'),source:String(f.get('source')||'').trim(),population:String(f.get('population')||'').trim(),route:String(f.get('route')||'').trim(),limitations:String(f.get('limitations')||'').trim(),reviewer:String(f.get('reviewer')||'').trim(),reviewDate:String(f.get('reviewDate')||'')});closeModal();render(name)}}
  document.addEventListener('click',e=>{const t=e.target.closest?.('[data-pkg-new],[data-pkg-edit],[data-knowledge-graph]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();if(t.dataset.knowledgeGraph)render(t.dataset.knowledgeGraph);else if(t.dataset.pkgNew)edit(t.dataset.pkgNew);else edit(t.dataset.pkgName,t.dataset.pkgEdit)},true);
  const st=document.createElement('style');st.textContent=`.pkg-flow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.pkg-origin,.pkg-node{border:1px solid var(--separator);border-radius:14px;padding:9px 11px;background:var(--card2)}.pkg-origin{font-weight:800}.pkg-node small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--secondary);margin-bottom:2px}.pkg-target{border-color:rgba(84,170,255,.4)}.pkg-enzyme{border-color:rgba(180,90,255,.4)}.pkg-risk{border-color:rgba(255,90,90,.45)}.pkg-effect{border-color:rgba(90,220,170,.4)}`;document.head.appendChild(st);
  window.PharmKnowledgeGraph={render,nodesFor,claims};
})();