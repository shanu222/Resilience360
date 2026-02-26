import type { HubInventory, MaterialHub } from '../data/types';

export type AiHubOperation = {
  action: 'create' | 'update' | 'delete';
  hubId: string | null;
  hubName: string | null;
  name: string | null;
  location: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  status: MaterialHub['status'] | null;
};

export type AiEntryOperation = {
  action: 'create' | 'update' | 'delete';
  entryId: string | null;
  hubId: string | null;
  hubName: string | null;
  name: string | null;
  unit: string | null;
  opening: number | null;
  received: number | null;
  issued: number | null;
  damaged: number | null;
};

export type AiMaterialHubResponse = {
  model: string;
  analyzedAt: string;
  summary: string;
  confidence: number;
  risks: string[];
  hubOperations: AiHubOperation[];
  entryOperations: AiEntryOperation[];
};

const getPortalApiBaseUrl = () => {
  const envBase = String(import.meta.env.VITE_PORTAL_API_BASE_URL ?? '').trim();

  if (envBase) {
    return envBase.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8787';
    }
  }

  return '';
};

export async function requestAiMaterialHubPlan(params: {
  accessToken: string;
  instruction: string;
  documentFile: File | null;
  hubs: MaterialHub[];
  inventory: HubInventory[];
}) {
  const apiBase = getPortalApiBaseUrl();
  const endpoint = `${apiBase}/api/material-hubs/ai-agent`;

  const formData = new FormData();
  formData.append('instruction', params.instruction);
  formData.append('hubs', JSON.stringify(params.hubs));
  formData.append('inventory', JSON.stringify(params.inventory));

  if (params.documentFile) {
    formData.append('document', params.documentFile);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(String(payload?.error ?? 'AI agent request failed.'));
  }

  return payload as AiMaterialHubResponse;
}
