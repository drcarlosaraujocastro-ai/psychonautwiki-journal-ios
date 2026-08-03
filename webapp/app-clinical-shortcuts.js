'use strict';

/* Prominent iPhone shortcuts for medication stock. Inventory already exists in
 * app-clinical.js; this file only makes the actions impossible to miss. */
(function(){
  function injectStockShortcuts(){
    const screen=document.querySelector('#screen');
    if(!screen||!document.querySelector('[data-clinical-action="inventory"]'))return;
    if(document.querySelector('#clinical-stock-shortcuts'))return;
    const box=document.createElement('div');
    box.id='clinical-stock-shortcuts';
    box.innerHTML=`<div class="section-caption">Quick medication stock</div>
      <div class="card">
        <button class="list-row" data-clinical-action="new-lot">
          <div class="row-main"><div class="row-title strong">＋ Add medication stock</div>
          <div class="row-sub">Medication · strength · quantity · purchase · expiry · lot</div></div><span class="chev">›</span>
        </button>
        <button class="list-row" data-clinical-action="inventory">
          <div class="row-main"><div class="row-title">Open inventory</div>
          <div class="row-sub">Remaining units/mg, low-stock and expiry alerts</div></div><span class="chev">›</span>
        </button>
      </div>`;
    const anchor=screen.querySelector('.section-caption');
    if(anchor)screen.insertBefore(box,anchor);else screen.prepend(box);
  }

  if(typeof window.renderClinicalHub==='function'){
    const base=window.renderClinicalHub;
    window.renderClinicalHub=function(){base();injectStockShortcuts()};
  }

  window.addEventListener('load',()=>{
    if(location.hash.replace('#','')==='clinical')setTimeout(injectStockShortcuts,0);
  });
})();
