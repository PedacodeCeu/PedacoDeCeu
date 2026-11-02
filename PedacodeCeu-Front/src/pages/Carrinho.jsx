import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../context/CarrinhoContext';
import { useAuth } from '../context/AuthContext';
import { criarPedido } from '../services/api';
import { ShoppingCart } from 'lucide-react';

export default function Carrinho() {
  const { itens, total, alterarQuantidade, removerItem, limparCarrinho } = useCarrinho();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  async function handleFinalizar() {
    if (!usuario) {
      navigate('/login');
      return;
    }

    try {
      await criarPedido({
        usuarioId: usuario.id,
        itens: itens.map((i) => ({ produtoId: i.id, quantidade: i.quantidade })),
      });
      limparCarrinho();
      navigate('/pedidos');
    } catch (err) {
      alert(err.message || 'Erro ao finalizar pedido');
    }
  }

  if (itens.length === 0) {
    return (
      <div className="carrinho-vazio">
        <span>
          <ShoppingCart size={96} color="#4b2c20" strokeWidth={2} />
        </span>
        <h2>Seu carrinho está vazio</h2>
        <p>Adicione produtos para continuar</p>
        <button className="card-button" onClick={() => navigate('/')}>
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="pagina-carrinho">
      <h2>🛒 Meu Carrinho</h2>

      <div className="carrinho-lista">
        {itens.map((item) => (
          <div key={item.id} className="carrinho-item">
            {item.imagem && (
              <img src={item.imagem} alt={item.nome} className="carrinho-item-img" />
            )}
            <div className="carrinho-item-info">
              <h3>{item.nome}</h3>
              <p>R$ {Number(item.preco).toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="carrinho-item-qtd">
              <button onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}>−</button>
              <span>{item.quantidade}</span>
              <button onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}>+</button>
            </div>
            <p className="carrinho-item-subtotal">
              R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
            </p>
            <button className="btn-sm btn-sm--deletar" onClick={() => removerItem(item.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="carrinho-rodape">
        <p className="carrinho-total">
          Total: <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="botao botao--secundario" style={{ width: 'auto' }} onClick={limparCarrinho}>
            Limpar carrinho
          </button>
          <button className="botao botao--primario" style={{ width: 'auto' }} onClick={handleFinalizar}>
            {usuario ? 'Finalizar pedido' : 'Login para finalizar'}
          </button>
        </div>
      </div>
    </div>
  );
}