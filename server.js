const io = require("socket.io")(5000, {
  cors: { origin: "*" },
});

const fs = require("fs");
const path = require("path");


const questions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "questions.json"), "utf8")
);

const filePath = path.join(__dirname, "players.json");
const readPlayersFromFile = () => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writePlayersToFile = (players) => {
  fs.writeFileSync(filePath, JSON.stringify(players, null, 2), "utf8");
};

let players = readPlayersFromFile();
let questionIndex = 0;
let pendingAnswers = {}; 
let questionStartTime = Date.now(); 

io.on("connection", (socket) => {
  // console.log("New user connected:", socket.id);

socket.on("join", ({ name, avatar }) => {
  players.push({ id: socket.id, name, avatar, score: 0, totalTime: 0 });
  writePlayersToFile(players);
  io.emit("players", players);
});

  socket.on("startGame", () => {
    questionIndex = 0;
    questionStartTime = Date.now();
    const question = questions[questionIndex];
    
    io.emit("startGame", { 
        question: question.question, 
        options: question.options, 
        image: question.image || null, 
        audio: question.audio || null 
    });


  });

  socket.on("answer", ({ name, answer }) => {
    const currentTime = Date.now() - questionStartTime; 

    if (!pendingAnswers[name]) {
      pendingAnswers[name] = { answer, time: currentTime };
    } else {
      pendingAnswers[name].answer = answer;
      pendingAnswers[name].time = currentTime;
    }  
  });
  socket.on("nextQuestion", () => {
    let totalCorrect = 0;
    let totalWrong = 0;
    let playerAnswers = [];  // Danh sách câu trả lời của từng người chơi
    let correctAnswer = questions[questionIndex].correct; // Đáp án đúng của câu hỏi hiện tại

    players.forEach((player) => {
        let playerAnswer = pendingAnswers[player.name]?.answer || "Không trả lời"; // Lấy câu trả lời hoặc ghi nhận "Không trả lời"

        playerAnswers.push({
            name: player.name,
            answer: playerAnswer
        });

        if (playerAnswer === correctAnswer) {
            player.score += 1;
            player.totalTime = (player.totalTime || 0) + pendingAnswers[player.name].time;
            totalCorrect++;
        } else {
            totalWrong++;
        }
    });

    writePlayersToFile(players);
    io.emit("players", players);

    // Gửi thống kê cùng với câu trả lời đúng và câu trả lời của từng người chơi
    io.emit("questionStats", { 
        totalCorrect, 
        totalWrong, 
        correctAnswer, 
        playerAnswers 
    });

    pendingAnswers = {};

    if (questionIndex < questions.length - 1) {
      questionIndex++;
      questionStartTime = Date.now();
      
      // Gửi câu hỏi tiếp theo
      io.emit("nextQuestion", { 
          question: questions[questionIndex].question, 
          options: questions[questionIndex].options ,
          image: questions[questionIndex].image || "",  // Thêm image nếu có
          audio: questions[questionIndex].audio || ""  
      });
  } else {
      // Kết thúc quiz
      const topPlayers = [...players]
          .sort((a, b) => b.score - a.score || a.totalTime - b.totalTime)
          .slice(0, 3);
  
      io.emit("finish", { topPlayers });
  }
  
});
//
  

  socket.on("resetGame", () => {
    players = [];
    writePlayersToFile(players);
    questionIndex = 0;
    io.emit("resetGame");
    io.emit("players", players);
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    writePlayersToFile(players);
    io.emit("players", players);
  });
});
