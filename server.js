const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const _ = require('lodash');  // For utility functions

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const WIDTH = 800;
const HEIGHT = 600;

let players = [];
let food = [];
let ranking = [];

function generateFood() {
    food = [];
    for (let i = 0; i < 100; i++) {
        food.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT
        });
    }
}

function updateGame() {
    // Remove players who are too small or have disconnected
    players = players.filter(player => player.size > 5);

    // Check for collisions with food
    players.forEach(player => {
        food = food.filter(f => {
            if (Math.hypot(f.x - player.x, f.y - player.y) < player.size) {
                player.size += 1;  // Increase size when eating food
                player.score += 1; // Increase score
                return false;     // Remove food from array
            }
            return true;
        });
    });

    // Check for collisions between players
    players.forEach(player => {
        players.forEach(otherPlayer => {
            if (player.id !== otherPlayer.id && Math.hypot(otherPlayer.x - player.x, otherPlayer.y - player.y) < player.size) {
                if (player.size > otherPlayer.size) {
                    player.size += otherPlayer.size / 2; // Absorb the smaller player
                    player.score += otherPlayer.score;   // Add score
                    otherPlayer.size = 0;  // The smaller player is effectively removed
                } else {
                    otherPlayer.size += player.size / 2; // Absorb the smaller player
                    otherPlayer.score += player.score;   // Add score
                    player.size = 0;  // The smaller player is effectively removed
                }
            }
        });
    });

    // Update ranking
    ranking = _.sortBy(players, ['score']).reverse();

    io.emit('update', { players, food, ranking });
}

io.on('connection', (socket) => {
    console.log('A player connected');
    const newPlayer = {
        id: socket.id,
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: 10,
        score: 0,
        name: 'Player ' + socket.id
    };
    players.push(newPlayer);

    socket.on('move', (data) => {
        let player = players.find(p => p.id === socket.id);
        if (player) {
            player.x += data.dx;
            player.y += data.dy;
        }
    });

    socket.on('setName', (name) => {
        let player = players.find(p => p.id === socket.id);
        if (player) {
            player.name = name;
        }
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected');
        players = players.filter(p => p.id !== socket.id);
    });
});

generateFood();
setInterval(updateGame, 1000 / 30);  // Update game state at 30 FPS

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
