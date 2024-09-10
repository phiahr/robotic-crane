// components/Crane.tsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// import { connectWebSocket, sendWebSocketMessage, closeWebSocket } from '../app/websocketService';
import WebSocketService from '../app/websocketService';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import config from '../../config/crane_config.json'; // Import the JSON config
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const craneConfig = config.dimensions;

function createNotificationElement(): HTMLElement {
  let notification = document.getElementById('notification');

  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.display = 'none';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#f44336';
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease-in-out';

    document.body.appendChild(notification);
  }

  return notification;
}

function showNotification(message: string = "Out of Reach"): void {
  const notification = createNotificationElement();

  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.opacity = '1';

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 500);
  }, 3000);

}

let outOfBounds = false


const Crane = () => {

  const mountRef = useRef<HTMLDivElement | null>(null);

  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {

    if (mountRef.current) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xcccccc);

      // Color meshes
      const red_mesh = new THREE.MeshStandardMaterial({
        color: 0xF54823,
        metalness: 0.8,
        roughness: 0.5
      });

      const grey_mesh = new THREE.MeshStandardMaterial({
        color: 0x756C6A,
        metalness: 1,
        roughness: 0.4
      });

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (mountRef.current) {
        mountRef.current.appendChild(renderer.domElement);
      }

      {
        const color = 0xFFFFFF;
        const intensity = 6;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
      }
      {
        const color = 0xFFFFFF;
        const intensity = 6;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(1, -2, -4);
        scene.add(light);
      }

      {
        const color = 0xFFFFFF;
        const intensity = 3;
        const light = new THREE.PointLight(color, intensity);
        light.position.set(0, 10, 0);
        light.castShadow = true;
        scene.add(light);
      }

      const swingGeometry = new THREE.CylinderGeometry(craneConfig.swing.width / 4, craneConfig.swing.depth / 2, craneConfig.swing.height);
      const swing = new THREE.Mesh(swingGeometry, red_mesh);
      swing.position.y = craneConfig.swing.height / 2;
      swing.castShadow = true;
      scene.add(swing);

      const liftGeometry = new THREE.BoxGeometry(craneConfig.lift.width, craneConfig.lift.height, craneConfig.lift.depth);
      const lift = new THREE.Mesh(liftGeometry, red_mesh);
      lift.position.y = craneConfig.lift.height / 2 + craneConfig.swing.height / 2;
      swing.add(lift);

      const elbowGeometry = new THREE.BoxGeometry(craneConfig.elbow.width, craneConfig.elbow.height, craneConfig.elbow.depth);
      const elbow = new THREE.Mesh(elbowGeometry, red_mesh);
      elbow.position.set(0, 0, -craneConfig.elbow.depth / 2);
      lift.add(elbow);

      // Create a pivot point for the elbow extension
      // const elbowPivot = new THREE.Object3D();
      // elbowPivot.position.y = -0.;
      // elbowPivot.position.z = -craneConfig.elbowExtension.depth / 2 + 1;
      // elbow.add(elbowPivot); // Add the pivot to the elbow

      const elbowExtensionGeometry = new THREE.BoxGeometry(craneConfig.elbowExtension.width, craneConfig.elbowExtension.height, craneConfig.elbowExtension.depth);
      const elbowExtension = new THREE.Mesh(elbowExtensionGeometry, red_mesh);
      elbowExtension.position.set(0, -craneConfig.elbow.width, -craneConfig.elbow.width - craneConfig.lift.width / 2);

      const loader = new FontLoader();
      loader.load("https://threejs.org/examples/fonts/helvetiker_regular.typeface.json", function (font) {
        console.log(font);

        const textGeometry = new TextGeometry("Monumental", {
          font: font,
          size: 2,
          depth: 0.5,
        });
        const textMaterial = new THREE.MeshStandardMaterial({ color: 0x1A054D });
        const elbowText = new THREE.Mesh(textGeometry, textMaterial);

        elbowText.position.set(1, -1, 6.5);
        elbowText.rotation.y = Math.PI / 2;
        const elbowText2 = new THREE.Mesh(textGeometry, textMaterial);
        elbowText2.position.set(-1, -1, -8);
        elbowText2.rotation.y = -Math.PI / 2;

        elbowExtension.add(elbowText);
        elbowExtension.add(elbowText2);
      });

      elbow.add(elbowExtension);

      const wristGeometry = new THREE.BoxGeometry(craneConfig.wrist.width, craneConfig.wrist.height, craneConfig.wrist.depth);
      const wrist = new THREE.Mesh(wristGeometry, red_mesh);
      wrist.position.set(0, -craneConfig.elbowExtension.height * 1.5, -craneConfig.elbowExtension.depth / 2);
      elbowExtension.add(wrist);

      const leftJawGeometry = new THREE.BoxGeometry(craneConfig.jaw.width, craneConfig.jaw.height, craneConfig.jaw.depth);
      const leftJaw = new THREE.Mesh(leftJawGeometry, red_mesh);
      leftJaw.position.set(craneConfig.jaw.leftJaw.positionX, craneConfig.jaw.leftJaw.positionY, craneConfig.jaw.leftJaw.positionZ);
      wrist.add(leftJaw);

      const rightJawGeometry = new THREE.BoxGeometry(craneConfig.jaw.width, craneConfig.jaw.height, craneConfig.jaw.depth);
      const rightJaw = new THREE.Mesh(rightJawGeometry, red_mesh);
      rightJaw.position.set(craneConfig.jaw.rightJaw.positionX, craneConfig.jaw.rightJaw.positionY, craneConfig.jaw.rightJaw.positionZ);
      wrist.add(rightJaw);

      const centerPointGeometry = new THREE.SphereGeometry(craneConfig.centerPoint.radius, 320, 320);
      const centerPointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const centerPoint = new THREE.Mesh(centerPointGeometry, centerPointMaterial);
      centerPoint.position.set(0, craneConfig.jaw.rightJaw.positionY, craneConfig.jaw.rightJaw.positionZ);
      wrist.add(centerPoint);

      // Connect components
      swing.add(lift);
      lift.add(elbow);
      // elbowPivot.add(elbowExtension);
      elbow.add(elbowExtension);
      elbowExtension.add(wrist);
      wrist.add(leftJaw);
      wrist.add(rightJaw);

      camera.position.x = 25;
      camera.position.y = 50;
      camera.position.z = 100;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.screenSpacePanning = false;
      controls.maxPolarAngle = Math.PI / 2;

      const gridHelper = new THREE.GridHelper(100, 100);
      scene.add(gridHelper);

      const axesHelper = new THREE.AxesHelper(30);
      scene.add(axesHelper);


      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);

        renderer.render(scene, camera);
      };

      animate();

      // // Handle window resize
      const handleResize = () => {
        if (renderer && camera) {
          camera.aspect = window.innerWidth / 2 / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth / 2, window.innerHeight);
        }
      };


      const handleWebSocketMessage = (data: any) => {
        if (typeof data === 'string') {
          data = JSON.parse(data);

          // Inverse kinematic calculation shows that the given point is out of bounds
          if (data.swing_rotation == 404) {
            if (!outOfBounds) {
              outOfBounds = true;
              showNotification()
            }
            return;
          }
          else {
            outOfBounds = false;
            swing.rotation.y = (data.swing_rotation + 270) * Math.PI / 180;
            elbow.position.y = data.lift_elevation - craneConfig.lift.height / 2;
            // elbowPivot.rotation.y = data.elbow_rotation * Math.PI / 180;
            elbowExtension.rotation.y = data.elbow_rotation * Math.PI / 180;
            wrist.rotation.y = data.wrist_rotation * Math.PI / 180;
            leftJaw.position.x = -0.625 - data.gripper_state / 10 * 0.2;
            rightJaw.position.x = 0.625 + data.gripper_state / 10 * 0.2;

            swing.position.x = data.origin[0];
            swing.position.z = data.origin[1];
          }
        }
      };

      const wsService = new WebSocketService();
      wsService.connectWebSocket('ws://localhost:8000/ws', handleWebSocketMessage);

      window.addEventListener('resize', handleResize);

      return () => {
        console.log('Unmounting Crane');
        mountRef.current?.removeChild(renderer.domElement);
      };
    }

  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default Crane;
