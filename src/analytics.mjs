// Optional, explicit first-party input. Never derive sales from HTML or traffic estimates.
export function validateAnalytics(data) {
  if (!Array.isArray(data)) throw new Error('Analytics deve ser um array JSON.');
  return data.map(row => {
    if (!row.url || !row.periodStart || !row.periodEnd || !row.source || !row.unit) throw new Error('Analytics exige url, periodStart, periodEnd, source e unit.');
    if (!['sessions', 'visitors'].includes(row.unit)) throw new Error('unit deve ser sessions ou visitors.');
    if (!Number.isFinite(Date.parse(row.periodStart)) || !Number.isFinite(Date.parse(row.periodEnd)) || Date.parse(row.periodStart) > Date.parse(row.periodEnd)) throw new Error('Período de analytics inválido.');
    if (!Number.isInteger(row.denominator) || row.denominator < 1 || !Number.isInteger(row.convertingUnits) || row.convertingUnits < 0 || row.convertingUnits > row.denominator) throw new Error('Use unidades e unidades convertidas inteiras válidas; convertingUnits não é número de pedidos.');
    return { ...row, conversionRate: row.convertingUnits / row.denominator,
      note: 'Dado fornecido; origem, definição e período precisam ser comparáveis. Não é efeito causal da acessibilidade.' };
  });
}
