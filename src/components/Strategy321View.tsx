import React from 'react';
import { CopyNode321, Validation321Result } from '../data/backupEngine';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cloud,
  Flame,
  HardDrive,
  Lock,
  Plus,
  Server,
  ShieldCheck,
  Skull,
  Trash2,
  Unlock,
} from 'lucide-react';

interface Strategy321ViewProps {
  nodes: CopyNode321[];
  validation: Validation321Result;
  onUpdateNode: (id: string, patch: Partial<CopyNode321>) => void;
  onAddNode: () => void;
  onRemoveNode: (id: string) => void;
  onLoadArchitecturePreset: (preset: 'vulnerable_pyme' | 'standard_321' | 'hardened_32110') => void;
}

const MEDIUM_LABELS: Record<CopyNode321['mediumType'], string> = {
  nvme_raid: 'Cabina RAID NVMe / SSD Internos',
  nas_smb: 'NAS en Red Local (SMB / NFS)',
  tape_lto: 'Cartucho de Cinta Magnética LTO',
  usb_rdx: 'Disco Extraíble USB / Cartucho RDX',
  cloud_s3: 'Almacenamiento Cloud Object Storage (S3)',
  remote_datacenter: 'Servidor de Réplica en CPD Remoto',
};

const LOCATION_LABELS: Record<CopyNode321['location'], string> = {
  local_cpd: 'Sala de Servidores / CPD Principal (Onsite)',
  local_building_safe: 'Mismo Edificio (Planta / Habitación Anexa)',
  offsite_cloud: 'Nube Pública (Región Geográfica Distinta - Offsite)',
  offsite_branch: 'Sede Remota / Bóveda Externa (> 50 km - Offsite)',
};

export const Strategy321View: React.FC<Strategy321ViewProps> = ({
  nodes,
  validation,
  onUpdateNode,
  onAddNode,
  onRemoveNode,
  onLoadArchitecturePreset,
}) => {
  return (
    <div className="space-y-8">
      {/* Cabecera y Presets de Arquitectura */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>01. Laboratorio de Estrategia 3-2-1 y Extensión 3-2-1-1-0</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Diseña dónde residen tus copias de seguridad, en qué soportes y bajo qué aislamiento
              para comprobar si sobreviven a un fallo físico, un ataque de ransomware o el incendio
              del CPD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadArchitecturePreset('vulnerable_pyme')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Simular Error PyME (NAS Local sin Air-Gap)
            </button>
            <button
              type="button"
              onClick={() => onLoadArchitecturePreset('standard_321')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Cargar 3-2-1 Clásico
            </button>
            <button
              type="button"
              onClick={() => onLoadArchitecturePreset('hardened_32110')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Cargar 3-2-1-1-0 Blindado
            </button>
          </div>
        </div>

        {/* Los 4 Pilares de Validación en Vivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Pilar 3: Tres Copias */}
          <div
            className={`p-4 rounded-xl border ${
              validation.meets3Copies
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-red-500/60 bg-red-50/20 dark:bg-red-950/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                3
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  validation.meets3Copies
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {validation.meets3Copies
                  ? `✓ CUMPLIDO (${validation.totalCopies}/3)`
                  : `✕ INSUFICIENTE (${validation.totalCopies}/3)`}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
              Al menos 3 Copias de los Datos
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              1 copia primaria en producción + mínimo 2 copias de respaldo independientes.
            </p>
          </div>

          {/* Pilar 2: Dos Medios Diferentes */}
          <div
            className={`p-4 rounded-xl border ${
              validation.meets2Media
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-red-500/60 bg-red-50/20 dark:bg-red-950/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                2
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  validation.meets2Media
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {validation.meets2Media
                  ? `✓ CUMPLIDO (${validation.distinctMediaTypes} tipos)`
                  : `✕ FALLO (${validation.distinctMediaTypes} tipo)`}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
              En 2 Soportes / Tecnologías Distintas
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Evita que un fallo de firmware, cabina o protocolo afecte a ambos soportes a la vez.
            </p>
          </div>

          {/* Pilar 1: Una Copia Offsite */}
          <div
            className={`p-4 rounded-xl border ${
              validation.meets1Offsite
                ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                : 'border-red-500/60 bg-red-50/20 dark:bg-red-950/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                1
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  validation.meets1Offsite
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {validation.meets1Offsite
                  ? `✓ CUMPLIDO (${validation.offsiteCopies} externa)`
                  : '✕ SIN COPIA EXTERNA'}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
              1 Copia Fuera del Sitio (Offsite)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ubicada en otra sede geográfica o nube para sobrevivir a incendios, robos o
              inundaciones.
            </p>
          </div>

          {/* Pilar +1-0: Inmutabilidad / Air-Gap */}
          <div
            className={`p-4 rounded-xl border ${
              validation.meets1Immutable
                ? 'border-sky-500/60 bg-sky-50/20 dark:bg-sky-950/15'
                : 'border-amber-500/60 bg-amber-50/20 dark:bg-amber-950/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                +1-0
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  validation.meets1Immutable
                    ? 'text-sky-700 dark:text-sky-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {validation.meets1Immutable
                  ? `✓ INMUTABLE (${validation.immutableCopies})`
                  : '▲ VULNERABLE A CIFRADO'}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
              1 Copia Inmutable (WORM) o Air-Gap
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Protección crítica contra Ransomware que intenta borrar o cifrar los repositorios de
              red.
            </p>
          </div>
        </div>
      </section>

      {/* Configurador de Nodos de Copia y Simulador de Siniestros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Lista de Nodos Configurables (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  02. Nodos de Datos y Repositorios de tu Infraestructura
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Activa o modifica el soporte, ubicación e inmutabilidad de cada copia.
                </p>
              </div>
              {nodes.length < 5 && (
                <button
                  type="button"
                  onClick={onAddNode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Copia Adicional</span>
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {nodes.map((node, index) => {
                const isProd = node.role === 'production';
                return (
                  <div
                    key={node.id}
                    className={`p-4 rounded-xl border transition-all ${
                      node.enabled
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                        : 'border-slate-200/60 dark:border-slate-800/40 bg-slate-100/40 dark:bg-slate-900/30 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={node.enabled}
                          disabled={isProd}
                          onChange={(e) =>
                            onUpdateNode(node.id, { enabled: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {node.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isProd ? (
                          <span className="text-xs font-mono text-sky-700 dark:text-sky-400">
                            Origen de Datos (Obligatorio)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNode(node.id, {
                                  isImmutableOrAirgapped: !node.isImmutableOrAirgapped,
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                node.isImmutableOrAirgapped
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {node.isImmutableOrAirgapped ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Inmutable WORM / Air-Gap</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Lectura/Escritura Abierta</span>
                                </>
                              )}
                            </button>

                            {index > 2 && (
                              <button
                                type="button"
                                onClick={() => onRemoveNode(node.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Eliminar nodo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Tecnología de Soporte / Medio
                        </label>
                        <select
                          value={node.mediumType}
                          disabled={!node.enabled}
                          onChange={(e) =>
                            onUpdateNode(node.id, {
                              mediumType: e.target.value as CopyNode321['mediumType'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                        >
                          {Object.entries(MEDIUM_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Ubicación Física / Geográfica
                        </label>
                        <select
                          value={node.location}
                          disabled={!node.enabled || isProd}
                          onChange={(e) =>
                            onUpdateNode(node.id, {
                              location: e.target.value as CopyNode321['location'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 disabled:opacity-60"
                        >
                          {Object.entries(LOCATION_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <strong>Nota sobre el falso «Offsite»:</strong> Guardar un disco externo o un segundo
            NAS en la habitación de al lado dentro del mismo edificio (<em>Mismo Edificio</em>) NO
            cuenta como copia Offsite ante un incendio estructural o inundación.
          </div>
        </section>

        {/* Simulador de Supervivencia ante Siniestros Reales (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                03. Auditoría de Supervivencia ante 3 Catástrofes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Resultado en tiempo real al someter tu arquitectura actual a los tres incidentes
                más frecuentes en administración de sistemas:
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {/* Siniestro 1: Fallo Hardware Servidor */}
              <div
                className={`p-4 rounded-xl border ${
                  validation.disasterSimulations.hardwareFailure.survives
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Escenario A: Rotura de RAID / Corrupción en Servidor</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      validation.disasterSimulations.hardwareFailure.survives
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {validation.disasterSimulations.hardwareFailure.survives
                      ? '✓ SOBREVIVE'
                      : '✕ PÉRDIDA TOTAL'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {validation.disasterSimulations.hardwareFailure.explanation}
                </p>
              </div>

              {/* Siniestro 2: Ataque de Ransomware */}
              <div
                className={`p-4 rounded-xl border ${
                  validation.disasterSimulations.ransomwareAttack.survives
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <Skull className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Escenario B: Ataque de Ransomware en Red Local</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      validation.disasterSimulations.ransomwareAttack.survives
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {validation.disasterSimulations.ransomwareAttack.survives
                      ? '✓ SOBREVIVE'
                      : '✕ CIFRADO TOTAL'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {validation.disasterSimulations.ransomwareAttack.explanation}
                </p>
              </div>

              {/* Siniestro 3: Incendio / Inundación del CPD */}
              <div
                className={`p-4 rounded-xl border ${
                  validation.disasterSimulations.siteFireFlood.survives
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white">
                    <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Escenario C: Incendio / Inundación en el Edificio</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      validation.disasterSimulations.siteFireFlood.survives
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {validation.disasterSimulations.siteFireFlood.survives
                      ? '✓ SOBREVIVE'
                      : '✕ DESTRUIDO'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {validation.disasterSimulations.siteFireFlood.explanation}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">
              ¿Qué significa el «0» final en la regla 3-2-1-1-0?
            </div>
            <p>
              Significa <strong>0 errores en las pruebas automatizadas de verificación</strong> (ej.
              levantar las máquinas virtuales respaldadas en un entorno aislado Sandbox cada semana
              para comprobar que el backup es realmente restaurable y no un archivo corrupto).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
