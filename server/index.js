const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
require('./config/passport');
const passport = require('passport');

// ─── Prometheus Monitoring ────────────────────────────────────────────────────
const client = require('prom-client');
const register = new client.Registry();

// Collect default Node.js metrics (event loop lag, memory, GC, etc.)
client.collectDefaultMetrics({ register });

// Custom metric: HTTP request counter
const httpRequestCounter = new client.Counter({
    name: 'cohort_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// Custom metric: HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
    name: 'cohort_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});

// Custom metric: Active WebSocket connections
const activeSocketConnections = new client.Gauge({
    name: 'cohort_active_socket_connections',
    help: 'Number of currently active Socket.IO connections',
    registers: [register],
});

// Custom metric: MongoDB connection status (1 = connected, 0 = disconnected)
const mongoConnectionStatus = new client.Gauge({
    name: 'cohort_mongodb_connected',
    help: 'MongoDB connection status (1=connected, 0=disconnected)',
    registers: [register],
});
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// ─── HTTP Instrumentation Middleware ─────────────────────────────────────────
app.use((req, res, next) => {
    // Skip metrics endpoint itself to avoid self-scraping noise
    if (req.path === '/metrics') return next();
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode,
        };
        httpRequestCounter.inc(labels);
        end(labels);
    });
    next();
});

// ─── Metrics endpoint for Prometheus scraping ─────────────────────────────────
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

// TEMPORARY: Trigger seeding via HTTP — protected by SEED_SECRET env var
app.get('/api/seed', async (req, res) => {
    const { secret } = req.query;
    if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
        return res.status(403).json({ message: 'Forbidden: invalid or missing seed secret' });
    }
    try {
        const Category = require('./models/Category');
        const Post = require('./models/Post');
        const Goal = require('./models/Goal');
        const StudySession = require('./models/StudySession');
        const User = require('./models/User');
        const Room = require('./models/Room');

        // 1. Categories
        await Category.deleteMany({});
        await Category.insertMany([
            { name: "Computer Science", icon: "Code", color: "bg-blue-100 text-blue-600" },
            { name: "Mathematics", icon: "Atom", color: "bg-purple-100 text-purple-600" },
            { name: "Literature", icon: "BookOpen", color: "bg-amber-100 text-amber-600" },
            { name: "General Study", icon: "Users", color: "bg-green-100 text-green-600" }
        ]);

        // 2. Users (Create multiple realistic profiles)
        await User.deleteMany({});
        // Note: In a real prod env, be careful deleting all users! But for this seed route it's expected.

        const users = await User.insertMany([
            {
                username: 'Alex_Chen',
                email: 'alex@example.com',
                password: 'password123',
                studyStats: { totalHours: 120, streak: 12 }
            },
            {
                username: 'Sarah_PreMed',
                email: 'sarah@example.com',
                password: 'password123',
                studyStats: { totalHours: 85, streak: 4 }
            },
            {
                username: 'Jordan_Dev',
                email: 'jordan@example.com',
                password: 'password123',
                studyStats: { totalHours: 200, streak: 45 }
            },
            {
                username: 'Mia_Arts',
                email: 'mia@example.com',
                password: 'password123',
                studyStats: { totalHours: 40, streak: 2 }
            }
        ]);

        // 3. Posts (Diverse content)
        await Post.deleteMany({});
        await Post.insertMany([
            {
                author: users[0]._id, // Alex
                content: "Finally mastered Dynamic Programming! The key was visualizing the sub-problems. If anyone needs help with DP, let me know!",
                tags: ["#ComputerScience", "#Algorithms", "#Win"],
                likes: 45,
                comments: 12,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                author: users[1]._id, // Sarah
                content: "MCAT prep is killing me 😭 but partially grateful for this study group. 4 hours down, 2 to go!",
                tags: ["#PreMed", "#StudyGrind", "#Motivation"],
                likes: 89,
                comments: 20,
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
                author: users[2]._id, // Jordan
                content: "Anyone have good resources for System Design interviews? I've gone through the primer but need more practice problems.",
                tags: ["#TechCareers", "#Resources", "#Help"],
                likes: 15,
                comments: 8,
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
            },
            {
                author: users[0]._id, // Alex again
                content: "Late night coding session... bugs don't fix themselves 🐛☕️",
                tags: ["#NightOwl", "#Coding"],
                likes: 32,
                comments: 4,
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            },
            {
                author: users[3]._id, // Mia
                content: "Just finished my Art History thesis draft! Time to celebrate with some sleep. 😴",
                tags: ["#ArtHistory", "#Thesis", "#Done"],
                likes: 67,
                comments: 15,
                createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000)
            }
        ]);

        // 4. Rooms
        await Room.deleteMany({});
        await Room.create({ roomId: 'cs-101', name: 'CS101 Algorithms', createdBy: users[0]._id });
        await Room.create({ roomId: 'med-study', name: 'Med School Grind 🩺', createdBy: users[1]._id });
        await Room.create({ roomId: 'lofi-chill', name: 'Lofi & Chill 🎧', createdBy: users[2]._id });
        await Room.create({ roomId: 'design-crew', name: 'Design Sprints', createdBy: users[3]._id });

        res.send('Database seeded successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Seeding failed: ' + err.message);
    }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/users', require('./routes/users'));
app.use('/api/explore', require('./routes/explore'));
app.use('/api/community', require('./routes/community'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/people', require('./routes/people'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/upload', require('./routes/upload'));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studyroom', {
    family: 4 // Force IPv4 to avoid some local connection issues
})
    .then(() => {
        console.log('MongoDB connected');
        mongoConnectionStatus.set(1);
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        mongoConnectionStatus.set(0);
        // Fallback for some local environments if 127.0.0.1 fails
        if (err.name === 'MongoServerSelectionError' && !process.env.MONGO_URI) {
            console.log('Retrying with localhost...');
            mongoose.connect('mongodb://localhost:27017/studyroom', { family: 4 })
                .then(() => {
                    console.log('MongoDB connected (fallback)');
                    mongoConnectionStatus.set(1);
                })
                .catch(e => {
                    console.error('Fallback failed:', e);
                    mongoConnectionStatus.set(0);
                });
        }
    });

// Track MongoDB disconnection events
mongoose.connection.on('disconnected', () => mongoConnectionStatus.set(0));
mongoose.connection.on('reconnected', () => mongoConnectionStatus.set(1));

// userId → socketId map for DM routing (persists across connections)
const userSocketMap = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    activeSocketConnections.inc();

    // Register user's socket ID so DMs can be routed
    socket.on('register-user', (userId) => {
        if (userId) userSocketMap[userId] = socket.id;
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('send-message', (data) => {
        io.to(data.roomId).emit('receive-message', data);
    });

    socket.on('call-user', (data) => {
        console.log(`[Server] Relaying call-user from ${data.from} to ${data.userToCall}`);
        io.to(data.userToCall).emit('call-user', { signal: data.signalData, from: data.from, name: data.name });
    });

    socket.on('answer-call', (data) => {
        console.log(`[Server] Relaying answer-call from ${socket.id} to ${data.to}`);
        io.to(data.to).emit('call-accepted', { signal: data.signal, id: socket.id, from: socket.id, name: data.name });
    });

    socket.on('send-changes', (delta) => {
        socket.broadcast.to(delta.roomId).emit('receive-changes', delta);
    });

    socket.on('whiteboard-draw', (data) => {
        socket.broadcast.to(data.roomId).emit('whiteboard-draw', data);
    });

    socket.on('toggle-media', ({ roomId, peerID, type, status }) => {
        socket.broadcast.to(roomId).emit('media-toggled', { peerID, type, status });
    });

    socket.on('whiteboard-clear', (roomId) => {
        socket.broadcast.to(roomId).emit('whiteboard-clear');
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        activeSocketConnections.dec();
        // Remove from DM routing map
        for (const [uid, sid] of Object.entries(userSocketMap)) {
            if (sid === socket.id) delete userSocketMap[uid];
        }
        socket.broadcast.emit('call-ended');
    });

    // --- Direct Messages ---
    socket.on('dm-send', async ({ toUserId, text, fromUserId, fileUrl, fileType, mimeType, originalName }) => {
        try {
            const DirectMessage = require('./models/DirectMessage');
            const msg = await DirectMessage.create({
                sender: fromUserId,
                receiver: toUserId,
                text: text || '',
                fileUrl: fileUrl || '',
                fileType: fileType || '',
                mimeType: mimeType || '',
                originalName: originalName || ''
            });
            const populated = await msg.populate('sender', 'username avatar');
            const recipientSocketId = userSocketMap[toUserId];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('dm-receive', populated);
            }
            socket.emit('dm-sent-confirm', populated);
        } catch (err) {
            console.error('DM socket error:', err);
        }
    });

    // --- Group Chat ---
    socket.on('group-join-room', (groupId) => {
        socket.join(`group:${groupId}`);
    });

    socket.on('group-leave-room', (groupId) => {
        socket.leave(`group:${groupId}`);
    });

    socket.on('group-message', async ({ groupId, text, fromUserId, fileUrl, fileType, mimeType, originalName }) => {
        try {
            const GroupMessage = require('./models/GroupMessage');
            const msg = await GroupMessage.create({
                group: groupId,
                sender: fromUserId,
                text: text || '',
                fileUrl: fileUrl || '',
                fileType: fileType || '',
                mimeType: mimeType || '',
                originalName: originalName || ''
            });
            const populated = await msg.populate('sender', 'username avatar');
            io.to(`group:${groupId}`).emit('group-message-receive', populated);
        } catch (err) {
            console.error('Group message error:', err);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
