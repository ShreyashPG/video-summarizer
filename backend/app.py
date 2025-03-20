import speech_recognition as sr
import io
import base64
import wave
import traceback
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pydub import AudioSegment  # Install using: pip install pydub

from pydub import AudioSegment
AudioSegment.converter = r"C:\ffmpeg\bin\ffmpeg.exe"  # Explicitly set the path to ffmpeg
AudioSegment.ffprobe = r"C:\ffmpeg\bin\ffprobe.exe"  # Explicitly set the path to ffprobe

app = Flask(__name__)
# Update CORS to allow all routes and methods
CORS(app, resources={r"/*": {"origins": "http://localhost:3000", "methods": ["GET", "POST", "OPTIONS"]}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

recognizer = sr.Recognizer()
# recognizer.energy_threshold = 300  # Adjust this value as needed
# recognizer.dynamic_energy_threshold = True

# Mock user database (replace with real database in production)
users = {}

@app.route('/api/v1/users/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        # Handling preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')

    if not username or not password or not name:
        return jsonify({'message': 'Missing required fields'}), 400

    if username in users:
        return jsonify({'message': 'Username already exists'}), 400

    users[username] = {'password': password, 'name': name}
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/v1/users/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        # Handling preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    if username not in users or users[username]['password'] != password:
        return jsonify({'message': 'Invalid credentials'}), 401

    return jsonify({'message': 'Login successful', 'name': users[username]['name']}), 200

@app.route('/api/v1/users/add_to_activity', methods=['POST', 'OPTIONS'])
def add_to_activity():
    if request.method == 'OPTIONS':
        # Handling preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    try:
        data = request.get_json()
        token = data.get('token')
        meeting_code = data.get('meeting_code')

        if not token or not meeting_code:
            return jsonify({'message': 'Missing required fields'}), 400

        # Here you would typically:
        # 1. Validate the token
        # 2. Store the meeting code in the user's activity history
        # For now, we'll just return success
        return jsonify({'message': 'Activity added successfully'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/v1/users/get_all_activity', methods=['GET', 'OPTIONS'])
def get_all_activity():
    if request.method == 'OPTIONS':
        # Handling preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        return response

    try:
        token = request.args.get('token')
        if not token:
            return jsonify({'message': 'Missing token'}), 400

        # Here you would typically:
        # 1. Validate the token
        # 2. Get the user's activity history
        # For now, we'll return an empty list
        return jsonify({'activities': []}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

def convert_audio(audio_chunk):
    """Convert WebM/Opus audio to WAV (16-bit PCM, Mono, 16kHz)."""
    try:
        input_audio = io.BytesIO(audio_chunk)
        input_audio.seek(0)

        # DEBUG: Save raw received file for troubleshooting
        with open("raw_audio.webm", "wb") as debug_file:
            debug_file.write(audio_chunk)

        # Convert WebM to WAV using pydub
        audio = AudioSegment.from_file(input_audio, format="webm")

        # Skip silent chunks
        if audio.dBFS == -float("inf"):  # Check if the chunk is silent
            print("🔇 Skipping silent chunk")
            return None

        audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)

        # Save as WAV
        output_audio = io.BytesIO()
        audio.export(output_audio, format="wav")
        output_audio.seek(0)
        return output_audio.getvalue()

    except Exception as e:
        print(f"❌ Audio conversion error: {e}")
        traceback.print_exc()
        return None

@socketio.on("connect")
def handle_connect():
    print("✅ Client connected")

@socketio.on("audio_stream")
def handle_audio(data):
    try:
        user = data.get("user", "Unknown")
        print(f"🎤 Received audio from {user}")
        socketId=data["socketId"]
        if "audio" not in data or not data["audio"]:
            print("❌ No audio data received")
            return

        # Decode base64 audio
        audio_chunk = base64.b64decode(data["audio"])
        print(f"✅ Received {len(audio_chunk)} bytes of audio data")

        # Convert WebM to WAV
        wav_audio = convert_audio(audio_chunk)
        if not wav_audio:
            print("❌ Failed to convert audio")
            return

        # Save for debugging
        with open("debug_audio.wav", "wb") as f:
            f.write(wav_audio)
        print("🎵 Saved audio as 'debug_audio.wav'")

        # Recognize speech
        with sr.AudioFile(io.BytesIO(wav_audio)) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)

        print(f"📝 Transcribed Text: {text}")
        socketio.emit("transcription", {"user": user, "text": text,"socketId":socketId})

    except Exception as e:
        print("❌ Error in audio processing:")
        traceback.print_exc()

if __name__ == "__main__":
    socketio.run(app, debug=True, port=8000)
