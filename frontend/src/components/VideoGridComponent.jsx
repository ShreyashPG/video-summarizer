import {  useEffect } from "react";
import React from "react";
import useMediaPermissions from "../Hooks/mediaPermission";
import styles from "../styles/videoComponent.module.css";
export const VideoGridComponent = ({ localVideoref, getPermissions,videos }) => {
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
      <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

      <div className={styles.conferenceView}>
        {videos.map((video)=>(
            <div>
                <video
                    data-socket={video.socketId}
                    ref={ref=>{
                        if(ref && video.stream){
                            ref.srcObject=video.stream;
                        }
                    }}
                    autoPlay
                >

                </video>
            </div>
        ))
        }
      </div>
    
    </>
  );
};
