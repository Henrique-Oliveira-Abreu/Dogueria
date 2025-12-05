import express from "express";
import connection from "../db.js";


const router = express.Router();

// 🔹 Listar todos os produtos com o nome da categoria
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      p.id_produto, 
      p.nome, 
      p.valor,
      p.descricao, 
      c.nome AS categoria
    FROM produtos p
    JOIN categoria c ON p.id_categoria = c.id_categoria
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar produtos:", err);
      res.status(500).send("Erro no servidor");
      return;
    }
    res.json(results);
  });
});

// 🔹 Adicionar novo produto
router.post("/", (req, res) => {
  const { nome, descricao, valor, id_categoria } = req.body;

  const sql = `
    INSERT INTO produtos (nome, descricao, valor, id_categoria)
    VALUES (?, ?, ?, ?)
  `;
  const values = [nome, descricao, valor, id_categoria];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao inserir produto:", err);
      return res.status(500).json({ error: "Erro ao inserir produto" });
    }
    res.status(201).json({ message: "✅ Produto adicionado com sucesso!" });
  });
});

export default router;
