import { NextResponse } from 'next/server';

import { sumarMontos } from '@/lib/dinero';
import { abrirKado, codigosDeError, cuentaDelPiloto, leerEstado } from '@/lib/stellar';
import type { RespuestaApertura } from '@/lib/tipos';
import {
  activoDeTanda,
  comoVista,
  resolverCodigo,
  vistaRevelada,
  vistaSaldo,
} from '@/lib/vista';

/**
 * Abre un Kado.
 *
 * Es idempotente por construccion. La transaccion de apertura es atomica, asi
 * que reintentar es seguro: si la primera llamada llego a la cadena pero la
 * respuesta se perdio en el wifi del evento, la segunda encuentra el Kado ya
 * abierto y devuelve el saldo en vez de un error. Es el caso que mas va a pasar
 * en una sala real.
 */
/**
 * Horizon envia la transaccion de forma sincrona: no responde hasta que cierra
 * el ledger, lo que en Stellar son unos cinco segundos. Medido de punta a punta,
 * la apertura tarda ~4,8 s en el servidor.
 *
 * El limite por defecto de una funcion serverless en Vercel es de 10 s, y eso
 * deja un margen de dos segundos sobre algo que depende del tiempo de bloque de
 * una red publica. Se declara explicito para que un ledger lento no le corte la
 * apertura a alguien parado en la sala.
 */
export const maxDuration = 60;

export async function POST(
  peticion: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<NextResponse<RespuestaApertura>> {
  const { codigo: crudo } = await contexto.params;
  const pedido = await destinoPedido(peticion);

  let resuelto;
  try {
    resuelto = await resolverCodigo(crudo);
  } catch (error) {
    console.error('[kado] no se pudo leer el estado', codigosDeError(error));
    return NextResponse.json({ ok: false, motivo: 'red' }, { status: 503 });
  }

  if (!resuelto) {
    return NextResponse.json({ ok: true, resultado: { vista: 'noExiste' } });
  }

  // Todo lo que no sea "hay un Kado esperando" ya tiene su pantalla.
  if (resuelto.estado.estado !== 'disponible') {
    return NextResponse.json({ ok: true, resultado: resuelto.vista });
  }

  const { balanceId, monto } = resuelto.estado;
  const activo = activoDeTanda(resuelto.tanda);
  const comenzo = Date.now();

  /*
    Acumulacion. Si la persona ya tiene una cuenta de un Kado anterior, este va
    a parar ahi en vez de crear una segunda: sale del evento con UNA cuenta y un
    solo saldo verificable en el explorador.

    El destino lo propone el navegador, asi que se valida contra la cadena antes
    de creerle. Si no pasa, la apertura sigue igual y los fondos quedan en la
    cuenta de este codigo: la acumulacion es una mejora, nunca una condicion
    para que alguien reciba su Kado.
  */
  let destino: string | null = null;
  let saldoPrevio = '0';
  if (pedido && pedido !== resuelto.publicKey) {
    const cuenta = await cuentaDelPiloto(pedido, activo).catch(() => null);
    if (cuenta) {
      destino = pedido;
      saldoPrevio = cuenta.saldo;
    } else {
      console.warn(`[kado] destino descartado, se abre en cuenta propia destino=${pedido}`);
    }
  }

  try {
    const { hash } = await abrirKado({
      kado: resuelto.kado,
      balanceId,
      activo,
      monto,
      destino: destino ?? undefined,
    });

    // La metrica "segundos hasta el monto" de docs/producto.md se mide en el
    // navegador; esto es su contraparte del servidor, util para separar la
    // latencia de la red de la del asistente.
    console.info(
      `[kado] abierto tanda=${resuelto.tanda?.id ?? 'sin-tanda'} ms=${Date.now() - comenzo} hash=${hash}`,
    );

    return NextResponse.json({
      ok: true,
      resultado: vistaRevelada(
        monto,
        resuelto.tanda,
        hash,
        destino ?? resuelto.publicKey,
        destino ? sumarMontos(saldoPrevio, monto) : monto,
      ),
    });
  } catch (error) {
    const codigos = codigosDeError(error);
    console.error('[kado] fallo la apertura', codigos);

    // Carrera: alguien abrio el mismo Kado entremedio, o esta es la reintento
    // de una llamada que si llego. La cadena es la fuente de verdad.
    const estadoAhora = await leerEstado(resuelto.publicKey).catch(() => null);
    if (estadoAhora && estadoAhora.estado === 'abierto') {
      // Si se acumulo, la cuenta de este codigo quedo en cero y `comoVista`
      // diria "ya fue abierto" sobre una apertura que acaba de funcionar. El
      // saldo esta en la cuenta de la persona, y es de ahi que hay que leerlo.
      if (destino) {
        const cuenta = await cuentaDelPiloto(destino, activo).catch(() => null);
        if (cuenta) {
          return NextResponse.json({
            ok: true,
            resultado: vistaSaldo(cuenta.saldo, resuelto.tanda, destino),
          });
        }
      }
      return NextResponse.json({ ok: true, resultado: comoVista(estadoAhora, resuelto.tanda) });
    }

    // La patrocinadora se quedo sin XLM: se rompen TODAS las aperturas.
    // Es el modo de falla que arquitectura.md marca como el mas caro en sala.
    const texto = JSON.stringify(codigos);
    if (texto.includes('tx_insufficient_balance') || texto.includes('op_underfunded')) {
      return NextResponse.json(
        { ok: false, motivo: 'sin-fondos-patrocinadora', detalle: texto },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: false, motivo: 'desconocido', detalle: texto },
      { status: 502 },
    );
  }
}

/**
 * La cuenta a la que acumular, si el navegador la mando. Un cuerpo vacio o
 * ilegible no es un error: es la primera apertura de esta persona.
 */
async function destinoPedido(peticion: Request): Promise<string | null> {
  try {
    const cuerpo = (await peticion.json()) as { destino?: unknown };
    return typeof cuerpo?.destino === 'string' ? cuerpo.destino : null;
  } catch {
    return null;
  }
}
