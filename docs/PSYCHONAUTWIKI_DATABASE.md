# Base PsychonautWiki editável — arquitetura obrigatória

## Requisito central

O aplicativo deve preservar a base offline do PsychonautWiki como uma de suas funções principais. A base não será substituída por textos próprios, nem fundida destrutivamente com substâncias pessoais.

O PsyLog atual inclui um snapshot estático em `PsyLog/Assets/substances.json`, com aproximadamente 289 substâncias no arquivo analisado. Esse snapshot contém nomes, aliases, URL de origem, aprovação, tolerância, toxicidade, categorias, resumo, interações, doses, vias, biodisponibilidade e duração.

## Problema do modelo atual

O `SubstanceRepo` decodifica diretamente o JSON empacotado e o trata como fonte única e imutável. Alterar esse JSON dentro do aplicativo não é um fluxo sustentável porque:

- uma atualização do catálogo substituiria edições locais;
- não existe auditoria de quem mudou o quê;
- não é possível distinguir fonte PsychonautWiki de revisão clínica própria;
- conflitos não podem ser apresentados ao usuário;
- o catálogo não tem versionamento interno nem data de obtenção;
- dados farmacológicos adicionais ficariam misturados com conteúdo original.

## Modelo em três camadas

### 1. `UpstreamKnowledgeSnapshot`

Snapshot oficial, somente leitura dentro do aplicativo.

Campos mínimos:

- `snapshotID`;
- data de obtenção;
- versão/hash SHA-256;
- URL/API de origem;
- licença;
- atribuição;
- payload original preservado;
- substâncias decodificadas;
- estado de validação.

O app deve continuar funcionando offline mesmo sem atualizar esse snapshot.

### 2. `KnowledgeOverride`

Edições locais vinculadas a uma substância do snapshot.

Cada campo pode assumir um dos estados:

- herdar valor do PsychonautWiki;
- substituir localmente;
- acrescentar comentário clínico;
- marcar como duvidoso;
- ocultar localmente;
- restaurar valor original.

Campos de auditoria:

- identificador canônico da substância;
- caminho do campo editado;
- valor original;
- valor local;
- justificativa;
- fonte bibliográfica;
- data de revisão;
- nível de evidência;
- status: rascunho, revisado, rejeitado ou desatualizado;
- data de criação e modificação.

### 3. `PersonalSubstance`

Substâncias criadas integralmente pelo usuário e que não dependem do catálogo PsychonautWiki.

Devem aceitar:

- nome canônico;
- aliases e marcas;
- princípio ativo;
- formulação;
- concentração;
- fabricante e lote;
- unidades e vias;
- cor;
- farmacologia/PK estruturada;
- fontes;
- notas pessoais;
- status de revisão.

Uma substância pessoal poderá ser posteriormente vinculada a uma substância do PsychonautWiki sem perder seu histórico.

## Resolução exibida no aplicativo

A interface não deve mostrar diretamente um dos três objetos. Ela deve produzir um `ResolvedSubstanceKnowledge`:

```text
snapshot PsychonautWiki
        +
overrides locais válidos
        +
camada clínica complementar
        =
conteúdo exibido
```

A tela deve permitir alternar entre:

- **Visualização consolidada**;
- **Original PsychonautWiki**;
- **Minhas alterações**;
- **Fontes e histórico**.

Cada campo alterado deve possuir indicador visual e opção **Restaurar original**.

## Atualização do catálogo

O PsychonautWiki recomenda o uso de sua API em vez de crawling. O processo futuro será:

1. GitHub Action ou serviço de atualização consulta a API permitida;
2. gera um novo snapshot versionado;
3. valida schema e conteúdo mínimo;
4. calcula hash;
5. compara com o snapshot anterior;
6. produz relatório de inclusão, alteração e remoção;
7. executa testes de decodificação;
8. publica o novo snapshot em PR;
9. o aplicativo reconcilia overrides pelo identificador canônico.

Atualizações nunca podem apagar silenciosamente uma edição local. Quando o campo original mudar, o override deve ser marcado como potencialmente desatualizado e apresentado para revisão.

## Farmacologia e farmacocinética

A camada clínica adicional não deve sobrescrever o conteúdo PsychonautWiki como se fossem a mesma fonte.

Criar registros separados para:

- mecanismo e targets;
- afinidades e tipo de modulação;
- biodisponibilidade por via;
- `Tmax`;
- meia-vida terminal e efetiva;
- metabólitos ativos/inativos;
- CYP, UGT e transportadores;
- ligação proteica;
- volume de distribuição;
- depuração e eliminação;
- interações farmacocinéticas;
- interações farmacodinâmicas;
- população estudada;
- fonte, ano e nível de evidência;
- faixa/incerteza.

Textos do PsychonautWiki, dados semânticos e revisão clínica devem manter proveniência independente.

## Licenças e atribuição

- código do fork: GPL-3.0-or-later;
- a maior parte do texto e metadados do PsychonautWiki: CC BY-SA 4.0;
- dados semânticos: CC BY 4.0;
- imagens podem possuir licença própria e não devem ser importadas automaticamente sem validação.

O aplicativo deve manter uma tela de atribuição, versão do snapshot, data de atualização e link para a fonte.

## Critérios de aceitação

- a base PsychonautWiki permanece disponível offline;
- busca inclui aliases do snapshot e substâncias pessoais;
- qualquer campo do conteúdo consolidado pode receber override local;
- original e edição local permanecem recuperáveis;
- atualização não apaga edição local;
- exportação inclui snapshotID e overrides;
- importação preserva campos desconhecidos;
- restauração do original é possível por campo;
- farmacologia clínica não é apresentada como conteúdo original do PsychonautWiki;
- fontes e licenças permanecem visíveis.
