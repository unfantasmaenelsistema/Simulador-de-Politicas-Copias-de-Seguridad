import React from 'react';
import {
  ComputedDayResult,
  DayId,
  RestorationPlan,
  SimulationParams,
  StorageMedium,
  computeRestorationPlan,
  getBackupTypeLabel,
} from '../data/backupEngine';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Disc,
  Flame,
  HardDriveDownload,
  HelpCircle,
  ShieldAlert,
  SkipForward,
  Wrench,
} from 'lucide-react';

interface RestorationSimulatorViewProps {
  computedDays: ComputedDayResult[];
  params: SimulationParams;
  selectedMedium: StorageMedium;
  disasterDayId: DayId;
  disasterTiming: 'before_backup' | 'after_backup';
  corruptedDayId: DayId | null;
  restorationPlan: RestorationPlan;
  onSelectDisasterDay: (dayId: DayId) => void;
  onSelectDisasterTiming: (timing: 'before_backup' | 'after_backup') => void;
  onToggleCorruptedDay: (dayId: DayId | null) => void;
  onUpdateParams: (patch: Partial<SimulationParams>) => void;
}

export const RestorationSimulatorView: React.FC<RestorationSimulatorViewProps> = ({
  computedDays,
  params,
  selectedMedium,
  disasterDayId,
  disasterTiming,
  corruptedDayId,
  restorationPlan,
  onSelectDisasterDay,
  onSelectDisasterTiming,
  onToggleCorruptedDay,
  onUpdateParams,
}) => {
  const rtoExceeded = !restorationPlan.meetsRTOSLA;
  const rpoExceeded = !restorationPlan.meetsRPOSLA;
  const rtoDiffMinutes = Number(
    (restorationPlan.totalRestoreTimeMinutes - params.targetRTOMinutes).toFixed(1)
  );
  const rpoDiffHours = restorationPlan.rpoHoursLost - params.targetRPOHours;

  // Evaluamos el cumplimiento de RTO y RPO para cada día de la semana con el fin de señalizar días críticos en el selector
  const daySLABreaches = React.useMemo(() => {
    const map: Record<
      string,
      { rtoBreach: boolean; rpoBreach: boolean; rtoMin: number; rpoHours: number }
    > = {};
    for (const d of computedDays) {
      const plan = computeRestorationPlan(
        computedDays,
        params,
        selectedMedium,
        d.id,
        disasterTiming,
        corruptedDayId
      );
      map[d.id] = {
        rtoBreach: !plan.meetsRTOSLA,
        rpoBreach: !plan.meetsRPOSLA,
        rtoMin: plan.totalRestoreTimeMinutes,
        rpoHours: plan.rpoHoursLost,
      };
    }
    return map;
  }, [computedDays, params, selectedMedium, disasterTiming, corruptedDayId]);

  return (
    <div className="space-y-8">
      {/* Banner de Alerta Global de Incumplimiento de SLA (RTO / RPO) */}
      {(rtoExceeded || rpoExceeded) && (
        <div
          role="alert"
          className="rounded-xl border border-red-500 dark:border-red-500/80 bg-red-50/80 dark:bg-red-950/35 p-5 text-red-950 dark:text-red-100 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-100 flex flex-wrap items-center gap-2">
                  <span>INCUMPLIMIENTO DE OBJETIVOS SLA DETECTADO EN {restorationPlan.disasterDayName.toUpperCase()}</span>
                  <span className="text-xs font-mono font-normal text-red-700 dark:text-red-300">
                    · Requiere ajuste en la política o en el soporte
                  </span>
                </h3>
                <ul className="mt-1.5 space-y-1 text-xs text-red-800 dark:text-red-200">
                  {rtoExceeded && (
                    <li>
                      • <strong>Alerta RTO (Tiempo de Recuperación):</strong> El tiempo estimado de
                      restauración es de{' '}
                      <strong className="font-mono">{restorationPlan.totalRestoreTimeMinutes} min</strong>,
                      superando el objetivo máximo de{' '}
                      <strong className="font-mono">{params.targetRTOMinutes} min</strong>
                      {rtoDiffMinutes > 0 ? ` (+${rtoDiffMinutes} min de exceso)` : ''}.{' '}
                      <span className="underline decoration-red-400">
                        Recomendación:
                      </span>{' '}
                      Usa un soporte con mayor velocidad de lectura (ej. LTO-8 o Cabina 10GbE) o
                      intercala una copia Diferencial para reducir el número de pasos.
                    </li>
                  )}
                  {rpoExceeded && (
                    <li>
                      • <strong>Alerta RPO (Punto de Recuperación / Pérdida de Datos):</strong> La
                      ventana de datos perdidos alcanza{' '}
                      <strong className="font-mono">~{restorationPlan.rpoHoursLost} h</strong> (
                      <strong className="font-mono">{restorationPlan.rpoDataLostGB} GB</strong> no
                      respaldados), superando el límite de{' '}
                      <strong className="font-mono">{params.targetRPOHours} h</strong>
                      {rpoDiffHours > 0 ? ` (+${rpoDiffHours} h sobre el SLA)` : ''}.{' '}
                      <span className="underline decoration-red-400">
                        Recomendación:
                      </span>{' '}
                      Elimina días configurados como «Sin Copia» o reduce el intervalo entre copias.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              {rtoExceeded && (
                <span className="px-2.5 py-1 rounded border border-red-400 dark:border-red-700 bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">
                  ▲ RTO: {restorationPlan.totalRestoreTimeMinutes}m &gt; {params.targetRTOMinutes}m
                </span>
              )}
              {rpoExceeded && (
                <span className="px-2.5 py-1 rounded border border-red-400 dark:border-red-700 bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">
                  ▲ RPO: {restorationPlan.rpoHoursLost}h &gt; {params.targetRPOHours}h
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel Superior: Configuración del Siniestro y SLAs de Recuperación (RTO/RPO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Selector de Día y Hora del Desastre (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span>01. Configuración del Escenario de Desastre</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecciona el día y el instante en que cae el servidor. Los días con borde rojo e
                icono de alerta incumplen el objetivo de RTO o RPO definido.
              </p>
            </div>

            {/* Día del incidente con indicadores de alerta SLA por día */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Día en que ocurre el desastre:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Indica día que supera RTO ({params.targetRTOMinutes}m) o RPO ({params.targetRPOHours}h)</span>
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {computedDays.map((day) => {
                  const isSelected = day.id === disasterDayId;
                  const breach = daySLABreaches[day.id];
                  const hasBreach = breach?.rtoBreach || breach?.rpoBreach;

                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => onSelectDisasterDay(day.id)}
                      title={
                        hasBreach
                          ? `Alerta SLA en ${day.name}: RTO ${breach.rtoMin}m / RPO ${breach.rpoHours}h`
                          : `${day.name}: Cumple objetivos RTO y RPO`
                      }
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? hasBreach
                            ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-500/40 shadow-xs'
                            : 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : hasBreach
                          ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500 dark:border-red-500/80 text-red-900 dark:text-red-200 hover:bg-red-100/70'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 text-xs font-bold whitespace-nowrap">
                        <span>{day.shortName}</span>
                        {hasBreach && (
                          <AlertTriangle
                            className={`w-3 h-3 shrink-0 ${
                              isSelected ? 'text-white' : 'text-red-600 dark:text-red-400'
                            }`}
                          />
                        )}
                      </div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 whitespace-nowrap ${
                          isSelected
                            ? 'text-white/90'
                            : hasBreach
                            ? 'text-red-700 dark:text-red-300 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {getBackupTypeLabel(day.backupType).slice(0, 4)}.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Momento del desastre respecto a la ventana nocturna */}
            <div className="mt-5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Hora del siniestro respecto a la ventana de backup (22:00h):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelectDisasterTiming('after_backup')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    disasterTiming === 'after_backup'
                      ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>Tras finalizar el backup (23:59h)</span>
                    {disasterTiming === 'after_backup' && (
                      <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                        ● Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    La copia de seguridad del propio {restorationPlan.disasterDayName} ya se ha
                    completado con éxito (RPO = 0h salvo días sin copia).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectDisasterTiming('before_backup')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    disasterTiming === 'before_backup'
                      ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>A mitad de jornada laboral (14:00h)</span>
                    {disasterTiming === 'before_backup' && (
                      <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                        ● Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    El fallo ocurre ANTES del backup nocturno del {restorationPlan.disasterDayName}.
                    Genera al menos ~16h de pérdida de datos (RPO).
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Simulador de Cinta / Soporte Corrupto */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Prueba de Tolerancia a Fallos: ¿Qué pasa si un soporte está dañado?</span>
              </span>
              {corruptedDayId && (
                <button
                  type="button"
                  onClick={() => onToggleCorruptedDay(null)}
                  className="text-xs text-sky-600 dark:text-sky-400 underline cursor-pointer"
                >
                  Reparar todos los soportes
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {computedDays.map((day) => {
                if (day.backupType === 'none') return null;
                const isCorrupted = corruptedDayId === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => onToggleCorruptedDay(isCorrupted ? null : day.id)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isCorrupted
                        ? 'bg-red-600 text-white border-red-600 font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-500'
                    }`}
                  >
                    {isCorrupted ? `✕ ${day.name} (DAÑADO)` : `Dañar ${day.shortName}`}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Panel Derecho: Métricas RTO / RPO con Validación Visual y Sliders SLA (5 cols) */}
        <section
          className={`lg:col-span-5 bg-white dark:bg-slate-900 border rounded-xl p-6 flex flex-col justify-between transition-all ${
            rtoExceeded || rpoExceeded
              ? 'border-red-500 dark:border-red-500/80 ring-1 ring-red-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {rtoExceeded || rpoExceeded ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  ) : (
                    <Wrench className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                  )}
                  <span>02. Validación de Objetivos RTO y RPO</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compara el tiempo de restauración y pérdida de datos frente a los umbrales SLA.
                </p>
              </div>
              <span
                className={`text-xs font-mono font-bold whitespace-nowrap ${
                  rtoExceeded || rpoExceeded
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {rtoExceeded || rpoExceeded ? '▲ ALERTA SLA' : '✓ SLA CUMPLIDO'}
              </span>
            </div>

            {/* Tarjetas de RTO y RPO con Bordes Rojos e Iconos de Advertencia cuando superan objetivos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              {/* Tarjeta RTO */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  rtoExceeded
                    ? 'border-red-500 dark:border-red-500 bg-red-50/60 dark:bg-red-950/35 ring-1 ring-red-500/30'
                    : 'border-emerald-500/50 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    RTO Calculado
                  </span>
                  {rtoExceeded ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>EXCEDE SLA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>OK</span>
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                  <span
                    className={`text-2xl font-bold ${
                      rtoExceeded
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {restorationPlan.totalRestoreTimeMinutes} min
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / máx {params.targetRTOMinutes} min
                  </span>
                </div>

                <div className="text-[11px] mt-1.5 font-mono tabular-nums">
                  {rtoExceeded ? (
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      {restorationPlan.isPartialDueToCorruption || !restorationPlan.isRecoverable
                        ? '✕ Cadena rota o sin base'
                        : `▲ Supera objetivo en +${rtoDiffMinutes} min (${restorationPlan.setsRequiredCount} pasos)`}
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">
                      Lectura: {restorationPlan.totalVolumeToReadGB} GB en{' '}
                      {restorationPlan.setsRequiredCount} paso(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Tarjeta RPO */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  rpoExceeded
                    ? 'border-red-500 dark:border-red-500 bg-red-50/60 dark:bg-red-950/35 ring-1 ring-red-500/30'
                    : 'border-emerald-500/50 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    RPO Calculado
                  </span>
                  {rpoExceeded ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>EXCEDE SLA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>OK</span>
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                  <span
                    className={`text-2xl font-bold ${
                      rpoExceeded
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {restorationPlan.rpoHoursLost} h
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / máx {params.targetRPOHours} h
                  </span>
                </div>

                <div className="text-[11px] mt-1.5 font-mono tabular-nums">
                  {rpoExceeded ? (
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      ▲ Pierde {restorationPlan.rpoDataLostGB} GB (+{rpoDiffHours} h sobre el SLA)
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">
                      Datos perdidos: {restorationPlan.rpoDataLostGB} GB (dentro de umbral)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sliders de Umbrales SLA (RTO Objetivo y RPO Objetivo) */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              {/* Slider RTO Objetivo */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor="rto-sla-slider"
                    className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                  >
                    <span>Objetivo RTO Máximo (Tiempo de Restauración):</span>
                  </label>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      rtoExceeded
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {params.targetRTOMinutes} min
                  </span>
                </div>
                <input
                  id="rto-sla-slider"
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
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>10 min (Crítico)</span>
                  <span>60 min (Estándar)</span>
                  <span>240 min (4h)</span>
                </div>
              </div>

              {/* Slider RPO Objetivo */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor="rpo-sla-slider"
                    className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                  >
                    <span>Objetivo RPO Máximo (Pérdida de Datos Tolerable):</span>
                  </label>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      rpoExceeded
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {params.targetRPOHours} h
                  </span>
                </div>
                <input
                  id="rpo-sla-slider"
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
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>0 h (Cero pérdida)</span>
                  <span>24 h (Copia diaria)</span>
                  <span>72 h (3 días)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico Didáctico */}
          <div
            className={`mt-5 p-4 rounded-xl border text-xs leading-relaxed ${
              !restorationPlan.isRecoverable ||
              restorationPlan.isPartialDueToCorruption ||
              rtoExceeded ||
              rpoExceeded
                ? 'bg-red-50/70 dark:bg-red-950/30 border-red-400 dark:border-red-800 text-red-900 dark:text-red-200'
                : 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              {!restorationPlan.isRecoverable || restorationPlan.isPartialDueToCorruption ? (
                <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              ) : rtoExceeded || rpoExceeded ? (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span>Diagnóstico del Motor de Recuperación:</span>
            </div>
            <p>{restorationPlan.pedagogicalSummary}</p>
          </div>
        </section>
      </div>

      {/* Mapa Visual de la Cadena de Restauración en la Semana */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          03. Mapa Visual de Selección de Soportes en la Semana
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          El motor analiza los 7 días y marca qué soportes son imprescindibles (y en qué orden) y
          cuáles se omiten por haber sido superados por una copia Completa o Diferencial posterior.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mt-5">
          {computedDays.map((day, idx) => {
            const disasterIdx = computedDays.findIndex((d) => d.id === disasterDayId);
            const lastAvailIdx =
              disasterTiming === 'after_backup' ? disasterIdx : disasterIdx - 1;

            const isAfterDisaster = idx > lastAvailIdx;
            const stepFound = restorationPlan.steps.find((s) => s.dayId === day.id);
            const discardedFound = restorationPlan.discardedBackups.find(
              (d) => d.dayId === day.id
            );
            const isCorrupted = corruptedDayId === day.id;
            const isUnbackedBeforeDisaster =
              !isAfterDisaster && day.backupType === 'none';

            return (
              <div
                key={day.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  stepFound
                    ? isCorrupted
                      ? 'border-red-600 bg-red-50/40 dark:bg-red-950/30'
                      : 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                    : isUnbackedBeforeDisaster && rpoExceeded
                    ? 'border-red-500 bg-red-50/40 dark:bg-red-950/25'
                    : discardedFound
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/30 opacity-75'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{day.name}</span>
                    {stepFound && (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        PASO #{stepFound.stepNumber}
                      </span>
                    )}
                    {discardedFound && (
                      <span className="text-slate-500 dark:text-slate-400">OMITIDO</span>
                    )}
                    {isAfterDisaster && (
                      <span className="text-red-600 dark:text-red-400">POST-FALLO</span>
                    )}
                    {isUnbackedBeforeDisaster && (
                      <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        <span>SIN COPIA</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {getBackupTypeLabel(day.backupType)} ({day.storedBackupSizeGB} GB)
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  {stepFound && !isCorrupted && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ Requerido: Leer {stepFound.sizeToReadGB} GB ({stepFound.readDurationMinutes}{' '}
                      min)
                    </span>
                  )}
                  {stepFound && isCorrupted && (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      ✕ SOPORTE CORRUPTO: Rompe el paso #{stepFound.stepNumber}
                    </span>
                  )}
                  {discardedFound && (
                    <span>
                      Saltado: Ya englobado en copia posterior
                      {isCorrupted ? ' (Su corrupción NO afecta)' : ''}.
                    </span>
                  )}
                  {!stepFound && !discardedFound && isAfterDisaster && (
                    <span>No ejecutado antes del siniestro.</span>
                  )}
                  {isUnbackedBeforeDisaster && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      ▲ +{day.dailyChangeGB} GB sin respaldar (+24h al RPO).
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Desglose Detallado Paso a Paso de la Secuencia de Restauración */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Lista Ordenada de Pasos de Restauración (7 cols) */}
        <section
          className={`lg:col-span-7 bg-white dark:bg-slate-900 border rounded-xl p-6 ${
            rtoExceeded
              ? 'border-red-500 dark:border-red-500/80'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {rtoExceeded ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <HardDriveDownload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>04. Secuencia Exacta de Restauración (Runbook Paso a Paso)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Orden cronológico estricto en el que deben montarse y volcarse los conjuntos de
                respaldo.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                rtoExceeded
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Total: {restorationPlan.steps.length} paso(s) · {restorationPlan.totalVolumeToReadGB}{' '}
              GB · {restorationPlan.totalRestoreTimeMinutes} min
            </span>
          </div>

          {restorationPlan.steps.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No es posible construir una cadena de restauración válida
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                {restorationPlan.failureReason}
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {restorationPlan.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className={`p-4 rounded-xl border transition-all ${
                    step.isCorrupted
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-sky-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>
                            Cargar Copia {getBackupTypeLabel(step.backupType)} del {step.dayName}
                          </span>
                          {step.isCorrupted && (
                            <span className="text-xs font-mono text-red-600 dark:text-red-400">
                              [SOPORTE CORRUPTO]
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {step.dataCoveredDescription}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {step.sizeToReadGB} GB
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{step.readDurationMinutes} min de lectura</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                    <strong>Por qué es necesario este paso:</strong> {step.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Conjuntos Descartados / Ahorrados (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SkipForward className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>05. Copias Omitidas (No Necesarias para Restaurar)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pregunta clásica de examen: por qué NO debemos cargar todos los respaldos de la
                semana cuando existe una copia Diferencial o una nueva Completa.
              </p>
            </div>

            {restorationPlan.discardedBackups.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                <Disc className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <p>
                  En este escenario no se ha descartado ninguna copia previa (todas las copias
                  realizadas hasta el momento del fallo forman parte activa de la cadena).
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {restorationPlan.discardedBackups.map((disc) => (
                  <div
                    key={disc.dayId}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>
                        {disc.dayName} — Copia {getBackupTypeLabel(disc.backupType)}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {disc.sizeGB} GB ahorrados
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {disc.discardReason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Regla de Oro para Exámenes de Restauración:</span>
            </div>
            <p>
              1. Busca siempre la <strong>última Copia Completa</strong> anterior al desastre.
            </p>
            <p>
              2. Si después de esa Completa hay una o varias <strong>Diferenciales</strong>, toma{' '}
              <strong>SOLO la última Diferencial</strong> (ignora incrementales o diferenciales
              entre la Completa y esa Diferencial).
            </p>
            <p>
              3. Por último, aplica en orden todas las <strong>Incrementales</strong> posteriores a
              esa Diferencial (o posteriores a la Completa si no hubo ninguna Diferencial).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
