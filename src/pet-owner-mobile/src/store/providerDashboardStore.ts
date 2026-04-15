import { create } from "zustand";
import { providerApi } from "../api/client";
import type {
  EarningsSummaryDto,
  EarningsTransactionDto,
  ProviderStatsDto,
} from "../types/api";

interface ProviderDashboardState {
  stats: ProviderStatsDto | null;
  earnings: EarningsSummaryDto | null;
  transactions: EarningsTransactionDto[];
  loading: boolean;
  earningsLoading: boolean;
  transactionsLoading: boolean;
  error: string | null;

  fetchStats: () => Promise<void>;
  fetchEarnings: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchAll: () => Promise<void>;
  reset: () => void;
}

export const useProviderDashboardStore = create<ProviderDashboardState>((set) => ({
  stats: null,
  earnings: null,
  transactions: [],
  loading: false,
  earningsLoading: false,
  transactionsLoading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await providerApi.getStats();
      set({ stats, loading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load stats";
      set({ loading: false, error: msg });
    }
  },

  fetchEarnings: async () => {
    set({ earningsLoading: true, error: null });
    try {
      const earnings = await providerApi.getEarnings();
      set({ earnings, earningsLoading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load earnings";
      set({ earningsLoading: false, error: msg });
    }
  },

  fetchTransactions: async () => {
    set({ transactionsLoading: true, error: null });
    try {
      const transactions = await providerApi.getTransactions();
      set({ transactions, transactionsLoading: false, error: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load transactions";
      set({ transactionsLoading: false, error: msg });
    }
  },

  fetchAll: async () => {
    set({
      loading: true,
      earningsLoading: true,
      transactionsLoading: true,
      error: null,
    });
    try {
      const [stats, earnings, transactions] = await Promise.all([
        providerApi.getStats(),
        providerApi.getEarnings(),
        providerApi.getTransactions(),
      ]);
      set({
        stats,
        earnings,
        transactions,
        loading: false,
        earningsLoading: false,
        transactionsLoading: false,
        error: null,
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e instanceof Error ? e.message : "Failed to load dashboard");
      set({
        loading: false,
        earningsLoading: false,
        transactionsLoading: false,
        error: String(msg),
      });
    }
  },

  reset: () =>
    set({
      stats: null,
      earnings: null,
      transactions: [],
      loading: false,
      earningsLoading: false,
      transactionsLoading: false,
      error: null,
    }),
}));
