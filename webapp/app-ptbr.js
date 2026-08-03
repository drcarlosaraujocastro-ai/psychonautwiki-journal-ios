'use strict';

/* Localização pt-BR do módulo clínico/estoque.
 * IMPORTANTE: não usa MutationObserver global. Em iOS/Safari isso podia disparar
 * varreduras repetidas de todo o DOM ao abrir modais com centenas de opções,
 * congelando a PWA. A localização agora é aplicada apenas após renders conhecidos.
 */
(function(){
  const MAP=new Map([
    ['Clinical','Clínico'],['Inventory','Estoque'],['Medication stock','Estoque de medicamentos'],
    ['Add stock','Adicionar estoque'],['Edit stock','Editar estoque'],['Add / replenish stock','Adicionar / repor estoque'],
    ['Add medication stock','Adicionar estoque de medicamento'],['Open inventory','Abrir estoque'],
    ['Quick medication stock','Estoque rápido de medicamentos'],['Medication','Medicamento'],['Stock as','Controlar como'],
    ['tablets/capsules/units','comprimidos/cápsulas/unidades'],['total mg','mg totais'],['Strength/unit','Dose por unidade'],
    ['Current quantity','Quantidade atual'],['Quantity purchased','Quantidade comprada'],['Low-stock alert','Alerta de estoque baixo'],
    ['Purchase date','Data da compra'],['Expiry date','Data de validade'],['Lot','Lote'],['Lot not set','Lote não informado'],
    ['Delete stock lot','Excluir lote do estoque'],['Danger Zone','Zona de risco'],['Low stock','Estoque baixo'],
    ['Expiry alerts','Alertas de validade'],['Restock','Repor'],['expired','vencido'],['low','baixo'],['ok','ok'],
    ['units','unidades'],['unit(s)','unidade(s)'],['bought','comprado em'],['expires','vence em'],
    ['Now','Agora'],['Predicted effects','Efeitos previstos'],['Active / carry-over','Ativos / efeito residual'],
    ['Check-in','Check-in clínico'],['Current state','Estado atual'],['Recent','Recentes'],['Save check-in','Salvar check-in'],
    ['Mood','Humor'],['Anxiety','Ansiedade'],['Energy','Energia'],['Focus','Foco'],['Sedation','Sedação'],
    ['Sleep last night','Sono na última noite'],['Heart rate','Frequência cardíaca'],['Blood pressure','Pressão arterial'],
    ['Treatment','Tratamento'],['Clinical Intelligence','Inteligência clínica'],['Stats','Estatísticas'],
    ['Management','Manejo'],['Analyses','Análises'],['Texts','Textos'],['Redose','Redose / sobreposição'],
    ['Done','Concluir'],['Cancel','Cancelar'],['Delete','Excluir'],['Back','Voltar']
  ]);

  const PLACEHOLDERS={
    'Symptoms, perceived effects, adverse effects, context...':'Sintomas, efeitos percebidos, efeitos adversos, contexto...',
    'hours':'horas','Notes':'Notas','Search substances':'Buscar substâncias','Search experiences':'Buscar registros'
  };

  function exactText(el){return el&&el.childNodes?.length===1&&el.firstChild?.nodeType===Node.TEXT_NODE?el.textContent.trim():null}
  function localize(root=document){
    if(!root?.querySelectorAll)return;
    root.querySelectorAll('label,button,.section-title,.section-caption,.row-title,.row-sub,.navtitle,.large-title,.kv span,.kv b,.chip').forEach(el=>{
      const txt=exactText(el);if(txt&&MAP.has(txt))el.textContent=MAP.get(txt);
    });
    root.querySelectorAll('input,textarea').forEach(el=>{const p=el.getAttribute('placeholder');if(p&&PLACEHOLDERS[p])el.setAttribute('placeholder',PLACEHOLDERS[p])});
    root.querySelectorAll('select option').forEach(o=>{const t=o.textContent.trim();if(MAP.has(t))o.textContent=MAP.get(t)});
  }

  function localizeSoon(root=document){
    requestAnimationFrame(()=>{try{localize(root)}catch(err){console.warn('pt-BR localization skipped',err)}});
  }

  function injectInventoryEnhancements(){
    const screen=document.querySelector('#screen');if(!screen||document.querySelector('#ptbr-stock-tools'))return;
    const lots=state.inventoryLots||[],movements=state.inventoryMovements||[];
    const activeLots=lots.filter(l=>Number(l.quantityRemaining??l.quantityInitial??0)>0);
    const expiring=activeLots.filter(l=>l.expiryDate&&Date.parse(l.expiryDate)>=Date.now()&&Date.parse(l.expiryDate)<=Date.now()+30*864e5).length;
    const expired=activeLots.filter(l=>l.expiryDate&&Date.parse(l.expiryDate)<Date.now()).length;
    const box=document.createElement('div');box.id='ptbr-stock-tools';
    box.innerHTML=`<div class="section-caption">Resumo do estoque</div><div class="card">
      <div class="kv"><span>Lotes ativos</span><b>${activeLots.length}</b></div>
      <div class="kv"><span>Vencem em até 30 dias</span><b>${expiring}</b></div>
      <div class="kv"><span>Lotes vencidos com saldo</span><b>${expired}</b></div>
      <div class="kv"><span>Movimentações registradas</span><b>${movements.length}</b></div>
      <button class="linkrow" data-ptbr-action="stock-audit">Ver histórico de movimentações</button>
    </div>`;
    const first=screen.querySelector('.section-title,.section-caption');if(first)screen.insertBefore(box,first);else screen.prepend(box);
  }

  function renderStockAudit(){
    ensureClinicalState();topbar('Histórico do estoque',{back:true,backLabel:'Estoque'});
    const xs=(state.inventoryMovements||[]).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    $('#screen').innerHTML=`<div class="section-title">Movimentações</div><div class="card">${xs.slice(0,100).map(m=>{
      const alloc=(m.allocations||[]).map(a=>a.stockMode==='units'?`${Number(a.amount||0).toFixed(2)} un.`:`${Number(a.amount||0).toFixed(2)} mg`).join(' + ');
      return `<div class="list-row"><div class="row-main"><div class="row-title strong">${esc(m.substanceName||'Medicamento')}</div><div class="row-sub">${m.reversedAt?'Estornado':'Consumo'} · ${Number(m.doseMg||0).toFixed(3)} mg${alloc?` · ${alloc}`:''}${m.shortageMg>0?` · não coberto: ${Number(m.shortageMg).toFixed(3)} mg`:''}</div><div class="row-sub">${m.createdAt?new Date(m.createdAt).toLocaleString('pt-BR'):'—'}${m.reversedAt?` · estornado em ${new Date(m.reversedAt).toLocaleString('pt-BR')}`:''}</div></div></div>`;
    }).join('')||'<div class="empty">Nenhuma movimentação registrada.</div>'}</div><div class="section-footer">O histórico vincula descontos e estornos às ingestões. Ao editar ou excluir uma ingestão, o consumo anterior é estornado antes do recálculo.</div>`;
  }

  function wrap(name,after){
    const base=window[name];if(typeof base!=='function'||base.__ptbrWrapped)return;
    const fn=function(...args){
      const r=base.apply(this,args);
      requestAnimationFrame(()=>{
        try{after?.();localize(document)}catch(err){console.warn(`pt-BR ${name}`,err)}
      });
      return r;
    };
    fn.__ptbrWrapped=true;window[name]=fn;
  }

  wrap('renderInventory',injectInventoryEnhancements);
  wrap('inventoryLotForm');
  wrap('renderClinicalHub');
  wrap('renderCurrentEffects');
  wrap('renderCheckin');

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-ptbr-action="stock-audit"]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();renderStockAudit();localizeSoon(document);
  },true);

  window.addEventListener('load',()=>localizeSoon(document));
  window.addEventListener('pageshow',()=>localizeSoon(document));
  window.PWJ_PTBR={localize,renderStockAudit,version:'1.1-no-observer'};
})();
