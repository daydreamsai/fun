import { useEffect, useRef } from "react";
import * as THREE from "three";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface AsciiBackgroundEffectProps {
  className?: string;
}

export const AsciiBackgroundEffect = ({
  className = "",
}: AsciiBackgroundEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let renderer: THREE.WebGLRenderer,
      asciiEffect: AsciiEffect,
      camera: THREE.PerspectiveCamera,
      scene: THREE.Scene,
      controls: OrbitControls;

    let sphere: THREE.Mesh;
    let particleSystem: THREE.Points;
    let leftEye: THREE.Mesh;
    let rightEye: THREE.Mesh;
    let leftLid: THREE.Mesh;
    let rightLid: THREE.Mesh;
    let dataLines: THREE.LineSegments;

    const start = Date.now();
    const PARTICLE_COUNT = 1500;
    let velocities: Float32Array;

    const PRIMARY_COLOR = 0x00ffcc; // Neon cyan
    const SECONDARY_COLOR = 0xff007a; // Neon pink

    const init = () => {
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        1,
        1500
      );
      camera.position.set(0, 0, 600);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a1a);

      const ambientLight = new THREE.AmbientLight(0x1a1a33, 0.5);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(PRIMARY_COLOR, 2, 1000);
      pointLight.position.set(300, 300, 300);
      scene.add(pointLight);

      const pointLight2 = new THREE.PointLight(SECONDARY_COLOR, 1.5, 1000);
      pointLight2.position.set(-300, -300, 300);
      scene.add(pointLight2);

      // Central sphere (face-like structure)
      const sphereGeometry = new THREE.SphereGeometry(150, 16, 12);
      sphere = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({
          color: PRIMARY_COLOR,
          wireframe: true,
          transparent: true,
          opacity: 0.7,
        })
      );
      scene.add(sphere);

      // Eye structures
      const eyeGeometry = new THREE.SphereGeometry(
        40,
        16,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      );
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: SECONDARY_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
      });

      leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-80, 50, 120);
      leftEye.rotation.x = Math.PI / 2;
      scene.add(leftEye);

      rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(80, 50, 120);
      rightEye.rotation.x = Math.PI / 2;
      scene.add(rightEye);

      // Eyelids
      const lidGeometry = new THREE.PlaneGeometry(60, 20);
      const lidMaterial = new THREE.MeshBasicMaterial({
        color: PRIMARY_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      });

      leftLid = new THREE.Mesh(lidGeometry, lidMaterial);
      leftLid.position.set(-80, 60, 130);
      scene.add(leftLid);

      rightLid = new THREE.Mesh(lidGeometry, lidMaterial);
      rightLid.position.set(80, 60, 130);
      scene.add(rightLid);

      // Particle system
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      velocities = new Float32Array(PARTICLE_COUNT * 3);

      const color = new THREE.Color();

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = 350 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        velocities[i * 3] = (Math.random() - 0.5) * 0.2;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

        color.set(Math.random() > 0.5 ? PRIMARY_COLOR : SECONDARY_COLOR);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const particlesGeometry = new THREE.BufferGeometry();
      particlesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      particlesGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );

      const particlesMaterial = new THREE.PointsMaterial({
        size: 4,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particleSystem);

      // Data lines
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(200 * 3);
      for (let i = 0; i < 200; i += 2) {
        linePositions[i * 3] = Math.random() * 800 - 400;
        linePositions[i * 3 + 1] = Math.random() * 800 - 400;
        linePositions[i * 3 + 2] = Math.random() * 800 - 400;
        linePositions[(i + 1) * 3] =
          linePositions[i * 3] + Math.random() * 100 - 50;
        linePositions[(i + 1) * 3 + 1] =
          linePositions[i * 3 + 1] + Math.random() * 100 - 50;
        linePositions[(i + 1) * 3 + 2] =
          linePositions[i * 3 + 2] + Math.random() * 100 - 50;
      }
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );
      dataLines = new THREE.LineSegments(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: PRIMARY_COLOR,
          transparent: true,
          opacity: 0.5,
        })
      );
      scene.add(dataLines);

      renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(window.innerWidth, window.innerHeight);

      asciiEffect = new AsciiEffect(renderer, " ░▒▓█", {
        invert: true,
        resolution: 0.15,
        color: false,
      });
      asciiEffect.setSize(window.innerWidth, window.innerHeight);
      asciiEffect.domElement.style.color = "#00FFCC";
      asciiEffect.domElement.style.backgroundColor = "transparent";
      asciiEffect.domElement.style.position = "absolute";
      asciiEffect.domElement.style.top = "0";
      asciiEffect.domElement.style.left = "0";
      asciiEffect.domElement.style.pointerEvents = "none";
      asciiEffect.domElement.style.opacity = "0.6";
      asciiEffect.domElement.style.zIndex = "-1";
      asciiEffect.domElement.style.width = "100%";
      asciiEffect.domElement.style.height = "100%";

      containerRef.current?.appendChild(asciiEffect.domElement);

      controls = new OrbitControls(camera, asciiEffect.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.1;
      controls.enableZoom = false;
      controls.enablePan = false;
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      asciiEffect.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);
      const timer = Date.now() - start;

      sphere.rotation.y = timer * 0.0002;
      sphere.scale.setScalar(1 + Math.sin(timer * 0.001) * 0.05);

      // Blinking animation
      const blinkPhase = Math.sin(timer * 0.0005);
      const lidPosition = Math.max(0, blinkPhase) * 40 - 20; // -20 to 20 range
      leftLid.position.y = 60 + lidPosition;
      rightLid.position.y = 60 + lidPosition;

      // Eye subtle movement
      leftEye.rotation.z = Math.sin(timer * 0.0003) * 0.1;
      rightEye.rotation.z = Math.sin(timer * 0.0003) * 0.1;

      // Particle animation
      const positions = particleSystem.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        const dist = Math.sqrt(
          positions[i * 3] ** 2 +
            positions[i * 3 + 1] ** 2 +
            positions[i * 3 + 2] ** 2
        );
        if (dist > 500) {
          positions[i * 3] *= -0.9;
          positions[i * 3 + 1] *= -0.9;
          positions[i * 3 + 2] *= -0.9;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      dataLines.rotation.y = timer * 0.00005;

      controls.update();
      asciiEffect.render(scene, camera);
    };

    init();
    animate(0);

    return () => {
      if (containerRef.current && asciiEffect.domElement) {
        containerRef.current.removeChild(asciiEffect.domElement);
      }
      window.removeEventListener("resize", onWindowResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
};
