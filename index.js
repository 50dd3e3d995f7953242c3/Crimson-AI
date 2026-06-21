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

    if (userMessage.toLowerCase() === "clear") {
      if (MONGO_URI) {
        await Chat.deleteOne({ userId: idUsuario });
      }
      return res.json({ response: "Histórico antigo deletado com sucesso! Pode testar agora." });
    }

    let conversa = await Chat.findOne({ userId: idUsuario }).lean();
    
    if (!conversa) {
      conversa = { userId: idUsuario, history: [] };
    }

    conversa.history.push({ role: "user", parts: [{ text: userMessage }] });

    const docsParaGoogle = conversa.history.map(msg => ({
      role: String(msg.role),
      parts: msg.parts.map(p => ({ text: String(p.text) }))
    }));

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: docsParaGoogle })
    });

    const d = await r.json();
    if (d.error) return res.json({ response: "Erro da Google: " + d.error.message });

    const botResponse = d.candidates[0].content.parts[0].text;

    conversa.history.push({ role: "model", parts: [{ text: botResponse }] });
    
    await Chat.updateOne(
      { userId: idUsuario },
      { $set: { history: conversa.history } },
      { upsert: true }
    );

    res.json({ response: botResponse });
  } catch (e) {
    res.json({ response: "Erro no código: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crimson AI ativa na porta ${PORT}`));
