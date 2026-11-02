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
  rpoHoursLost: number; // Horas de datos perdidos
  rpoDataLostGB: number; // GB de trabajo perdido no respaldado
  meetsRPOSLA: boolean;
  setsRequiredCount: number;
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
        formulaExplanation = `Base inicial del sistema (${params.baseVolumeGB} GB). Reinicia marcas de archivo.`;
      } else {
        formulaExplanation = `Base (${params.baseVolumeGB} GB) + cambios acumulados hasta ${day.name} (${systemTotalVolumeGB - params.baseVolumeGB} GB) = ${rawBackupSizeGB} GB.`;
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
      formulaExplanation = `Suma todos los cambios desde la última Completa (${lastFullDayName}): ${rawBackupSizeGB} GB. No borra marca para futuras diferenciales.`;
      // En sistemas combinados (Full + Diff + Inc), una copia Diferencial sirve de punto de apoyo para una Incremental posterior
      changesSinceLastAnyBackupGB = 0;
    } else if (day.backupType === 'incremental') {
      if (!hasAnyFullBackupSoFar) {
        hasMissingBaseWarning = true;
      }
      rawBackupSizeGB = changesSinceLastAnyBackupGB;
      const prevBackupDay = findPreviousBackupDayLabel(days, i, params.hasPreviousSundayFull);
      referenceAnchorLabel = `Cambios desde última copia (${prevBackupDay})`;
      formulaExplanation = `Solo datos modificados desde la copia anterior (${prevBackupDay}): ${rawBackupSizeGB} GB. Limpia marca de archivo.`;
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

  // Determinar hasta qué día (inclusive) tenemos copias ejecutadas antes del desastre
  const lastAvailableDayIndex =
    disasterTiming === 'after_backup' ? disasterIndex : disasterIndex - 1;

  const steps: RestorationStep[] = [];
  const discardedBackups: DiscardedBackupInfo[] = [];

  // Caso 1: El desastre ocurre el Lunes antes del backup nocturno
  if (lastAvailableDayIndex < 0) {
    if (params.hasPreviousSundayFull) {
      const baseSize =
        params.calculationMode === 'production_compressed'
          ? Number((params.baseVolumeGB * params.compressionRatio).toFixed(1))
          : params.baseVolumeGB;
      const readMin = Number(((baseSize * 1024) / medium.readSpeedMBps / 60).toFixed(1));
      steps.push({
        stepNumber: 1,
        dayId: 'prev_dom',
        dayName: 'Domingo Anterior (Base)',
        backupType: 'full',
        sizeToReadGB: baseSize,
        readDurationMinutes: readMin,
        reason: 'Última copia Completa disponible antes del incidente del Lunes por la mañana.',
        dataCoveredDescription: `Restaura el volumen base inicial (${params.baseVolumeGB} GB).`,
      });
      const rpoHours = 16; // Desde el domingo 22:00 hasta lunes 14:00
      const rpoDataLostGB = disasterDay.dailyChangeGB;
      return {
        disasterDayId,
        disasterDayName: disasterDay.name,
        disasterTiming,
        corruptedDayId,
        isRecoverable: true,
        isPartialDueToCorruption: false,
        steps,
        discardedBackups: [],
        totalVolumeToReadGB: baseSize,
        totalRestoreTimeMinutes: readMin,
        meetsRTOSLA: readMin <= params.targetRTOMinutes,
        rpoHoursLost: rpoHours,
        rpoDataLostGB,
        meetsRPOSLA: rpoHours <= params.targetRPOHours,
        setsRequiredCount: 1,
        pedagogicalSummary:
          'Como el fallo ocurrió el Lunes antes de la ventana de backup nocturna, se restaura la Copia Completa del Domingo anterior. Se pierden únicamente los cambios generados durante la mañana del Lunes.',
      };
    } else {
      return {
        disasterDayId,
        disasterDayName: disasterDay.name,
        disasterTiming,
        corruptedDayId,
        isRecoverable: false,
        isPartialDueToCorruption: false,
        failureReason:
          'El desastre ocurrió el Lunes antes de ejecutarse el primer backup semanal y no existe Copia Completa del Domingo anterior.',
        steps: [],
        discardedBackups: [],
        totalVolumeToReadGB: 0,
        totalRestoreTimeMinutes: 0,
        meetsRTOSLA: false,
        rpoHoursLost: 999,
        rpoDataLostGB: params.baseVolumeGB + disasterDay.dailyChangeGB,
        meetsRPOSLA: false,
        setsRequiredCount: 0,
        pedagogicalSummary:
          'Pérdida total: No existe ningún respaldo previo al momento del incidente.',
      };
    }
  }

  // Buscar la última copia Completa en o antes de lastAvailableDayIndex
  let lastFullIndex = -1;
  for (let i = lastAvailableDayIndex; i >= 0; i--) {
    if (computedDays[i].backupType === 'full') {
      lastFullIndex = i;
      break;
    }
  }

  // Las copias anteriores a lastFullIndex se descartan porque la nueva Completa ya las engloba
  if (lastFullIndex > 0) {
    for (let i = 0; i < lastFullIndex; i++) {
      if (computedDays[i].backupType !== 'none') {
        discardedBackups.push({
          dayId: computedDays[i].id,
          dayName: computedDays[i].name,
          backupType: computedDays[i].backupType,
          sizeGB: computedDays[i].storedBackupSizeGB,
          discardReason: `Superada por la Copia Completa posterior del ${computedDays[lastFullIndex].name}, que ya incluye todos los datos hasta esa fecha.`,
        });
      }
    }
  }

  // Si no hay Completa en la semana actual pero tampoco en el Domingo anterior -> Fallo de planificación
  if (lastFullIndex === -1 && !params.hasPreviousSundayFull) {
    return {
      disasterDayId,
      disasterDayName: disasterDay.name,
      disasterTiming,
      corruptedDayId,
      isRecoverable: false,
      isPartialDueToCorruption: false,
      failureReason:
        'No existe ninguna Copia Completa (Full) como base de la cadena. Las copias diferenciales o incrementales por sí solas no contienen el sistema base original.',
      steps: [],
      discardedBackups: [],
      totalVolumeToReadGB: 0,
      totalRestoreTimeMinutes: 0,
      meetsRTOSLA: false,
      rpoHoursLost: 999,
      rpoDataLostGB: disasterDay.systemTotalVolumeGB,
      meetsRPOSLA: false,
      setsRequiredCount: 0,
      pedagogicalSummary:
        'Error crítico de diseño: Toda política de respaldos requiere al menos una Copia Completa inicial sobre la cual aplicar los conjuntos diferenciales o incrementales.',
    };
  }

  // Paso 1: Añadir la Copia Completa ancla
  if (lastFullIndex >= 0) {
    const fullDay = computedDays[lastFullIndex];
    const readMin = Number(
      ((fullDay.storedBackupSizeGB * 1024) / medium.readSpeedMBps / 60).toFixed(1)
    );
    steps.push({
      stepNumber: 1,
      dayId: fullDay.id,
      dayName: fullDay.name,
      backupType: 'full',
      sizeToReadGB: fullDay.storedBackupSizeGB,
      readDurationMinutes: readMin,
      reason: `Última Copia Completa anterior al desastre. Restaura el 100% del estado del sistema hasta el ${fullDay.name}.`,
      dataCoveredDescription: `Datos base + acumulados hasta ${fullDay.name} (${fullDay.rawBackupSizeGB} GB lógicos).`,
      isCorrupted: corruptedDayId === fullDay.id,
    });
  } else {
    // Usa la Completa del Domingo Anterior
    const baseSize =
      params.calculationMode === 'production_compressed'
        ? Number((params.baseVolumeGB * params.compressionRatio).toFixed(1))
        : params.baseVolumeGB;
    const readMin = Number(((baseSize * 1024) / medium.readSpeedMBps / 60).toFixed(1));
    steps.push({
      stepNumber: 1,
      dayId: 'prev_dom',
      dayName: 'Domingo Anterior (Base)',
      backupType: 'full',
      sizeToReadGB: baseSize,
      readDurationMinutes: readMin,
      reason: 'Copia Completa base del cierre de la semana anterior.',
      dataCoveredDescription: `Volumen inicial del sistema (${params.baseVolumeGB} GB).`,
      isCorrupted: false,
    });
  }

  // Ahora analizamos el tramo después de lastFullIndex hasta lastAvailableDayIndex
  // Buscamos si existe alguna copia DIFERENCIAL en el rango (lastFullIndex + 1 .. lastAvailableDayIndex)
  let latestDiffIndex = -1;
  for (let i = lastAvailableDayIndex; i > lastFullIndex; i--) {
    if (computedDays[i].backupType === 'differential') {
      latestDiffIndex = i;
      break;
    }
  }

  if (latestDiffIndex !== -1) {
    // Todas las copias (Incrementales o Diferenciales previas) entre lastFullIndex y latestDiffIndex se DESCARTAN
    // porque la última Diferencial contiene absolutamente todos los cambios desde la última Completa.
    for (let i = lastFullIndex + 1; i < latestDiffIndex; i++) {
      if (computedDays[i].backupType !== 'none') {
        discardedBackups.push({
          dayId: computedDays[i].id,
          dayName: computedDays[i].name,
          backupType: computedDays[i].backupType,
          sizeGB: computedDays[i].storedBackupSizeGB,
          discardReason: `Innecesaria: La Copia Diferencial del ${computedDays[latestDiffIndex].name} ya acumula todos los cambios ocurridos desde la Completa del ${
            lastFullIndex >= 0 ? computedDays[lastFullIndex].name : 'Domingo Anterior'
          }.`,
        });
      }
    }

    // Añadimos la última Diferencial como Paso 2
    const diffDay = computedDays[latestDiffIndex];
    const readMin = Number(
      ((diffDay.storedBackupSizeGB * 1024) / medium.readSpeedMBps / 60).toFixed(1)
    );
    steps.push({
      stepNumber: steps.length + 1,
      dayId: diffDay.id,
      dayName: diffDay.name,
      backupType: 'differential',
      sizeToReadGB: diffDay.storedBackupSizeGB,
      readDurationMinutes: readMin,
      reason: `Última Copia Diferencial disponible. Aplica de golpe todos los cambios desde la Completa hasta el ${diffDay.name}.`,
      dataCoveredDescription: `Cambios acumulados hasta ${diffDay.name} (${diffDay.rawBackupSizeGB} GB lógicos).`,
      isCorrupted: corruptedDayId === diffDay.id,
    });

    // Si después de latestDiffIndex hay copias INCREMENTALES hasta lastAvailableDayIndex, hay que aplicarlas en orden
    for (let i = latestDiffIndex + 1; i <= lastAvailableDayIndex; i++) {
      const incDay = computedDays[i];
      if (incDay.backupType === 'incremental') {
        const incReadMin = Number(
          ((incDay.storedBackupSizeGB * 1024) / medium.readSpeedMBps / 60).toFixed(1)
        );
        steps.push({
          stepNumber: steps.length + 1,
          dayId: incDay.id,
          dayName: incDay.name,
          backupType: 'incremental',
          sizeToReadGB: incDay.storedBackupSizeGB,
          readDurationMinutes: incReadMin,
          reason: `Copia Incremental posterior a la Diferencial del ${diffDay.name}. Necesaria en orden cronológico.`,
          dataCoveredDescription: `Cambios exclusivos del ${incDay.name} (${incDay.rawBackupSizeGB} GB lógicos).`,
          isCorrupted: corruptedDayId === incDay.id,
        });
      }
    }
  } else {
    // No hay Diferenciales en este tramo: necesitamos TODAS las copias Incrementales en estricto orden cronológico
    for (let i = lastFullIndex + 1; i <= lastAvailableDayIndex; i++) {
      const incDay = computedDays[i];
      if (incDay.backupType === 'incremental') {
        const incReadMin = Number(
          ((incDay.storedBackupSizeGB * 1024) / medium.readSpeedMBps / 60).toFixed(1)
        );
        steps.push({
          stepNumber: steps.length + 1,
          dayId: incDay.id,
          dayName: incDay.name,
          backupType: 'incremental',
          sizeToReadGB: incDay.storedBackupSizeGB,
          readDurationMinutes: incReadMin,
          reason: `Eslabón obligatorio de la cadena incremental. Contiene los cambios exclusivos registrados el ${incDay.name}.`,
          dataCoveredDescription: `Cambios del ${incDay.name} (${incDay.rawBackupSizeGB} GB lógicos).`,
          isCorrupted: corruptedDayId === incDay.id,
        });
      }
    }
  }

  // Verificar si alguno de los pasos requeridos está marcado como corrupto
  const corruptedStep = steps.find((s) => s.isCorrupted);
  const isPartialDueToCorruption = Boolean(corruptedStep);

  // Calcular totales de lectura y tiempo (RTO)
  const totalVolumeToReadGB = Number(
    steps.reduce((acc, s) => acc + s.sizeToReadGB, 0).toFixed(1)
  );
  // Añadimos una sobrecarga realista de montaje/verificación por cada soporte adicional (1.5 min en disco/nube, 4 min en cinta LTO)
  const mountOverheadPerStep = medium.category === 'tape' ? 3.5 : 1.0;
  const rawReadMinutes = steps.reduce((acc, s) => acc + s.readDurationMinutes, 0);
  const totalRestoreTimeMinutes = Number(
    (rawReadMinutes + (steps.length - 1) * mountOverheadPerStep).toFixed(1)
  );

  // Calcular RPO (Horas y GB de datos perdidos no respaldados)
  // ¿Cuándo fue el último backup real ejecutado en o antes de lastAvailableDayIndex?
  let lastActualBackupIndex = -1;
  for (let i = lastAvailableDayIndex; i >= 0; i--) {
    if (computedDays[i].backupType !== 'none') {
      lastActualBackupIndex = i;
      break;
    }
  }

  let rpoDataLostGB = 0;
  let daysWithoutBackupCount = 0;

  if (disasterTiming === 'before_backup') {
    // Se pierde lo generado durante el día del desastre antes del backup nocturno
    rpoDataLostGB += disasterDay.dailyChangeGB;
    daysWithoutBackupCount += 0.65; // ~16 horas desde las 22:00 de la noche anterior hasta las 14:00
  }

  // Además, si hubo días con "Sin Copia" ('none') entre el último backup real y el momento disponible:
  for (let i = lastActualBackupIndex + 1; i <= lastAvailableDayIndex; i++) {
    rpoDataLostGB += computedDays[i].dailyChangeGB;
    daysWithoutBackupCount += 1;
  }

  const rpoHoursLost = Math.round(daysWithoutBackupCount * 24);

  let pedagogicalSummary = '';
  if (isPartialDueToCorruption && corruptedStep) {
    if (corruptedStep.backupType === 'full') {
      pedagogicalSummary = `FALLO CRÍTICO DE RESTAURACIÓN: El soporte de la Copia Completa del ${corruptedStep.dayName} está dañado. Sin la base Completa, todas las copias diferenciales e incrementales posteriores son inútiles.`;
    } else if (corruptedStep.backupType === 'incremental') {
      pedagogicalSummary = `CADENA INCREMENTAL ROTA: El soporte Incremental del ${corruptedStep.dayName} (Paso ${corruptedStep.stepNumber}) está corrupto. En una estrategia incremental, si falla un solo eslabón intermedio, se corrompe o interrumpe la coherencia de todos los días posteriores.`;
    } else {
      pedagogicalSummary = `SOPORTE DIFERENCIAL DAÑADO: La copia Diferencial del ${corruptedStep.dayName} está dañada. Si conservas una Diferencial del día anterior en buen estado, podrías recurrir a ella asumiendo un RPO mayor.`;
    }
  } else if (corruptedDayId) {
    const discardedCorrupt = discardedBackups.find((d) => d.dayId === corruptedDayId);
    if (discardedCorrupt) {
      pedagogicalSummary = `¡VENTAJA DEMOSTRADA! Aunque el soporte del ${discardedCorrupt.dayName} (${getBackupTypeLabel(
        discardedCorrupt.backupType
      )}) está dañado, la restauración TIENE ÉXITO AL 100% porque ese conjunto fue reemplazado por una copia posterior y no se necesita leer.`;
    }
  }

  if (!pedagogicalSummary) {
    if (steps.length === 1) {
      pedagogicalSummary = `Restauración directa en 1 solo paso cargando únicamente la Copia Completa (${steps[0].dayName}). Es el escenario con menor complejidad operativa.`;
    } else if (latestDiffIndex !== -1 && steps.length === 2) {
      pedagogicalSummary = `Restauración óptima en 2 pasos (Completa + Última Diferencial). Se ignoran ${discardedBackups.length} copias intermedias, logrando un RTO rápido sin depender de una cadena larga.`;
    } else {
      pedagogicalSummary = `Restauración secuencial en ${steps.length} pasos. Deben leerse en orden cronológico estricto desde la Completa inicial hasta el último conjunto incremental previo al fallo.`;
    }
  }

  return {
    disasterDayId,
    disasterDayName: disasterDay.name,
    disasterTiming,
    corruptedDayId,
    isRecoverable: !corruptedStep || corruptedStep.backupType !== 'full',
    isPartialDueToCorruption,
    failureReason:
      corruptedStep?.backupType === 'full'
        ? `La Copia Completa base del ${corruptedStep.dayName} está dañada.`
        : undefined,
    steps,
    discardedBackups,
    totalVolumeToReadGB,
    totalRestoreTimeMinutes,
    meetsRTOSLA: totalRestoreTimeMinutes <= params.targetRTOMinutes && !isPartialDueToCorruption,
    rpoHoursLost,
    rpoDataLostGB,
    meetsRPOSLA: rpoHoursLost <= params.targetRPOHours && !isPartialDueToCorruption,
    setsRequiredCount: steps.length,
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
