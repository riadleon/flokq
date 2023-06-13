const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');

const mysql = require('mysql2');
const { promisify } = require('util');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'flameboxrain',
    database: 'chatroom',
});

const query = promisify(db.query).bind(db);

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL database');
});

app.use(express.json());
app.use(cors());

// Add CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.post('/api/join', async (req, res) => {
    const { username, room } = req.body;
    if (!username || !room) {
        return res.status(400).json({ error: 'Username and room are required' });
    }
    try {
        // Check if the user is already in the room
        const existingUser = await query('SELECT * FROM users WHERE username = ? AND room = ?', [username, room]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User already joined the room' });
        }
        // Add user to the room
        await query('INSERT INTO users SET ?', { username, room });
        res.json({ message: 'Joined room successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

app.post('/api/leave', async (req, res) => {
    const { username, room } = req.body;
    if (!username || !room) {
        return res.status(400).json({ error: 'Username and room are required' });
    }
    try {
        // Check if the user is in the room
        const existingUser = await query('SELECT * FROM users WHERE username = ? AND room = ?', [username, room]);
        if (existingUser.length === 0) {
            return res.status(400).json({ error: 'User is not in the room' });
        }
        // Remove user from the room
        await query('DELETE FROM users WHERE username = ? AND room = ?', [username, room]);
        res.json({ message: 'Left room successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to leave room' });
    }
});

app.post('/api/send', async (req, res) => {
    const { username, room, message } = req.body;
    if (!username || !room || !message) {
        return res.status(400).json({ error: 'Username, room, and message are required' });
    }
    try {
        // Check if the user is in the room
        const existingUser = await query('SELECT * FROM users WHERE username = ? AND room = ?', [username, room]);
        if (existingUser.length === 0) {
            return res.status(400).json({ error: 'User is not in the room' });
        }
        // Insert message into the database
        await query('INSERT INTO messages SET ?', { username, room, message });
        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        // Retrieve all messages from the database
        const messages = await query('SELECT * FROM messages ORDER BY id DESC LIMIT 10');
        res.json(messages.reverse());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
});

app.get('/api/rooms', async (req, res) => {
    try {
        // Retrieve all rooms from the database
        const rooms = await query('SELECT DISTINCT room FROM users');
        const roomNames = rooms.map((room) => room.room);
        res.json(roomNames);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve rooms' });
    }
});

let rooms = []; // Array to store rooms

app.post('/api/add-room', async (req, res) => {
    const { room } = req.body;

    // Check if the room already exists
    if (rooms.includes(room)) {
        return res.status(400).json({ error: 'Room already exists' });
    }

    try {
        // Add the room to the database
        await query('INSERT INTO rooms SET name = ?', [room]);
        rooms.push(room); // Add the room to the array
        res.status(200).json({ message: 'Room added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add room' });
    }
});


server.listen(8000, () => {
    console.log('Server is running on port 8000');
});
