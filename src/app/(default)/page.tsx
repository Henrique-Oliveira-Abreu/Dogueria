"use client";
import { useFirebase } from '@/context/FirebaseContext';
import { useEffect, useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useProdutos } from '@/hooks/usePedidosComProdutos';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareInstagram } from '@fortawesome/free-brands-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';


// Informações do estabelecimento
const establishmentInfo = {
  name: 'Dogueria1516', 
  address: 'Avenida Paraibuna 350, CDHU',
  whatsapp: '(12) 99166-6536',
  instagram: '@dogueria1516',
  image: 'url(/imagens/produto1.jpeg)',
};

// Interfaces para tipagem
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

interface OrderItem {
  productId: string;
  quantity: number;
  adicionais: { id: string; quantity: number }[];
}

interface Adicional {
  id: string;
  name: string;
  price: number;
}

const adicionaisDisponiveis: Adicional[] = [
  { id: '1', name: 'Queijo, Presunto, Ovo', price: 2 },
  { id: '2', name: 'Bacon, Calabresa, Frango, Cheddar, Catupiry', price: 4 },
  { id: '3', name: 'Hamburguer', price: 3 },
];

export default function Cardapio() {
  const { saveOrder } = useFirebase();
  const products = useProdutos();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>({});
  const [adicionais, setAdicionais] = useState<{ [productId: string]: { [addId: string]: number } }>({});
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showResumo, setShowResumo] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pagamento, setPagamento] = useState('Dinheiro');
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Rastreia se os dados foram carregados

  const changeQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const newQty = (prev[productId] || 0) + delta;
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const changeAdicional = (productId: string, addId: string, delta: number) => {
    setAdicionais((prev) => {
      const current = prev[productId] || {};
      const newQty = (current[addId] || 0) + delta;
      if (newQty <= 0) {
        const { [addId]: _, ...rest } = current;
        return { ...prev, [productId]: rest };
      }
      return { ...prev, [productId]: { ...current, [addId]: newQty } };
    });
  };

  const addToCart = (productId: string) => {
    const quantity = quantities[productId] || 0;
    if (quantity === 0) return;
    const itemAdicionais = Object.entries(adicionais[productId] || {}).map(([id, quantity]) => ({
      id,
      quantity,
    }));
    setOrder((prev) => [...prev, { productId, quantity, adicionais: itemAdicionais }]);
    setQuantities((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
    setAdicionais((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };
  const removerItemDoCarrinho = (index: number) => {
  const novoCarrinho = [...order];
  novoCarrinho.splice(index, 1);
  setOrder(novoCarrinho);
};

  const totalProdutos = order.reduce((acc, item) => acc + item.quantity, 0);
  const totalAdicionais = order.reduce(
    (acc, item) =>
      acc +
      item.adicionais.reduce((sum, add) => {
        const adicional = adicionaisDisponiveis.find((a) => a.id === add.id);
        return sum + (adicional ? adicional.price * add.quantity : 0);
      }, 0),
    0
  );
  const totalPedido = order.reduce((acc, item) => {
    const produto = products.find((p) => p.id === item.productId);
    const totalProduto = produto ? produto.price * item.quantity : 0;
    const totalAdicional = item.adicionais.reduce((sum, add) => {
      const adicional = adicionaisDisponiveis.find((a) => a.id === add.id);
      return sum + (adicional ? adicional.price * add.quantity : 0);
    }, 0);
    return acc + totalProduto + totalAdicional;
  }, 0);

  const finalizarPedido = async () => {
    if (!nome || !endereco) {
      alert('Por favor, preencha nome e endereço.');
      return;
    }

    const itensDetalhados = order.map((item) => {
      const produto = products.find((p) => p.id === item.productId);
      const adicionaisDetalhados = item.adicionais.map((add) => {
        const adicional = adicionaisDisponiveis.find((a) => a.id === add.id);
        return {
          id: add.id,
          nome: adicional?.name || 'Desconhecido',
          quantidade: add.quantity,
        };
      });

      return {
        produtoId: item.productId,
        nome: produto?.name || 'Desconhecido',
        quantidade: item.quantity,
        adicionais: adicionaisDetalhados,
      };
    });

    const pedido = {
      nome,
      endereco,
      pagamento,
      criadoEm: Timestamp.now(),
      itens: itensDetalhados,
      total: totalPedido + 3,
    };

    try {
      await saveOrder(pedido);
      alert(`Pedido enviado com sucesso! Obrigado, ${nome}.`);
      setOrder([]);
      setShowResumo(false);
      setNome('');
      setEndereco('');
      setPagamento('Dinheiro');
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      alert('Erro ao enviar pedido. Tente novamente.');
    }
  };

  useEffect(() => {
    // Marca que os dados foram carregados após a primeira busca
    setDataLoaded(true);

    if (products.length === 0) {
      // Se não houver produtos, define loading como false e categorias como vazio
      setCategories([]);
      setSelectedCategory(null);
      setLoading(false);
      return;
    }

    const uniqueCategoriesMap = new Map<string, Category>();
    products.forEach((product) => {
      if (product.category && product.category.id) {
        uniqueCategoriesMap.set(product.category.id, {
          id: product.category.id,
          name: product.category.name,
        });
      }
    });
    const uniqueCategories = Array.from(uniqueCategoriesMap.values());
    setCategories(uniqueCategories); // Manter a ordem original dos produtos

    if (uniqueCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(uniqueCategories[0].id);
    }

    setLoading(false);
  }, [products, selectedCategory]);

  // Exibe "Carregando..." apenas durante a busca inicial
  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <p className="text-xl font-semibold text-gray-600">Carregando...</p>
      </div>
    );
  }

  // Se não houver produtos, exibe as informações do restaurante
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center justify-center">
        <div
  className="bg-[#121212] text-white p-4 shadow w-full relative"
  style={{
    backgroundImage: `url(/imagens/produto1.jpeg)`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '55vh',
    width: '100%',
  }}
>
  <div className="absolute top-4 left-4 flex flex-col gap-0.15">
    <h1 className="text-2xl font-bold">{establishmentInfo.name}</h1>
    <p className="mt-2 flex items-center">
      <FontAwesomeIcon icon={faLocationDot} className="text-red-500 w-5 h-5 mr-2" />
      {establishmentInfo.address}
    </p>
    </div>
    <div className="absolute bottom-4 right-4 flex flex-col gap-0.15">
    <p className="mt-1 flex items-center space-x-2">
  <FontAwesomeIcon icon={faWhatsapp} className="text-green-500" />
  <span>{establishmentInfo.whatsapp}</span>
</p>
<p className="mt-1 flex items-center space-x-2">
  <FontAwesomeIcon icon={faSquareInstagram} className="text-pink-500" />
  <span>{establishmentInfo.instagram}</span>
</p>

  </div>
</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] font-sans">
      <div
  className="bg-[#121212] text-white relative"
style={{
    backgroundImage: `url(/imagens/produto1.jpeg)`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '55vh',
    width: '100%',
  }}
>
  <div className="absolute top-4 left-4 flex flex-col gap-0.15">
    <h1 className="text-2xl font-bold">{establishmentInfo.name}</h1>
    <p className="mt-2 flex items-center">
      <FontAwesomeIcon icon={faLocationDot} className="text-red-500 w-5 h-5 mr-2" />
      {establishmentInfo.address}
    </p>
    </div>
    <div className="absolute bottom-4 right-4 flex flex-col gap-0.15">
    <p className="mt-1 flex items-center space-x-2">
  <FontAwesomeIcon icon={faWhatsapp} className="text-green-500" />
  <span>{establishmentInfo.whatsapp}</span>
</p>
<p className="mt-1 flex items-center space-x-2">
  <FontAwesomeIcon icon={faSquareInstagram} className="text-pink-500" />
  <span>{establishmentInfo.instagram}</span>
</p>

  </div>
</div>
      

      <div className="flex space-x-4 overflow-x-auto p-4 bg-white border-b">
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold ${
              selectedCategory === cat.id ? 'bg-[#ff3d00] text-white' : 'bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {products
          ?.filter((p) => p.category?.id === selectedCategory)
          ?.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-gray-600">{product.description}</p>
              <p className="text-lg font-bold text-[#f44336]">R$ {product.price.toFixed(2)}</p>
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => changeQuantity(product.id, -1)}
                  className="w-8 h-8 rounded-full bg-[#ff7043] text-white text-lg"
                >
                  -
                </button>
                <span>{quantities[product.id] || 0}</span>
                <button 
                  onClick={() => changeQuantity(product.id, 1)}
                  className="w-8 h-8 rounded-full bg-[#ff7043] text-white text-lg"
                >
                  +
                </button>
              </div>
              {/* Exibe adicionais apenas se a categoria não for Bebidas) */}
              {product.category.name !== 'Bebidas' && (quantities[product.id] || 0) >= 1 && (
                <div className="mt-2">
                  <p className="font-semibold text-[#f44336]">Adicionais:</p>
                  {adicionaisDisponiveis.map((add) => (
                    <div key={add.id} className="flex items-center justify-between text-sm">
                      <span>
                        {add.name} (R$ {add.price.toFixed(2)})
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => changeAdicional(product.id, add.id, -1)}
                          className="w-6 h-6 rounded-full bg-[#ff8a65] text-white"
                        >
                          -
                        </button>
                        <span>{adicionais[product.id]?.[add.id] || 0}</span>
                        <button
                          onClick={() => changeAdicional(product.id, add.id, 1)}
                          className="w-6 h-6 rounded-full bg-[#ff8a65] text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => addToCart(product.id)}
                className="mt-2 w-full px-4 py-2 bg-[#ff3d00] text-white rounded-full font-bold hover:bg-[#e53935]"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          ))}
      </div>

      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowResumo(true)}
          className="px-6 py-3 bg-[#ff3d00] text-white rounded-full shadow-xl hover:bg-[#e53935] font-bold"
        >
          Ver Carrinho ({totalProdutos})
        </button>
      </div>

      {showResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-11/12 md:w-3/4 lg:w-1/2 p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
            <h2 className="text-2xl font-bold mb-4 text-[#f44336]">Resumo do Pedido</h2>
            {order.length === 0 ? (
              <p className="text-center text-gray-500">Seu carrinho está vazio.</p>
            ) : (
              <>
                <div className="mt-4 space-y-2">
                <input
                  type="text"
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border p-2 rounded mb-2"
                />

                <input
                  type="text"
                  placeholder="Endereço"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full border p-2 rounded mb-2"
                />

                  <select
                    value={pagamento}
                    onChange={(e) => setPagamento(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito ou Débito">Cartão de Crédito ou Débito</option>
                    <option value="Pix">Pix</option>
                  </select>
                  {pagamento === 'Pix' && (
                    <div className="text-sm text-blue-600">
                      <p>Chave Pix: (12) 991207763</p>
                      <p>Encaminhe o comprovante Pix no WhatsApp</p>
                    </div>
                  )}
                </div>
{order.map((item, index) => {
  const produto = products.find((p) => p.id === item.productId);
  return (
    <div key={index} className="border-b pb-2 mb-2 flex justify-between items-start">
      <div>
        <h3 className="font-bold">{produto?.name || 'Produto desconhecido'}</h3>
        <p>{produto?.description || 'Sem descrição'}</p>
        <p>
          Qtd: {item.quantity} x R$ {produto?.price.toFixed(2) || '0.00'} = R${' '}
          {(produto ? produto.price * item.quantity : 0).toFixed(2)}
        </p>
        {item.adicionais.length > 0 && (
          <div className="ml-4">
            <p>Adicionais:</p>
            {item.adicionais.map((add) => {
              const adicional = adicionaisDisponiveis.find((a) => a.id === add.id);
              return (
                <p key={add.id}>
                  {add.quantity}x {adicional?.name || 'Desconhecido'} (R${' '}
                  {adicional?.price.toFixed(2) || '0.00'})
                </p>
              );
            })}
          </div>
        )}
      </div>
      <button
onClick={() => removerItemDoCarrinho(index)}
          className="text-red-500 hover:text-red-700 text-xl ml-4"
        >
          🗑️ 
        </button>
      </div>
    );
  })}

                <div className="mt-4 font-bold">
                  <p> Entrega R$ 3.00 </p>
                  <p>Total: R$ {(totalPedido + 3).toFixed(2)} (c/ entrega)</p>
                </div>
              </>
            )}
            <button
              onClick={() => setShowResumo(false)}
              className="absolute top-4 right-4 px-2 py-1 bg-[#f44336] text-white rounded-full hover:bg-[#e53935]"
            >
              Fechar
            </button>
            {order.length > 0 && (
              <button
                onClick={finalizarPedido}
                className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700"
              >
                Finalizar Pedido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
