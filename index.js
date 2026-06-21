const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const KEY = process.env.GEMINI_KEY;

app.post("/chat", async (req, res) => {
  try {
    if (!KEY) {
      return res.json({ response: "Erro: A variável GEMINI_KEY não foi configurada no servidor!" });
    }
    
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: req.body.message }] }] })
    });
    
    const d = await r.json();
    if (d.error) return res.json({ response: "Erro da Google: " + d.error.message });
    res.json({ response: d.candidates[0].content.parts[0].text });
  } catch (e) {
    res.json({ response: "Erro no código: " + e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crimson AI ativa na porta ${PORT}`));
