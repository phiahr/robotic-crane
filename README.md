# Robotic Crane
4 DoF Robotic Crane with 3D visualisation through Three.js

## How to use 
- Clone repository: `https://github.com/phiahr/robotic-crane.git`
- Go into directory: `cd robotic-crane`
- Create conda environment: `conda env create -f environment.yml`
- Go into backend directory and start server:
  -  `cd backend`
  -  `uvicorn main:app --reload`
-  Open new terminal window
-  Go into frontend directory and start client:
   -  `cd frontend`
   -  `pnpm dev` or `npm run dev`
-  Open URL `localhost:3000` in your browser
-  Play around with the robotic crane :)


## Demonstration

### Control actuator states
![Program Demo](media/State_control.gif)

### Set 4D point and move end effector to it through the calculation of inverse kinematics
![Program Demo](media/Inverse_kinematics.gif)

### Move the origin while keeping the end effector as still as possible
![Program Demo](media/Move_origin.gif)

### Side-by-side comparison of PD Controller (left) and MPC Controller (right)
![Program Demo](media/PD_vs_MPC.gif)