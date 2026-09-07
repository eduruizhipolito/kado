# Kadó

**English** · [Español](README.es.md)

A platform for **anyone to gift tokens to anyone else**, even when the person
receiving has no wallet and knows nothing about crypto. They open their Kadó, a
Stellar account is created for them right then, and the funds are theirs. The
long-term goal is for gifting digital value to be as simple as sending a link.

A Kadó is **a box that opens**, not a coupon that gets redeemed. The amount is
hidden until the moment it opens.

**First deployment:** in-person events of the Stellar Ambassador Chapter of Peru.
The attendee gets a printed code or scans a projected QR, opens their Kadó, and
leaves the event with their own Stellar account and real funds. Everything below
is phase 1 — the events are the wedge in, not the finished product. The three
phases are in [`docs/CLAUDE.md`](docs/CLAUDE.md).

---

## Try it

A batch of demo Kadós is live on **testnet**. Open the site and type one of the
codes below — no link per code on purpose, so crawlers don't drain them.

<!-- Replace with the Vercel URL once deployed -->
**https://YOUR-VERCEL-URL**

| Code |
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

Each Kadó holds 10 testnet XLM, which has no market value — this is to see the
flow, not to receive funds. Codes are **bearer**: whoever opens one first keeps
it, so some may already be spent. The list is rotated as codes run out; the
organizer tracks which are still open with `npm run estado-tanda`.

## Problem

Handing digital value to someone without a wallet means turning them into a
crypto user first: install an app, safeguard a seed phrase, get funds — all
before there is anything to receive. The gift arrives after the homework, and
most people never finish it.

Ecosystem outreach events in Peru are where that shows up densest, which is why
the pilot starts there: they generate interest but not conversion. An attendee
without a wallet can't finish onboarding in the room, and today there's no way
for them to walk out of the event with their own Stellar account and real funds
in under a minute.

## Solution

One transaction, two signatures, one button.

Before the event the organizer generates a batch of Kadós: N ephemeral keypairs
and N claimable balances (CAP-23), each with two claimants — the attendee until
expiration, the organizer after it. The codes are printed or projected.

The attendee opens the link, taps "Open", and in a single transaction their
account is created with sponsored reserves (CAP-33) and the Kadó is delivered.
They never see a seed phrase, install nothing, give no email.

Nothing in that flow depends on the code having been printed. A direct link
works the same as a projected QR, which is what phase 2 will need.

## Status by module

| Module | Status | Note |
|---|---|---|
| On-chain primitive validation | **Done** | Three unknowns resolved on testnet, with hashes |
| Batch generator | **Done** | Organizer CLI: keypairs, balances, printable codes |
| Opening page | **Done** | Tested end to end on testnet |
| Organizer dashboard | **Done** | Metrics and CSV export, all from the chain |
| Stacking several Kadós | **Done** | The second code pays into the account the person already has |
| Printable QRs | Pending | Today the CSV carries the link; the print sheet is missing |
| Expiration job | Pending | The predicates are already set; the sweep is missing |
| Mainnet | Pending | At the end, low amounts |

### The balance screen

It's the person's account, and it shows the three actions of one: **Send**,
**Receive** and **Open another**. Only the third works.

- **Open another** returns to the code screen. If the code is valid, the Kadó
  does **not** create a second account: it opens and, in the same transaction,
  pays into the account the person already has, so the balance goes up and there
  is still a single number verifiable in the explorer. The second code's account
  is left created and at zero, which is exactly the "already opened" state: its
  link still tells the truth later on.
- **Send** is on the roadmap. It depends on the sponsor account paying the
  attendee's fee, who with an issued asset holds no XLM, and that's a whole
  layer.
- **Receive** is on the roadmap for the same reason.

The "Save my access" action from the P4 design is not built: no shortcuts are
generated. The link *is* the access, and the screen says so ("save this link to
come back in").

## On-chain evidence

Everything below happened on **testnet** and is verifiable by anyone, without
technical knowledge: open the link and see the transaction.

| What it proves | Transaction |
|---|---|
| A Kadó can be created addressed to an account that does not yet exist | [`916372…`](https://stellar.expert/explorer/testnet/tx/9163729d22c14c66eed586e2925ec590a475b02ac0432ef335b42c6560a0d94b) |
| An attendee with no account or funds opens their Kadó in a single transaction | [`d3e637…`](https://stellar.expert/explorer/testnet/tx/d3e637e953a3317705c97754384ed42da05addcbc18555ec40be9f0c6aa84067) |
| The same with an issued asset, including the sponsored trustline | [`35a50e…`](https://stellar.expert/explorer/testnet/tx/35a50eb10cc3dff0bfe5d36e34f57be01c3462800b1a1e2f6b7f94f47db37e34) |

Full log in [`spike/salida/incognitas.json`](spike/salida/incognitas.json).
Analysis in [`docs/arquitectura.md`](docs/arquitectura.md).

Reproducible on any machine:

```bash
npm install && node spike/incognitas.mjs
```

The script creates its own accounts with friendbot on every run. It reads no
secret.

## Stack

- Next.js 16 (App Router) on Vercel, TypeScript, Tailwind v4
- [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk) v17
- Network: testnet during development, mainnet at the end

**There is no database, and it's a design decision.** The printed code derives
the Kadó's keypair with scrypt, and the keypair finds its claimable balance on
Horizon. State lives on the chain, which is where `producto.md` already defined
the metrics. Fewer pieces to fail in a room with bad wifi, and every number on
the dashboard is verifiable by anyone without having to take our word for it.

The only thing not on the chain is how much the Kadó is worth in dollars,
because the on-chain amount is in XLM. That lives in each batch's public
manifest, under `tandas/`.

### The asset, and why the amount says dollars

The pilot hands out **XLM** while showing its dollar equivalent. USDC comes in a
later phase.

The rate is frozen **when the batch is generated**, never at opening time. If
the price were queried live, two people in the same room would see different
amounts for the same gift. The organizer decides "$2 per Kadó", the system
computes the XLM, and everyone sees `$2.00`.

## How to run it

```bash
npm install
cp .env.example .env     # fill in with a testnet account
npm run dev
```

Generate a batch for an event:

```bash
npx tsx --env-file-if-exists=.env scripts/generar-tanda.ts --evento "Meetup Stellar Lima #7" --fecha 2026-09-20 --cantidad 40 --usd 2 --tasa 0.1855 --vence-en 14
```

That form works the same in PowerShell, cmd and bash. The short version
`npm run generar-tanda -- ...` **only works in bash**: PowerShell swallows the
loose `--` and npm ends up reading the flags as its own config, so the script
receives the values without names. If that happens, the generator detects it and
says so. In PowerShell the quoted variant also works:
`npm run generar-tanda '--' --evento "..." ...`

`--tasa` is the market price in dollars per XLM at generation time. The generator
compares it against stellar.expert and warns if it's off by more than 15%: if
the rate is wrong, the Kadó announces a value the explorer contradicts, and
anyone who opens the receipt will notice.

It writes two files under `tandas/`:

- `<id>.json` — public manifest. Version-controlled: it holds no secret.
- `<id>.codigos.csv` — **the codes to print. Never version-controlled.** Whoever
  holds a code opens that Kadó.

Check which codes of a batch are still open, cross-referencing the local CSV with
the chain:

```bash
npx tsx --env-file-if-exists=.env scripts/estado-tanda.ts --tanda <id>
npx tsx --env-file-if-exists=.env scripts/estado-tanda.ts --tanda <id> --markdown
```

The first prints a table plus a summary; `--markdown` prints just the still-open
codes, ready to paste back into the batch above. Same PowerShell caveat as the
generator: the `npm run estado-tanda -- ...` shorthand only works in bash.

The organizer dashboard is at `/panel`.

## Known limitations

Stated here because leaving them out would be worse than having them.

- **Bearer.** In this phase, whoever holds the code opens the Kadó. It's
  acceptable because it's handed out in a controlled room. The target design is
  addressed to a person; closing that gap is phase 2.
- **The code is the key.** Twelve characters, 60 bits of entropy, derived to a
  keypair with scrypt. Enumerating them is infeasible, but a batch's code CSV is
  sensitive material until the event has passed: whoever holds it can open every
  Kadó.
- **Custody window.** Between the deposit and the opening there is a window in
  which the operator has effective control. No possible architecture eliminates
  it; it only changes its size.
- **The hidden amount is interface, not privacy.** The amount is public on the
  chain from the moment the Kadó is created.
- **The sponsor account is critical infrastructure.** It pays every reserve and
  fee. If it runs out of balance, every opening breaks. And it stays necessary
  after the event: with an issued asset, the attendee is left with zero XLM and
  can't pay the fee for any operation of their own.
- **Locked-up reserves.** Each Kadó locks 1.0 XLM (native asset) or 1.5 XLM
  (issued asset) for as long as the attendee's account exists. It's locked
  capital, not spend.
- **No off-ramp.** What the recipient does with the funds afterward is unsolved.
  The pilot promises no ecosystem that doesn't exist.
- **No event, no product — in phase 1.** The use occasion is the in-person event,
  and that's what makes the pilot measurable in 30 days. From phase 2 on, the
  occasion is whatever the sender decides.

## Out of scope, declared

Two different lists, and the difference matters: what is deferred has a phase
assigned and must not be blocked; what is discarded doesn't come back without
new evidence.

**Deferred to later phases.**

- Email or another identifier as recipient, and Kadós addressed from one person
  to another — phase 2.
- Embedded wallets, for recipient identity and access recovery — phase 2. Privy
  is the candidate. The condition is that the key stays the recipient's: a
  non-custodial embedded wallet fits phase 2, a custodial one doesn't, because it
  puts the operator back in the custodian position.
- Multiple assets, variable amounts per Kadó, utility for the funds after they
  are received, and an off-ramp — phase 3.

**Discarded, in any phase.** Yield or DeFi inside the opening flow, float as a
revenue model, an affiliated merchant network, custodial wallets, multichain,
public API, native app. The reasons are in
[`docs/CLAUDE.md`](docs/CLAUDE.md).

## Documentation

The permanent docs live in Spanish under `docs/`.

| Document | Contents |
|---|---|
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | Permanent context, principles, closed decisions |
| [`docs/producto.md`](docs/producto.md) | Flows, scope, vocabulary, metrics |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Technical design and spike results |
| [`docs/logo.md`](docs/logo.md) | The brand: concept, construction, usage |
| [`docs/stitch-brief.md`](docs/stitch-brief.md) | Screen design prompts |

## References

- [CAP-23 — Claimable balances](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0023.md)
- [CAP-33 — Sponsored reserves](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0033.md)
