/**
 * Genera una tanda de Kados para un evento.
 *
 *   npx tsx --env-file-if-exists=.env scripts/generar-tanda.ts \
 *     --evento "Meetup Stellar Lima #7" \
 *     --fecha 2026-09-20 \
 *     --cantidad 40 \
 *     --usd 2 --tasa 0.1855 \
 *     --vence-en 14
 *
 * Esa forma funciona igual en PowerShell, cmd y bash. `npm run generar-tanda --`
 * solo funciona en bash: PowerShell se traga el `--` y las banderas se pierden.
 *
 * --tasa es el precio de mercado en dolares por XLM al momento de generar. Se
 * congela en la tanda: si se consultara en vivo, dos personas de la misma sala
 * verian montos distintos por el mismo regalo.
 *
 * Alternativamente, en vez de --usd y --tasa se puede fijar el monto directo
 * con --xlm 10.78, y entonces el Kado no muestra equivalencia en dolares.
 *
 * Produce dos archivos:
 *
 *   tandas/<id>.json          manifiesto publico, se versiona
 *   tandas/<id>.codigos.csv   los codigos para imprimir, NUNCA se versiona
 *
 * El CSV es el material sensible: quien tiene un codigo abre ese Kado.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { RED } from '@/lib/config';
import { formatearCodigo, generarCodigo, keypairDesdeCodigo } from '@/lib/codigo';
import { dolaresAUnidades } from '@/lib/dinero';
import { CARPETA_TANDAS, type Tanda } from '@/lib/tanda';
import { activoDesde, crearKados, enlaceExplorador, patrocinadora, servidor } from '@/lib/stellar';

// --------------------------------------------------------------- argumentos

function argumentos(): Map<string, string> {
  const mapa = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const clave = args[i].slice(2);
    const valor = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'si';
    mapa.set(clave, valor);
  }

  // PowerShell se traga el `--` suelto de `npm run tanda -- --evento ...`, asi
  // que npm interpreta las banderas como configuracion propia y al script solo
  // le llegan los valores, sueltos. El sintoma es "Falta --evento", que manda a
  // revisar el comando cuando el comando estaba bien.
  if (mapa.size === 0 && args.length > 0) {
    console.error(
      [
        'Llegaron valores sueltos, sin ninguna bandera:',
        `  ${args.join('  ')}`,
        '',
        'Es PowerShell comiendose el "--" de npm run. Usa cualquiera de estas:',
        '',
        '  npx tsx --env-file-if-exists=.env scripts/generar-tanda.ts --evento "..." ...',
        "  npm run generar-tanda '--' --evento \"...\" ...",
        '',
        'La primera funciona igual en PowerShell, cmd y bash.',
      ].join('\n'),
    );
    process.exit(1);
  }

  return mapa;
}

function exigir(args: Map<string, string>, nombre: string): string {
  const valor = args.get(nombre);
  if (!valor) {
    console.error(`Falta --${nombre}. Ver el encabezado de scripts/generar-tanda.ts`);
    process.exit(1);
  }
  return valor;
}

function comoSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ------------------------------------------------------------------- guiones

const args = argumentos();

const evento = exigir(args, 'evento');
const fecha = exigir(args, 'fecha');
const cantidad = Number(exigir(args, 'cantidad'));
const diasParaVencer = Number(args.get('vence-en') ?? 14);
const codigoActivo = args.get('activo') ?? 'XLM';
const emisorActivo = args.get('emisor') ?? null;

if (!Number.isInteger(cantidad) || cantidad < 1) {
  console.error('--cantidad tiene que ser un entero positivo');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
  console.error('--fecha tiene que ser YYYY-MM-DD');
  process.exit(1);
}

// El monto sale de --usd con --tasa, o directo de --xlm.
let montoPorKado: string;
let valorUsd: string | null = null;
let tasaUsdPorUnidad: string | null = null;

if (args.has('usd')) {
  const usd = Number(exigir(args, 'usd'));
  const tasa = Number(exigir(args, 'tasa'));
  if (!(usd > 0) || !(tasa > 0)) {
    console.error('--usd y --tasa tienen que ser numeros mayores que cero');
    process.exit(1);
  }
  montoPorKado = dolaresAUnidades(usd, tasa);
  valorUsd = usd.toFixed(2);
  tasaUsdPorUnidad = String(tasa);
} else {
  const unidades = Number(exigir(args, 'xlm'));
  if (!(unidades > 0)) {
    console.error('--xlm tiene que ser mayor que cero');
    process.exit(1);
  }
  montoPorKado = unidades.toFixed(7);
}

/**
 * Red de seguridad sobre la tasa.
 *
 * La tasa la elige el organizador y se congela en la tanda, que es lo correcto.
 * Pero si se equivoca, el Kado dice "$2.00" y el explorador dice otra cosa, y
 * eso lo nota cualquiera que abra el comprobante. Se avisa y se sigue:
 * la decision es suya, no del script.
 */
async function avisarSiLaTasaDesentona(tasa: number, codigoActivo: string) {
  if (codigoActivo !== 'XLM') return;

  let referencia: number | null = null;
  try {
    // Siempre contra la red publica, incluso generando en testnet. El XLM de
    // testnet no tiene mercado, y el explorador de testnet arrastra un precio
    // viejo: hoy valora a 0,157 mientras el mercado esta en 0,185. Una tanda de
    // testnet es un ensayo de una de mainnet, asi que se valida contra el precio
    // que va a regir el dia del evento real.
    const respuesta = await fetch('https://api.stellar.expert/explorer/public/asset/XLM', {
      signal: AbortSignal.timeout(8000),
    });
    const cuerpo = (await respuesta.json()) as { price?: number };
    referencia = typeof cuerpo.price === 'number' ? cuerpo.price : null;
  } catch {
    // Sin conexion o API caida: no es motivo para no generar la tanda.
  }

  if (referencia === null) {
    console.log('');
    console.log('  aviso: no se pudo consultar el precio de referencia de XLM.');
    console.log('         Verifica que --tasa sea la de mercado antes de imprimir.');
    return;
  }

  const desvio = Math.abs(tasa - referencia) / referencia;
  console.log('');
  console.log(`  precio de referencia XLM/USD: ${referencia.toFixed(4)} (stellar.expert)`);

  if (desvio > 0.15) {
    console.log('');
    console.log(`  AVISO: la tasa que pasaste (${tasa}) se aparta ${(desvio * 100).toFixed(0)}% del mercado.`);
    console.log(`         Los Kados van a decir un valor en dolares que el explorador contradice.`);
    console.log(`         Con la tasa de referencia, un Kado de $${valorUsd} serian ${(Number(valorUsd) / referencia).toFixed(4)} XLM.`);
  }
}

const expiraEn = new Date(Date.now() + diasParaVencer * 24 * 60 * 60 * 1000);
const id = `${fecha}-${comoSlug(evento)}`;
const activo = activoDesde(codigoActivo, emisorActivo);

// ----------------------------------------------------------------- ejecucion

console.log(`\nTanda: ${evento}`);
console.log(`  red:        ${RED}`);
console.log(`  cantidad:   ${cantidad} Kados`);
console.log(`  monto:      ${montoPorKado} ${codigoActivo}${valorUsd ? ` (= $${valorUsd})` : ''}`);
console.log(`  vence:      ${expiraEn.toISOString()}`);

if (tasaUsdPorUnidad) await avisarSiLaTasaDesentona(Number(tasaUsdPorUnidad), codigoActivo);

const organizador = patrocinadora();
const cuenta = await servidor.loadAccount(organizador.publicKey());
const saldo = cuenta.balances.find((b) => b.asset_type === 'native')?.balance ?? '0';

// Cada Kado inmoviliza 2 reservas por la cuenta del asistente, mas 1 por la
// trustline si el activo no es nativo. Reserva base: 0,5 XLM.
const reservasPorKado = activo.isNative() ? 2 : 3;
const xlmInmovilizado = (cantidad * reservasPorKado * 0.5).toFixed(1);
const xlmEntregado = activo.isNative() ? (cantidad * Number(montoPorKado)).toFixed(7) : '0';

console.log(`\nPatrocinadora ${organizador.publicKey()}`);
console.log(`  saldo XLM:        ${saldo}`);
console.log(`  a entregar:       ${xlmEntregado} XLM`);
console.log(`  a inmovilizar:    ${xlmInmovilizado} XLM en reservas`);

const necesario = Number(xlmEntregado) + Number(xlmInmovilizado);
if (Number(saldo) < necesario) {
  console.error(
    `\nSaldo insuficiente: hacen falta al menos ${necesario.toFixed(1)} XLM y hay ${saldo}.`,
  );
  process.exit(1);
}

// Los codigos se generan primero, en memoria. Derivar 40 keypairs con scrypt
// toma unos segundos: es el costo que tambien encarece un ataque por
// enumeracion.
console.log(`\nDerivando ${cantidad} keypairs...`);
const sal = process.env.KADO_SAL;
if (!sal) {
  console.error('Falta KADO_SAL. Ver .env.example');
  process.exit(1);
}

const codigos: { codigo: string; publicKey: string }[] = [];
const vistos = new Set<string>();
while (codigos.length < cantidad) {
  const codigo = generarCodigo();
  if (vistos.has(codigo)) continue; // Colision improbable, pero es barato descartarla.
  vistos.add(codigo);
  codigos.push({ codigo, publicKey: keypairDesdeCodigo(codigo, sal).publicKey() });
}

console.log('Creando los Kados en la cadena...');
const { kados, hashes } = await crearKados({
  publicKeys: codigos.map((c) => c.publicKey),
  activo,
  monto: montoPorKado,
  expiraEn,
  alAvanzar: (hechos, total, hash) => console.log(`  ${hechos}/${total}  ${hash}`),
});

// ------------------------------------------------------------------- salida

mkdirSync(CARPETA_TANDAS, { recursive: true });

const manifiesto: Tanda = {
  id,
  evento,
  fecha,
  red: RED,
  activo: { codigo: codigoActivo, emisor: emisorActivo },
  montoPorKado,
  valorUsd,
  tasaUsdPorUnidad,
  expiraEn: expiraEn.toISOString(),
  generadaEn: new Date().toISOString(),
  hashes,
  kados,
};

const rutaManifiesto = join(CARPETA_TANDAS, `${id}.json`);
writeFileSync(rutaManifiesto, `${JSON.stringify(manifiesto, null, 2)}\n`);

const base = process.env.KADO_URL_BASE ?? 'http://localhost:3000';
const filas = [
  'codigo,codigo_impreso,enlace,public_key',
  ...codigos.map(
    (c) => `${c.codigo},${formatearCodigo(c.codigo)},${base}/k/${c.codigo},${c.publicKey}`,
  ),
];
const rutaCodigos = join(CARPETA_TANDAS, `${id}.codigos.csv`);
writeFileSync(rutaCodigos, `${filas.join('\n')}\n`);

console.log(`\nListo.`);
console.log(`  manifiesto (publico): ${rutaManifiesto}`);
console.log(`  codigos (SECRETO):    ${rutaCodigos}`);
console.log(`\nTransacciones:`);
for (const hash of hashes) console.log(`  ${enlaceExplorador(hash)}`);
console.log(`\nPrimeros codigos:`);
for (const c of codigos.slice(0, 3)) {
  console.log(`  ${formatearCodigo(c.codigo)}   ${base}/k/${c.codigo}`);
}
