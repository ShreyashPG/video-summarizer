import React, { useEffect, useState } from "react";
import ClosedCaptionOffOutlinedIcon from '@mui/icons-material/ClosedCaptionOffOutlined';
import ClosedCaptionDisabledOutlinedIcon from '@mui/icons-material/ClosedCaptionDisabledOutlined';
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
      setTranscription((prev)=>[...prev, data]);
      console.log("transcription:", transcription);
      if(data.user === username){
        setCaptions("");
      }
      else{
        setCaptions(data.user + ": " + data.text);
      }
      console.log("captions:", captions);
    };

    socket.on("transcription", handleTranscription);

    return () => {
      socket.off("transcription"); // Cleanup listener
    };
  }, [socket]);

  const startRecording = async () => {
    console.log("🎤 Started recording");
    setIsRecording(true);
    const stream = new MediaStream(localVideoref.current.srcObject.getAudioTracks());

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

    recorder.start(3000); // Record chunks every 3 seconds
    setMediaRecorder(recorder);
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
    console.log("📤 Sending audio chunk to server...");
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];
      console.log("📤 Sending audio chunk to server... line 88");
      console.log("this is username and socketId in speech file:", username, socketId);
      socket.emit("audio-stream", { user: username, audio: base64Data, socketId: socketId });
    };
  }

  function isSilent(chunk) {
    return chunk.every((byte) => byte === 0); // Simple silence check
  }

  return (
    <div className="speech-container">
      <div>
        <IconButton className="record-button" onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <ClosedCaptionDisabledOutlinedIcon /> : <ClosedCaptionOffOutlinedIcon />}
        </IconButton>
      </div>
      <div>
  {transcription.length > 0 ? (
    transcription.map((item, index) => (
      <p key={index}>
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