# Kadó

[English](README.md) · **Español**

Una plataforma para que **cualquier persona regale tokens a otra**, aunque quien
recibe no tenga wallet ni sepa de cripto. Abre su Kadó, se le crea una cuenta
Stellar en ese momento, y los fondos son suyos. El objetivo de largo plazo es que
regalar valor digital sea tan simple como mandar un enlace.

Un Kadó es **una caja que se abre**, no un cupón que se canjea. El monto está
oculto hasta el momento de abrir.

**Primer despliegue:** eventos presenciales del Stellar Ambassador Chapter de
Perú. El asistente recibe un código impreso o escanea un QR proyectado, abre su
Kadó, y sale del evento con una cuenta Stellar propia y fondos reales. Todo lo
que sigue es la fase 1 — los eventos son la cuña de entrada, no el producto
final. Las tres fases están en [`docs/CLAUDE.md`](docs/CLAUDE.md).

---

## Pruébalo

Hay una tanda de Kadós de demo en **testnet**. Entra al sitio y escribe uno de
los códigos de abajo — a propósito no hay un enlace por código, para que los bots
no los agoten.

**https://kado-stellar.vercel.app**

| Código |
|---|
| `DXPQ-JDGB-QMWQ` |
| `BG13-KTAR-HNK5` |
| `PZHG-VTN2-1PJW` |
| `F9JF-D7YK-6D7V` |
| `W05T-FVH6-D84X` |
| `1X59-7BCD-JTZ5` |
| `6AFB-8WQP-6DCB` |
| `AC1H-F562-H366` |
| `QXC6-Y8J2-TJR4` |
| `6FYY-5360-GRDS` |

Cada Kadó tiene 10 XLM de testnet, que no valen nada en el mercado — esto es para
ver el flujo, no para recibir fondos. Los códigos son **al portador**: el primero
que abre uno se lo queda, así que algunos pueden estar ya usados. La lista se
rota a medida que se gastan; el organizador ve cuáles siguen abiertos con
`npm run estado-tanda`.

## Problema

Entregar valor digital a alguien sin wallet obliga a convertirlo antes en usuario
de cripto: instalar una app, resguardar una frase semilla y conseguir fondos,
todo antes de tener nada que recibir. El regalo llega después de la tarea, y casi
nadie termina la tarea.

Los eventos de difusión del ecosistema en Perú son donde eso se ve más denso, y
por eso el piloto empieza ahí: generan interés pero no conversión. El asistente
sin wallet no completa el onboarding en sala, y hoy no existe una forma de que
salga del evento con una cuenta Stellar propia y fondos reales en menos de un
minuto.

## Solución

Una transacción, dos firmas, un botón.

El organizador genera una tanda de Kadós antes del evento: N keypairs efímeros y
N claimable balances (CAP-23), cada uno con dos reclamantes — el asistente hasta
la expiración, el organizador después de ella. Los códigos se imprimen o se
proyectan.

El asistente abre el enlace, toca "Abrir", y en una sola transacción se le crea
la cuenta con reservas patrocinadas (CAP-33) y se le entrega el Kadó. Nunca ve
una frase semilla, no instala nada, no da su correo.

Nada de ese flujo depende de que el código venga impreso. Un enlace directo
funciona igual que un QR proyectado, que es lo que va a necesitar la fase 2.

## Estado por módulo

| Módulo | Estado | Nota |
|---|---|---|
| Validación de la primitiva on-chain | **Hecho** | Tres incógnitas resueltas en testnet, con hashes |
| Generador de tandas | **Hecho** | CLI del organizador: keypairs, balances, códigos imprimibles |
| Página de apertura | **Hecho** | Probada de punta a punta en testnet |
| Panel del organizador | **Hecho** | Métricas y exportación CSV, todo desde la cadena |
| Acumular varios Kadós | **Hecho** | El segundo código paga a la cuenta que la persona ya tiene |
| QR imprimibles | Pendiente | Hoy el CSV trae el enlace; falta la hoja para imprimir |
| Job de expiración | Pendiente | Los predicados ya están puestos; falta el barrido |
| Mainnet | Pendiente | Al final, montos bajos |

### La pantalla de saldo

Es la cuenta de la persona, y muestra las tres acciones de una: **Enviar**,
**Recibir** y **Abrir otro**. Sólo la tercera funciona.

- **Abrir otro** vuelve a la pantalla del código. Si el código es válido, el
  Kadó **no** crea una segunda cuenta: se abre y en la misma transacción paga a
  la cuenta que la persona ya tiene, así que el saldo sube y sigue habiendo un
  solo número verificable en el explorador. La cuenta del segundo código queda
  creada y en cero, que es exactamente el estado "ya fue abierto": su enlace
  sigue diciendo la verdad más tarde.
- **Enviar** va al roadmap. Depende de que la patrocinadora pague el fee del
  asistente, que con un activo emitido no tiene XLM, y eso es una capa entera.
- **Recibir** va al roadmap por la misma razón.

La acción "Guardar mi acceso" del diseño P4 no se construye: no se generan
accesos directos. El enlace *es* el acceso, y la pantalla lo dice ("guarda este
enlace para volver a entrar").

## Evidencia on-chain

Todo lo de abajo ocurrió en **testnet** y es verificable por cualquiera, sin
conocimiento técnico: se abre el enlace y se ve la transacción.

| Qué demuestra | Transacción |
|---|---|
| Se puede crear un Kadó dirigido a una cuenta que todavía no existe | [`916372…`](https://stellar.expert/explorer/testnet/tx/9163729d22c14c66eed586e2925ec590a475b02ac0432ef335b42c6560a0d94b) |
| Un asistente sin cuenta ni fondos abre su Kadó en una sola transacción | [`d3e637…`](https://stellar.expert/explorer/testnet/tx/d3e637e953a3317705c97754384ed42da05addcbc18555ec40be9f0c6aa84067) |
| Lo mismo con un activo emitido, incluyendo la trustline patrocinada | [`35a50e…`](https://stellar.expert/explorer/testnet/tx/35a50eb10cc3dff0bfe5d36e34f57be01c3462800b1a1e2f6b7f94f47db37e34) |

Bitácora completa en [`spike/salida/incognitas.json`](spike/salida/incognitas.json).
Análisis en [`docs/arquitectura.md`](docs/arquitectura.md).

Reproducible en cualquier máquina:

```bash
npm install && node spike/incognitas.mjs
```

El script crea sus propias cuentas con friendbot en cada corrida. No lee ningún
secreto.

## Stack

- Next.js 16 (App Router) sobre Vercel, TypeScript, Tailwind v4
- [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) v17
- Red: testnet durante el desarrollo, mainnet al final

**No hay base de datos, y es una decisión de diseño.** El código impreso deriva
el keypair del Kadó con scrypt, y el keypair encuentra su claimable balance en
Horizon. El estado vive en la cadena, que es donde `producto.md` ya definía las
métricas. Menos piezas que fallen en una sala con mal wifi, y cada número del
panel es verificable por cualquiera sin que tenga que creernos nada.

Lo único que no está en la cadena es cuánto vale el Kadó en dólares, porque el
monto on-chain está en XLM. Eso vive en el manifiesto público de cada tanda,
en `tandas/`.

### El activo, y por qué el monto dice dólares

El piloto entrega **XLM** mostrando su equivalente en dólares. USDC entra en una
fase posterior.

La tasa se congela **al generar la tanda**, nunca al abrir. Si se consultara el
precio en vivo, dos personas de la misma sala verían montos distintos por el
mismo regalo. El organizador decide "$2 por Kadó", el sistema calcula los XLM, y
todos ven `$2.00`.

## Cómo correrlo

```bash
npm install
cp .env.example .env     # completar con una cuenta de testnet
npm run dev
```

Generar una tanda para un evento:

```bash
npx tsx --env-file-if-exists=.env scripts/generar-tanda.ts --evento "Meetup Stellar Lima #7" --fecha 2026-09-20 --cantidad 40 --usd 2 --tasa 0.1855 --vence-en 14
```

Esa forma funciona igual en PowerShell, cmd y bash. La versión corta
`npm run generar-tanda -- ...` **sólo funciona en bash**: PowerShell se traga el
`--` suelto y npm termina interpretando las banderas como configuración suya, así
que al script le llegan los valores sin nombre. Si pasa, el generador lo detecta
y lo dice. En PowerShell la variante con comillas también sirve:
`npm run generar-tanda '--' --evento "..." ...`

`--tasa` es el precio de mercado en dólares por XLM al momento de generar. El
generador lo compara contra stellar.expert y avisa si se aparta más de un 15%:
si la tasa está mal, el Kadó anuncia un valor que el explorador contradice, y eso
lo nota cualquiera que abra el comprobante.

Escribe dos archivos en `tandas/`:

- `<id>.json` — manifiesto público. Se versiona: no tiene ningún secreto.
- `<id>.codigos.csv` — **los códigos para imprimir. Nunca se versiona.** Quien
  tiene un código abre ese Kadó.

Ver qué códigos de una tanda siguen abiertos, cruzando el CSV local con la
cadena:

```bash
npx tsx --env-file-if-exists=.env scripts/estado-tanda.ts --tanda <id>
npx tsx --env-file-if-exists=.env scripts/estado-tanda.ts --tanda <id> --markdown
```

El primero imprime una tabla y un resumen; `--markdown` imprime solo los códigos
aún disponibles, listos para pegar en la lista de arriba. Mismo detalle de
PowerShell que el generador: el atajo `npm run estado-tanda -- ...` sólo funciona
en bash.

El panel del organizador está en `/panel`.

## Limitaciones conocidas

Se declaran acá porque omitirlas sería peor que tenerlas.

- **Al portador.** En esta fase, quien tiene el código abre el Kadó. Es aceptable
  porque se entrega en una sala controlada. El diseño objetivo es dirigido a una
  persona; cerrar esa brecha es la fase 2.
- **El código es la llave.** Doce caracteres, 60 bits de entropía, derivados a
  keypair con scrypt. Enumerarlos es inviable, pero el CSV de códigos de una
  tanda es material sensible mientras el evento no haya pasado: quien lo tenga
  puede abrir todos los Kadós.
- **Ventana de custodia.** Entre el depósito y la apertura existe una ventana en
  la que el operador tiene control efectivo. Ninguna arquitectura posible la
  elimina; solo cambia su tamaño.
- **El monto oculto es de interfaz, no de privacidad.** El monto es público en la
  cadena desde que se crea el Kadó.
- **La patrocinadora es infraestructura crítica.** Paga todas las reservas y
  comisiones. Si se queda sin saldo, se rompen todas las aperturas. Y sigue
  siendo necesaria después del evento: con un activo emitido, el asistente queda
  con cero XLM y no puede pagar el fee de ninguna operación propia.
- **Reservas inmovilizadas.** Cada Kadó inmoviliza 1,0 XLM (activo nativo) o
  1,5 XLM (activo emitido) mientras la cuenta del asistente exista. Es capital
  bloqueado, no gasto.
- **No hay off-ramp.** Qué hace el receptor con los fondos después está sin
  resolver. El piloto no promete un ecosistema que no existe.
- **Sin evento no hay producto, en la fase 1.** La ocasión de uso es el evento
  presencial, y es lo que hace medible el piloto en 30 días. De la fase 2 en
  adelante, la ocasión la pone el remitente.

## Fuera de alcance, declarado

Dos listas distintas, y la diferencia importa: lo diferido tiene fase asignada y
no debe bloquearse; lo descartado no vuelve sin evidencia nueva.

**Diferido a fases posteriores.**

- Correo u otro identificador como destinatario, y Kadós dirigidos entre
  personas — fase 2.
- Wallets embebidas, para identidad del destinatario y recuperación de acceso —
  fase 2. Privy es el candidato. La condición es que la clave siga siendo del
  receptor: una wallet embebida no custodial encaja en la fase 2, una custodial
  no, porque devuelve al operador a la posición de custodio.
- Múltiples activos, montos variables por Kadó, utilidad de los fondos después de
  recibidos y off-ramp — fase 3.

**Descartado, en cualquier fase.** Rendimiento o DeFi dentro del flujo de
apertura, el float como modelo de ingresos, red propia de comercios afiliados,
wallets custodiales, multichain, API pública, app nativa. Las razones están en
[`docs/CLAUDE.md`](docs/CLAUDE.md).

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | Contexto permanente, principios, decisiones cerradas |
| [`docs/producto.md`](docs/producto.md) | Flujos, alcance, vocabulario, métricas |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Diseño técnico y resultados del spike |
| [`docs/logo.md`](docs/logo.md) | La marca: concepto, construcción, usos |
| [`docs/stitch-brief.md`](docs/stitch-brief.md) | Prompts de diseño de las pantallas |

## Referencias

- [CAP-23 — Claimable balances](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0023.md)
- [CAP-33 — Sponsored reserves](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0033.md)
