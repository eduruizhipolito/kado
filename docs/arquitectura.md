# Arquitectura

## Incógnitas bloqueantes: RESUELTAS en testnet

Verificadas el 2026-09-06 con `spike/incognitas.mjs`. Bitácora completa con los
hashes en `spike/salida/incognitas.json`. Las tres pasaron en la primera corrida.

**1. ¿Acepta `CreateClaimableBalanceOp` como `destination` una clave pública
cuya cuenta aún no existe?** → **Sí.**

Se creó un balance de 2 XLM hacia una cuenta inexistente y Horizon lo aceptó sin
objeción. El CAP-23 se comporta como estaba documentado.

`9163729d22c14c66eed586e2925ec590a475b02ac0432ef335b42c6560a0d94b`

**2. ¿Se puede encadenar en una sola transacción la creación de la cuenta
patrocinada y el `ClaimClaimableBalance`?** → **Sí. La apertura es un botón.**

Cuatro operaciones, dos firmas, una transacción. Fuente de la transacción es la
patrocinadora, porque el asistente no tiene XLM para pagar el fee.

```
1. beginSponsoringFutureReserves  fuente: patrocinadora  sponsoredId: asistente
2. createAccount startingBalance=0 fuente: patrocinadora
3. endSponsoringFutureReserves    fuente: asistente
4. claimClaimableBalance          fuente: asistente
```

Firman patrocinadora y asistente. `startingBalance: "0"` solo es válido porque
la cuenta va patrocinada (CAP-33).

`d3e637e953a3317705c97754384ed42da05addcbc18555ec40be9f0c6aa84067`

**3. Con un activo distinto de XLM, ¿cuál es el orden exacto?** → **`ChangeTrust`
va dentro del sándwich de patrocinio, antes del claim.**

```
1. beginSponsoringFutureReserves  fuente: patrocinadora  sponsoredId: asistente
2. createAccount startingBalance=0 fuente: patrocinadora
3. changeTrust                     fuente: asistente
4. endSponsoringFutureReserves     fuente: asistente
5. claimClaimableBalance           fuente: asistente
```

`ChangeTrust` tiene que ir **dentro** del sándwich: si va después, su reserva de
0,5 XLM la debería pagar el asistente, que tiene cero.

`35a50eb10cc3dff0bfe5d36e34f57be01c3462800b1a1e2f6b7f94f47db37e34`

### Control negativo: la transacción es atómica

Se intentó a propósito el mismo flujo **sin** `ChangeTrust`. Falló con
`op_no_trust` en la cuarta operación, y **la transacción entera se revirtió**:
la cuenta del asistente no llegó a existir.

```
{"transaction":"tx_failed","operations":["op_success","op_success","op_success","op_no_trust"]}
```

Esto es la mejor noticia del spike. **La atomicidad de Stellar resuelve gratis la
idempotencia del reclamo**: no existe el estado intermedio de "cuenta creada pero
Kadó sin abrir". O pasa todo o no pasa nada, y se puede reintentar sin riesgo de
doble entrega. Vale para el requisito de conectividad mala en sala.

`894bf87c9c021e5749ebc215b36a0b8ae6e3c457af9aa2a6f21a2a880abf2b8b` (creación del balance KDUSD)

### Costo real por Kadó, medido

Reserva base en la red: **0,5 XLM**. Una cuenta consume 2 reservas, una trustline
consume 1. Medido sobre la cuenta patrocinadora: `num_sponsoring` quedó en 5 tras
patrocinar dos cuentas de asistente, una de ellas con trustline.

| Concepto | Reservas | XLM inmovilizado |
|---|---|---|
| Kadó en XLM | 2 (cuenta) | 1,0 |
| Kadó en activo emitido, p. ej. USDC | 3 (cuenta + trustline) | 1,5 |

Las reservas no se gastan: quedan **inmovilizadas** en la patrocinadora mientras
la cuenta del asistente exista, que es para siempre. Hay que presupuestarlas como
capital bloqueado, no como gasto. Cien Kadós con activo emitido inmovilizan
150 XLM.

Medido después sobre una tanda real de 5 Kadós: un claimable balance con dos
reclamantes inmoviliza **2 reservas**, exactamente las mismas que después
consume la cuenta del asistente al abrirlo. La cifra no cambia entre el momento
de generar la tanda y el de abrirla, así que se presupuesta una sola vez:

| Momento | Qué ocupa las reservas | Reservas |
|---|---|---|
| Kadó generado, sin abrir | El claimable balance | 2 |
| Kadó abierto en XLM | La cuenta del asistente | 2 |
| Kadó abierto en activo emitido | La cuenta más su trustline | 3 |

Es decir: **1,0 XLM por Kadó desde que se genera**, y sube a 1,5 al abrirse si el
activo no es nativo. La patrocinadora tiene que tenerlo disponible antes del
evento, no durante.

Las comisiones son ruido: las cinco transacciones del spike costaron 0,00017 XLM
en total.

### Hallazgo no previsto: el asistente queda con cero XLM

En el caso del activo emitido, el asistente termina con 2,00 KDUSD y **0,0000000
XLM**. No puede pagar el fee de ninguna operación futura por sí mismo.

Consecuencias que hay que asumir en el diseño:

- La acción "Enviar a otro lado" de la pantalla P4 **no puede funcionar sola**.
  Necesita que la patrocinadora la pague, con fee-bump o siendo la fuente de la
  transacción. Es una dependencia operativa permanente, no un detalle.
- Si el Kadó se entrega en XLM el problema desaparece: el asistente recibe XLM
  y paga sus propios fees. Es un argumento fuerte a favor de XLM para el piloto.
- Sea cual sea el activo, **la patrocinadora es infraestructura crítica de por
  vida**, no solo durante el evento.

### Reproducir

```
npm install
node spike/incognitas.mjs
```

Crea sus propias cuentas con friendbot en cada corrida y no lee ningún secreto.

## Ventaja de la variante por Kadó

Como el Kadó se genera del lado del organizador, **el keypair se crea al generar
la tanda**. La clave pública se conoce desde el inicio, así que la incógnita 1
deja de ser bloqueante en la práctica: siempre hay un `destination` disponible.

El código impreso es el que permite descifrar o recuperar esa clave en el
navegador del asistente.

## Flujo técnico

**Generación de tanda:**
1. Se generan N keypairs efímeros.
2. Se crean N claimable balances, uno por keypair, con dos reclamantes:
   - el keypair, con `predicateBeforeAbsoluteTime(expiración)`
   - el organizador, con la negación del anterior
3. Se emiten N códigos o QR que contienen o derivan la clave.

**Reclamo:**
1. El asistente abre el enlace con el código.
2. Se crea y patrocina la cuenta del keypair.
3. `ChangeTrust` si el activo lo requiere.
4. `ClaimClaimableBalance`.
5. Se muestra el monto y el hash.

**Expiración:** job que detecta vencidos y habilita la recuperación por el
organizador.

## Componentes

| Componente | Responsabilidad |
|---|---|
| Generador de tandas | Keypairs, balances, códigos, QR imprimibles |
| Página de reclamo | Estática o casi. Lee estado de Horizon |
| Cuenta patrocinadora | Paga reservas y comisiones. Requiere monitoreo de saldo |
| Panel del organizador | Estado por Kadó y exportación de métricas |
| Job de expiración | Detecta vencidos |
| Indexador | Polling de Horizon para sincronizar estados |

## Consideraciones

- **Idempotencia.** El reclamo puede reintentarse. Nunca doble entrega.
- **El asistente no tiene XLM.** Todas sus operaciones las paga la
  patrocinadora. Si se queda sin saldo se rompen todos los reclamos: alerta
  obligatoria antes del primer evento.
- **Conectividad en sala.** El wifi de un evento es malo. Probar en 3G lenta y
  diseñar reintentos. Es el riesgo operativo más subestimado del piloto.
- **El monto oculto es solo de UI.** El monto es público en la cadena. No
  presentarlo como privacidad.
- **Secretos fuera del repositorio** desde el primer commit.
- **Mainnet al final**, con montos bajos y tope por evento.

## Decisiones que no deben cerrar puertas

La fase 1 es lo único que se construye. Estas cuatro restricciones existen para
que las fases 2 y 3 —descritas en `CLAUDE.md`, sección "Visión y fases"— sigan
siendo posibles sin rehacer lo hecho. Ninguna pide trabajo extra hoy ni cambia la
interfaz de fase 1: piden no cerrar la puerta.

1. **Una tanda puede tener tamaño uno y no tener evento.** El modelo de datos no
   debe asumir que un Kadó pertenece a una tanda de evento. En la fase 2, un
   regalo de una persona a otra es exactamente eso: una tanda de un Kadó, sin
   evento asociado. En el manifiesto de `tandas/`, `evento` y `fecha` son
   descripción de la ocasión, no la identidad de la tanda.
2. **El creador de un Kadó es una entidad genérica.** No acoplar la generación al
   rol de organizador. La fase 1 solo expone ese rol y así debe seguir, pero
   nada del esquema ni de las firmas debe nombrarlo como el único creador
   posible: en la fase 2 el creador es un remitente cualquiera.
3. **El monto no es fijo a nivel de esquema.** La interfaz de fase 1 expone un
   monto único por tanda, y eso no cambia. Lo que no debe pasar es que el monto
   por Kadó exista *solo* como campo de la tanda: cada Kadó tiene el suyo, aunque
   hoy todos valgan lo mismo.
4. **La apertura es independiente de cómo llegó el código.** Un enlace directo
   funciona igual que un QR impreso o un código tecleado a mano. El flujo de
   apertura no debe depender del canal de entrega, porque la fase 2 entrega por
   enlace y no por sala.

Nada de esto autoriza a construir la fase 2 o la 3. Es el criterio para elegir
entre dos implementaciones equivalentes de la fase 1.

## RPC o Horizon: evaluado y resuelto

El skill oficial `stellar-dev:data` dice que **Stellar RPC es lo preferido para
proyectos nuevos y Horizon es legacy**. La pregunta es legítima, así que se
evaluó en serio. **Kadó se queda en Horizon**, y no es inercia: con RPC el
producto no se puede construir.

**1. RPC no tiene búsqueda indexada sobre datos clásicos.** Su método de lectura
es `getLedgerEntries`, que exige la clave exacta de la entrada. Las dos consultas
sobre las que se apoya todo el sistema no tienen equivalente:

| Consulta | Para qué | Existe en RPC |
|---|---|---|
| `claimableBalances().claimant(pk)` | Encontrar el Kadó de un código | No |
| `accounts().sponsor(pk)` | Listar los asistentes del piloto | No |

Sin la primera, el código impreso no puede encontrar su Kadó y hace falta una
base de datos. La arquitectura sin base de datos existe *porque* Horizon indexa.

**2. RPC retiene siete días.** Los Kadós vencen a los catorce, y la evidencia
del piloto tiene que seguir consultable bastante después de que cierre el
evento. RPC habría olvidado el primer piloto antes de poder revisarlo.

**3. `rpc.getAccount()` devuelve menos.** Sólo lo necesario para armar una
transacción. El panel necesita `balances`, `num_sponsoring` y el historial de
operaciones, que es la "rich account metadata" que el propio skill le atribuye a
Horizon.

**4. Kadó no tiene contratos.** La preferencia por RPC se apoya en simulación,
eventos de contrato y storage de Soroban. Acá no hay nada de eso: claimable
balances y reservas patrocinadas son protocolo clásico puro.

El skill tampoco documenta CAP-23 ni CAP-33 en ninguno de sus ocho archivos. La
primitiva central de este producto no está cubierta, que es exactamente por qué
el spike de testnet fue necesario.

**Cuándo reabrir esta decisión:** si la SDF anuncia una fecha de apagado de
Horizon, o si el producto incorpora contratos. Hoy no hay fecha anunciada.

## Límites operativos que impone Horizon

**Límite de peticiones.** Cuarenta personas abriendo su Kadó en el mismo minuto
son cuarenta rondas de consultas desde la misma IP de Vercel. Todas las lecturas
pasan por `conReintento`, con espera exponencial y algo de azar para que los
reintentos de la sala no vuelvan a caer juntos. El envío de transacciones **no**
se reintenta a ciegas: de una respuesta perdida se ocupa la relectura de estado,
porque la transacción pudo haber entrado igual.

**Envío síncrono.** `submitTransaction` no responde hasta que cierra el ledger,
unos cinco segundos. Medido: 4,8 s del lado del servidor. El límite por defecto
de una función serverless en Vercel son 10 s, un margen de dos segundos sobre el
tiempo de bloque de una red pública. La ruta de apertura declara
`maxDuration = 60`.

**El tiempo de apertura se lee del reclamo, no de la cuenta.** `last_modified_time`
parecía un proxy razonable y sale gratis en la consulta que ya se hacía. Es
correcto sólo mientras el asistente no vuelva a tocar su cuenta. Medido sobre una
cuenta real que movió sus fondos: el proxy decía 14,2 minutos y la apertura había
sido a los 4,9. La métrica se corrompe justo cuando el producto empieza a
funcionar, así que se lee el `created_at` de la operación
`claim_claimable_balance`, que no cambia nunca.

## El comprobante va a la cuenta, no a la transaccion

La pagina de la transaccion en el explorador lista **operaciones**, y las cuatro
operaciones de una apertura se leen asi:

```
GDBH...JVDM created account GDMY...PF52 with starting balance 0 XLM
GDMY...PF52 claimed balance 0000...62d1
```

El monto entregado esta en la cadena como **efecto** (`claimable_balance_claimed`,
`account_credited`), no como operacion. Un asistente que abre su comprobante ve
un unico numero, y ese numero es **cero**.

Eso incumplia el criterio de aceptacion 2 de `producto.md`: "La transaccion es
verificable en el explorador por alguien no tecnico".

La pagina de la **cuenta** si lo muestra: el saldo en grande, su equivalente en
dolares, quien la creo y la transaccion que la origino. "Ver comprobante" apunta
ahi. El hash de la transaccion se conserva igual para la evidencia del piloto,
donde quien la revise si sabe leer operaciones.

## La tasa se verifica contra el mercado

La tasa la elige el organizador y se congela en la tanda, que es lo correcto. El
riesgo es equivocarse: el Kado dice "$2.00" y el explorador muestra otra cosa, y
eso lo nota cualquiera que abra el comprobante.

El generador consulta el precio de referencia en stellar.expert y avisa si la
tasa se aparta mas de un 15%. No bloquea: la decision es del organizador, y una
API caida no es motivo para no generar la tanda.

**En testnet el explorador miente sobre el valor en dolares, y es esperable.**
Medido el 2026-09-06:

| Fuente | XLM/USD |
|---|---|
| CoinGecko | 0,1855 |
| stellar.expert, red publica | 0,1854 |
| stellar.expert, **testnet** | 0,1571 |

El XLM de testnet no tiene mercado, asi que su instancia del explorador arrastra
un precio viejo. Un Kado de $2 generado con la tasa correcta se ve como ~$1,69
en el explorador de testnet y como $2,00 en el de mainnet. No hay nada que
arreglar: es la unica cifra del sistema que no se puede verificar hasta generar
en mainnet. La comprobacion de la tasa se hace siempre contra la red publica.

## Stack

Definir con el usuario. Restricción real: la página de reclamo debe cargar
rápido en un celular de gama baja con mala señal.

- SDK: `@stellar/stellar-sdk`
- Red: testnet durante el desarrollo, mainnet al final

## Evidencia del piloto

Guardar y publicar los **hashes de transacción** de cada hito. Es lo que
cualquiera puede verificar sin conocimiento técnico, y es la diferencia entre
artefacto y afirmación.

## Nota de vocabulario

En este documento se usa "reclamo" porque es el término del protocolo
(`ClaimClaimableBalance`, claimant, predicado). **En el producto, el asistente
abre un Kadó.** Nunca reclama, canjea ni redime. La distinción es entre el
código y la interfaz, y no debe filtrarse a las pantallas.
