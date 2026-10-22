/** Ícone de sentido do dinheiro: + verde quando entra, − vermelho quando sai. */
export function FlowIcon({ incoming }: { incoming: boolean }) {
  return (
    <span className={`flow ${incoming ? 'in' : 'out'}`} role="img" aria-label={incoming ? 'Entrada' : 'Saída'}>
      {incoming ? '+' : '−'}
    </span>
  )
}

/** Valor com o ícone de sentido. O valor aparece sempre sem sinal; o sentido vem do ícone. */
export function Amount({ cents, incoming, format }: { cents: number; incoming: boolean; format: (c: number) => string }) {
  return (
    <b className="num amount">
      <FlowIcon incoming={incoming} />
      {format(Math.abs(cents))}
    </b>
  )
}
