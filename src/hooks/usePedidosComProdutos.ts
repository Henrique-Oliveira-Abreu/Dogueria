import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseclient';
import { collection, onSnapshot, orderBy, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  criadoEm: any;
}

interface PedidoItem {
  productId: string;
  quantity: number;
  productName: string;
  adicionais?: { id: string; quantity: number; productName: string }[];
}

interface Pedido {
  id: string;
  nome: string;
  endereco: string;
  pagamento: string;
  total: number;
  criadoEm: any;
  itens: PedidoItem[];
  adicionais: { id: string; quantity: number; productName: string }[];
}

export function useProdutos() {
  const [produtos, setProdutos] = useState<Product[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(collection(db, 'categorias'));
        return categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().nome,
        })) as Category[];
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return [];
      }
    };

    const q = query(collection(db, 'produtos'), orderBy('criadoEm', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const categories = await fetchCategories();

      const productsData = snapshot.docs.map((doc) => {
        const productData = doc.data();
        const category = categories.find((cat) => cat.name === productData.categoria) || {
          id: 'unknown',
          name: productData.categoria || 'Sem Categoria',
        };

        return {
          id: doc.id,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          imageUrl: productData.imageUrl || '',
          category: {
            id: category.id,
            name: category.name,
          },
          criadoEm: productData.criadoEm,
        };
      });

      setProdutos(productsData);
    }, (error) => {
      console.error('Erro ao buscar produtos:', error);
    });

    return () => unsubscribe();
  }, []);

  return produtos;
}

export function usePedidosComProdutos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const produtos = useProdutos();

  useEffect(() => {
    const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pedidosData = snapshot.docs.map((doc) => {
        const pedidoData = doc.data();

        const itensComNome = (pedidoData.itens || []).map((item: any) => {
          const produto = produtos.find((p) => p.id === item.productId);
          return {
            ...item,
          };
        });

        const adicionaisComNome = (pedidoData.adicionais || []).map((add: any) => {
          const produto = produtos.find((p) => p.id === add.id);
          return {
            ...add,
          };
        });

        return {
          id: doc.id,
          ...pedidoData,
          itens: itensComNome,
          adicionais: adicionaisComNome,
        } as Pedido;
      });

      setPedidos(pedidosData);
    }, (error) => {
      console.error('Erro ao buscar pedidos:', error);
    });

    return () => unsubscribe();
  }, [produtos]);

  return pedidos;
}

export async function deleteProduto(id: string) {
  try {
    await deleteDoc(doc(db, 'produtos', id));
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    throw error;
  }
}

export async function updateProduto(id: string, updatedData: Partial<Product>) {
  try {
    const productRef = doc(db, 'produtos', id);
    await updateDoc(productRef, updatedData);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
}

export async function deleteCategoria(id: string) {
  try {
    await deleteDoc(doc(db, 'categorias', id));
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    throw error;
  }
}
