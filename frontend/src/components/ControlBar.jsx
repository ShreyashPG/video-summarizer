
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";

export function ControlBar({
  localVideoref,
  getPermissions,
  setVideo,
  setAudio,
  setScreen,
  setModal,
  showModal,
  screen,
  video,
  audio,
  newMessages,
  screenAvailable
}) {
  let handleVideo = () => {
    setVideo(!video);
  };
  let handleAudio = () => {
    setAudio(!audio);
    // getUserMedia();
  };
  let handleScreen = () => {
    setScreen(!screen);
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };

  console.log(localVideoref);
  
  useEffect(() => {
    if (localVideoref && localVideoref.current) {
      getPermissions();
      console.log("Local Video Ref: ", localVideoref.current);
    } else {
      console.error("localVideoref is undefined or null");
    }
  }, []);

  return (
    <>
      <div className={styles.buttonContainers}>
        <IconButton onClick={handleVideo} style={{ color: "white" }}>
          {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
          <CallEndIcon />
        </IconButton>
        <IconButton onClick={handleAudio} style={{ color: "white" }}>
          {audio === true ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        {screenAvailable === true ? (
          <IconButton onClick={handleScreen} style={{ color: "white" }}>
            {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
          </IconButton>
        ) : (
          <></>
        )}

        <Badge badgeContent={newMessages} max={999} color="orange">
          <IconButton
            onClick={() => setModal(!showModal)}
            style={{ color: "white" }}
          >
            <ChatIcon />{" "}
          </IconButton>
        </Badge>
      </div>
    </>
  );
}
