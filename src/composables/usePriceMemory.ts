import { ref } from 'vue';

const STORAGE_KEY = 'SiteNear_price_memory';

function load(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function persist(memory: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore storage errors
  }
}

export function usePriceMemory() {
  const priceMemory = ref<Record<string, number>>(load());

  function getPrice(construction: string): number | undefined {
    return priceMemory.value[construction];
  }

  function setPrice(construction: string, amount: number): void {
    priceMemory.value[construction] = amount;
    persist(priceMemory.value);
  }

  function reload(): void {
    priceMemory.value = load();
  }

  return { priceMemory, getPrice, setPrice, reload };
}
