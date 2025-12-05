"use client";

import { useCart, ProdutoComQtd } from "@/context/CartContext";
import { useState } from "react";

export default function CartModal() {
  const { cart, setCart, isOpen, toggleCart, clearCart } = useCart();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [pagamento, setPagamento] = useState("Dinheiro");

  if (!isOpen) return null;

  const total = cart.reduce((acc, item) => acc + item.valor * item.qtd, 0);

  const aumentarQtd = (id_produto: number) =>
    setCart(
      cart.map((item) =>
        item.id_produto === id_produto ? { ...item, qtd: item.qtd + 1 } : item
      )
    );

  const diminuirQtd = (id_produto: number) =>
    setCart(
      cart.map((item) =>
        item.id_produto === id_produto ? { ...item, qtd: Math.max(1, item.qtd - 1) } : item
      )
    );

  const removerItem = (id_produto: number) =>
    setCart(cart.filter((item) => item.id_produto !== id_produto));

  const handleObservacaoChange = (id_produto: number, value: string) =>
    setCart(
      cart.map((item) =>
        item.id_produto === id_produto ? { ...item, observacao: value } : item
      )
    );

  const finalizarPedido = async () => {
    if (!nome || !telefone || !rua || !bairro) {
      alert("Preencha todos os campos!");
      return;
    }

    const itens = cart.map((item: ProdutoComQtd) => ({
      id_produto: item.id_produto,
      quantidade: item.qtd,
      observacao: item.observacao || "",
    }));

    try {
      const res = await fetch("http://localhost:3001/finalizar-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_cliente: nome,
          telefone,
          rua,
          bairro,
          forma_pagamento: pagamento,
          itens,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Pedido finalizado com sucesso!");
        clearCart();
        toggleCart();
      } else {
        alert("Erro ao finalizar pedido.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-[90%] max-w-xl p-6 rounded-lg shadow-xl relative">
        <button
          onClick={toggleCart}
          className="absolute top-3 right-3 text-xl font-bold"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Carrinho</h2>

        <div className="space-y-3 mb-4">
          <input className="w-full border p-2 rounded" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="Rua" value={rua} onChange={e => setRua(e.target.value)} />
          <input className="w-full border p-2 rounded" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
          <select className="w-full border p-2 rounded" value={pagamento} onChange={e => setPagamento(e.target.value)}>
            <option>Dinheiro</option>
            <option>Pix</option>
            <option>Cartão</option>
          </select>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {cart.map(item => (
            <div key={item.id_produto} className="border p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <span>{item.nome} x{item.qtd} — R$ {(item.valor * item.qtd).toFixed(2)}{item.observacao ? ` | Obs: ${item.observacao}` : ""}</span>
                <button onClick={() => removerItem(item.id_produto)} className="text-red-600 font-bold">🗑</button>
              </div>

              <div className="flex gap-1 mb-1">
                <button onClick={() => diminuirQtd(item.id_produto)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">-</button>
                <button onClick={() => aumentarQtd(item.id_produto)} className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">+</button>
              </div>

              <input type="text" placeholder="Observação (opcional)" value={item.observacao || ""} onChange={e => handleObservacaoChange(item.id_produto, e.target.value)} className="w-full border p-1 rounded text-sm"/>
            </div>
          ))}
        </div>

        <p className="text-xl font-bold text-center mb-4">Total: R$ {total.toFixed(2)}</p>

        <button onClick={finalizarPedido} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-lg">Finalizar Pedido</button>
      </div>
    </div>
  );
}
