import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://127.0.0.1:8000", {
  transports: ["websocket", "polling"],
});

const Transcription = () => {
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    
    socket.on("connect", () => {
      // console.log("📝 Transcription received:", data);
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
      setTranscription((prev) => prev + " " + data.text);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("server_message");
      socket.off("transcription");
    };
  }, []);

  const startRecording = async () => {
    setIsRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
  
      // 🔍 Detect silence (all bytes are zero or match previous chunk)
      if (isSilent(uint8Array)) {
          console.log("🔇 Silent chunk detected, skipping...");
          return;
      }
  
      if (!webmHeader) {
          webmHeader = uint8Array; // Store the first chunk as the WebM header
      } else {
          const fullChunk = new Uint8Array(webmHeader.length + uint8Array.length);
          fullChunk.set(webmHeader, 0);
          fullChunk.set(uint8Array, webmHeader.length);
  
          const fixedBlob = new Blob([fullChunk], { type: "audio/webm" });
          sendToServer(fixedBlob);
      }
  };

    // Start recording and send data every 2 seconds (adjust as needed)
    recorder.start(3000); // 2000ms = 2 seconds
    setMediaRecorder(recorder);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };
  function sendToServer(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      socket.emit("audio_stream", { audio: base64Data });
    };
  }
  function isSilent(chunk) {
    return chunk.every((byte) => byte === 0); // Simple silence check
}
  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold">Live Captioning</h1>
      <p className="mt-4 text-gray-600">{transcription}</p>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
    </div>
  );
};

export default Transcription;
