import numpy as np

class PDController:
    def __init__(self, state):
        self.kp = 3
        self.kd = 2*np.sqrt(self.kp)
        self.state = state
        self.dt = 0.1

    def control_update(self):
        state = self.state
        dt = self.dt

        if "origin" in state.target_values:
            self.update_origin(state.target_values["origin"])

        # Update each actuator considering its max speed and acceleration
        for actuator, target_pos in state.target_values.items():
            if hasattr(state, actuator):

                if actuator == "origin":
                    continue

                current_pos = getattr(state, actuator)

                max_speed = state.max_velocities.get(actuator, 0)
                max_acceleration = state.max_accelerations.get(actuator, 0)

                error = target_pos - current_pos
                derivative = (error - state.prev_error[actuator]) / dt
                state.prev_error[actuator] = error


                control = self.kp * error + self.kd * derivative
                acceleration = (control-state.prev_control[actuator])/dt

                if abs(acceleration) > max_acceleration:
                    acceleration = np.sign(acceleration) * max_acceleration
                
                control_limited = state.prev_control[actuator] + acceleration * dt
                if abs(control_limited) > max_speed:
                    control_limited = np.sign(control_limited) * max_speed
                
                
                
                state.prev_control[actuator] = control_limited

                new_pos = current_pos + control_limited * dt
                setattr(state, actuator, new_pos)

    def update_origin(self, origin):
        state = self.state
        dt = 0.1
        kp = 0.03
        kd = 2*np.sqrt(kp)

        current_pos = np.array(getattr(state, "origin"))

        max_speed = state.max_velocities.get("origin", 0)
        max_acceleration = state.max_accelerations.get("origin", 0)

        target_pos_x, target_pos_y = origin
        target_pos = np.array([target_pos_x, target_pos_y])

        error = target_pos - current_pos
        derivative = (error - np.array(state.prev_error['origin'])) / dt

        control = kp * error + kd * derivative
        prev_controls = np.array(state.prev_control['origin'])

        accelerations = (control-prev_controls)/dt

        for i, acceleration in enumerate(accelerations):
            if abs(acceleration) > max_acceleration[i]:
                accelerations[i] = np.sign(acceleration) * max_acceleration[i]
        
        controls_limited = prev_controls + accelerations * dt

        for i, control_limited in enumerate(controls_limited):
            if abs(control_limited) > max_speed[i]:
                controls_limited[i] = np.sign(control_limited) * max_speed[i]
        
        state.prev_control['origin'] = controls_limited.tolist()

        new_pos = current_pos + controls_limited * dt
        
        setattr(state, "origin", new_pos.tolist())