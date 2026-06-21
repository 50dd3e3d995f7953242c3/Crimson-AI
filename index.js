const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GEMINI_KEY;
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("Conectado ao MongoDB com sucesso!"))
    .catch(err => console.error("Erro ao conectar ao MongoDB:", err));
} else {
  console.log("Aviso: MONGO_URI não configurada. O histórico não será salvo.");
}

const ChatSchema = new mongoose.Schema({
  userId: String,
  history: [{ role: String, parts: [{ text: String }] }]
});
const Chat = mongoose.model("Chat", ChatSchema);

app.post("/chat", async (req, res) => {
  try {
    if (!KEY) {
      return res.json({ response: "Erro: A variável GEMINI_KEY não foi configurada no servidor!" });
    }

    const userMessage = req.body.message;
    const idUsuario = "gaster_default"; 

    let conversa = await Chat.findOne({ userId: idUsuario });
    if (!conversa) {
      conversa = new Chat({ userId: idUsuario, history: [] });
    }

    conversa.history.push({ role: "user", parts: [{ text: userMessage }] });

    // 🔥 CORREÇÃO AQUI: Limpa os campos '_id' gerados pelo MongoDB para enviar um JSON puro para a Google
    const historicoLimpo = conversa.history.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => ({ text: p.text }))
    }));

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: historicoLimpo }) // Envia o histórico limpo
    });

    const d = await r.json();
    if (d.error) return res.json({ response: "Erro da Google: " + d.error.message });

    const botResponse = d.candidates[0].content.parts[0].text;

    conversa.history.push({ role: "model", parts: [{ text: botResponse }] });
    await conversa.save();

    res.json({ response: botResponse });
  } catch (e) {
    res.json({ response: "Erro no código: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crimson AI ativa na porta ${PORT}`));
