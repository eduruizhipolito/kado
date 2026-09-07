import {
  Asset,
  Claimant,
  Horizon,
  Keypair,
  Operation,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import {
  EXPLORADOR,
  FEE_POR_OPERACION,
  HORIZON,
  PASSPHRASE,
  secretaPatrocinadora,
} from './config';

export const servidor = new Horizon.Server(HORIZON);

export const patrocinadora = (): Keypair => Keypair.fromSecret(secretaPatrocinadora());

/**
 * Reintenta una LECTURA de Horizon con espera exponencial.
 *
 * Cuarenta personas abriendo su Kado en el mismo minuto son cuarenta rondas de
 * consultas contra Horizon desde la misma IP de Vercel. El limite de peticiones
 * se alcanza justo cuando la sala esta llena, que es el unico momento en que
 * importa.
 *
 * Solo para lecturas. El envio de transacciones NUNCA se reintenta a ciegas: si
 * la respuesta se pierde puede que la transaccion si haya entrado, y de eso se
 * ocupa la relectura de estado en la ruta de apertura.
 */
export async function conReintento<T>(leer: () => Promise<T>, intentos = 4): Promise<T> {
  let ultimo: unknown;

  for (let intento = 0; intento < intentos; intento++) {
    try {
      return await leer();
    } catch (error) {
      ultimo = error;
      const estado = (error as { response?: { status?: number } })?.response?.status;
      const vaARecuperarse = estado === 429 || estado === undefined || (estado >= 500 && estado < 600);
      if (!vaARecuperarse || intento === intentos - 1) throw error;

      // 200 ms, 400 ms, 800 ms, mas una pizca de azar para que los reintentos de
      // toda la sala no vuelvan a caer todos juntos.
      const espera = 200 * 2 ** intento + Math.random() * 100;
      await new Promise((seguir) => setTimeout(seguir, espera));
    }
  }

  throw ultimo;
}

export const enlaceExplorador = (hash: string) => `${EXPLORADOR}/tx/${hash}`;

/**
 * Enlace a la cuenta del asistente en el explorador.
 *
 * Es lo que se le muestra como comprobante, y no la transaccion. La pagina de
 * la transaccion lista las operaciones, y las operaciones de una apertura dicen
 * "created account with starting balance 0 XLM" y "claimed balance 0000...":
 * el monto entregado esta ahi como efecto, no como operacion, asi que el unico
 * numero que ve una persona no tecnica es un cero.
 *
 * La pagina de la cuenta muestra el saldo en grande, su equivalente en dolares
 * y quien la creo. Cumple el criterio 2 de docs/producto.md, que la de la
 * transaccion incumplia.
 */
export const enlaceCuenta = (publicKey: string) => `${EXPLORADOR}/account/${publicKey}`;

/** Un Kado en XLM usa el activo nativo. USDC entra en una fase posterior. */
export function activoDesde(codigo: string | null, emisor: string | null): Asset {
  if (!codigo || codigo === 'XLM') return Asset.native();
  if (!emisor) throw new Error(`El activo ${codigo} necesita un emisor`);
  return new Asset(codigo, emisor);
}

// ------------------------------------------------------------------- lectura

export type EstadoKado =
  | { estado: 'inexistente' }
  | { estado: 'disponible'; balanceId: string; monto: string; activo: string; expiraEn: Date | null }
  | { estado: 'vencido'; balanceId: string; expiraEn: Date }
  | { estado: 'abierto'; cuenta: string; saldos: { activo: string; monto: string }[] };

async function cuentaExiste(publicKey: string): Promise<Horizon.AccountResponse | null> {
  try {
    return await conReintento(() => servidor.loadAccount(publicKey));
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
    throw error;
  }
}

/** Lee de la predicate del reclamante la fecha limite para abrir. */
function expiracionDe(balance: Horizon.ServerApi.ClaimableBalanceRecord, quien: string): Date | null {
  const claimant = balance.claimants.find((c) => c.destination === quien);
  const absBefore = (claimant?.predicate as { abs_before?: string } | undefined)?.abs_before;
  return absBefore ? new Date(absBefore) : null;
}

/**
 * Determina el estado de un Kado consultando solo Horizon.
 *
 * La distincion entre "abierto" e "inexistente" sale de que abrir un Kado
 * consume el claimable balance y deja la cuenta del asistente creada. Si no hay
 * balance pero si hay cuenta, se abrio. Si no hay ninguna de las dos, el codigo
 * nunca existio.
 */
export async function leerEstado(publicKeyDelKado: string): Promise<EstadoKado> {
  const { records } = await conReintento(() =>
    servidor.claimableBalances().claimant(publicKeyDelKado).limit(1).call(),
  );

  const balance = records[0];

  if (!balance) {
    const cuenta = await cuentaExiste(publicKeyDelKado);
    if (!cuenta) return { estado: 'inexistente' };
    return {
      estado: 'abierto',
      cuenta: publicKeyDelKado,
      saldos: cuenta.balances
        .filter((b) => 'balance' in b)
        .map((b) => ({
          activo: b.asset_type === 'native' ? 'XLM' : (b as { asset_code: string }).asset_code,
          monto: b.balance,
        })),
    };
  }

  const expiraEn = expiracionDe(balance, publicKeyDelKado);
  if (expiraEn && expiraEn.getTime() <= Date.now()) {
    return { estado: 'vencido', balanceId: balance.id, expiraEn };
  }

  return {
    estado: 'disponible',
    balanceId: balance.id,
    monto: balance.amount,
    activo: balance.asset === 'native' ? 'XLM' : balance.asset.split(':')[0],
    expiraEn,
  };
}

/**
 * Valida una cuenta como destino para acumular, y devuelve su saldo actual del
 * activo.
 *
 * Se exige que la patrocinadora sea su sponsor, y no solo que la cuenta exista:
 * de lo contrario la ruta de apertura seria un rail de pagos gratuito hacia
 * cualquier direccion de Stellar que alguien quisiera nombrar. Solo las cuentas
 * que este organizador creo al abrir un Kado pueden recibir otro.
 *
 * Devuelve `null` cuando el destino no sirve, y nunca lanza por eso: la
 * apertura tiene que seguir su curso y dejar los fondos en la cuenta del propio
 * codigo. Perder la acumulacion es recuperable; perder el Kado no.
 */
export async function cuentaDelPiloto(
  publicKey: string,
  activo: Asset,
): Promise<{ saldo: string } | null> {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) return null;

  const cuenta = await cuentaExiste(publicKey);
  if (!cuenta) return null;
  if (cuenta.sponsor !== patrocinadora().publicKey()) return null;

  // Con un activo emitido, que exista la linea de confianza es parte de la
  // validacion: sin ella el pago falla y se lleva puesta toda la transaccion.
  const saldo = cuenta.balances.find((b) =>
    activo.isNative()
      ? b.asset_type === 'native'
      : 'asset_code' in b &&
        b.asset_code === activo.getCode() &&
        b.asset_issuer === activo.getIssuer(),
  );
  if (!saldo || !('balance' in saldo)) return null;

  return { saldo: saldo.balance };
}

// ---------------------------------------------------------------- generacion

export type KadoGenerado = { publicKey: string; balanceId: string };

/**
 * Crea los claimable balances de una tanda, en lotes de una transaccion cada uno.
 *
 * Cada Kado tiene dos reclamantes: el asistente hasta la expiracion, y el
 * organizador despues de ella, que es como los Kados no abiertos vuelven solos.
 */
export async function crearKados(opciones: {
  publicKeys: string[];
  activo: Asset;
  monto: string;
  expiraEn: Date;
  porTransaccion?: number;
  alAvanzar?: (hechos: number, total: number, hash: string) => void;
}): Promise<{ kados: KadoGenerado[]; hashes: string[] }> {
  const { publicKeys, activo, monto, expiraEn } = opciones;
  // Stellar admite 100 operaciones por transaccion; 50 deja margen holgado.
  const porTransaccion = opciones.porTransaccion ?? 50;

  const organizador = patrocinadora();
  const limite = String(Math.floor(expiraEn.getTime() / 1000));
  const antesDeVencer = Claimant.predicateBeforeAbsoluteTime(limite);

  const kados: KadoGenerado[] = [];
  const hashes: string[] = [];

  for (let inicio = 0; inicio < publicKeys.length; inicio += porTransaccion) {
    const lote = publicKeys.slice(inicio, inicio + porTransaccion);

    // Se recarga la cuenta en cada lote para tomar el numero de secuencia actual.
    const fuente = await conReintento(() => servidor.loadAccount(organizador.publicKey()));
    const builder = new TransactionBuilder(fuente, {
      fee: FEE_POR_OPERACION,
      networkPassphrase: PASSPHRASE,
    });

    for (const publicKey of lote) {
      builder.addOperation(
        Operation.createClaimableBalance({
          asset: activo,
          amount: monto,
          claimants: [
            new Claimant(publicKey, antesDeVencer),
            new Claimant(organizador.publicKey(), Claimant.predicateNot(antesDeVencer)),
          ],
        }),
      );
    }

    const tx = builder.setTimeout(180).build();

    // El balance id es deterministico: sale de la cuenta fuente, el numero de
    // secuencia y el indice de la operacion. Se calcula ANTES de enviar, asi que
    // la tanda queda registrada aunque se pierda la respuesta de Horizon.
    const ids = lote.map((_, i) => tx.getClaimableBalanceId(i));

    tx.sign(organizador);
    const respuesta = await servidor.submitTransaction(tx);

    lote.forEach((publicKey, i) => kados.push({ publicKey, balanceId: ids[i] }));
    hashes.push(respuesta.hash);
    opciones.alAvanzar?.(kados.length, publicKeys.length, respuesta.hash);
  }

  return { kados, hashes };
}

// ------------------------------------------------------------------ apertura

export type Apertura = { hash: string; enlace: string };

/**
 * Abre un Kado en UNA sola transaccion: crea la cuenta del asistente con
 * reservas patrocinadas y reclama el balance. Verificado en testnet, ver
 * docs/arquitectura.md.
 *
 * La transaccion es atomica, asi que reintentar es seguro: o pasa todo o no
 * pasa nada. No existe el estado intermedio de cuenta creada sin Kado abierto.
 *
 * Con `destino`, el Kado se acumula: se abre igual, y en la misma transaccion
 * los fondos pasan a la cuenta que la persona ya tenia. La cuenta de este
 * codigo queda creada y en cero, que es exactamente el estado `yaAbierto`, asi
 * que volver a su enlace mas tarde dice la verdad. No se hace `accountMerge`
 * porque borrarla convertiria ese enlace en "este codigo no existe".
 */
export async function abrirKado(opciones: {
  kado: Keypair;
  balanceId: string;
  activo: Asset;
  /** Monto del Kado. Solo hace falta para acumular. */
  monto?: string;
  /** Cuenta de la persona, si ya abrio un Kado antes. */
  destino?: string;
}): Promise<Apertura> {
  const { kado, balanceId, activo, monto, destino } = opciones;
  const organizador = patrocinadora();

  // La transaccion la paga la patrocinadora: el asistente no tiene XLM.
  const fuente = await conReintento(() => servidor.loadAccount(organizador.publicKey()));
  const builder = new TransactionBuilder(fuente, {
    fee: FEE_POR_OPERACION,
    networkPassphrase: PASSPHRASE,
  });

  builder.addOperation(
    Operation.beginSponsoringFutureReserves({
      sponsoredId: kado.publicKey(),
      source: organizador.publicKey(),
    }),
  );
  builder.addOperation(
    Operation.createAccount({
      destination: kado.publicKey(),
      // Solo es valido porque la cuenta va patrocinada (CAP-33).
      startingBalance: '0',
      source: organizador.publicKey(),
    }),
  );
  if (!activo.isNative()) {
    // Dentro del sandwich de patrocinio: si fuera despues, la reserva de la
    // trustline la tendria que pagar el asistente, que tiene cero.
    builder.addOperation(Operation.changeTrust({ asset: activo, source: kado.publicKey() }));
  }
  builder.addOperation(Operation.endSponsoringFutureReserves({ source: kado.publicKey() }));
  builder.addOperation(Operation.claimClaimableBalance({ balanceId, source: kado.publicKey() }));

  // El pago va dentro de la misma transaccion, no en una segunda: si fueran dos
  // podria quedar el Kado abierto y los fondos varados en una cuenta cuyo
  // codigo ya se muestra como usado. El fee lo paga la patrocinadora, que es la
  // fuente, y la cuenta puede quedar en cero porque su reserva esta patrocinada.
  if (destino && monto) {
    builder.addOperation(
      Operation.payment({
        destination: destino,
        asset: activo,
        amount: monto,
        source: kado.publicKey(),
      }),
    );
  }

  const tx = builder.setTimeout(180).build();
  tx.sign(organizador, kado);

  const respuesta = await servidor.submitTransaction(tx);
  return { hash: respuesta.hash, enlace: enlaceExplorador(respuesta.hash) };
}

/** Los `result_codes` de Horizon, que es donde vive la causa real de un fallo. */
export function codigosDeError(error: unknown): Record<string, unknown> {
  const extras = (error as { response?: { data?: { extras?: { result_codes?: unknown } } } })
    ?.response?.data?.extras;
  if (extras?.result_codes) return extras.result_codes as Record<string, unknown>;
  return { mensaje: (error as Error)?.message ?? String(error) };
}
