import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buscarProduto, urlDaImagem } from '../services/api';
import { useCarrinho } from '../context/CarrinhoContext';
import Avaliacoes from '../componentes/Avaliacoes';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adicionarItem } = useCarrinho();

  const [produto, setProduto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [adicionado, setAdicionado] = useState(false);

  useEffect(() => {
    async function buscar() {
      try {
        const data = await buscarProduto(id);
        setProduto(data);
      } catch {
        setProduto(null);
      } finally {
        setCarregando(false);
      }
    }
    buscar();
  }, [id]);

  function handleAdicionar() {
    adicionarItem(produto);
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  if (carregando) return <p style={{ padding: 30 }}>Carregando...</p>;
  if (!produto) return <p style={{ padding: 30 }}>Produto não encontrado.</p>;

  return (
    <div className="produto-detalhe-pagina">
      <div className="produto-detalhe">
        {produto.imagem && (
          <img src={urlDaImagem(produto.imagem)} alt={produto.nome} className="produto-detalhe-img" />
        )}

        <div className="produto-detalhe-info">
          <h1>{produto.nome}</h1>
          <p className="produto-detalhe-categoria">
            {produto.categoria?.nome ?? ''}
          </p>
          <p className="produto-detalhe-preco">
            R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
          </p>
          <p className="produto-detalhe-descricao">{produto.descricao}</p>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="card-button" onClick={() => navigate(-1)}>
              ← Voltar
            </button>
            <button className="card-button" onClick={handleAdicionar}>
              {adicionado ? '✅ Adicionado!' : '🛒 Adicionar ao carrinho'}
            </button>
          </div>
        </div>
      </div>

      <Avaliacoes produtoId={produto.id} />
    </div>
  );
}
