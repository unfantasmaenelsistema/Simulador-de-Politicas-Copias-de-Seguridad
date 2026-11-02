import React, { useState } from 'react';
import { EXAM_QUESTIONS, LAB_CHALLENGES, LabChallenge } from '../data/challengesData';
import { DayId, getBackupTypeLabel } from '../data/backupEngine';
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  Terminal,
  XCircle,
} from 'lucide-react';

interface ChallengesAndGuideViewProps {
  currentMetrics: {
    totalWeeklyStorageGB: number;
    maxDailyBackupMinutes: number;
    fridayAfterBackupRestoreSteps: number;
    fridayAfterBackupRTOMinutes: number;
    hasFullOnMonday: boolean;
    unbackedDaysCount: number;
    is32110Compliant: boolean;
  };
  onLoadChallengeSetup: (challenge: LabChallenge) => void;
}

export const ChallengesAndGuideView: React.FC<ChallengesAndGuideViewProps> = ({
  currentMetrics,
  onLoadChallengeSetup,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const completedChallengesCount = LAB_CHALLENGES.filter(
    (ch) => ch.evaluate(currentMetrics).passed
  ).length;

  const correctQuizCount = EXAM_QUESTIONS.filter((q) => {
    const chosenId = selectedAnswers[q.id];
    const opt = q.options.find((o) => o.id === chosenId);
    return Boolean(opt?.isCorrect);
  }).length;

  return (
    <div className="space-y-8">
      {/* Cabecera de Progreso del Alumno */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Laboratorio Práctico Evaluable y Casos de Examen</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pon a prueba tu planificación resolviendo los retos de ingeniería en el simulador y
              los supuestos prácticos de examen.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Retos de Simulador: </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {completedChallengesCount} / {LAB_CHALLENGES.length} superados
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Test de Restauración: </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {correctQuizCount} / {EXAM_QUESTIONS.length} aciertos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Los 3 Retos Interactivos sobre el Simulador en Vivo */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          01. Retos de Configuración en Vivo (Evaluados sobre tu Planificador Actual)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {LAB_CHALLENGES.map((challenge) => {
            const evaluation = challenge.evaluate(currentMetrics);
            return (
              <div
                key={challenge.id}
                className={`rounded-xl border p-6 flex flex-col justify-between bg-white dark:bg-slate-900 ${
                  evaluation.passed
                    ? 'border-emerald-500/70 dark:border-emerald-500/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                      RETO {challenge.number}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        evaluation.passed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {evaluation.passed ? '✓ SUPERADO' : '○ EN CURSO'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
                    {challenge.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {challenge.context}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Requisitos del SLA:
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {challenge.constraints.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-sky-600 dark:text-sky-400 font-mono">·</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Estado actual de validación */}
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Verificación de tu estado actual:
                    </div>
                    {evaluation.feedback.map((fb, i) => (
                      <div key={i} className="text-slate-600 dark:text-slate-300">
                        • {fb}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onLoadChallengeSetup(challenge)}
                    className="w-full py-2 px-3 text-xs font-medium text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Cargar Datos del Reto e Ir al Planificador</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cuestionario Práctico de Cadenas de Restauración */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>02. Supuestos Prácticos de Examen (Resolución de Cadenas y 3-2-1)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analiza cada escenario y selecciona la secuencia exacta de soportes que cargarías.
          </p>
        </div>

        <div className="space-y-6">
          {EXAM_QUESTIONS.map((q) => {
            const chosenOptionId = selectedAnswers[q.id];
            const chosenOption = q.options.find((o) => o.id === chosenOptionId);

            return (
              <div
                key={q.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {q.scenario}
                  </p>
                </div>

                {/* Mini tabla de soportes del supuesto */}
                <div className="flex flex-wrap items-center gap-2">
                  {q.scheduleSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono tabular-nums"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.day}:
                      </span>{' '}
                      <span className="text-sky-700 dark:text-sky-400">
                        {getBackupTypeLabel(item.type)}
                      </span>{' '}
                      ({item.sizeGB} GB)
                    </div>
                  ))}
                </div>

                {/* Opciones de respuesta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt) => {
                    const isSelected = chosenOptionId === opt.id;
                    let borderCls =
                      'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-500';
                    if (isSelected) {
                      borderCls = opt.isCorrect
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                        : 'border-red-600 bg-red-50/60 dark:bg-red-950/30';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                        }
                        className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${borderCls}`}
                      >
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {opt.label}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span>Volumen / Impacto: {opt.totalReadGB}</span>
                          {isSelected && (
                            <span
                              className={
                                opt.isCorrect
                                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'text-red-600 dark:text-red-400 font-bold'
                              }
                            >
                              {opt.isCorrect ? '✓ CORRECTA' : '✕ INCORRECTA'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explicación didáctica al responder */}
                {chosenOption && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      chosenOption.isCorrect
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                    }`}
                  >
                    {chosenOption.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>{chosenOption.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Guía Teórica de Referencia Rápida (Tabla Comparativa y Fórmulas) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>03. Síntesis Teórica: Cuadro Comparativo de Tipos de Respaldo</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen técnico para repaso de módulos de Administración de Sistemas, Seguridad y Alta
            Disponibilidad.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4 font-semibold">Criterio Técnico</th>
                <th className="py-3 px-4 font-semibold text-sky-700 dark:text-sky-400">
                  Copia Completa (Full)
                </th>
                <th className="py-3 px-4 font-semibold text-amber-700 dark:text-amber-400">
                  Copia Diferencial
                </th>
                <th className="py-3 pl-4 font-semibold text-emerald-700 dark:text-emerald-400">
                  Copia Incremental
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 pr-4 font-semibold">¿Qué datos respalda?</td>
                <td className="py-3 px-4">
                  El 100% de los datos seleccionados del sistema en ese momento.
                </td>
                <td className="py-3 px-4">
                  Todos los datos nuevos o modificados desde la{' '}
                  <strong>última copia Completa</strong>.
                </td>
                <td className="py-3 pl-4">
                  Solo los datos nuevos o modificados desde la{' '}
                  <strong>última copia de cualquier tipo</strong>.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Marca de Archivo (Archive Bit)</td>
                <td className="py-3 px-4 font-mono text-[11px]">
                  Desmarca el bit (Lo pone a 0)
                </td>
                <td className="py-3 px-4 font-mono text-[11px]">
                  NO modifica el bit (Sigue en 1)
                </td>
                <td className="py-3 pl-4 font-mono text-[11px]">
                  Desmarca el bit (Lo pone a 0)
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Tiempo de Copia (Ventana)</td>
                <td className="py-3 px-4">Muy lento (requiere ventana amplia).</td>
                <td className="py-3 px-4">
                  Moderado (rápido al principio, crece cada día que pasa desde la Completa).
                </td>
                <td className="py-3 pl-4">
                  Muy rápido (solo escribe el diferencial neto de las últimas 24h).
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Espacio en Almacenamiento</td>
                <td className="py-3 px-4">Máximo (alta duplicidad de datos idénticos).</td>
                <td className="py-3 px-4">
                  Medio-Alto (repite los cambios de días previos desde la última Completa).
                </td>
                <td className="py-3 pl-4">
                  Mínimo óptimo (sin duplicidad entre días consecutivos).
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Complejidad de Restauración (RTO)</td>
                <td className="py-3 px-4">
                  <strong>1 solo paso:</strong> Cargar la última Completa.
                </td>
                <td className="py-3 px-4">
                  <strong>Máximo 2 pasos:</strong> Última Completa + Última Diferencial.
                </td>
                <td className="py-3 pl-4">
                  <strong>N pasos:</strong> Última Completa + TODAS las Incrementales en orden
                  cronológico.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold">Tolerancia si falla 1 cinta intermedia</td>
                <td className="py-3 px-4">Independiente de copias previas.</td>
                <td className="py-3 px-4">
                  <strong>Alta:</strong> Si se daña el Miércoles, la Diferencial del Jueves ya lo
                  incluye todo.
                </td>
                <td className="py-3 pl-4">
                  <strong>Baja (Frágil):</strong> Si falla un eslabón intermedio, se rompe la
                  cadena desde ese día.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fórmulas Matemáticas Clave */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Fórmula de Tiempo de Ventana</span>
            </div>
            <p className="mt-2 font-mono text-xs text-sky-700 dark:text-sky-400">
              T (seg) = (Volumen_GB × 1024) / Velocidad_MBps
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Recuerda convertir siempre Gigabytes a Megabytes (× 1024) antes de dividir entre los
              MB/s de transferencia del soporte.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>RTO (Recovery Time Objective)</span>
            </div>
            <p className="mt-2 font-mono text-xs text-sky-700 dark:text-sky-400">
              RTO = Σ (Lectura de cada paso) + T_montaje
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Tiempo máximo tolerable que el negocio puede permanecer caído desde que ocurre el
              desastre hasta que el servicio vuelve a estar operativo.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>RPO (Recovery Point Objective)</span>
            </div>
            <p className="mt-2 font-mono text-xs text-sky-700 dark:text-sky-400">
              RPO = t_desastre − t_último_backup_válido
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Cantidad máxima de datos (medida en tiempo hacia atrás, ej. 24h o 15 min) que la
              organización asume perder tras restaurar.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
