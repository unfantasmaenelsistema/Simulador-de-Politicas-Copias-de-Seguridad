import { describe, expect, it } from 'vitest';
import {
  BackupType,
  DayConfig,
  DayId,
  INITIAL_321_NODES,
  INITIAL_DAYS,
  POLICY_PRESETS,
  STORAGE_MEDIA,
  SimulationParams,
  computeRestorationPlan,
  computeWeeklySchedule,
  evaluate321Architecture,
  formatRpoHours,
} from './backupEngine';
import { EXAM_QUESTIONS, LAB_CHALLENGES } from './challengesData';

const IDS: DayId[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const NAS = STORAGE_MEDIA.find((m) => m.id === 'nas_1gbe')!;
const LTO = STORAGE_MEDIA.find((m) => m.id === 'lto8_tape')!;

const params = (patch: Partial<SimulationParams> = {}): SimulationParams => ({
  baseVolumeGB: 500,
  hasPreviousSundayFull: true,
  calculationMode: 'academic_classic',
  compressionRatio: 0.75,
  backupHour: 22,
  maxBackupWindowMinutes: 90,
  targetRTOMinutes: 60,
  targetRPOHours: 24,
  selectedMediumId: 'nas_1gbe',
  ...patch,
});

function week(types: BackupType[], changes: number[]): DayConfig[] {
  return INITIAL_DAYS.map((d, i) => ({ ...d, backupType: types[i], dailyChangeGB: changes[i] }));
}

const preset = (id: string) => IDS.map((d) => POLICY_PRESETS.find((p) => p.id === id)!.schedule[d]);
const CHANGES = [30, 40, 35, 45, 50, 15, 10];

function plan(
  days: DayConfig[],
  day: DayId,
  timing: 'before_backup' | 'after_backup',
  corrupted: DayId | null = null,
  p = params(),
  medium = NAS
) {
  return computeRestorationPlan(computeWeeklySchedule(days, p, medium), p, medium, day, timing, corrupted);
}

const stepDays = (r: ReturnType<typeof plan>) => r.steps.map((s) => s.dayId);

describe('tamaños de la semana', () => {
  it('reto 01: Completa + Incrementales cabe en 780 GB y Completa + Diferenciales no', () => {
    const c = LAB_CHALLENGES[0].targetSetup.dailyChanges;
    const changes = IDS.map((d) => c[d]);
    const inc = computeWeeklySchedule(week(preset('classic_incremental'), changes), params(), NAS);
    const diff = computeWeeklySchedule(week(preset('classic_differential'), changes), params(), NAS);
    expect(inc[6].cumulativeStorageGB).toBe(690);
    expect(diff[6].cumulativeStorageGB).toBe(1265);
  });

  it('la diferencial acumula desde la Completa y la incremental desde la copia anterior', () => {
    const r = computeWeeklySchedule(week(preset('hybrid_enterprise'), CHANGES), params(), NAS);
    expect(r.map((d) => d.rawBackupSizeGB)).toEqual([500, 40, 35, 120, 50, 15, 0]);
  });

  it('un día sin copia queda pendiente para la siguiente incremental', () => {
    const types: BackupType[] = ['full', 'none', 'incremental', 'incremental', 'incremental', 'incremental', 'incremental'];
    const r = computeWeeklySchedule(week(types, CHANGES), params(), NAS);
    expect(r[2].rawBackupSizeGB).toBe(75);
  });

  it('la ventana usa 1 GB = 1024 MB', () => {
    const r = computeWeeklySchedule(week(preset('classic_incremental'), CHANGES), params(), NAS);
    expect(r[0].backupDurationMinutes).toBeCloseTo((500 * 1024) / 105 / 60, 1);
  });
});

describe('restauración sin daños', () => {
  it('examen 1: Completa + Diferencial + Incrementales posteriores (510 GB, 4 pasos)', () => {
    const types: BackupType[] = ['full', 'incremental', 'differential', 'incremental', 'incremental', 'none', 'none'];
    const r = plan(week(types, [0, 25, 35, 30, 20, 10, 10]), 'sab', 'before_backup', null, params({ baseVolumeGB: 400 }));
    expect(stepDays(r)).toEqual(['lun', 'mie', 'jue', 'vie']);
    expect(r.totalVolumeToReadGB).toBe(510);
    expect(r.rpoHoursLost).toBe(16);
    expect(r.discardedBackups.map((d) => d.dayId)).toEqual(['mar']);
    const q = EXAM_QUESTIONS[0].options.find((o) => o.isCorrect)!;
    expect(q.totalReadGB).toContain('510');
  });

  it('lunes antes del backup: la Completa del domingo anterior, 16 h de RPO', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'lun', 'before_backup');
    expect(stepDays(r)).toEqual(['prev_dom']);
    expect(r.rpoHoursLost).toBe(16);
  });

  it('lunes antes del backup sin Completa previa: pérdida total', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'lun', 'before_backup', null, params({ hasPreviousSundayFull: false }));
    expect(r.isRecoverable).toBe(false);
    expect(formatRpoHours(r.rpoHoursLost)).toBe('pérdida total');
  });

  it('domingo sin copia tras la hora del backup: se vuelve al sábado y se pierden 24 h', () => {
    const r = plan(week(preset('hybrid_enterprise'), CHANGES), 'dom', 'after_backup');
    expect(r.restorePointIndex).toBe(5);
    expect(r.rpoHoursLost).toBe(24);
    expect(r.rpoDataLostGB).toBe(10);
  });

  it('un día sin copia en mitad de la cadena no añade pérdida si después hay copia', () => {
    const types: BackupType[] = ['full', 'none', 'incremental', 'incremental', 'incremental', 'incremental', 'incremental'];
    const r = plan(week(types, CHANGES), 'mie', 'after_backup');
    expect(r.rpoHoursLost).toBe(0);
    expect(stepDays(r)).toEqual(['lun', 'mie']);
  });
});

describe('soportes dañados', () => {
  it('examen 2: con diferenciales, la cinta del miércoles dañada no importa', () => {
    const r = plan(week(preset('classic_differential'), CHANGES), 'vie', 'after_backup', 'mie');
    expect(stepDays(r)).toEqual(['lun', 'vie']);
    expect(r.isPartialDueToCorruption).toBe(false);
    expect(r.pedagogicalSummary).toContain('VENTAJA');
    expect(r.discardedBackups.find((d) => d.dayId === 'mie')!.discardReason).toContain('no hace falta');
  });

  it('examen 2: la opción de 4 pasos suma 785 GB', () => {
    const c = EXAM_QUESTIONS[1].options.find((o) => o.id === 'opt_c')!;
    expect(c.totalReadGB).toContain('785');
    expect(500 + 30 + 105 + 150).toBe(785);
  });

  it('incremental dañada: se restaura hasta el día anterior y crece el RPO', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'vie', 'after_backup', 'mie');
    expect(r.isRecoverable).toBe(true);
    expect(r.isPartialDueToCorruption).toBe(true);
    expect(stepDays(r)).toEqual(['lun', 'mar']);
    expect(r.rpoHoursLost).toBe(72);
    expect(r.rpoDataLostGB).toBe(35 + 45 + 50);
    expect(r.meetsRPOSLA).toBe(false);
    const short = Object.fromEntries(r.discardedBackups.map((d) => [d.dayId, d.shortReason]));
    expect(short).toEqual({ mie: 'Dañado', jue: 'Inutilizable', vie: 'Inutilizable' });
  });

  it('Completa diaria con el jueves dañado: se restaura el miércoles (v1 daba pérdida total)', () => {
    const r = plan(week(preset('all_full'), CHANGES), 'jue', 'after_backup', 'jue');
    expect(r.isRecoverable).toBe(true);
    expect(stepDays(r)).toEqual(['mie']);
    expect(r.rpoHoursLost).toBe(24);
  });

  it('Completa del lunes dañada: se vuelve a la del domingo anterior', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'mie', 'after_backup', 'lun');
    expect(stepDays(r)).toEqual(['prev_dom']);
    expect(r.rpoHoursLost).toBe(72);
    expect(r.rpoDataLostGB).toBe(0 + 40 + 35); // el lunes clásico no añade cambios
  });

  it('sin Completa previa y con la del lunes dañada no se puede restaurar nada', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'mie', 'after_backup', 'lun', params({ hasPreviousSundayFull: false }));
    expect(r.isRecoverable).toBe(false);
    expect(r.steps).toHaveLength(0);
    expect(r.meetsRTOSLA).toBe(false);
  });

  it('diferencial dañada en la híbrida: se vuelve a la cadena de incrementales anterior', () => {
    const r = plan(week(preset('hybrid_enterprise'), CHANGES), 'vie', 'after_backup', 'jue');
    // El viernes incremental depende del jueves: lo mejor es el miércoles
    expect(stepDays(r)).toEqual(['lun', 'mar', 'mie']);
    expect(r.rpoHoursLost).toBe(48);
  });

  it('un soporte posterior al siniestro no afecta', () => {
    const r = plan(week(preset('classic_incremental'), CHANGES), 'mar', 'after_backup', 'jue');
    expect(r.isPartialDueToCorruption).toBe(false);
    expect(r.pedagogicalSummary).not.toContain('VENTAJA');
  });
});

describe('retos', () => {
  const metrics = (types: BackupType[], challengeIndex: number, compliant = true) => {
    const ch = LAB_CHALLENGES[challengeIndex];
    const changes = IDS.map((d) => ch.targetSetup.dailyChanges[d]);
    const medium = STORAGE_MEDIA.find((m) => m.id === ch.targetSetup.mediumId)!;
    const days = week(types, changes);
    const computed = computeWeeklySchedule(days, params(), medium);
    const fri = computeRestorationPlan(computed, params(), medium, 'vie', 'after_backup', null);
    return ch.evaluate({
      totalWeeklyStorageGB: computed[6].cumulativeStorageGB,
      maxDailyBackupMinutes: Math.max(...computed.map((d) => d.backupDurationMinutes)),
      fridayAfterBackupRestoreSteps: fri.setsRequiredCount,
      fridayAfterBackupRTOMinutes: fri.totalRestoreTimeMinutes,
      hasFullOnMonday: days[0].backupType === 'full',
      unbackedDaysCount: days.filter((d) => d.backupType === 'none').length,
      unbackedWeekdaysCount: days.slice(0, 5).filter((d) => d.backupType === 'none').length,
      is32110Compliant: compliant,
    });
  };

  it('reto 01 tiene solución', () => {
    expect(metrics(preset('classic_incremental'), 0).passed).toBe(true);
    expect(metrics(preset('classic_differential'), 0).passed).toBe(false);
  });

  it('reto 02: la solución de la pista aprueba', () => {
    const t: BackupType[] = ['full', 'incremental', 'incremental', 'incremental', 'differential', 'none', 'none'];
    expect(metrics(t, 1).passed).toBe(true);
  });

  it('reto 02: dejar laborables sin copia ya no aprueba (v1 sí)', () => {
    const t: BackupType[] = ['full', 'none', 'none', 'none', 'differential', 'none', 'none'];
    const r = metrics(t, 1);
    expect(r.passed).toBe(false);
    expect(r.feedback.join(' ')).toContain('laborable');
  });

  it('reto 03: Completa + Diferenciales en LTO-8 cumple el RTO de 45 min; incrementales no', () => {
    expect(metrics(preset('classic_differential'), 2).passed).toBe(true);
    expect(metrics(preset('classic_incremental'), 2).passed).toBe(false);
    const gaps: BackupType[] = ['full', 'none', 'none', 'none', 'differential', 'none', 'none'];
    expect(metrics(gaps, 2).passed).toBe(false);
  });

  it('el RTO del reto 03 incluye el montaje de cada cinta', () => {
    const ch = LAB_CHALLENGES[2];
    const changes = IDS.map((d) => ch.targetSetup.dailyChanges[d]);
    const r = plan(week(preset('classic_differential'), changes), 'vie', 'after_backup', null, params(), LTO);
    const read = (500 * 1024) / 300 / 60 + (170 * 1024) / 300 / 60;
    expect(r.totalRestoreTimeMinutes).toBeCloseTo(read + 3.5, 0);
  });
});

describe('arquitectura 3-2-1', () => {
  it('la arquitectura inicial cumple 3-2-1-1', () => {
    const v = evaluate321Architecture(INITIAL_321_NODES);
    expect(v.is321Compliant && v.is32110Compliant).toBe(true);
  });

  it('sin copia inmutable el ransomware lo cifra todo; sin offsite el incendio lo destruye', () => {
    const open = INITIAL_321_NODES.map((n) => ({ ...n, isImmutableOrAirgapped: false }));
    expect(evaluate321Architecture(open).disasterSimulations.ransomwareAttack.survives).toBe(false);
    const local = INITIAL_321_NODES.map((n) => ({ ...n, location: 'local_cpd' as const }));
    expect(evaluate321Architecture(local).disasterSimulations.siteFireFlood.survives).toBe(false);
  });
});
