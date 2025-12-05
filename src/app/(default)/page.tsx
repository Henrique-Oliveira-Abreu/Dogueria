"use client";

import { useState, useEffect } from "react";
import { useCart, ProdutoComQtd, Produto } from "@/context/CartContext";
import CartModal from "@/components/CartModal";
import { useRef } from "react"; // adicione no topo junto com outros imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faSquareInstagram } from "@fortawesome/free-brands-svg-icons";


export default function Cardapio() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");
  const { cart, setCart, toggleCart, clearCart } = useCart();
  const [quantidades, setQuantidades] = useState<{ [key: number]: number }>({});

// dentro do componente
const inicialCategoriaSetadaRef = useRef(false);

const carregarProdutos = async () => {
  try {
    const res = await fetch("http://localhost:3001/produtos");
    const data: Produto[] = await res.json();

    if (Array.isArray(data)) {
      setProdutos(data);

      const categoriasUnicas = Array.from(new Set(data.map((p) => p.categoria)));
      setCategorias(categoriasUnicas);

      // Só define a categoria inicial uma única vez (na primeira carga)
      if (!inicialCategoriaSetadaRef.current && categoriasUnicas.length > 0) {
        setCategoriaSelecionada(categoriasUnicas[0]);
        inicialCategoriaSetadaRef.current = true;
      }
    }
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
  }
};

// Atualizar produtos a cada 5 segundos (mas sem sobrescrever a categoria depois)
useEffect(() => {
  // carrega uma vez imediatamente
  carregarProdutos();

  const interval = setInterval(() => {
    carregarProdutos();
  }, 5000);

  return () => clearInterval(interval);
}, []); // vazia: o ref impede que redefinamos categoria posteriormente

  const handleQuantidadeChange = (id_produto: number, valor: number) => {
    setQuantidades((prev) => ({ ...prev, [id_produto]: Math.max(1, valor) }));
  };

  const addToCart = (produto: Produto) => {
    const qtd = quantidades[produto.id_produto] || 1;
    setCart((prev: ProdutoComQtd[]) => {
      const existente = prev.find((p) => p.id_produto === produto.id_produto);
      if (existente) {
        return prev.map((p) =>
          p.id_produto === produto.id_produto ? { ...p, qtd: p.qtd + qtd } : p
        );
      } else {
        return [...prev, { ...produto, qtd, observacao: "" }];
      }
    });
    setQuantidades((prev) => ({ ...prev, [produto.id_produto]: 1 }));
  };

  const produtosFiltrados = produtos.filter(
    (p) => p.categoria === categoriaSelecionada
  );

  if (!produtos || produtos.length === 0) return <p>Nenhum produto cadastrado.</p>;

return (
  <div className="p-4 relative">


    {/* MODAL DO CARRINHO */}
    <CartModal />

{/* BOX DO RESTAURANTE — BACKGROUND + FUNDO PRETO */}
<div
  className="w-full text-white relative rounded-2xl overflow-hidden mb-6 shadow-lg bg-black"
  style={{
    backgroundImage: `url(/imagens/produto1.jpeg)`,
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    height: "50vh",
    width: "100%",
  }}
>
  {/* Nome e endereço */}
  <div className="absolute top-2 left-4 flex flex-col gap-1">
    <h1 className="text-lg font-bold">Dogueria1516</h1>

    <p className="mt-0.5 flex items-center">
      <FontAwesomeIcon
        icon={faLocationDot}
        className="text-red-500 w-5 h-5 mr-2"
      />
      Avenida Paraibuna 350, CDHU
    </p>
  </div>

  {/* Redes sociais */}
  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
    <p className="flex items-center space-x-2">
      <FontAwesomeIcon icon={faWhatsapp} className="text-green-500" />
      <span>(11) 90000-0000</span>
    </p>

    <p className="flex items-center space-x-2">
      <FontAwesomeIcon icon={faSquareInstagram} className="text-pink-500" />
      <span>@dogueria1516</span>
    </p>
  </div>
</div>



    {/* MENU DE CATEGORIAS */}
    <div className="flex gap-2 overflow-x-auto py-2 px-1 mb-4 bg-gray-100 rounded-2xl shadow">
      {categorias.map((cat) => (
        <button
          key={cat}
          onClick={() => setCategoriaSelecionada(cat)}
          className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold transition ${
            cat === categoriaSelecionada
              ? "bg-red-600 text-white shadow-lg"
              : "bg-white hover:bg-gray-200"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>


    {/* LISTA DE PRODUTOS */}
    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BOTÃO ABRIR CARRINHO */}
    <button
      onClick={toggleCart}
      className="absolute top-2 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 z-50"
    >
      Carrinho ({cart.length})
    </button>

      {produtosFiltrados.map((prod) => (
        <div
          key={prod.id_produto}
          className="bg-white p-4 rounded shadow border border-gray-200 relative"
        >
          <h3 className="font-bold text-lg">{prod.nome}</h3>
          <p className="text-gray-600">{prod.descricao}</p>
          <p className="mt-2 font-semibold text-red-600">
            R$ {Number(prod.valor).toFixed(2)}
          </p>

          {/* CONTROLE DE QUANTIDADE */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() =>
                handleQuantidadeChange(
                  prod.id_produto,
                  (quantidades[prod.id_produto] || 1) - 1
                )
              }
              disabled={(quantidades[prod.id_produto] || 1) <= 1}
              className="w-10 h-10 flex justify-center items-center rounded-full bg-red-600 text-white text-xl hover:bg-red-700 disabled:bg-gray-400"
            >
              -
            </button>

            <input
              type="number"
              className="w-12 text-center border rounded"
              value={quantidades[prod.id_produto] || 1}
              onChange={(e) =>
                handleQuantidadeChange(
                  prod.id_produto,
                  parseInt(e.target.value)
                )
              }
            />

            <button
              onClick={() =>
                handleQuantidadeChange(
                  prod.id_produto,
                  (quantidades[prod.id_produto] || 1) + 1
                )
              }
              className="w-10 h-10 flex justify-center items-center rounded-full bg-red-600 text-white text-xl hover:bg-red-700"
            >
              +
            </button>
          </div>

          {/* BOTÃO ADICIONAR AO CARRINHO */}
          <button
            onClick={() => addToCart(prod)}
            className="mt-3 bg-red-600 w-full text-white py-2 rounded-lg hover:bg-red-700"
          >
            Adicionar ao Carrinho
          </button>
        </div>
      ))}

      {produtosFiltrados.length === 0 && (
        <p className="text-gray-500 col-span-full">
          Nenhum produto nesta categoria.
        </p>
      )}
    </div>

  </div>
);
}
