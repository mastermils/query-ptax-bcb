export interface BcbCotacaoRaw {
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
}

export interface BcbCotacaoResponse {
  value: BcbCotacaoRaw[];
}

export interface PtaxQuote {
  date: string;
  buyRate: number;
  sellRate: number;
  quotedAt: string;
}
