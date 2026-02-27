import { useMemo, useState } from 'react';
import { Bot, FileUp, Sparkles, ShieldCheck } from 'lucide-react';
import { useLiveHubData } from '../../hooks/useLiveHubData';
import { getCurrentSession } from '../../services/authService';
import {
  createHub,
  createMaterialEntry,
  deleteHub,
  deleteMaterialEntry,
  updateHub,
  updateMaterialEntry,
} from '../../services/materialHubService';
import {
  requestAiMaterialHubPlan,
  type AiEntryOperation,
  type AiHubOperation,
  type AiMaterialHubResponse,
} from '../../services/materialHubAiService';

const normalizeKey = (value: string) => value.trim().toLowerCase();
const supportedExtensions = new Set(['txt', 'csv', 'json', 'md', 'log', 'pdf', 'docx', 'doc']);
const supportedMimeTypes = new Set([
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const validHubActions = new Set(['create', 'update', 'delete']);
const validEntryActions = new Set(['create', 'update', 'delete']);
const validHubStatuses = new Set(['ready', 'moderate', 'critical']);

const isSupportedDocument = (inputFile: File) => {
  const extension = inputFile.name.includes('.')
    ? inputFile.name.split('.').pop()?.trim().toLowerCase() ?? ''
    : '';
  const mimeType = String(inputFile.type ?? '').trim().toLowerCase();

  if (extension && supportedExtensions.has(extension)) {
    return true;
  }

  if (mimeType && supportedMimeTypes.has(mimeType)) {
    return true;
  }

  return false;
};

export function AIAgent() {
  const { hubs, inventory, isLoading, error, reload } = useLiveHubData();
  const [instruction, setInstruction] = useState('Analyze this document and update Material Hub inventory entries conservatively.');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AiMaterialHubResponse | null>(null);
  const [applyLogs, setApplyLogs] = useState<string[]>([]);

  const flattenedEntries = useMemo(
    () => inventory.flatMap((hubInventory) => hubInventory.materials),
    [inventory],
  );

  const hubIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const hub of hubs) {
      const key = normalizeKey(hub.name);
      if (key) {
        map.set(key, hub.id);
      }
    }

    return map;
  }, [hubs]);

  const resolveHubId = (
    operation: { hubId: string | null; hubName: string | null },
    createdHubByName: Map<string, string>,
  ) => {
    if (operation.hubId) {
      return operation.hubId;
    }

    const hubName = operation.hubName ? normalizeKey(operation.hubName) : '';
    if (!hubName) return null;

    const createdId = createdHubByName.get(hubName);
    if (createdId) return createdId;

    const existing = hubs.find((item) => normalizeKey(item.name) === hubName);
    return existing?.id ?? null;
  };

  const resolveEntryId = (operation: AiEntryOperation, createdHubByName: Map<string, string>) => {
    if (operation.entryId) {
      return operation.entryId;
    }

    const materialName = operation.name ? normalizeKey(operation.name) : '';
    if (!materialName) {
      return null;
    }

    const hubName = operation.hubName ? normalizeKey(operation.hubName) : '';
    const hubId = operation.hubId ?? createdHubByName.get(hubName) ?? hubIdByName.get(hubName) ?? null;

    const entry = flattenedEntries.find((item) => {
      if (normalizeKey(item.name) !== materialName) {
        return false;
      }

      if (!hubId) {
        return true;
      }

      return item.hubId === hubId;
    });

    return entry?.id ?? null;
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setApplyLogs([]);

    try {
      const session = await getCurrentSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Admin session expired. Please log in again.');
      }

      const result = await requestAiMaterialHubPlan({
        accessToken,
        instruction,
        documentFile: file,
        hubs,
        inventory,
      });

      setAnalysisResult(result);
    } catch (caught) {
      setAnalysisResult(null);
      setAnalysisError(caught instanceof Error ? caught.message : 'AI analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalysis = async () => {
    if (!analysisResult) return;

    setIsApplying(true);
    setAnalysisError(null);
    const logs: string[] = [];

    const createdHubByName = new Map<string, string>();

    try {
      for (const operation of analysisResult.hubOperations) {
        if (!validHubActions.has(operation.action)) {
          logs.push(`Skipped unsupported hub action: ${operation.action}`);
          continue;
        }

        if (operation.action === 'create') {
          if (!operation.name || !operation.location || !operation.district) {
            logs.push('Skipped hub create: missing name/location/district.');
            continue;
          }

          const status = operation.status && validHubStatuses.has(operation.status) ? operation.status : 'moderate';

          const created = await createHub({
            name: operation.name,
            location: operation.location,
            district: operation.district,
            latitude: operation.latitude ?? 0,
            longitude: operation.longitude ?? 0,
            capacity: operation.capacity ?? 0,
            status,
            stockPercentage: Math.max(0, Math.min(100, operation.stockPercentage ?? 0)),
            damagePercentage: Math.max(0, Math.min(100, operation.damagePercentage ?? 0)),
          });

          createdHubByName.set(normalizeKey(created.name), created.id);
          logs.push(`Created hub: ${created.name}`);
          continue;
        }

        const resolvedHubId = resolveHubId(
          { hubId: operation.hubId, hubName: operation.hubName ?? operation.name },
          createdHubByName,
        );

        if (!resolvedHubId) {
          logs.push(`Skipped hub ${operation.action}: missing resolvable hub id/name.`);
          continue;
        }

        if (operation.action === 'delete') {
          await deleteHub(resolvedHubId);
          logs.push(`Deleted hub: ${operation.hubName ?? resolvedHubId}`);
          continue;
        }

        const status = operation.status && validHubStatuses.has(operation.status) ? operation.status : undefined;

        await updateHub(resolvedHubId, {
          name: operation.name ?? undefined,
          location: operation.location ?? undefined,
          district: operation.district ?? undefined,
          latitude: operation.latitude ?? undefined,
          longitude: operation.longitude ?? undefined,
          capacity: operation.capacity ?? undefined,
          status,
          stockPercentage:
            operation.stockPercentage === null || operation.stockPercentage === undefined
              ? undefined
              : Math.max(0, Math.min(100, operation.stockPercentage)),
          damagePercentage:
            operation.damagePercentage === null || operation.damagePercentage === undefined
              ? undefined
              : Math.max(0, Math.min(100, operation.damagePercentage)),
        });
        logs.push(`Updated hub: ${operation.hubName ?? operation.name ?? resolvedHubId}`);
      }

      for (const operation of analysisResult.entryOperations) {
        if (!validEntryActions.has(operation.action)) {
          logs.push(`Skipped unsupported entry action: ${operation.action}`);
          continue;
        }

        if (operation.action === 'create') {
          const resolvedHubId = resolveHubId({ hubId: operation.hubId, hubName: operation.hubName }, createdHubByName);

          if (!resolvedHubId || !operation.name) {
            logs.push('Skipped entry create: missing hub reference or material name.');
            continue;
          }

          await createMaterialEntry({
            hubId: resolvedHubId,
            name: operation.name,
            unit: operation.unit ?? 'units',
            opening: operation.opening ?? 0,
            received: operation.received ?? 0,
            issued: operation.issued ?? 0,
            damaged: operation.damaged ?? 0,
          });
          logs.push(`Created entry: ${operation.name}`);
          continue;
        }

        const entryId = resolveEntryId(operation, createdHubByName);
        if (!entryId) {
          logs.push(`Skipped entry ${operation.action}: missing resolvable entry id.`);
          continue;
        }

        if (operation.action === 'delete') {
          await deleteMaterialEntry(entryId);
          logs.push(`Deleted entry: ${operation.name ?? entryId}`);
          continue;
        }

        const resolvedHubId = resolveHubId({ hubId: operation.hubId, hubName: operation.hubName }, createdHubByName);

        await updateMaterialEntry(entryId, {
          hubId: resolvedHubId ?? undefined,
          name: operation.name ?? undefined,
          unit: operation.unit ?? undefined,
          opening: operation.opening ?? undefined,
          received: operation.received ?? undefined,
          issued: operation.issued ?? undefined,
          damaged: operation.damaged ?? undefined,
        });
        logs.push(`Updated entry: ${operation.name ?? entryId}`);
      }

      await reload();
      setApplyLogs(logs.length > 0 ? logs : ['No operations were applied.']);
    } catch (caught) {
      setAnalysisError(caught instanceof Error ? caught.message : 'Failed to apply AI operations.');
      setApplyLogs(logs);
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-600">Loading AI admin tools...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Admin Agent</h1>
          <p className="text-gray-600">
            Upload a document or type an instruction, then review and apply AI-generated hub and inventory edits.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-emerald-800 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Admin Only
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4">
        <label className="block text-sm font-semibold text-gray-700">Instruction to AI Agent</label>
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Example: Use uploaded stock register to update opening/received/issued for Gilgit hub and flag risky changes."
        />

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <FileUp className="h-4 w-4" />
            Upload document
            <input
              type="file"
              className="hidden"
              accept=".txt,.csv,.json,.md,.log,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/json"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;

                if (!selected) {
                  setFile(null);
                  return;
                }

                if (!isSupportedDocument(selected)) {
                  setFile(null);
                  setAnalysisError('Unsupported file type. Upload txt/csv/json/md/log, PDF, or DOCX (DOC may need conversion).');
                  return;
                }

                setAnalysisError(null);
                setFile(selected);
              }}
            />
          </label>

          <p className="text-sm text-gray-500">
            {file ? `Selected: ${file.name}` : 'No file selected. Supported: txt/csv/json/md/log, PDF, DOCX (DOC may need conversion).'}
          </p>
        </div>

        <button
          onClick={() => void runAnalysis()}
          disabled={isAnalyzing || isApplying}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}
        </button>

        {analysisError && <p className="text-red-600 text-sm">{analysisError}</p>}
      </div>

      {analysisResult && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Bot className="h-5 w-5 text-emerald-600" />
              AI Plan Summary
            </div>
            <div className="text-sm text-gray-500">
              Confidence: {Math.round((analysisResult.confidence ?? 0) * 100)}%
            </div>
          </div>

          <p className="text-gray-700">{analysisResult.summary || 'No summary returned.'}</p>

          {analysisResult.risks.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-2">Risks / Uncertainties</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                {analysisResult.risks.map((risk, index) => (
                  <li key={`${risk}-${index}`}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-3">Hub Operations ({analysisResult.hubOperations.length})</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {analysisResult.hubOperations.map((op: AiHubOperation, index: number) => (
                  <div key={`hub-op-${index}`} className="text-sm bg-gray-50 rounded-md p-3 border border-gray-200">
                    <p className="font-semibold text-gray-900">{op.action.toUpperCase()} · {op.name ?? op.hubName ?? op.hubId ?? 'Unnamed Hub'}</p>
                    <p className="text-gray-600">{op.location ?? 'No location'} · {op.district ?? 'No district'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-3">Entry Operations ({analysisResult.entryOperations.length})</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {analysisResult.entryOperations.map((op: AiEntryOperation, index: number) => (
                  <div key={`entry-op-${index}`} className="text-sm bg-gray-50 rounded-md p-3 border border-gray-200">
                    <p className="font-semibold text-gray-900">{op.action.toUpperCase()} · {op.name ?? op.entryId ?? 'Unnamed Entry'}</p>
                    <p className="text-gray-600">Hub: {op.hubName ?? op.hubId ?? 'Unspecified'} · Unit: {op.unit ?? 'units'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => void applyAnalysis()}
            disabled={isApplying || isAnalyzing}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {isApplying ? 'Applying changes...' : 'Apply Suggested Updates'}
          </button>

          {applyLogs.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">Apply Log</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {applyLogs.map((log, index) => (
                  <li key={`${log}-${index}`}>{log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
