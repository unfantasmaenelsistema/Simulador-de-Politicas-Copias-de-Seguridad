import React, { useEffect, useMemo, useState } from 'react';
import {
  BackupType,
  CopyNode321,
  DayConfig,
  DayId,
  INITIAL_321_NODES,
  INITIAL_DAYS,
  SimulationParams,
  STORAGE_MEDIA,
  computeRestorationPlan,
  computeWeeklySchedule,
  evaluate321Architecture,
  formatRpoHours,
  getBackupTypeLabel,
} from './data/backupEngine';
import { LabChallenge } from './data/challengesData';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { RestorationSimulatorView } from './components/RestorationSimulatorView';
import { Strategy321View } from './components/Strategy321View';
import { ChallengesAndGuideView } from './components/ChallengesAndGuideView';
import {
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  HardDriveDownload,
  Moon,
  ShieldCheck,
  Sun,
  Terminal,
} from 'lucide-react';

type ActiveTab = 'planner' | 'restore' | 'strategy321' | 'challenges';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [logoError, setLogoError] = useState<boolean>(false);

  // Estado del calendario semanal (7 días)
  const [days, setDays] = useState<DayConfig[]>(INITIAL_DAYS);

  // Parámetros globales de simulación
  const [params, setParams] = useState<SimulationParams>({
    baseVolumeGB: 500,
    hasPreviousSundayFull: true,
    calculationMode: 'academic_classic',
    compressionRatio: 0.75,
    backupHour: 22,
    maxBackupWindowMinutes: 90,
    targetRTOMinutes: 60,
    targetRPOHours: 24,
    selectedMediumId: 'nas_1gbe',
  });

  // Estado del simulador de desastre y restauración
  const [disasterDayId, setDisasterDayId] = useState<DayId>('vie');
  const [disasterTiming, setDisasterTiming] = useState<'before_backup' | 'after_backup'>(
    'after_backup'
  );
  const [corruptedSelection, setCorruptedDayId] = useState<DayId | null>(null);
  // Un día que pasa a «Sin copia» ya no tiene soporte que pueda estar dañado
  const corruptedDayId =
    corruptedSelection && days.find((d) => d.id === corruptedSelection)?.backupType !== 'none'
      ? corruptedSelection
      : null;

  // Estado de los nodos de arquitectura 3-2-1
  const [nodes321, setNodes321] = useState<CopyNode321[]>(INITIAL_321_NODES);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const selectedMedium = useMemo(
    () => STORAGE_MEDIA.find((m) => m.id === params.selectedMediumId) || STORAGE_MEDIA[0],
    [params.selectedMediumId]
  );

  const computedDays = useMemo(
    () => computeWeeklySchedule(days, params, selectedMedium),
    [days, params, selectedMedium]
  );

  const restorationPlan = useMemo(
    () =>
      computeRestorationPlan(
        computedDays,
        params,
        selectedMedium,
        disasterDayId,
        disasterTiming,
        corruptedDayId
      ),
    [computedDays, params, selectedMedium, disasterDayId, disasterTiming, corruptedDayId]
  );

  // Plan de restauración en Viernes tras el backup (usado para evaluar los retos de laboratorio)
  const fridayAfterBackupPlan = useMemo(
    () =>
      computeRestorationPlan(computedDays, params, selectedMedium, 'vie', 'after_backup', null),
    [computedDays, params, selectedMedium]
  );

  const validation321 = useMemo(() => evaluate321Architecture(nodes321), [nodes321]);

  // Handlers de actualización
  const handleUpdateDayType = (dayId: DayId, backupType: BackupType) => {
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, backupType } : d)));
  };

  const handleUpdateDayChangeGB = (dayId: DayId, dailyChangeGB: number) => {
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, dailyChangeGB } : d)));
  };

  const handleApplyBulkWeekdayChange = (weekdayGB: number, weekendGB: number) => {
    setDays((prev) =>
      prev.map((d, idx) => ({
        ...d,
        dailyChangeGB: idx < 5 ? weekdayGB : weekendGB,
      }))
    );
  };

  const handleUpdateParams = (patch: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPreset = (schedule: Record<DayId, BackupType>) => {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        backupType: schedule[d.id],
      }))
    );
  };

  const handleJumpToRestoreDay = (dayId: DayId) => {
    setDisasterDayId(dayId);
    setActiveTab('restore');
  };

  // Handlers 3-2-1
  const handleUpdateNode321 = (id: string, patch: Partial<CopyNode321>) => {
    setNodes321((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const handleAddNode321 = () => {
    setNodes321((prev) => [
      ...prev,
      {
        id: `node_custom_${Date.now()}`,
        label: `Copia ${prev.length + 1}: Cinta LTO en Bóveda Externa`,
        role: 'backup_secondary',
        mediumType: 'tape_lto',
        location: 'offsite_branch',
        isImmutableOrAirgapped: true,
        enabled: true,
      },
    ]);
  };

  const handleRemoveNode321 = (id: string) => {
    setNodes321((prev) => prev.filter((n) => n.id !== id));
  };

  const handleLoadArchitecturePreset = (
    preset: 'vulnerable_pyme' | 'standard_321' | 'hardened_32110'
  ) => {
    if (preset === 'vulnerable_pyme') {
      setNodes321([
        {
          id: 'node_prod',
          label: 'Copia 1: Servidor de Producción (Datos Activos)',
          role: 'production',
          mediumType: 'nvme_raid',
          location: 'local_cpd',
          isImmutableOrAirgapped: false,
          enabled: true,
        },
        {
          id: 'node_local_backup',
          label: 'Copia 2: NAS Local por Carpeta Compartida SMB',
          role: 'backup_primary',
          mediumType: 'nas_smb',
          location: 'local_cpd',
          isImmutableOrAirgapped: false,
          enabled: true,
        },
        {
          id: 'node_offsite_backup',
          label: 'Copia 3: Segundo NAS en Despacho Contiguo',
          role: 'backup_offsite',
          mediumType: 'nas_smb',
          location: 'local_building_safe',
          isImmutableOrAirgapped: false,
          enabled: false,
        },
      ]);
    } else if (preset === 'standard_321') {
      setNodes321([
        {
          id: 'node_prod',
          label: 'Copia 1: Servidor de Producción (Datos Activos)',
          role: 'production',
          mediumType: 'nvme_raid',
          location: 'local_cpd',
          isImmutableOrAirgapped: false,
          enabled: true,
        },
        {
          id: 'node_local_backup',
          label: 'Copia 2: Repositorio NAS Local',
          role: 'backup_primary',
          mediumType: 'nas_smb',
          location: 'local_cpd',
          isImmutableOrAirgapped: false,
          enabled: true,
        },
        {
          id: 'node_offsite_backup',
          label: 'Copia 3: Servidor en Sede Remota',
          role: 'backup_offsite',
          mediumType: 'remote_datacenter',
          location: 'offsite_branch',
          isImmutableOrAirgapped: false,
          enabled: true,
        },
      ]);
    } else {
      setNodes321(INITIAL_321_NODES);
    }
  };

  // Cargar reto desde la pestaña de Retos
  const handleLoadChallengeSetup = (challenge: LabChallenge) => {
    setParams((prev) => ({
      ...prev,
      baseVolumeGB: challenge.targetSetup.baseVolumeGB,
      selectedMediumId: challenge.targetSetup.mediumId,
      calculationMode: 'academic_classic',
    }));
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        dailyChangeGB: challenge.targetSetup.dailyChanges[d.id],
      }))
    );
    setActiveTab('planner');
  };

  // Exportar informe técnico en Markdown para entrega de práctica
  const handleDownloadReport = () => {
    const totalStorage = computedDays[computedDays.length - 1]?.cumulativeStorageGB ?? 0;
    const totalMinutes = Number(
      computedDays.reduce((acc, d) => acc + d.backupDurationMinutes, 0).toFixed(1)
    );

    const lines: string[] = [
      '# Informe Técnico de Planificación de Copias de Seguridad y Estrategia 3-2-1',
      'Generado con el Simulador de Políticas de Copias de Seguridad — Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)',
      '',
      '## 1. Parámetros del Sistema',
      `- **Volumen Base Inicial (V0):** ${params.baseVolumeGB} GB`,
      `- **Medio de Almacenamiento:** ${selectedMedium.name} (Escritura: ${selectedMedium.writeSpeedMBps} MB/s | Lectura: ${selectedMedium.readSpeedMBps} MB/s)`,
      `- **Modo de Cálculo:** ${params.calculationMode}`,
      `- **Espacio Total Consumido en la Semana:** ${totalStorage} GB`,
      `- **Tiempo Total de Ventana de Copia Semanal:** ${totalMinutes} minutos`,
      '',
      '## 2. Planificación del Calendario Semanal',
      '| Día | Tipo de Copia | Cambios del Día (GB) | Tamaño Copia (GB) | Acumulado (GB) | Tiempo Copia (min) |',
      '| :--- | :--- | :---: | :---: | :---: | :---: |',
      ...computedDays.map(
        (d) =>
          `| ${d.name} | ${getBackupTypeLabel(d.backupType)} | +${d.dailyChangeGB} GB | ${
            d.storedBackupSizeGB
          } GB | ${d.cumulativeStorageGB} GB | ${d.backupDurationMinutes} min |`
      ),
      '',
      `## 3. Plan de Restauración ante Desastre (${restorationPlan.disasterDayName} - ${
        restorationPlan.disasterTiming === 'after_backup'
          ? 'Tras el backup nocturno'
          : 'Antes del backup nocturno'
      })`,
      `- **Estado de Recuperación:** ${
        restorationPlan.isRecoverable ? 'RECUPERABLE' : 'FALLO CRÍTICO'
      }`,
      `- **Volumen Total a Leer:** ${restorationPlan.totalVolumeToReadGB} GB en ${restorationPlan.setsRequiredCount} paso(s)`,
      `- **Tiempo Total Estimado de Restauración (RTO):** ${restorationPlan.totalRestoreTimeMinutes} min`,
      `- **Pérdida de Datos Estimada (RPO):** ${restorationPlan.rpoDataLostGB} GB (${formatRpoHours(restorationPlan.rpoHoursLost)})`,
      ...(corruptedDayId ? [`- **Soporte dañado simulado:** ${restorationPlan.corruptedDayId}`] : []),
      '',
      '### Pasos Exactos de Restauración:',
      ...restorationPlan.steps.map(
        (s) =>
          `${s.stepNumber}. **${s.dayName} (${getBackupTypeLabel(s.backupType)})** — Leer ${
            s.sizeToReadGB
          } GB (${s.readDurationMinutes} min). Motivo: ${s.reason}`
      ),
      '',
      '## 4. Auditoría de Arquitectura 3-2-1-1-0',
      `- **Cumple Regla 3-2-1:** ${validation321.is321Compliant ? 'SÍ' : 'NO'} (${
        validation321.totalCopies
      } copias, ${validation321.distinctMediaTypes} medios distintos, ${
        validation321.offsiteCopies
      } offsite)`,
      `- **Cumple Inmutabilidad / Air-Gap (3-2-1-1-0):** ${
        validation321.is32110Compliant ? 'SÍ' : 'NO'
      }`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-backup-321-${disasterDayId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentMetricsForChallenges = useMemo(
    () => ({
      totalWeeklyStorageGB: computedDays[computedDays.length - 1]?.cumulativeStorageGB ?? 0,
      maxDailyBackupMinutes: Math.max(...computedDays.map((d) => d.backupDurationMinutes), 0),
      fridayAfterBackupRestoreSteps: fridayAfterBackupPlan.setsRequiredCount,
      fridayAfterBackupRTOMinutes: fridayAfterBackupPlan.totalRestoreTimeMinutes,
      hasFullOnMonday: days[0]?.backupType === 'full',
      unbackedDaysCount: days.filter((d) => d.backupType === 'none').length,
      unbackedWeekdaysCount: days.slice(0, 5).filter((d) => d.backupType === 'none').length,
      is32110Compliant: validation321.is32110Compliant,
    }),
    [computedDays, fridayAfterBackupPlan, days, validation321]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 zonas separadas por gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zona 1: Brand Title en 1 línea */}
        <a
          href="https://www.unfantasmaenelsistema.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate min-w-0 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          Un Fantasma en el Sistema
        </a>

        {/* Zona 2: 4 enlaces de navegación concisos en 1 línea */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'planner'
                ? 'border-sky-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Planificador Semanal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'restore'
                ? 'border-sky-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Simulador de Restauración
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('strategy321')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'strategy321'
                ? 'border-sky-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Estrategia 3-2-1
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'challenges'
                ? 'border-sky-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Retos y Teoría
          </button>
        </nav>

        {/* Zona 3: 1 acción primaria */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Visitar Web Oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Contenedor Principal (Desktop 1440px) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Cabecera del Laboratorio Didáctico con el Logo de Un Fantasma en el Sistema */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-xs"
              title="Ir a https://www.unfantasmaenelsistema.com/"
            >
              {!logoError ? (
                <img
                  src="./assets/aistudio/icono_81a3db5b.png"
                  alt="Logo de Un Fantasma en el Sistema"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Terminal className="w-10 h-10 text-sky-600 dark:text-sky-400" />
              )}
            </a>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Laboratorio Interactivo de Administración de Sistemas y Ciberseguridad</span>
                <span aria-hidden="true">·</span>
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  www.unfantasmaenelsistema.com
                </a>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                Simulador de Políticas de Copias de Seguridad y Estrategia 3-2-1
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                Planifica calendarios semanales combinando copias{' '}
                <strong className="text-slate-900 dark:text-slate-200">Completas</strong>,{' '}
                <strong className="text-slate-900 dark:text-slate-200">Diferenciales</strong> e{' '}
                <strong className="text-slate-900 dark:text-slate-200">Incrementales</strong>.
                Calcula el consumo en el soporte, la ventana nocturna y simula la secuencia exacta
                de restauración ante desastres (RTO / RPO).
              </p>
            </div>
          </div>

          {/* Barra de Herramientas del Espacio de Trabajo */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-start lg:justify-end">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Exportar Informe (.md)</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Cambiar tema claro/oscuro"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Selector de Pestañas / Módulos Didácticos (Visible también en móvil) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'planner'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>1. Calendario Semanal y Almacenamiento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                !restorationPlan.meetsRTOSLA || !restorationPlan.meetsRPOSLA
                  ? activeTab === 'restore'
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-900 dark:text-red-100 shadow-xs'
                    : 'bg-red-50/70 dark:bg-red-950/30 border-red-500/80 text-red-700 dark:text-red-300 hover:bg-red-100/70'
                  : activeTab === 'restore'
                  ? 'bg-white dark:bg-slate-800 border-transparent text-slate-900 dark:text-white shadow-xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {!restorationPlan.meetsRTOSLA || !restorationPlan.meetsRPOSLA ? (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              ) : (
                <HardDriveDownload className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span>
                2. Simulador de Restauración ({restorationPlan.disasterDayName}:{' '}
                {restorationPlan.setsRequiredCount} pasos)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('strategy321')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'strategy321'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>
                3. Arquitectura 3-2-1 ({validation321.is321Compliant ? 'Cumple' : 'Incompleta'})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('challenges')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'challenges'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>4. Retos Evaluables y Guía Teórica</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              Semana: {computedDays[computedDays.length - 1]?.cumulativeStorageGB} GB
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                !restorationPlan.meetsRTOSLA
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
              title={`Objetivo RTO definido: <= ${params.targetRTOMinutes} min`}
            >
              {!restorationPlan.meetsRTOSLA && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>
                RTO ({restorationPlan.disasterDayName}): {restorationPlan.totalRestoreTimeMinutes}m /{' '}
                {params.targetRTOMinutes}m
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                !restorationPlan.meetsRPOSLA
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
              title={`Objetivo RPO definido: <= ${params.targetRPOHours} h`}
            >
              {!restorationPlan.meetsRPOSLA && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>
                RPO: {formatRpoHours(restorationPlan.rpoHoursLost)} / {params.targetRPOHours} h
              </span>
            </button>
          </div>
        </div>

        {/* Vista Activa */}
        {activeTab === 'planner' && (
          <WeeklyPlannerView
            days={days}
            params={params}
            computedDays={computedDays}
            selectedMedium={selectedMedium}
            onUpdateDayType={handleUpdateDayType}
            onUpdateDayChangeGB={handleUpdateDayChangeGB}
            onApplyBulkWeekdayChange={handleApplyBulkWeekdayChange}
            onUpdateParams={handleUpdateParams}
            onApplyPreset={handleApplyPreset}
            onJumpToRestoreDay={handleJumpToRestoreDay}
          />
        )}

        {activeTab === 'restore' && (
          <RestorationSimulatorView
            computedDays={computedDays}
            params={params}
            selectedMedium={selectedMedium}
            disasterDayId={disasterDayId}
            disasterTiming={disasterTiming}
            corruptedDayId={corruptedDayId}
            restorationPlan={restorationPlan}
            onSelectDisasterDay={setDisasterDayId}
            onSelectDisasterTiming={setDisasterTiming}
            onToggleCorruptedDay={setCorruptedDayId}
            onUpdateParams={handleUpdateParams}
          />
        )}

        {activeTab === 'strategy321' && (
          <Strategy321View
            nodes={nodes321}
            validation={validation321}
            onUpdateNode={handleUpdateNode321}
            onAddNode={handleAddNode321}
            onRemoveNode={handleRemoveNode321}
            onLoadArchitecturePreset={handleLoadArchitecturePreset}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesAndGuideView
            currentMetrics={currentMetricsForChallenges}
            onLoadChallengeSetup={handleLoadChallengeSetup}
          />
        )}
      </main>

      {/* Pie de Página con Marca y Enlace a Un Fantasma en el Sistema */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {!logoError && (
              <img
                src="./assets/aistudio/icono_81a3db5b.png"
                alt="Logo Un Fantasma en el Sistema"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-11 h-11 object-contain"
              />
            )}
            <div>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
              >
                Un Fantasma en el Sistema
              </a>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recurso educativo interactivo para Formación Profesional e Ingeniería Informática ·{' '}
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-sky-600 dark:hover:text-sky-400"
                >
                  https://www.unfantasmaenelsistema.com/
                </a>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
            <span>Simulador de Copias de Seguridad (Full / Diff / Inc)</span>
            <span aria-hidden="true">·</span>
            <span>Estrategia 3-2-1-1-0</span>
            <span aria-hidden="true">·</span>
            <span>Código abierto (MIT)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
