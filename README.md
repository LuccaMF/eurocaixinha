# EuroCaixinha

Site pessoal para controlar o salário mensal em euros, dividido em três categorias
(Essenciais, Não essenciais, Poupança e Investimento), com importação do extrato CSV do Revolut.

## Comandos

```bash
npm install     # instalar dependências
npm run dev     # abrir em modo de desenvolvimento (http://localhost:5173)
npm test        # correr os testes
npm run build   # gerar o site em dist/
```

## Estrutura

- `src/domain/` — regras do negócio, sem React: tipos, dinheiro em cêntimos, leitor do CSV do Revolut,
  sugestão de categorias, resumos do mês e da poupança. É aqui que estão os testes.
- `src/components/` — ecrãs e modais em React.
- `src/useAppState.ts` — guarda tudo no `localStorage` do navegador.

## Decisões

- Dinheiro guardado em cêntimos (inteiros) para evitar erros de vírgula flutuante.
- Os dados ficam só no navegador: é grátis e simples, mas não sincroniza entre aparelhos.
  Usa o backup em Definições.
- A poupança acumula entre meses: depósitos são gastos da categoria Poupança; retiradas têm motivo
  e devolvem o valor ao disponível do mês.
- Importação Revolut: os carregamentos (salário vindo de outro banco) não entram; entradas de terceiros
  podem entrar como reembolso; movimentos já importados são reconhecidos pela chave
  data de início + descrição + montante + nº de ocorrência.

## Segurança

- Os dados ficam encriptados no `localStorage` com AES-256-GCM. A chave deriva da palavra-passe
  (PBKDF2-SHA256, 600 000 iterações, sal aleatório). A palavra-passe nunca é guardada.
  Ver `src/domain/crypto.ts`.
- A app bloqueia-se após 5 minutos sem atividade e tem um botão "Bloquear".
- Os backups saem encriptados com a palavra-passe em uso no momento do backup.
- O build final tem uma Content Security Policy com `connect-src 'none'`: o site não consegue
  enviar dados para nenhum servidor. As fontes são servidas pelo próprio site.
- Esquecer a palavra-passe = perder os dados (não há recuperação). Faz backups.

O que o código não consegue resolver: extensões do navegador com acesso a todos os sites
(usa um perfil do navegador sem extensões), malware no computador, e o CSV do extrato que fica
na pasta de Transferências (apaga-o depois de importar).
