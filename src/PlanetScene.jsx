import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default function PlanetScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log("Init Main three.js scene");

    // 1. Scene setup
    const scene = new THREE.Scene();
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      60,
      sizes.width / sizes.height,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(sizes.width, sizes.height);

    // 2. Bloom effect (Composer)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // Fuerza del brillo
      0.4,  // Radio
      0.6   // Threshold
    );
    
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    // 3. Variables de animación y estado
    const rotationSceneSpeed = 0.2;
    const clock = new THREE.Clock();
    let mixer = null;
    let lightPosition = null;

    // 4. Procesamiento del modelo al cargar
    function onSceneLoaded(model) {
      scene.add(model);
      model.traverse((child) => {
        if (child.name.toLowerCase().includes("light")) {
          lightPosition = child.position.clone();
        }
        if (child.isMesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (material.name.startsWith("sun")) {
              let texture = material["map"];
              const emissiveMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                emissive: 0xffffff,
                emissiveIntensity: 2,
                emissiveMap: texture,
                roughness: 0.4,
                metalness: 0.7,
              });
              child.material = emissiveMaterial;
            }
          }
        }
      });
    }

    // 5. Creación de luces basadas en la posición del modelo
    function createLights() {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      if (lightPosition) {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.copy(lightPosition);
        scene.add(directionalLight);
        scene.add(directionalLight.target);
      }
    }

    // 6. Redimensionado de pantalla y cámara responsiva
    function resize() {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.position.set(3, 1, 5);
      
      if (sizes.width < 1225 && sizes.width >= 1000) {
        camera.position.set(2, 1, 6);
      } else if (sizes.width < 1000) {
        camera.position.set(1.5, 1, 7);
      }
      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(sizes.width, sizes.height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    window.addEventListener("resize", resize);

    // 7. Carga del modelo GLB
    const loader = new GLTFLoader();
    const relativePath = './EscenaMain-Rig.glb'; // Cambia esto si tu ruta es otra


    loader.load(
      relativePath,
      
      (gltf) => {
        mixer = new THREE.AnimationMixer(gltf.scene);

        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.play();
        });

        onSceneLoaded(gltf.scene);
        createLights();
        resize();
      }
    );

    // 8. Bucle principal de animación
    function animate() {
      const deltaTime = clock.getDelta();
      
      if (mixer) {
        mixer.update(deltaTime);
      }
      if (scene) {
        scene.rotation.y -= rotationSceneSpeed * deltaTime;
      }

      composer.render(deltaTime);
    }

    renderer.setAnimationLoop(animate);

    // 9. Limpieza de recursos al desmontar el componente de React
    return () => {
      window.removeEventListener("resize", resize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      composer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="webgl"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        outline: 'none',
        zIndex: -1,
        pointerEvents: 'none', // Permite interactuar con el contenido web que esté encima
      }}
    />
  );
}