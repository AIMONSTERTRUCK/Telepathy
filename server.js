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

<<<<<<< HEAD
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
 * Returns the lowercase English translation, or the original word
 * (lowercased) if translation fails or the key is missing.
 */
async function translateToEnglish(word) {
    const endpoint = getDeepLEndpoint();
    if (!endpoint) {
        // No API key configured — skip translation
        return { translated: word.trim().toLowerCase(), original: word.trim() };
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
                // source_lang intentionally omitted so DeepL auto-detects
            })
        });

        if (!res.ok) {
            console.error(`DeepL error ${res.status}: ${await res.text()}`);
            return { translated: word.trim().toLowerCase(), original: word.trim() };
        }

        const data = await res.json();
        const translatedText = data.translations?.[0]?.text ?? word.trim();
        return {
            translated: translatedText.trim().toLowerCase(),
            original: word.trim()
        };

    } catch (err) {
        console.error("DeepL fetch failed:", err);
        return { translated: word.trim().toLowerCase(), original: word.trim() };
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
=======
io.on("connection", socket => {

    socket.on("joinRoom", ({name, room}) => {
        socket.join(room);

        if(!rooms[room]){
            rooms[room] = {
                players: [],
                submissions: [],
                usedWords: new Set() // ✅ stores past-round words only
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
            };
        }

        rooms[room].players.push({
            id: socket.id,
            name,
            submitted: false
        });

        io.to(room).emit("playerUpdate", rooms[room].players);
    });

<<<<<<< HEAD
    // submitWord is now async because translation awaits DeepL
    socket.on("submitWord", async ({ room, word }) => {
        const currentRoom = rooms[room];
        if (!currentRoom) return;

        const player = currentRoom.players.find(p => p.id === socket.id);
        if (!player || player.submitted) return;

        // Translate before any duplicate check or storage
        const { translated, original } = await translateToEnglish(word);

        // Only block words used in previous rounds (using the translated form)
        if (currentRoom.usedWords.has(translated)) {
=======
    socket.on("submitWord", ({room, word}) => {
        const currentRoom = rooms[room];
        if(!currentRoom) return;

        const player = currentRoom.players.find(p => p.id === socket.id);
        if(!player || player.submitted) return;

        const normalized = word.trim().toLowerCase();

        // ✅ ONLY blocks words from PREVIOUS rounds
        if(currentRoom.usedWords.has(normalized)){
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
            socket.emit("duplicateWord");
            return;
        }

        player.submitted = true;

        currentRoom.submissions.push({
            id: socket.id,
            name: player.name,
<<<<<<< HEAD
            word: translated,    // used for matching + ban list
            display: original    // shown to players in the UI
=======
            word: normalized
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
        });

        io.to(room).emit("playerUpdate", currentRoom.players);

        checkRoundCompletion(room);
    });

<<<<<<< HEAD
    function checkRoundCompletion(room) {
        const currentRoom = rooms[room];
        if (!currentRoom) return;

        if (currentRoom.submissions.length === currentRoom.players.length) {
=======
    function checkRoundCompletion(room){
        const currentRoom = rooms[room];
        if(!currentRoom) return;

        if(currentRoom.submissions.length === currentRoom.players.length){
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
            endRound(room);
        }
    }

<<<<<<< HEAD
    function endRound(room) {
        const currentRoom = rooms[room];
        if (!currentRoom) return;

        // Send each entry with both the original typed word and the translation
        io.to(room).emit("allWords", {
            words: currentRoom.submissions.map(s => ({
                name: s.name,
                word: s.word,      // English (matched form)
                display: s.display // original as typed
            }))
        });

        // Group by translated word to find matches
        const map = {};
        currentRoom.submissions.forEach(sub => {
            if (!map[sub.word]) map[sub.word] = [];
=======
    function endRound(room){
        const currentRoom = rooms[room];
        if(!currentRoom) return;

        io.to(room).emit("allWords", {
            words: currentRoom.submissions
        });

        const map = {};

        currentRoom.submissions.forEach(sub => {
            if(!map[sub.word]) map[sub.word] = [];
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
            map[sub.word].push(sub);
        });

        let winners = [];
<<<<<<< HEAD
        Object.values(map).forEach(group => {
            if (group.length >= 2) {
=======

        Object.values(map).forEach(group => {
            if(group.length >= 2){
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
                winners.push(...group);
            }
        });

        io.to(room).emit("winners", winners);

<<<<<<< HEAD
        // Ban the translated forms so they can't be reused in future rounds
=======
        // ✅ ADD WORDS TO BAN LIST AFTER ROUND (FIX!)
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
        currentRoom.submissions.forEach(sub => {
            currentRoom.usedWords.add(sub.word);
        });

<<<<<<< HEAD
        // Reset for next round
        currentRoom.submissions = [];
        currentRoom.players.forEach(p => (p.submitted = false));
=======
        // ✅ reset round only
        currentRoom.submissions = [];
        currentRoom.players.forEach(p => p.submitted = false);
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a

        io.to(room).emit("playerUpdate", currentRoom.players);
    }

    socket.on("disconnect", () => {
<<<<<<< HEAD
        for (const room in rooms) {
            const roomData = rooms[room];

            const leavingPlayer = roomData.players.find(p => p.id === socket.id);
            if (!leavingPlayer) continue;

            roomData.submissions = roomData.submissions.filter(s => s.id !== socket.id);
            roomData.players = roomData.players.filter(p => p.id !== socket.id);

            io.to(room).emit("playerUpdate", roomData.players);

            if (roomData.players.length > 0) {
                checkRoundCompletion(room);
            }

            if (roomData.players.length === 0) {
=======
        for(const room in rooms){

            const roomData = rooms[room];

            const leavingPlayer = roomData.players.find(p => p.id === socket.id);
            if(!leavingPlayer) continue;

            // remove submission
            roomData.submissions = roomData.submissions.filter(
                s => s.id !== socket.id
            );

            // remove player
            roomData.players = roomData.players.filter(
                p => p.id !== socket.id
            );

            io.to(room).emit("playerUpdate", roomData.players);

            // ✅ prevent stuck rounds
            if(roomData.players.length > 0){
                checkRoundCompletion(room);
            }

            // ✅ reset room entirely if empty (clears banned words)
            if(roomData.players.length === 0){
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
                delete rooms[room];
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
<<<<<<< HEAD
});
=======
});
>>>>>>> d8a09b5105dfeb45161709f166bd5ac0ba91004a
