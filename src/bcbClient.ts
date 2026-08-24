import type { BcbCotacaoResponse, PtaxQuote } from "./types.js";

const BASE_URL = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

function isoToBcbDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) {
    throw new Error(`Invalid date "${iso}", expected YYYY-MM-DD`);
  }
  return `${month}-${day}-${year}`;
}

function bcbDateTimeToIsoDate(dataHoraCotacao: string): string {
  return dataHoraCotacao.slice(0, 10);
}

function toPtaxQuote(raw: BcbCotacaoResponse["value"][number]): PtaxQuote {
  return {
    date: bcbDateTimeToIsoDate(raw.dataHoraCotacao),
    buyRate: raw.cotacaoCompra,
    sellRate: raw.cotacaoVenda,
    quotedAt: raw.dataHoraCotacao,
  };
}

async function fetchJson(url: string): Promise<BcbCotacaoResponse> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(
      `Failed to reach BCB PTAX API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!response.ok) {
    throw new Error(`BCB PTAX API returned HTTP ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as BcbCotacaoResponse;
}

export async function fetchPtaxDay(isoDate: string): Promise<PtaxQuote | null> {
  const bcbDate = isoToBcbDate(isoDate);
  const url = `${BASE_URL}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${bcbDate}'&$format=json`;
  const data = await fetchJson(url);
  const [raw] = data.value;
  return raw ? toPtaxQuote(raw) : null;
}

export async function fetchPtaxPeriod(
  isoStartDate: string,
  isoEndDate: string,
): Promise<PtaxQuote[]> {
  const start = isoToBcbDate(isoStartDate);
  const end = isoToBcbDate(isoEndDate);
  const url =
    `${BASE_URL}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial='${start}'&@dataFinalCotacao='${end}'&$format=json`;
  const data = await fetchJson(url);
  return data.value.map(toPtaxQuote);
}

export async function fetchPtaxLatest(lookbackDays: number): Promise<PtaxQuote | null> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - lookbackDays);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const quotes = await fetchPtaxPeriod(toIso(start), toIso(end));
  return quotes.length > 0 ? quotes[quotes.length - 1] : null;
}
