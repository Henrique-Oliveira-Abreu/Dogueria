"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/firebaseclient';
import { useProdutos } from '@/hooks/usePedidosComProdutos';
import { addDoc, collection, getDocs } from 'firebase/firestore';

const FirebaseContext = createContext<any | undefined>(null);

export default function FirebaseProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const products = useProdutos();

  async function getAllCategories(): Promise<{ id: string; name: string }[]> {
    try {
      const categoriesCol = collection(db, 'categorias');
      const categoriesSnapshot = await getDocs(categoriesCol);
      const categories = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().nome,
      }));
      return categories;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }
async function saveOrder(order: any): Promise<string> {
    try {
      const orderData = {
        ...order,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orderRef = await addDoc(collection(db, 'pedidos'), orderData);
      return orderRef.id;
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      throw error;
    }
  }
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <FirebaseContext.Provider value={{ saveOrder, auth, db, loading, getAllProducts: () => products, getAllCategories }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase deve ser usado dentro de um FirebaseProvider');
  return context;
}
