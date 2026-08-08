import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicsState, SimulationParams } from '../types';
import { SURFACES } from '../utils/physics';
import { soundEngine } from '../utils/audio';

interface Props {
  params: SimulationParams;
  physics: PhysicsState;
  onUpdateBlowtorchPos?: (pos: [number, number, number]) => void;
}

export const IceSimulation3D: React.FC<Props> = ({ params, physics, onUpdateBlowtorchPos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Mesh references
  const iceMeshRef = useRef<THREE.Mesh | null>(null);
  const bubbleParticlesRef = useRef<THREE.Points | null>(null);
  const puddleMeshRef = useRef<THREE.Mesh | null>(null);
  const plateMeshRef = useRef<THREE.Mesh | null>(null);
  const heatLampGroupRef = useRef<THREE.Group | null>(null);
  const blowtorchGroupRef = useRef<THREE.Group | null>(null);
  const saltGroupRef = useRef<THREE.Group | null>(null);
  const dropletsGroupRef = useRef<THREE.Group | null>(null);

  // Thermal Shader materials
  const originalIceMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const thermalIceMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const [hoveredPointInfo, setHoveredPointInfo] = useState<{ x: number; y: number; text: string } | null>(null);

  // Drip particle animation state
  const activeDropletsRef = useRef<Array<{ mesh: THREE.Mesh; startY: number; targetY: number; speed: number }>>([]);
  const lastDripSpawnRef = useRef<number>(0);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(params.thermalView ? '#050510' : '#0f172a');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 3.5, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    mainLight.position.set(5, 8, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.6);
    scene.add(hemiLight);

    // 1. Create Base Substrate Plate
    const plateGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.15, 64);
    const surfaceProps = SURFACES[params.surfaceMaterial];
    const plateMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surfaceProps.color),
      roughness: surfaceProps.roughness,
      metalness: surfaceProps.metalness,
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.y = -0.075;
    plateMesh.receiveShadow = true;
    scene.add(plateMesh);
    plateMeshRef.current = plateMesh;

    // Plate rim border
    const rimGeo = new THREE.TorusGeometry(2.52, 0.03, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.5 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -0.01;
    scene.add(rimMesh);

    // 2. Create Water Puddle Mesh
    const puddleGeo = new THREE.CircleGeometry(0.1, 64);
    const puddleMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.9,
      opacity: 0.8,
      transparent: true,
      roughness: 0.05,
      ior: 1.333,
      reflectivity: 0.9,
      depthWrite: false,
    });
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.rotation.x = -Math.PI / 2;
    puddleMesh.position.y = 0.002;
    puddleMesh.receiveShadow = true;
    scene.add(puddleMesh);
    puddleMeshRef.current = puddleMesh;

    // 3. Create Droplets & Salt Group
    const dropletsGroup = new THREE.Group();
    scene.add(dropletsGroup);
    dropletsGroupRef.current = dropletsGroup;

    const saltGroup = new THREE.Group();
    scene.add(saltGroup);
    saltGroupRef.current = saltGroup;

    // 4. Create Heat Lamp Group
    const lampGroup = new THREE.Group();
    lampGroup.position.set(1.6, 2.2, 1.2);

    const lampShadeGeo = new THREE.ConeGeometry(0.4, 0.5, 32, 1, true);
    const lampShadeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.rotation.x = Math.PI;

    const bulbGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = -0.15;

    const lampSpotlight = new THREE.SpotLight(0xff7700, 5);
    lampSpotlight.position.set(0, -0.15, 0);
    lampSpotlight.angle = Math.PI / 5;
    lampSpotlight.penumbra = 0.5;
    lampSpotlight.castShadow = true;
    lampSpotlight.target.position.set(0, 0, 0);

    // Visual light cone beam
    const coneGeo = new THREE.CylinderGeometry(0.05, 0.8, 2.2, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const coneBeam = new THREE.Mesh(coneGeo, coneMat);
    coneBeam.position.y = -1.1;

    lampGroup.add(lampShade);
    lampGroup.add(bulb);
    lampGroup.add(lampSpotlight);
    lampGroup.add(lampSpotlight.target);
    lampGroup.add(coneBeam);
    scene.add(lampGroup);
    heatLampGroupRef.current = lampGroup;

    // 5. Create Blowtorch Tool Group
    const torchGroup = new THREE.Group();
    torchGroup.position.set(-1.5, 1.2, 1.0);

    const torchBodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 16);
    const torchBodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.5, roughness: 0.4 });
    const torchBody = new THREE.Mesh(torchBodyGeo, torchBodyMat);
    torchBody.rotation.z = -Math.PI / 4;

    const nozzleGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.25, 16);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0.2, 0.2, 0);
    nozzle.rotation.z = -Math.PI / 4;

    // Flame jet cone
    const flameGeo = new THREE.ConeGeometry(0.08, 0.6, 16);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(0.42, 0.42, 0);
    flameMesh.rotation.z = -Math.PI / 4 + Math.PI;

    torchGroup.add(torchBody);
    torchGroup.add(nozzle);
    torchGroup.add(flameMesh);
    scene.add(torchGroup);
    blowtorchGroupRef.current = torchGroup;

    // Resize listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (controlsRef.current) controlsRef.current.update();

      // Animate heat lamp light flicker & cone opacity
      if (heatLampGroupRef.current) {
        heatLampGroupRef.current.visible = params.heatLampActive;
        if (params.heatLampActive) {
          const intensity = (params.heatLampPower / 100) * (3.5 + Math.sin(elapsedTime * 8) * 0.2);
          lampSpotlight.intensity = intensity;
        }
      }

      // Animate blowtorch position & flame pulse
      if (blowtorchGroupRef.current) {
        blowtorchGroupRef.current.visible = params.blowtorchActive;
        if (params.blowtorchActive) {
          flameMesh.scale.set(1 + Math.sin(elapsedTime * 25) * 0.1, 1 + Math.cos(elapsedTime * 20) * 0.15, 1);
        }
      }

      // Animate active water droplets dripping
      const nowMs = performance.now();
      if (physics.dripRate > 0 && !params.isPaused && physics.currentIceMass > 0) {
        const dripIntervalMs = 1000 / physics.dripRate;
        if (nowMs - lastDripSpawnRef.current > dripIntervalMs) {
          lastDripSpawnRef.current = nowMs;
          spawnDripParticle();
        }
      }

      // Update falling droplets
      for (let i = activeDropletsRef.current.length - 1; i >= 0; i--) {
        const item = activeDropletsRef.current[i];
        item.mesh.position.y -= item.speed;
        if (item.mesh.position.y <= item.targetY) {
          // Reached puddle! Sound + ripple effect
          soundEngine.playDripSound(0.8);
          dropletsGroup.remove(item.mesh);
          item.mesh.geometry.dispose();
          (item.mesh.material as THREE.Material).dispose();
          activeDropletsRef.current.splice(i, 1);

          // Puddle pulse effect
          if (puddleMeshRef.current) {
            puddleMeshRef.current.scale.set(1.03, 1.03, 1.03);
            setTimeout(() => puddleMeshRef.current?.scale.set(1.0, 1.0, 1.0), 100);
          }
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Helper to spawn a dripping water droplet particle
  const spawnDripParticle = () => {
    if (!dropletsGroupRef.current || !iceMeshRef.current) return;
    const dropGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      transmission: 0.95,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const dropMesh = new THREE.Mesh(dropGeo, dropMat);

    // Random bottom position on ice
    const iceY = iceMeshRef.current.position.y;
    const offsetX = (Math.random() - 0.5) * 0.4;
    const offsetZ = (Math.random() - 0.5) * 0.4;

    dropMesh.position.set(offsetX, Math.max(0.08, iceY - 0.2), offsetZ);
    dropletsGroupRef.current.add(dropMesh);

    activeDropletsRef.current.push({
      mesh: dropMesh,
      startY: dropMesh.position.y,
      targetY: 0.01,
      speed: 0.03 + Math.random() * 0.01,
    });
  };

  // Re-build Ice Geometry when iceShape or initialIceMass changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (iceMeshRef.current) {
      scene.remove(iceMeshRef.current);
      iceMeshRef.current.geometry.dispose();
      iceMeshRef.current = null;
    }
    if (bubbleParticlesRef.current) {
      scene.remove(bubbleParticlesRef.current);
      bubbleParticlesRef.current.geometry.dispose();
      bubbleParticlesRef.current = null;
    }

    let geo: THREE.BufferGeometry;
    const scaleFactor = Math.pow(params.initialIceMass / 300, 1 / 3);

    switch (params.iceShape) {
      case 'sphere':
        geo = new THREE.SphereGeometry(0.8 * scaleFactor, 48, 48);
        break;
      case 'crystal':
        geo = new THREE.DodecahedronGeometry(0.85 * scaleFactor, 0);
        break;
      case 'iceberg': {
        geo = new THREE.ConeGeometry(0.9 * scaleFactor, 1.4 * scaleFactor, 8);
        // Add vertex noise displacement for realistic iceberg texture
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const z = posAttr.getZ(i);
          posAttr.setXYZ(i, x + (Math.sin(i * 3) * 0.08), y, z + (Math.cos(i * 4) * 0.08));
        }
        geo.computeVertexNormals();
        break;
      }
      case 'sculpture':
        geo = new THREE.TorusKnotGeometry(0.4 * scaleFactor, 0.16 * scaleFactor, 64, 16);
        break;
      case 'cube':
      default:
        geo = new THREE.BoxGeometry(1.2 * scaleFactor, 1.2 * scaleFactor, 1.2 * scaleFactor, 16, 16, 16);
        break;
    }

    // Material setup: Realistic Ice Physical Material
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.02,
      transmission: 0.92,
      ior: 1.31, // Refractive Index of Ice!
      thickness: 1.5,
      dispersion: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.95,
      specularIntensity: 0.9,
    });
    originalIceMatRef.current = iceMat;

    // Thermal camera material (FLIR heatmap mode)
    const thermalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.1,
    });
    thermalIceMatRef.current = thermalMat;

    const mesh = new THREE.Mesh(geo, params.thermalView ? thermalMat : iceMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = (0.6 * scaleFactor); // Rest on top of plate
    scene.add(mesh);
    iceMeshRef.current = mesh;

    // Inner air bubble / crystalline inclusions particles inside ice block
    const bubbleCount = 80;
    const bubbleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(bubbleCount * 3);
    for (let i = 0; i < bubbleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.9 * scaleFactor;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.9 * scaleFactor;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9 * scaleFactor;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const bubbleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.6 });
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
    bubbles.position.y = mesh.position.y;
    scene.add(bubbles);
    bubbleParticlesRef.current = bubbles;

  }, [params.iceShape, params.initialIceMass]);

  // Update Surface Substrate Plate material when user changes material
  useEffect(() => {
    if (!plateMeshRef.current) return;
    const props = SURFACES[params.surfaceMaterial];
    const mat = plateMeshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.set(props.color);
    mat.roughness = props.roughness;
    mat.metalness = props.metalness;
    mat.needsUpdate = true;
  }, [params.surfaceMaterial]);

  // Handle Thermal / FLIR mode toggle
  useEffect(() => {
    if (!sceneRef.current || !iceMeshRef.current) return;
    sceneRef.current.background = new THREE.Color(params.thermalView ? '#02020a' : '#0f172a');

    if (originalIceMatRef.current && thermalIceMatRef.current) {
      iceMeshRef.current.material = params.thermalView ? thermalIceMatRef.current : originalIceMatRef.current;
    }
  }, [params.thermalView]);

  // Render Salt Sprinkle particles on top of ice
  useEffect(() => {
    if (!saltGroupRef.current) return;
    const saltGroup = saltGroupRef.current;
    // Clear old salt
    while (saltGroup.children.length > 0) {
      const child = saltGroup.children[0] as THREE.Mesh;
      saltGroup.remove(child);
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }

    if (params.saltAmount > 0 && iceMeshRef.current) {
      const saltCount = Math.min(150, Math.floor(params.saltAmount * 6));
      const saltGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
      const saltMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });

      const iceY = iceMeshRef.current.position.y;
      for (let i = 0; i < saltCount; i++) {
        const saltMesh = new THREE.Mesh(saltGeo, saltMat);
        const r = Math.random() * 0.45;
        const theta = Math.random() * Math.PI * 2;
        saltMesh.position.set(r * Math.cos(theta), iceY + 0.35 + (Math.random() * 0.05), r * Math.sin(theta));
        saltMesh.rotation.set(Math.random(), Math.random(), Math.random());
        saltGroup.add(saltMesh);
      }
    }
  }, [params.saltAmount, params.iceShape]);

  // Update real-time Ice scale & Water Puddle size from Physics Engine state
  useEffect(() => {
    if (physics.currentIceMass <= 0) {
      if (iceMeshRef.current) iceMeshRef.current.visible = false;
      if (bubbleParticlesRef.current) bubbleParticlesRef.current.visible = false;
      if (saltGroupRef.current) saltGroupRef.current.visible = false;
    } else {
      if (iceMeshRef.current) {
        iceMeshRef.current.visible = true;
        const massRatio = Math.max(0.01, physics.currentIceMass / params.initialIceMass);

        // Height reduces faster as bottom melts against warm plate
        const scaleXZ = Math.pow(massRatio, 0.4);
        const scaleY = Math.pow(massRatio, 0.6);

        iceMeshRef.current.scale.set(scaleXZ, scaleY, scaleXZ);

        // Lower ice center of gravity as Y shrinks
        const initialScaleFactor = Math.pow(params.initialIceMass / 300, 1 / 3);
        const baseHeight = 0.6 * initialScaleFactor;
        iceMeshRef.current.position.y = Math.max(0.05, baseHeight * scaleY);

        if (bubbleParticlesRef.current) {
          bubbleParticlesRef.current.visible = true;
          bubbleParticlesRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
          bubbleParticlesRef.current.position.y = iceMeshRef.current.position.y;
        }

        // Adjust Thermal camera color gradient dynamically based on iceTemp
        if (params.thermalView && thermalIceMatRef.current) {
          // Cold (-20°C) = Deep Blue (#0284c7), Melting (0°C) = Cyan/Yellow (#06b6d4), Heated = Orange (#f97316)
          const tempNormalized = Math.min(1.0, Math.max(0, (physics.iceTemp + 20) / 40));
          const col = new THREE.Color().setHSL(0.6 - tempNormalized * 0.5, 0.9, 0.5);
          thermalIceMatRef.current.color = col;
        }
      }
    }

    // Grow Water Puddle diameter based on waterVolume
    if (puddleMeshRef.current) {
      if (physics.waterVolume > 0) {
        puddleMeshRef.current.visible = true;
        // Puddle radius R = sqrt(Volume / thickness)
        const radius = Math.min(2.4, 0.15 + Math.sqrt(physics.waterVolume / 100) * 0.8);
        puddleMeshRef.current.scale.set(radius, radius, 1);
      } else {
        puddleMeshRef.current.visible = false;
      }
    }
  }, [physics.currentIceMass, physics.waterVolume, physics.iceTemp, params.initialIceMass, params.thermalView]);

  // Handle Mouse Hover Probe for Temperature Tooltip
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      let text = '';
      if (hitObj === iceMeshRef.current) {
        text = `Khối Băng: ${physics.iceTemp.toFixed(1)}°C (${physics.phase === 'melting_phase' ? 'Đang chuyển pha 0°C' : 'Thể Rắn'})`;
      } else if (hitObj === puddleMeshRef.current) {
        text = `Vũng Nước Tan: ${physics.waterTemp.toFixed(1)}°C (Thể Lỏng)`;
      } else if (hitObj === plateMeshRef.current) {
        text = `Bề Mặt (${SURFACES[params.surfaceMaterial].nameVi}): ${params.ambientTemp}°C`;
      } else {
        setHoveredPointInfo(null);
        return;
      }

      setHoveredPointInfo({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text,
      });

      // If blowtorch active and user clicks/drags, update torch hit position
      if (params.blowtorchActive && e.buttons === 1 && onUpdateBlowtorchPos) {
        const point = intersects[0].point;
        onUpdateBlowtorchPos([point.x, point.y, point.z]);
      }
    } else {
      setHoveredPointInfo(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-xl"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoveredPointInfo(null)}
    >
      {/* Probe Temperature Tooltip */}
      {hoveredPointInfo && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 text-cyan-300 text-xs font-mono font-medium border border-cyan-500/40 shadow-xl backdrop-blur-md transition-all duration-75"
          style={{
            left: `${hoveredPointInfo.x + 12}px`,
            top: `${hoveredPointInfo.y + 12}px`,
          }}
        >
          🔍 {hoveredPointInfo.text}
        </div>
      )}

      {/* 3D Overlay Help Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 text-slate-300 text-xs font-sans border border-slate-700/50 backdrop-blur-md">
        <span>🖱️ Xoay 3D / Cuộn để Zoom</span>
        {params.thermalView && <span className="text-amber-400 font-semibold font-mono">[Chế Độ Hồng Ngoại FLIR]</span>}
      </div>
    </div>
  );
};
