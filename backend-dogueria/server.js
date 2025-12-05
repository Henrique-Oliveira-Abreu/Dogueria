import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "ABREu1811@",
  database: "dogueria",
};

let connection;

async function connectDB() {
  connection = await mysql.createConnection(dbConfig);
  console.log("Conectado ao MySQL!");
}

async function startServer() {
  try {
    // Aguarda a conexão ANTES de iniciar o servidor
    await connectDB();

    app.listen(3001, () => {
      console.log("Servidor rodando em http://localhost:3001");
    });

  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
  }
}

startServer();


// ------------------------
// ROTAS
// ------------------------

app.get("/produtos", async (req, res) => {
  try {
    const [rows] = await connection.query(`
      SELECT p.id_produto, p.nome, p.descricao, p.valor, c.nome AS categoria
      FROM produtos p
      JOIN categoria c ON p.id_categoria = c.id_categoria
      ORDER BY p.id_produto
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

//pegar categorias
app.get("/categoria", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM categoria");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar categoria" });
  }
});

//rota cadastrar produtos
app.post("/produtos", async (req, res) => {
  const { nome, descricao, valor, id_categoria } = req.body;

  try {
    const sql = "INSERT INTO produtos (nome, descricao, valor, id_categoria) VALUES (?, ?, ?, ?)";
    await connection.query(sql, [nome, descricao, valor, id_categoria]);
    res.json({ message: "Produto cadastrado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

//rota financeiro
app.get("/financeiro", async (req, res) => {
  try {
    const { data, semana, mes } = req.query;

    const hoje = new Date();
    const dataFiltro = data || hoje.toISOString().split("T")[0];

    // -------------------------
    // SEMANA
    // -------------------------
    let inicioSemana;
    let fimSemana;

    if (semana) {
      const [anoStr, semanaStr] = semana.split("-W");
      const ano = parseInt(anoStr);
      const numSemana = parseInt(semanaStr);

      const primeiroDiaAno = new Date(ano, 0, 1);
      const diaSemanaPrimeiro = primeiroDiaAno.getDay() || 7;
      const diffDias = (numSemana - 1) * 7 - (diaSemanaPrimeiro - 1);

      const start = new Date(primeiroDiaAno);
      start.setDate(start.getDate() + diffDias);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      inicioSemana = start.toISOString().split("T")[0];
      fimSemana = end.toISOString().split("T")[0];
    } else {
      const diaSemana = hoje.getDay() || 7;
      const start = new Date(hoje);
      start.setDate(hoje.getDate() - diaSemana + 1);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      inicioSemana = start.toISOString().split("T")[0];
      fimSemana = end.toISOString().split("T")[0];
    }

    // -------------------------
    // MÊS
    // -------------------------
// -------------------------
// MÊS (CORRIGIDO)
// -------------------------
const mesFiltro =
  mes || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

const [anoMes, mesNumStr] = mesFiltro.split("-");
const mesNum = parseInt(mesNumStr);

// Primeiro dia do mês
const primeiroDiaMes = `${anoMes}-${mesNumStr}-01`;

// Último dia do mês (agora correto!)
const ultimoDiaMes = new Date(parseInt(anoMes), mesNum, 0)
  .toISOString()
  .split("T")[0];

    // -------------------------
    // FUNÇÃO GENÉRICA
    // -------------------------
    const buscarFinanceiro = async (whereClause, params) => {
      const [rows] = await connection.execute(
        `
        SELECT 
            COUNT(*) AS totalPedidos,
            SUM(CAST(valor_total AS DECIMAL(10,2))) AS faturamento
        FROM pedido
        WHERE ${whereClause}
        `,
        params
      );

      return rows[0] || { totalPedidos: 0, faturamento: 0 };
    };

    // -------------------------
    // CONSULTAS
    // -------------------------
    const diario = await buscarFinanceiro("DATE(data) = DATE(?)", [dataFiltro]);

    const semanal = await buscarFinanceiro(
      "DATE(data) BETWEEN DATE(?) AND DATE(?)",
      [inicioSemana, fimSemana]
    );

    const mensal = await buscarFinanceiro(
      "DATE(data) BETWEEN DATE(?) AND DATE(?)",
      [primeiroDiaMes, ultimoDiaMes]
    );

    // -------------------------
    // RESPOSTA
    // -------------------------
    res.json({
      totalPedidosDiario: diario.totalPedidos || 0,
      faturamentoDiario: diario.faturamento || 0,
      totalPedidosSemanal: semanal.totalPedidos || 0,
      faturamentoSemanal: semanal.faturamento || 0,
      totalPedidosMensal: mensal.totalPedidos || 0,
      faturamentoMensal: mensal.faturamento || 0,
    });

  } catch (err) {
    console.error("Erro ao buscar financeiro:", err);
    res.status(500).json({ error: "Erro ao buscar financeiro" });
  }
});




// Rota deletar produtos cadastrados 
// ------------------------
// EXCLUIR PRODUTO
// ------------------------
app.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await connection.execute(
      "DELETE FROM produtos WHERE id_produto = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto excluído com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir produto:", err);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

// ------------------------
// FINALIZAR PEDIDO
// ------------------------
app.post("/finalizar-pedido", async (req, res) => {
  const { nome_cliente, telefone, rua, bairro, forma_pagamento, itens } = req.body;

  try {
    const pagamentoMap = { "Dinheiro": 1, "Pix": 2, "Cartão": 3 };
    const pagamentoNumero = pagamentoMap[forma_pagamento] || 1;

    // 1 — Cliente
    let id_cliente;
    const [clienteExistente] = await connection.execute(
      `SELECT id_cliente FROM cliente WHERE nome = ? AND telefone = ? AND rua = ? AND bairro = ?`,
      [nome_cliente, telefone, rua, bairro]
    );

    if (clienteExistente.length > 0) {
      id_cliente = clienteExistente[0].id_cliente;
    } else {
      const [novoCliente] = await connection.execute(
        `INSERT INTO cliente (nome, telefone, rua, bairro) VALUES (?, ?, ?, ?)`,
        [nome_cliente, telefone, rua, bairro]
      );
      id_cliente = novoCliente.insertId;
    }

    // 2 — CALCULAR VALOR TOTAL DO PEDIDO
    let valor_total = 0;

    for (const item of itens) {
      // busca o valor atual no banco
      const [prod] = await connection.execute(
        `SELECT valor FROM produtos WHERE id_produto = ?`,
        [item.id_produto]
      );

      if (prod.length === 0) continue;

      const preco = Number(prod[0].valor);
      valor_total += preco * item.quantidade;
    }

    // Garante decimal válido
    valor_total = parseFloat(valor_total.toFixed(2));

    // 3 — Criar pedido SALVANDO valor_total
    const [pedidoResult] = await connection.execute(
      `INSERT INTO pedido (data, forma_pagamento, status, id_cliente, valor_total)
       VALUES (NOW(), ?, ?, ?, ?)`,
      [pagamentoNumero, 1, id_cliente, valor_total]
    );

    const id_pedido = pedidoResult.insertId;

    // 4 — Itens do pedido
    for (const item of itens) {
      await connection.execute(
        `INSERT INTO pedido_has_produtos (id_pedido, id_produto, quantidade, observacao)
         VALUES (?, ?, ?, ?)`,
        [id_pedido, item.id_produto, item.quantidade, item.observacao || null]
      );
    }

    res.json({ 
      success: true, 
      id_pedido, 
      valor_total,
      mensagem: `Pedido finalizado, ${nome_cliente}!` 
    });

  } catch (err) {
    console.error("Erro ao finalizar pedido:", err);
    res.status(500).json({ error: "Erro ao finalizar pedido" });
  }
});


// ------------------------
// LISTAR PEDIDOS (Dashboard)
// ------------------------

// ------------------------
// LISTAR PEDIDOS (Dashboard)
// ------------------------
app.get("/pedidos", async (req, res) => {
  try {
    const [pedidos] = await connection.execute(`
      SELECT 
        p.id_pedido,
        p.data,
        p.forma_pagamento,
        p.status,
        c.nome AS nome_cliente,
        c.telefone,
        c.rua,
        c.bairro
      FROM pedido p
      JOIN cliente c ON p.id_cliente = c.id_cliente
      ORDER BY p.id_pedido DESC
    `);

    for (let pedido of pedidos) {
      // Pega os itens
      const [itens] = await connection.execute(
        `SELECT php.quantidade, php.observacao, pr.nome AS nome_produto, pr.valor
         FROM pedido_has_produtos php
         JOIN produtos pr ON pr.id_produto = php.id_produto
         WHERE php.id_pedido = ?`,
        [pedido.id_pedido]
      );

      // Calcula valor total
      const valor_total = itens.reduce((sum, item) => sum + item.quantidade * item.valor, 0);

      pedido.itens = itens.map(item => ({
        ...item,
        observacao: item.observacao || ""
      }));
      pedido.valor_total = valor_total; // <-- adiciona valor total ao pedido
    }

    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});


