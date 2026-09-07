/**
 * Tipos compartidos entre el servidor y el navegador. Este archivo no importa
 * nada: el SDK de Stellar pesa demasiado para que se filtre al bundle del
 * asistente, que puede estar en una gama baja con 3G.
 */

export type VistaKado =
  /** Hay un Kado esperando. Todavia no se muestra el monto. */
  | { vista: 'cerrado'; deQuien: string }
  /** Se acaba de abrir en esta sesion. `enlace` va a la cuenta en el explorador. */
  | {
      vista: 'revelado';
      dolares: string | null;
      unidades: string;
      hash: string;
      cuenta: string;
      enlace: string;
      /**
       * Lo que queda en la cuenta contando este Kado. Igual al monto la primera
       * vez, y mayor cuando se acumulo sobre uno anterior: la ceremonia muestra
       * lo que trajo ESTE Kado, y el saldo muestra el total.
       */
      saldo: { dolares: string | null; unidades: string };
    }
  /** Se abrio antes y la persona volvio al enlace. */
  | { vista: 'saldo'; dolares: string | null; unidades: string; cuenta: string; enlace: string }
  | { vista: 'vencido' }
  | { vista: 'yaAbierto' }
  | { vista: 'noExiste' };

export type RespuestaApertura =
  | { ok: true; resultado: VistaKado }
  | { ok: false; motivo: 'sin-fondos-patrocinadora' | 'red' | 'desconocido'; detalle?: string };
