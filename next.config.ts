import type { NextConfig } from 'next';

/**
 * Origenes autorizados para pedir recursos del servidor de desarrollo.
 *
 * Sin esto, abrir la app desde el celular por la IP de la red local devuelve el
 * HTML pero Next bloquea los chunks de JavaScript: la pagina se ve bien y
 * ningun boton funciona, porque React nunca hidrata. Solo afecta a `next dev`.
 *
 * Se configura con KADO_DEV_ORIGENES, separando por comas. Ejemplo:
 *   KADO_DEV_ORIGENES=192.168.100.2
 */
const origenesDeDesarrollo = (process.env.KADO_DEV_ORIGENES ?? '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

const config: NextConfig = {
  // El SDK de Stellar es pesado y solo se usa del lado del servidor.
  serverExternalPackages: ['@stellar/stellar-sdk'],

  ...(origenesDeDesarrollo.length > 0 ? { allowedDevOrigins: origenesDeDesarrollo } : {}),

  // Los manifiestos de tandas se leen del disco en tiempo de ejecucion. Sin
  // esto, el despliegue serverless no los incluye y el panel sale vacio.
  outputFileTracingIncludes: {
    '/panel': ['./tandas/**/*.json'],
    '/panel/exportar': ['./tandas/**/*.json'],
    '/k/[codigo]': ['./tandas/**/*.json'],
    '/api/kado/[codigo]/abrir': ['./tandas/**/*.json'],
  },
};

export default config;
