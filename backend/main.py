# server.py
from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware  # Import CORSMiddleware
from fastapi import BackgroundTasks

from fastapi.responses import HTMLResponse
import uvicorn
import asyncio
import random
import json
import whisper
import ollama
from threading import Lock


from CraneBot import CraneBot
import warnings

warnings.filterwarnings("ignore", message="FP16 is not supported on CPU; using FP32 instead")

app = FastAPI()
crane_bot = CraneBot()
voice_model = whisper.load_model("base")
llm_model = 'llama3.2-robotic-crane'
state_lock = asyncio.Lock()

# # Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    async with state_lock:
        if not cranebot.state.swing_rotation == 404:
            if crane_bot.keep_endeffector:
                cranebot.state.inverse_kinematics()

            cranebot.controller.control_update()

    await websocket.send_json(cranebot.state.to_dict())
    await asyncio.sleep(0.001)


@app.post("/process_audio")
async def process_audio(file: UploadFile = File(...)):
    # save the audio file
    with open("temp_audio.mp4", "wb") as audio_file:
        audio_file.write(await file.read())

    result = voice_model.transcribe("temp_audio.mp4")
    print("Transcription:", result["text"])

    old_state = str(crane_bot)

    response = ollama.chat(model=llm_model, messages=[
    {
        'role': 'user',
        'content': old_state + result["text"],
    },
    ])

    print("Response:", response["message"]["content"])
    if "error" in response["message"]["content"]:
        return

    async with state_lock:
        output = json.loads(response["message"]["content"])

        if "error" in output:
            crane_bot.state.swing_rotation = 404
        else:
            action = output["action"]
            if "effector" in action:
                crane_bot.state.endeffector_position = output["new_state"]["endeffector_position"]
                crane_bot.state.inverse_kinematics()
            elif action == "change_controller":
                crane_bot.set_controller(output["controller"])
            elif action == "move_origin":
                for k in output["new_state"].keys():
                    crane_bot.state.target_values[k] = output["new_state"][k]
                crane_bot.state.inverse_kinematics()
                crane_bot.keep_endeffector = True
            elif action == "move_actuator":
                for k in output["new_state"].keys():
                    crane_bot.state.target_values[k] = output["new_state"][k]
                crane_bot.controller.control_update()
                crane_bot.keep_endeffector = False
            else:
                print("Invalid action")
                return

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
