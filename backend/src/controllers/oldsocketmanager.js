import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}

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

    return io
}

