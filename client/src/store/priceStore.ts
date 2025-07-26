import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PriceState {
  exchangeRate: number | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchExchangeRate: () => Promise<void>;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export const usePriceStore = create<PriceState>()(
  persist(
    (set, get) => ({
      exchangeRate: null,
      loading: false,
      error: null,
      lastFetched: null,
      fetchExchangeRate: async () => {
        const { lastFetched } = get();
        const now = Date.now();
        if (lastFetched && now - lastFetched < FIVE_MINUTES) {
          // Already fetched within 5 minutes, do nothing
          return;
        }
        set({ loading: true, error: null });
        try {
          const res = await fetch(
            "https://fun-production-4656.up.railway.app/price"
          );
          if (!res.ok) throw new Error("Failed to fetch exchange rate");
          const data = await res.json();

          console.log(data);
          const rate = data[0].prices[0].value;
          set({
            exchangeRate: typeof rate === "number" ? rate : null,
            loading: false,
            lastFetched: Date.now(),
          });
        } catch (e: any) {
          set({ error: e.message || "Unknown error", loading: false });
        }
      },
    }),
    {
      name: "price-store",
      partialize: (state) => ({
        exchangeRate: state.exchangeRate,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
