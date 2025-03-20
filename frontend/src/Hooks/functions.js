import styles from "../styles/videoComponent.module.css";

export default function VideoGrid(localVideoRef){
    return(
        <>
            <video className={styles.meetUserVideo} ref={localVideoRef}></video>
        </>
    )
}