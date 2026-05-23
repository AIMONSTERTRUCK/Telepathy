const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

const rooms = {};

// ─── DeepL Translation ────────────────────────────────────────────────────────

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

// Detect whether the key is a Free-tier key (ends in ":fx") or Pro
function getDeepLEndpoint() {
    if (!DEEPL_API_KEY) return null;

    return DEEPL_API_KEY.endsWith(":fx")
        ? "https://api-free.deepl.com/v2/translate"
        : "https://api.deepl.com/v2/translate";
}

/**
 * Translates any word to English using DeepL.
 */
async function translateToEnglish(word) {
    const endpoint = getDeepLEndpoint();

    if (!endpoint) {
        return {
            translated: word.trim().toLowerCase(),
            original: word.trim()
        };
    }

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: [word.trim()],
                target_lang: "EN"
            })
        });

        if (!res.ok) {
            console.error(`DeepL error ${res.status}: ${await res.text()}`);

            return {
                translated: word.trim().toLowerCase(),
                original: word.trim()
            };
        }

        const data = await res.json();

        const translatedText =
            data.translations?.[0]?.text ?? word.trim();

        return {
            translated: translatedText.trim().toLowerCase(),
            original: word.trim()
        };

    } catch (err) {
        console.error("DeepL fetch failed:", err);

        return {
            translated: word.trim().toLowerCase(),
            original: word.trim()
        };
    }
}

// ─── Socket Logic ─────────────────────────────────────────────────────────────

io.on("connection", socket => {

    socket.on("joinRoom", ({ name, room }) => {

        socket.join(room);

        if (!rooms[room]) {
            rooms[room] = {
                players: [],
                submissions: [],
                usedWords: new Set()
            };
        }

        rooms[room].players.push({
            id: socket.id,
            name,
            submitted: false
        });

        io.to(room).emit("playerUpdate", rooms[room].players);
    });

    socket.on("submitWord", async ({ room, word }) => {

        const currentRoom = rooms[room];

        if (!currentRoom) return;

        const player = currentRoom.players.find(
            p => p.id === socket.id
        );

        if (!player || player.submitted) return;

        // Translate before duplicate check
        const { translated, original } =
            await translateToEnglish(word);

        // Prevent previously-used translated words
        if (currentRoom.usedWords.has(translated)) {
            socket.emit("duplicateWord");
            return;
        }

        player.submitted = true;

        currentRoom.submissions.push({
            id: socket.id,
            name: player.name,
            word: translated,
            display: original
        });

        io.to(room).emit("playerUpdate", currentRoom.players);

        checkRoundCompletion(room);
    });

    function checkRoundCompletion(room) {

        const currentRoom = rooms[room];

        if (!currentRoom) return;

        if (
            currentRoom.submissions.length ===
            currentRoom.players.length
        ) {
            endRound(room);
        }
    }

    function endRound(room) {

        const currentRoom = rooms[room];

        if (!currentRoom) return;

        io.to(room).emit("allWords", {
            words: currentRoom.submissions.map(sub => ({
                name: sub.name,
                word: sub.word,
                display: sub.display
            }))
        });

        const map = {};

        currentRoom.submissions.forEach(sub => {

            if (!map[sub.word]) {
                map[sub.word] = [];
            }

            map[sub.word].push(sub);
        });

        let winners = [];

        Object.values(map).forEach(group => {

            if (group.length >= 2) {
                winners.push(...group);
            }
        });

        io.to(room).emit("winners", winners);

        // Add translated words to used list
        currentRoom.submissions.forEach(sub => {
            currentRoom.usedWords.add(sub.word);
        });

        // Reset round
        currentRoom.submissions = [];

        currentRoom.players.forEach(player => {
            player.submitted = false;
        });

        io.to(room).emit("playerUpdate", currentRoom.players);
    }

    socket.on("disconnect", () => {

        for (const room in rooms) {

            const roomData = rooms[room];

            const leavingPlayer =
                roomData.players.find(
                    p => p.id === socket.id
                );

            if (!leavingPlayer) continue;

            // Remove submission
            roomData.submissions =
                roomData.submissions.filter(
                    s => s.id !== socket.id
                );

            // Remove player
            roomData.players =
                roomData.players.filter(
                    p => p.id !== socket.id
                );

            io.to(room).emit(
                "playerUpdate",
                roomData.players
            );

            // Prevent stuck rounds
            if (roomData.players.length > 0) {
                checkRoundCompletion(room);
            }

            // Delete empty room
            if (roomData.players.length === 0) {
                delete rooms[room];
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});