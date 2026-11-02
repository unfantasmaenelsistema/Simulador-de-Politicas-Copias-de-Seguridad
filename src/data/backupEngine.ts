export type BackupType = 'full' | 'differential' | 'incremental' | 'none';

export type DayId = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface DayConfig {
  id: DayId;
  name: string;
  shortName: string;
  dayIndex: number; // 0 = Lunes .. 6 = Domingo
  backupType: BackupType;
  dailyChangeGB: number; // Datos nuevos/modificados generados ese día
}

export interface StorageMedium {
  id: string;
  name: string;
  category: 'local_nas' | 'tape' | 'external_disk' | 'cloud' | 'san_nvme';
  writeSpeedMBps: number;
  readSpeedMBps: number;
  capacityGB: number;
  costPerGBMonth: number;
  supportsImmutability: boolean;
  isOffsiteCapable: boolean;
  description: string;
}

export type CalculationMode = 'academic_classic' | 'academic_cumulative' | 'production_compressed';

export interface SimulationParams {
  baseVolumeGB: number; // Volumen inicial del sistema (ej. 500 GB)
  hasPreviousSundayFull: boolean; // Si existe una copia Completa previa del Domingo anterior (V0)
  calculationMode: CalculationMode;
  compressionRatio: number; // Ej. 0.75 (25% reducción) en modo producción
  backupHour: number; // Hora de ejecución del backup (ej. 22:00)
  maxBackupWindowMinutes: number; // SLA máximo de ventana nocturna (ej. 120 min)
  targetRTOMinutes: number; // SLA máximo de tiempo de restauración (ej. 60 min)
  targetRPOHours: number; // SLA máximo de pérdida de datos en horas (ej. 24h)
  selectedMediumId: string;
}

export interface ComputedDayResult {
  id: DayId;
  name: string;
  shortName: string;
  dayIndex: number;
  backupType: BackupType;
  dailyChangeGB: number;
  unbackedPendingGBBeforeBackup: number;
  systemTotalVolumeGB: number; // Tamaño total de producción ese día
  rawBackupSizeGB: number; // Tamaño lógico a respaldar
  storedBackupSizeGB: number; // Tamaño final en soporte (aplicando compresión si procede)
   cumulativeStorageGB: number; // Espacio acumulado en el soporte durante la semana
  backupDurationMinutes: number; // Tiempo de ventana de copia en minutos
  exceedsBackupWindow: boolean;
  formulaExplanation: string;
  referenceAnchorLabel: string;
  hasMissingBaseWarning: boolean;
}

export interface RestorationStep {
  stepNumber: number;
  dayId: DayId | 'prev_dom';
  dayName: string;
  backupType: BackupType;
  sizeToReadGB: number;
  readDurationMinutes: number;
  reason: string;
  dataCoveredDescription: string;
  isCorrupted?: boolean;
}

export interface DiscardedBackupInfo {
  dayId: DayId;
  dayName: string;
  backupType: BackupType;
  sizeGB: number;
  /** Etiqueta corta para el mapa semanal (Superada, Englobada, Dañado, Inutilizable). */
  shortReason: string;
  discardReason: string;
}

export interface RestorationPlan {
  disasterDayId: DayId;
  disasterDayName: string;
  disasterTiming: 'before_backup' | 'after_backup';
  corruptedDayId: DayId | null;
  isRecoverable: boolean;
  isPartialDueToCorruption: boolean;
  failureReason?: string;
  steps: RestorationStep[];
  discardedBackups: DiscardedBackupInfo[];
  totalVolumeToReadGB: number;
  totalRestoreTimeMinutes: number; // RTO real
  meetsRTOSLA: boolean;
  rpoHoursLost: number; // Horas de datos perdidos (Infinity si no se puede restaurar nada)
  rpoDataLostGB: number; // GB de trabajo perdido no respaldado
  meetsRPOSLA: boolean;
  setsRequiredCount: number;
  /** Día cuyo estado se recupera (-1 = Completa del domingo anterior); null si no hay ninguno. */
  restorePointIndex: number | null;
  pedagogicalSummary: string;
}

export interface CopyNode321 {
  id: string;
  label: string;
  role: 'production' | 'backup_primary' | 'backup_secondary' | 'backup_offsite';
  mediumType: 'nvme_raid' | 'nas_smb' | 'tape_lto' | 'usb_rdx' | 'cloud_s3' | 'remote_datacenter';
  location: 'local_cpd' | 'local_building_safe' | 'offsite_cloud' | 'offsite_branch';
  isImmutableOrAirgapped: boolean;
  enabled: boolean;
}

export interface Validation321Result {
  totalCopies: number;
  distinctMediaTypes: number;
  offsiteCopies: number;
  immutableCopies: number;
  meets3Copies: boolean;
  meets2Media: boolean;
  meets1Offsite: boolean;
  meets1Immutable: boolean;
  is321Compliant: boolean;
  is32110Compliant: boolean;
  disasterSimulations: {
    hardwareFailure: { survives: boolean; explanation: string; survivingNode?: string };
    ransomwareAttack: { survives: boolean; explanation: string; survivingNode?: string };
    siteFireFlood: { survives: boolean; explanation: string; survivingNode?: string };
  };
}

export const STORAGE_MEDIA: StorageMedium[] = [
  {
    id: 'nas_1gbe',
    name: 'NAS en Red Gigabit (1 GbE)',
    category: 'local_nas',
    writeSpeedMBps: 105,
    readSpeedMBps: 112,
    capacityGB: 4000,
    costPerGBMonth: 0.015,
    supportsImmutability: true,
    isOffsiteCapable: false,
    description: 'Almacenamiento en red habitual en PyMEs y laboratorios. Limitado por el ancho de banda de 1 Gbps (~110 MB/s reales).'
  },
  {
    id: 'nas_10gbe',
    name: 'Cabina NAS / SAN 10 GbE',
    category: 'san_nvme',
    writeSpeedMBps: 750,
    readSpeedMBps: 850,
    capacityGB: 16000,
    costPerGBMonth: 0.035,
    supportsImmutability: true,
    isOffsiteCapable: false,
    description: 'Red de almacenamiento de alta velocidad para servidores críticos con ventanas de backup muy estrechas.'
  },
  {
    id: 'lto8_tape',
    name: 'Librería de Cintas LTO-8',
    category: 'tape',
    writeSpeedMBps: 300,
    readSpeedMBps: 300,
    capacityGB: 12000,
    costPerGBMonth: 0.004,
    supportsImmutability: true,
    isOffsiteCapable: true,
    description: 'Excelente velocidad secuencial y aislamiento físico (Air-Gap) al extraer el cartucho. Requiere rebobinado/búsqueda secuencial.'
  },
  {
    id: 'usb_hdd',
    name: 'Disco Externo USB 3.2 / RDX',
    category: 'external_disk',
    writeSpeedMBps: 140,
    readSpeedMBps: 155,
    capacityGB: 2000,
    costPerGBMonth: 0.012,
    supportsImmutability: false,
    isOffsiteCapable: true,
    description: 'Soporte extraíble económico para rotación manual. Vulnerable si permanece conectado permanentemente.'
  },
  {
    id: 'cloud_s3_fiber',
    name: 'Repositorio Cloud S3 (Enlace 600 Mbps)',
    category: 'cloud',
    writeSpeedMBps: 65,
    readSpeedMBps: 70,
    capacityGB: 50000,
    costPerGBMonth: 0.023,
    supportsImmutability: true,
    isOffsiteCapable: true,
    description: 'Almacenamiento Object Storage fuera del sitio (Offsite) con soporte Object Lock (WORM). Limitado por la velocidad de subida WAN.'
  }
];

export interface PolicyPreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badgeText: string;
  schedule: Record<DayId, BackupType>;
  recommendedFor: string;
}

export const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: 'classic_incremental',
    name: 'Completa + Incrementales',
    subtitle: 'Mínimo espacio y ventana nocturna, restauración más larga',
    description: 'Copia Completa el Lunes y copias Incrementales de Martes a Domingo. Cada día solo guarda lo modificado desde el día anterior.',
    badgeText: 'Ahorro de Espacio',
    schedule: {
      lun: 'full',
      mar: 'incremental',
      mie: 'incremental',
      jue: 'incremental',
      vie: 'incremental',
      sab: 'incremental',
      dom: 'incremental'
    },
    recommendedFor: 'Sistemas con poco espacio de almacenamiento o ventanas nocturnas muy cortas.'
  },
  {
    id: 'classic_differential',
    name: 'Completa + Diferenciales',
    subtitle: 'Restauración rápida en máximo 2 pasos, mayor consumo desde mitad de semana',
    description: 'Copia Completa el Lunes y Diferenciales de Martes a Domingo. Cada diferencial acumula todo desde el Lunes, pero restaurar cualquier día solo requiere 2 conjuntos.',
    badgeText: 'RTO Rápido (2 pasos)',
    schedule: {
      lun: 'full',
      mar: 'differential',
      mie: 'differential',
      jue: 'differential',
      vie: 'differential',
      sab: 'differential',
      dom: 'differential'
    },
    recommendedFor: 'Entornos de producción que priorizan restaurar rápido (bajo RTO) sin depender de cadenas frágiles.'
  },
  {
    id: 'hybrid_enterprise',
    name: 'Híbrida Empresarial (Full + Diff + Inc)',
    subtitle: 'Equilibrio óptimo entre espacio consumido y longitud de cadena',
    description: 'Completa el Lunes, Incrementales Martes y Miércoles, un punto de corte Diferencial el Jueves, e Incrementales Viernes y Sábado.',
    badgeText: 'Equilibrio Producción',
    schedule: {
      lun: 'full',
      mar: 'incremental',
      mie: 'incremental',
      jue: 'differential',
      vie: 'incremental',
      sab: 'incremental',
      dom: 'none'
    },
    recommendedFor: 'Infraestructuras empresariales que acortan la cadena de restauración a mitad de semana.'
  },
  {
    id: 'all_full',
    name: 'Diaria Completa (Full Diario)',
    subtitle: 'Restauración en 1 solo paso pero coste de espacio y tiempo prohibitivo',
    description: 'Copia el 100% de los datos todos los días de la semana. Útil para comparar por qué existen las copias incrementales y diferenciales.',
    badgeText: 'Máximo Coste',
    schedule: {
      lun: 'full',
      mar: 'full',
      mie: 'full',
      jue: 'full',
      vie: 'full',
      sab: 'full',
      dom: 'full'
    },
    recommendedFor: 'Bases de datos críticas de pequeño tamaño donde el RTO debe ser mínimo absoluto.'
  }
];

export const INITIAL_DAYS: DayConfig[] = [
  { id: 'lun', name: 'Lunes', shortName: 'LUN', dayIndex: 0, backupType: 'full', dailyChangeGB: 30 },
  { id: 'mar', name: 'Martes', shortName: 'MAR', dayIndex: 1, backupType: 'incremental', dailyChangeGB: 40 },
  { id: 'mie', name: 'Miércoles', shortName: 'MIÉ', dayIndex: 2, backupType: 'incremental', dailyChangeGB: 35 },
  { id: 'jue', name: 'Jueves', shortName: 'JUE', dayIndex: 3, backupType: 'differential', dailyChangeGB: 45 },
  { id: 'vie', name: 'Viernes', shortName: 'VIE', dayIndex: 4, backupType: 'incremental', dailyChangeGB: 50 },
  { id: 'sab', name: 'Sábado', shortName: 'SÁB', dayIndex: 5, backupType: 'incremental', dailyChangeGB: 15 },
  { id: 'dom', name: 'Domingo', shortName: 'DOM', dayIndex: 6, backupType: 'none', dailyChangeGB: 10 },
];

export function computeWeeklySchedule(
  days: DayConfig[],
  params: SimulationParams,
  medium: StorageMedium
): ComputedDayResult[] {
  const results: ComputedDayResult[] = [];
  let cumulativeStorageGB = 0;

  // Seguimiento de volumen del sistema y puntos de control
  let systemTotalVolumeGB = params.baseVolumeGB;
  let hasAnyFullBackupSoFar = params.hasPreviousSundayFull;
  let lastFullDayName = params.hasPreviousSundayFull ? 'Dom. Anterior (Base)' : 'Ninguna';

  // Acumuladores desde la última Completa (para Diferenciales) y desde la última copia cualquiera (para Incrementales)
  let changesSinceLastFullGB = 0;
  let changesSinceLastAnyBackupGB = 0;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const changeToday = day.dailyChangeGB;

    // En modo "academic_classic", si el Lunes hay Completa, muchos problemas de clase asumen que el Lunes
    // se respalda exactamente el Volumen Base V0 (ej. 500 GB) y el cambio diario del Lunes es 0 o cuenta si no es Full.
    // Para que sea 100% transparente, en 'academic_classic' el Lunes con Full respalda V0 (si es índice 0 y tipo full),
    // o bien suma el cambio diario si no es el Full inaugural del Lunes.
    const isInauguralMondayFull =
      params.calculationMode === 'academic_classic' && i === 0 && day.backupType === 'full';

    const effectiveChangeBeforeBackup = isInauguralMondayFull ? 0 : changeToday;

    systemTotalVolumeGB += effectiveChangeBeforeBackup;
    changesSinceLastFullGB += effectiveChangeBeforeBackup;
    changesSinceLastAnyBackupGB += effectiveChangeBeforeBackup;

    let rawBackupSizeGB = 0;
    let formulaExplanation = '';
    let referenceAnchorLabel = '';
    let hasMissingBaseWarning = false;

    if (day.backupType === 'full') {
      rawBackupSizeGB = systemTotalVolumeGB;
      if (isInauguralMondayFull) {
        formulaExplanation = `Base inicial del sistema (${params.baseVolumeGB} GB). Nuevo punto de partida de diferenciales e incrementales.`;
      } else {
        formulaExplanation = `Base (${params.baseVolumeGB} GB) + cambios acumulados hasta ${day.name} (${Number((systemTotalVolumeGB - params.baseVolumeGB).toFixed(1))} GB) = ${rawBackupSizeGB} GB. Nuevo punto de partida.`;
      }
      referenceAnchorLabel = '100% del sistema (Nuevo punto base)';
      hasAnyFullBackupSoFar = true;
      lastFullDayName = day.name;
      // Al hacer una Completa, se reinician los cambios pendientes tanto para Diferencial como para Incremental
      changesSinceLastFullGB = 0;
      changesSinceLastAnyBackupGB = 0;
    } else if (day.backupType === 'differential') {
      if (!hasAnyFullBackupSoFar) {
        hasMissingBaseWarning = true;
      }
      rawBackupSizeGB = changesSinceLastFullGB;
      referenceAnchorLabel = `Cambios acumulados desde Completa (${lastFullDayName})`;
      formulaExplanation = `Suma todos los cambios desde la última Completa (${lastFullDayName}): ${rawBackupSizeGB} GB. La siguiente diferencial volverá a incluirlos.`;
      // Modelo de catálogo (Veeam, Bacula…): la incremental siguiente parte de esta diferencial.
      // Con el bit de archivo clásico no sería así: la diferencial no lo desmarca.
      changesSinceLastAnyBackupGB = 0;
    } else if (day.backupType === 'incremental') {
      if (!hasAnyFullBackupSoFar) {
        hasMissingBaseWarning = true;
      }
      rawBackupSizeGB = changesSinceLastAnyBackupGB;
      const prevBackupDay = findPreviousBackupDayLabel(days, i, params.hasPreviousSundayFull);
      referenceAnchorLabel = `Cambios desde última copia (${prevBackupDay})`;
      formulaExplanation = `Solo datos modificados desde la copia anterior (${prevBackupDay}): ${rawBackupSizeGB} GB.`;
      changesSinceLastAnyBackupGB = 0;
    } else {
      // 'none'
      rawBackupSizeGB = 0;
      referenceAnchorLabel = 'Sin ventana de copia programada';
      formulaExplanation = `No se ejecuta backup. Los ${effectiveChangeBeforeBackup} GB generados hoy quedan pendientes para el próximo respaldo.`;
    }

    const compressionFactor =
      params.calculationMode === 'production_compressed' ? params.compressionRatio : 1;

    const storedBackupSizeGB = Number((rawBackupSizeGB * compressionFactor).toFixed(1));
    cumulativeStorageGB = Number((cumulativeStorageGB + storedBackupSizeGB).toFixed(1));

    // Cálculo de tiempo: 1 GB = 1024 MB.
    // Tiempo (segundos) = (storedBackupSizeGB * 1024) / writeSpeedMBps
    const durationSeconds =
      storedBackupSizeGB > 0 ? (storedBackupSizeGB * 1024) / medium.writeSpeedMBps : 0;
    const backupDurationMinutes = Number((durationSeconds / 60).toFixed(1));

    results.push({
      id: day.id,
      name: day.name,
      shortName: day.shortName,
      dayIndex: day.dayIndex,
      backupType: day.backupType,
      dailyChangeGB: isInauguralMondayFull ? 0 : day.dailyChangeGB,
      unbackedPendingGBBeforeBackup: effectiveChangeBeforeBackup,
      systemTotalVolumeGB,
      rawBackupSizeGB,
      storedBackupSizeGB,
      cumulativeStorageGB,
      backupDurationMinutes,
      exceedsBackupWindow: backupDurationMinutes > params.maxBackupWindowMinutes,
      formulaExplanation,
      referenceAnchorLabel,
      hasMissingBaseWarning,
    });
  }

  return results;
}

function findPreviousBackupDayLabel(
  days: DayConfig[],
  currentIndex: number,
  hasPreviousSundayFull: boolean
): string {
  for (let j = currentIndex - 1; j >= 0; j--) {
    if (days[j].backupType !== 'none') {
      return `${days[j].name} (${getBackupTypeLabel(days[j].backupType)})`;
    }
  }
  return hasPreviousSundayFull ? 'Dom. Anterior (Completa)' : 'Inicio de semana (Sin base)';
}

export function getBackupTypeLabel(type: BackupType): string {
  switch (type) {
    case 'full':
      return 'Completa';
    case 'differential':
      return 'Diferencial';
    case 'incremental':
      return 'Incremental';
    case 'none':
      return 'Sin Copia';
  }
}

/** Hora del siniestro «a mitad de jornada», antes de la ventana de backup. */
export const DISASTER_HOUR_BEFORE_BACKUP = 14;

/** Índice de la copia anterior a `j` (de cualquier tipo); -1 si no hay ninguna esta semana. */
function previousBackupIndex(days: ComputedDayResult[], j: number): number {
  for (let k = j - 1; k >= 0; k--) {
    if (days[k].backupType !== 'none') return k;
  }
  return -1;
}

/**
 * Conjuntos necesarios para restaurar el estado de la copia del día `j`, del primero al
 * último. -1 representa la Completa del domingo anterior. null si la cadena no tiene base.
 * Modelo de catálogo (Veeam, Bacula, Acronis…): la diferencial parte de la última Completa
 * y la incremental de la copia anterior, sea del tipo que sea.
 */
export function restoreChainFor(
  days: ComputedDayResult[],
  j: number,
  hasPreviousSundayFull: boolean
): number[] | null {
  if (j < 0) return hasPreviousSundayFull ? [-1] : null;
  const type = days[j].backupType;
  if (type === 'none') return null;
  if (type === 'full') return [j];
  if (type === 'differential') {
    for (let k = j - 1; k >= 0; k--) {
      if (days[k].backupType === 'full') return [k, j];
    }
    return hasPreviousSundayFull ? [-1, j] : null;
  }
  const previous = restoreChainFor(days, previousBackupIndex(days, j), hasPreviousSundayFull);
  return previous ? [...previous, j] : null;
}

/** «16 h» o «pérdida total» cuando no hay nada que restaurar. */
export function formatRpoHours(hours: number): string {
  return Number.isFinite(hours) ? `${hours} h` : 'pérdida total';
}

export function computeRestorationPlan(
  computedDays: ComputedDayResult[],
  params: SimulationParams,
  medium: StorageMedium,
  disasterDayId: DayId,
  disasterTiming: 'before_backup' | 'after_backup',
  corruptedDayId: DayId | null
): RestorationPlan {
  const disasterIndex = computedDays.findIndex((d) => d.id === disasterDayId);
  const disasterDay = computedDays[disasterIndex];
  const lastAvailableDayIndex =
    disasterTiming === 'after_backup' ? disasterIndex : disasterIndex - 1;
  const corruptedIndex = corruptedDayId
    ? computedDays.findIndex((d) => d.id === corruptedDayId)
    : -2;
  const hasPrev = params.hasPreviousSundayFull;
  const factor = params.calculationMode === 'production_compressed' ? params.compressionRatio : 1;
  const prevSundaySizeGB = Number((params.baseVolumeGB * factor).toFixed(1));
  const readMinutes = (gb: number) => Number(((gb * 1024) / medium.readSpeedMBps / 60).toFixed(1));
  const nameOf = (i: number) => (i < 0 ? 'Domingo anterior' : computedDays[i].name);

  // Puntos de restauración posibles, del más reciente al más antiguo
  const candidates: number[] = [];
  for (let i = lastAvailableDayIndex; i >= 0; i--) {
    if (computedDays[i].backupType !== 'none') candidates.push(i);
  }
  candidates.push(-1);

  let ideal: { point: number; chain: number[] } | null = null;
  let chosen: { point: number; chain: number[] } | null = null;
  for (const point of candidates) {
    const chain = restoreChainFor(computedDays, point, hasPrev);
    if (!chain) continue;
    if (!ideal) ideal = { point, chain };
    if (!chain.includes(corruptedIndex)) {
      chosen = { point, chain };
      break;
    }
  }

  // Momento del siniestro y de cada punto de restauración en horas desde el lunes 00:00
  const disasterHour =
    disasterIndex * 24 +
    (disasterTiming === 'before_backup' ? DISASTER_HOUR_BEFORE_BACKUP : params.backupHour);
  const pointHour = (i: number) => i * 24 + params.backupHour;

  const base = {
    disasterDayId,
    disasterDayName: disasterDay.name,
    disasterTiming,
    corruptedDayId,
  };

  if (!ideal || !chosen) {
    const noBase = !ideal;
    const corruptName = corruptedIndex >= 0 ? computedDays[corruptedIndex].name : '';
    return {
      ...base,
      isRecoverable: false,
      isPartialDueToCorruption: !noBase,
      failureReason: noBase
        ? lastAvailableDayIndex < 0
          ? 'El siniestro ocurre antes de la primera copia de la semana y no existe la Completa del domingo anterior.'
          : 'No existe ninguna Copia Completa como base de la cadena. Las diferenciales e incrementales por sí solas no contienen el sistema base.'
        : `El soporte dañado del ${corruptName} es imprescindible en todas las cadenas disponibles y no queda ninguna Completa anterior utilizable.`,
      steps: [],
      discardedBackups: [],
      totalVolumeToReadGB: 0,
      totalRestoreTimeMinutes: 0,
      meetsRTOSLA: false,
      rpoHoursLost: Number.POSITIVE_INFINITY,
      rpoDataLostGB: disasterDay.systemTotalVolumeGB,
      meetsRPOSLA: false,
      setsRequiredCount: 0,
      restorePointIndex: null,
      pedagogicalSummary: noBase
        ? 'Error crítico de diseño: toda política necesita al menos una Copia Completa sobre la que aplicar diferenciales e incrementales.'
        : `FALLO CRÍTICO DE RESTAURACIÓN: sin el soporte del ${corruptName} no se puede reconstruir ningún estado del sistema. Una segunda copia (regla 3-2-1) o una Completa más reciente habrían evitado la pérdida total.`,
    };
  }

  const { point, chain } = chosen;
  const isPartialDueToCorruption = point !== ideal.point;

  const steps: RestorationStep[] = chain.map((idx, n) => {
    if (idx < 0) {
      return {
        stepNumber: n + 1,
        dayId: 'prev_dom',
        dayName: 'Domingo anterior (base)',
        backupType: 'full',
        sizeToReadGB: prevSundaySizeGB,
        readDurationMinutes: readMinutes(prevSundaySizeGB),
        reason: 'Completa del cierre de la semana anterior: base de toda la cadena.',
        dataCoveredDescription: `Volumen inicial del sistema (${params.baseVolumeGB} GB).`,
        isCorrupted: false,
      };
    }
    const day = computedDays[idx];
    const prevName = n > 0 ? nameOf(chain[n - 1]) : '';
    const reason =
      day.backupType === 'full'
        ? `Última Copia Completa utilizable. Restaura el 100 % del sistema tal como estaba el ${day.name}.`
        : day.backupType === 'differential'
        ? `Diferencial: aplica de golpe todos los cambios desde la Completa (${prevName}) hasta el ${day.name}.`
        : `Eslabón obligatorio de la cadena incremental: cambios desde la copia del ${prevName}. Debe aplicarse en este orden.`;
    return {
      stepNumber: n + 1,
      dayId: day.id,
      dayName: day.name,
      backupType: day.backupType,
      sizeToReadGB: day.storedBackupSizeGB,
      readDurationMinutes: readMinutes(day.storedBackupSizeGB),
      reason,
      dataCoveredDescription:
        day.backupType === 'full'
          ? `Datos base + acumulados hasta ${day.name} (${day.rawBackupSizeGB} GB lógicos).`
          : day.backupType === 'differential'
          ? `Cambios acumulados hasta ${day.name} (${day.rawBackupSizeGB} GB lógicos).`
          : `Cambios del ${day.name} (${day.rawBackupSizeGB} GB lógicos).`,
      isCorrupted: false,
    };
  });

  const baseFullIndex = chain[0];
  const corruptName = corruptedIndex >= 0 ? computedDays[corruptedIndex].name : '';
  const discardedBackups: DiscardedBackupInfo[] = [];
  for (let i = 0; i <= lastAvailableDayIndex; i++) {
    const day = computedDays[i];
    if (day.backupType === 'none' || chain.includes(i)) continue;
    let shortReason: string;
    let discardReason: string;
    if (i === corruptedIndex && ideal.chain.includes(i)) {
      shortReason = 'Dañado';
      discardReason = 'Soporte dañado e ilegible: no se puede leer, así que se busca otra cadena.';
    } else if (i > point) {
      shortReason = 'Inutilizable';
      discardReason = `Posterior al punto de restauración: su cadena necesita el soporte dañado del ${corruptName}.`;
    } else if (i < baseFullIndex) {
      shortReason = 'Superada';
      discardReason = `Superada por la Copia Completa del ${nameOf(baseFullIndex)}, que ya incluye todos los datos hasta esa fecha.`;
    } else {
      const diff = chain.find((c) => c > i && c >= 0 && computedDays[c].backupType === 'differential');
      shortReason = 'Englobada';
      discardReason =
        diff !== undefined
          ? `Innecesaria: la Diferencial del ${computedDays[diff].name} ya acumula todos los cambios desde la Completa del ${nameOf(baseFullIndex)}.`
          : 'Innecesaria: una copia posterior de la cadena ya contiene sus datos.';
    }
    if (i === corruptedIndex && !ideal.chain.includes(i)) {
      discardReason += ' Está dañada, pero no hace falta leerla.';
    }
    discardedBackups.push({
      dayId: day.id,
      dayName: day.name,
      backupType: day.backupType,
      sizeGB: day.storedBackupSizeGB,
      shortReason,
      discardReason,
    });
  }

  const totalVolumeToReadGB = Number(steps.reduce((acc, s) => acc + s.sizeToReadGB, 0).toFixed(1));
  // Montaje y verificación de cada soporte adicional: 3,5 min en cinta (carga y búsqueda), 1 min en disco o nube
  const mountOverheadPerStep = medium.category === 'tape' ? 3.5 : 1.0;
  const totalRestoreTimeMinutes = Number(
    (steps.reduce((acc, s) => acc + s.readDurationMinutes, 0) + (steps.length - 1) * mountOverheadPerStep).toFixed(1)
  );

  // RPO: desde el punto restaurado hasta el siniestro; se pierden los cambios de esos días
  const rpoHoursLost = Math.max(0, disasterHour - pointHour(point));
  let rpoDataLostGB = 0;
  for (let i = point + 1; i <= disasterIndex; i++) rpoDataLostGB += computedDays[i].dailyChangeGB;
  rpoDataLostGB = Number(rpoDataLostGB.toFixed(1));

  let pedagogicalSummary: string;
  if (isPartialDueToCorruption) {
    const corrupt = computedDays[corruptedIndex];
    const label = getBackupTypeLabel(corrupt.backupType);
    const why =
      corrupt.backupType === 'incremental'
        ? 'Cadena incremental rota: cada eslabón depende del anterior, así que nada de lo posterior se puede aplicar.'
        : corrupt.backupType === 'differential'
        ? 'Diferencial dañada: se recurre a una cadena anterior que no la necesita.'
        : 'Completa dañada: todo lo que se apoyaba en ella queda inservible y hay que volver a una base anterior.';
    pedagogicalSummary = `${why} La copia ${label} del ${corrupt.name} era imprescindible para restaurar el ${nameOf(
      ideal.point
    )}; lo mejor posible es volver al estado del ${nameOf(point)} en ${steps.length} paso(s), perdiendo ${formatRpoHours(
      rpoHoursLost
    )} y ${rpoDataLostGB} GB.`;
  } else if (corruptedIndex >= 0 && corruptedIndex <= lastAvailableDayIndex && computedDays[corruptedIndex].backupType !== 'none') {
    const corrupt = computedDays[corruptedIndex];
    pedagogicalSummary = `¡VENTAJA DEMOSTRADA! Aunque el soporte del ${corrupt.name} (${getBackupTypeLabel(
      corrupt.backupType
    )}) está dañado, la restauración tiene éxito al 100 %: la cadena elegida no lo necesita.`;
  } else if (steps.length === 1) {
    pedagogicalSummary = `Restauración directa en 1 solo paso cargando únicamente la Copia Completa (${steps[0].dayName}). Es el escenario con menor complejidad operativa.`;
  } else if (steps.length === 2 && steps[1].backupType === 'differential') {
    pedagogicalSummary = `Restauración óptima en 2 pasos (Completa + última Diferencial). Se omiten ${discardedBackups.length} copias intermedias y el RTO no depende de una cadena larga.`;
  } else {
    pedagogicalSummary = `Restauración secuencial en ${steps.length} pasos. Deben leerse en orden cronológico estricto desde la Completa hasta la última copia previa al fallo.`;
  }

  return {
    ...base,
    isRecoverable: true,
    isPartialDueToCorruption,
    failureReason: undefined,
    steps,
    discardedBackups,
    totalVolumeToReadGB,
    totalRestoreTimeMinutes,
    meetsRTOSLA: totalRestoreTimeMinutes <= params.targetRTOMinutes,
    rpoHoursLost,
    rpoDataLostGB,
    meetsRPOSLA: rpoHoursLost <= params.targetRPOHours,
    setsRequiredCount: steps.length,
    restorePointIndex: point,
    pedagogicalSummary,
  };
}

export const INITIAL_321_NODES: CopyNode321[] = [
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
    label: 'Copia 2: Repositorio Primario de Respaldo',
    role: 'backup_primary',
    mediumType: 'nas_smb',
    location: 'local_cpd',
    isImmutableOrAirgapped: false,
    enabled: true,
  },
  {
    id: 'node_offsite_backup',
    label: 'Copia 3: Repositorio Secundario / Externo',
    role: 'backup_offsite',
    mediumType: 'cloud_s3',
    location: 'offsite_cloud',
    isImmutableOrAirgapped: true,
    enabled: true,
  },
];

export function evaluate321Architecture(nodes: CopyNode321[]): Validation321Result {
  const activeNodes = nodes.filter((n) => n.enabled);
  const totalCopies = activeNodes.length;

  const mediaSet = new Set(activeNodes.map((n) => n.mediumType));
  const distinctMediaTypes = mediaSet.size;

  const offsiteNodes = activeNodes.filter(
    (n) => n.location === 'offsite_cloud' || n.location === 'offsite_branch'
  );
  const offsiteCopies = offsiteNodes.length;

  const immutableNodes = activeNodes.filter(
    (n) => n.isImmutableOrAirgapped && n.role !== 'production'
  );
  const immutableCopies = immutableNodes.length;

  const meets3Copies = totalCopies >= 3;
  const meets2Media = distinctMediaTypes >= 2;
  const meets1Offsite = offsiteCopies >= 1;
  const meets1Immutable = immutableCopies >= 1;

  const is321Compliant = meets3Copies && meets2Media && meets1Offsite;
  const is32110Compliant = is321Compliant && meets1Immutable;

  // Simulaciones de siniestros
  const nonProdNodes = activeNodes.filter((n) => n.role !== 'production');

  // 1. Fallo de hardware en servidor principal
  const hardwareSurvives = nonProdNodes.length >= 1;
  const hardwareExplanation = hardwareSurvives
    ? `Superado: Aunque falle la controladora RAID o el almacenamiento del servidor de producción, dispones de ${nonProdNodes.length} copia(s) independiente(s) para restaurar.`
    : `Fallo Crítico: Solo tienes los datos en el servidor de producción. Un fallo en la cabina o borrado accidental provoca pérdida irreversible.`;

  // 2. Ataque de Ransomware en red local
  // El ransomware cifra producción y cualquier copia sin Air-Gap / Inmutabilidad WORM
  const ransomwareSurvivor = nonProdNodes.find((n) => n.isImmutableOrAirgapped);
  const ransomwareSurvives = Boolean(ransomwareSurvivor);
  const ransomwareExplanation = ransomwareSurvives
    ? `Superado: El malware cifra el servidor principal y las carpetas compartidas en red, pero "${ransomwareSurvivor?.label}" resiste gracias a su bloqueo Inmutable WORM / Air-Gap físico.`
    : `Pérdida Total por Cifrado: El ransomware se propaga desde el servidor hacia los repositorios de backup conectados en red que carecen de inmutabilidad (WORM) o desconexión física (Air-Gap).`;

  // 3. Incendio o inundación en el CPD local
  const fireSurvivor = nonProdNodes.find(
    (n) => n.location === 'offsite_cloud' || n.location === 'offsite_branch'
  );
  const fireSurvives = Boolean(fireSurvivor);
  const fireExplanation = fireSurvives
    ? `Superado: El siniestro físico destruye el CPD principal, pero los datos se recuperan íntegramente desde la ubicación remota en "${fireSurvivor?.label}".`
    : `Desastre Total: Todas las copias residen en el mismo edificio o sala de servidores. Un incendio, inundación o robo destruye tanto producción como los respaldos locales.`;

  return {
    totalCopies,
    distinctMediaTypes,
    offsiteCopies,
    immutableCopies,
    meets3Copies,
    meets2Media,
    meets1Offsite,
    meets1Immutable,
    is321Compliant,
    is32110Compliant,
    disasterSimulations: {
      hardwareFailure: {
        survives: hardwareSurvives,
        explanation: hardwareExplanation,
        survivingNode: nonProdNodes[0]?.label,
      },
      ransomwareAttack: {
        survives: ransomwareSurvives,
        explanation: ransomwareExplanation,
        survivingNode: ransomwareSurvivor?.label,
      },
      siteFireFlood: {
        survives: fireSurvives,
        explanation: fireExplanation,
        survivingNode: fireSurvivor?.label,
      },
    },
  };
}
