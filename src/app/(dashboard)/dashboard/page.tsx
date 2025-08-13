"use client";
import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseclient';
import { useProdutos, updateProduto, deleteProduto, deleteCategoria, } from '@/hooks/usePedidosComProdutos';

interface Category {
  id: string;
  name: string;
}

interface Produto {
  name: string;
  description: string;
  price: number;
  categoria: string;
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
  criadoEm: Timestamp;
  itens: PedidoItem[];
  adicionais: { id: string; quantity: number; productName: string }[];
}

interface ProdutoComId extends Produto {
  id: string;
  criadoEm?: Timestamp;
  category: Category;
}

export default function Dashboard() {
  const produtos = useProdutos();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [showEdicaoModal, setShowEdicaoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState<{ id: string; name: string }[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoProduto, setNovoProduto] = useState<Produto>({
    name: '',
    description: '',
    price: 0,
    categoria: '',
  });
  const [produtoEditando, setProdutoEditando] = useState<ProdutoComId | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<File | null>(null);

  useEffect(() => {
    const fetchCategorias = async () => {
      const snapshot = await getDocs(collection(db, 'categorias'));
      const categoriasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().nome,
      }));
      setCategorias(categoriasData);
    };

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
        return {
          id: doc.id,
          ...pedidoData,
          itens: itensComNome,
          criadoEm: pedidoData.criadoEm || Timestamp.now(),
        } as Pedido;
      });
      setPedidos(pedidosData);
      console.log('Pedidos atualizados:', pedidosData);
    }, (error) => {
      console.error('Erro ao buscar pedidos:', error);
      alert('Erro ao carregar pedidos. Verifique o console para mais detalhes.');
    });

    fetchCategorias();

    return () => unsubscribe();
  }, [produtos]);

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const excluirPedido = async (id: string) => {
    const confirm = window.confirm('Tem certeza que deseja excluir este pedido?');
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'pedidos', id));
      alert('Pedido excluído com sucesso.');
      // O estado pedidos será atualizado automaticamente pelo onSnapshot
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      alert('Erro ao excluir pedido. Verifique o console para mais detalhes.');
    }
  };

  const excluirProduto = async (id: string) => {
    const confirm = window.confirm('Tem certeza que deseja excluir este produto?');
    if (!confirm) return;

    setIsLoading(true);
    try {
      await deleteProduto(id);
      alert('Produto excluído com sucesso.');
      // O hook useProdutos deve atualizar a lista automaticamente
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const excluirCategoria = async (id: string) => {
    const confirm = window.confirm('Tem certeza que deseja excluir esta categoria? Isso pode afetar produtos associados.');
    if (!confirm) return;

    setIsLoading(true);
    try {
      const produtosSnapshot = await getDocs(collection(db, 'produtos'));
      const produtosAssociados = produtosSnapshot.docs.filter((doc) => doc.data().categoria === categorias.find(cat => cat.id === id)?.name);
      if (produtosAssociados.length > 0) {
        alert('Não é possível excluir esta categoria, pois existem produtos associados a ela.');
        return;
      }

      await deleteCategoria(id);
      setCategorias((prev) => prev.filter((cat) => cat.id !== id));
      alert('Categoria excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCadastrarProduto = async () => {
    const categoriaFinal = novaCategoria.trim() || novoProduto.categoria;

    if (
      !novoProduto.name ||
      !novoProduto.description ||
      isNaN(novoProduto.price) ||
      novoProduto.price <= 0 ||
      !categoriaFinal
    ) {
      alert('Preencha todos os campos corretamente.');
      return;
    }

    setIsLoading(true);
    try {
      let categoriaId = categorias.find((cat) => cat.name === categoriaFinal)?.id;
      if (novaCategoria.trim()) {
        const novaCategoriaRef = await addDoc(collection(db, 'categorias'), {
          nome: novaCategoria.trim(),
          criadoEm: Timestamp.now(),
        });
        categoriaId = novaCategoriaRef.id;
        setCategorias((prev) => [...prev, { id: novaCategoriaRef.id, name: novaCategoria.trim() }]);
      }

      await addDoc(collection(db, 'produtos'), {
        name: novoProduto.name,
        description: novoProduto.description,
        price: Number(novoProduto.price),
        categoria: categoriaFinal,
        criadoEm: Timestamp.now(),
      });

      alert('Produto cadastrado com sucesso!');
      setShowCadastroModal(false);
      setNovoProduto({ name: '', description: '', price: 0, categoria: '' });
      setNovaCategoria('');
      setImagemSelecionada(null);
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      alert('Erro ao cadastrar produto. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarProduto = async () => {
    if (!produtoEditando) return;

    const categoriaFinal = novaCategoria.trim() || produtoEditando.categoria;

    if (
      !produtoEditando.name ||
      !produtoEditando.description ||
      isNaN(produtoEditando.price) ||
      produtoEditando.price <= 0 ||
      !categoriaFinal
    ) {
      alert('Preencha todos os campos corretamente.');
      return;
    }

    setIsLoading(true);
    try {
      let categoriaId = categorias.find((cat) => cat.name === categoriaFinal)?.id;
      if (novaCategoria.trim()) {
        const novaCategoriaRef = await addDoc(collection(db, 'categorias'), {
          nome: novaCategoria.trim(),
          criadoEm: Timestamp.now(),
        });
        categoriaId = novaCategoriaRef.id;
        setCategorias((prev) => [...prev, { id: novaCategoriaRef.id, name: novaCategoria.trim() }]);
      }

      await updateProduto(produtoEditando.id, {
        name: produtoEditando.name,
        description: produtoEditando.description,
        price: Number(produtoEditando.price),
        categoria: categoriaFinal,

      });

      alert('Produto atualizado com sucesso!');
      setShowEdicaoModal(false);
      setProdutoEditando(null);
      setNovaCategoria('');
      setImagemSelecionada(null);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalEdicao = (produto: ProdutoComId) => {
    setProdutoEditando(produto);
    setShowEdicaoModal(true);
    setNovaCategoria('');
    setImagemSelecionada(null);
  };

  const order = [...pedidos].sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Pedidos Recentes</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowCadastroModal(true)}
          disabled={isLoading}
        >
          Cadastrar Produto
        </button>
      </div>

      <ul className="flex flex-wrap gap-4">

        {order.map((pedido) => (
          <div key={pedido.id} className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 m-4 w-1/3">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Detalhes do Pedido</h2>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Informações Gerais</h3>
              <p><span className="font-medium">ID do Pedido:</span> {pedido.id}</p>
              <p><span className="font-medium">Cliente:</span> {pedido.nome}</p>
              <p><span className="font-medium">Data:</span> {formatDate(pedido.criadoEm)}</p>
              <p><span className="font-medium">Total:</span> R$ {pedido.total?.toFixed(2)}</p>
              <p><span className="font-medium">Endereço:</span> {pedido.endereco}</p>
              <p><span className="font-medium">Pagamento:</span> {pedido.pagamento}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Itens do Pedido</h3>
              {pedido.itens?.map((item, index) => (
                <div key={index} className="border-b py-2">
                  <p className="font-medium">{item.nome} (x{item.quantidade})</p>
                  <p className="text-sm text-gray-600">ID do Produto: {item.productId}</p>
                  {item.adicionais?.length > 0 && (
                    <div className="ml-4">
                      <p className="text-sm font-medium">Adicionais:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {item.adicionais.map((adicional) => (
                          <li key={adicional.id}>
                            {adicional.nome} (x{adicional.quantidade})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => excluirPedido(pedido.id)}
              className="text-red-600 hover:text-red-800"
              disabled={isLoading}
            >
              Excluir Pedido
            </button>
          </div>
        ))}
      </ul>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Produtos Cadastrados</h2>
        
          <ul className="flex flex-wrap gap-4">
          {produtos.map((produto) => (
            <li key={produto.id} className="mb-2 p-4 border rounded bg-white shadow relative w-1/5">
              <p>
                <strong>Nome:</strong> {produto.name}
              </p>
              <p>
                <strong>Descrição:</strong> {produto.description}
              </p>
              <p>
                <strong>Categoria:</strong> {produto.category.name}
              </p>
              <p>
                <strong>Preço:</strong> R$ {produto.price.toFixed(2)}
              </p>
              {produto.criadoEm && (
                <p>
                  <strong>Criado em:</strong>{' '}
                  {produto.criadoEm.toDate().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
              )}
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={() => abrirModalEdicao(produto)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Editar produto"
                  disabled={isLoading}
                >
                  ✏️
                </button>
                <button
                  onClick={() => excluirProduto(produto.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Excluir produto"
                  disabled={isLoading}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Categorias Cadastradas</h2>
        <ul className="flex flex-wrap gap-4">
          {categorias.map((categoria) => (
            <li key={categoria.id} className="mb-2 p-4 border rounded bg-white shadow relative w-1/5">
              <p>
                <strong>Nome:</strong> {categoria.name}
              </p>
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={() => excluirCategoria(categoria.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Excluir categoria"
                  disabled={isLoading}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showCadastroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-all">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative animate-fadeIn">
            <h3 className="text-lg font-bold mb-4">Cadastrar Novo Produto</h3>

            <input
              type="text"
              placeholder="Nome do produto"
              className="w-full border p-2 mb-2 rounded"
              value={novoProduto.name}
              onChange={(e) => setNovoProduto({ ...novoProduto, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Descrição"
              className="w-full border p-2 mb-2 rounded"
              value={novoProduto.description}
              onChange={(e) => setNovoProduto({ ...novoProduto, description: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              className="w-full border p-2 mb-2 rounded"
              value={novoProduto.price || 0}
              onChange={(e) => {
                const newPrice = parseFloat(e.target.value) || 0;
                setNovoProduto({ ...novoProduto, price: newPrice });
              }}
            />
            <select
              className="w-full border p-2 mb-2 rounded"
              value={novoProduto.categoria}
              onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Ou crie nova categoria"
              className="w-full border p-2 mb-2 rounded"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
            />

            <button
              className="bg-green-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
              onClick={handleCadastrarProduto}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
              onClick={() => {
                setShowCadastroModal(false);
                setImagemSelecionada(null);
              }}
              disabled={isLoading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showEdicaoModal && produtoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-all">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative animate-fadeIn">
            <h3 className="text-lg font-bold mb-4">Editar Produto</h3>

            <input
              type="text"
              placeholder="Nome do produto"
              className="w-full border p-2 mb-2 rounded"
              value={produtoEditando.name}
              onChange={(e) =>
                setProdutoEditando({ ...produtoEditando, name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Descrição"
              className="w-full border p-2 mb-2 rounded"
              value={produtoEditando.description}
              onChange={(e) =>
                setProdutoEditando({ ...produtoEditando, description: e.target.value })
              }
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              className="w-full border p-2 mb-2 rounded"
              value={produtoEditando.price || 0}
              onChange={(e) => {
                const newPrice = parseFloat(e.target.value) || 0;
                setProdutoEditando({ ...produtoEditando, price: newPrice });
              }}
            />
            <select
              className="w-full border p-2 mb-2 rounded"
              value={produtoEditando.categoria}
              onChange={(e) =>
                setProdutoEditando({ ...produtoEditando, categoria: e.target.value })
              }
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Ou crie nova categoria"
              className="w-full border p-2 mb-2 rounded"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
            />
            <button
              className="bg-green-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
              onClick={handleEditarProduto}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
              onClick={() => {
                setShowEdicaoModal(false);
                setProdutoEditando(null);
                setImagemSelecionada(null);
              }}
              disabled={isLoading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}