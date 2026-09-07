# Logo de Kadó

## Concepto

El logo es **la caja abierta**. Representa el momento central del producto: la
tapa ya se separó, el interior coral empieza a aparecer y el regalo está a
punto de revelarse.

El nombre vive dentro del objeto. **Ka** ocupa la cara izquierda y **Dó** la
derecha; ambas sílabas siguen la inclinación de la superficie que las contiene.
Al juntarse visualmente forman Kadó sin necesitar un rótulo adicional.

## Construcción

- Caja completa en perspectiva isométrica, con dos caras y tapa elevada.
- Punta interior, unión central y extremos inferiores siempre íntegros.
- Violeta como material exterior y coral reservado para el interior visible.
- Texto crema en peso `800`, deformado según el plano de cada cara.
- Sin moño, cinta, confeti, monedas ni iconografía de Stellar.

El volumen tonal pertenece únicamente al logo. No cambia la regla de la
interfaz: las pantallas de apertura siguen usando colores planos, sin sombras ni
degradados decorativos.

## Archivos

- `/brand/kado-logo.svg`: fuente principal, escalable y con fondo transparente.
  Es la que usa la portada de entrada por código (`app/page.tsx`), sobre violeta.
- `/brand/kado-logo.png`: exportación raster de 1024 × 1024 px con transparencia.
- `app/icon.svg`: versión para favicon y accesos directos, sobre fondo crema.

## Área de protección y tamaño mínimo

Mantener alrededor del logo un espacio libre equivalente a la mitad del ancho
de una de las caras. El logo completo con sílabas se recomienda desde 48 px en
pantalla y 12 mm impreso. En tamaños menores debe comprobarse que la tilde de
**Dó** siga siendo visible.

## Usos incorrectos

- No separar las sílabas de sus respectivas caras.
- No poner **Ka** y **Dó** horizontales: deben acompañar la perspectiva.
- No cortar las puntas, la unión central ni los extremos de la caja.
- No añadir un segundo “Kadó” debajo del símbolo.
- No añadir moños, cintas, confeti, monedas ni símbolos de Stellar.
- No usar la marca en la ceremonia de apertura (`/k/[codigo]`: cerrado,
  abriendo, abierto): allí la pantalla misma es el Kadó y el protagonismo
  pertenece al gesto. Sí aparece en la portada de entrada por código, que es la
  puerta de la app y no parte de la ceremonia.
