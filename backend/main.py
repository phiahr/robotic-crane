# server.py
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import uvicorn
import asyncio
import random
import json

from CraneBot import CraneBot

app = FastAPI()
crane_bot = CraneBot()


async def recv(websocket, cranebot):
    try:
        value = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)

        data = json.loads(value)

        if "controller" in data:
            cranebot.set_controller(data["controller"])
            return

        # if inverse kinematic command is given
        if "x" in data:
            cranebot.state.endeffector_position = data
            cranebot.state.inverse_kinematics()
            return

        else:
            # if move origin command is given
            if len(data) == 1:
                cranebot.state.target_values["origin"] = data["origin"]
                cranebot.state.inverse_kinematics()
                crane_bot.keep_endeffector = True
            else:
                cranebot.state.target_values = data
                cranebot.controller.control_update()
                crane_bot.keep_endeffector = False
    except asyncio.TimeoutError:
        pass


async def send(websocket, cranebot):
    if not cranebot.state.swing_rotation == 404:
        if crane_bot.keep_endeffector:
            cranebot.state.inverse_kinematics()

        cranebot.controller.control_update()

    await websocket.send_json(cranebot.state.to_dict())
    await asyncio.sleep(0.001)


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            send_task = asyncio.create_task(send(websocket, crane_bot))
            await send_task
            recv_task = asyncio.create_task(recv(websocket, crane_bot))
            await recv_task
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
