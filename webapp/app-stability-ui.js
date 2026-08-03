'use strict';

/* Stability + information architecture hotfix for iPhone PWA.
 * Loaded last so it replaces the layered wrappers without migrating user data.
 */
(function(){
  let stockSaving=false;
  const finiteOrNull=v=>{const n=Number(v);return Number.isFinite(n)?n:null};

  function normalizeInventory(){
    if(!state)return;
    state.inventoryLots=Array.isArray(state.inventoryLots)?state.inventoryLots:[];
    state.inventoryMovements=Array.isArray(state.inventoryMovements)?state.inventoryMovements:[];
    for(const l of state.inventoryLots){
      l.id=l.id||uuid();
      l.substanceName=String(l.substanceName||'').trim();
      l.stockMode=l.stockMode==='mg'?'mg':'units';
      const qi=finiteOrNull(l.quantityInitial), qr=finiteOrNull(l.quantityRemaining);
      l.quantityInitial=Math.max(0,qi??qr??0);
      l.quantityRemaining=Math.max(0,qr??qi??0);
      const st=finiteOrNull(l.strengthMgPerUnit);l.strengthMgPerUnit=st&&st>0?st:null;
      const low=finiteOrNull(l.lowStockThreshold);l.lowStockThreshold=low!=null&&low>=0?low:3;
    }
  }

  function saveWithTimeout(ms=4500){
    return Promise.race([
      saveState(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite ao salvar o banco local.')),ms))
    ]);
  }

  function stockSuggestions(q){
    q=String(q||'').trim().toLowerCase();if(q.length<1)return[];
    const seen=new Set(),out=[];
    for(const s of allSubstances()){
      const name=String(s.name||'');
      if(!name||seen.has(name.toLowerCase()))continue;
      const aliases=(s.commonNames||[]).join(' ').toLowerCase();
      if(name.toLowerCase().includes(q)||aliases.includes(q)){seen.add(name.toLowerCase());out.push(name);if(out.length>=12)break}
    }
    return out;
  }

  function stableInventoryForm(id=null,prefill=''){
    normalizeInventory();
    const old=id?state.inventoryLots.find(l=>l.id===id):null;
    const l=old||{substanceName:prefill||'',stockMode:'units',strengthMgPerUnit:null,quantityInitial:'',quantityRemaining:'',purchaseDate:new Date().toISOString().slice(0,10),expiryDate:'',lotNumber:'',lowStockThreshold:3};
    modal(`${modalHeader(old?'Editar estoque':'Adicionar ao estoque',`<button class="navbtn" data-stable-stock-save data-lot-id="${esc(old?.id||'')}">Salvar</button>`,'Cancelar')}
      <div style="padding:8px 14px 36px">
        <div class="section-caption">Medicamento</div>
        <div class="card">
          <div class="fieldrow"><label>Nome</label><input id="stock-name" autocomplete="off" value="${esc(l.substanceName||'')}" placeholder="Digite o medicamento"></div>
          <div id="stock-suggestions"></div>
        </div>
        <div class="section-caption">Quantidade</div>
        <div class="card">
          <div class="fieldrow"><label>Controlar por</label><select id="stock-mode"><option value="units" ${l.stockMode!=='mg'?'selected':''}>Comprimidos / cápsulas / unidades</option><option value="mg" ${l.stockMode==='mg'?'selected':''}>Quantidade total em mg</option></select></div>
          <div class="fieldrow" id="stock-strength-row"><label>Mg por unidade</label><input id="stock-strength" type="number" min="0" step="any" inputmode="decimal" value="${l.strengthMgPerUnit??''}" placeholder="ex.: 70"><span>mg</span></div>
          <div class="fieldrow"><label>${old?'Quantidade atual':'Quantidade comprada'}</label><input id="stock-qty" type="number" min="0" step="any" inputmode="decimal" value="${old?l.quantityRemaining:(l.quantityInitial??'')}" placeholder="ex.: 30"></div>
          <div class="fieldrow" id="stock-low-row"><label>Avisar quando restarem</label><input id="stock-low" type="number" min="0" step="any" inputmode="decimal" value="${l.lowStockThreshold??3}"><span>un.</span></div>
        </div>
        <div class="section-caption">Rastreabilidade</div>
        <div class="card">
          <div class="fieldrow"><label>Data da compra</label><input id="stock-purchase" type="date" value="${esc(l.purchaseDate||'')}"></div>
          <div class="fieldrow"><label>Validade</label><input id="stock-expiry" type="date" value="${esc(l.expiryDate||'')}"></div>
          <div class="fieldrow"><label>Lote</label><input id="stock-lot" value="${esc(l.lotNumber||'')}" placeholder="opcional"></div>
        </div>
        <div class="section-footer">Ao registrar uma ingestão, o estoque é descontado automaticamente. Ao excluir ou editar a ingestão, o consumo correspondente é estornado antes do novo cálculo.</div>
        ${old?`<div class="section-caption">Ações</div><div class="card"><button class="destructive" data-clinical-action="delete-lot" data-lot-id="${esc(old.id)}">Excluir este lote</button></div>`:''}
      </div>`);
    const input=$('#stock-name'), box=$('#stock-suggestions'), mode=$('#stock-mode');
    const paint=()=>{const xs=stockSuggestions(input.value);box.innerHTML=xs.length?`<div class="stock-suggest-list">${xs.map(n=>`<button type="button" class="linkrow stock-suggestion" data-stock-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''};
    input.oninput=paint;
    mode.onchange=()=>{const units=mode.value==='units';$('#stock-strength-row').style.display=units?'flex':'none';$('#stock-low-row').style.display=units?'flex':'none'};mode.onchange();
  }

  async function stableSaveStock(id){
    if(stockSaving)return;stockSaving=true;
    const btn=document.querySelector('[data-stable-stock-save]');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
    try{
      normalizeInventory();
      const name=$('#stock-name')?.value.trim(),mode=$('#stock-mode')?.value==='mg'?'mg':'units';
      const qty=finiteOrNull($('#stock-qty')?.value),strength=finiteOrNull($('#stock-strength')?.value),low=finiteOrNull($('#stock-low')?.value);
      if(!name){toast('Informe o medicamento.');return}
      if(qty==null||qty<0){toast('Informe uma quantidade válida.');return}
      if(mode==='units'&&(!(strength>0))){toast('Informe quantos mg há em cada unidade.');return}
      const current=id?state.inventoryLots.find(l=>l.id===id):null;
      const obj={
        id:id||uuid(),substanceName:name,stockMode:mode,
        strengthMgPerUnit:mode==='units'?strength:null,
        quantityInitial:current?.quantityInitial??qty,quantityRemaining:qty,
        purchaseDate:$('#stock-purchase')?.value||null,expiryDate:$('#stock-expiry')?.value||null,
        lotNumber:$('#stock-lot')?.value.trim()||'',lowStockThreshold:mode==='units'?(low??3):null,updatedAt:Date.now()
      };
      const idx=state.inventoryLots.findIndex(l=>l.id===obj.id);
      if(idx>=0)state.inventoryLots[idx]={...state.inventoryLots[idx],...obj};else state.inventoryLots.push(obj);
      await saveWithTimeout();
      closeModal();toast('Estoque salvo.');
      requestAnimationFrame(()=>stableRenderInventory());
    }catch(err){console.error('stock save',err);toast('Não foi possível salvar o estoque. Tente novamente.');}
    finally{stockSaving=false;if(btn){btn.disabled=false;btn.textContent='Salvar'}}
  }

  function stableRenderInventory(){
    normalizeInventory();topbar('Estoque',{back:true,backLabel:'Clínico',right:'<button class="navbtn" data-stable-new-stock>＋</button>'});
    const groups=[...new Set(state.inventoryLots.filter(l=>l.substanceName).map(l=>l.substanceName))];
    const lows=typeof lowStockAlerts==='function'?lowStockAlerts():[];
    const exps=typeof expiryAlerts==='function'?expiryAlerts(60):[];
    $('#screen').innerHTML=`
      ${lows.length?`<div class="card alert-card unsafe"><strong>Estoque baixo</strong><div class="row-sub" style="margin-top:6px">${lows.length} lote(s) precisam de reposição.</div></div>`:''}
      ${exps.length?`<div class="card alert-card uncertain"><strong>Validade próxima</strong><div class="row-sub" style="margin-top:6px">${exps.length} lote(s) vencem em até 60 dias.</div></div>`:''}
      <div class="clinical-hero"><div><div class="clinical-hero-title">Medicamentos em estoque</div><div class="row-sub">${groups.length} medicamento(s) · ${state.inventoryLots.length} lote(s)</div></div><button class="primary compact" data-stable-new-stock>＋ Adicionar</button></div>
      ${groups.map(name=>{const s=inventorySummary(name);return`<div class="card stock-card"><div class="stock-head"><div><div class="row-title strong">${esc(name)}</div><div class="row-sub">${s.units?`${Number(s.units.toFixed(2))} un.`:''}${s.units&&s.mg?' · ':''}${s.mg?`${Number(s.mg.toFixed(2))} mg`:''}</div></div><button class="navbtn" data-stable-new-stock data-stock-substance="${esc(name)}">Repor</button></div>${s.lots.map(l=>`<button class="list-row" data-stable-edit-stock="${esc(l.id)}"><div class="row-main"><div class="row-title">${esc(l.lotNumber||'Lote não informado')}</div><div class="row-sub">${l.stockMode==='units'?`${Number(lotRemaining(l).toFixed(2))} un. × ${l.strengthMgPerUnit||'?'} mg`:`${Number(lotRemaining(l).toFixed(2))} mg`} · validade ${esc(l.expiryDate||'—')}</div></div><span class="chev">›</span></button>`).join('')}</div>`}).join('')||'<div class="card empty">Nenhum medicamento cadastrado no estoque.</div>'}`;
  }

  function stableRenderClinicalHub(){
    normalizeInventory();
    topbar('Clínico',{large:'Clínico'});
    const recent=(state.clinicalCheckins||[]).slice().sort((a,b)=>b.time-a.time)[0],lows=typeof lowStockAlerts==='function'?lowStockAlerts():[];
    $('#screen').innerHTML=`
      <div class="clinical-dashboard">
        <button class="clinical-feature" data-clinical-action="now"><div class="feature-icon">◉</div><div><strong>Agora</strong><span>Fases ativas, PK/PD e efeitos previstos</span></div><span class="chev">›</span></button>
        <button class="clinical-feature" data-clinical-action="checkin"><div class="feature-icon">✓</div><div><strong>Check-in</strong><span>${recent?`Último: ${fmtDate(recent.time)} ${fmtTime(recent.time)}`:'Sintomas, vitais, sono e resposta percebida'}</span></div><span class="chev">›</span></button>
      </div>
      <div class="section-caption">Raciocínio clínico</div><div class="card clinical-menu-card">
        <button class="list-row" data-clinical-action="intelligence"><div class="row-main"><div class="row-title strong">Inteligência clínica</div><div class="row-sub">Histórico, hipóteses, eixos, textos e análises</div></div><span class="chev">›</span></button>
        <button class="list-row" data-clinical-action="treatment"><div class="row-main"><div class="row-title">Tratamento</div><div class="row-sub">Esquema atual, alvos e farmacologia por mecanismo</div></div><span class="chev">›</span></button>
        <button class="list-row" data-clinical-action="redose"><div class="row-main"><div class="row-title">Redose e sobreposição</div><div class="row-sub">Intervalos, extensão, sobreposição e carry-over</div></div><span class="chev">›</span></button>
      </div>
      <div class="section-caption">Medicamentos</div><div class="card clinical-menu-card">
        <button class="list-row" data-clinical-action="inventory"><div class="row-main"><div class="row-title strong">Estoque</div><div class="row-sub">${state.inventoryLots.length} lote(s)${lows.length?` · ${lows.length} com estoque baixo`:''}</div></div><span class="chev">›</span></button>
        <button class="list-row" data-stable-new-stock><div class="row-main"><div class="row-title">Adicionar / repor medicamento</div><div class="row-sub">Quantidade, dose/unidade, compra, validade e lote</div></div><span class="chev">›</span></button>
      </div>
      <div class="section-caption">Dados</div><div class="card clinical-menu-card"><button class="list-row" data-clinical-action="stats"><div class="row-main"><div class="row-title">Estatísticas</div><div class="row-sub">Uso do Journal e visão longitudinal</div></div><span class="chev">›</span></button></div>`;
  }

  function stableRenderJournal(){
    topbar('Journal',{large:'Journal',right:'<button class="navbtn icon" data-action="calendar" aria-label="Calendário">▦</button>'});
    let exps=[...(state.experiences||[])].sort((a,b)=>(b.sortDate||b.creationDate)-(a.sortDate||a.creationDate));
    if(state.settings.favoriteOnly)exps=exps.filter(e=>e.isFavorite);
    if(journalSearch.trim()){const q=journalSearch.toLowerCase();exps=exps.filter(e=>String(e.title).toLowerCase().includes(q)||(e.ingestions||[]).some(i=>String(i.substanceName).toLowerCase().includes(q)))}
    const current=exps.filter(e=>Date.now()-(e.sortDate||e.creationDate)<36*3600e3),previous=exps.filter(e=>!current.includes(e));
    $('#screen').innerHTML=`<div class="journal-toolbar"><div class="searchbox"><input id="journal-search" placeholder="Buscar registros" value="${esc(journalSearch)}" autocomplete="off">${journalSearch?'<button class="search-clear" data-action="clear-journal-search">×</button>':''}</div><button class="journal-filter ${state.settings.favoriteOnly?'on':''}" data-action="favorite-filter" aria-label="Favoritos">★</button></div>
      ${current.length?`<div class="section-caption">Atual</div><div class="card journal-card">${current.map(expRow).join('')}</div>`:''}
      <div class="section-caption">Histórico</div><div class="card journal-card">${previous.map(expRow).join('')||'<div class="empty">Nenhum registro anterior.</div>'}</div>
      <button class="fab" data-action="add-ingestion">＋ Nova ingestão</button>`;
    bindJournalSearch();
  }

  const style=document.createElement('style');style.textContent=`
    .clinical-dashboard{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:2px 0 18px}.clinical-feature{border:0;border-radius:16px;padding:15px;background:var(--card,#fff);text-align:left;display:flex;align-items:center;gap:10px;min-height:92px}.clinical-feature>div:nth-child(2){display:flex;flex-direction:column;gap:4px;flex:1}.clinical-feature span:not(.chev){font-size:12px;color:var(--secondary,#8e8e93);line-height:1.3}.feature-icon{font-size:24px}.clinical-menu-card{overflow:hidden}.clinical-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 14px}.clinical-hero-title{font-size:21px;font-weight:700}.primary.compact{width:auto;margin:0;padding:10px 13px}.stock-card{margin-bottom:12px;overflow:hidden}.stock-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px}.stock-suggest-list{border-top:1px solid rgba(127,127,127,.18);max-height:220px;overflow:auto}.journal-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:16px}.journal-toolbar .searchbox{flex:1;margin:0}.journal-filter{width:42px;height:42px;border:0;border-radius:12px;font-size:20px}.journal-filter.on{background:rgba(255,204,0,.18)}.journal-card{overflow:hidden}
  `;document.head.appendChild(style);

  // Replace heavy/stacked renderers.
  renderInventory=stableRenderInventory;window.renderInventory=stableRenderInventory;
  inventoryLotForm=stableInventoryForm;window.inventoryLotForm=stableInventoryForm;
  saveInventoryLot=stableSaveStock;window.saveInventoryLot=stableSaveStock;
  renderClinicalHub=stableRenderClinicalHub;window.renderClinicalHub=stableRenderClinicalHub;
  renderJournal=stableRenderJournal;window.renderJournal=stableRenderJournal;

  // Capture stock actions before legacy bubbling handlers to guarantee one save only.
  document.addEventListener('click',async e=>{
    const suggestion=e.target.closest('[data-stock-name]');if(suggestion){e.preventDefault();e.stopImmediatePropagation();const i=$('#stock-name');if(i)i.value=suggestion.dataset.stockName;const b=$('#stock-suggestions');if(b)b.innerHTML='';return}
    const add=e.target.closest('[data-stable-new-stock]');if(add){e.preventDefault();e.stopImmediatePropagation();stableInventoryForm(null,add.dataset.stockSubstance||'');return}
    const edit=e.target.closest('[data-stable-edit-stock]');if(edit){e.preventDefault();e.stopImmediatePropagation();stableInventoryForm(edit.dataset.stableEditStock);return}
    const save=e.target.closest('[data-stable-stock-save]');if(save){e.preventDefault();e.stopImmediatePropagation();await stableSaveStock(save.dataset.lotId||null);return}
  },true);

  window.addEventListener('load',()=>{try{normalizeInventory()}catch(e){console.warn('inventory normalize',e)}});
  window.PWJ_STABILITY={version:'3.1',normalizeInventory,renderInventory:stableRenderInventory};
})();