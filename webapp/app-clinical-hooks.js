'use strict';

window.addEventListener('load',async()=>{
 try{window.ClinicalInventory?.ensure();window.ClinicalReasoning?.ensure?.();if(window.ClinicalInventory?.alerts?.().length)toast(`${window.ClinicalInventory.alerts().length} medication stock lot(s) are at or below the low-stock threshold.`)}catch(e){console.warn(e)}
});

if(typeof finishIngestionWizard==='function'){
 const __baseFinishIngestionWizard=finishIngestionWizard;
 finishIngestionWizard=async function(){
   const before=new Set((state.experiences||[]).flatMap(e=>(e.ingestions||[]).map(i=>i.id)));
   await __baseFinishIngestionWizard();
   const created=(state.experiences||[]).flatMap(e=>(e.ingestions||[])).find(i=>!before.has(i.id));
   if(created&&window.ClinicalInventory){await window.ClinicalInventory.consumeIngestion(created);await saveState()}
 };
}

if(typeof journalPayload==='function'){
 const __baseJournalPayload=journalPayload;
 journalPayload=function(){
   const p=__baseJournalPayload();
   window.ClinicalInventory?.ensure();window.ClinicalReasoning?.ensure?.();
   return {...p,clinicalData:{
     inventoryLots:state.inventoryLots||[],inventoryMovements:state.inventoryMovements||[],clinicalCheckins:state.clinicalCheckins||[],clinicalSettings:state.clinicalSettings||{},
     clinicalProfile:state.clinicalProfile||{},targetSymptoms:state.targetSymptoms||[],symptomMeasurements:state.symptomMeasurements||[],clinicalTreatments:state.clinicalTreatments||[],clinicalAnalyses:state.clinicalAnalyses||[],
     clinicalOverrides:state.clinicalOverrides||{},substanceOverrides:state.substanceOverrides||{}
   }};
 };
}

if(typeof importJournal==='function'){
 const __baseImportJournal=importJournal;
 importJournal=async function(file){
   let clinical=null;try{clinical=JSON.parse(await file.text())?.clinicalData||null}catch(e){}
   await __baseImportJournal(file);
   if(clinical){
     state.inventoryLots=clinical.inventoryLots||[];state.inventoryMovements=clinical.inventoryMovements||[];state.clinicalCheckins=clinical.clinicalCheckins||[];state.clinicalSettings=clinical.clinicalSettings||{};
     state.clinicalProfile=clinical.clinicalProfile||{};state.targetSymptoms=clinical.targetSymptoms||[];state.symptomMeasurements=clinical.symptomMeasurements||[];state.clinicalTreatments=clinical.clinicalTreatments||[];state.clinicalAnalyses=clinical.clinicalAnalyses||[];
     state.clinicalOverrides=clinical.clinicalOverrides||state.clinicalOverrides||{};state.substanceOverrides=clinical.substanceOverrides||state.substanceOverrides||{};
     window.ClinicalReasoning?.ensure?.();await saveState();toast('Journal and clinical workspace imported')
   }
 };
}

document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-save-edit-ingestion],[data-delete-ingestion],[data-action="delete-exp"]');if(!t)return;
 if(t.matches('[data-action="delete-exp"]')){
   e.preventDefault();e.stopImmediatePropagation();const x=getExperience(t.dataset.experienceId);if(x&&confirm('Delete this experience and its ingestions? Inventory used by these ingestions will be restored.')){await window.ClinicalInventory?.reverseExperience(x);state.experiences=state.experiences.filter(z=>z.id!==x.id);await saveState();closeModal();renderTab('journal')}return;
 }
 if(t.dataset.deleteIngestion){
   e.preventDefault();e.stopImmediatePropagation();const x=getExperience(t.dataset.experienceId);if(!x)return;if(confirm('Delete this ingestion? Inventory used by this ingestion will be restored.')){await window.ClinicalInventory?.reverseIngestion(t.dataset.deleteIngestion);x.ingestions=x.ingestions.filter(z=>z.id!==t.dataset.deleteIngestion);if(!x.ingestions.length){state.experiences=state.experiences.filter(z=>z.id!==x.id);await saveState();closeModal();renderTab('journal')}else{x.sortDate=Math.min(...x.ingestions.map(z=>z.time));await saveState();closeModal();renderExperience(x.id)}}return;
 }
 if(t.dataset.saveEditIngestion){
   e.preventDefault();e.stopImmediatePropagation();const x=getExperience(t.dataset.experienceId),i=x?.ingestions?.find(z=>z.id===t.dataset.saveEditIngestion);if(!i)return;await window.ClinicalInventory?.reverseIngestion(i.id);i.substanceName=$('#edit-ing-name').value.trim();i.administrationRoute=$('#edit-ing-route').value;i.dose=$('#edit-ing-dose').value===''?null:Number($('#edit-ing-dose').value);i.units=$('#edit-ing-units').value;i.time=new Date($('#edit-ing-time').value).getTime();i.stomachFullness=$('#edit-ing-stomach').value||null;i.notes=$('#edit-ing-notes').value;x.sortDate=Math.min(...x.ingestions.map(z=>z.time));await window.ClinicalInventory?.consumeIngestion(i);await saveState();closeModal();renderExperience(x.id);return;
 }
},true);
