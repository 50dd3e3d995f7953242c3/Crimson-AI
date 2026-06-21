const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GEMINI_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Conectar ao MongoDB
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("Conectado ao MongoDB com sucesso!"))
    .catch(err => console.error("Erro ao conectar ao MongoDB:", err));
} else {
  console.log("Aviso: MONGO_URI não configurada. O histórico não será salvo.");
}

// Criar o Modelo para salvar as conversas
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
    // ID fixo para testar a memória global do bot por enquanto
    const idUsuario = "gaster_default"; 

    // 1. Buscar histórico existente no banco
    let conversa = await Chat.findOne({ userId: idUsuario });
    if (!conversa) {
      conversa = new Chat({ userId: idUsuario, history: [] });
    }

    // 2. Adicionar a nova mensagem do usuário ao histórico
    conversa.history.push({ role: "user", parts: [{ text: userMessage }] });

    // 3. Disparar para o Gemini enviando TODO o histórico acumulado
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: conversa.history })
    });

    const d = await r.json();
    if (d.error) return res.json({ response: "Erro da Google: " + d.error.message });

    const botResponse = d.candidates[0].content.parts[0].text;

    // 4. Adicionar a resposta da IA ao histórico e salvar tudo no banco
    conversa.history.push({ role: "model", parts: [{ text: botResponse }] });
    await conversa.save();

    res.json({ response: botResponse });
  } catch (e) {
    res.json({ response: "Erro no código: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crimson AI ativa na porta ${PORT}`));
