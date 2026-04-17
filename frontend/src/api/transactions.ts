import type { ExchangeRateResult, PaginatedTransactions, Transaction } from "../types";
import { apiClient } from "./client";

export const transactionsApi = {
  send: async (data: { amount_usd: number; note?: string }): Promise<Transaction> => {
    const res = await apiClient.post<Transaction>("/transactions/send", data);
    return res.data;
  },

  request: async (data: { amount_gtq: number; note: string }): Promise<Transaction> => {
    const res = await apiClient.post<Transaction>("/transactions/request", data);
    return res.data;
  },

  list: async (page = 1, pageSize = 10): Promise<PaginatedTransactions> => {
    const res = await apiClient.get<PaginatedTransactions>("/transactions", {
      params: { page, page_size: pageSize },
    });
    return res.data;
  },

  updateStatus: async (
    id: number,
    status: "confirmed" | "cancelled"
  ): Promise<Transaction> => {
    const res = await apiClient.patch<Transaction>(`/transactions/${id}`, { status });
    return res.data;
  },

  getRate: async (amountUsd = 1): Promise<ExchangeRateResult> => {
    const res = await apiClient.get<ExchangeRateResult>("/exchange/rate", {
      params: { amount_usd: amountUsd },
    });
    return res.data;
  },
};