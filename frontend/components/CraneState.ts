interface CraneState {
    origin: [number, number, number, number];
    swing_rotation: number;
    lift_elevation: number;
    elbow_rotation: number;
    wrist_rotation: number;
    gripper_state: number;
  }

  
export default CraneState;