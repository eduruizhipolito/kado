/**
 * Formato de montos. El asistente ve dolares; los XLM son el vehiculo y van en
 * letra chica. La equivalencia se fija al generar la tanda, nunca al abrir: si
 * se consultara el precio en vivo, dos personas de la misma sala verian montos
 * distintos por el mismo regalo.
 */

/** Stellar maneja siete decimales. */
export const DECIMALES = 7;

export function aDolares(valorUsd: string | null): string | null {
  if (!valorUsd) return null;
  const numero = Number(valorUsd);
  if (!Number.isFinite(numero)) return null;
  // Se arma a mano: el formato de moneda de es-PE escribe "USD 2.00", y en la
  // pantalla del asistente tiene que decir "$2.00". En Peru el simbolo de la
  // moneda local es S/, asi que $ se lee como dolar sin ambiguedad.
  const conSeparadores = numero.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${conSeparadores}`;
}

/** `6.1000000` -> `6,1 XLM`. Sin ceros de relleno, que solo hacen ruido. */
export function aUnidades(monto: string, codigo: string): string {
  const numero = Number(monto);
  if (!Number.isFinite(numero)) return `${monto} ${codigo}`;
  const texto = numero.toLocaleString('es-PE', { maximumFractionDigits: 4 });
  return `${texto} ${codigo}`;
}

/**
 * Suma dos montos on-chain. Va por enteros de siete decimales y no por punto
 * flotante: `0.1 + 0.2` en coma flotante no da `0.3`, y este resultado se manda
 * como el `amount` de una operacion de pago, donde un digito de mas es un error
 * de Horizon en plena sala.
 */
export function sumarMontos(a: string, b: string): string {
  const base = 10n ** BigInt(DECIMALES);
  const total = aEnteros(a, base) + aEnteros(b, base);
  return `${total / base}.${(total % base).toString().padStart(DECIMALES, '0')}`;
}

function aEnteros(monto: string, base: bigint): bigint {
  const [entera, decimal = ''] = monto.split('.');
  const relleno = (decimal + '0'.repeat(DECIMALES)).slice(0, DECIMALES);
  return BigInt(entera || '0') * base + BigInt(relleno);
}

/** Convierte un valor en dolares a unidades del activo, con siete decimales. */
export function dolaresAUnidades(valorUsd: number, tasaUsdPorUnidad: number): string {
  if (tasaUsdPorUnidad <= 0) throw new Error('La tasa tiene que ser mayor que cero');
  return (valorUsd / tasaUsdPorUnidad).toFixed(DECIMALES);
}

/**
 * `2026-09-20` -> `20 de setiembre`.
 *
 * Una fecha suelta se parsea como medianoche UTC, que en Lima es el dia
 * anterior. Se arma con los componentes en hora local para que la fecha del
 * evento sea la que el organizador escribio.
 */
export function aFechaCorta(fecha: string): string {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const cuando = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(fecha);
  return cuando.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
}
