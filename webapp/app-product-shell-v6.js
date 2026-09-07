'use strict';

/* Product Shell v6
 * Final navigation layer: Journal / Biblioteca / Ferramentas / Clínico / Insights.
 * Keeps workout, patient hub and settings reachable through Ferramentas to reduce repetition.
 */
(function(){
  const ICON={
    journal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 20a3 3 0 0 1 3-3h7"/></svg>',
    library:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h5v14H4zM10.5 3h4v16h-4zM16 6h4v13h-4z"/></svg>',
    tools:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6a4 4 0 0 0 4.9 4.9L11 18.8a3 3 0 1 1-4.2-4.2l7.9-7.9A4 4 0 0 0 14 6z"/><path d="m15 15 4 4"/></svg>',
    clinical:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="M7 7h10v10H7z"/></svg>',
    insights:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M9 19v-5M14 19V5M19 19v-9"/><path d="m4 8 5 3 5-7 5 4"/></svg>'
  };
  function activeId(){
    const h=location.hash.replace('#','');
    if(['substances','library'].includes(h))return'library';
    if(['tools','workout','safer','settings','patient','today'].includes(h))return'tools';
    if(['clinical'].includes(h))return'clinical';
    if(['insights','stats'].includes(h))return'insights';
    if(h==='journal')return'journal';
    if(currentTab==='substances')return'library';if(['workout','safer','settings','patient'].includes(currentTab))return'tools';return currentTab||'journal'
  }
  function renderTabs(){const el=$('#tabbar');if(!el)return;const a=activeId(),items=[['journal','Journal'],['library','Biblioteca'],['tools','Ferramentas'],['clinical','Clínico'],['insights','Insights']];el.innerHTML=items.map(([id,label])=>`<button class="tab ${a===id?'active':''}" data-v6-tab="${id}">${ICON[id]}<span>${label}</span></button>`).join('')}
  const legacy=window.renderTab;
  window.tabs=renderTabs;
  window.renderTab=function(tab){
    if(tab==='substances')tab='library';
    if(tab==='library'){currentTab='library';location.hash='library';navStack=[];renderTabs();window.LibraryKnowledge?.renderLibrary?.();return}
    if(tab==='tools'){currentTab='tools';location.hash='tools';navStack=[];renderTabs();window.ToolsWorkbench?.render?.();return}
    if(tab==='insights'){currentTab='insights';location.hash='insights';navStack=[];renderTabs();if(window.DeepPatient?.renderCockpit)window.DeepPatient.renderCockpit();else if(typeof renderStats==='function')renderStats();return}
    if(tab==='clinical'){currentTab='clinical';location.hash='clinical';navStack=[];renderTabs();if(typeof renderClinicalHub==='function')renderClinicalHub();return}
    if(tab==='journal'){currentTab='journal';location.hash='journal';navStack=[];renderTabs();if(typeof renderJournal==='function')renderJournal();return}
    if(typeof legacy==='function'){legacy(tab);renderTabs()}
  };
  function searchFab(){let b=document.querySelector('#v6-search');if(b)return;b=document.createElement('button');b.id='v6-search';b.setAttribute('aria-label','Buscar na Biblioteca');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/></svg>';document.body.appendChild(b)}
  document.addEventListener('click',e=>{const t=e.target.closest?.('[data-v6-tab],#v6-search');if(!t)return;e.preventDefault();e.stopImmediatePropagation();if(t.id==='v6-search'){window.renderTab('library');setTimeout(()=>$('#kb-search')?.focus(),20);return}window.renderTab(t.dataset.v6Tab)},true);
  window.addEventListener('hashchange',()=>{const h=location.hash.replace('#','');if(['journal','library','tools','clinical','insights'].includes(h)&&h!==currentTab)window.renderTab(h)});
  document.addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||e.metaKey)return;const m={'1':'journal','2':'library','3':'tools','4':'clinical','5':'insights'};if(m[e.key]){e.preventDefault();window.renderTab(m[e.key])}},true);
  const st=document.createElement('style');st.textContent=`
    #tabbar{grid-template-columns:repeat(5,1fr)!important}.tab svg{width:24px!important;height:24px!important}.tab span{font-size:10px!important}
    #v6-search{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:calc(82px + env(safe-area-inset-bottom));width:52px;height:52px;border-radius:50%;border:1px solid color-mix(in srgb,var(--separator) 72%,transparent);background:color-mix(in srgb,var(--card) 92%,transparent);color:var(--text);z-index:75;display:grid;place-items:center;box-shadow:0 8px 28px rgba(0,0,0,.22);backdrop-filter:blur(18px)}#v6-search svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8}
    @media(min-width:960px){#v6-search{display:none}#tabbar:before{content:'JOURNAL';display:block;padding:8px 13px 18px;font-size:18px;font-weight:800;letter-spacing:.04em;color:var(--text)}#tabbar .tab span{font-size:13px!important}}
  `;document.head.appendChild(st);
  searchFab();setTimeout(()=>{renderTabs();const h=location.hash.replace('#','');if(h==='substances')window.renderTab('library')},0);
  window.ProductShellV6={version:'6.0',renderTabs};
})();