'use strict';

/* PT-BR shell localization, loaded last.
 * No MutationObserver: localization runs only after known render functions.
 */
(function(){
  const TEXT={
    'Journal':'Diário','Substances':'Substâncias','Clinical':'Clínico','Safer':'Segurança','Settings':'Ajustes','Stats':'Estatísticas',
    'Current':'Atual','Previous':'Anteriores','Calendar':'Calendário','Search experiences':'Buscar registros','No experiences yet':'Nenhum registro ainda',
    'No previous experiences.':'Nenhum registro anterior.','No favorite experiences':'Nenhum registro favorito','Log an ingestion to start your journal.':'Registre uma ingestão para iniciar o diário.',
    'New Ingestion':'Nova ingestão','Add Ingestion':'Adicionar ingestão','Cumulative Dose':'Dose cumulativa','Notes':'Notas','Ratings':'Avaliações','Experience Note':'Nota da sessão','Location':'Local','Add Location':'Adicionar local','Add Note':'Adicionar nota','Add Rating':'Adicionar avaliação',
    'Edit Title':'Editar título','Edit Experience Note':'Editar nota da sessão','Delete Experience':'Excluir sessão','Edit Ingestion':'Editar ingestão','Delete Ingestion':'Excluir ingestão','Time':'Horário','Stomach':'Estômago','Not set':'Não informado',
    'Dose & Duration':'Dose e duração','Duration':'Duração','Route':'Via','Threshold':'Limiar','Common min':'Comum mín.','Strong min':'Forte mín.','Heavy min':'Muito forte mín.','Total':'Total','After effects':'Efeitos residuais',
    'Onset':'Início','Come-up':'Subida','Peak':'Pico','Plateau':'Platô','Off-set':'Queda','Offset':'Queda','Residual tail':'Cauda residual','Steady state':'Estado estacionário','Half-life':'Meia-vida','Total duration':'Duração total',
    'Predicted effects':'Efeitos previstos','Observed patient response':'Resposta individual observada','Observed response':'Resposta observada','Patient-adjusted learning layer':'Camada de aprendizado individual',
    'No modeled active substances at the current time.':'Nenhuma substância ativa relevante no modelo agora.',
    'Advanced Pharmacology':'Farmacologia avançada','Clinical pharmacology':'Farmacologia clínica','Clinical classification':'Classificação clínica','Clinical dose bands':'Faixas clínicas de dose','Tolerance & adaptation':'Tolerância e adaptação','Evidence layers':'Camadas de evidência',
    'Class':'Classe','Mechanism':'Mecanismo','Targets':'Alvos','Bioavailability':'Biodisponibilidade','Physiologic dependence':'Dependência fisiológica','Withdrawal':'Abstinência','Rebound':'Rebote','Sensitization':'Sensibilização','Cross-tolerance':'Tolerância cruzada',
    'Approved uses':'Usos aprovados','Evidence-supported off-label':'Off-label com suporte de evidência','Mechanistic hypotheses':'Hipóteses mecanísticas','Experiential':'Experiencial','Technical':'Técnico','Save':'Salvar','Done':'Concluir','Cancel':'Cancelar','Back':'Voltar'
  };
  const MONTH={Jan:'jan.',Feb:'fev.',Mar:'mar.',Apr:'abr.',May:'mai.',Jun:'jun.',Jul:'jul.',Aug:'ago.',Sep:'set.',Oct:'out.',Nov:'nov.',Dec:'dez.',January:'janeiro',February:'fevereiro',March:'março',April:'abril',May:'maio',June:'junho',July:'julho',August:'agosto',September:'setembro',October:'outubro',November:'novembro',December:'dezembro'};
  function dateText(s){
    let m=String(s||'').trim().match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);if(m)return`${m[1]} ${MONTH[m[2]]} ${m[3]}`;
    m=String(s||'').trim().match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/);if(m)return`${MONTH[m[1]]} de ${m[2]}`;
    return null;
  }
  function exact(el){return el&&el.childNodes?.length===1&&el.firstChild?.nodeType===Node.TEXT_NODE?el.textContent.trim():null}
  function localize(root=document){
    if(!root?.querySelectorAll)return;
    root.querySelectorAll('button,label,.section-title,.section-caption,.row-title,.row-sub,.navtitle,.large-title,.row-value,.kv span,.kv b,.empty,.section-footer,.form-title').forEach(el=>{const t=exact(el);if(!t)return;if(TEXT[t]){el.textContent=TEXT[t];return}const d=dateText(t);if(d)el.textContent=d});
    root.querySelectorAll('[data-tab] span').forEach(el=>{const id=el.parentElement?.dataset?.tab;const map={journal:'Diário',substances:'Substâncias',clinical:'Clínico',safer:'Segurança',settings:'Ajustes',stats:'Estatísticas'};if(map[id])el.textContent=map[id]});
    root.querySelectorAll('input,textarea').forEach(el=>{const p=el.getAttribute('placeholder');const mp={'Search experiences':'Buscar registros','Search substances':'Buscar substâncias','Notes':'Notas','Note':'Nota','Symptoms, perceived effects, adverse effects, context...':'Sintomas, efeitos percebidos, efeitos adversos, contexto...'};if(mp[p])el.setAttribute('placeholder',mp[p])});
  }
  function wrap(name){const base=window[name];if(typeof base!=='function'||base.__ptbrShell)return;const fn=function(...args){const r=base.apply(this,args);requestAnimationFrame(()=>{try{localize(document)}catch(e){console.warn('PT-BR shell',name,e)}});return r};fn.__ptbrShell=true;window[name]=fn;try{eval(`${name}=window[name]`)}catch(_){} }
  ['renderJournal','renderCalendar','renderExperience','renderSearch','renderSubstance','renderSettings','renderSafer','renderStats','renderClinicalHub','renderInventory','renderCurrentEffects','renderCheckin'].forEach(wrap);
  window.addEventListener('load',()=>requestAnimationFrame(()=>localize(document)));
  window.addEventListener('pageshow',()=>requestAnimationFrame(()=>localize(document)));
  window.PWJ_PTBR_SHELL={version:'2.0',localize};
})();
