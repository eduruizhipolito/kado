import { conReintento, patrocinadora, servidor } from './stellar';
import { leerTandas, type Tanda } from './tanda';

/**
 * Las métricas salen enteras de la cadena. No hay base de datos que pueda
 * discrepar del ledger, y cualquiera sin conocimiento técnico puede comprobar
 * cualquier número abriendo el explorador.
 */

export type MetricasTanda = {
  tanda: Tanda;
  generados: number;
  abiertos: number;
  tasaApertura: number;
  /** Mediana de minutos entre generar la tanda y abrir el Kadó. Null si nadie abrió. */
  medianaMinutos: number | null;
  vencida: boolean;
};

export type Panel = {
  tandas: MetricasTanda[];
  generados: number;
  abiertos: number;
  tasaApertura: number;
  medianaMinutos: number | null;
  patrocinadora: { cuenta: string; saldoXlm: string; reservas: number; alerta: boolean };
};

/**
 * Umbral de alerta de la cuenta patrocinadora. Si se queda sin XLM se rompen
 * TODAS las aperturas a la vez, así que el panel tiene que gritarlo antes del
 * evento y no durante.
 */
const XLM_MINIMO_SIN_ALERTA = 50;

/** Cuántas cuentas se consultan a la vez sin castigar el límite de Horizon. */
const CONCURRENCIA = 8;

/**
 * Momento exacto en que se abrió un Kadó: el `created_at` de su operación
 * `claim_claimable_balance`.
 *
 * La tentación era usar `last_modified_time` de la cuenta, que sale gratis en la
 * misma consulta que lista los asistentes. Es correcto sólo mientras la persona
 * no vuelva a tocar su cuenta, y deja de serlo apenas lo haga: medido sobre una
 * cuenta real, la última modificación decía 17:30 cuando la apertura había sido
 * a las 17:21. La métrica se corrompe justo cuando el producto empieza a
 * funcionar, y es una de las métricas del piloto.
 *
 * Las primeras operaciones de la cuenta son la creación del claimable balance
 * (que la nombra como reclamante, con fecha de generación de la tanda) y después
 * las cuatro de la apertura. Con veinte alcanza de sobra.
 */
async function momentoDeApertura(cuenta: string): Promise<Date | null> {
  const { records } = await conReintento(() =>
    servidor.operations().forAccount(cuenta).order('asc').limit(20).call(),
  );
  const reclamo = records.find((op) => op.type === 'claim_claimable_balance');
  return reclamo ? new Date(reclamo.created_at) : null;
}

/** Todas las cuentas de asistente que patrocina el organizador, con cuándo se abrieron. */
async function aperturasPorCuenta(sponsor: string): Promise<Map<string, Date>> {
  const cuentas: { id: string; ultimaModificacion: Date }[] = [];

  let pagina = await conReintento(() => servidor.accounts().sponsor(sponsor).limit(200).call());
  while (pagina.records.length > 0) {
    for (const cuenta of pagina.records) {
      cuentas.push({ id: cuenta.account_id, ultimaModificacion: new Date(cuenta.last_modified_time) });
    }
    pagina = await conReintento(() => pagina.next());
  }

  const aperturas = new Map<string, Date>();

  for (let i = 0; i < cuentas.length; i += CONCURRENCIA) {
    const lote = cuentas.slice(i, i + CONCURRENCIA);
    const momentos = await Promise.all(
      lote.map(async (cuenta) => {
        try {
          return await momentoDeApertura(cuenta.id);
        } catch {
          // Si Horizon no responde para una cuenta, el panel entero no se cae:
          // vuelve al proxy y sigue. Es peor perder la fila que perder precisión.
          return null;
        }
      }),
    );
    lote.forEach((cuenta, j) => {
      aperturas.set(cuenta.id, momentos[j] ?? cuenta.ultimaModificacion);
    });
  }

  return aperturas;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[medio - 1] + ordenados[medio]) / 2
    : ordenados[medio];
}

export async function leerPanel(): Promise<Panel> {
  const organizador = patrocinadora().publicKey();

  const [cuenta, aperturas] = await Promise.all([
    conReintento(() => servidor.loadAccount(organizador)),
    aperturasPorCuenta(organizador),
  ]);

  const ahora = Date.now();
  const tandas: MetricasTanda[] = leerTandas().map((tanda) => {
    const generada = new Date(tanda.generadaEn).getTime();

    const minutos: number[] = [];
    let abiertos = 0;
    for (const kado of tanda.kados) {
      const cuando = aperturas.get(kado.publicKey);
      if (!cuando) continue;
      abiertos += 1;
      minutos.push((cuando.getTime() - generada) / 60000);
    }

    return {
      tanda,
      generados: tanda.kados.length,
      abiertos,
      tasaApertura: tanda.kados.length === 0 ? 0 : abiertos / tanda.kados.length,
      medianaMinutos: mediana(minutos),
      vencida: new Date(tanda.expiraEn).getTime() <= ahora,
    };
  });

  const generados = tandas.reduce((suma, t) => suma + t.generados, 0);
  const abiertos = tandas.reduce((suma, t) => suma + t.abiertos, 0);
  const todasLasMedianas = tandas
    .map((t) => t.medianaMinutos)
    .filter((m): m is number => m !== null);

  const saldoXlm = cuenta.balances.find((b) => b.asset_type === 'native')?.balance ?? '0';

  return {
    tandas,
    generados,
    abiertos,
    tasaApertura: generados === 0 ? 0 : abiertos / generados,
    medianaMinutos: mediana(todasLasMedianas),
    patrocinadora: {
      cuenta: organizador,
      saldoXlm,
      reservas: cuenta.num_sponsoring,
      alerta: Number(saldoXlm) < XLM_MINIMO_SIN_ALERTA,
    },
  };
}
