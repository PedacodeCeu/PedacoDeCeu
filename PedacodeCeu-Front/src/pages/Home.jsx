import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listarProdutos } from '../services/api';
import ProdutoCard from '../componentes/ProdutosCard';
import '../App.css';

export default function Home() {
  const { usuario } = useAuth();
  const [searchParams] = useSearchParams();
  const categoriaFiltro = searchParams.get('categoria');

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscar() {
      try {
        const res = await listarProdutos(1, 100);
        setProdutos(res.dados.filter((p) => p.ativo !== false));
      } catch {
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    }
    buscar();
  }, []);

  const produtosFiltrados = categoriaFiltro
    ? produtos.filter((p) => p.categoriaId === categoriaFiltro)
    : produtos;

  const destaques = categoriaFiltro
    ? produtosFiltrados.filter((p) => p.destaque).slice(0, 5)
    : produtos.filter((p) => p.destaque).slice(0, 5);

  return (
    <div className="home-container">
      <div className="hero-wrapper">
        <section className="hero-banner">
          <h1>Bem-vindo à Pedaço do Céu</h1>
          <p>
            {usuario
              ? `Olá, ${usuario.nome.split(' ')[0]}! Que bom ter você aqui.`
              : 'A doçura que faltava no seu dia está aqui.'}
          </p>
          <Link 
  to="/carrinho" 
  className="cta-button" 
  style={{display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content'}}
>
  Ver Carrinho 
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart-icon lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
</Link>
          </section>
      </div>

      <section className="destaques">
        <h2>
          {categoriaFiltro ? ' Destaques da Categoria ' : ' Produtos em Destaque '}
        </h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : destaques.length === 0 ? (
          <p style={{ color: '#999', marginTop: 20 }}>Nenhum produto em destaque nessa categoria.</p>
        ) : (
          <div className="destaques-grid">
            {destaques.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </section>

      <section className="destaques">
        <h2>
          {categoriaFiltro ? ' Produtos da Categoria' : ' Todos os Nossos Produtos'}
        </h2>
        {carregando ? (
          <p>Carregando...</p>
        ) : produtosFiltrados.length === 0 ? (
          <p style={{ color: '#999', marginTop: 20 }}>Nenhum produto encontrado.</p>
        ) : (
          <div className="destaques-grid">
            {produtosFiltrados.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}