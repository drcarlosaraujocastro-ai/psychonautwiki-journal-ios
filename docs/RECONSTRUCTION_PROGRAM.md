# Programa de reconstrução — PsicoNorte Journal iOS

## Baselines analisadas

| Fonte | Papel | Decisão |
|---|---|---|
| PsychonautWiki Journal 11.11 | referência estável de lançamento | manter para regressão e comparação |
| PsychonautWiki Journal `main` | último estado público do Journal | preservar histórico e recursos ausentes no fork |
| PsyLog development `610f1cae` | base funcional mais evoluída | baseline preferencial para portabilidade incremental |

O PsyLog normalizado contra o Journal possui aproximadamente 319 caminhos equivalentes; 283 arquivos Swift apresentam mudanças e há poucos arquivos Swift realmente novos/removidos. Portanto, não é correto “colar dois aplicativos”: é uma divergência de fork que deve ser reconciliada por subsistema.

## Auditoria estática inicial do PsyLog

- aproximadamente 21.863 linhas Swift;
- 10 tipos `ObservableObject` e 9 usos de `@EnvironmentObject`;
- 61 candidatos a force unwrap;
- 7 `fatalError`;
- quatro arquivos acima de 350 linhas, além de outros arquivos acima de 300;
- quatro marcadores `FIXME` ligados a `@preconcurrency` em Core Data/Core Location;
- criação, edição e exclusão de substâncias personalizadas já existem, mas a descoberta da função precisa ser melhorada.

Arquivos prioritários para divisão/refatoração:

1. `ExperienceScreen.swift` — ~445 linhas;
2. `FinishIngestionScreen.swift` — ~402 linhas;
3. `EditIngestionScreen.swift` — ~393 linhas;
4. `FullCumulativeTimelines.swift` — ~369 linhas;
5. `Settings-ViewModel.swift` — ~366 linhas;
6. `FinishCustomUnitsScreen.swift` — ~358 linhas;
7. `StatsScreen.swift` — ~313 linhas;
8. `ChooseDoseScreen.swift` — ~312 linhas.

## Fase 0 — controle do projeto

- manter `main` estável;
- todas as alterações em branch + pull request;
- adicionar CI macOS para build/teste de simulador;
- registrar versão do Xcode e dependências;
- preservar GPLv3 e atribuições;
- criar fixtures de importação do Journal e PsyLog.

**Saída:** baseline reproduzível e logs de compilação confiáveis.

## Fase 1 — reconciliação do fork

Comparar Journal e PsyLog por funcionalidade, não por nome de arquivo:

- persistência e migrações Core Data;
- importação/exportação;
- criação de substâncias e unidades personalizadas;
- experiência, ingestão e notas temporizadas;
- interações;
- timeline e estatísticas;
- Live Activity;
- App Intents;
- autenticação;
- acessibilidade e localização.

Para cada subsistema: escolher implementação-base, preservar comportamento útil da outra fonte, adicionar testes e documentar a decisão.

**Saída:** fork unificado, sem regressões conhecidas.

## Fase 2 — correção e modernização

- remover crashes evitáveis, force unwraps e `fatalError` inadequados;
- resolver warnings de concorrência;
- modernizar SwiftUI de forma incremental;
- dividir views acima de 300 linhas;
- reduzir dependência global de `@EnvironmentObject`;
- adicionar estados explícitos de loading/erro;
- revisar consumo de memória e renderização da timeline;
- aplicar Dynamic Type e labels de acessibilidade.

**Saída:** aplicativo estável antes de ampliar o modelo clínico.

## Fase 3 — modelo clínico versão 8

Preservar Core Data e criar nova versão com migração testada.

### Novos conceitos

- substância canônica;
- produto/formulação/marca;
- fabricante e lote;
- dose prescrita separada da dose utilizada;
- intenção declarada;
- redose explícita;
- sono prévio;
- alimentação;
- cafeína/nicotina;
- sinais vitais;
- check-ins estruturados;
- proveniência e auditoria de importação.

**Regra:** sobreposição temporal nunca basta para classificar redose, abuso ou recaída.

## Fase 4 — farmacologia e farmacocinética

Não inserir textos farmacológicos diretamente nas views.

### Camada de conhecimento

Cada registro deve possuir:

- substância canônica e identificadores;
- mecanismo/targets;
- PK por via;
- biodisponibilidade, `Tmax`, meia-vida e metabólitos;
- CYP/UGT/transportadores;
- ligação proteica e eliminação;
- intervalos/dose apenas quando a fonte permite;
- interação farmacodinâmica versus farmacocinética;
- população estudada;
- fonte e data;
- nível de evidência;
- status de revisão;
- incerteza e faixa, não falso valor pontual.

Modelos de curva devem ser rotulados como estimativas, manter parâmetros editáveis e nunca substituir decisão clínica.

## Fase 5 — design

Preservar o que funciona na identidade do Journal/PsyLog:

- timeline como elemento central;
- cores por substância;
- experiência como agrupador;
- fluxo progressivo de registro;
- informação de redução de danos acessível.

Melhorar:

- botão permanente para substância personalizada;
- registro rápido para medicações favoritas;
- modo pessoal e modo clínico;
- hierarquia visual;
- formulários menores;
- navegação enum-driven;
- gráficos legíveis e acessíveis;
- design sóbrio, sem romantização de uso.

## Fase 6 — distribuição sem computador próprio

### Durante o desenvolvimento

- Codex + GitHub para mudanças e PRs;
- GitHub Actions macOS para build/teste de simulador;
- artifacts e logs disponíveis pelo navegador.

### Para instalar no iPhone

Caminho preferencial sem Mac próprio:

1. Apple Developer Program;
2. App Store Connect API key;
3. Codemagic com assinatura automática;
4. archive e envio automático ao TestFlight;
5. instalação pelo aplicativo TestFlight.

Xcode Cloud não é o primeiro caminho porque a configuração inicial oficial exige abrir o projeto no Xcode. Após uma configuração inicial feita em algum Mac, ele pode ser administrado no App Store Connect.

## Critério de conclusão

O aplicativo só será considerado utilizável quando:

- compilar em CI;
- passar testes de migração/importação;
- não perder dados existentes;
- instalar por TestFlight;
- registrar substância e ingestão em fluxo completo;
- exportar e reimportar sem perda;
- bloquear dados no aparelho;
- documentar limites farmacológicos e de segurança.
