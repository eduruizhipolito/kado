import { leerPanel } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

/**
 * Exporta las métricas del piloto en CSV. Es uno de los criterios de aceptación
 * de docs/producto.md y parte de la evidencia del piloto.
 */
export async function GET() {
  const panel = await leerPanel();

  const filas = [
    ['evento', 'fecha', 'red', 'generados', 'abiertos', 'tasa_apertura', 'mediana_minutos', 'monto_por_kado', 'activo', 'valor_usd', 'expira_en', 'hashes'].join(','),
    ...panel.tandas.map((f) =>
      [
        comilla(f.tanda.evento),
        f.tanda.fecha,
        f.tanda.red,
        f.generados,
        f.abiertos,
        f.tasaApertura.toFixed(4),
        f.medianaMinutos === null ? '' : f.medianaMinutos.toFixed(1),
        f.tanda.montoPorKado,
        f.tanda.activo.codigo,
        f.tanda.valorUsd ?? '',
        f.tanda.expiraEn,
        comilla(f.tanda.hashes.join(' ')),
      ].join(','),
    ),
  ];

  const nombre = `kado-metricas-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`${filas.join('\n')}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nombre}"`,
    },
  });
}

/** Un nombre de evento puede traer comas. */
function comilla(texto: string): string {
  return `"${texto.replace(/"/g, '""')}"`;
}
