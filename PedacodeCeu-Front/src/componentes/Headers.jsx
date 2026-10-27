import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../ativos/Logos/clara-transparente-img.png';
import { useAuth } from '../context/AuthContext';
import { useCarrinho } from '../context/CarrinhoContext';
import './Headers.css';

function Header() {
  const { usuario, logout } = useAuth();
  const { totalItens } = useCarrinho();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img src={logoImg} alt="Pedaço do Céu Logo" />
          <span>Pedaço do Céu</span>
        </Link>
      </div>

      <nav className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/sobre">Sobre</Link>

        {usuario ? (
          <>
            <Link to="/perfil">Olá, {usuario.nome.split(' ')[0]}</Link>
            <button className="btn-logout" onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/cadastro">Cadastrar</Link>
          </>
        )}

        <Link to="/carrinho" className="carrinho-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart-icon lucide-shopping-cart"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          {totalItens > 0 && (
            <span className="carrinho-badge">{totalItens}</span>
          )}
        </Link>
      </nav>
    </header>
  );
}

export default Header;