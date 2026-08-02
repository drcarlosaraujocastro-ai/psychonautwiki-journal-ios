# Instalar o Psychonaut Journal no iPhone pelo Windows

Este repositório consegue compilar o app iOS em um runner macOS do GitHub Actions. O Windows é usado apenas para instalar/configurar o SideStore inicialmente; não é necessário Xcode local.

## O que o repositório faz automaticamente

Depois que o workflow `SideStore Release` roda no `main`:

1. O GitHub Actions usa macOS + Xcode.
2. O projeto recebe a identidade de sideload definida em `scripts/rebrand_project.sh`.
3. O app é compilado para `generic/platform=iOS` sem assinatura.
4. O `.app` é empacotado como `PsychonautJournal.ipa`.
5. O arquivo é publicado na release estável `sideload-latest`.
6. O SideStore baixa esse arquivo remoto e faz a assinatura local com a Apple Account configurada no aparelho.

A URL do IPA permanece estável mesmo quando o build é substituído:

```text
https://github.com/drcarlosaraujocastro-ai/psychonautwiki-journal-ios/releases/download/sideload-latest/PsychonautJournal.ipa
```

## Instalação inicial do SideStore no Windows

Siga a documentação oficial do SideStore para instalar o SideStore no iPhone e configurar o LocalDevVPN. Depois da instalação inicial, o refresh pode ser feito no próprio aparelho.

Requisitos usuais:

- Windows 10/11
- iPhone com modo de desenvolvedor disponível
- Apple Account para free provisioning
- SideStore
- LocalDevVPN

## Instalar o Psychonaut Journal sem manipular o IPA

Com o SideStore já instalado, abra no iPhone este URL de instalação:

```text
sidestore://install?url=https%3A%2F%2Fgithub.com%2Fdrcarlosaraujocastro-ai%2Fpsychonautwiki-journal-ios%2Freleases%2Fdownload%2Fsideload-latest%2FPsychonautJournal.ipa
```

O SideStore deve abrir e baixar o IPA remoto diretamente. Você não precisa descompactar, editar ou assinar o arquivo manualmente.

Se o iOS não transformar o texto acima em link, copie a linha inteira e cole na barra de endereços do Safari.

## Atualizações

O workflow mantém o mesmo endereço de download. Quando uma nova versão for publicada:

1. abra novamente o URL `sidestore://install?...` acima; ou
2. reinstale/atualize pelo SideStore usando o mesmo endereço remoto.

A assinatura gratuita da Apple continua sujeita às regras do free provisioning (por exemplo, refresh periódico). O workflow resolve a compilação; o SideStore resolve a assinatura e a instalação no aparelho.

## Compilar manualmente no GitHub

Depois que o workflow estiver no branch padrão:

1. Abra **Actions** no repositório.
2. Escolha **SideStore Release**.
3. Use **Run workflow**.
4. Ao terminar, a release `sideload-latest` será criada ou atualizada.

Em pull requests o mesmo workflow compila e envia o IPA como artifact para validação, mas não altera a release pública.

## Diagnóstico

Se o build falhar, baixe o artifact/log `sidestore-device-build.log` no run correspondente. O workflow também mostra versão, build e Bundle ID no Summary do GitHub Actions.
