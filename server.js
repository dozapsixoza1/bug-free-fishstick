const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB подключение (замени на свой URI)
mongoose.connect('mongodb://localhost:27017/mychat', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Схемы
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    code: { type: String, unique: true } // Уникальный код пользователя
});
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    from: String,
    to: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Генерация уникального кода (простой пример, можно улучшить)
function generateCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Регистрация
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPw = await bcrypt.hash(password, 10);
        const code = generateCode();
        const user = new User({ username, password: hashedPw, code });
        await user.save();
        res.json({ success: true, code });
    } catch (err) {
        res.status(400).json({ error: 'Username taken or error' });
    }
});

// Логин (по username/password, возвращает code)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, code: user.code, username });
    } else {
        res.status(400).json({ error: 'Invalid credentials' });
    }
});

// Обновление кода (для админа или пользователя)
app.post('/update-code', async (req, res) => {
    const { username, newCode } = req.body; // Добавь auth для безопасности
    try {
        await User.updateOne({ username }, { code: newCode || generateCode() });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: 'Error updating code' });
    }
});

// Получить чаты/пользователей (для списка)
app.get('/users', async (req, res) => {
    const users = await User.find({}, 'username');
    res.json(users);
});

// Сообщения
app.get('/messages/:from/:to', async (req, res) => {
    const { from, to } = req.params;
    const messages = await Message.find({ $or: [{ from, to }, { from: to, to: from }] }).sort('timestamp');
    res.json(messages);
});

// Socket для реал-тайм
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('join', (username) => {
        socket.username = username;
    });

    socket.on('message', async (data) => {
        const { from, to, text } = data;
        const message = new Message({ from, to, text });
        await message.save();
        io.to(to).emit('message', data); // Отправить получателю
        io.to(from).emit('message', data); // Подтверждение отправителю
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
