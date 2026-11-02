import { BackupType, DayId } from './backupEngine';

export interface LabChallenge {
  id: string;
  number: string;
  title: string;
  context: string;
  constraints: string[];
  hint: string;
  targetSetup: {
    baseVolumeGB: number;
    dailyChanges: Record<DayId, number>;
    mediumId: string;
  };
  evaluate: (metrics: {
    totalWeeklyStorageGB: number;
    maxDailyBackupMinutes: number;
    fridayAfterBackupRestoreSteps: number;
    fridayAfterBackupRTOMinutes: number;
    hasFullOnMonday: boolean;
    unbackedDaysCount: number;
    unbackedWeekdaysCount: number;
    is32110Compliant: boolean;
  }) => {
    passed: boolean;
    feedback: string[];
  };
}

export const LAB_CHALLENGES: LabChallenge[] = [
  {
    id: 'challenge_storage_budget',
    number: '01',
    title: 'Cuota Estricta en NAS PyME (< 780 GB semanales)',
    context:
      'Una asesoría jurídica tiene un volumen base de 500 GB y genera 40 GB diarios de lunes a viernes (15 GB sábado y domingo). Su NAS Gigabit solo dispone de 780 GB libres para toda la semana y exige respaldo todos los días sin excepción.',
    constraints: [
      'Volumen Base fijado en 500 GB (Modo Académico Clásico)',
      'Ningún día puede quedar "Sin Copia" (0 días sin respaldo)',
      'Espacio total semanal consumido <= 780 GB',
      'Debe comenzar con Copia Completa el Lunes'
    ],
    hint: 'Compara el espacio consumido por una estrategia Completa + Diferencial frente a una Completa + Incremental pura de Martes a Domingo.',
    targetSetup: {
      baseVolumeGB: 500,
      dailyChanges: { lun: 30, mar: 40, mie: 40, jue: 40, vie: 40, sab: 15, dom: 15 },
      mediumId: 'nas_1gbe'
    },
    evaluate: (m) => {
      const feedback: string[] = [];
      let passed = true;

      if (!m.hasFullOnMonday) {
        passed = false;
        feedback.push('Falta programar una Copia Completa el Lunes como punto de partida.');
      } else {
        feedback.push('Correcto: Copia Completa base configurada el Lunes.');
      }

      if (m.unbackedDaysCount > 0) {
        passed = false;
        feedback.push(`Hay ${m.unbackedDaysCount} día(s) sin copia programada. La política exige cobertura los 7 días.`);
      } else {
        feedback.push('Correcto: Los 7 días de la semana cuentan con ventana de respaldo.');
      }

      if (m.totalWeeklyStorageGB > 780) {
        passed = false;
        feedback.push(`Exceso de cuota: consumes ${m.totalWeeklyStorageGB} GB semanales (límite: 780 GB). Reduce copias diferenciales o completas extra.`);
      } else {
        feedback.push(`Correcto: Consumo semanal de ${m.totalWeeklyStorageGB} GB dentro del límite de 780 GB.`);
      }

      return { passed, feedback };
    }
  },
  {
    id: 'challenge_fast_rto_friday',
    number: '02',
    title: 'Restauración Crítica en Viernes (Máximo 2 Pasos y < 1.150 GB/semana)',
    context:
      'Un hospital comarcal (Base: 500 GB) sufrió una caída un viernes por la noche. Dirección exige que restaurar el sistema el Viernes tras el backup requiera como máximo 2 soportes/pasos para minimizar errores humanos, manteniendo el consumo semanal por debajo de 1.150 GB.',
    constraints: [
      'Copia Completa obligatoria el Lunes',
      'Restaurar el Viernes (tras el backup) debe requerir máximo 2 pasos en total',
      'Espacio total semanal <= 1.150 GB',
      'Al menos Lunes a Viernes deben tener copia activa'
    ],
    hint: 'Si colocas una Copia Diferencial el Viernes (o usas una estrategia híbrida con Diferencial el Viernes), ¿cuántos pasos necesita la restauración del Viernes por la noche?',
    targetSetup: {
      baseVolumeGB: 500,
      dailyChanges: { lun: 30, mar: 35, mie: 35, jue: 40, vie: 45, sab: 10, dom: 10 },
      mediumId: 'lto8_tape'
    },
    evaluate: (m) => {
      const feedback: string[] = [];
      let passed = true;

      if (!m.hasFullOnMonday) {
        passed = false;
        feedback.push('Debes iniciar la semana con una Copia Completa el Lunes.');
      }

      if (m.unbackedWeekdaysCount > 0) {
        passed = false;
        feedback.push(`Hay ${m.unbackedWeekdaysCount} día(s) laborable(s) sin copia: de Lunes a Viernes todos deben tener respaldo.`);
      }

      if (m.fridayAfterBackupRestoreSteps > 2) {
        passed = false;
        feedback.push(`Restaurar el Viernes requiere actualmente ${m.fridayAfterBackupRestoreSteps} pasos (máximo permitido: 2 pasos).`);
      } else {
        feedback.push(`Excelente: Restaurar el Viernes requiere solo ${m.fridayAfterBackupRestoreSteps} paso(s).`);
      }

      if (m.totalWeeklyStorageGB > 1150) {
        passed = false;
        feedback.push(`Consumo semanal excesivo (${m.totalWeeklyStorageGB} GB > 1.150 GB). Usa Incrementales entre Martes y Jueves y Diferencial el Viernes.`);
      } else {
        feedback.push(`Consumo semanal optimizado: ${m.totalWeeklyStorageGB} GB (<= 1.150 GB).`);
      }

      return { passed, feedback };
    }
  },
  {
    id: 'challenge_321_ransomware',
    number: '03',
    title: 'Blindaje Integral 3-2-1-1-0 frente a Ransomware e Incendio',
    context:
      'Una planta industrial ha sido auditada por su aseguradora cibernética. Para aprobar la póliza, la arquitectura debe cumplir la regla 3-2-1-1-0 y tener una política semanal válida con RTO en Viernes inferior a 45 minutos.',
    constraints: [
      'Cumplir la regla 3-2-1-1-0 en la pestaña "Arquitectura 3-2-1" (3 copias, 2 medios, 1 offsite, 1 inmutable/air-gap; el «0» se demuestra con pruebas de restauración)',
      'Tiempo de restauración (RTO) en Viernes <= 45 minutos',
      'Sin días laborables descubiertos'
    ],
    hint: 'Asegúrate de activar la inmutabilidad WORM o cinta LTO con Air-Gap en la pestaña Arquitectura 3-2-1 y elegir un medio rápido como LTO-8 o Cabina 10GbE.',
    targetSetup: {
      baseVolumeGB: 500,
      dailyChanges: { lun: 30, mar: 40, mie: 35, jue: 45, vie: 50, sab: 15, dom: 10 },
      mediumId: 'lto8_tape'
    },
    evaluate: (m) => {
      const feedback: string[] = [];
      let passed = true;

      if (!m.is32110Compliant) {
        passed = false;
        feedback.push('La arquitectura aún no cumple el estándar 3-2-1-1-0 completo (revisa que exista copia Offsite e Inmutabilidad WORM/Air-Gap).');
      } else {
        feedback.push('Arquitectura 3-2-1-1 validada contra fallo de hardware, ransomware e incendio. El «0» (cero errores) exige además probar la restauración periódicamente.');
      }

      if (m.unbackedWeekdaysCount > 0) {
        passed = false;
        feedback.push(`Hay ${m.unbackedWeekdaysCount} día(s) laborable(s) sin copia (la póliza exige respaldo de Lunes a Viernes).`);
      } else {
        feedback.push('Correcto: de Lunes a Viernes todos los días tienen copia.');
      }

      if (m.fridayAfterBackupRTOMinutes > 45) {
        passed = false;
        feedback.push(`El RTO en Viernes es de ${m.fridayAfterBackupRTOMinutes} min (supera el SLA de 45 min).`);
      } else {
        feedback.push(`RTO en Viernes dentro de SLA (${m.fridayAfterBackupRTOMinutes} min <= 45 min).`);
      }

      return { passed, feedback };
    }
  }
];

export interface QuizQuestion {
  id: string;
  title: string;
  scenario: string;
  scheduleSummary: { day: string; type: BackupType; sizeGB: number }[];
  disasterMoment: string;
  options: {
    id: string;
    label: string;
    totalReadGB: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export const EXAM_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1_hybrid_restore',
    title: 'Caso 1: Restauración en Política Mixta (Completa + Diferencial + Incremental)',
    scenario:
      'Un servidor de base de datos ejecuta sus copias todos los días a las 22:00h. El SÁBADO a las 11:00 de la mañana (ANTES del backup del sábado) un administrador formatea por error el volumen de producción. Observa la tabla de copias realizadas esta semana:',
    scheduleSummary: [
      { day: 'Lunes (22:00)', type: 'full', sizeGB: 400 },
      { day: 'Martes (22:00)', type: 'incremental', sizeGB: 25 },
      { day: 'Miércoles (22:00)', type: 'differential', sizeGB: 60 },
      { day: 'Jueves (22:00)', type: 'incremental', sizeGB: 30 },
      { day: 'Viernes (22:00)', type: 'incremental', sizeGB: 20 },
    ],
    disasterMoment: 'Sábado a las 11:00h (última copia completada: Viernes 22:00h)',
    options: [
      {
        id: 'opt_a',
        label: '1º Lunes (Completa) → 2º Martes (Inc) → 3º Miércoles (Diff) → 4º Jueves (Inc) → 5º Viernes (Inc)',
        totalReadGB: '535 GB (5 pasos)',
        isCorrect: false,
        explanation:
          'Incorrecto: La copia Diferencial del Miércoles (60 GB) ya incluye todos los cambios desde la Completa del Lunes (incluyendo los 25 GB del Martes). Por tanto, la Incremental del Martes NO debe restaurarse.'
      },
      {
        id: 'opt_b',
        label: '1º Lunes (Completa) → 2º Miércoles (Diferencial) → 3º Jueves (Incremental) → 4º Viernes (Incremental)',
        totalReadGB: '510 GB (4 pasos)',
        isCorrect: true,
        explanation:
          '¡Exacto! Primero se carga la Completa del Lunes (400 GB). Luego se salta el Martes y se aplica directamente la Diferencial del Miércoles (60 GB). Finalmente se aplican en orden las Incrementales posteriores: Jueves (30 GB) y Viernes (20 GB). Total leído: 510 GB.'
      },
      {
        id: 'opt_c',
        label: '1º Lunes (Completa) → 2º Viernes (Incremental)',
        totalReadGB: '420 GB (2 pasos)',
        isCorrect: false,
        explanation:
          'Incorrecto: La copia del Viernes es Incremental, no Diferencial. Solo contiene los 20 GB modificados el Viernes; si omites el Miércoles y Jueves perderías todos los cambios de martes a jueves.'
      },
      {
        id: 'opt_d',
        label: '1º Lunes (Completa) → 2º Miércoles (Diferencial)',
        totalReadGB: '460 GB (2 pasos)',
        isCorrect: false,
        explanation:
          'Incompleto: Restaurarías el sistema al estado del Miércoles a las 22:00h, perdiendo los datos ya respaldados en las copias Incrementales del Jueves y Viernes.'
      }
    ]
  },
  {
    id: 'q2_diff_chain',
    title: 'Caso 2: Ventaja de las Copias Diferenciales ante Cinta Dañada',
    scenario:
      'Una empresa utiliza una política Lunes Completa (500 GB) y copias DIFERENCIALES de Martes a Viernes. El Viernes a las 23:30h (TRAS finalizar el backup del viernes) falla la cabina RAID. Al ir a restaurar, descubres que la cinta del MIÉRCOLES está físicamente dañada e ilegible.',
    scheduleSummary: [
      { day: 'Lunes (22:00)', type: 'full', sizeGB: 500 },
      { day: 'Martes (22:00)', type: 'differential', sizeGB: 30 },
      { day: 'Miércoles (22:00) [CINTA DAÑADA]', type: 'differential', sizeGB: 70 },
      { day: 'Jueves (22:00)', type: 'differential', sizeGB: 105 },
      { day: 'Viernes (22:00)', type: 'differential', sizeGB: 150 },
    ],
    disasterMoment: 'Viernes a las 23:30h (con cinta del Miércoles corrupta)',
    options: [
      {
        id: 'opt_a',
        label: 'Solo se puede restaurar hasta el Martes porque el Miércoles rompe la secuencia.',
        totalReadGB: '530 GB (Pérdida de Mié-Vie)',
        isCorrect: false,
        explanation:
          'Incorrecto: Eso ocurriría si fueran copias Incrementales. Las copias Diferenciales son acumulativas respecto a la última Completa y no dependen unas de otras.'
      },
      {
        id: 'opt_b',
        label: 'Se restaura el 100% sin pérdida leyendo solo: 1º Lunes (Completa) → 2º Viernes (Diferencial).',
        totalReadGB: '650 GB (2 pasos)',
        isCorrect: true,
        explanation:
          '¡Correcto! La Diferencial del Viernes (150 GB) contiene todos los cambios ocurridos desde el Lunes (incluyendo Martes, Miércoles, Jueves y Viernes). La cinta dañada del Miércoles no se necesita en absoluto.'
      },
      {
        id: 'opt_c',
        label: 'Hay que leer Lunes (Completa) + Martes (Diff) + Jueves (Diff) + Viernes (Diff).',
        totalReadGB: '785 GB (4 pasos)',
        isCorrect: false,
        explanation:
          'Incorrecto: En una política Diferencial nunca se leen varias diferenciales seguidas; la última Diferencial disponible ya engloba el contenido de todas las diferenciales previas.'
      }
    ]
  },
  {
    id: 'q3_321_ransomware',
    title: 'Caso 3: Auditoría de Desastre por Ransomware en Red Local',
    scenario:
      'Un ayuntamiento tiene: (1) Servidor principal con RAID-10 NVMe, (2) Un NAS Synology en la misma red VLAN montado como unidad Z:\\ mediante SMB sin snapshots inmutables, y (3) Un segundo NAS en el edificio anexo conectado por fibra con las mismas credenciales de dominio Active Directory. Un viernes entra un ransomware LockBit con permisos de Administrador de Dominio.',
    scheduleSummary: [
      { day: 'Copia 1: Producción RAID-10', type: 'full', sizeGB: 1000 },
      { day: 'Copia 2: NAS Local por SMB (Z:\\)', type: 'differential', sizeGB: 1000 },
      { day: 'Copia 3: NAS Edificio Anexo (Dominio AD)', type: 'differential', sizeGB: 1000 },
    ],
    disasterMoment: 'Infección por Ransomware con credenciales de Administrador de Dominio',
    options: [
      {
        id: 'opt_a',
        label: 'Cumple 3-2-1 y se salva gracias al NAS del edificio anexo (Offsite).',
        totalReadGB: 'Recuperación exitosa',
        isCorrect: false,
        explanation:
          'Incorrecto: Aunque el edificio anexo esté separado físicamente (protegiendo de un incendio), está conectado en red con las mismas credenciales de dominio sin inmutabilidad (WORM) ni Air-Gap. El ransomware cifrará los 3 nodos simultáneamente.'
      },
      {
        id: 'opt_b',
        label: 'Cero copias sobreviven: falta aislamiento Air-Gap o bloqueo de inmutabilidad WORM (Regla 3-2-1-1-0).',
        totalReadGB: 'Pérdida total por cifrado',
        isCorrect: true,
        explanation:
          '¡Exacto! Además de fallar en variedad de tecnología (ambos respaldos son NAS expuestos por red/AD), ningún repositorio tiene bloqueo inmutable (Object Lock / WORM) ni desconexión física (Air-Gap como cintas LTO extraídas).'
      },
      {
        id: 'opt_c',
        label: 'Se recupera desde el RAID-10 del servidor de producción porque tiene redundancia de discos.',
        totalReadGB: '0 min (Redundancia RAID)',
        isCorrect: false,
        explanation:
          'Concepto fundamental: ¡EL RAID NO ES UN BACKUP! El RAID replica instantáneamente el cifrado del ransomware o un borrado accidental en todos los discos del espejo.'
      }
    ]
  }
];
