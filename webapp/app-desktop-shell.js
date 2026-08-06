'use strict';

/* Desktop Shell v1
 * Responsive desktop navigation without duplicating clinical functionality.
 * No MutationObserver: wraps the existing tab renderer to stay stable on iOS.
 */
(function(){
  function addDesktopExtras(){
    const bar=document.querySelector('#tabbar');if(!bar||bar.querySelector('[data-desk-cockpit]'))return;
    const sep=document.createElement('div');sep.className='desk-sep';
    const btn=document.createElement('button');btn.className='tab desk-cockpit';btn.setAttribute('data-desk-cockpit','');btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M9 19V5M14 19v-8M19 19V3"/><path d="M3 19h18"/></svg><span>Cockpit</span>';
    bar.append(sep,btn);
  }
  const baseTabs=window.tabs;
  if(typeof baseTabs==='function')window.tabs=function(){const r=baseTabs();addDesktopExtras();return r};
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-desk-cockpit]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(window.DeepPatient?.renderCockpit)window.DeepPatient.renderCockpit();else toast('Cockpit ainda não carregado.')},true);
  document.addEventListener('keydown',e=>{if(e.altKey&&!e.ctrlKey&&!e.metaKey){const m={'1':'patient','2':'journal','3':'clinical','4':'workout','5':'more'};if(m[e.key]){e.preventDefault();window.renderTab?.(m[e.key])}if(e.key==='0'){e.preventDefault();window.DeepPatient?.renderCockpit?.()}}});
  const st=document.createElement('style');st.textContent=`
    .desk-sep,.desk-cockpit{display:none}
    @media(min-width:960px){
      #app-shell{display:grid!important;grid-template-columns:228px minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr)!important;grid-template-areas:'nav top' 'nav main'!important;max-width:none!important;min-height:100vh!important}
      #tabbar{grid-area:nav!important;position:sticky!important;top:0!important;left:0!important;bottom:auto!important;width:auto!important;height:100vh!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important;gap:5px!important;padding:22px 12px!important;border-top:0!important;border-right:1px solid var(--separator)!important;background:var(--card)!important;box-sizing:border-box!important;z-index:50!important}
      #tabbar .tab{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;min-height:50px!important;width:100%!important;padding:0 13px!important;border-radius:12px!important;font-size:13px!important}
      #tabbar .tab svg{width:22px!important;height:22px!important;flex:0 0 22px!important}#tabbar .tab span{font-size:13px!important}
      #tabbar .tab.active{background:color-mix(in srgb,var(--accent) 14%,transparent)!important}
      .desk-sep{display:block;height:1px;background:var(--separator);margin:10px 4px}.desk-cockpit{display:flex!important;margin-top:0!important}
      #topbar{grid-area:top!important;position:sticky!important;top:0!important;z-index:40!important;border-bottom:1px solid color-mix(in srgb,var(--separator) 70%,transparent)!important}
      #screen{grid-area:main!important;width:100%!important;max-width:1680px!important;margin:0 auto!important;padding:22px 30px 56px!important;box-sizing:border-box!important;overflow:visible!important}
      .ux-metrics{grid-template-columns:repeat(4,minmax(0,1fr))!important}.ux-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .card{box-shadow:0 1px 0 rgba(127,127,127,.05)}
    }
    @media(min-width:1400px){#screen{padding-left:42px!important;padding-right:42px!important}}
  `;document.head.appendChild(st);
  setTimeout(()=>{try{window.tabs?.();addDesktopExtras()}catch{}},0);
  window.DesktopShell={version:'1.0',addDesktopExtras};
})();
