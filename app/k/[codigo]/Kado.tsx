'use client';

import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import cajaAbriendose from '@/assets/caja-abriendose.webp';
import cajaCerrada from '@/assets/caja-cerrada.webp';
import cajaVacia from '@/assets/caja-vacia.webp';
import type { RespuestaApertura, VistaKado } from '@/lib/tipos';

/**
 * La pantalla es la tapa.
 *
 * Todo el flujo vive en un solo componente y sin navegación: entre tocar
 * "Abrir" y ver el monto no puede haber una recarga, porque es exactamente el
 * momento en que el wifi de un evento se cae. Por la misma razón el paso que
 * sigue al monto tampoco navega: la tapa termina de retirarse y ya.
 */

/** Altura de la tapa superior cerrada. La costura queda a un tercio. */
const TAPA_ARRIBA_CERRADA = '34%';
const TAPA_ABAJO_CERRADA = '66%';
/** Al abrirse, las tapas no desaparecen: quedan como franjas arriba y abajo. */
const TAPA_ARRIBA_ABIERTA = '7vh';
/**
 * La franja de abajo es más alta que la de arriba porque no es decoración: la
 * banda entera es el paso siguiente. El diseño la dibujó con un tirador
 * redondeado, pero el sistema no admite formas redondeadas, así que en su
 * lugar va una etiqueta que se lee.
 */
const TAPA_ABAJO_REVELADA = '11vh';
/**
 * Al volver mas tarde, la tapa ya no esta: la pantalla entera es el espacio de
 * la persona. Es la diferencia entre "acabas de abrirlo" y "esto es tuyo".
 */
const TAPA_RETIRADA = '0';

const DESLIZAMIENTO = 'height 900ms cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * El acceso de la persona: su primer codigo y la cuenta que se le creo con el.
 *
 * Es lo unico que hace que un segundo Kado se acumule en vez de abrir una
 * segunda cuenta. Vive en el navegador y nada mas: no hay registro, no hay
 * correo, y el codigo ya esta en la barra de direcciones y en el papel que la
 * persona tiene en la mano. Si se pierde, el Kado siguiente se abre igual, en
 * su propia cuenta.
 */
const CLAVE_ACCESO = 'kado.acceso';

type Acceso = { codigo: string; cuenta: string };

function leerAcceso(): Acceso | null {
  try {
    const guardado = localStorage.getItem(CLAVE_ACCESO);
    if (!guardado) return null;
    const acceso = JSON.parse(guardado) as Partial<Acceso>;
    return acceso?.codigo && acceso?.cuenta
      ? { codigo: acceso.codigo, cuenta: acceso.cuenta }
      : null;
  } catch {
    // Modo privado, almacenamiento lleno o un JSON de una version anterior.
    return null;
  }
}

function guardarAcceso(acceso: Acceso) {
  try {
    localStorage.setItem(CLAVE_ACCESO, JSON.stringify(acceso));
  } catch {
    // Sin acumulacion, pero con el Kado abierto. No se interrumpe nada.
  }
}

type Props = { inicial: VistaKado; codigo: string };

export default function Kado({ inicial, codigo }: Props) {
  const router = useRouter();
  const [vista, setVista] = useState<VistaKado>(inicial);
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [segundos, setSegundos] = useState<number | null>(null);
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const tocado = useRef<number>(0);

  /*
    El acceso se lee despues del primer render y nunca durante: el servidor no
    tiene localStorage, y leerlo mientras se renderiza haria que el HTML del
    servidor y el del navegador no coincidan.

    Si la persona vuelve a su enlace y ve su saldo, esta es tambien la ocasion
    de anotar el acceso: puede ser un telefono nuevo, o el Kado puede haberse
    abierto antes de que existiera esta pantalla.
  */
  useEffect(() => {
    const guardado = leerAcceso();
    if (inicial.vista === 'saldo' && guardado?.cuenta !== inicial.cuenta) {
      const propio = { codigo, cuenta: inicial.cuenta };
      guardarAcceso(propio);
      setAcceso(propio);
      return;
    }
    setAcceso(guardado);
  }, [inicial, codigo]);

  const abierto = vista.vista === 'revelado' || vista.vista === 'saldo';
  const alturaArriba = vista.vista === 'saldo' ? TAPA_RETIRADA : TAPA_ARRIBA_ABIERTA;
  const alturaAbajo = vista.vista === 'saldo' ? TAPA_RETIRADA : TAPA_ABAJO_REVELADA;

  const abrir = useCallback(async () => {
    setAbriendo(true);
    setFallo(null);
    if (!tocado.current) tocado.current = performance.now();

    try {
      const respuesta = await fetch(`/api/kado/${codigo}/abrir`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Si la persona ya tiene cuenta, este Kado se suma ahi. El servidor la
        // valida contra la cadena antes de usarla.
        body: JSON.stringify({ destino: acceso?.cuenta ?? null }),
      });
      const cuerpo = (await respuesta.json()) as RespuestaApertura;

      if (!cuerpo.ok) {
        setFallo(
          cuerpo.motivo === 'sin-fondos-patrocinadora'
            ? 'Avisa en la mesa de entrada: hay un problema con los fondos del evento.'
            : 'No se pudo abrir. Toca para reintentar.',
        );
        setAbriendo(false);
        return;
      }

      // Segundos hasta el monto: la metrica central de docs/producto.md.
      setSegundos((performance.now() - tocado.current) / 1000);

      /*
        La cuenta que devuelve el servidor manda. Si es una que no teniamos
        anotada, este codigo es el acceso de la persona; si es la que ya
        teniamos, el Kado se acumulo y el acceso sigue siendo el primer codigo.

        Esto tambien se corrige solo cuando el destino guardado ya no servia y
        el servidor abrio en la cuenta propia: la respuesta trae la cuenta
        nueva, y es la que queda anotada.
      */
      const abierto = cuerpo.resultado;
      if (
        (abierto.vista === 'revelado' || abierto.vista === 'saldo') &&
        acceso?.cuenta !== abierto.cuenta
      ) {
        const propio = { codigo, cuenta: abierto.cuenta };
        guardarAcceso(propio);
        setAcceso(propio);
      }

      setVista(abierto);
    } catch {
      setFallo('Se cortó la conexión. Toca para reintentar.');
    } finally {
      setAbriendo(false);
    }
  }, [codigo, acceso]);

  /**
   * Termina de retirar la tapa. El estado on-chain no cambia: `revelado` y
   * `saldo` son el mismo Kadó abierto, y lo único que los separa es si la
   * persona ya vio la ceremonia.
   */
  const retirarTapa = useCallback(() => {
    setVista((actual) =>
      actual.vista === 'revelado'
        ? {
            vista: 'saldo',
            // El saldo, no el monto: si este Kado se acumulo sobre uno anterior
            // son numeros distintos, y la pantalla dice "Tu saldo".
            dolares: actual.saldo.dolares,
            unidades: actual.saldo.unidades,
            cuenta: actual.cuenta,
            enlace: actual.enlace,
          }
        : actual,
    );

    /*
      Si el Kado se acumulo, este codigo ya esta vacio y el enlace para volver a
      entrar es el del primero. La barra de direcciones tiene que decirlo, o la
      linea "guarda este enlace" apunta a una pantalla que dira "ya fue
      abierto".

      Se corrige la URL sin navegar: una navegacion aca volveria a pedirle el
      estado a Horizon, y el wifi del evento no tiene por que sobrevivir a los
      segundos que siguen a la ceremonia.
    */
    if (acceso && acceso.codigo !== codigo) {
      window.history.replaceState(null, '', `/k/${acceso.codigo}`);
    }
  }, [acceso, codigo]);

  // Los tres estados finales sin apertura comparten la pantalla cerrada.
  if (vista.vista === 'vencido') {
    return <Cerrada colorCostura="var(--color-apagado)" titulo="Este Kadó venció" />;
  }
  if (vista.vista === 'yaAbierto') {
    return (
      <Cerrada
        colorCostura="var(--color-confirmado)"
        titulo="Este Kadó ya fue abierto"
        imagen={cajaVacia}
      />
    );
  }
  if (vista.vista === 'noExiste') {
    return (
      <Cerrada
        sinCostura
        titulo="Este código no existe"
        detalle="Revisa el código impreso o pide uno nuevo en la mesa de entrada."
      />
    );
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-interior text-tinta">
      {/*
        Mientras el Kadó está cerrado la pantalla entera es la foto de la caja,
        con las tapas transparentes encima. Las dos imágenes viven a la vez y
        se cruzan por opacidad: si la de la apertura se cargara recién al
        tocar, la pantalla quedaría en blanco durante los cinco segundos más
        frágiles del flujo.

        Al abrirse, esta capa se desmonta en el mismo commit en que las tapas
        vuelven a ser opacas. Todavía miden 34% y 66%, así que tapan la pantalla
        completa y el cambio ocurre debajo, sin parpadeo.
      */}
      {vista.vista === 'cerrado' ? (
        <div className="pointer-events-none absolute inset-0 z-0 bg-tapa">
          <Caja imagen={cajaCerrada} visible={!abriendo} prioridad />
          <Caja imagen={cajaAbriendose} visible={abriendo} />
        </div>
      ) : null}

      {/* Tapa superior */}
      <div
        className={`relative z-10 flex w-full shrink-0 flex-col justify-end overflow-hidden ${
          vista.vista === 'cerrado' ? 'bg-transparent' : 'bg-tapa'
        }`}
        style={{
          height: abierto ? alturaArriba : TAPA_ARRIBA_CERRADA,
          transition: DESLIZAMIENTO,
        }}
      >
        <div
          className="flex items-center justify-between px-6 pb-5 text-[11px] font-semibold tracking-[0.12em] text-interior/60 uppercase"
          style={{ opacity: abierto ? 1 : 0.6, transition: 'opacity 400ms' }}
        >
          <span>Kadó</span>
          {vista.vista === 'cerrado' ? <span>Lima, PE</span> : null}
        </div>
      </div>

      {/* La costura */}
      <div
        className={`relative z-10 h-[2px] w-full shrink-0 overflow-hidden ${abriendo ? 'costura-en-progreso' : ''}`}
        style={{
          backgroundColor: abriendo ? 'var(--color-apagado)' : 'var(--color-costura)',
          opacity: abierto ? 0 : 1,
          transition: 'opacity 500ms',
        }}
      />

      {/*
        Interior: existe siempre, debajo de las tapas.

        Cerrado, las tapas suman 100vh y este div tiene que aplastarse a cero.
        El respiro y el scroll van solo cuando ya está abierto: un ítem flex no
        encoge por debajo de su propio padding, así que un `py` constante
        abriría la costura antes de tiempo y empujaría el botón fuera de la
        pantalla.
      */}
      <div
        className={`flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center ${
          abierto ? 'overflow-y-auto py-8' : ''
        }`}
      >
        {vista.vista === 'revelado' ? (
          <>
            <Cifra dolares={vista.dolares} unidades={vista.unidades} pie="Ya es tuyo" />
            <Comprobante enlace={vista.enlace} margen="mt-14" />
          </>
        ) : null}

        {vista.vista === 'saldo' ? (
          <>
            <Cifra dolares={vista.dolares} unidades={vista.unidades} pie="Tu saldo" />

            {/*
              Las tres acciones de una cuenta. Enviar y recibir todavia no
              existen: enviar necesita que la patrocinadora pague el fee del
              asistente, que puede tener cero XLM, y eso es una capa entera
              (docs/arquitectura.md). Se muestran apagadas en vez de ocultarse
              porque la pantalla tiene que decir de una que esto es una cuenta y
              no un recibo.
            */}
            <div className="mt-10 flex w-full max-w-xs border border-tinta/15">
              <Accion etiqueta="Enviar" />
              <Accion etiqueta="Recibir" />
              <Accion etiqueta="Abrir otro" alTocar={() => router.push('/')} />
            </div>

            <Comprobante enlace={vista.enlace} margen="mt-10" />
            <p className="mt-6 px-4 text-[13px] text-tinta/60 text-balance">
              Guarda este enlace para volver a entrar.
            </p>
          </>
        ) : null}
      </div>

      {/* Tapa inferior: mientras está cerrada, contiene el mensaje y el botón. */}
      <div
        className={`relative z-10 flex w-full shrink-0 flex-col justify-between overflow-hidden ${
          vista.vista === 'cerrado' ? 'bg-transparent' : 'bg-tapa'
        }`}
        style={{
          height: abierto ? alturaAbajo : TAPA_ABAJO_CERRADA,
          transition: DESLIZAMIENTO,
        }}
      >
        {vista.vista === 'cerrado' ? (
          <>
            <div
              className="flex flex-col items-center px-6 pt-12 text-center"
              style={{ opacity: abriendo ? 0 : 1, transition: 'opacity 350ms' }}
            >
              <h1 className="text-xl font-medium tracking-tight text-interior text-balance">
                Un regalo de {vista.deQuien}
              </h1>
              <p className="mt-2 text-[15px] text-interior/70">Ábrelo para ver qué hay dentro</p>
            </div>

            <div className="flex flex-col items-center">
              {abriendo ? (
                <p className="pb-14 text-[15px] text-interior/80">Preparando tu cuenta</p>
              ) : (
                <>
                  {fallo ? (
                    <p className="px-6 pb-4 text-[15px] text-costura text-balance">{fallo}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={abrir}
                    className="h-16 w-full bg-interior text-lg font-semibold text-tinta transition-opacity active:opacity-80"
                  >
                    {fallo ? 'Reintentar' : 'Abrir'}
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}

        {/*
          Recién abierto, la banda entera es el paso siguiente. Es la única
          salida de la ceremonia, y por eso dice qué se gana al tocarla en vez
          de decir "continuar".
        */}
        {vista.vista === 'revelado' ? (
          <button
            type="button"
            onClick={retirarTapa}
            className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-interior transition-opacity active:opacity-70"
          >
            Ver mi saldo
          </button>
        ) : null}
      </div>

      {/* Instrumentación de "segundos hasta el monto", solo visible al organizador. */}
      {segundos !== null ? (
        <span hidden data-segundos-hasta-el-monto={segundos.toFixed(2)} />
      ) : null}
    </main>
  );
}

/**
 * La caja, a sangre y detrás de todo.
 *
 * El fondo de las fotos es un violeta bastante mas oscuro que el de la tapa,
 * asi que recortarlas y apoyarlas sobre el plano deja un halo sucio: no hay
 * mascara que lo disimule. En vez de eso la foto ES el plano, y por eso las
 * imagenes se generaron ya verticales, extendiendo su propio fondo: el como
 * esta en scripts/componer-cajas.mjs.
 */
function Caja({
  imagen,
  visible,
  prioridad = false,
}: {
  imagen: StaticImageData;
  visible: boolean;
  prioridad?: boolean;
}) {
  return (
    <Image
      src={imagen}
      alt=""
      fill
      sizes="100vw"
      priority={prioridad}
      className="object-cover"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 600ms' }}
    />
  );
}

/** El monto es el único elemento grande de toda la aplicación. */
function Cifra({
  dolares,
  unidades,
  pie,
}: {
  dolares: string | null;
  unidades: string;
  pie: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-[clamp(3rem,18vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
        {dolares ?? unidades}
      </p>

      {dolares ? (
        <p className="mt-3 text-[13px] tracking-[0.02em] text-tinta/50">{unidades}</p>
      ) : null}

      <p className="mt-4 text-[17px] text-tinta/80">{pie}</p>
    </div>
  );
}

/**
 * Una de las tres acciones de la cuenta. Sin `alTocar` queda apagada: no es un
 * boton que falla, es uno que todavia no esta.
 */
function Accion({ etiqueta, alTocar }: { etiqueta: string; alTocar?: () => void }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={!alTocar}
      className={`flex-1 border-r border-tinta/15 px-2 py-4 text-[14px] font-semibold tracking-tight transition-opacity last:border-r-0 ${
        alTocar ? 'text-tinta active:opacity-60' : 'text-tinta/25'
      }`}
    >
      {etiqueta}
    </button>
  );
}

function Comprobante({ enlace, margen }: { enlace: string; margen: string }) {
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noreferrer"
      className={`${margen} text-[13px] tracking-[0.06em] text-tinta/60 underline underline-offset-4`}
    >
      Ver comprobante
    </a>
  );
}

/** Las tres pantallas sin apertura: vencido, ya abierto y código inexistente. */
function Cerrada({
  titulo,
  detalle,
  colorCostura,
  sinCostura = false,
  imagen,
}: {
  titulo: string;
  detalle?: string;
  colorCostura?: string;
  sinCostura?: boolean;
  imagen?: StaticImageData;
}) {
  return (
    <main className="fixed inset-0 flex flex-col bg-tapa text-interior">
      {imagen ? <Caja imagen={imagen} visible prioridad /> : null}
      <div className="relative z-10 h-[34%] w-full shrink-0" />
      {sinCostura ? null : (
        <div
          className="relative z-10 h-[2px] w-full shrink-0"
          style={{ backgroundColor: colorCostura }}
        />
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-6 pt-12 text-center">
        <h1 className="text-xl font-medium tracking-tight text-balance">{titulo}</h1>
        {detalle ? <p className="mt-3 text-[15px] text-interior/70 text-balance">{detalle}</p> : null}
      </div>
    </main>
  );
}
