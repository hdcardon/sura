import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Estado, SedeMes } from '../../model/red.ts';
import { COLOR_ESTADO } from '../../ui/formato.tsx';
import { ATENCIONES_POR_PUNTO, BASE_DOMICILIARIA, CALLE_Z, EDIFICIO, HOGARES, PASILLO, PLANO, PUERTA_PRINCIPAL, PUERTA_PRIORITARIA, RED_HOSPITALARIA, VIRTUAL } from './layout.ts';
import type { V2 } from './layout.ts';

const COL = {
  losa: '#13214a', borde: '#3a5290', mueble: '#2b3f73', muebleAlto: '#34508f', calle: '#0e1a3c',
  paciente: '#e6edf7', van: '#00c8d6', ambulancia: '#f1f4fa', hogar: '#24366a', techo: '#3a5290',
  uso: '#19a3fc', libre: '#5d6f99', alerta: '#e0a32e', sel: '#00dfed',
};

interface Props {
  mes: SedeMes;
  zonaSel: string;
  onZona: (z: string) => void;
  animar: boolean;
  visible: boolean;
}

interface Ruta { pts: THREE.Vector3[]; acum: number[]; largo: number }
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
  let lo = 1;
  let hi = r.acum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (r.acum[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const a = r.acum[lo - 1];
  return out.lerpVectors(r.pts[lo - 1], r.pts[lo], (d - a) / Math.max(1e-6, r.acum[lo] - a));
}
const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

function rutaPaciente(zona: string, destino: V2, k: number): Ruta {
  const calle: V2 = [-9 + rnd(k) * 6, CALLE_Z];
  const [dx, dz] = destino;
  const entrada: V2[] = [calle, [PUERTA_PRINCIPAL[0], 9.4], PUERTA_PRINCIPAL, [0.5, 5.6], [0.5, 1]];
  switch (zona) {
    case 'consulta':
      return ruta([...entrada, [-3.2, 1], [-7.5, 1], [-7.5, dz], [dx < -7.5 ? dx + 1.15 : dx - 1.15, dz]]);
    case 'laboratorio':
      return ruta([...entrada, [0.5, -1.2], [dx, -4.8], [dx, dz + (dz < -4.8 ? 0.8 : -0.8)]]);
    case 'procedimientos':
      return ruta([...entrada, [4.6, 0.5], [4.6, -3.9], [dx, -3.9], [dx, dz + (dz < -3.9 ? 0.7 : -0.7)]]);
    case 'prioritaria':
      return ruta([[10 + rnd(k + 7) * 5, CALLE_Z], [PUERTA_PRIORITARIA[0], 9.4], PUERTA_PRIORITARIA, [8, 5], [dx, 5], [dx, dz + (dz < 5 ? 0.9 : -0.6)]]);
    default:
      return ruta([calle, PUERTA_PRINCIPAL, [dx, dz]]);
  }
}

// Bucle de animación bajo demanda: solo invalida cuadros mientras el flujo está activo y el lienzo es visible.
function Motor({ activo }: { activo: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!activo) return;
    let id = 0;
    const f = () => {
      invalidate();
      id = requestAnimationFrame(f);
    };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, [activo, invalidate]);
  return null;
}

const CUPO = 90;
function Pacientes({ mes, animar }: { mes: SedeMes; animar: boolean }) {
  const zonas = PLANO.filter((z) => z.id !== 'admision');
  const ref = useRef<THREE.InstancedMesh>(null);
  const slots = useMemo(
    () =>
      zonas.flatMap((z, zi) =>
        Array.from({ length: CUPO }, (_, i) => {
          const k = zi * 1000 + i;
          const destino = z.puestos[i % z.puestos.length];
          const r = rutaPaciente(z.id, destino, k);
          // Posición estática: en la zona, cerca del puesto de destino.
          const fijo = new THREE.Vector3(destino[0] + (rnd(k + 11) - 0.5) * 1.4, Y, destino[1] + (rnd(k + 13) - 0.5) * 1.2 + (destino[1] < z.centro[1] ? 0.9 : -0.9));
          return { zona: z.id, idx: i, r, fase: rnd(k + 3) * r.largo, vel: 1.7 + rnd(k + 5) * 0.9, fijo, escala: 0 };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const objetivo = useMemo(() => {
    const o: Record<string, number> = {};
    for (const z of zonas) o[z.id] = Math.min(CUPO, Math.round((mes.zonas[z.id]?.demandaDia ?? 0) / ATENCIONES_POR_PUNTO));
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);
  const t = useRef(0);
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [objetivo, animar, invalidate]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (animar) t.current += Math.min(dt, 0.05);
    let pendiente = false;
    slots.forEach((sl, i) => {
      const meta = sl.idx < (objetivo[sl.zona] ?? 0) ? 1 : 0;
      sl.escala = animar ? sl.escala + (meta - sl.escala) * Math.min(1, dt * 4) : meta;
      if (Math.abs(sl.escala - meta) > 0.01) pendiente = true;
      if (animar) enRuta(sl.r, sl.fase + t.current * sl.vel, tmp.v);
      else tmp.v.copy(sl.fijo);
      tmp.s.setScalar(Math.max(0.0001, sl.escala));
      tmp.m.compose(tmp.v, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (pendiente && !animar) invalidate();
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, slots.length]} frustumCulled={false}>
      <sphereGeometry args={[0.17, 10, 8]} />
      <meshStandardMaterial color={COL.paciente} emissive={COL.paciente} emissiveIntensity={0.35} />
    </instancedMesh>
  );
}

function Vehiculos({ cantidad, rutas, color, tam, animar, vel }: { cantidad: number; rutas: Ruta[]; color: string; tam: [number, number, number]; animar: boolean; vel: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const est = useMemo(() => rutas.map((r, i) => ({ r, fase: rnd(i + 91) * r.largo })), [rutas]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), o: new THREE.Object3D() }), []);
  const t = useRef(0);
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [cantidad, animar, invalidate]);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (animar) t.current += Math.min(dt, 0.05);
    est.forEach((e, i) => {
      // Sin animación los vehículos quedan detenidos a lo largo de su ruta.
      const s = e.fase + t.current * vel;
      enRuta(e.r, s, tmp.v);
      enRuta(e.r, s + 0.3, tmp.w);
      tmp.o.position.set(tmp.v.x, tam[1] / 2 + 0.05, tmp.v.z);
      tmp.o.lookAt(tmp.w.x, tmp.o.position.y, tmp.w.z);
      tmp.o.scale.setScalar(i < cantidad ? 1 : 0.0001);
      tmp.o.updateMatrix();
      mesh.setMatrixAt(i, tmp.o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rutas.length]} frustumCulled={false}>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
    </instancedMesh>
  );
}

function Piso({ id, centro, tam, estado, sel, onZona }: { id: string; centro: V2; tam: V2; estado: Estado; sel: boolean; onZona: (z: string) => void }) {
  const [w, d] = tam;
  const g = sel ? 0.14 : 0.07;
  const cb = sel ? COL.sel : COL.borde;
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
        <meshStandardMaterial color={COLOR_ESTADO[estado]} emissive={COLOR_ESTADO[estado]} emissiveIntensity={0.18} transparent opacity={0.42} />
      </mesh>
      {[
        [0, -d / 2, w, g],
        [0, d / 2, w, g],
        [-w / 2, 0, g, d],
        [w / 2, 0, g, d],
      ].map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0.06, z]}>
          <boxGeometry args={[bw, 0.12, bd]} />
          <meshStandardMaterial color={cb} emissive={cb} emissiveIntensity={sel ? 0.6 : 0.1} />
        </mesh>
      ))}
    </group>
  );
}

// Mobiliario y equipos con instancias: una malla por tipo y color por instancia.
function Mobiliario({ mes }: { mes: SedeMes }) {
  const muebles = useRef<THREE.InstancedMesh>(null);
  const equipos = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(
    () =>
      PLANO.flatMap((z) =>
        z.puestos.map(([x, zz], i) => {
          const alto = z.id === 'laboratorio' && i >= 5;
          const s: [number, number, number] = alto ? [1.5, 1.0, 1.4] : z.mueble;
          return { zona: z.id, i, p: [x, s[1] / 2, zz] as [number, number, number], s, alto };
        }),
      ),
    [],
  );
  useEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, k) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      muebles.current?.setMatrixAt(k, o.matrix);
      muebles.current?.setColorAt(k, c.set(it.alto ? COL.muebleAlto : COL.mueble));
      o.position.set(it.p[0], it.s[1] + 0.22, it.p[2]);
      const alerta = it.zona === 'laboratorio' && it.i === 6;
      o.scale.setScalar(alerta ? 1.6 : 1);
      o.updateMatrix();
      equipos.current?.setMatrixAt(k, o.matrix);
      const zm = mes.zonas[it.zona];
      const n = Math.min(10, PLANO.find((p) => p.id === it.zona)!.puestos.length);
      const enUso = it.i < Math.round(Math.min(1, zm?.utilizacion ?? 0) * n);
      equipos.current?.setColorAt(k, c.set(alerta ? COL.alerta : enUso ? COL.uso : COL.libre));
    });
    for (const m of [muebles.current, equipos.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      // El sombreador debe recompilarse cuando aparece el atributo de color por instancia.
      (m.material as THREE.Material).needsUpdate = true;
    }
  }, [items, mes]);
  return (
    <>
      <instancedMesh ref={muebles} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={equipos} args={[undefined, undefined, items.length]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.15} />
      </instancedMesh>
    </>
  );
}

function Entorno() {
  const [x0, z0] = EDIFICIO.min;
  const [x1, z1] = EDIFICIO.max;
  const W = x1 - x0;
  const D = z1 - z0;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, -0.15, (z0 + z1) / 2]}>
        <boxGeometry args={[W + 0.6, 0.3, D + 0.6]} />
        <meshStandardMaterial color={COL.losa} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[PASILLO.centro[0], 0.01, PASILLO.centro[1]]}>
        <planeGeometry args={PASILLO.tam} />
        <meshStandardMaterial color="#1a2a58" />
      </mesh>
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
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.28, CALLE_Z]}>
        <planeGeometry args={[60, 2.4]} />
        <meshStandardMaterial color={COL.calle} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[19.5, -0.27, 3]}>
        <planeGeometry args={[1.6, 27]} />
        <meshStandardMaterial color={COL.calle} />
      </mesh>
      <mesh position={[BASE_DOMICILIARIA[0], 0.7, BASE_DOMICILIARIA[1] - 2.6]}>
        <boxGeometry args={[3.4, 1.4, 2.4]} />
        <meshStandardMaterial color={COL.muebleAlto} />
      </mesh>
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
      {/* nodo de atención virtual: anillo flotante fuera del edificio */}
      <mesh position={[VIRTUAL[0], 1.6, VIRTUAL[1]]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.3, 0.12, 10, 40]} />
        <meshStandardMaterial color="#7f8cff" emissive="#7f8cff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function AjusteCamara() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = size.width < 600 ? size.width / 38 : Math.min(size.width / 54, size.height / 33);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

const CORTO: Record<string, string> = { consulta: 'Consulta', admision: 'Admisión', laboratorio: 'Laboratorio', prioritaria: 'Prioritaria', procedimientos: 'Procedimientos', domiciliaria: 'Domiciliaria', virtual: 'Virtual' };

function Etiqueta({ pos, texto, valor, estado, sel, onClick }: { pos: [number, number, number]; texto: string; valor: string; estado: Estado; sel: boolean; onClick: () => void }) {
  const { size } = useThree();
  return (
    <Html position={pos} zIndexRange={[20, 0]}>
      <button type="button" className={`etiqueta-zona${sel ? ' sel' : ''}`} style={{ borderLeftColor: COLOR_ESTADO[estado] }} onClick={onClick} aria-pressed={sel}>
        {size.width < 600 ? texto.split(' ')[0] : texto}
        <b>{valor}</b>
      </button>
    </Html>
  );
}

export default function Escena3D({ mes, zonaSel, onZona, animar, visible }: Props) {
  const rutasVan = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const [hx, hz] = HOGARES[i % HOGARES.length];
        return ruta([[BASE_DOMICILIARIA[0], BASE_DOMICILIARIA[1] - 1], [19.5, BASE_DOMICILIARIA[1] - 1], [19.5, hz], [hx - 0.9, hz]]);
      }),
    [],
  );
  const rutasAmb = useMemo(() => Array.from({ length: 5 }, () => ruta([[PUERTA_PRIORITARIA[0], 9.2], [PUERTA_PRIORITARIA[0], CALLE_Z], [RED_HOSPITALARIA[0] + 2, CALLE_Z]])), []);
  const dom = mes.zonas.domiciliaria;
  const vir = mes.zonas.virtual;
  const vans = Math.min(18, Math.round((dom?.demandaDia ?? 0) / 4.5));
  const ambulancias = Math.min(5, Math.ceil((mes.hospitalizacionesRed + mes.urgenciasRed) / 12));
  const etq = (id: string) => mes.zonas[id];

  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: true }}>
      <Motor activo={animar && visible} />
      <OrthographicCamera makeDefault position={[30, 30, 34]} near={-100} far={300} />
      <AjusteCamara />
      <OrbitControls target={[4, 0, 3]} enablePan={false} minPolarAngle={0.35} maxPolarAngle={1.2} minZoom={8} maxZoom={60} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#bcd4ff', '#0a1430', 0.5]} />
      <directionalLight position={[12, 26, 14]} intensity={1.1} />
      <Entorno />
      <Mobiliario mes={mes} />
      {PLANO.map((z) =>
        mes.zonas[z.id] ? <Piso key={z.id} id={z.id} centro={z.centro} tam={z.tam} estado={mes.zonas[z.id].estado} sel={zonaSel === z.id} onZona={onZona} /> : null,
      )}
      {dom && <Piso id="domiciliaria" centro={[BASE_DOMICILIARIA[0], BASE_DOMICILIARIA[1] - 1.4]} tam={[5, 6]} estado={dom.estado} sel={zonaSel === 'domiciliaria'} onZona={onZona} />}
      <Pacientes mes={mes} animar={animar && visible} />
      <Vehiculos cantidad={vans} rutas={rutasVan} color={COL.van} tam={[0.6, 0.45, 1.1]} animar={animar && visible} vel={3.2} />
      <Vehiculos cantidad={ambulancias} rutas={rutasAmb} color={COL.ambulancia} tam={[0.75, 0.6, 1.5]} animar={animar && visible} vel={4} />
      {PLANO.map((z) =>
        etq(z.id) ? (
          <Etiqueta
            key={z.id}
            pos={[z.centro[0], 1.6, z.centro[1] - z.tam[1] / 2 + 1.2]}
            texto={CORTO[z.id] ?? z.corto}
            valor={`${Math.round(etq(z.id).utilizacion * 100)} %`}
            estado={etq(z.id).estado}
            sel={zonaSel === z.id}
            onClick={() => onZona(z.id)}
          />
        ) : null,
      )}
      {dom && <Etiqueta pos={[BASE_DOMICILIARIA[0], 2.4, BASE_DOMICILIARIA[1] - 3.2]} texto="Domiciliaria" valor={`${Math.round(dom.utilizacion * 100)} %`} estado={dom.estado} sel={zonaSel === 'domiciliaria'} onClick={() => onZona('domiciliaria')} />}
      {vir && <Etiqueta pos={[VIRTUAL[0], 2.6, VIRTUAL[1]]} texto="Virtual" valor={`${Math.round(vir.utilizacion * 100)} %`} estado={vir.estado} sel={zonaSel === 'virtual'} onClick={() => onZona('virtual')} />}
      <Html position={[RED_HOSPITALARIA[0], 2.6, RED_HOSPITALARIA[1] - 2.2]} zIndexRange={[20, 0]}>
        <div className="etiqueta-externa">Red hospitalaria</div>
      </Html>
      <Html position={[23, 1.9, -11]} zIndexRange={[20, 0]}>
        <div className="etiqueta-externa">Hogares</div>
      </Html>
    </Canvas>
  );
}
