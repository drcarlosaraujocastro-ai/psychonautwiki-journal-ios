# Fluxo sem Mac ou PC — passo a passo

## O que você fará no iPhone

Você não precisa editar Swift, usar terminal ou resolver conflitos de Git.

Suas ações ficam limitadas a:

1. aprovar ou rejeitar pull requests;
2. testar versões no TestFlight;
3. descrever o que funcionou ou falhou;
4. criar a conta Apple Developer e uma chave do App Store Connect quando chegarmos à distribuição.

## Onde cada parte acontece

| Atividade | Ambiente |
|---|---|
| Leitura e comparação do código | ChatGPT/Codex + GitHub |
| Alterações, commits e PRs | Codex + GitHub |
| Build e testes automatizados | GitHub Actions em macOS |
| Inspeção de logs | navegador/app GitHub |
| Assinatura e geração de IPA | Codemagic conectado à Apple |
| Instalação | TestFlight no iPhone |

## Etapa 1 — desenvolvimento pelo Codex no celular

1. Abra o ChatGPT atualizado.
2. Abra **Codex** na navegação do aplicativo.
3. Conecte o GitHub, caso ainda seja solicitado.
4. Selecione `drcarlosaraujocastro-ai/psychonautwiki-journal-ios`.
5. Use tarefas pequenas, por exemplo:

```text
Leia AGENTS.md e docs/RECONSTRUCTION_PROGRAM.md.
Audite o projeto sem alterar comportamento.
Crie uma branch e um draft PR corrigindo apenas os erros de compilação encontrados.
Execute os testes disponíveis e não faça merge.
```

6. Revise o resumo e o diff; não aprove alterações que removam migrações, importação ou licença.

## Etapa 2 — builds automáticos

Cada pull request deve acionar o workflow iOS.

No aplicativo GitHub:

1. abra o repositório;
2. entre no pull request;
3. abra **Checks**;
4. confirme que `Build iOS simulator` e `Tests` ficaram verdes;
5. em falha, copie o trecho vermelho do log para o Codex corrigir.

## Etapa 3 — Apple Developer

Só é necessária quando o app estiver compilando e os dados estiverem seguros.

1. aderir ao Apple Developer Program;
2. criar um registro do aplicativo no App Store Connect;
3. criar uma App Store Connect API key com a permissão mínima necessária;
4. baixar a chave `.p8` uma única vez e armazená-la com segurança;
5. conectar GitHub e App Store Connect ao Codemagic;
6. ativar assinatura automática;
7. enviar o primeiro build ao TestFlight.

Nunca cole chave `.p8`, issuer ID, key ID ou senha em issue, commit, chat público ou arquivo do repositório.

## Por que não Lovable/Base44

Essas plataformas podem ajudar a prototipar um painel web ou demonstrar layouts, mas não devem controlar o núcleo deste app. O projeto depende de recursos nativos:

- Core Data e migrações;
- SwiftUI;
- Live Activities;
- App Intents;
- LocalAuthentication;
- proteção de arquivos do iOS;
- assinatura e TestFlight.

O design pode ser prototipado fora; a implementação final deve permanecer SwiftUI nativa.

## Regra de comunicação

Você descreve o comportamento esperado em linguagem comum. O trabalho técnico deve responder sempre com:

- o que foi alterado;
- por que foi alterado;
- arquivos afetados;
- testes executados;
- riscos restantes;
- instrução exata para testar no iPhone.
