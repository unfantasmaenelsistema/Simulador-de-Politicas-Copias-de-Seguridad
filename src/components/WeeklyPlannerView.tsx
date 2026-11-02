import React from 'react';
import {
  BackupType,
  CalculationMode,
  ComputedDayResult,
  DayConfig,
  DayId,
  POLICY_PRESETS,
  SimulationParams,
  STORAGE_MEDIA,
  StorageMedium,
  computeRestorationPlan,
  computeWeeklySchedule,
  getBackupTypeLabel,
} from '../data/backupEngine';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Info,
  Layers,
  RotateCcw,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface WeeklyPlannerViewProps {
  days: DayConfig[];
  params: SimulationParams;
  computedDays: ComputedDayResult[];
  selectedMedium: StorageMedium;
  onUpdateDayType: (dayId: DayId, type: BackupType) => void;
  onUpdateDayChangeGB: (dayId: DayId, gb: number) => void;
  onApplyBulkWeekdayChange: (weekdayGB: number, weekendGB: number) => void;
  onUpdateParams: (patch: Partial<SimulationParams>) => void;
  onApplyPreset: (schedule: Record<DayId, BackupType>) => void;
  onJumpToRestoreDay: (dayId: DayId) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  days,
  params,
  computedDays,
  selectedMedium,
  onUpdateDayType,
  onUpdateDayChangeGB,
  onApplyBulkWeekdayChange,
  onUpdateParams,
  onApplyPreset,
  onJumpToRestoreDay,
}) => {
  const totalWeeklyStorageGB =
    computedDays.length > 0 ? computedDays[computedDays.length - 1].cumulativeStorageGB : 0;
  const totalWeeklyMinutes = Number(
    computedDays.reduce((acc, d) => acc + d.backupDurationMinutes, 0).toFixed(1)
  );
  const maxSingleWindowMinutes = Math.max(...computedDays.map((d) => d.backupDurationMinutes), 0);
  const totalNewDataWeekGB = days.reduce((acc, d) => acc + d.dailyChangeGB, 0);

  // Evaluamos el RTO y RPO resultante para cada día de la semana (tras ventana nocturna)
  const dailyRestoreEvaluations = React.useMemo(() => {
    const evalMap: Record<
      DayId,
      {
        rtoMinutes: number;
        rpoHours: number;
        rpoDataLostGB: number;
        stepsCount: number;
        exceedsRTO: boolean;
        exceedsRPO: boolean;
        isRecoverable: boolean;
      }
    > = {} as any;

    for (const d of computedDays) {
      const plan = computeRestorationPlan(
        computedDays,
        params,
        selectedMedium,
        d.id,
        'after_backup',
        null
      );
      evalMap[d.id] = {
        rtoMinutes: plan.totalRestoreTimeMinutes,
        rpoHours: plan.rpoHoursLost,
        rpoDataLostGB: plan.rpoDataLostGB,
        stepsCount: plan.setsRequiredCount,
        exceedsRTO: !plan.meetsRTOSLA,
        exceedsRPO: !plan.meetsRPOSLA,
        isRecoverable: plan.isRecoverable,
      };
    }
    return evalMap;
  }, [computedDays, params, selectedMedium]);

  const worstWeeklyRTOMinutes = Math.max(
    ...Object.values(dailyRestoreEvaluations).map((e) => e.rtoMinutes),
    0
  );
  const worstWeeklyRPOHours = Math.max(
    ...Object.values(dailyRestoreEvaluations).map((e) => e.rpoHours),
    0
  );
  const anyDayExceedsRTO = Object.values(dailyRestoreEvaluations).some((e) => e.exceedsRTO);
  const anyDayExceedsRPO = Object.values(dailyRestoreEvaluations).some((e) => e.exceedsRPO);
  const anyDayExceedsWindow = maxSingleWindowMinutes > params.maxBackupWindowMinutes;

  // Calculamos comparativa automática con las 4 políticas canónicas sobre los mismos datos del alumno
  const benchmarkPolicies = React.useMemo(() => {
    return POLICY_PRESETS.map((preset) => {
      const mockDays = days.map((d) => ({
        ...d,
        backupType: preset.schedule[d.id],
      }));
      const res = computeWeeklySchedule(mockDays, params, selectedMedium);
      const totalGB = res[res.length - 1]?.cumulativeStorageGB ?? 0;
      const totalMin = Number(
        res.reduce((acc, r) => acc + r.backupDurationMinutes, 0).toFixed(1)
      );
      return {
        id: preset.id,
        name: preset.name,
        totalGB,
        totalMin,
      };
    });
  }, [days, params, selectedMedium]);

  const [chartViewMode, setChartViewMode] = React.useState<'stacked' | 'grouped'>('stacked');

  const chartData = React.useMemo(() => {
    return computedDays.map((day) => {
      const previousCumulativeGB = Number(
        Math.max(0, day.cumulativeStorageGB - day.storedBackupSizeGB).toFixed(1)
      );
      return {
        id: day.id,
        name: day.shortName,
        fullName: day.name,
        backupType: day.backupType,
        backupTypeLabel: getBackupTypeLabel(day.backupType),
        dailyBackupGB: day.storedBackupSizeGB,
        previousCumulativeGB,
        cumulativeStorageGB: day.cumulativeStorageGB,
        durationMin: day.backupDurationMinutes,
        systemVolumeGB: day.systemTotalVolumeGB,
      };
    });
  }, [computedDays]);

  const getBarFillByType = (type: BackupType) => {
    switch (type) {
      case 'full':
        return '#0284c7'; // sky-600
      case 'differential':
        return '#d97706'; // amber-600
      case 'incremental':
        return '#059669'; // emerald-600
      default:
        return '#94a3b8'; // slate-400
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera de Plantillas Rápidas y Parámetros del Servidor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Panel Izquierdo: Parámetros Base del Sistema y SLAs RTO/RPO (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>01. Parámetros del Servidor, Soporte y Objetivos SLA</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configura el volumen inicial, el medio de respaldo y los límites máximos de
                  ventana nocturna, RTO y RPO.
                </p>
              </div>

              {/* Selector de Modo de Cálculo */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'academic_classic', label: 'Modo Examen (Clásico)' },
                    { id: 'academic_cumulative', label: 'Acumulativo Día 1' },
                    { id: 'production_compressed', label: 'Con Compresión' },
                  ] as { id: CalculationMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdateParams({ calculationMode: mode.id })}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      params.calculationMode === mode.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5">
              {/* Volumen Base Inicial */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="base-volume-slider"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Volumen Base Inicial del Sistema (V₀)
                  </label>
                  <span className="text-sm font-mono font-semibold text-sky-700 dark:text-sky-400 tabular-nums">
                    {params.baseVolumeGB} GB
                  </span>
                </div>
                <input
                  id="base-volume-slider"
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={params.baseVolumeGB}
                  onChange={(e) => onUpdateParams({ baseVolumeGB: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                  <span>50 GB</span>
                  <div className="flex items-center gap-2">
                    {[200, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => onUpdateParams({ baseVolumeGB: val })}
                        className="underline hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                      >
                        {val}GB
                      </button>
                    ))}
                  </div>
                  <span>2.000 GB</span>
                </div>
              </div>

              {/* Selección de Soporte / Medio */}
              <div>
                <label
                  htmlFor="storage-medium-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Medio de Almacenamiento Destino
                </label>
                <select
                  id="storage-medium-select"
                  value={params.selectedMediumId}
                  onChange={(e) => onUpdateParams({ selectedMediumId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {STORAGE_MEDIA.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — Escritura: {m.writeSpeedMBps} MB/s · Lectura: {m.readSpeedMBps} MB/s
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {selectedMedium.description}
                </p>
              </div>
            </div>

            {/* Fila de 3 Objetivos SLA: Ventana Nocturna, RTO Objetivo y RPO Objetivo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              {/* SLA Ventana Nocturna */}
              <div
                className={`p-3 rounded-lg border transition-colors ${
                  anyDayExceedsWindow
                    ? 'border-red-500 dark:border-red-500/80 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="max-window-slider"
                    className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    {anyDayExceedsWindow && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span>SLA Ventana Copia</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums ${
                      anyDayExceedsWindow
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    ≤ {params.maxBackupWindowMinutes} min
                  </span>
                </div>
                <input
                  id="max-window-slider"
                  type="range"
                  min={15}
                  max={240}
                  step={15}
                  value={params.maxBackupWindowMinutes}
                  onChange={(e) =>
                    onUpdateParams({ maxBackupWindowMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Pico actual: {maxSingleWindowMinutes} min
                </div>
              </div>

              {/* SLA RTO Objetivo */}
              <div
                className={`p-3 rounded-lg border transition-colors ${
                  anyDayExceedsRTO
                    ? 'border-red-500 dark:border-red-500/80 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="planner-rto-slider"
                    className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    {anyDayExceedsRTO && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span>Objetivo RTO Máx.</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums ${
                      anyDayExceedsRTO
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    ≤ {params.targetRTOMinutes} min
                  </span>
                </div>
                <input
                  id="planner-rto-slider"
                  type="range"
                  min={10}
                  max={240}
                  step={5}
                  value={params.targetRTOMinutes}
                  onChange={(e) =>
                    onUpdateParams({ targetRTOMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div
                  className={`text-[10px] font-mono mt-0.5 ${
                    anyDayExceedsRTO
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Peor RTO semanal: {worstWeeklyRTOMinutes} min
                </div>
              </div>

              {/* SLA RPO Objetivo */}
              <div
                className={`p-3 rounded-lg border transition-colors ${
                  anyDayExceedsRPO
                    ? 'border-red-500 dark:border-red-500/80 bg-red-50/40 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="planner-rpo-slider"
                    className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    {anyDayExceedsRPO && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span>Objetivo RPO Máx.</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums ${
                      anyDayExceedsRPO
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    ≤ {params.targetRPOHours} h
                  </span>
                </div>
                <input
                  id="planner-rpo-slider"
                  type="range"
                  min={0}
                  max={72}
                  step={4}
                  value={params.targetRPOHours}
                  onChange={(e) =>
                    onUpdateParams({ targetRPOHours: Number(e.target.value) })
                  }
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div
                  className={`text-[10px] font-mono mt-0.5 ${
                    anyDayExceedsRPO
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Peor RPO fin día: {worstWeeklyRPOHours} h
                </div>
              </div>
            </div>

            {/* Opciones adicionales: Compresión o Ajuste Rápido + Base Previa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 items-center">
              {params.calculationMode === 'production_compressed' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="compression-slider"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Factor de Compresión / Deduplicación
                    </label>
                    <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Ahorro {Math.round((1 - params.compressionRatio) * 100)}% (Ratio{' '}
                      {params.compressionRatio}x)
                    </span>
                  </div>
                  <input
                    id="compression-slider"
                    type="range"
                    min={0.4}
                    max={1.0}
                    step={0.05}
                    value={params.compressionRatio}
                    onChange={(e) =>
                      onUpdateParams({ compressionRatio: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Datos diarios (L-V / S-D):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onApplyBulkWeekdayChange(20, 5)}
                      className="px-2 py-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:border-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      20/5 GB
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyBulkWeekdayChange(40, 15)}
                      className="px-2 py-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:border-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      40/15 GB
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyBulkWeekdayChange(80, 25)}
                      className="px-2 py-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:border-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      80/25 GB
                    </button>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={params.hasPreviousSundayFull}
                  onChange={(e) =>
                    onUpdateParams({ hasPreviousSundayFull: e.target.checked })
                  }
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>
                  Existe Copia Completa del Domingo anterior ({params.baseVolumeGB} GB)
                </span>
              </label>
            </div>
          </div>

          {/* Nota explicativa del modo actual */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {params.calculationMode === 'academic_classic' &&
                'Modo Examen Clásico: Si el Lunes es Copia Completa, respalda exactamente el Volumen Base V₀ (' +
                  params.baseVolumeGB +
                  ' GB) y los cambios diarios comienzan a acumularse desde el Martes.'}
              {params.calculationMode === 'academic_cumulative' &&
                'Modo Acumulativo Día 1: El backup se ejecuta a las 22:00h incluyendo los datos generados durante el propio Lunes (V₀ + ΔLunes).'}
              {params.calculationMode === 'production_compressed' &&
                `Modo Ingeniería: Aplica un ratio de compresión/deduplicación de ${params.compressionRatio}x sobre el tamaño bruto de cada conjunto.`}
            </span>
          </div>
        </section>

        {/* Panel Derecho: Plantillas de Políticas Canónicas (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>02. Plantillas de Políticas de Referencia</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Carga una política estándar para analizar su impacto en el espacio, ventana, RTO y
                RPO.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              {POLICY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.schedule)}
                  className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400">
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {preset.subtitle}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{preset.badgeText}</span>
                    <span className="text-sky-600 dark:text-sky-400 font-sans font-medium group-hover:translate-x-0.5 transition-transform">
                      Aplicar →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Leyenda de código técnico:</span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-sky-700 dark:text-sky-400 font-semibold">■ Completa</span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold">▲ Diferencial</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">● Incremental</span>
            </div>
          </div>
        </section>
      </div>

      {/* Cinta de KPIs Globales de la Semana con Validación Visual de SLA (Full-Width 4 Columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Espacio Total en Medio (Semana)</span>
            <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalWeeklyStorageGB.toLocaleString('es-ES')} GB
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              · {((totalWeeklyStorageGB / selectedMedium.capacityGB) * 100).toFixed(1)}% del soporte
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Capacidad de {selectedMedium.name}: {selectedMedium.capacityGB.toLocaleString('es-ES')} GB
          </p>
        </div>

        {/* KPI Ventana Nocturna */}
        <div
          className={`bg-white dark:bg-slate-900 border rounded-xl p-5 transition-colors ${
            anyDayExceedsWindow
              ? 'border-red-500 dark:border-red-500/80 bg-red-50/20 dark:bg-red-950/15'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Pico de Ventana Nocturna</span>
            {anyDayExceedsWindow ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                anyDayExceedsWindow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {maxSingleWindowMinutes} min
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              / máx {params.maxBackupWindowMinutes} min
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              anyDayExceedsWindow
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {anyDayExceedsWindow
              ? '▲ Alerta: Supera la ventana nocturna permitida'
              : '✓ Cumple ventana nocturna todos los días'}
          </p>
        </div>

        {/* KPI Peor RTO Semanal con Alerta Visual */}
        <div
          className={`bg-white dark:bg-slate-900 border rounded-xl p-5 transition-colors ${
            anyDayExceedsRTO
              ? 'border-red-500 dark:border-red-500/80 bg-red-50/20 dark:bg-red-950/15'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>RTO Máximo en la Semana</span>
            {anyDayExceedsRTO ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                anyDayExceedsRTO
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {worstWeeklyRTOMinutes} min
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              / SLA ≤ {params.targetRTOMinutes} min
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              anyDayExceedsRTO
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {anyDayExceedsRTO
              ? '▲ Alerta SLA: Algún día supera el RTO objetivo'
              : '✓ Todos los días cumplen el RTO objetivo'}
          </p>
        </div>

        {/* KPI Peor RPO Semanal con Alerta Visual */}
        <div
          className={`bg-white dark:bg-slate-900 border rounded-xl p-5 transition-colors ${
            anyDayExceedsRPO
              ? 'border-red-500 dark:border-red-500/80 bg-red-50/20 dark:bg-red-950/15'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Exposición RPO (Días sin Copia)</span>
            {anyDayExceedsRPO ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                anyDayExceedsRPO
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {worstWeeklyRPOHours} h
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              / SLA ≤ {params.targetRPOHours} h
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              anyDayExceedsRPO
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {anyDayExceedsRPO
              ? '▲ Alerta SLA: Pérdida de datos supera el RPO'
              : '✓ Ventana RPO controlada en toda la semana'}
          </p>
        </div>
      </div>

      {/* Calendario Interactivo de 7 Días */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              03. Planificador del Calendario Semanal de Respaldos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configura el tipo de copia y el volumen de cambios diarios para cada día. Las
              tarjetas muestran un borde rojo y advertencia si el RTO, el RPO o la ventana nocturna
              superan tus objetivos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onApplyPreset(POLICY_PRESETS[2].schedule)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Calendario</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 pt-6">
          {computedDays.map((day, idx) => {
            const rawDayConfig = days[idx];
            const isInauguralMondayFull =
              params.calculationMode === 'academic_classic' &&
              idx === 0 &&
              day.backupType === 'full';

            const evalDay = dailyRestoreEvaluations[day.id];
            const hasSLAViolation =
              day.exceedsBackupWindow ||
              day.hasMissingBaseWarning ||
              evalDay?.exceedsRTO ||
              evalDay?.exceedsRPO;

            const typeColorClasses = hasSLAViolation
              ? 'border-red-500 dark:border-red-500/90 bg-red-50/25 dark:bg-red-950/20 ring-1 ring-red-500/25'
              : day.backupType === 'full'
              ? 'border-sky-500/70 dark:border-sky-500/60 bg-sky-50/20 dark:bg-sky-950/15'
              : day.backupType === 'differential'
              ? 'border-amber-500/70 dark:border-amber-500/60 bg-amber-50/20 dark:bg-amber-950/15'
              : day.backupType === 'incremental'
              ? 'border-emerald-500/70 dark:border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 opacity-85';

            return (
              <div
                key={day.id}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${typeColorClasses}`}
              >
                <div>
                  {/* Cabecera del Día */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Día {idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{day.name}</span>
                        {hasSLAViolation && (
                          <span title="Incumplimiento de SLA detectado en este día">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                          </span>
                        )}
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {day.backupType === 'full' && '■ FULL'}
                      {day.backupType === 'differential' && '▲ DIFF'}
                      {day.backupType === 'incremental' && '● INC'}
                      {day.backupType === 'none' && '○ OFF'}
                    </span>
                  </div>

                  {/* Selector de Tipo de Copia (Botones Funcionales) */}
                  <div className="mt-3">
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      Tipo de Copia (22:00h)
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg">
                      {(
                        [
                          { type: 'full', label: 'Completa', activeCls: 'bg-sky-600 text-white' },
                          {
                            type: 'differential',
                            label: 'Diferencial',
                            activeCls: 'bg-amber-600 text-white',
                          },
                          {
                            type: 'incremental',
                            label: 'Incremental',
                            activeCls: 'bg-emerald-600 text-white',
                          },
                          {
                            type: 'none',
                            label: 'Sin Copia',
                            activeCls: 'bg-slate-700 text-white',
                          },
                        ] as { type: BackupType; label: string; activeCls: string }[]
                      ).map((btn) => (
                        <button
                          key={btn.type}
                          type="button"
                          onClick={() => onUpdateDayType(day.id, btn.type)}
                          className={`px-2 py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            day.backupType === btn.type
                              ? `${btn.activeCls} shadow-xs`
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control de Datos Nuevos/Modificados ese día */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/70">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label
                        htmlFor={`change-gb-${day.id}`}
                        className="text-slate-600 dark:text-slate-400 font-medium"
                      >
                        Cambios del día:
                      </label>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {isInauguralMondayFull ? (
                          <span title="En modo examen clásico, el Lunes parte del Volumen Base V0">
                            Base ({params.baseVolumeGB} GB)
                          </span>
                        ) : (
                          `+${rawDayConfig.dailyChangeGB} GB`
                        )}
                      </span>
                    </div>
                    <input
                      id={`change-gb-${day.id}`}
                      type="range"
                      min={5}
                      max={200}
                      step={5}
                      disabled={isInauguralMondayFull}
                      value={rawDayConfig.dailyChangeGB}
                      onChange={(e) => onUpdateDayChangeGB(day.id, Number(e.target.value))}
                      className="w-full accent-sky-600 cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Resultados Calculados del Día */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tamaño Copia Hoy:</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                        {day.storedBackupSizeGB} GB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Acumulado Medio:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {day.cumulativeStorageGB} GB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tiempo Ventana:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums flex items-center gap-1 ${
                          day.exceedsBackupWindow
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day.exceedsBackupWindow && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        <span>{day.backupDurationMinutes} min</span>
                      </span>
                    </div>

                    {/* RTO y RPO del Día con Validación Visual */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">RTO si falla hoy:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums flex items-center gap-1 ${
                          evalDay?.exceedsRTO
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {evalDay?.exceedsRTO && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        <span>
                          {evalDay?.rtoMinutes}m ({evalDay?.stepsCount}p)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">RPO fin de día:</span>
                      <span
                        className={`font-mono font-semibold tabular-nums flex items-center gap-1 ${
                          evalDay?.exceedsRPO
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {evalDay?.exceedsRPO && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        <span>{evalDay?.rpoHours} h</span>
                      </span>
                    </div>

                    {/* Explicación de la fórmula y Archive Bit */}
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {day.formulaExplanation}
                      </p>
                    </div>

                    {/* Alertas específicas de RTO / RPO / Base en la tarjeta del día */}
                    {(day.hasMissingBaseWarning ||
                      day.exceedsBackupWindow ||
                      evalDay?.exceedsRTO ||
                      evalDay?.exceedsRPO) && (
                      <div className="mt-2 p-2 rounded-lg bg-red-100/80 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-[11px] text-red-800 dark:text-red-200 space-y-1">
                        {day.hasMissingBaseWarning && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                            <span>Sin Copia Completa previa para restaurar V₀.</span>
                          </div>
                        )}
                        {day.exceedsBackupWindow && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                            <span>
                              Ventana ({day.backupDurationMinutes}m) supera límite de{' '}
                              {params.maxBackupWindowMinutes}m.
                            </span>
                          </div>
                        )}
                        {evalDay?.exceedsRTO && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                            <span>
                              RTO ({evalDay.rtoMinutes}m) supera objetivo de {params.targetRTOMinutes}m.
                            </span>
                          </div>
                        )}
                        {evalDay?.exceedsRPO && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                            <span>
                              RPO ({evalDay.rpoHours}h / {evalDay.rpoDataLostGB}GB) supera límite de{' '}
                              {params.targetRPOHours}h.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón para saltar al Simulador de Desastre en este día */}
                <button
                  type="button"
                  onClick={() => onJumpToRestoreDay(day.id)}
                  className={`mt-4 w-full py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    hasSLAViolation
                      ? 'border-red-500 bg-red-600 hover:bg-red-700 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-600 dark:hover:border-sky-400 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {hasSLAViolation ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Analizar Alerta {day.shortName}</span>
                    </>
                  ) : (
                    <>
                      <span>Simular Fallo el {day.shortName}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sección Inferior: Gráfico Visual de Barras y Tabla Comparativa de Políticas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Gráfico Recharts de Progresión de Almacenamiento Acumulado (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <span>04. Progresión del Consumo de Almacenamiento Acumulado</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualización día a día del espacio ocupado en el soporte ({selectedMedium.name})
                  y la aportación de cada copia nocturna.
                </p>
              </div>

              {/* Selector de modo del gráfico */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartViewMode('stacked')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    chartViewMode === 'stacked'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Escalera Acumulada
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('grouped')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    chartViewMode === 'grouped'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Acumulado vs Copia Hoy
                </button>
              </div>
            </div>

            {/* Contenedor del Gráfico de Barras Recharts */}
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                  barGap={6}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#cbd5e1"
                    strokeOpacity={0.45}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `${val} GB`}
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={68}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as (typeof chartData)[0];
                      return (
                        <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-lg p-3 shadow-lg text-xs font-mono space-y-1.5">
                          <div className="font-sans font-bold text-white border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                            <span>{item.fullName}</span>
                            <span className="text-sky-400 font-mono">{item.backupTypeLabel}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">Copia escrita hoy:</span>
                            <span className="font-semibold text-white">+{item.dailyBackupGB} GB</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">Acumulado previo:</span>
                            <span className="text-slate-300">{item.previousCumulativeGB} GB</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                            <span className="text-sky-300 font-semibold">Total Acumulado:</span>
                            <span className="font-bold text-sky-400">
                              {item.cumulativeStorageGB} GB
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
                            <span>Ventana de copia:</span>
                            <span>{item.durationMin} min</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    iconType="rect"
                  />
                  <ReferenceLine
                    y={params.baseVolumeGB}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Base V₀ (${params.baseVolumeGB} GB)`,
                      position: 'insideTopRight',
                      fill: '#64748b',
                      fontSize: 11,
                    }}
                  />

                  {chartViewMode === 'stacked' ? (
                    <>
                      <Bar
                        dataKey="previousCumulativeGB"
                        name="Acumulado días previos (GB)"
                        stackId="storage"
                        fill="#94a3b8"
                        fillOpacity={0.45}
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="dailyBackupGB"
                        name="Nueva copia del día (GB)"
                        stackId="storage"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={`cell-${entry.id}`}
                            fill={getBarFillByType(entry.backupType)}
                          />
                        ))}
                      </Bar>
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="cumulativeStorageGB"
                        name="Almacenamiento Acumulado Total (GB)"
                        fill="#334155"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="dailyBackupGB"
                        name="Tamaño Copia del Día (GB)"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={`cell-grouped-${entry.id}`}
                            fill={getBarFillByType(entry.backupType)}
                          />
                        ))}
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda de colores por tipo de copia */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
                  <span>Completa (Full)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" />
                  <span>Diferencial</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                  <span>Incremental</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-400/60 inline-block" />
                  <span>Base Acumulada Previa</span>
                </span>
              </div>
              <span>Cierre Domingo: {totalWeeklyStorageGB} GB</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>
              <strong>Regla del Bit de Archivo (Archive Bit):</strong> Las copias{' '}
              <strong>Completas</strong> e <strong>Incrementales</strong> desmarcan el atributo de
              modificación tras respaldar cada archivo. Las copias <strong>Diferenciales</strong>{' '}
              leen los archivos modificados desde la última Completa pero <em>no</em> desmarcan el
              atributo, por lo que acumulan los cambios anteriores.
            </span>
          </div>
        </section>

        {/* Tabla Comparativa de Políticas sobre el Dataset Actual (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              05. Comparativa Automática con Otras Estrategias
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rendimiento de tu planificación actual frente a las 4 políticas estándar con tu mismo
              volumen de datos ({params.baseVolumeGB} GB base + {totalNewDataWeekGB} GB de cambios):
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-2 font-medium">Política Semanal</th>
                    <th className="py-2.5 px-2 font-medium text-right">Espacio Total</th>
                    <th className="py-2.5 pl-2 font-medium text-right">Tiempo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 font-mono tabular-nums">
                  <tr className="bg-sky-50/60 dark:bg-sky-950/30 font-semibold text-sky-900 dark:text-sky-200">
                    <td className="py-3 pr-2 font-sans">★ Tu Configuración Actual</td>
                    <td className="py-3 px-2 text-right">{totalWeeklyStorageGB} GB</td>
                    <td className="py-3 pl-2 text-right">{totalWeeklyMinutes} min</td>
                  </tr>
                  {benchmarkPolicies.map((bp) => (
                    <tr
                      key={bp.id}
                      className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 pr-2 font-sans">{bp.name}</td>
                      <td className="py-2.5 px-2 text-right">{bp.totalGB} GB</td>
                      <td className="py-2.5 pl-2 text-right">{bp.totalMin} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-200">Conclusión didáctica:</strong>{' '}
            La política <em>Completa + Incrementales</em> siempre consume el mínimo espacio posible
            ({benchmarkPolicies[0]?.totalGB} GB), mientras que <em>Completa + Diferenciales</em>{' '}
            consume más ({benchmarkPolicies[1]?.totalGB} GB) a cambio de garantizar restauraciones
            en un máximo de 2 pasos cualquier día.
          </div>
        </section>
      </div>
    </div>
  );
};
