from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import whisper
import os
import base64
from datetime import datetime

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")  # Enable WebSockets

# Load Whisper Model
model = whisper.load_model("base")

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Flask WebSocket server is running!"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Endpoint to handle audio file upload and transcription."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    audio_file = request.files['file']
    file_path = f"temp_audio_{datetime.now().timestamp()}.wav"
    audio_file.save(file_path)

    try:
        result = model.transcribe(file_path)
        transcription = result['text']
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    return jsonify({"transcription": transcription})


@socketio.on("audio_stream")
def handle_audio_stream(data):
    """Handles real-time audio streaming."""
    user_id = data.get("user_id", "unknown")
    audio_base64 = data.get("audio", None)

    if not audio_base64:
        emit("transcription", {"error": "No audio data received"})
        return

    # Decode the Base64 audio
    audio_bytes = base64.b64decode(audio_base64)
    file_path = f"temp_audio_{datetime.now().timestamp()}.wav"
    
    with open(file_path, "wb") as f:
        f.write(audio_bytes)

    try:
        result = model.transcribe(file_path)
        transcription = result['text']
        emit("transcription", {"user": user_id, "text": transcription})  # Send to client
    except Exception as e:
        emit("transcription", {"error": str(e)})
    finally:
        os.remove(file_path)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
