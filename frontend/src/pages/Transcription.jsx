import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import server from "../environment";

const socket = io(server, {
  transports: ["websocket", "polling"],
});

const Transcription = () => {
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket server");
    });

    socket.on("server_message", (data) => {
      console.log(data.message);
    });

    socket.on("transcription", (data) => {
      console.log("📝 Transcription received:", data);
      if (data.text && data.text.trim()) {
        setTranscription((prev) => {
          const newText = data.text.trim();
          return prev ? `${prev} ${newText}` : newText;
        });
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("server_message");
      socket.off("transcription");
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Configure MediaRecorder to produce standalone WebM files
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm; codecs=opus",
      });

      let webmHeader = null; // Stores the header from the first chunk

      recorder.ondataavailable = async (event) => {
        const blob = event.data;

        if (blob.size === 0) return; // Ignore empty blobs

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Less aggressive silence detection
        if (isSilent(uint8Array)) {
          console.log("🔇 Silent chunk detected, skipping...");
          return;
        }

        if (!webmHeader) {
          webmHeader = uint8Array; // Store the first chunk as the WebM header
          console.log("📝 Stored WebM header");
        } else {
          const fullChunk = new Uint8Array(
            webmHeader.length + uint8Array.length
          );
          fullChunk.set(webmHeader, 0);
          fullChunk.set(uint8Array, webmHeader.length);

          const fixedBlob = new Blob([fullChunk], { type: "audio/webm" });
          console.log(
            `📤 Sending audio chunk of size: ${fixedBlob.size} bytes`
          );
          sendToServer(fixedBlob);
        }
      };

      // Start recording and send data every 2 seconds
      recorder.start(2000);
      setMediaRecorder(recorder);
      console.log("🎤 Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      console.log("🎤 Recording stopped");
    }
    setIsRecording(false);
  };

  function sendToServer(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      socket.emit("audio_stream", {
        audio: base64Data,
        user: "User",
        socketId: socket.id,
      });
    };
  }

  function isSilent(chunk) {
    // Less aggressive silence detection
    const sum = chunk.reduce((a, b) => a + b, 0);
    const average = sum / chunk.length;
    return average < 5; // Adjusted threshold for better sensitivity
  }

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Live Captioning</h1>
      <div className="bg-gray-100 p-4 rounded-lg min-h-[200px] mb-4">
        <p className="text-gray-800 text-lg">
          {transcription || "Captions will appear here..."}
        </p>
      </div>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`mt-4 px-6 py-3 rounded-lg font-semibold ${
          isRecording
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        } text-white transition-colors`}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
    </div>
  );
};

export default Transcription;
