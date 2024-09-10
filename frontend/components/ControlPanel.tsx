import React, { useState, useEffect, useRef } from 'react';
// import {connectWebSocket, sendWebSocketMessage } from '../app/websocketService';
import WebSocketService from '../app/websocketService';
import CraneState from './CraneState';
import EndEffectorState from './EndEffectorState';
import config from '../../config/crane_config.json'; // Import the JSON config
import * as dat from 'dat.gui';

const craneConfig = config.dimensions;


const ControlPanel = () => {

  const defaultCraneState = {
    origin: [0, 0],
    swing_rotation: 0,
    lift_elevation: craneConfig.lift.height / 2,
    elbow_rotation: 0,
    wrist_rotation: 0,
    gripper_state: 0,
  } as CraneState;

  const [craneState, setCraneState] = useState<CraneState>(defaultCraneState);

  const [endEffectorState, setEndEffectorState] = useState<EndEffectorState>({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });

  const wsServiceRef = useRef<WebSocketService | null>(null); // Use useRef to hold wsService
  const guiRef = useRef<dat.GUI | null>(null);  // Ref to store the GUI instance

  const moveCrane = () => {
    console.log('Move crane');
    wsServiceRef.current?.sendWebSocketMessage(craneState);
  }

  const moveOrigin = () => {
    wsServiceRef.current?.sendWebSocketMessage({ origin: craneState.origin });
  }

  const inverseKinematics = () => {
    console.log('Calculate inverse kinematics');
    wsServiceRef.current?.sendWebSocketMessage(endEffectorState);
  }

  const resetCrane = () => {
    setCraneState(defaultCraneState);
    wsServiceRef.current?.sendWebSocketMessage(defaultCraneState);
    updateGuiValues(defaultCraneState, "Crane Controls");
  };

  const resetEndEffector = () => {
    const defaultEndEffectorState = {
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    };
    setEndEffectorState(defaultEndEffectorState);
    resetCrane();
    updateGuiValues(defaultEndEffectorState, "End Effector Controls");
  };

  const selectController = (controller: string) => {
    console.log(`Selected controller: ${controller}`);
    wsServiceRef.current?.sendWebSocketMessage({ controller });
  };

  useEffect(() => {

    if (!wsServiceRef.current) {
      wsServiceRef.current = new WebSocketService();
      wsServiceRef.current?.connectWebSocket('ws://localhost:8000/ws', () => {});
    }


    if (!guiRef.current) {
      const gui = new dat.GUI();
      guiRef.current = gui;

      const controllerFolder = gui.addFolder('Controller Type');
      const craneController = controllerFolder.add({ controller: 'MPC' }, 'controller', ['MPC', 'PD']).name('Select Controller');
      craneController.onChange((value: string) => {
        selectController(value);
      });
      controllerFolder.open();

      // Crane controls
      const craneFolder = gui.addFolder('Crane Controls');
      craneFolder.add(craneState, 'swing_rotation', -180, 180).name('Swing Rotation').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, swing_rotation: value }));
      });
      craneFolder.add(craneState, 'lift_elevation', craneConfig.swing.height / 2, craneConfig.lift.height).name('Lift Elevation').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, lift_elevation: value }));
      });
      craneFolder.add(craneState, 'elbow_rotation', -90, 90).name('Elbow Rotation').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, elbow_rotation: value }));
      });
      craneFolder.add(craneState, 'wrist_rotation', -90, 90).name('Wrist Rotation').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, wrist_rotation: value }));
      });
      craneFolder.add(craneState, 'gripper_state', 0, 100).name('Gripper State').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, gripper_state: value }));
      });
      const craneButton = craneFolder.add({ move: () => moveCrane() }, 'move').name('Move');
      const resetButton = craneFolder.add({ reset: resetCrane }, 'reset').name('Reset');


      craneFolder.open();

      // End effector controls
      const endEffectorFolder = gui.addFolder('End Effector Controls');
      endEffectorFolder.add(endEffectorState, 'x', -50, 50).name('X').onChange((value: number) => {
        setEndEffectorState(prev => ({ ...prev, x: value }));
      });
      endEffectorFolder.add(endEffectorState, 'y', -50, 50).name('Y').onChange((value: number) => {
        setEndEffectorState(prev => ({ ...prev, y: value }));
      });
      endEffectorFolder.add(endEffectorState, 'z', -50, 50).name('Z').onChange((value: number) => {
        setEndEffectorState(prev => ({ ...prev, z: value }));
      });
      endEffectorFolder.add(endEffectorState, 'yaw', -180, 180).name('Yaw').onChange((value: number) => {
        setEndEffectorState(prev => ({ ...prev, yaw: value }));
      });

      const moveControl = endEffectorFolder.add({ ik: () => inverseKinematics() }, 'ik').name('Inverse Kinematics');
      const resetControl = endEffectorFolder.add({ reset: resetEndEffector }, 'reset').name('Reset');

      endEffectorFolder.open();

      const moveOriginFolder = gui.addFolder('Origin Controls');
      moveOriginFolder.add(craneState.origin, '0', -20, 20).name('Move on x-axis').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, origin: [value, prev.origin[1]] }));
      });
      moveOriginFolder.add(craneState.origin, '1', -20, 20).name('Move on y-axis').onChange((value: number) => {
        setCraneState(prev => ({ ...prev, origin: [prev.origin[0], value] }));
      });
      const moveOriginButton = moveOriginFolder.add({ move: () => moveOrigin() }, 'move').name('Move Origin');
      moveOriginFolder.open();


      gui.open();


    }


    return () => {
    };
  }, [craneState, endEffectorState]);

  const updateGuiValues = (newValues: any, folderName: string) => {

    if (guiRef.current) {
      guiRef.current?.__folders[folderName].__controllers.forEach((controller: any) => {
        const property = controller.property;
        if (property in newValues) {
          controller.setValue(newValues[property]);
        }
      });
    }
  };
};

export default ControlPanel;
