import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";

import server from "../environment";
import useMediaPermissions from "../Hooks/mediaPermission.jsx";
import styles from "../styles/videoComponent.module.css";
import { VideoGridComponent } from "../components/VideoGridComponent.jsx";
import { ControlBar } from "../components/ControlBar.jsx";
import { ChatComponent } from "../components/ChatBox.jsx";
import {Speech} from "../components/Speech.jsx";
var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function NewVideoMeet() {
  const [username, setUsername] = useState("");
  let [askForUsername, setAskForUsername] = useState(true);
  let [showChat, setShowChat] = useState(false);
  let [videos, setVideos] = useState([]);
  let [messages, setMessages] = useState([])
  
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(1);
  let [video, setVideo] = useState([]);
  let [audio, setAudio] = useState();
  let [screen, setScreen] = useState();
  let [showModal, setModal] = useState(true);
  var socketRef = useRef();
  let socketIdRef = useRef();
  const videoRef = useRef([]);
  let [transcription, setTranscription] = useState("");
  


  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let sendMessage = () => {
    console.log(socketRef.current);
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      // Use addTrack instead of addStream
      stream.getTracks().forEach((track) => {
        connections[id].addTrack(track, stream);
      });

      connections[id].createOffer().then((description) => {
        console.log("Got Description: ", description);
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.error(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          for (let id in connections) {
            // Use addTrack instead of addStream
            window.localStream.getTracks().forEach((track) => {
              connections[id].addTrack(track, window.localStream);
            });

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server, { secure: false });
    console.log("this is socket in main file:",socketRef.current)

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      console.log("Connected to server");

      socketRef.current.emit("join-call", window.location.href);

      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);
      
      
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

      socketRef.current.on("user-joined", (id, clients) => {
        console.log("User Joined: ", id);
        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current) return;

          // Create a new RTCPeerConnection for the new user
          if (!connections[socketListId]) {
            connections[socketListId] = new RTCPeerConnection(
              peerConfigConnections
            );

            connections[socketListId].onicecandidate = function (event) {
              if (event.candidate != null) {
                socketRef.current.emit(
                  "signal",
                  socketListId,
                  JSON.stringify({
                    ice: event.candidate,
                  })
                );
              }
            };

            connections[socketListId].onaddstream = (event) => {
              console.log("BEFORE:", videoRef.current);
              console.log("FINDING ID: ", socketListId);

              let videoExists = videoRef.current.find(
                (video) => video.socketId === socketListId
              );

              if (videoExists) {
                console.log("FOUND EXISTING");

                // Update the stream of the existing video
                setVideos((videos) => {
                  const updatedVideos = videos.map((video) =>
                    video.socketId === socketListId
                      ? { ...video, stream: event.stream }
                      : video
                  );
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                });
              } else {
                // Create a new video
                console.log("CREATING NEW");
                let newVideo = {
                  socketId: socketListId,
                  stream: event.stream,
                  autoplay: true,
                  playsinline: true,
                };

                setVideos((videos) => {
                  const updatedVideos = [...videos, newVideo];
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                });
              }
            };

            // Add local tracks to the new peer connection
            if (window.localStream) {
              window.localStream.getTracks().forEach((track) => {
                connections[socketListId].addTrack(track, window.localStream);
              });
            }
          }

          if (id === socketIdRef.current) {
            // New user joined, create offers for all existing connections
            for (let id2 in connections) {
              if (id2 === socketIdRef.current) continue;

              connections[id2].createOffer().then((description) => {
                connections[id2]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      id2,
                      JSON.stringify({
                        sdp: connections[id2].localDescription,
                      })
                    );
                  })
                  .catch((e) => console.error(e));
              });
            }
          }
        });
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };
  
  let getDislayMediaSuccess = (stream) => {
    console.log("HERE")
    try {
        window.localStream.getTracks().forEach(track => track.stop())
    } catch (e) { console.log(e) }

    window.localStream = stream
    localVideoref.current.srcObject = stream

    for (let id in connections) {
        if (id === socketIdRef.current) continue

        connections[id].addStream(window.localStream)

        connections[id].createOffer().then((description) => {
            connections[id].setLocalDescription(description)
                .then(() => {
                    socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                })
                .catch(e => console.log(e))
        })
    }

    stream.getTracks().forEach(track => track.onended = () => {
        setScreen(false)

        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { console.log(e) }

        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
        window.localStream = blackSilence()
        localVideoref.current.srcObject = window.localStream

        getUserMedia()

    })
}
  let getDislayMedia = () => {
    if (screen) {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        }
    }
}

  
  const {
    localVideoref,
    videoAvailable,
    audioAvailable,
    screenAvailable,
    getPermissions,
  } = useMediaPermissions();

  const handleConnect = () => {
    if (username.trim()) {
      setAskForUsername(false);
      getMedia();
    }
  };
  const handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };
  

  useEffect(() => {
    if (localVideoref && localVideoref.current) {
      getPermissions();
      console.log("insid useEffect ");
      console.log("Local Video Ref: ", localVideoref.current);
    } else {
      console.error("localVideoref is undefined or null");
    }
  }, [localVideoref]);

  useEffect(() => {
    if (video !== undefined && audio !== undefined && localVideoref.current) {
      getUserMedia();
      console.log("SET STATE HAS ", video, audio);
    }
  }, [video, audio]);
  useEffect(() => {
          if (screen !== undefined) {
              getDislayMedia();
          }
  }, [screen])

  
  return (
    <div className={styles.container}>
      {askForUsername ? (
        <div className={styles.lobbyContainer}>
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={handleConnect}>
            Connect
          </Button>
          <video ref={localVideoref} autoPlay muted className={styles.localVideo}></video>
        </div>
      ) : (
        <div className={styles.meetContainer}>
          <div className={styles.videoContainer}>
            <VideoGridComponent
              localVideoref={localVideoref}
              getPermissions={getPermissions}
              videos={videos}
            />
              <ControlBar 
              localVideoref={localVideoref}
              getPermissions={getPermissions}
              setVideo={setVideo}
              setAudio={setAudio}
              setScreen={setScreen}
              setModal={setModal}
              showModal={showModal}
              screen={screen}
              video={video}
              audio={audio}
              newMessages={newMessages}
              screenAvailable={screenAvailable}
            />

            <ChatComponent
             messages={messages}
              showModal={showModal}
              sendMessage={sendMessage}
              message={message}
              setMessage={setMessage}
            />
            <Speech 
              localVideoref={localVideoref}
              getPermissions={getPermissions}
              socketRef={socketRef}
              username={username}
            />
          </div>
          </div>
          
          
      )}
    </div>
  );
}
