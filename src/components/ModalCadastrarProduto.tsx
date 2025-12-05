"use client";

import { useEffect, useState } from "react";

interface ModalCadastrarProdutoProps {
  fechar: () => void;
  onProdutoCadastrado: () => void;
}

export default function ModalCadastrarProduto({ fechar, onProdutoCadastrado }: ModalCadastrarProdutoProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState(""); // selecionada
  const [categorias, setCategorias] = useState<{ id_categoria: number; nome: string }[]>([]); // lista do banco
  const [loading, setLoading] = useState(false);

  // Carrega categorias do backend
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const res = await fetch("http://localhost:3001/categoria"); // endpoint que retorna todas as categorias
        const data = await res.json();
        if (Array.isArray(data)) setCategorias(data); // assume {id_categoria, nome} do backend
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      }
    };

    carregarCategorias();
  }, []);

  const cadastrarProduto = async () => {
    if (!nome || !descricao || !valor || !categoria) {
      alert("Preencha todos os campos!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          valor: Number(valor),
          id_categoria: Number(categoria), // envia como número
        }),
      });

      if (res.ok) {
        alert("Produto cadastrado com sucesso!");
        await onProdutoCadastrado(); // Atualiza lista no Dashboard
      } else {
        alert("Erro ao cadastrar produto.");
      }
    } catch (err) {
      console.error("Erro ao cadastrar produto:", err);
      alert("Erro ao cadastrar produto.");
    }

    setLoading(false);
    fechar();
    setNome("");
    setDescricao("");
    setValor("");
    setCategoria("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md relative">
        <button
          onClick={fechar}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold"
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold mb-4">Cadastrar Produto</h2>

        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <input
          type="text"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <input
          type="number"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />

        {/* Select de categorias existentes */}
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        >
          <option value="">Selecione a categoria</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nome}
            </option>
          ))}
        </select>

        <button
          onClick={cadastrarProduto}
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Cadastrando..." : "Cadastrar Produto"}
        </button>
      </div>
    </div>
  );
}
