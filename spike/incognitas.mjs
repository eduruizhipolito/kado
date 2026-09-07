/**
 * Spike de testnet: resuelve las tres incognitas bloqueantes de docs/arquitectura.md.
 *
 *   1. CreateClaimableBalanceOp acepta como destination una clave publica cuya
 *      cuenta todavia no existe?
 *   2. Se pueden encadenar en UNA sola transaccion la creacion de la cuenta
 *      patrocinada, el ChangeTrust y el ClaimClaimableBalance?
 *   3. Con un activo distinto de XLM, cual es el orden exacto de operaciones?
 *      (control negativo: reclamar sin trustline debe fallar)
 *
 * Todo corre en testnet. No usa secretos del repositorio: las cuentas se crean
 * con friendbot en cada corrida y se descartan.
 *
 *   node spike/incognitas.mjs
 *
 * Salida: consola + spike/salida/incognitas.json con los hashes de transaccion.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const HORIZON = 'https://horizon-testnet.stellar.org';
const RED = Networks.TESTNET;
const EXPLORADOR = 'https://stellar.expert/explorer/testnet/tx';

const server = new Horizon.Server(HORIZON);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fee generoso por operacion. En testnet no importa y evita fallos por congestion. */
const FEE_POR_OP = String(Number(BASE_FEE) * 100);

const bitacora = {
  red: 'testnet',
  horizon: HORIZON,
  corrida: new Date().toISOString(),
  incognitas: {},
  cuentas: {},
  hashes: [],
};

// ---------------------------------------------------------------- utilidades

function titulo(texto) {
  console.log(`\n${'-'.repeat(72)}\n${texto}\n${'-'.repeat(72)}`);
}

function ok(texto) {
  console.log(`  [ok]    ${texto}`);
}

function info(texto) {
  console.log(`  ...     ${texto}`);
}

function fallo(texto) {
  console.log(`  [FALLO] ${texto}`);
}

/** Extrae los result_codes de Horizon, que es donde vive la causa real del error. */
function codigosDeError(error) {
  const extras = error?.response?.data?.extras;
  if (extras?.result_codes) return extras.result_codes;
  return { mensaje: error?.message ?? String(error) };
}

async function crearCuentaConFriendbot(etiqueta) {
  const kp = Keypair.random();
  const respuesta = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(kp.publicKey())}`,
  );
  if (!respuesta.ok) {
    throw new Error(`friendbot fallo para ${etiqueta}: ${respuesta.status} ${await respuesta.text()}`);
  }
  bitacora.cuentas[etiqueta] = kp.publicKey();
  ok(`${etiqueta}: ${kp.publicKey()}`);
  return kp;
}

async function existeCuenta(publicKey) {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (error) {
    if (error?.response?.status === 404) return false;
    throw error;
  }
}

/**
 * Construye, firma y envia. Devuelve la respuesta de Horizon y registra el hash.
 * `firmantes` va en orden; todas las firmas se aplican a la misma transaccion.
 */
async function enviar({ nombre, fuente, operaciones, firmantes }) {
  const cuentaFuente = await server.loadAccount(fuente.publicKey());
  const builder = new TransactionBuilder(cuentaFuente, {
    fee: FEE_POR_OP,
    networkPassphrase: RED,
  });
  for (const operacion of operaciones) builder.addOperation(operacion);
  const tx = builder.setTimeout(120).build();
  for (const firmante of firmantes) tx.sign(firmante);

  const respuesta = await server.submitTransaction(tx);
  bitacora.hashes.push({
    nombre,
    hash: respuesta.hash,
    operaciones: operaciones.length,
    explorador: `${EXPLORADOR}/${respuesta.hash}`,
  });
  ok(`${nombre} -> ${respuesta.hash}`);
  return respuesta;
}

/** Busca el claimable balance del que `publicKey` es reclamante. */
async function balanceDe(publicKey) {
  const { records } = await server.claimableBalances().claimant(publicKey).limit(1).call();
  if (records.length === 0) throw new Error(`no hay claimable balance para ${publicKey}`);
  return records[0];
}

// ------------------------------------------------------------------ el spike

async function main() {
  titulo('Preparacion: cuentas de testnet');
  // La patrocinadora hace de organizador: crea los Kados y paga todas las reservas.
  const patrocinadora = await crearCuentaConFriendbot('patrocinadora');
  // Emisora del activo de prueba, para la incognita 3.
  const emisora = await crearCuentaConFriendbot('emisora');

  const KDUSD = new Asset('KDUSD', emisora.publicKey());
  const expiracion = String(Math.floor(Date.now() / 1000) + 3600);

  // ===================================================================
  // Incognita 1
  // ===================================================================
  titulo('Incognita 1: destination de un claimable balance sin cuenta creada');

  // Este keypair se genera al armar la tanda. Su cuenta NO existe on-chain.
  const asistenteXlm = Keypair.random();
  bitacora.cuentas.asistenteXlm = asistenteXlm.publicKey();
  info(`asistente (cuenta inexistente): ${asistenteXlm.publicKey()}`);
  const existiaAntes = await existeCuenta(asistenteXlm.publicKey());
  info(`cuenta existe antes de crear el balance: ${existiaAntes}`);

  const claimantesXlm = [
    // El asistente puede abrir hasta la expiracion.
    new Claimant(asistenteXlm.publicKey(), Claimant.predicateBeforeAbsoluteTime(expiracion)),
    // El organizador recupera despues de la expiracion: la negacion del anterior.
    new Claimant(
      patrocinadora.publicKey(),
      Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(expiracion)),
    ),
  ];

  try {
    await enviar({
      nombre: 'i1-crear-balance-xlm-a-cuenta-inexistente',
      fuente: patrocinadora,
      firmantes: [patrocinadora],
      operaciones: [
        Operation.createClaimableBalance({
          asset: Asset.native(),
          amount: '2.0000000',
          claimants: claimantesXlm,
        }),
      ],
    });
    bitacora.incognitas.i1 = {
      pregunta:
        'CreateClaimableBalanceOp acepta como destination una clave publica cuya cuenta no existe?',
      respuesta: 'SI',
      nota: 'La cuenta del asistente no existia al crear el balance. Horizon acepto la operacion.',
    };
  } catch (error) {
    bitacora.incognitas.i1 = {
      pregunta:
        'CreateClaimableBalanceOp acepta como destination una clave publica cuya cuenta no existe?',
      respuesta: 'NO',
      error: codigosDeError(error),
    };
    fallo(JSON.stringify(codigosDeError(error)));
    throw error; // Si esto falla, la arquitectura entera cambia. Parar aca.
  }

  const balanceXlm = await balanceDe(asistenteXlm.publicKey());
  info(`balance id: ${balanceXlm.id}`);
  info(`monto: ${balanceXlm.amount} ${balanceXlm.asset}`);

  // ===================================================================
  // Incognita 2
  // ===================================================================
  titulo('Incognita 2: crear cuenta patrocinada + abrir, en UNA transaccion (XLM)');

  // Fuente de la transaccion: la patrocinadora. El asistente no tiene XLM,
  // asi que no puede ser fuente ni pagar el fee.
  try {
    await enviar({
      nombre: 'i2-cuenta-patrocinada-y-apertura-xlm',
      fuente: patrocinadora,
      firmantes: [patrocinadora, asistenteXlm],
      operaciones: [
        Operation.beginSponsoringFutureReserves({
          sponsoredId: asistenteXlm.publicKey(),
          source: patrocinadora.publicKey(),
        }),
        Operation.createAccount({
          destination: asistenteXlm.publicKey(),
          startingBalance: '0', // Solo valido porque esta patrocinada (CAP-33).
          source: patrocinadora.publicKey(),
        }),
        Operation.endSponsoringFutureReserves({
          source: asistenteXlm.publicKey(),
        }),
        Operation.claimClaimableBalance({
          balanceId: balanceXlm.id,
          source: asistenteXlm.publicKey(),
        }),
      ],
    });

    const cuenta = await server.loadAccount(asistenteXlm.publicKey());
    const saldoXlm = cuenta.balances.find((b) => b.asset_type === 'native');
    ok(`cuenta creada, saldo XLM: ${saldoXlm?.balance}`);
    bitacora.incognitas.i2 = {
      pregunta:
        'Se pueden encadenar creacion de cuenta patrocinada y ClaimClaimableBalance en una sola transaccion?',
      respuesta: 'SI',
      operaciones: [
        'beginSponsoringFutureReserves (fuente: patrocinadora)',
        'createAccount startingBalance=0 (fuente: patrocinadora)',
        'endSponsoringFutureReserves (fuente: asistente)',
        'claimClaimableBalance (fuente: asistente)',
      ],
      firmas: 'patrocinadora + asistente',
      saldoFinalXlm: saldoXlm?.balance,
      nota: 'Con XLM no hace falta ChangeTrust. La apertura es un solo boton.',
    };
  } catch (error) {
    bitacora.incognitas.i2 = { respuesta: 'NO', error: codigosDeError(error) };
    fallo(JSON.stringify(codigosDeError(error)));
    throw error;
  }

  // ===================================================================
  // Incognita 3
  // ===================================================================
  titulo('Incognita 3: activo distinto de XLM, orden exacto con ChangeTrust');

  info('la patrocinadora abre trustline a KDUSD y la emisora le paga');
  await enviar({
    nombre: 'i3-preparar-activo-kdusd',
    fuente: patrocinadora,
    firmantes: [patrocinadora, emisora],
    operaciones: [
      Operation.changeTrust({ asset: KDUSD, source: patrocinadora.publicKey() }),
      Operation.payment({
        destination: patrocinadora.publicKey(),
        asset: KDUSD,
        amount: '100',
        source: emisora.publicKey(),
      }),
    ],
  });

  const asistenteKdusd = Keypair.random();
  bitacora.cuentas.asistenteKdusd = asistenteKdusd.publicKey();
  info(`asistente KDUSD (cuenta inexistente): ${asistenteKdusd.publicKey()}`);

  await enviar({
    nombre: 'i3-crear-balance-kdusd-a-cuenta-inexistente',
    fuente: patrocinadora,
    firmantes: [patrocinadora],
    operaciones: [
      Operation.createClaimableBalance({
        asset: KDUSD,
        amount: '2.0000000',
        claimants: [
          new Claimant(asistenteKdusd.publicKey(), Claimant.predicateBeforeAbsoluteTime(expiracion)),
          new Claimant(
            patrocinadora.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(expiracion)),
          ),
        ],
      }),
    ],
  });

  const balanceKdusd = await balanceDe(asistenteKdusd.publicKey());
  info(`balance id: ${balanceKdusd.id}`);

  // --- Control negativo: reclamar sin trustline debe fallar. --------------
  info('control negativo: intentar abrir SIN ChangeTrust');
  let controlNegativo;
  try {
    await enviar({
      nombre: 'i3-control-negativo-sin-trustline',
      fuente: patrocinadora,
      firmantes: [patrocinadora, asistenteKdusd],
      operaciones: [
        Operation.beginSponsoringFutureReserves({
          sponsoredId: asistenteKdusd.publicKey(),
          source: patrocinadora.publicKey(),
        }),
        Operation.createAccount({
          destination: asistenteKdusd.publicKey(),
          startingBalance: '0',
          source: patrocinadora.publicKey(),
        }),
        Operation.endSponsoringFutureReserves({ source: asistenteKdusd.publicKey() }),
        Operation.claimClaimableBalance({
          balanceId: balanceKdusd.id,
          source: asistenteKdusd.publicKey(),
        }),
      ],
    });
    controlNegativo = { fallo: false, nota: 'INESPERADO: el reclamo sin trustline fue aceptado.' };
    fallo('el control negativo NO fallo; revisar el supuesto');
  } catch (error) {
    controlNegativo = { fallo: true, codigos: codigosDeError(error) };
    ok(`fallo como se esperaba: ${JSON.stringify(codigosDeError(error))}`);
  }

  // La transaccion anterior fallo entera, asi que la cuenta sigue sin existir.
  const existeTrasControl = await existeCuenta(asistenteKdusd.publicKey());
  info(`cuenta del asistente KDUSD existe tras el fallo: ${existeTrasControl}`);

  // --- Orden correcto ------------------------------------------------------
  info('orden correcto: begin / createAccount / changeTrust / end / claim');
  try {
    await enviar({
      nombre: 'i3-cuenta-patrocinada-changetrust-y-apertura-kdusd',
      fuente: patrocinadora,
      firmantes: [patrocinadora, asistenteKdusd],
      operaciones: [
        Operation.beginSponsoringFutureReserves({
          sponsoredId: asistenteKdusd.publicKey(),
          source: patrocinadora.publicKey(),
        }),
        Operation.createAccount({
          destination: asistenteKdusd.publicKey(),
          startingBalance: '0',
          source: patrocinadora.publicKey(),
        }),
        // Dentro del sandwich, asi la reserva de la trustline la paga la patrocinadora.
        Operation.changeTrust({ asset: KDUSD, source: asistenteKdusd.publicKey() }),
        Operation.endSponsoringFutureReserves({ source: asistenteKdusd.publicKey() }),
        Operation.claimClaimableBalance({
          balanceId: balanceKdusd.id,
          source: asistenteKdusd.publicKey(),
        }),
      ],
    });

    const cuenta = await server.loadAccount(asistenteKdusd.publicKey());
    const saldoKdusd = cuenta.balances.find((b) => b.asset_code === 'KDUSD');
    const saldoNativo = cuenta.balances.find((b) => b.asset_type === 'native');
    ok(`saldo KDUSD: ${saldoKdusd?.balance}, saldo XLM: ${saldoNativo?.balance}`);
    ok(`patrocinador de reservas: ${cuenta.sponsor ?? '(ninguno)'}`);
    ok(`reservas patrocinadas: ${cuenta.num_sponsored}`);

    bitacora.incognitas.i3 = {
      pregunta: 'Con un activo distinto de XLM, cual es el orden exacto de operaciones?',
      respuesta: 'ChangeTrust va DENTRO del sandwich de patrocinio, antes del claim',
      ordenCorrecto: [
        'beginSponsoringFutureReserves (fuente: patrocinadora, sponsoredId: asistente)',
        'createAccount startingBalance=0 (fuente: patrocinadora)',
        'changeTrust (fuente: asistente)',
        'endSponsoringFutureReserves (fuente: asistente)',
        'claimClaimableBalance (fuente: asistente)',
      ],
      controlNegativoSinTrustline: controlNegativo,
      saldoFinalKdusd: saldoKdusd?.balance,
      saldoFinalXlm: saldoNativo?.balance,
      patrocinadorDeReservas: cuenta.sponsor ?? null,
      reservasPatrocinadas: cuenta.num_sponsored,
    };
  } catch (error) {
    bitacora.incognitas.i3 = { respuesta: 'FALLO', error: codigosDeError(error) };
    fallo(JSON.stringify(codigosDeError(error)));
    throw error;
  }

  // ===================================================================
  // Costo para la patrocinadora
  // ===================================================================
  titulo('Costo para la cuenta patrocinadora');
  const cuentaPatrocinadora = await server.loadAccount(patrocinadora.publicKey());
  const saldoFinal = cuentaPatrocinadora.balances.find((b) => b.asset_type === 'native')?.balance;
  info(`saldo XLM final (empezo en 10000): ${saldoFinal}`);
  info(`reservas que patrocina: ${cuentaPatrocinadora.num_sponsoring}`);
  bitacora.costoPatrocinadora = {
    saldoInicialXlm: '10000.0000000',
    saldoFinalXlm: saldoFinal,
    reservasPatrocinadas: cuentaPatrocinadora.num_sponsoring,
  };
}

// ------------------------------------------------------------------- salida

try {
  await main();
  titulo('Resultado');
  for (const [clave, valor] of Object.entries(bitacora.incognitas)) {
    console.log(`  ${clave}: ${valor.respuesta}`);
  }
  console.log('\n  Hashes:');
  for (const h of bitacora.hashes) console.log(`    ${h.nombre}\n      ${h.explorador}`);
  bitacora.estado = 'ok';
} catch (error) {
  bitacora.estado = 'error';
  bitacora.error = codigosDeError(error);
  console.error('\nEl spike se detuvo:', error?.message ?? error);
} finally {
  mkdirSync(join(raiz, 'spike/salida'), { recursive: true });
  const destino = join(raiz, 'spike/salida/incognitas.json');
  writeFileSync(destino, `${JSON.stringify(bitacora, null, 2)}\n`);
  console.log(`\n  Bitacora: ${destino}`);
  process.exit(bitacora.estado === 'ok' ? 0 : 1);
}
