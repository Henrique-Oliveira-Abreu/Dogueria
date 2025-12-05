import { useEffect, useState } from "react";

export interface Produto {
  id_produto: number;
  nome: string;
  descricao: string;
  valor: number;
  categoria: string;
}

export function useProdutosMysql() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const res = await fetch("http://localhost:3001/produtos");
        if (!res.ok) {
          throw new Error(`Erro HTTP: ${res.status}`);
        }

        const data = await res.json();

        const produtosFormatados: Produto[] = data.map((p: any) => ({
          id_produto: p.id_produto,
          nome: p.nome,
          descricao: p.descricao,
          valor: Number(p.valor) || 0,
          categoria: p.categoria,
        }));

        console.log(
          "PRODUTOS VINDOS DO MYSQL (formatados):",
          produtosFormatados
        ); // <-- AQUI ✔

        setProdutos(produtosFormatados);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, []);

  return { produtos, loading };
}
