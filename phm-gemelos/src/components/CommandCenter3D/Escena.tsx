import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { ZonaId } from '../../data/supuestos.ts';
import { ZONAS } from '../../data/supuestos.ts';
import type { CargaSede, Estado } from '../../model/modelo.ts';
import { COLOR_ESTADO } from '../ui/formato.ts';
import {
  BASE_DOMICILIARIA,
  CALLE_Z,
  EDIFICIO,
  HOGARES,
  PASILLO,
  PLANO,
  PUERTA_PRINCIPAL,
  PUERTA_PRIORITARIA,
  RED_HOSPITALARIA,
} from './layout.ts';
import type { V2 } from './layout.ts';

const COL = {
  losa: '#13214a',
  borde: '#3a5290',
  mueble: '#2b3f73',
  muebleAlto: '#34508f',
  calle: '#0e1a3c',
  lineaCalle: '#2a3c6c',
  paciente: '#e6edf7',
  van: '#00dfed',
  ambulancia: '#f1f4fa',
  hogar: '#24366a',
  techo: '#3a5290',
  equipoUso: '#19a3fc',
  equipoLibre: '#5d6f99',
  equipoAlerta: '#e0a32e',
  seleccion: '#00dfed',
};

interface Props {
  carga: CargaSede;
  zonaSel: ZonaId;
  onZona: (z: ZonaId) => void;
  reducido: boolean;
  activo: boolean;
}

// ---------- Rutas ----------
interface Ruta {
  pts: THREE.Vector3[];
  acum: number[];
  largo: number;
}
const Y = 0.34;
function ruta(puntos: V2[], cerrar = true): Ruta {
  const ida = puntos.map(([x, z]) => new THREE.Vector3(x, Y, z));
  const pts = cerrar ? ida.concat(ida.slice(0, -1).reverse()) : ida;
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, acum, largo: acum[acum.length - 1] };
}
function enRuta(r: Ruta, s: number, out: THREE.Vector3) {
  const d = ((s % r.largo) + r.largo) % r.largo;
  let i = 1;
  while (i < r.acum.length - 1 && r.acum[i] < d) i++;
  const a = r.acum[i - 1];
  const t = (d - a) / Math.max(1e-6, r.acum[i] - a);
  return out.lerpVectors(r.pts[i - 1], r.pts[i], t);
}

const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

function rutaPaciente(zona: ZonaId, destino: V2, k: number): Ruta {
  const sx = -9 + rnd(k) * 6;
  const calle: V2 = [sx, CALLE_Z];
  const [dx, dz] = destino;
  const entrada: V2[] = [calle, [PUERTA_PRINCIPAL[0], 9.4], PUERTA_PRINCIPAL, [0.5, 5.6], [0.5, 1]];
  switch (zona) {
    case 'consulta':
      return ruta([...entrada, [-3.2, 1], [-7.5, 1], [-7.5, dz], [dx < -7.5 ? dx + 1.15 : dx - 1.15, dz]]);
    case 'laboratorio':
      return ruta([...entrada, [0.5, -1.2], [dx, -4.8], [dx, dz + (dz < -4.8 ? 0.8 : -0.8)]]);
    case 'procedimientos':
      return ruta([...entrada, [4.6, 0.5], [4.6, -3.9], [dx, -3.9], [dx, dz + (dz < -3.9 ? 0.7 : -0.7)]]);
    case 'prioritaria': {
      const sx2 = 10 + rnd(k + 7) * 5;
      return ruta([[sx2, CALLE_Z], [PUERTA_PRIORITARIA[0], 9.4], PUERTA_PRIORITARIA, [8, 5], [dx, 5], [dx, dz + (dz < 5 ? 0.9 : -0.6)]]);
    }
    default:
      return ruta([calle, PUERTA_PRINCIPAL, [dx, dz]]);
  }
}

// ---------- Flujo de pacientes ----------
const CUPO = 70;
function FlujoPacientes({ carga, reducido }: { carga: CargaSede; reducido: boolean }) {
  const zonasFlujo = PLANO.filter((z) => z.id !== 'admision');
  const total = zonasFlujo.length * CUPO;
  const ref = useRef<THREE.InstancedMesh>(null);
  const slots = useMemo(() => {
    const out: { zona: ZonaId; idx: number; r: Ruta; fase: number; vel: number; escala: number }[] = [];
    zonasFlujo.forEach((z, zi) => {
      for (let i = 0; i < CUPO; i++) {
        const k = zi * 1000 + i;
        const destino = z.puestos[i % z.puestos.length];
        const r = rutaPaciente(z.id, destino, k);
        out.push({ zona: z.id, idx: i, r, fase: rnd(k + 3) * r.largo, vel: 1.7 + rnd(k + 5) * 0.9, escala: 0 });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const objetivo = useMemo(() => {
    const o: Partial<Record<ZonaId, number>> = {};
    for (const z of zonasFlujo) o[z.id] = Math.min(CUPO, Math.round(carga.zonas[z.id].demandaDia / z.divisor));
    return o;
  }, [carga, zonasFlujo]);

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);
  const tiempo = useRef(0);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!reducido) tiempo.current += Math.min(dt, 0.05);
    slots.forEach((sl, i) => {
      const meta = sl.idx < (objetivo[sl.zona] ?? 0) ? 1 : 0;
      sl.escala = reducido ? meta : sl.escala + (meta - sl.escala) * Math.min(1, dt * 4);
      enRuta(sl.r, sl.fase + tiempo.current * sl.vel, tmp.v);
      tmp.s.setScalar(Math.max(0.0001, sl.escala));
      tmp.m.compose(tmp.v, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]} frustumCulled={false}>
      <sphereGeometry args={[0.17, 10, 8]} />
      <meshStandardMaterial color={COL.paciente} emissive={COL.paciente} emissiveIntensity={0.35} />
    </instancedMesh>
  );
}

// ---------- Vehículos: Salud en Casa y referencia a red hospitalaria ----------
function Vehiculos({ cantidad, rutas, color, tam, reducido, vel }: { cantidad: number; rutas: Ruta[]; color: string; tam: [number, number, number]; reducido: boolean; vel: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = rutas.length;
  const estado = useMemo(() => rutas.map((r, i) => ({ r, fase: rnd(i + 91) * r.largo, escala: 0 })), [rutas]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), o: new THREE.Object3D() }), []);
  const t = useRef(0);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!reducido) t.current += Math.min(dt, 0.05);
    estado.forEach((e, i) => {
      const meta = i < cantidad ? 1 : 0;
      e.escala = reducido ? meta : e.escala + (meta - e.escala) * Math.min(1, dt * 3);
      const s = e.fase + t.current * vel;
      enRuta(e.r, s, tmp.v);
      enRuta(e.r, s + 0.3, tmp.w);
      tmp.o.position.copy(tmp.v);
      tmp.o.position.y = tam[1] / 2 + 0.05;
      tmp.o.lookAt(tmp.w.x, tmp.o.position.y, tmp.w.z);
      tmp.o.scale.setScalar(Math.max(0.0001, e.escala));
      tmp.o.updateMatrix();
      mesh.setMatrixAt(i, tmp.o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[tam[0], tam[1], tam[2]]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
    </instancedMesh>
  );
}

// ---------- Zonas ----------
function PisoZona({ id, centro, tam, estado, sel, onZona, reducido }: { id: ZonaId; centro: V2; tam: V2; estado: Estado; sel: boolean; onZona: (z: ZonaId) => void; reducido: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const objetivo = useMemo(() => new THREE.Color(COLOR_ESTADO[estado]), [estado]);
  useFrame((_, dt) => {
    if (!mat.current) return;
    if (reducido) mat.current.color.copy(objetivo);
    else mat.current.color.lerp(objetivo, Math.min(1, dt * 2.5));
    mat.current.emissive.copy(mat.current.color);
  });
  const [w, d] = tam;
  const grosor = sel ? 0.14 : 0.07;
  const colorBorde = sel ? COL.seleccion : COL.borde;
  return (
    <group position={[centro[0], 0, centro[1]]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.012}
        onClick={(e) => {
          e.stopPropagation();
          onZona(id);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshStandardMaterial ref={mat} color={COLOR_ESTADO[estado]} emissive={COLOR_ESTADO[estado]} emissiveIntensity={0.18} transparent opacity={0.42} />
      </mesh>
      {[
        [0, -d / 2, w, grosor],
        [0, d / 2, w, grosor],
        [-w / 2, 0, grosor, d],
        [w / 2, 0, grosor, d],
      ].map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0.06, z]}>
          <boxGeometry args={[bw, 0.12, bd]} />
          <meshStandardMaterial color={colorBorde} emissive={colorBorde} emissiveIntensity={sel ? 0.6 : 0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Mobiliario() {
  const items = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    for (const z of PLANO) {
      const [w, h, d] = z.mueble;
      z.puestos.forEach(([x, zz], i) => {
        const alto = z.id === 'laboratorio' && i >= 5;
        const s: [number, number, number] = alto ? [1.5, 1.0, 1.4] : [w, h, d];
        out.push({ p: [x, s[1] / 2, zz], s, c: alto ? COL.muebleAlto : COL.mueble });
      });
    }
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} castShadow={false}>
          <boxGeometry args={it.s} />
          <meshStandardMaterial color={it.c} />
        </mesh>
      ))}
    </group>
  );
}

// Equipos conectados: estado de uso derivado de la ocupación de la zona.
function Equipos({ carga, reducido }: { carga: CargaSede; reducido: boolean }) {
  const alerta = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (alerta.current && !reducido) alerta.current.emissiveIntensity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4));
  });
  const puntos = useMemo(() => {
    const out: { p: [number, number, number]; c: string; alerta: boolean }[] = [];
    for (const z of PLANO) {
      if (z.id === 'admision') continue;
      const occ = carga.zonas[z.id].ocupacion;
      const n = Math.min(z.puestos.length, 10);
      const enUso = Math.round(Math.min(1, occ) * n);
      for (let i = 0; i < n; i++) {
        const [x, zz] = z.puestos[i];
        const esAlerta = z.id === 'laboratorio' && i === 6;
        const alto = z.id === 'laboratorio' && i >= 5 ? 1.0 : z.mueble[1];
        out.push({ p: [x, alto + 0.22, zz], c: esAlerta ? COL.equipoAlerta : i < enUso ? COL.equipoUso : COL.equipoLibre, alerta: esAlerta });
      }
    }
    return out;
  }, [carga]);
  return (
    <group>
      {puntos.map((pt, i) => (
        <mesh key={i} position={pt.p}>
          <sphereGeometry args={[pt.alerta ? 0.2 : 0.12, 10, 8]} />
          <meshStandardMaterial ref={pt.alerta ? alerta : undefined} color={pt.c} emissive={pt.c} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Entorno() {
  const [x0, z0] = EDIFICIO.min;
  const [x1, z1] = EDIFICIO.max;
  const W = x1 - x0;
  const D = z1 - z0;
  return (
    <group>
      {/* losa del edificio */}
      <mesh position={[(x0 + x1) / 2, -0.15, (z0 + z1) / 2]}>
        <boxGeometry args={[W + 0.6, 0.3, D + 0.6]} />
        <meshStandardMaterial color={COL.losa} />
      </mesh>
      {/* pasillo */}
      <mesh rotation-x={-Math.PI / 2} position={[PASILLO.centro[0], 0.01, PASILLO.centro[1]]}>
        <planeGeometry args={PASILLO.tam} />
        <meshStandardMaterial color="#1a2a58" />
      </mesh>
      {/* muro perimetral bajo con dos accesos */}
      {[
        [(x0 + x1) / 2, z0, W, 0.18],
        [x0, (z0 + z1) / 2, 0.18, D],
        [x1, (z0 + z1) / 2, 0.18, D],
        [(x0 + PUERTA_PRINCIPAL[0] - 1.2) / 2, z1, PUERTA_PRINCIPAL[0] - 1.2 - x0, 0.18],
        [(PUERTA_PRINCIPAL[0] + 1.2 + PUERTA_PRIORITARIA[0] - 1.2) / 2, z1, PUERTA_PRIORITARIA[0] - 1.2 - (PUERTA_PRINCIPAL[0] + 1.2), 0.18],
        [(PUERTA_PRIORITARIA[0] + 1.2 + x1) / 2, z1, x1 - PUERTA_PRIORITARIA[0] - 1.2, 0.18],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <boxGeometry args={[w, 0.7, d]} />
          <meshStandardMaterial color="#2c4178" />
        </mesh>
      ))}
      {/* calle y vía domiciliaria */}
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.28, CALLE_Z]}>
        <planeGeometry args={[60, 2.4]} />
        <meshStandardMaterial color={COL.calle} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[19.5, -0.27, 3]}>
        <planeGeometry args={[1.6, 27]} />
        <meshStandardMaterial color={COL.calle} />
      </mesh>
      {/* base de Salud en Casa */}
      <mesh position={[BASE_DOMICILIARIA[0], 0.7, BASE_DOMICILIARIA[1] - 2.6]}>
        <boxGeometry args={[3.4, 1.4, 2.4]} />
        <meshStandardMaterial color={COL.muebleAlto} />
      </mesh>
      {/* hogares */}
      {HOGARES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.1, 0.8, 1.1]} />
            <meshStandardMaterial color={COL.hogar} />
          </mesh>
          <mesh position={[0, 1.05, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[0.9, 0.55, 4]} />
            <meshStandardMaterial color={COL.techo} />
          </mesh>
        </group>
      ))}
      {/* referencia a red hospitalaria */}
      <mesh position={[RED_HOSPITALARIA[0], 0.9, RED_HOSPITALARIA[1] - 2.2]}>
        <boxGeometry args={[3, 1.8, 2]} />
        <meshStandardMaterial color="#3a2a48" />
      </mesh>
      <mesh position={[RED_HOSPITALARIA[0], 1.85, RED_HOSPITALARIA[1] - 1.18]}>
        <boxGeometry args={[0.9, 0.25, 0.05]} />
        <meshStandardMaterial color="#d1495b" emissive="#d1495b" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[RED_HOSPITALARIA[0], 1.85, RED_HOSPITALARIA[1] - 1.17]}>
        <boxGeometry args={[0.25, 0.9, 0.05]} />
        <meshStandardMaterial color="#d1495b" emissive="#d1495b" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function AjusteCamara() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width < 600 ? size.width / 36 : Math.min(size.width / 52, size.height / 33);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

const CORTO_MOVIL: Record<string, string> = {
  'Consulta externa': 'Consulta',
  'Admisión y triage': 'Admisión',
  'Atención prioritaria': 'Prioritaria',
  'Salud en Casa': 'Casa',
};

function Etiqueta({ pos, texto, valor, estado, sel, onClick }: { pos: [number, number, number]; texto: string; valor: string; estado: Estado; sel: boolean; onClick: () => void }) {
  const { size } = useThree();
  const compacto = size.width < 600;
  return (
    <Html position={pos} zIndexRange={[20, 0]}>
      <button
        type="button"
        className={`etiqueta-zona${sel ? ' sel' : ''}`}
        style={{ borderLeftColor: COLOR_ESTADO[estado] }}
        onClick={onClick}
        aria-pressed={sel}
      >
        {compacto ? CORTO_MOVIL[texto] ?? texto : texto}
        <b>{valor}</b>
      </button>
    </Html>
  );
}

function Invalidador({ deps }: { deps: unknown[] }) {
  const { invalidate } = useThree();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => invalidate(), deps);
  return null;
}

export default function Escena({ carga, zonaSel, onZona, reducido, activo }: Props) {
  const rutasVan = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const [hx, hz] = HOGARES[i % HOGARES.length];
        return ruta([[BASE_DOMICILIARIA[0], BASE_DOMICILIARIA[1] - 1], [19.5, BASE_DOMICILIARIA[1] - 1], [19.5, hz], [hx - 0.9, hz]]);
      }),
    [],
  );
  const rutasAmb = useMemo(
    () => Array.from({ length: 5 }, () => ruta([[PUERTA_PRIORITARIA[0], 9.2], [PUERTA_PRIORITARIA[0], CALLE_Z], [RED_HOSPITALARIA[0] + 2, CALLE_Z]])),
    [],
  );
  const vans = Math.min(18, Math.round(carga.zonas.domiciliaria.demandaDia / 4.5));
  const ambulancias = Math.min(5, Math.ceil(carga.hospitalizacionesMes / 6));

  return (
    <Canvas frameloop={activo && !reducido ? 'always' : 'demand'} dpr={[1, 2]} gl={{ antialias: true }}>
      <Invalidador deps={[carga, zonaSel]} />
      <OrthographicCamera makeDefault position={[30, 30, 34]} near={-100} far={300} />
      <AjusteCamara />
      <OrbitControls target={[5.5, 0, 3]} enablePan={false} minPolarAngle={0.35} maxPolarAngle={1.2} minZoom={8} maxZoom={60} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#bcd4ff', '#0a1430', 0.5]} />
      <directionalLight position={[12, 26, 14]} intensity={1.1} />

      <Entorno />
      <Mobiliario />
      {PLANO.map((z) => (
        <PisoZona key={z.id} id={z.id} centro={z.centro} tam={z.tam} estado={carga.zonas[z.id].estado} sel={zonaSel === z.id} onZona={onZona} reducido={reducido} />
      ))}
      <PisoZona id="domiciliaria" centro={[BASE_DOMICILIARIA[0], BASE_DOMICILIARIA[1] - 1.4]} tam={[5, 6]} estado={carga.zonas.domiciliaria.estado} sel={zonaSel === 'domiciliaria'} onZona={onZona} reducido={reducido} />
      <Equipos carga={carga} reducido={reducido} />
      <FlujoPacientes carga={carga} reducido={reducido} />
      <Vehiculos cantidad={vans} rutas={rutasVan} color={COL.van} tam={[0.6, 0.45, 1.1]} reducido={reducido} vel={3.2} />
      <Vehiculos cantidad={ambulancias} rutas={rutasAmb} color={COL.ambulancia} tam={[0.75, 0.6, 1.5]} reducido={reducido} vel={4} />

      {PLANO.map((z) => (
        <Etiqueta
          key={z.id}
          pos={[z.centro[0], 1.6, z.centro[1] - z.tam[1] / 2 + 1.2]}
          texto={z.corto}
          valor={`${Math.round(carga.zonas[z.id].ocupacion * 100)} %`}
          estado={carga.zonas[z.id].estado}
          sel={zonaSel === z.id}
          onClick={() => onZona(z.id)}
        />
      ))}
      <Etiqueta
        pos={[BASE_DOMICILIARIA[0], 2.4, BASE_DOMICILIARIA[1] - 3.2]}
        texto="Salud en Casa"
        valor={`${Math.round(carga.zonas.domiciliaria.ocupacion * 100)} %`}
        estado={carga.zonas.domiciliaria.estado}
        sel={zonaSel === 'domiciliaria'}
        onClick={() => onZona('domiciliaria')}
      />
      <Html position={[RED_HOSPITALARIA[0], 2.6, RED_HOSPITALARIA[1] - 2.2]} zIndexRange={[20, 0]}>
        <div className="etiqueta-externa">Red hospitalaria de referencia</div>
      </Html>
      <Html position={[23, 1.9, -11]} zIndexRange={[20, 0]}>
        <div className="etiqueta-externa">Hogares de la cohorte</div>
      </Html>
    </Canvas>
  );
}

export const ZONAS_ORDEN: ZonaId[] = ZONAS.map((z) => z.id);
