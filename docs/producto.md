# Especificación de producto

## Visión

Kadó es una plataforma para que **cualquier persona regale tokens a otra
persona**, incluso si quien recibe no tiene wallet ni sabe de cripto. El receptor
abre su Kadó, se le crea una cuenta Stellar en ese momento, y los fondos son
suyos. El objetivo de largo plazo es que regalar valor digital sea tan simple
como mandar un enlace.

**Todo lo que sigue en este documento es la fase 1:** Kadós al portador generados
por un organizador y entregados por QR o código impreso en eventos presenciales
del chapter. Los eventos son la cuña de entrada, no el producto final. Las tres
fases y su relación con la visión están en `CLAUDE.md`, sección "Visión y fases".

## Los dos roles

**Organizador.** Es el chapter. Carga fondos, genera una tanda de Kadós para un
evento y los imprime o proyecta. Sabe lo que hace y su interfaz puede ser
mínima.

**Asistente.** Está en la sala, no tiene wallet, no sabe de cripto. Es quien se
transforma y donde va todo el esfuerzo de diseño.

## Flujo del asistente

1. Recibe un código impreso o escanea un QR proyectado.
2. Abre el enlace en su celular. Ve un Kadó cerrado. **No sabe cuánto hay.**
3. Toca para abrirlo. No se le pide correo, registro ni descarga.
4. Por detrás se le crea la cuenta Stellar patrocinada.
5. **El Kadó se abre y aparece el monto.** Ya es suyo.
6. Ve su saldo y cómo volver a entrar después.

El paso 5 es el producto. Todo lo demás existe para llegar ahí.

## Flujo del organizador

1. Genera N Kadós por un monto fijo para un evento.
2. Descarga los códigos o QR para imprimir o proyectar.
3. Ve un panel con cuántos se abrieron y en cuánto tiempo.
4. Recupera lo no abierto después de la expiración.

El panel **es la fuente de las métricas del piloto**, así que no es opcional
aunque sea feo.

## Dentro del alcance

- Un solo activo, un solo monto por tanda.
- Apertura por QR o código.
- Cuenta creada y patrocinada al abrir.
- Monto oculto hasta la apertura.
- Expiración con devolución al organizador.
- Panel de métricas.
- Mainnet al final, con montos bajos.

## Fuera del alcance

Dos listas distintas, y la diferencia importa: lo diferido tiene fase asignada y
no debe bloquearse; lo descartado no vuelve sin evidencia nueva.

**Diferido a fases posteriores.**

- Correo u otro identificador como destinatario, y Kadós dirigidos entre
  personas — fase 2.
- Múltiples activos, montos variables por Kadó, utilidad de los fondos después de
  recibidos y off-ramp — fase 3.

**Descartado, en cualquier fase.** Rendimiento o DeFi dentro del flujo de
apertura, el float como modelo de ingresos, red propia de comercios afiliados,
IA, x402, app nativa. Las razones están en `CLAUDE.md`.

## Vocabulario

| Se dice | No se dice |
|---|---|
| Kadó | vale, cupón, ticket, gift card |
| Abrir | canjear, reclamar, redimir |
| Dólares digitales | USDC, cripto, token |
| El evento te dejó un Kadó | te dejaron algo, alguien te mandó |

Se puede decir regalo. No se puede inventar un remitente personal.

## Métricas del piloto

| Métrica | Cómo se mide |
|---|---|
| Kadós abiertos | Conteo on-chain de balances reclamados |
| Cuentas Stellar nuevas | Cuentas creadas por la patrocinadora |
| Tasa de apertura | Abiertos sobre repartidos |
| Segundos hasta el monto | Instrumentado en el front |
| Eventos completados | Registro de activaciones |

La cuarta es la afirmación central del proyecto: recibir valor no debería
requerir convertirse en usuario de cripto.

## Criterios de aceptación

1. Un asistente sin cuenta previa abre su Kadó desde su celular en menos de un
   minuto.
2. La transacción es verificable en el explorador por alguien no técnico.
3. El monto permanece oculto hasta la apertura.
4. El organizador recupera lo no abierto.
5. El panel exporta las métricas de la tabla anterior.
