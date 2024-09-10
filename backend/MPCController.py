
import numpy as np
import cvxpy as cp

class MPCController:
    def __init__(self, state):
        self.state = state
        self.dt = 0.1
        self.N = 10
        self.nx = len(state.target_values) + 1 # origin is 2 values
        self.nu = len(state.prev_control) + 1

    def control_update(self):
        state = self.state
        dt = self.dt
        N = self.N
        nx = self.nx
        nu = self.nu

        x = cp.Variable((nx, N + 1))
        u = cp.Variable((nu, N))

        current_origin = np.array(getattr(state, "origin"))
        target_origin = np.array(state.target_values["origin"])
        
        current_state = np.array([getattr(state, actuator) for actuator in state.target_values.keys() if actuator != 'origin'])
        target_state = np.array([state.target_values[actuator] for actuator in state.target_values.keys() if actuator != 'origin'])
        
        current_state = np.concatenate((current_origin, current_state))
        target_state = np.concatenate((target_origin, target_state))

        max_speed_origin = state.max_velocities.get("origin", np.zeros(2))
        max_acceleration_origin = state.max_accelerations.get("origin", np.zeros(2))

        max_speed = np.array([state.max_velocities[actuator] for actuator in state.target_values.keys() if actuator != 'origin'])
        max_acceleration = np.array([state.max_accelerations[actuator] for actuator in state.target_values.keys() if actuator != 'origin'])
        
        max_speed = np.concatenate((max_speed_origin, max_speed))
        max_acceleration = np.concatenate((max_acceleration_origin, max_acceleration))

        Q = np.eye(nx)
        R = np.eye(nu)
        Q[2:, 2:0] *= 100 
        Q[0:2, 0:2] *= 0.5

        cost = 0
        constraints = []

        for k in range(N):
            constraints += [x[:, k + 1] == x[:, k] + u[:, k] * dt]
            
            constraints += [cp.abs(u[:, k]) <= max_speed]
            if k > 0:
                constraints += [cp.abs((u[:, k] - u[:, k - 1]) / dt) <= max_acceleration]
            
            cost += cp.quad_form(x[:, k] - target_state, Q) + cp.quad_form(u[:, k], R)

        cost += cp.quad_form(x[:, N] - target_state, Q)

        constraints += [x[:, 0] == current_state]

        prob = cp.Problem(cp.Minimize(cost), constraints)
        prob.solve()

        optimal_u = u[:, 0].value
        
        current_origin = getattr(state, "origin")
        new_origin_pos = np.array(current_origin) + optimal_u[0:2] * dt
        setattr(state, "origin", new_origin_pos.tolist())

        for idx, actuator in enumerate(state.target_values.keys()):
            if actuator == 'origin':
                continue
            current_pos = getattr(state, actuator)
            new_pos = current_pos + optimal_u[idx + 1] * dt # +1 because of the origin 
            setattr(state, actuator, new_pos)
