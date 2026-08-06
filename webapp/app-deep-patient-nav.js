'use strict';
(function(){
 function inject(){const s=document.querySelector('#screen');if(!s||document.querySelector('#dp-entry'))return;const box=document.createElement('div');box.id='dp-entry';box.innerHTML='<div class="section-caption">Visão avançada</div><div class="card"><button class="list-row" data-dp-cockpit><div class="row-main"><div class="row-title strong">Cockpit clínico longitudinal</div><div class="row-sub">Telemetria farmacológica, sintomas, cognição, contexto, funcionamento e qualidade dos dados.</div></div><span class="chev">›</span></button></div>';s.prepend(box)}
 const base=window.renderClinicalHub;if(typeof base==='function')window.renderClinicalHub=function(){const r=base();requestAnimationFrame(inject);return r};
 window.addEventListener('pageshow',()=>{if(location.hash==='#clinical')setTimeout(inject,0)});setTimeout(()=>{if(location.hash==='#clinical')inject()},0);
})();