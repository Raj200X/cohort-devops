import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';

import Logo from '../components/Logo';

const Home = () => {
    const [roomName, setRoomName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [rooms, setRooms] = useState([]);

    // Room Settings State
    const [roomPassword, setRoomPassword] = useState('');
    const [timerDuration, setTimerDuration] = useState('');
    const [expiryMinutes, setExpiryMinutes] = useState('60');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isTimerEnabled, setIsTimerEnabled] = useState(false);
    const [isExpiryEnabled, setIsExpiryEnabled] = useState(false);

    // Join Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState(null);
    const [joinPassword, setJoinPassword] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [dashboardData, setDashboardData] = useState({
        studyStats: { streak: 0, totalHours: 0 },
        joinedRooms: []
    });

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user?._id]); // ✅ Use primitive string ID, not the whole object



    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await api.get('/api/rooms');
            setRooms(res.data);
        } catch (err) {
            console.error('Error fetching rooms:', err);
        }
    };

    const createRoom = async () => {
        if (!roomName.trim()) return;
        try {
            const res = await api.post('/api/rooms/create', {
                name: roomName,
                password: isPrivate ? roomPassword : null,
                expiryMinutes: isExpiryEnabled ? parseInt(expiryMinutes) : null,
                settings: isTimerEnabled ? { timerDuration: parseInt(timerDuration) } : null
            });
            fetchRooms();
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create room');
        }
    };

    const handleJoinClick = (room) => {
        if (room.hasPassword) {
            setPendingRoomId(room.roomId);
            setShowPasswordModal(true);
        } else {
            joinRoom(room.roomId);
        }
    };

    const joinRoom = async (idOrEvent, password = null) => {
        const id = typeof idOrEvent === 'string' ? idOrEvent : roomId;
        if (!id?.trim()) return;

        try {
            const res = await api.post('/api/rooms/join', {
                roomId: id,
                password: password
            });
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                // If we tried to join via ID input without knowing it was private
                setPendingRoomId(id);
                setShowPasswordModal(true);
            } else {
                alert(err.response?.data?.message || 'Room not found or error joining');
            }
        }
    };

    const submitPassword = () => {
        joinRoom(pendingRoomId, joinPassword);
        setShowPasswordModal(false);
        setJoinPassword('');
        setPendingRoomId(null);
    };



    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 18) return 'Good Afternoon';
        if (hour >= 18 && hour < 22) return 'Good Evening';
        return 'Good Night';
    };

    if (!user) {
        // Landing Page UI (Guest)
        return (
            <div className="min-h-[calc(100vh-80px)]">
                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-32 flex flex-col md:flex-row items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="md:w-1/2 mb-12 md:mb-0 relative z-10"
                    >
                        <div className="inline-block px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-medium text-sm mb-6 shadow-sm">
                            🚀 Revolutionizing Collaborative Learning
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-tight tracking-tight font-display">
                            <span className="font-logo">Cohort</span> <br />
                            <span className="text-gradient">Master Your Studies Together</span>
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-lg leading-relaxed">
                            Join virtual study rooms, share resources, and ace your exams with real-time video, chat, and interactive whiteboards.
                        </p>
                        <div className="flex gap-4">
                            <Link to="/register" className="btn-primary px-8 py-4 rounded-full text-lg font-semibold shadow-lg shadow-indigo-500/30">
                                Get Started for Free
                            </Link>
                            <Link to="/login" className="px-8 py-4 rounded-full text-lg font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors shadow-sm">
                                Log In
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="md:w-1/2 flex justify-center relative"
                    >
                        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 dark:bg-purple-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob dark:opacity-100"></div>
                        <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:opacity-100"></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000 dark:opacity-100"></div>

                        <div className="relative glass-card p-8 rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-2xl">🎓</div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Study Session</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Active • 4 Members</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-64"></div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-48"></div>
                                <div className="flex gap-2 mt-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Features Section */}
                <div className="py-24 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 font-display">Everything you need to study effectively</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300">Powerful tools designed for modern students.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { title: "Virtual Study Rooms", icon: "📹", desc: "Real-time video and audio calls with screen sharing capabilities." },
                                { title: "Collaborative Notes", icon: "📝", desc: "Edit documents together in real-time with rich text formatting." },
                                { title: "Interactive Whiteboard", icon: "🎨", desc: "Draw diagrams, solve problems, and visualize concepts together." }
                            ].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass p-8 rounded-3xl hover:-translate-y-2 hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-3xl mb-6 text-white shadow-lg shadow-indigo-500/20">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display">{feature.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="py-20 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-y border-white/20 dark:border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            {[
                                { label: "Active Students", value: "10k+" },
                                { label: "Study Sessions", value: "50k+" },
                                { label: "Countries", value: "120+" },
                                { label: "Hours Studied", value: "1M+" }
                            ].map((stat, idx) => (
                                <div key={idx}>
                                    <div className="text-4xl md:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2 font-display">{stat.value}</div>
                                    <div className="text-gray-600 dark:text-gray-300 font-medium">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* How It Works Section */}
                <div className="py-24 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 font-display">How Cohort Works</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300">Start learning together in three simple steps.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {/* Connecting Line (Desktop) */}
                            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 -z-10"></div>

                            {[
                                { step: "01", title: "Create or Join", desc: "Start a new room or join an existing session with a simple code." },
                                { step: "02", title: "Collaborate", desc: "Use video, chat, and whiteboards to solve problems together." },
                                { step: "03", title: "Achieve", desc: "Track your progress and hit your study goals faster." }
                            ].map((item, idx) => (
                                <div key={idx} className="text-center bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white/40 shadow-sm">
                                    <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center text-xl font-bold text-indigo-600 shadow-md mb-6 border border-indigo-100">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display">{item.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Testimonials Section */}
                <div className="py-24 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 font-display">Loved by Students</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300">Join thousands of students achieving their goals.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { name: "Aarav Patel", role: "Computer Science Student", text: "Cohort changed how I prepare for my semester exams. The whiteboard feature is a game changer for explaining algorithms!" },
                                { name: "Priya Sharma", role: "Medical Student (NEET Pg)", text: "I found a dedicated study group for anatomy here. We meet every evening and keep each other accountable." },
                                { name: "Rohan Gupta", role: "JEE Aspirant", text: "The interface is so beautiful and easy to use. It actually makes me want to study more often for my entrance exams." }
                            ].map((testimonial, idx) => (
                                <div key={idx} className="glass-card p-8 rounded-3xl relative hover:shadow-xl transition-shadow duration-300">
                                    <div className="text-4xl text-indigo-200 absolute top-6 left-6 font-serif">"</div>
                                    <p className="text-gray-700 mb-6 relative z-10 pt-4 italic">{testimonial.text}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{testimonial.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2.5rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-display relative z-10">Ready to start your journey?</h2>
                            <p className="text-indigo-100 text-xl mb-10 max-w-2xl mx-auto relative z-10">Join Cohort today and experience the future of collaborative learning.</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                                <Link to="/register" className="px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg">
                                    Sign Up for Free
                                </Link>
                                <Link to="/login" className="px-8 py-4 bg-indigo-700/50 text-white border border-white/20 rounded-full font-bold text-lg hover:bg-indigo-700/70 transition-colors backdrop-blur-sm">
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="bg-white/50 dark:bg-white/5 backdrop-blur-md border-t border-gray-200 dark:border-white/10 pt-16 pb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-4 gap-12 mb-12">
                            <div className="col-span-1 md:col-span-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center shadow-md">
                                        <Logo className="w-8 h-8" />
                                    </div>
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white font-logo">Cohort</span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                    Making collaborative learning accessible, engaging, and effective for students worldwide.
                                </p>
                            </div>

                            <div className="hidden md:block"></div>
                            <div className="hidden md:block"></div>

                            <div>
                                <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li><Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                                    <li><Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                                    <li><Link to="/cookie-policy" className="hover:text-indigo-600 transition-colors">Cookie Policy</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-gray-500">© 2024 Cohort Inc. All rights reserved.</p>
                            <div className="flex gap-6">
                                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                    <span className="sr-only">Twitter</span>
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                                </a>
                                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                    <span className="sr-only">GitHub</span>
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // Dashboard UI (Logged-in)

    const fetchDashboardData = async () => {
        try {
            const res = await api.get(`/api/users/${user._id}/dashboard`);
            setDashboardData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 pt-24 md:p-8 md:pt-32">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-white font-display">{getGreeting()}, {user.username} 👋</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Ready to be productive today?</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Streak</p>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{dashboardData.studyStats?.streak || 0} Day</span>
                            <span className="text-2xl">🔥</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - 2 Cols */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Create/Join Room Card */}
                        <div className="glass p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 font-display relative z-10">Start a Session</h2>
                            <div className="grid md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Create a New Room</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Room Name"
                                            className="flex-1 px-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder-gray-400 dark:placeholder-gray-500"
                                            value={roomName}
                                            onChange={(e) => setRoomName(e.target.value)}
                                        />
                                        <button onClick={createRoom} className="btn-primary px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/20">
                                            Create
                                        </button>
                                    </div>

                                    {/* Advanced Settings Toggles */}
                                    <div className="flex flex-wrap gap-2 text-sm mt-3">
                                        <button
                                            onClick={() => setIsPrivate(!isPrivate)}
                                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isPrivate ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10'}`}
                                        >
                                            {isPrivate ? '🔒 Private' : '🔓 Public'}
                                        </button>
                                        <button
                                            onClick={() => setIsTimerEnabled(!isTimerEnabled)}
                                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isTimerEnabled ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10'}`}
                                        >
                                            {isTimerEnabled ? '⏱️ Timer On' : '⏱️ Timer Off'}
                                        </button>
                                        <button
                                            onClick={() => setIsExpiryEnabled(!isExpiryEnabled)}
                                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isExpiryEnabled ? 'bg-orange-500 text-white border-orange-500' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10'}`}
                                        >
                                            {isExpiryEnabled ? '💀 Expires' : '♾️ No Expiry'}
                                        </button>
                                    </div>

                                    {/* Conditional Inputs */}
                                    {(isPrivate || isTimerEnabled || isExpiryEnabled) && (
                                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            {isPrivate && (
                                                <input
                                                    type="password"
                                                    placeholder="Set Password"
                                                    className="px-4 py-2 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                    value={roomPassword}
                                                    onChange={(e) => setRoomPassword(e.target.value)}
                                                />
                                            )}
                                            {isTimerEnabled && (
                                                <input
                                                    type="number"
                                                    placeholder="Timer (mins)"
                                                    className="px-4 py-2 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                    value={timerDuration}
                                                    onChange={(e) => setTimerDuration(e.target.value)}
                                                />
                                            )}
                                            {isExpiryEnabled && (
                                                <select
                                                    className="px-4 py-2 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white text-sm"
                                                    value={expiryMinutes}
                                                    onChange={(e) => setExpiryMinutes(e.target.value)}
                                                >
                                                    <option value="30">Expires in 30 min</option>
                                                    <option value="60">Expires in 1 hour</option>
                                                    <option value="120">Expires in 2 hours</option>
                                                    <option value="240">Expires in 4 hours</option>
                                                    <option value="480">Expires in 8 hours</option>
                                                    <option value="1440">Expires in 24 hours</option>
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Join Existing Room</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Room ID"
                                            className="flex-1 px-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder-gray-400 dark:placeholder-gray-500"
                                            value={roomId}
                                            onChange={(e) => setRoomId(e.target.value)}
                                        />
                                        <button onClick={joinRoom} className="px-6 py-3 rounded-xl font-medium bg-white dark:bg-white/5 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors">
                                            Join
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent/Global Sessions */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 font-display">Active Rooms</h2>
                            <div className="space-y-4">
                                {rooms.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400">No active sessions. Create one to get started!</p>
                                ) : (
                                    rooms.map((room) => {
                                        // Compute live time-remaining for expiry badge
                                        const expiryMs = room.expiresAt ? new Date(room.expiresAt) - Date.now() : null;
                                        const expiryMins = expiryMs ? Math.max(0, Math.floor(expiryMs / 60000)) : null;
                                        const expirySecs = expiryMs ? Math.max(0, Math.floor((expiryMs % 60000) / 1000)) : null;
                                        const isCritical = expiryMins !== null && expiryMins < 10;
                                        const expiryLabel = expiryMins !== null
                                            ? expiryMins > 0
                                                ? `Expires in ${expiryMins}m ${expirySecs}s`
                                                : 'Expiring…'
                                            : null;

                                        return (
                                            <div key={room._id} className="glass p-5 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all group cursor-pointer flex justify-between items-center" onClick={() => handleJoinClick(room)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xl">
                                                        📹
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                                                            {room.name || 'Untitled Room'}
                                                            {room.hasPassword && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">🔒 Private</span>}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                                {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {room.participants?.length || 0} members
                                                            </p>
                                                            {expiryLabel && (
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                                    isCritical
                                                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
                                                                        : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                                                                }`}>
                                                                    ⏳ {expiryLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    Join
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - 1 Col */}
                    <div className="space-y-8">
                        {/* Progress Card */}
                        <div className="glass p-8 rounded-3xl flex flex-col items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/50 dark:from-white/5 to-transparent"></div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 self-start relative z-10">Today's Progress</h2>
                            {/* Dynamic SVG Progress Circle */}
                            <div className="relative w-48 h-48 mb-4 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    {/* Background Circle */}
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        className="text-indigo-50 dark:text-indigo-900/30 stroke-current"
                                        strokeWidth="12"
                                        fill="transparent"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        className="text-indigo-600 dark:text-indigo-500 stroke-current transition-all duration-1000 ease-out"
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 88}
                                        strokeDashoffset={2 * Math.PI * 88 - (Math.min(100, (dashboardData.studyStats?.totalHours || 0) * 10) / 100) * (2 * Math.PI * 88)}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-4xl font-bold text-gray-800 dark:text-white font-display">
                                        {Math.min(100, (dashboardData.studyStats?.totalHours || 0) * 10).toFixed(0)}%
                                    </span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mt-1">Goal: 10h</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 text-center relative z-10 font-medium">You've studied for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{dashboardData.studyStats?.totalHours || 0} hours</span>.</p>
                        </div>

                        {/* Study Groups (Joined Rooms) */}
                        <div className="glass p-6 rounded-3xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Your Groups</h2>
                                <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">View All</button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {dashboardData.joinedRooms && dashboardData.joinedRooms.length > 0 ? (
                                    dashboardData.joinedRooms.map((group, idx) => (
                                        <div key={idx} onClick={() => navigate(`/room/${group.roomId}`)} className="p-3 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform">
                                                {group.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{group.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 p-2">You haven't joined any groups yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1b2e] p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-white/10">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Enter Room Password</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This room is private. Please enter the password to join.</p>
                        <input
                            type="password"
                            autoFocus
                            placeholder="Password"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-4"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitPassword}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Join Room
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
