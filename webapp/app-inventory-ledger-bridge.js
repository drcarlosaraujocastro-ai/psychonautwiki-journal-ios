'use strict';

/* Bridge legacy Stability UI stock buttons to the v3.3 ledger before the
 * document-level legacy capture handler can open the old form. */
(function(){
  window.addEventListener('click',e=>{
    const add=e.target.closest?.('[data-stable-new-stock]');
    if(add){e.preventDefault();e.stopImmediatePropagation();window.inventoryLotForm?.(null,add.dataset.stockSubstance||'');return}
    const edit=e.target.closest?.('[data-stable-edit-stock]');
    if(edit){e.preventDefault();e.stopImmediatePropagation();window.inventoryLotForm?.(edit.dataset.stableEditStock);return}
    const calc=e.target.closest?.('[data-ledger-calc-history]');
    if(calc){
      const save=document.querySelector('[data-ledger-save]');
      if(save?.dataset?.lotId){
        e.preventDefault();e.stopImmediatePropagation();
        toast('O cálculo pelo Journal é usado apenas no cadastro inicial. Para lotes existentes, use “Corrigir saldo” para evitar desconto duplicado.');
        return;
      }
    }
  },true);
})();
