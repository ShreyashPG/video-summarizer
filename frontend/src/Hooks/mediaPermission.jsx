import { useState, useRef } from 'react';

export default function useMediaPermissions() {
    const localVideoref = useRef(null); // Correctly use useRef for video reference
    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const getPermissions = async () => {
        try {
            // Local variables to manage permissions synchronously
            let isVideoAvailable = false;
            let isAudioAvailable = false;
    
            // Request video permission
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                isVideoAvailable = true;
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }
    
            // Request audio permission
            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                isAudioAvailable = true;
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }
    
            console.log("Upto here it's working fine");
    
            // Check for screen sharing availability
            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
                console.log("Screen Available: true");
            } else {
                setScreenAvailable(false);
                console.log("Screen Available: false");
            }
    
            // Combine audio and video streams and attach to the video element
            if (isVideoAvailable || isAudioAvailable) {
                console.log("Video Available: ", isVideoAvailable);
                const userMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: isVideoAvailable,
                    audio: isAudioAvailable,
                });
                console.log("User Media Stream: ", userMediaStream);
    
                // Attach the stream to the video element
                if (localVideoref.current) {
                    localVideoref.current.srcObject = userMediaStream;
                    console.log("Stream attached to video element");
                    window.localStream=userMediaStream;
                } else {
                    console.error("Video element reference is null");
                }
            }
        } catch (err) {
            console.error(`Error from getPermissions: ${err}`);
        }
    
    
    };

    return { 
        localVideoref, 
        videoAvailable, 
        audioAvailable, 
        screenAvailable, 
        getPermissions 
    };
}
