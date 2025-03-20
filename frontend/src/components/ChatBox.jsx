import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import server from "../environment";
import useMediaPermissions from "../Hooks/mediaPermission.jsx";
import styles from "../styles/videoComponent.module.css";
import { VideoGridComponent } from "../components/VideoGridComponent.jsx";
import { ControlBar } from "../components/ControlBar.jsx";
import { ChatBox } from "../components/ChatBox.jsx";
export  function ChatComponent({messages, showModal, sendMessage, message, setMessage}) {
  return (
    <div>
      {showModal ? (
        <div className={styles.chatRoom}>
          <div className={styles.chatContainer}>
            <h1>Chat</h1>

            <div className={styles.chattingDisplay}>
              {messages.length !== 0 ? (
                messages.map((item, index) => {
                  console.log(messages);
                  return (
                    <div style={{ marginBottom: "20px" }} key={index}>
                      <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                      <p>{item.data}</p>
                    </div>
                  );
                })
              ) : (
                <p>No Messages Yet</p>
              )}
            </div>

            <div className={styles.chattingArea}>
              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                id="outlined-basic"
                label="Enter Your chat"
                variant="outlined"
              />
              <Button variant="contained" onClick={sendMessage}>
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
