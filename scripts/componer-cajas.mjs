/**
 * Compone las tres fotos de la caja que usa la pantalla del asistente.
 *
 * Las fuentes en `stitch_kad_gift_claim_app/` son cuadradas, de ~1 MB y con un
 * fondo violeta bastante mas oscuro que el de la tapa. Recortarlas y apoyarlas
 * sobre el plano deja un halo sucio que ninguna mascara disimula, asi que la
 * foto pasa a ser el plano completo y hace falta que sea vertical.
 *
 * El primer intento extendia la foto con una copia estirada y desenfocada de
 * si misma. No sirve: el desenfoque promedia TODO, incluida la luz que sale de
 * la caja abierta, y deja un fondo naranja pegado a una foto violeta. Se ve la
 * union, y ademas repite el halo donde no tiene que estar.
 *
 * Ahora el fondo se construye desde el borde de la foto. Se promedian sus
 * primeras filas, se suavizan en horizontal y esa linea se estira hacia arriba
 * mientras se funde hacia un violeta neutro tomado de las esquinas, que es
 * donde la foto nunca tiene luz. En la costura el color es identico al de la
 * foto por construccion, asi que no hay salto; lejos es violeta plano, asi que
 * el halo no se replica.
 *
 * Se corre a mano cuando cambian las fotos de origen:
 *   node scripts/componer-cajas.mjs
 */
import fs from 'node:fs';

import sharp from 'sharp';

/** Vertical largo: `object-cover` recorta lo que sobre en cada telefono. */
const ANCHO = 900;
const ALTO = 1800;
/**
 * La foto ocupa todo el ancho. El recorte lateral de `object-cover` en un
 * telefono comun son unos 16 px de 900, y ninguna de las tres cajas llega tan
 * cerca del borde.
 */
const ARRIBA = Math.round(ALTO * 0.4);

/** Filas del borde que se promedian para arrancar la extension. */
const MUESTRA = 24;
/** Ventana del suavizado horizontal: borra el detalle, conserva el viñeteo. */
const SUAVIZADO = 121;
/** Columnas de cada extremo que se consideran fondo puro, sin luz. */
const FRANJA_NEUTRA = 0.15;
/** Cuanto se oscurece el violeta al alejarse de la foto. */
const CAIDA = 0.72;
/**
 * A cuantos pixeles de la foto se completa ese fundido.
 *
 * Es una distancia fija y no el espacio disponible: debajo de la foto quedan
 * pocos pixeles, y repartir ahi todo el oscurecimiento deja un escalon visible
 * justo donde apoya la caja.
 */
const DISTANCIA_FUNDIDO = 700;
/**
 * Alto del difuminado en alfa con que la foto entra en el fondo.
 *
 * Corto a proposito. En el borde el fondo YA es el color de la foto, asi que
 * no hay salto que disimular, y un difuminado largo mezcla contenido de la
 * foto con el fondo y deja justo la banda que se querria evitar.
 */
const PLUMA = 0.035;

const ORIGEN = 'stitch_kad_gift_claim_app';
const DESTINO = 'assets';

const CAJAS = [
  ['a_sleek_minimalist_closed_luxury_gift_box_in_a_modern_aesthetic_dark_violet_and', 'caja-cerrada'],
  ['the_same_luxury_minimalist_rectangular_gift_box_from_the_reference_image_now', 'caja-abriendose'],
  ['the_exact_same_luxury_minimalist_rectangular_gift_box_in_dark_violet_4b2fa3', 'caja-vacia'],
];

/** Promedio de las `MUESTRA` filas del borde, columna por columna. */
function filaDelBorde(rgb, lado, desdeArriba) {
  const fila = new Float64Array(lado * 3);
  for (let n = 0; n < MUESTRA; n++) {
    const y = desdeArriba ? n : lado - 1 - n;
    for (let x = 0; x < lado; x++) {
      const i = (y * lado + x) * 3;
      fila[x * 3] += rgb[i];
      fila[x * 3 + 1] += rgb[i + 1];
      fila[x * 3 + 2] += rgb[i + 2];
    }
  }
  for (let k = 0; k < fila.length; k++) fila[k] /= MUESTRA;
  return fila;
}

/** Media movil en horizontal, para que estirar la fila no deje vetas. */
function suavizar(fila, lado) {
  const salida = new Float64Array(fila.length);
  const radio = Math.floor(SUAVIZADO / 2);
  for (let x = 0; x < lado; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let d = -radio; d <= radio; d++) {
      const xx = Math.min(lado - 1, Math.max(0, x + d));
      r += fila[xx * 3];
      g += fila[xx * 3 + 1];
      b += fila[xx * 3 + 2];
      n++;
    }
    salida[x * 3] = r / n;
    salida[x * 3 + 1] = g / n;
    salida[x * 3 + 2] = b / n;
  }
  return salida;
}

/** El violeta de los extremos: ahi la foto es fondo y nunca luz. */
function violetaNeutro(fila, lado) {
  const ancho = Math.round(lado * FRANJA_NEUTRA);
  let r = 0, g = 0, b = 0, n = 0;
  for (let x = 0; x < lado; x++) {
    if (x >= ancho && x < lado - ancho) continue;
    r += fila[x * 3];
    g += fila[x * 3 + 1];
    b += fila[x * 3 + 2];
    n++;
  }
  return [r / n, g / n, b / n];
}

/** Arranca en 0, llega a 1, sin esquinas: el fundido no se nota. */
const suave = (t) => t * t * (3 - 2 * t);

for (const [carpeta, nombre] of CAJAS) {
  const fuente = `${ORIGEN}/${carpeta}/screen.png`;
  const salida = `${DESTINO}/${nombre}.webp`;

  const { data: rgb } = await sharp(fuente)
    .resize(ANCHO, ANCHO, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const arriba = suavizar(filaDelBorde(rgb, ANCHO, true), ANCHO);
  const abajo = suavizar(filaDelBorde(rgb, ANCHO, false), ANCHO);
  const neutroArriba = violetaNeutro(arriba, ANCHO);
  const neutroAbajo = violetaNeutro(abajo, ANCHO);

  const abajoDeLaFoto = ARRIBA + ANCHO;
  const fondo = Buffer.alloc(ANCHO * ALTO * 3);

  for (let y = 0; y < ALTO; y++) {
    // `t` es la distancia a la foto: 0 en la costura, 1 lejos. `mezcla` es
    // cuanto pesa el borde de abajo frente al de arriba.
    let neutro, t, mezcla;
    if (y < ARRIBA) {
      neutro = neutroArriba;
      t = suave(Math.min(1, (ARRIBA - y) / DISTANCIA_FUNDIDO));
      mezcla = 0;
    } else if (y >= abajoDeLaFoto) {
      neutro = neutroAbajo;
      t = suave(Math.min(1, (y - abajoDeLaFoto) / DISTANCIA_FUNDIDO));
      mezcla = 1;
    } else {
      // Zona que la foto va a cubrir. Se rellena pasando de un borde al otro:
      // si se dejara el de arriba, la foto se fundiria hacia un violeta oscuro
      // justo donde el fondo de abajo ya es el color del suelo, y eso deja una
      // linea oscura al pie de la caja.
      neutro = null;
      t = 0;
      mezcla = (y - ARRIBA) / ANCHO;
    }
    const oscurecer = 1 - (1 - CAIDA) * t;
    for (let x = 0; x < ANCHO; x++) {
      const destino = (y * ANCHO + x) * 3;
      for (let c = 0; c < 3; c++) {
        const k = x * 3 + c;
        const desdeLaFoto = arriba[k] + (abajo[k] - arriba[k]) * mezcla;
        const lejano = neutro ? neutro[c] : desdeLaFoto;
        fondo[destino + c] = Math.round((desdeLaFoto + (lejano - desdeLaFoto) * t) * oscurecer);
      }
    }
  }

  // La foto, con los bordes superior e inferior difuminados en alfa. No hace
  // falta difuminar los lados: el fondo sale de sus propias columnas.
  const rgba = Buffer.alloc(ANCHO * ANCHO * 4);
  const pluma = Math.round(ANCHO * PLUMA);
  for (let y = 0; y < ANCHO; y++) {
    const borde = Math.min(y, ANCHO - 1 - y);
    const alfa = borde < pluma ? suave(borde / pluma) : 1;
    for (let x = 0; x < ANCHO; x++) {
      const origen = (y * ANCHO + x) * 3;
      const destino = (y * ANCHO + x) * 4;
      rgba[destino] = rgb[origen];
      rgba[destino + 1] = rgb[origen + 1];
      rgba[destino + 2] = rgb[origen + 2];
      rgba[destino + 3] = Math.round(alfa * 255);
    }
  }

  await sharp(fondo, { raw: { width: ANCHO, height: ALTO, channels: 3 } })
    .composite([
      {
        input: rgba,
        raw: { width: ANCHO, height: ANCHO, channels: 4 },
        top: ARRIBA,
        left: 0,
      },
    ])
    .webp({ quality: 84 })
    .toFile(salida);

  console.log(`${nombre.padEnd(16)} ${(fs.statSync(salida).size / 1024).toFixed(0)} KB`);
}
