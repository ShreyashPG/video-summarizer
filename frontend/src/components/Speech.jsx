import React, { useEffect, useState } from "react";
import ClosedCaptionOffOutlinedIcon from "@mui/icons-material/ClosedCaptionOffOutlined";
import ClosedCaptionDisabledOutlinedIcon from "@mui/icons-material/ClosedCaptionDisabledOutlined";
import styles from "../styles/videoComponent.module.css";
import { IconButton } from "@mui/material";
export function Speech({ localVideoref, getPermissions, socketRef, username }) {
  const [transcription, setTranscription] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [socketId, setSocketId] = useState(null); // State to store socketId
  const [captions, setCaptions] = useState("");
  const socket = socketRef.current;

  useEffect(() => {
    // Listen for socket connection
    const handleConnect = () => {
      console.log("✅ Socket connected");
      setSocketId(socket.id); // Update socketId once connected
    };

    socket.on("connect", handleConnect);

    // Cleanup listener
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket]);

  useEffect(() => {
    if (localVideoref && localVideoref.current) {
      getPermissions();
      console.log("Local Video Ref: ", localVideoref.current);
    } else {
      console.error("localVideoref is undefined or null");
    }
  }, [localVideoref, getPermissions]);

  useEffect(() => {
    const handleTranscription = (data) => {
      console.log("📝 Transcription received:", data);
      if (data.text && data.text.trim()) {
        setTranscription((prev) => {
          const newTranscription = [...prev];
          // Remove old transcription from the same user
          const filteredTranscription = newTranscription.filter(
            (item) => item.user !== data.user
          );
          // Add new transcription
          filteredTranscription.push(data);
          return filteredTranscription;
        });
      }
    };

    socket.on("transcription", handleTranscription);

    return () => {
      socket.off("transcription", handleTranscription);
    };
  }, [socket]);

  const startRecording = async () => {
    try {
      console.log("🎤 Started recording");
      setIsRecording(true);
      const stream = new MediaStream(
        localVideoref.current.srcObject.getAudioTracks()
      );

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm; codecs=opus",
      });

      let webmHeader = null;

      recorder.ondataavailable = async (event) => {
        const blob = event.data;
        if (blob.size === 0) return;

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        if (isSilent(uint8Array)) {
          console.log("🔇 Silent chunk detected, skipping...");
          return;
        }

        if (!webmHeader) {
          webmHeader = uint8Array;
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

      recorder.start(2000); // Record chunks every 2 seconds
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    setIsRecording(false);
  };

  function sendToServer(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      console.log("📤 Sending audio chunk to server...");
      console.log("User and SocketId:", username, socketId);
      socket.emit("audio_stream", {
        // Fixed event name to match backend
        user: username,
        audio: base64Data,
        socketId: socketId,
      });
    };
  }

  function isSilent(chunk) {
    // Less aggressive silence detection
    const sum = chunk.reduce((a, b) => a + b, 0);
    const average = sum / chunk.length;
    return average < 5;
  }

  return (
    <div className="speech-container">
      <div>
        <IconButton
          className="record-button"
          onClick={isRecording ? stopRecording : startRecording}
          color={isRecording ? "error" : "primary"}
        >
          {isRecording ? (
            <ClosedCaptionDisabledOutlinedIcon />
          ) : (
            <ClosedCaptionOffOutlinedIcon />
          )}
        </IconButton>
      </div>
      <div className="transcription-container">
        {transcription.length > 0 ? (
          transcription.map((item, index) => (
            <p key={index} className="transcription-item">
              <strong>{item.user}:</strong> {item.text}
            </p>
          ))
        ) : (
          <p className="placeholder">Captions will appear here...</p>
        )}
      </div>
    </div>
  );
}
