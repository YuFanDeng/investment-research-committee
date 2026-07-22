import type { ResearchResponse } from '../types/research';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export async function runResearch(ticker: string): Promise<ResearchResponse> {
  const response = await fetch(`${API_URL}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Research could not be started.');
  }

  return response.json() as Promise<ResearchResponse>;
}
