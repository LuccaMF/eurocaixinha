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
