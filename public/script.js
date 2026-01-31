const socket = io();
let currentUser = null;
let currentChat = null;

// Auth
document.getElementById('register').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('code-display').innerText = `Твой новый код: ${data.code}`;
    } else {
        alert(data.error);
    }
});

document.getElementById('login').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        currentUser = data.username;
        document.getElementById('auth').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        socket.emit('join', currentUser);
        loadUsers();
    } else {
        alert(data.error);
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    currentChat = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth').style.display = 'block';
    document.getElementById('code-display').innerText = '';
});

// Обновить код
document.getElementById('update-code-btn').addEventListener('click', async () => {
    if (currentUser) {
        const newCode = prompt('Введите новый код (или оставьте пустым для авто-генерации):');
        const res = await fetch('/update-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, newCode })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Код обновлён: ${data.newCode}`);
        } else {
            alert(data.error);
        }
    }
});

// Загрузка пользователей
async function loadUsers() {
    const res = await fetch('/users');
    const users = await res.json();
    const list = document.getElementById('user-list');
    list.innerHTML = '';
    users.forEach(user => {
        if (user.username !== currentUser) {
            const item = document.createElement('div');
            item.classList.add('user-item');
            item.innerHTML = `<h4>${user.username}</h4>`;
            item.addEventListener('click', () => openChat(user.username));
            list.appendChild(item);
        }
    });
}

// Открытие чата
async function openChat(to) {
    currentChat = to;
    document.getElementById('chat-header').innerText = `Чат с ${to}`;
    const res = await fetch(`/messages/${currentUser}/${to}`);
    const messages = await res.json();
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.classList.add('message', msg.from === currentUser ? 'sent' : 'received');
        div.innerText = msg.text;
        div.setAttribute('data-time', new Date(msg.timestamp).toLocaleTimeString());
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
}

// Отправка сообщения
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('message-input');
    if (input.value && currentChat) {
        const data = { from: currentUser, to: currentChat, text: input.value };
        socket.emit('message', data);
        input.value = '';
    }
}

// Получение сообщений
socket.on('message', (data) => {
    if ((data.from === currentUser && data.to === currentChat) || (data.from === currentChat && data.to === currentUser)) {
        const div = document.createElement('div');
        div.classList.add('message', data.from === currentUser ? 'sent' : 'received');
        div.innerText = data.text;
        div.setAttribute('data-time', new Date().toLocaleTimeString());
        document.getElementById('chat-messages').appendChild(div);
        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    }
});
