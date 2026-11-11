"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { LayoutV1 } from "@/lib/layout/types";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import type { Auditorium3DConfig } from "@/lib/seatview/types";
import { convertLayoutTo3D, calculateSightline, type SightlineMetrics } from "@/lib/seatview/math";

interface VirtualSeatCanvasProps {
  layout: LayoutV1;
  seats: SeatMapItem[];
  zones: SeatZoneInfo[];
  currentSeat: SeatMapItem;
  config: Auditorium3DConfig;
  onSightlineUpdate?: (metrics: SightlineMetrics) => void;
  className?: string;
}

export function VirtualSeatCanvas({
  layout,
  seats,
  zones,
  currentSeat,
  config,
  onSightlineUpdate,
  className = "",
}: VirtualSeatCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // References for mutable Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const seatsInstancedMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Euler angles for camera orientation (yaw and pitch)
  const orientationRef = useRef<{
    yaw: number;
    pitch: number;
    targetYaw: number;
    targetPitch: number;
  }>({
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  });

  // Target lookAt point
  const stageTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, config.stageHeight + 1.2, 0));

  // Current camera eye position
  const cameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, 8));

  // Drag interaction state
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startYaw: number;
    startPitch: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0,
  });

  // Reset camera orientation to face stage center
  const resetToStage = () => {
    const cam = cameraPosRef.current;
    const target = stageTargetRef.current;
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    const dz = target.z - cam.z;
    const horizontalDist = Math.hypot(dx, dz);

    const basePitch = Math.atan2(dy, horizontalDist);
    // In Three.js: -Z is forward. LookAt target from position:
    const baseYaw = Math.atan2(-dx, -dz);

    orientationRef.current.targetYaw = baseYaw;
    orientationRef.current.targetPitch = basePitch;
    orientationRef.current.yaw = baseYaw;
    orientationRef.current.pitch = basePitch;
  };

  // Expose reset via custom window event or external call if needed
  useEffect(() => {
    const handleResetEvent = () => resetToStage();
    window.addEventListener("gatein:seatview-reset", handleResetEvent);
    return () => window.removeEventListener("gatein:seatview-reset", handleResetEvent);
  }, []);

  // Main Three.js scene setup and lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Convert Layout to 3D Scene
    const scene3D = convertLayoutTo3D(layout, seats, zones, config);
    const selectedSeat3D =
      scene3D.seats3D.find((s) => s.label === currentSeat.label) || scene3D.seats3D[0];

    // Compute metrics
    if (selectedSeat3D && onSightlineUpdate) {
      const metrics = calculateSightline(selectedSeat3D, scene3D.targetPoint3D, config);
      onSightlineUpdate(metrics);
    }

    // 2. Initialize Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090814"); // Dark atmospheric theater ink
    scene.fog = new THREE.FogExp2("#090814", 0.015);
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(config.fov, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Position Camera at Selected Seat Eye Coordinate
    const eyeY = selectedSeat3D ? selectedSeat3D.y + config.eyeHeight : config.eyeHeight;
    const eyeX = selectedSeat3D ? selectedSeat3D.x : 0;
    const eyeZ = selectedSeat3D ? selectedSeat3D.z : 8;

    cameraPosRef.current.set(eyeX, eyeY, eyeZ);
    camera.position.set(eyeX, eyeY, eyeZ);

    stageTargetRef.current.set(
      scene3D.targetPoint3D.x,
      scene3D.targetPoint3D.y,
      scene3D.targetPoint3D.z
    );

    // Initial orientation facing stage
    resetToStage();

    // 4. Lighting Setup (Atmospheric concert / auditorium lighting)
    const ambientLight = new THREE.AmbientLight("#22203a", 1.8);
    scene.add(ambientLight);

    // Stage Spotlights
    const stageSpotCenter = new THREE.SpotLight("#ffffff", 3.5);
    stageSpotCenter.position.set(0, scene3D.stage.height + 7, scene3D.stage.depth / 2 + 3);
    stageSpotCenter.target.position.set(0, scene3D.stage.height, 0);
    stageSpotCenter.angle = Math.PI / 4;
    stageSpotCenter.penumbra = 0.6;
    stageSpotCenter.castShadow = true;
    scene.add(stageSpotCenter);
    scene.add(stageSpotCenter.target);

    // Stage Colorful Wash Lights (GateIn brand purple / cobalt blue)
    const blueStageWash = new THREE.PointLight("#2b2be8", 4, 25);
    blueStageWash.position.set(-scene3D.stage.width / 2.5, scene3D.stage.height + 4, 1);
    scene.add(blueStageWash);

    const warmStageWash = new THREE.PointLight("#ff7b00", 3, 25);
    warmStageWash.position.set(scene3D.stage.width / 2.5, scene3D.stage.height + 4, 1);
    scene.add(warmStageWash);

    // Audience subtle overhead fill
    const audienceFill = new THREE.DirectionalLight("#505080", 0.8);
    audienceFill.position.set(0, 15, 10);
    scene.add(audienceFill);

    // 5. Build Stage
    const stageWidth = scene3D.stage.width;
    const stageHeight = scene3D.stage.height;
    const stageDepth = scene3D.stage.depth;

    // Stage Deck Platform
    const stageGeometry = new THREE.BoxGeometry(stageWidth, stageHeight, stageDepth);
    const stageDeckMaterial = new THREE.MeshStandardMaterial({
      color: "#1c1b26", // Dark polished wood finish
      roughness: 0.4,
      metalness: 0.1,
    });
    const stageMesh = new THREE.Mesh(stageGeometry, stageDeckMaterial);
    stageMesh.position.set(0, stageHeight / 2, 0);
    stageMesh.receiveShadow = true;
    scene.add(stageMesh);

    // Stage Front Edge Glow (Yellowish Ticket Neon Rim)
    const rimGeometry = new THREE.BoxGeometry(stageWidth, 0.06, 0.08);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: "#d4ff3a" });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.position.set(0, stageHeight + 0.03, stageDepth / 2);
    scene.add(rimMesh);

    // Stage Backdrop Screen / Banner
    const screenWidth = stageWidth * 0.85;
    const screenHeight = Math.max(stageHeight * 2, 3.8);
    const backdropCanvas = document.createElement("canvas");
    backdropCanvas.width = 1024;
    backdropCanvas.height = 512;
    const ctx = backdropCanvas.getContext("2d");
    if (ctx) {
      // Create modern concert LED background
      const grad = ctx.createLinearGradient(0, 0, 1024, 512);
      grad.addColorStop(0, "#0e0926");
      grad.addColorStop(0.5, "#1f1854");
      grad.addColorStop(1, "#070513");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Grid visual lines
      ctx.strokeStyle = "rgba(43, 43, 232, 0.35)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 1024; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
      }
      for (let j = 0; j < 512; j += 64) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(1024, j);
        ctx.stroke();
      }

      // Stage Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(scene3D.stage.label || "PANGGUNG UTAMA", 512, 220);

      ctx.fillStyle = "#d4ff3a";
      ctx.font = "bold 26px monospace";
      ctx.fillText("LIVE EVENT STAGE • GATEIN PERSPECTIVE", 512, 290);
    }

    const backdropTexture = new THREE.CanvasTexture(backdropCanvas);
    const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: backdropTexture,
    });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenMesh.position.set(0, stageHeight + screenHeight / 2, -stageDepth / 2 + 0.1);
    scene.add(screenMesh);

    // 6. Build Floor (Main Auditorium Floor)
    const floorWidth = Math.max(scene3D.floorBounds.maxX - scene3D.floorBounds.minX + 8, 30);
    const floorDepth = Math.max(scene3D.floorBounds.maxZ - scene3D.floorBounds.minZ + 12, 35);
    const floorCenterZ = (scene3D.floorBounds.minZ + scene3D.floorBounds.maxZ) / 2;

    const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#0c0b16",
      roughness: 0.8,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, -0.01, floorCenterZ);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Aisles / Floor subtle guidelines
    const gridHelper = new THREE.GridHelper(Math.max(floorWidth, floorDepth), 20, 0x24223d, 0x171529);
    gridHelper.position.set(0, 0, floorCenterZ);
    scene.add(gridHelper);

    // 7. Build Obstacles (Sound Truss Towers)
    scene3D.obstacles.forEach((obs) => {
      const trussGeom = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
      const trussMat = new THREE.MeshStandardMaterial({
        color: "#282638",
        wireframe: true,
      });
      const trussMesh = new THREE.Mesh(trussGeom, trussMat);
      trussMesh.position.set(obs.x, obs.height / 2, obs.z);
      scene.add(trussMesh);

      // Line array speaker box on truss
      const speakerGeom = new THREE.BoxGeometry(obs.width * 0.9, obs.height * 0.45, obs.depth * 0.9);
      const speakerMat = new THREE.MeshStandardMaterial({
        color: "#12111a",
        roughness: 0.6,
      });
      const speakerMesh = new THREE.Mesh(speakerGeom, speakerMat);
      speakerMesh.position.set(obs.x, obs.height * 0.65, obs.z);
      scene.add(speakerMesh);
    });

    // 8. Build Seats using InstancedMesh (High Performance)
    // Create combined chair geometry: seat cushion + backrest
    const seatW = config.seatWidth;
    const seatD = 0.45;
    const seatH = 0.42;

    const cushionGeom = new THREE.BoxGeometry(seatW, 0.08, seatD);
    cushionGeom.translate(0, seatH, 0);

    const backrestGeom = new THREE.BoxGeometry(seatW, 0.42, 0.08);
    backrestGeom.translate(0, seatH + 0.23, -seatD / 2 + 0.04);

    // Merge geometries into one buffer geometry
    const seatGroup = new THREE.Group();
    const cushionMesh = new THREE.Mesh(cushionGeom);
    const backrestMesh = new THREE.Mesh(backrestGeom);
    seatGroup.add(cushionMesh);
    seatGroup.add(backrestMesh);

    // Simple single chair box as optimized proxy
    const proxySeatGeom = new THREE.BoxGeometry(seatW, seatH + 0.4, seatD);
    proxySeatGeom.translate(0, (seatH + 0.4) / 2, 0);

    const seatMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
    });

    const seatCount = scene3D.seats3D.length;
    const instancedSeats = new THREE.InstancedMesh(proxySeatGeom, seatMaterial, seatCount);
    instancedSeats.castShadow = true;
    instancedSeats.receiveShadow = true;
    seatsInstancedMeshRef.current = instancedSeats;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    scene3D.seats3D.forEach((seatPt, idx) => {
      // Don't render chair directly at camera position to avoid camera clipping
      if (seatPt.label === currentSeat.label) {
        dummy.position.set(0, -999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        dummy.position.set(seatPt.x, seatPt.y, seatPt.z);
        dummy.rotation.y = THREE.MathUtils.degToRad(seatPt.rotationDeg || 0);
        dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix();
      instancedSeats.setMatrixAt(idx, dummy.matrix);

      color.set(seatPt.zoneColor);
      instancedSeats.setColorAt(idx, color);
    });

    instancedSeats.instanceMatrix.needsUpdate = true;
    if (instancedSeats.instanceColor) instancedSeats.instanceColor.needsUpdate = true;
    scene.add(instancedSeats);

    // Selected Seat Marker on Floor (Glowing Ring)
    if (selectedSeat3D) {
      const ringGeom = new THREE.RingGeometry(0.25, 0.35, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#d4ff3a",
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(selectedSeat3D.x, selectedSeat3D.y + 0.02, selectedSeat3D.z);
      scene.add(ringMesh);
    }

    // 9. Resize Handling
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation & Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation for look-around
      const orient = orientationRef.current;
      orient.yaw += (orient.targetYaw - orient.yaw) * 0.15;
      orient.pitch += (orient.targetPitch - orient.pitch) * 0.15;

      // Update camera rotation based on yaw & pitch
      const euler = new THREE.Euler(orient.pitch, orient.yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount or deps change
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      // Dispose Three.js objects
      stageGeometry.dispose();
      stageDeckMaterial.dispose();
      rimGeometry.dispose();
      rimMaterial.dispose();
      screenGeometry.dispose();
      screenMaterial.dispose();
      backdropTexture.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      proxySeatGeom.dispose();
      seatMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [layout, seats, zones, currentSeat.label, config, onSightlineUpdate]);

  // Pointer drag event handlers for looking around
  const handlePointerDown = (clientX: number, clientY: number) => {
    dragRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      startYaw: orientationRef.current.targetYaw,
      startPitch: orientationRef.current.targetPitch,
    };
    setIsInteracting(true);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.isDragging) return;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    // Sensitivitas rotasi
    const sensitivity = 0.0035;

    // Drag ke kiri membuat pandangan menoleh ke kanan
    const newYaw = dragRef.current.startYaw - deltaX * sensitivity;
    // Drag ke atas membuat pandangan mendongak ke atas
    const newPitch = dragRef.current.startPitch - deltaY * sensitivity;

    // Clamp pitch agar kamera tidak jungkir balik (-70° sampai +70°)
    const maxPitch = THREE.MathUtils.degToRad(70);
    const minPitch = THREE.MathUtils.degToRad(-70);

    orientationRef.current.targetYaw = newYaw;
    orientationRef.current.targetPitch = Math.max(minPitch, Math.min(maxPitch, newPitch));
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
    setIsInteracting(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overflow-hidden touch-none ${className}`}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      style={{ cursor: isInteracting ? "grabbing" : "grab" }}
    >
      {/* Reticle / Sightline Center Crosshair (Subtle visual aid) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-6 w-6">
          <div className="absolute left-1/2 top-0 h-1.5 w-0.5 -translate-x-1/2 bg-white/40" />
          <div className="absolute bottom-0 left-1/2 h-1.5 w-0.5 -translate-x-1/2 bg-white/40" />
          <div className="absolute left-0 top-1/2 h-0.5 w-1.5 -translate-y-1/2 bg-white/40" />
          <div className="absolute right-0 top-1/2 h-0.5 w-1.5 -translate-y-1/2 bg-white/40" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gate-ticket/80" />
        </div>
      </div>
    </div>
  );
}
