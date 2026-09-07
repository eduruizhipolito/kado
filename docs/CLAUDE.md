# CLAUDE.md — Kadó

Contexto permanente. Léelo antes de proponer cualquier cosa.

## El objeto

**Kadó** viene de *cadeau*, regalo en francés. Un Kadó es **una caja que se
abre**, no un cupón que se canjea. Esa distinción gobierna el producto entero.

La mecánica ya lo confirma: el monto está oculto hasta el momento de abrir. Un
cupón muestra su valor; un regalo lo esconde. El gesto es de apertura, no de
canje.

**La unidad es "un Kadó".** El organizador genera Kadós, el asistente abre su
Kadó. No se usan las palabras vale, cupón, ticket ni gift card en ninguna parte.

## Visión y fases

Kadó es una plataforma para que **cualquier persona regale tokens a otra
persona**, incluso si quien recibe no tiene wallet ni sabe de cripto. El receptor
abre su Kadó, se le crea una cuenta Stellar en ese momento, y los fondos son
suyos. El objetivo de largo plazo es que **regalar valor digital sea tan simple
como mandar un enlace**, sin que el receptor tenga que entender nada del sistema
por debajo.

Los eventos del Stellar Ambassador Chapter de Perú son la **cuña de entrada, no
el producto final**. Se eligieron porque:

- concentran gente sin wallet en un espacio controlado,
- dan una ocasión de uso clara, que era lo que el producto no tenía,
- permiten medir tasa de apertura con usuarios reales en 30 días.

Cuando la visión y el alcance del sprint choquen, **manda el alcance del
sprint**. Pero las decisiones de arquitectura se toman sabiendo hacia dónde va
esto.

### Fase 1 — la de ahora, 30 días

Kadós al portador generados por un organizador, entregados por QR o código
impreso en eventos presenciales. Un solo activo, un solo monto por tanda.

### Fase 2 — dirigidos, de persona a persona

Un remitente cualquiera elige un destinatario y un monto. Reintroduce el correo o
algún identificador como destinatario, y convierte el Kadó de portador en
dirigido.

### Fase 3 — activos, montos y utilidad

Múltiples activos, montos libres, y utilidad para los fondos después de
recibidos. El off-ramp y qué hace el receptor con el dinero siguen sin
resolverse, y son el riesgo principal de esta fase.

**No se construye la fase 2 ni la 3.** Lo que sí se cuida es no cerrarles la
puerta: las cuatro restricciones concretas están en `arquitectura.md`, sección
"Decisiones que no deben cerrar puertas".

## Regla de lenguaje

Se puede decir **regalo**. En un evento hay un dador real, el organizador, y
llamarlo regalo de bienvenida es cierto.

Lo que **no** se puede hacer es inventar un remitente personal. Nada de "te
dejaron algo" en singular ni de nombres de personas que no existen. El dador es
el evento o el chapter, y se nombra así.

## Qué es esto, hoy

Lo que sigue describe la **fase 1**. La visión completa está arriba.

Entrega de dólares digitales a personas **sin wallet**, en eventos presenciales
del Stellar Ambassador Chapter de Perú. El asistente recibe un código o escanea
un QR, abre su Kadó, y sale del evento con una cuenta Stellar propia y fondos
reales.

La primitiva central es **claimable balances** (CAP-23, Protocolo 14) más
**reservas patrocinadas** (CAP-33).

## Encuadre: piloto acotado, no exploración abierta

El alcance de 30 días es una **cuña**, no el producto entero: sirve para probar
la primitiva con usuarios reales en la ocasión de uso más clara que existe hoy.
Que sea una cuña no lo hace flexible.

Fase corta con entregables verificables. El alcance está congelado: un flujo
completo de entrega en un evento presencial, medido con métricas on-chain. Nada
de ideas vagas sin plan ni de roadmaps sin fecha; todo lo que se escriba se lee
como ejecución con artefactos comprobables.

Cualquiera debe poder verificar la evidencia **sin conocimiento técnico**.

## Usuario

Asistente a un meetup, taller introductorio o charla universitaria en Perú, que
**no tiene wallet** y no sabe de cripto. No es el usuario de hackathon: ese ya
tiene wallet, y eso está verificado con evidencia de primera mano.

La ocasión de uso es el evento, y eso define la **fase 1**: sin evento no hay
ocasión que medir en 30 días. En las fases siguientes la ocasión la pone el
remitente, no el calendario del chapter.

## Estado de la evidencia

- **Verificado:** en hackathons Web3 los asistentes ya tienen wallet. Por eso el
  piloto va en eventos de difusión, no de builders.
- **No verificado:** que un asistente sin wallet quiera quedarse con los fondos
  en vez de ignorarlos. El piloto existe para medir esto.
- **Sin resolver:** qué hace el receptor con los fondos después. No hay off-ramp.
  No prometer un ecosistema que no existe.

## Principios

1. **Cero jerga cripto** en el flujo del asistente. El lenguaje es "dólares
   digitales".
2. **Alcance angosto.** Toda capa nueva va al roadmap.
3. **Custodia declarada.** Si una decisión mete al operador en posición de
   custodio, se nombra.
4. **Verificabilidad on-chain como evidencia.** Los hashes de transacción son lo
   que cualquiera puede comprobar sin conocimiento técnico.

## Decisiones cerradas

- Cuenta del asistente: se crea **en el momento de abrir**.
- Entrega por **QR o código en el evento**. No por correo en esta fase.
- Monto oculto hasta la apertura.
- Kadós no abiertos vuelven al organizador por predicado de expiración.
- Testnet primero, mainnet solo al final.

## Al portador, y hay que decirlo

En esta fase quien tiene el código abre el Kadó. Es aceptable porque se entrega
en una sala controlada, pero **debe declararse**. El diseño objetivo es dirigido
a una persona; cerrar esa brecha es la fase 2.

## Descartado. No reproponer sin evidencia nueva

Esto no entra en **ninguna fase**. No está diferido: está descartado.

- **DeFi o rendimiento dentro del flujo de apertura.** Un claimable balance y un
  pool son mutuamente excluyentes: si los fondos van a un protocolo dejan de
  estar bloqueados on-chain y el operador pasa a ser custodio.
- **El float como modelo de ingresos.** ~22 puntos básicos sobre volumen con
  apertura promedio de 10 días, e incentivo invertido: se gana más cuando el
  Kadó NO se abre.
- **Red propia de comercios afiliados.** Es un producto entero.
- **IA, x402, gift card de retail.**

DeFindex es la ruta correcta si alguna vez hay rendimiento, porque es no
custodial y ya está integrado con Blend y Soroswap. Seguiría fuera del flujo de
apertura, y no entra en el alcance de esta fase.

## Diferido, no descartado

Está en la visión y tiene fase asignada. No se construye ahora, y no se toman
decisiones que lo bloqueen.

- **Kadós dirigidos entre personas**, con correo u otro identificador como
  destinatario — fase 2.
- **Wallets embebidas**, para identidad del destinatario y recuperación de
  acceso — fase 2. Privy es el candidato. La condición es que la clave siga
  siendo del receptor: una wallet embebida no custodial es compatible con la
  fase 2; una custodial no, porque devuelve al operador a la posición de
  custodio que el principio 3 obliga a evitar.
- **Múltiples activos y montos libres** — fase 3.
- **Utilidad de los fondos después de recibidos, y off-ramp** — fase 3, y es su
  riesgo principal. Sigue sin resolverse: no prometerlo.

## Riesgo a declarar siempre

Existe una **ventana de custodia** entre el depósito y la apertura en cualquiera
de las arquitecturas posibles. Cambia su tamaño, no su existencia.

## Referencias

- CAP-23: https://github.com/stellar/stellar-protocol/blob/master/core/cap-0023.md
- CAP-33: https://github.com/stellar/stellar-protocol/blob/master/core/cap-0033.md
