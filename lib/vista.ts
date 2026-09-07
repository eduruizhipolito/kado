import type { Keypair } from '@stellar/stellar-sdk';

import { salDeCodigos } from './config';
import { keypairDesdeCodigo, normalizarCodigo } from './codigo';
import { aDolares, aUnidades } from './dinero';
import { activoDesde, enlaceCuenta, leerEstado, type EstadoKado } from './stellar';
import { buscarTandaPorKado, type Tanda } from './tanda';
import type { VistaKado } from './tipos';

/**
 * Traduce el estado on-chain de un Kado a lo que ve el asistente.
 *
 * Es el unico lugar donde se decide que pantalla toca, y esta separado del
 * acceso a la cadena para que la misma logica sirva a la pagina y a la API.
 */
export function comoVista(estado: EstadoKado, tanda: Tanda | null): VistaKado {
  const deQuien = tanda?.evento ?? 'la comunidad Stellar de Perú';

  switch (estado.estado) {
    case 'inexistente':
      return { vista: 'noExiste' };

    case 'vencido':
      return { vista: 'vencido' };

    case 'disponible':
      // No se filtra el monto: la pantalla cerrada no sabe cuanto hay.
      return { vista: 'cerrado', deQuien };

    case 'abierto': {
      const codigoActivo = tanda?.activo.codigo ?? 'XLM';
      const saldo = estado.saldos.find((s) => s.activo === codigoActivo);
      const cantidad = Number(saldo?.monto ?? '0');

      // Se abrio y ya no queda nada: los fondos se movieron a otro lado.
      if (cantidad === 0) return { vista: 'yaAbierto' };

      return {
        vista: 'saldo',
        dolares: dolaresEquivalentes(saldo?.monto ?? '0', tanda),
        unidades: aUnidades(saldo?.monto ?? '0', codigoActivo),
        cuenta: estado.cuenta,
        enlace: enlaceCuenta(estado.cuenta),
      };
    }
  }
}

/**
 * Convierte un monto on-chain a dolares con la tasa fijada al generar la tanda.
 *
 * La tasa se congela a proposito: si se consultara el precio en vivo, dos
 * personas de la misma sala verian montos distintos por el mismo regalo.
 */
export function dolaresEquivalentes(monto: string, tanda: Tanda | null): string | null {
  if (!tanda?.tasaUsdPorUnidad) return null;
  const valor = Number(monto) * Number(tanda.tasaUsdPorUnidad);
  if (!Number.isFinite(valor)) return null;
  return aDolares(valor.toFixed(2));
}

export type KadoResuelto = {
  codigo: string;
  /** El keypair del Kado. Derivarlo cuesta, asi que se deriva una sola vez. */
  kado: Keypair;
  publicKey: string;
  estado: EstadoKado;
  tanda: Tanda | null;
  vista: VistaKado;
};

/** Resuelve un codigo crudo de la URL a todo lo que hace falta para responder. */
export async function resolverCodigo(crudo: string): Promise<KadoResuelto | null> {
  const codigo = normalizarCodigo(crudo);
  if (!codigo) return null;

  const kado = keypairDesdeCodigo(codigo, salDeCodigos());
  const publicKey = kado.publicKey();
  const tanda = buscarTandaPorKado(publicKey);
  const estado = await leerEstado(publicKey);

  return { codigo, kado, publicKey, estado, tanda, vista: comoVista(estado, tanda) };
}

/**
 * Lo que se muestra recien abierto: el monto entregado, no el saldo actual.
 *
 * `saldoTotal` es lo que queda en la cuenta despues de abrir. Por defecto es el
 * monto, que es el caso del primer Kado; cuando se acumulo sobre una cuenta
 * anterior es mayor, y `cuenta` es la de la persona y no la de este codigo.
 */
export function vistaRevelada(
  monto: string,
  tanda: Tanda | null,
  hash: string,
  cuenta: string,
  saldoTotal: string = monto,
): VistaKado {
  const codigoActivo = tanda?.activo.codigo ?? 'XLM';
  return {
    vista: 'revelado',
    dolares: dolaresEquivalentes(monto, tanda),
    unidades: aUnidades(monto, codigoActivo),
    hash,
    cuenta,
    // A la cuenta, no a la transaccion: ver el comentario en enlaceCuenta.
    enlace: enlaceCuenta(cuenta),
    saldo: {
      dolares: dolaresEquivalentes(saldoTotal, tanda),
      unidades: aUnidades(saldoTotal, codigoActivo),
    },
  };
}

/**
 * El saldo de una cuenta cualquiera del piloto. `comoVista` sirve cuando la
 * cuenta es la del propio codigo; esto hace falta cuando los fondos viven en la
 * cuenta anterior de la persona y el codigo que se abrio ya quedo vacio.
 */
export function vistaSaldo(saldo: string, tanda: Tanda | null, cuenta: string): VistaKado {
  return {
    vista: 'saldo',
    dolares: dolaresEquivalentes(saldo, tanda),
    unidades: aUnidades(saldo, tanda?.activo.codigo ?? 'XLM'),
    cuenta,
    enlace: enlaceCuenta(cuenta),
  };
}

export const activoDeTanda = (tanda: Tanda | null) =>
  activoDesde(tanda?.activo.codigo ?? 'XLM', tanda?.activo.emisor ?? null);
