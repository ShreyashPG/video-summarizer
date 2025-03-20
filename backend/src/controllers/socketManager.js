import { Server } from "socket.io"
import { io as ClientIO } from "socket.io-client";
let connections = {}
let messages = {}
let timeOnline = {}

const SPEECH_BACKEND_URL = "http://127.0.0.1:8000";
const speechSocket = ClientIO(SPEECH_BACKEND_URL);

speechSocket.on("connect", () => {
    console.log("🗣️ Connected to Speech Recognition Backend");
});



export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("🔌 New connection:", socket.id)

        socket.on("join-call", (path) => {
            if (!connections[path]) {
                connections[path] = []
            }
            connections[path].push(socket.id)
            timeOnline[socket.id] = new Date()

            console.log(`📞 User ${socket.id} joined call on path ${path}`)

            connections[path].forEach(id => {
                io.to(id).emit("user-joined", socket.id, connections[path])
            })

            if (messages[path]) {
                messages[path].forEach(msg => {
                    io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg['socket-id-sender'])
                })
            }
        })

        socket.on("signal", (toId, message) => {
            console.log(`📡 Signal from ${socket.id} to ${toId}`)
            io.to(toId).emit("signal", socket.id, message)
        })

        socket.on("audio-stream", (data) => {
            const { user, audio,socketId } = data;
            console.log(`🎤 Audio received from ${user}, forwarding to speech recognition backend users socketId is = ${socketId}`);

            // Send audio to the speech recognition backend
            speechSocket.emit("audio_stream", { user, audio,socketId });
        });

        socket.on("chat-message", (data, sender) => {
            const room = Object.keys(connections).find(key => connections[key].includes(socket.id))

            if (room) {
                if (!messages[room]) {
                    messages[room] = []
                }

                messages[room].push({ sender, data, "socket-id-sender": socket.id })
                console.log(`💬 Message from ${sender} in room ${room}: ${data}`)

                connections[room].forEach(id => {
                    io.to(id).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        socket.on("disconnect", () => {
            const disconnectTime = new Date()
            const onlineTime = Math.abs(timeOnline[socket.id] - disconnectTime)
            console.log(`❌ User ${socket.id} disconnected after ${onlineTime} ms`)

            for (const [path, ids] of Object.entries(connections)) {
                const index = ids.indexOf(socket.id)
                if (index !== -1) {
                    ids.splice(index, 1)
                    ids.forEach(id => {
                        io.to(id).emit('user-left', socket.id)
                    })
                    console.log(`🚪 User ${socket.id} left path ${path}`)

                    if (ids.length === 0) {
                        delete connections[path]
                    }
                    break
                }
            }
        })
    })

    speechSocket.on("transcription", (data) => {
        const { user, text,socketId } = data;
        console.log(`📝 Transcription received from ${user}: ${text}`);
    
        // Find the room of the user and broadcast the transcription
        for (const room in connections) {
            console.log(`🔍 Looking for ${user} in room ${room}`);
            if (connections[room].includes(socketId)) {
                console.log(`🔍 Found ${user} in room ${room}`);
                connections[room].forEach((id) => {
                   
                        console.log(`📡 Forwarding transcription to ${id} transcription ${ user, text}`);
                        io.to(id).emit("transcription", { user, text });
                    
                   
                });
                break;
            }
        }
    });
    

    return io
}



   