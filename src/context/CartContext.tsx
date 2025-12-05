"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Produto básico
export interface Produto {
  id_produto: number;
  nome: string;
  descricao: string;
  valor: number;
  categoria: string;
}

// Produto no carrinho com quantidade e observação
export interface ProdutoComQtd extends Produto {
  qtd: number;
  observacao?: string;
}

interface CartContextType {
  cart: ProdutoComQtd[];
  setCart: React.Dispatch<React.SetStateAction<ProdutoComQtd[]>>;
  isOpen: boolean;
  addToCart: (produto: Produto, quantidade?: number) => void;
  aumentarQtd: (id_produto: number) => void;
  diminuirQtd: (id_produto: number) => void;
  removerItem: (id_produto: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  atualizarObservacao: (id_produto: number, observacao: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ProdutoComQtd[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = (produto: Produto, quantidade: number = 1) => {
    setCart(prev => {
      const existente = prev.find(p => p.id_produto === produto.id_produto);
      if (existente) {
        return prev.map(p =>
          p.id_produto === produto.id_produto
            ? { ...p, qtd: p.qtd + quantidade } // Mantém observação existente
            : p
        );
      } else {
        return [...prev, { ...produto, qtd: quantidade }];
      }
    });
  };

  const aumentarQtd = (id_produto: number) => {
    setCart(prev =>
      prev.map(p =>
        p.id_produto === id_produto ? { ...p, qtd: p.qtd + 1 } : p
      )
    );
  };

  const diminuirQtd = (id_produto: number) => {
    setCart(prev =>
      prev.map(p =>
        p.id_produto === id_produto
          ? { ...p, qtd: Math.max(1, p.qtd - 1) }
          : p
      )
    );
  };

  const removerItem = (id_produto: number) => {
    setCart(prev => prev.filter(p => p.id_produto !== id_produto));
  };

  const clearCart = () => setCart([]);

  const toggleCart = () => setIsOpen(prev => !prev);

  // Nova função para atualizar observação de um item
  const atualizarObservacao = (id_produto: number, observacao: string) => {
    setCart(prev =>
      prev.map(p =>
        p.id_produto === id_produto ? { ...p, observacao } : p
      )
    );
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        isOpen,
        addToCart,
        aumentarQtd,
        diminuirQtd,
        removerItem,
        clearCart,
        toggleCart,
        atualizarObservacao,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return ctx;
}
