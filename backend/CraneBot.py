import numpy as np
import time
import json
import cvxpy as cp
from PDController import PDController
from MPCController import MPCController


class CraneState:
    def __init__(self):
        self.origin = [0, 0]
        self.swing_rotation = 0.0
        self.lift_elevation = 0.0
        self.elbow_rotation = 0.0
        self.wrist_rotation = 0.0
        self.gripper_state = 0.0

        self.endeffector_position = {"x": 0, "y": 0, "z": 0, "yaw": 0}

        self.velocities = self.to_dict().copy()
        self.target_values = self.to_dict().copy()
        self.prev_error = self.to_dict().copy()
        self.prev_control = self.to_dict().copy()

        with open("../config/crane_config.json", "r") as f:
            self.crane_config = json.load(f)
            self.max_velocities = self.crane_config["max_velocities"]
            self.max_accelerations = self.crane_config["max_accelerations"]

            self.crane_config = self.crane_config["dimensions"]
            self.lift_elevation = self.crane_config["lift"]["height"] / 2
            self.target_values["lift_elevation"] = (
                self.crane_config["lift"]["height"] / 2
            )

    def to_dict(self):
        return {
            "origin": self.origin,
            "swing_rotation": self.swing_rotation,
            "lift_elevation": self.lift_elevation,
            "elbow_rotation": self.elbow_rotation,
            "wrist_rotation": self.wrist_rotation,
            "gripper_state": self.gripper_state,
        }

    def inverse_kinematics(self):
        x = self.endeffector_position.get("x", 0)
        y = self.endeffector_position.get("y", 0)
        z = self.endeffector_position.get("z", 0)
        yaw = self.endeffector_position.get("yaw", 0)
        x = -self.origin[0] + x
        y = -self.origin[1] + y
        y = -y

        l0 = (
            -self.crane_config["elbow"]["height"]
            - self.crane_config["wrist"]["height"]
            - self.crane_config["jaw"]["height"]
        )
        l1 = self.crane_config["elbow"]["depth"]
        l2 = self.crane_config["elbow"]["depth"]
        l3 = self.crane_config["wrist"]["depth"]
        psi = yaw * (np.pi / 180)

        p_2_0 = np.array([x, y]) - [l3 * np.cos(psi), l3 * np.sin(psi)]

        cos_q2 = (p_2_0.T @ p_2_0 - l1**2 - l2**2) / (2 * l1 * l2)

        # use swing rotation value as error message for invalid position
        if cos_q2 > 1 or cos_q2 < -1:
            setattr(self, "swing_rotation", 404)
            return

        q2 = np.arccos(cos_q2)
        # q2 = np.pi - np.arccos((l1**2+l2**2-(p_2_0.T@p_2_0))/(2*l1*l2))
        q1 = np.arctan2(p_2_0[1], p_2_0[0]) - np.arctan2(
            l2 * np.sin(q2), l1 + l2 * np.cos(q2)
        )
        q3 = psi - q1 - q2
        q4 = z - l0

        q1 = q1 * (180 / np.pi)
        q2 = q2 * (180 / np.pi)
        q3 = q3 * (180 / np.pi)

        self.target_values["swing_rotation"] = q1
        self.target_values["lift_elevation"] = q4
        self.target_values["elbow_rotation"] = q2
        self.target_values["wrist_rotation"] = q3


class CraneBot:
    def __init__(self):
        self.state = CraneState()
        self.keep_endeffector = False
        self.controller = MPCController(self.state)

    def __str__(self):
        state = self.state.to_dict().items()
        return f"Crane has state: {state}"

    def set_controller(self, controller):
        if controller == "PD":
            self.controller = PDController(self.state)
        elif controller == "MPC":
            self.controller = MPCController(self.state)
        else:
            print("Invalid controller type")
            return