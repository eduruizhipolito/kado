import { Networks } from '@stellar/stellar-sdk';

export type Red = 'testnet' | 'mainnet';

export const RED: Red = process.env.KADO_RED === 'mainnet' ? 'mainnet' : 'testnet';

export const HORIZON =
  RED === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';

export const PASSPHRASE = RED === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export const EXPLORADOR =
  RED === 'mainnet'
    ? 'https://stellar.expert/explorer/public'
    : 'https://stellar.expert/explorer/testnet';

/**
 * Lee una variable de entorno obligatoria. Falla temprano y con nombre propio:
 * el modo de falla que hay que evitar es descubrir en la sala que faltaba una.
 */
export function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Ver .env.example`);
  return valor;
}

export const salDeCodigos = () => requerido('KADO_SAL');
export const secretaPatrocinadora = () => requerido('KADO_PATROCINADORA_SECRETA');

/** Fee por operacion. Generoso a proposito: el fee no es donde se ahorra. */
export const FEE_POR_OPERACION = '100000';
