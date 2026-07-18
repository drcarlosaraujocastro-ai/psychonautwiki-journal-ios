---
title: CI: make iOS simulator selection robust and use macos-latest
body: |
  Corrige o workflow iOS CI para melhorar compatibilidade no runner macOS:

  - altera `runs-on` de `macos-15` para `macos-latest`.
  - reescreve a seleção do simulador para usar `xcrun simctl list devices available -j` e extrair o primeiro iPhone disponível de forma robusta.
  - usa o mesmo scheme do build (`PsychonautWiki Journal`) para rodar `test` em vez de um scheme possivelmente inexistente `JournalTests`.

  Erros encontrados:
  - runner `macos-15` pode não estar disponível; `macos-latest` é mais compatível.
  - passo de seleção de simulador frágil (heredoc Python e indentação), podia falhar.
  - `-scheme "JournalTests"` provavelmente não existe no projeto.

  Arquivos alterados:
  - .github/workflows/ios-ci.yml

  Testes executados pelo workflow (quando acionado):
  - xcodebuild -version / swift --version / xcodebuild -list -project
  - xcodebuild -resolvePackageDependencies
  - xcodebuild build (PsychonautWiki Journal) no simulador
  - xcodebuild test (PsychonautWiki Journal) no simulador

  Riscos remanescentes:
  - o nome do scheme ainda pode diferir; caso falhe, irei ajustar ao nome exato.
  - falhas na resolução de Swift Package Dependencies podem exigir ajustes.
  - simulador disponível pode não suportar a versão iOS requerida pelos testes.

  Não há alterações no modelo Core Data nem na interface.

  Draft PR criado automaticamente pelo agente para validar CI.

assignees: []
labels: []
base: main
head: agent/ci-fix-scheme-sim
