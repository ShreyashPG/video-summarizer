from flask import Flask
from flask_socketio import SocketIO, emit
import whisper
import os
import base64
from datetime import datetime

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")  # Enable WebSocket support

# Load Whisper model
model = whisper.load_model("base")

@app.route('/test', methods=['GET'])
def test():
    return {"message": "Flask WebSocket server is running!"}

@socketio.on("audio_chunk")
def handle_audio_chunk(data):
    """Handles audio chunks from users in real-time."""
    try:
        user_id = data["user_id"]
        audio_chunk = base64.b64decode(data["audio"])  # Decode received Base64 audio

        # Save chunk as a temporary WAV file
        file_path = f"temp_audio_{user_id}_{datetime.now().timestamp()}.wav"
        with open(file_path, "wb") as f:
            f.write(audio_chunk)

        # Transcribe the audio
        result = model.transcribe(file_path)
        transcription = result["text"]

        # Broadcast transcription to all clients
        emit("transcription", {"user": user_id, "text": transcription}, broadcast=True)

        # Remove the temp file
        os.remove(file_path)

    except Exception as e:
        emit("transcription", {"user": user_id, "text": f"Error: {str(e)}"})

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
