"use client";

import { useEffect, useState } from "react";
import ModalCadastrarProduto from "@/components/ModalCadastrarProduto";

export default function DashboardPage() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any>({
    totalPedidosDiario: 0,
    faturamentoDiario: 0,
    totalPedidosSemanal: 0,
    faturamentoSemanal: 0,
    totalPedidosMensal: 0,
    faturamentoMensal: 0,
  });

  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);
  const [abrirModal, setAbrirModal] = useState(false);

  // ------------------------------
  // FILTROS FINANCEIRO
  // ------------------------------
  const hoje = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");

  const [dataFiltro, setDataFiltro] = useState<string>(hoje.toISOString().split("T")[0]);

  // Corrigido – semana correta
  const semanaAtual = () => {
    const ano = hoje.getFullYear();
    const primeiroDiaAno = new Date(ano, 0, 1);
    const diff = hoje.getTime() - primeiroDiaAno.getTime();
    const dias = Math.floor(diff / 86400000);
    const semana = Math.ceil((dias + primeiroDiaAno.getDay() + 1) / 7);
    return `${ano}-W${pad(semana)}`;
  };

  const [semanaFiltro, setSemanaFiltro] = useState<string>(semanaAtual());

  // Corrigido – mês sempre no formato YYYY-MM
  const [mesFiltro, setMesFiltro] = useState<string>(
    `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`
  );

  // ------------------------------
  // CARREGAR PRODUTOS
  // ------------------------------
  const carregarProdutos = async () => {
    try {
      const res = await fetch("http://localhost:3001/produtos");
      const data = await res.json();
      if (Array.isArray(data)) setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
    setLoadingProdutos(false);
  };

  // ------------------------------
  // CARREGAR PEDIDOS
  // ------------------------------
  const carregarPedidos = async () => {
    try {
      const res = await fetch("http://localhost:3001/pedidos");
      const data = await res.json();
      const pedidosArray = Array.isArray(data) ? data : [];

      let pedidosRemovidos = JSON.parse(localStorage.getItem("pedidosRemovidos") || "[]");
      if (!Array.isArray(pedidosRemovidos)) pedidosRemovidos = [];

      setPedidos(pedidosArray.filter((p) => !pedidosRemovidos.includes(p.id_pedido)));
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    }
    setLoadingPedidos(false);
  };

  // ------------------------------
  // CARREGAR FINANCEIRO
  // ------------------------------
  const carregarFinanceiro = async () => {
    setLoadingFinanceiro(true);
    try {
      const res = await fetch(
        `http://localhost:3001/financeiro?data=${dataFiltro}&semana=${semanaFiltro}&mes=${mesFiltro}`
      );
      const data = await res.json();
      setFinanceiro(data);
    } catch (err) {
      console.error("Erro ao carregar financeiro:", err);
    }
    setLoadingFinanceiro(false);
  };

  // ------------------------------
  // USE EFFECT
  // ------------------------------
// UsaEffect principal
useEffect(() => {
  carregarProdutos();
  carregarPedidos();
  carregarFinanceiro();

  const interval = setInterval(() => carregarPedidos(), 5000);
  return () => clearInterval(interval);
}, []);

// Atualiza financeiro quando filtros mudam
useEffect(() => {
  carregarFinanceiro();
}, [dataFiltro, semanaFiltro, mesFiltro]);

// Atualiza financeiro automaticamente a cada 5s
useEffect(() => {
  const interval = setInterval(() => {
    carregarFinanceiro();
  }, 5000);

  return () => clearInterval(interval);
}, [dataFiltro, semanaFiltro, mesFiltro]);


  // ------------------------------
  // FUNÇÕES AUXILIARES
  // ------------------------------
  const removerPedidoDaTela = (id_pedido: number) => {
    setPedidos((prev) => prev.filter((p) => p.id_pedido !== id_pedido));
    let pedidosRemovidos = JSON.parse(localStorage.getItem("pedidosRemovidos") || "[]");
    if (!Array.isArray(pedidosRemovidos)) pedidosRemovidos = [];
    localStorage.setItem("pedidosRemovidos", JSON.stringify([...pedidosRemovidos, id_pedido]));
  };

  const excluirProduto = async (id_produto: number) => {
    if (!confirm("Deseja excluir este produto?")) return;
    try {
      const res = await fetch(`http://localhost:3001/produtos/${id_produto}`, { method: "DELETE" });
      if (res.ok) {
        await carregarProdutos();
        alert("Produto excluído!");
      } else alert("Erro ao excluir produto.");
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      alert("Erro ao excluir produto.");
    }
  };

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-12">

      {/* Pedidos Recebidos */}
      <section>
        <h1 className="text-3xl font-bold mb-6 text-center">Pedidos Recebidos</h1>
        {loadingPedidos ? (
          <p className="text-center text-lg">Carregando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-6">
            {pedidos.map((p) => (
              <div key={p.id_pedido} className="bg-white p-6 rounded-2xl shadow-md relative">
                <button
                  onClick={() => removerPedidoDaTela(p.id_pedido)}
                  className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                  title="Remover da visualização"
                >
                  🗑
                </button>

                <h2 className="text-xl font-bold mb-2">Pedido #{pedidos.indexOf(p) + 1}</h2>
                <p><strong>Cliente:</strong> {p.nome_cliente}</p>
                <p><strong>Telefone:</strong> {p.telefone}</p>
                <p><strong>Endereço:</strong> {p.rua} - {p.bairro}</p>
                <p>
                  <strong>Pagamento:</strong>{" "}
                  {p.forma_pagamento === 1 ? "Dinheiro" : p.forma_pagamento === 2 ? "Pix" : "Cartão"}
                </p>

                <h3 className="font-semibold mt-4 mb-1">Itens:</h3>
                <ul className="list-disc ml-6">
                  {p.itens.map((item: any, index: number) => (
                    <li key={index} className="mb-1">
                      {item.nome_produto} — qtd {item.quantidade}
                      {item.observacao && (
                        <p className="text-sm text-gray-500 ml-4">Observação: {item.observacao}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-lg">
                  Valor Total: R$ {Number(p.valor_total).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Produtos Cadastrados */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-6">Produtos Cadastrados</h1>
          <button
            onClick={() => setAbrirModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            Cadastrar Produto
          </button>
        </div>

        {loadingProdutos ? (
          <p className="text-center text-lg">Carregando produtos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {produtos.map((prod) => (
              <div
                key={prod.id_produto}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg p-6 transition-all relative"
              >
                <button
                  onClick={() => excluirProduto(prod.id_produto)}
                  className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                  title="Excluir produto"
                >
                  🗑
                </button>

                <h3 className="text-xl font-semibold text-gray-800">{prod.nome}</h3>
                <p className="text-gray-600 mt-2">{prod.descricao}</p>
                <p className="mt-3 text-red-600 font-bold text-lg">
                  R$ {Number(prod.valor).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{prod.categoria}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Financeiro */}
      <section className="space-y-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Financeiro</h1>

        {/* FILTROS */}
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block mb-1 font-semibold">Dia:</label>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Semana</label>
            <input
              type="week"
              value={semanaFiltro}
              onChange={(e) => setSemanaFiltro(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Mês </label>
            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>

        {loadingFinanceiro ? (
          <p className="text-center text-lg">Carregando financeiro...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="font-bold mb-2">Hoje ({dataFiltro})</h2>
              <p>Total de pedidos: {financeiro.totalPedidosDiario ?? 0}</p>
              <p>Faturamento: R$ {Number(financeiro.faturamentoDiario ?? 0).toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="font-bold mb-2">Esta Semana</h2>
              <p>Total de pedidos: {financeiro.totalPedidosSemanal ?? 0}</p>
              <p>Faturamento: R$ {Number(financeiro.faturamentoSemanal ?? 0).toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="font-bold mb-2">Este Mês ({mesFiltro})</h2>
              <p>Total de pedidos: {financeiro.totalPedidosMensal ?? 0}</p>
              <p>Faturamento: R$ {Number(financeiro.faturamentoMensal ?? 0).toFixed(2)}</p>
            </div>

          </div>
        )}
      </section>

      {/* Modal Cadastrar Produto */}
      {abrirModal && (
        <ModalCadastrarProduto
          fechar={() => setAbrirModal(false)}
          onProdutoCadastrado={async () => {
            await carregarProdutos();
            setAbrirModal(false);
          }}
        />
      )}
    </div>
  );
}
