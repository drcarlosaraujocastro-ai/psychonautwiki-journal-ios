'use strict';

/* Inventory Ledger v1
 * Opening balance, prior use, manual reconciliation and depletion forecast.
 * Loaded last so stock forms remain single-handler and iPhone-safe.
 */
(function(){
  let saving=false;
  const n=v=>{if(v===''||v==null)return null;const x=Number(v);return Number.isFinite(x)?x:null};
  const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
  const doseToMg=i=>{const d=n(i?.dose);if(d==null)return null;const u=String(i.units||'mg').toLowerCase();if(u==='mg')return d;if(u==='g')return d*1000;if(['µg','ug','mcg'].includes(u))return d/1000;return null};
  const allIngs=()=> (state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>({...i,experienceId:e.id}))).filter(i=>Number.isFinite(Number(i.time)));
  function ensure(){state.inventoryLots=Array.isArray(state.inventoryLots)?state.inventoryLots:[];state.inventoryMovements=Array.isArray(state.inventoryMovements)?state.inventoryMovements:[];}
  function remaining(l){return Math.max(0,Number(l.quantityRemaining??0)||0)}
  function stockUnit(l){return l.stockMode==='mg'?'mg':'un.'}
  function movement(lot,type,amount,before,after,note=''){state.inventoryMovements.push({id:uuid(),type,lotId:lot.id,substanceName:lot.substanceName,stockMode:lot.stockMode,amount:Number(amount||0),before:Number(before||0),after:Number(after||0),note,createdAt:Date.now()})}
  function historicUse(name,purchaseDate,strength,mode){
    if(!purchaseDate)return 0;const start=new Date(purchaseDate+'T00:00:00').getTime();let mg=0;
    for(const i of allIngs())if(i.time>=start&&same(i.substanceName,name)){const d=doseToMg(i);if(d!=null)mg+=d}
    return mode==='mg'?mg:(strength>0?mg/strength:0);
  }
  function recentDailyUse(lot,days=30){const cut=Date.now()-days*864e5;let mg=0;for(const i of allIngs())if(i.time>=cut&&same(i.substanceName,lot.substanceName)){const d=doseToMg(i);if(d!=null)mg+=d}if(!mg)return null;return lot.stockMode==='mg'?mg/days:(Number(lot.strengthMgPerUnit)>0?mg/Number(lot.strengthMgPerUnit)/days:null)}
  function forecast(lot){const daily=recentDailyUse(lot);if(!(daily>0))return null;return remaining(lot)/daily}

  function suggestions(q){q=String(q||'').trim().toLowerCase();if(!q)return[];const out=[];for(const s of allSubstances()){const name=String(s.name||'');if(name.toLowerCase().includes(q)||(s.commonNames||[]).some(a=>String(a).toLowerCase().includes(q))){out.push(name);if(out.length>=10)break}}return [...new Set(out)]}

  function form(id=null,prefill=''){
    ensure();const old=id?state.inventoryLots.find(x=>x.id===id):null;const l=old||{substanceName:prefill||'',stockMode:'units',strengthMgPerUnit:null,quantityInitial:'',quantityRemaining:'',purchaseDate:new Date().toISOString().slice(0,10),expiryDate:'',lotNumber:'',lowStockThreshold:3};
    const purchased=old?Number(l.quantityInitial??l.quantityRemaining??0):'';const current=old?Number(l.quantityRemaining??0):'';const used=old?Math.max(0,Number(purchased)-Number(current)):'';
    modal(`${modalHeader(old?'Editar lote':'Adicionar medicamento',`<button class="navbtn" data-ledger-save data-lot-id="${esc(old?.id||'')}">Salvar</button>`,'Cancelar')}<div style="padding:8px 14px 36px">
      <div class="section-caption">Medicamento</div><div class="card"><div class="fieldrow"><label>Nome</label><input id="lg-name" autocomplete="off" value="${esc(l.substanceName||'')}" placeholder="Digite o medicamento"></div><div id="lg-suggest"></div><div class="fieldrow"><label>Controlar por</label><select id="lg-mode"><option value="units" ${l.stockMode!=='mg'?'selected':''}>Comprimidos / cápsulas / unidades</option><option value="mg" ${l.stockMode==='mg'?'selected':''}>Quantidade total em mg</option></select></div><div class="fieldrow" id="lg-strength-row"><label>Mg por unidade</label><input id="lg-strength" type="number" min="0" step="any" inputmode="decimal" value="${l.strengthMgPerUnit??''}" placeholder="ex.: 70"><span>mg</span></div></div>
      <div class="section-caption">Saldo inicial</div><div class="card">
        <div class="fieldrow"><label>Quantidade comprada</label><input id="lg-purchased" type="number" min="0" step="any" inputmode="decimal" value="${purchased}" placeholder="ex.: 30"></div>
        <div class="fieldrow"><label>Já usada antes de cadastrar</label><input id="lg-used" type="number" min="0" step="any" inputmode="decimal" value="${used}" placeholder="ex.: 5"></div>
        <div class="fieldrow"><label>Saldo atual calculado</label><input id="lg-current" type="number" step="any" value="${current}" readonly></div>
        <button class="linkrow" type="button" data-ledger-calc-history>Calcular uso pelos registros do Journal</button>
        <div class="section-footer" style="padding:8px 0 0">Ex.: comprou 30 e já usou 5 → saldo inicial 25. O cálculo pelo Journal é apenas uma estimativa baseada nas ingestões registradas.</div>
      </div>
      <div class="section-caption">Rastreabilidade</div><div class="card"><div class="fieldrow"><label>Data da compra</label><input id="lg-purchase" type="date" value="${esc(l.purchaseDate||'')}"></div><div class="fieldrow"><label>Validade</label><input id="lg-expiry" type="date" value="${esc(l.expiryDate||'')}"></div><div class="fieldrow"><label>Lote</label><input id="lg-lot" value="${esc(l.lotNumber||'')}" placeholder="opcional"></div><div class="fieldrow"><label>Alerta de estoque baixo</label><input id="lg-low" type="number" min="0" step="any" inputmode="decimal" value="${l.lowStockThreshold??3}"></div></div>
      ${old?`<div class="section-caption">Ajustes</div><div class="card"><button class="linkrow" data-ledger-adjust data-lot-id="${esc(old.id)}">Corrigir saldo contado agora</button><button class="linkrow" data-ledger-history data-lot-id="${esc(old.id)}">Ver movimentações deste lote</button></div>`:''}
    </div>`);
    const name=$('#lg-name'),box=$('#lg-suggest'),mode=$('#lg-mode'),p=$('#lg-purchased'),u=$('#lg-used'),c=$('#lg-current');
    const recalc=()=>{const pv=Math.max(0,n(p.value)??0),uv=Math.max(0,n(u.value)??0);c.value=Math.max(0,pv-uv)};p.oninput=recalc;u.oninput=recalc;recalc();
    const paint=()=>{const xs=suggestions(name.value);box.innerHTML=xs.map(x=>`<button type="button" class="linkrow" data-ledger-pick="${esc(x)}">${esc(x)}</button>`).join('')};name.oninput=paint;
    mode.onchange=()=>{$('#lg-strength-row').style.display=mode.value==='units'?'flex':'none'};mode.onchange();
  }

  async function save(id){if(saving)return;saving=true;const btn=document.querySelector('[data-ledger-save]');if(btn){btn.disabled=true;btn.textContent='Salvando…'}try{
    ensure();const name=$('#lg-name')?.value.trim(),mode=$('#lg-mode')?.value==='mg'?'mg':'units',strength=n($('#lg-strength')?.value),purchased=n($('#lg-purchased')?.value),used=n($('#lg-used')?.value),low=n($('#lg-low')?.value);
    if(!name){toast('Informe o medicamento.');return}if(purchased==null||purchased<0||used==null||used<0){toast('Informe quantidades válidas.');return}if(used>purchased){toast('A quantidade já usada não pode ser maior que a comprada.');return}if(mode==='units'&&!(strength>0)){toast('Informe os mg por unidade.');return}
    const old=id?state.inventoryLots.find(x=>x.id===id):null,before=old?remaining(old):0,current=purchased-used;
    const obj={id:id||uuid(),substanceName:name,stockMode:mode,strengthMgPerUnit:mode==='units'?strength:null,quantityInitial:purchased,quantityRemaining:current,purchaseDate:$('#lg-purchase')?.value||null,expiryDate:$('#lg-expiry')?.value||null,lotNumber:$('#lg-lot')?.value.trim()||'',lowStockThreshold:low??3,openingUsed:used,updatedAt:Date.now()};
    const idx=state.inventoryLots.findIndex(x=>x.id===obj.id);if(idx>=0)state.inventoryLots[idx]={...state.inventoryLots[idx],...obj};else state.inventoryLots.push(obj);
    if(!old&&used>0)movement(obj,'opening-use',used,purchased,current,'Uso anterior ao cadastro do lote');
    else if(old&&Math.abs(before-current)>1e-9)movement(obj,'reconcile',current-before,before,current,'Saldo alterado na edição do lote');
    await saveState();closeModal();toast('Estoque salvo.');requestAnimationFrame(renderInventory);
  }catch(e){console.error(e);toast('Não foi possível salvar o estoque.')}finally{saving=false;if(btn){btn.disabled=false;btn.textContent='Salvar'}}}

  function adjustForm(id){ensure();const l=state.inventoryLots.find(x=>x.id===id);if(!l)return;modal(`${modalHeader('Corrigir saldo',`<button class="navbtn" data-ledger-adjust-save data-lot-id="${esc(id)}">Salvar</button>`,'Cancelar')}<div style="padding:8px 14px 36px"><div class="section-caption">Contagem física</div><div class="card"><div class="kv"><span>Saldo registrado</span><b>${remaining(l)} ${stockUnit(l)}</b></div><div class="fieldrow"><label>Saldo contado agora</label><input id="lg-adjust-current" type="number" min="0" step="any" inputmode="decimal" value="${remaining(l)}"></div><div class="fieldrow"><label>Motivo</label><input id="lg-adjust-note" placeholder="ex.: comprimidos usados antes do registro"></div></div><div class="section-footer">A correção gera uma movimentação no histórico; não apaga o saldo anterior.</div></div>`)}
  async function saveAdjust(id){const l=state.inventoryLots.find(x=>x.id===id);if(!l)return;const after=n($('#lg-adjust-current')?.value);if(after==null||after<0){toast('Informe um saldo válido.');return}const before=remaining(l),note=$('#lg-adjust-note')?.value.trim()||'Correção manual de saldo';l.quantityRemaining=after;l.updatedAt=Date.now();movement(l,'manual-adjustment',after-before,before,after,note);await saveState();closeModal();toast('Saldo corrigido.');renderInventory()}

  function history(id){ensure();const l=state.inventoryLots.find(x=>x.id===id);if(!l)return;const xs=state.inventoryMovements.filter(m=>m.lotId===id||(m.allocations||[]).some(a=>a.lotId===id)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));topbar('Movimentações',{back:true,backLabel:'Estoque'});$('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">${esc(l.substanceName)}</div><div class="row-sub">Saldo atual ${remaining(l)} ${stockUnit(l)}</div></div></div><div class="card">${xs.map(m=>`<div class="list-row"><div class="row-main"><div class="row-title">${esc(m.type||'movimentação')}</div><div class="row-sub">${m.before!=null?`${m.before} → ${m.after} ${stockUnit(l)} · `:''}${m.note?esc(m.note)+' · ':''}${m.createdAt?new Date(m.createdAt).toLocaleString('pt-BR'):''}</div></div></div>`).join('')||'<div class="empty">Nenhuma movimentação deste lote.</div>'}</div>`}

  function enhancedInventory(){ensure();topbar('Estoque',{back:true,backLabel:'Clínico',right:'<button class="navbtn" data-ledger-new>＋</button>'});const groups=[...new Set(state.inventoryLots.filter(l=>l.substanceName).map(l=>l.substanceName))];$('#screen').innerHTML=`<div class="clinical-hero"><div><div class="clinical-hero-title">Estoque de medicamentos</div><div class="row-sub">Saldo real, uso anterior, ajustes e previsão</div></div><button class="primary compact" data-ledger-new>＋ Adicionar</button></div>${groups.map(name=>`<div class="section-caption">${esc(name)}</div>${state.inventoryLots.filter(l=>same(l.substanceName,name)).map(l=>{const d=forecast(l);return`<div class="card stock-card"><button class="list-row" data-ledger-edit="${esc(l.id)}"><div class="row-main"><div class="row-title strong">${remaining(l)} ${stockUnit(l)}${l.stockMode==='units'&&l.strengthMgPerUnit?` × ${l.strengthMgPerUnit} mg`:''}</div><div class="row-sub">Comprado ${Number(l.quantityInitial||0)} · já descontado ${Math.max(0,Number(l.quantityInitial||0)-remaining(l))}${l.expiryDate?` · validade ${esc(l.expiryDate)}`:''}</div>${d!=null?`<div class="row-sub">Ritmo recente: ~${d.toFixed(d<10?1:0)} dia(s) de estoque restante</div>`:''}</div><span class="chev">›</span></button><div style="display:flex;gap:8px;padding:0 12px 12px"><button class="navbtn" data-ledger-adjust data-lot-id="${esc(l.id)}">Corrigir saldo</button><button class="navbtn" data-ledger-history data-lot-id="${esc(l.id)}">Histórico</button></div></div>`}).join('')}`).join('')||'<div class="card empty">Nenhum medicamento cadastrado.</div>'}`}

  renderInventory=enhancedInventory;window.renderInventory=enhancedInventory;inventoryLotForm=form;window.inventoryLotForm=form;saveInventoryLot=save;window.saveInventoryLot=save;
  document.addEventListener('click',async e=>{
    const pick=e.target.closest('[data-ledger-pick]');if(pick){e.preventDefault();e.stopImmediatePropagation();$('#lg-name').value=pick.dataset.ledgerPick;$('#lg-suggest').innerHTML='';return}
    const calc=e.target.closest('[data-ledger-calc-history]');if(calc){e.preventDefault();e.stopImmediatePropagation();const name=$('#lg-name')?.value.trim(),mode=$('#lg-mode')?.value,str=n($('#lg-strength')?.value),date=$('#lg-purchase')?.value;if(!name||!date){toast('Informe medicamento e data da compra.');return}if(mode==='units'&&!(str>0)){toast('Informe os mg por unidade primeiro.');return}const used=historicUse(name,date,str,mode);$('#lg-used').value=Number(used.toFixed(3));$('#lg-used').dispatchEvent(new Event('input'));toast('Uso estimado a partir do Journal.');return}
    const nw=e.target.closest('[data-ledger-new]');if(nw){e.preventDefault();e.stopImmediatePropagation();form();return}
    const ed=e.target.closest('[data-ledger-edit]');if(ed){e.preventDefault();e.stopImmediatePropagation();form(ed.dataset.ledgerEdit);return}
    const sv=e.target.closest('[data-ledger-save]');if(sv){e.preventDefault();e.stopImmediatePropagation();await save(sv.dataset.lotId||null);return}
    const ad=e.target.closest('[data-ledger-adjust]');if(ad){e.preventDefault();e.stopImmediatePropagation();adjustForm(ad.dataset.lotId);return}
    const ads=e.target.closest('[data-ledger-adjust-save]');if(ads){e.preventDefault();e.stopImmediatePropagation();await saveAdjust(ads.dataset.lotId);return}
    const hi=e.target.closest('[data-ledger-history]');if(hi){e.preventDefault();e.stopImmediatePropagation();history(hi.dataset.lotId);return}
  },true);
  window.PWJ_INVENTORY_LEDGER={version:'1.0',historicUse,forecast,render:enhancedInventory};
})();
