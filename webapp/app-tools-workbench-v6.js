'use strict';

/* Tools Workbench v6
 * One non-repetitive home for medication, safety, PK/PD, data and training tools.
 * Calculators are descriptive one-compartment approximations, never dose/redose advice.
 */
(function(){
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function toolCard(id,title,desc,icon='⚗'){return `<button class="tw-card" data-tw="${id}"><span class="tw-icon">${icon}</span><b>${escx(title)}</b><small>${escx(desc)}</small></button>`}
  function renderTools(){
    currentTab='tools';location.hash='tools';topbar('Ferramentas',{large:'Ferramentas'});
    $('#screen').innerHTML=`<div class="tw-shell">
      <div class="section-caption">Rotina e tratamento</div><div class="tw-wide">
        ${toolCard('meds','Meus medicamentos','Plano de horários, adesão e registros','◉')}${toolCard('inventory','Estoque','Lotes, saldo, consumo e validade','▣')}${toolCard('checkin','Check-in inteligente','Sintomas adaptados às exposições ativas','✓')}${toolCard('workout','Treino e recuperação','Planos, exercícios, fadiga e progressão','↗')}
      </div>
      <div class="section-caption">Segurança</div><div class="tw-wide">
        ${toolCard('interactions','Interações','Revisão de combinações, sobreposição e riscos','⚠')}${toolCard('safety','Revisão de segurança','Faixas, sinais de alerta e qualidade da atribuição','!')}${toolCard('quality','Qualidade dos dados','Duplicidades, campos ausentes e integridade','◎')}${toolCard('backup','Dados & backup','Exportar, importar, persistência e diagnóstico','▤')}
      </div>
      <div class="section-caption">Farmacologia</div><div class="tw-grid">
        ${toolCard('effects','Efeitos agora','Modelo integrado de fase, intensidade e carry-over','∿')}${toolCard('pkpd','Laboratório PK/PD','Perfis por dose/formulação e calibração individual','⌁')}${toolCard('half','Meia-vida','Estimar fração remanescente em modelo idealizado','⌛')}${toolCard('steady','Steady state','Acúmulo e aproximação ao estado estacionário','↦')}${toolCard('articles','Editor de artigos','Biblioteca estruturada, evidência e revisão','✎')}${toolCard('education','Educação','Tolerância, dependência, rebote, PK e PD','⌂')}
      </div>
      <div class="section-caption">Análise avançada</div><div class="tw-wide">${toolCard('cockpit','Cockpit longitudinal','Farmacologia + sintomas + contexto + treino + timeline','▥')}${toolCard('clinical','Clínico','Monitoramento, tratamento e inteligência clínica','✚')}</div>
      <div class="section-footer">Ferramentas quantitativas são modelos educacionais/analíticos. Não substituem concentração sérica, exame clínico nem justificam ajuste automático de dose.</div>
    </div>`;
  }
  function halfLife(){modal(`${modalHeader('Calculadora de meia-vida','<button class="navbtn" data-tw-calc-half>Calcular</button>','Cancelar')}<div class="smart-form"><div class="card"><div class="fieldrow"><label>Quantidade inicial</label><input id="tw-h-dose" type="number" step="any" value="1"></div><div class="fieldrow"><label>Meia-vida</label><input id="tw-h-hl" type="number" step="any" value="12"><select id="tw-h-hlu"><option value="hours">horas</option><option value="days">dias</option></select></div><div class="fieldrow"><label>Tempo transcorrido</label><input id="tw-h-time" type="number" step="any" value="12"><select id="tw-h-timeu"><option value="hours">horas</option><option value="days">dias</option></select></div></div><div id="tw-h-result" class="card summary">Modelo: eliminação exponencial de primeira ordem, um compartimento.</div></div>`)}
  function calcHalf(){const d=Number($('#tw-h-dose')?.value),hl=Number($('#tw-h-hl')?.value),t=Number($('#tw-h-time')?.value),hf=$('#tw-h-hlu')?.value==='days'?24:1,tf=$('#tw-h-timeu')?.value==='days'?24:1;if(!(d>=0&&hl>0&&t>=0))return;const frac=Math.pow(.5,t*tf/(hl*hf)),amount=d*frac;$('#tw-h-result').innerHTML=`<b>${(frac*100).toFixed(1)}%</b> da quantidade inicial permanece no modelo.<br>Quantidade relativa estimada: <b>${amount.toFixed(4)}</b>.<div class="section-footer">Não é concentração sérica medida e pode divergir em cinética multicompartmental, metabólitos ativos, absorção prolongada ou função orgânica alterada.</div>`}
  function steady(){modal(`${modalHeader('Steady state','<button class="navbtn" data-tw-calc-steady>Calcular</button>','Cancelar')}<div class="smart-form"><div class="card"><div class="fieldrow"><label>Meia-vida (h)</label><input id="tw-s-hl" type="number" step="any" value="12"></div><div class="fieldrow"><label>Intervalo entre doses (h)</label><input id="tw-s-int" type="number" step="any" value="24"></div><div class="fieldrow"><label>Tempo em tratamento (dias)</label><input id="tw-s-days" type="number" step="any" value="3"></div></div><div id="tw-s-result" class="card summary">Estimativa idealizada de acúmulo.</div></div>`)}
  function calcSteady(){const hl=Number($('#tw-s-hl')?.value),tau=Number($('#tw-s-int')?.value),days=Number($('#tw-s-days')?.value);if(!(hl>0&&tau>0&&days>=0))return;const k=Math.log(2)/hl,frac=1-Math.exp(-k*days*24),acc=1/(1-Math.exp(-k*tau));$('#tw-s-result').innerHTML=`Aproximação ao steady state após ${days} dia(s): <b>${(frac*100).toFixed(1)}%</b>.<br>Fator teórico de acúmulo para intervalo de ${tau} h: <b>${acc.toFixed(2)}×</b>.<div class="section-footer">Modelo linear de primeira ordem; não representa saturação, autoindução/inibição, metabólitos ativos ou formulações complexas.</div>`}
  function education(){topbar('Educação',{back:true,backLabel:'Ferramentas'});$('#screen').innerHTML=`<div class="tw-shell"><div class="tw-edu"><section><h2>PK ≠ efeito percebido</h2><p>Meia-vida, Tmax e concentração estimada descrevem exposição. A intensidade clínica pode subir, estabilizar ou cair em outra velocidade por distribuição, farmacodinâmica, adaptação e contexto.</p></section><section><h2>Tolerância</h2><p>Não é sinônimo de “a droga parou de funcionar”. Pode ser aguda ou crônica, específica por efeito e reversível em diferentes escalas. Um check-in ruim ou poucos dias de uso não demonstram tolerância persistente.</p></section><section><h2>Dependência física</h2><p>Adaptação fisiológica com sintomas na retirada não é igual a transtorno por uso de substâncias. Reforço, craving, perda de controle e prejuízo funcional são dimensões distintas.</p></section><section><h2>Rebote</h2><p>Retorno transitório de um domínio na direção oposta ao efeito farmacológico não deve ser automaticamente interpretado como recaída ou progressão da doença.</p></section><section><h2>Steady state</h2><p>Com cinética linear, aproxima-se progressivamente ao platô de exposição ao longo de várias meias-vidas. O app separa steady state de pico subjetivo.</p></section><section><h2>Polifarmácia</h2><p>Efeitos opostos não necessariamente se anulam. Sedação e ativação, por exemplo, podem coexistir em sistemas diferentes e aumentar imprevisibilidade funcional.</p></section></div></div>`}
  function invokeClinical(action){const b=document.createElement('button');b.dataset.clinicalAction=action;b.style.display='none';document.body.appendChild(b);b.click();b.remove()}
  function action(id){
    if(id==='meds'){if(typeof renderSchedules==='function')renderSchedules();else invokeClinical('schedule');return}
    if(id==='inventory'){if(typeof renderInventory==='function')renderInventory();else invokeClinical('inventory');return}
    if(id==='checkin'){invokeClinical('checkin');return}
    if(id==='workout'){if(typeof renderWorkoutHub==='function')renderWorkoutHub();else window.renderTab?.('workout');return}
    if(id==='interactions'){if(typeof renderSafer==='function')renderSafer();else invokeClinical('safety');return}
    if(id==='safety'){invokeClinical('safety');return}
    if(id==='quality'){invokeClinical('quality');return}
    if(id==='backup'){if(typeof renderSettings==='function')renderSettings();return}
    if(id==='effects'){invokeClinical('now');return}
    if(id==='pkpd'){if(window.SmartPKPD?.renderLab)window.SmartPKPD.renderLab();else toast('Laboratório PK/PD não disponível nesta build.');return}
    if(id==='half'){halfLife();return}
    if(id==='steady'){steady();return}
    if(id==='articles'){window.LibraryKnowledge?.renderLibrary?.();return}
    if(id==='education'){education();return}
    if(id==='cockpit'){window.DeepPatient?.renderCockpit?.();return}
    if(id==='clinical'){window.renderTab?.('clinical');return}
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-tw],[data-tw-calc-half],[data-tw-calc-steady]');if(!b)return;if(b.dataset.tw){e.preventDefault();e.stopImmediatePropagation();action(b.dataset.tw)}else if(b.hasAttribute('data-tw-calc-half'))calcHalf();else calcSteady()},true);
  const st=document.createElement('style');st.textContent=`.tw-shell{max-width:1500px;margin:0 auto}.tw-wide,.tw-grid{display:grid;gap:12px}.tw-wide{grid-template-columns:repeat(2,minmax(0,1fr))}.tw-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tw-card{border:1px solid color-mix(in srgb,var(--separator) 70%,transparent);background:var(--card);color:inherit;border-radius:18px;padding:18px;text-align:left;min-height:126px}.tw-card b,.tw-card small{display:block}.tw-card b{font-size:17px;margin:12px 0 6px}.tw-card small{color:var(--secondary);line-height:1.35}.tw-icon{font-size:23px;color:var(--accent)}.tw-edu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tw-edu section{background:var(--card);border-radius:18px;padding:20px}.tw-edu h2{margin:0 0 8px;font-size:18px}.tw-edu p{margin:0;color:var(--secondary);line-height:1.55}@media(max-width:650px){.tw-wide,.tw-grid,.tw-edu{grid-template-columns:1fr}.tw-card{min-height:105px}}@media(min-width:1100px){.tw-wide{grid-template-columns:repeat(4,minmax(0,1fr))}.tw-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}`;document.head.appendChild(st);
  window.ToolsWorkbench={version:'6.0',render:renderTools,halfLife,steady,education};
})();