import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { Cookie } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-bloco">
          <h3>
            <Cookie size={24} color="#d2b48c" strokeWidth={2} />
            Pedaço do Céu
          </h3>
          <p>Doces artesanais feitos com carinho para adoçar o seu dia.</p>
        </div>

        <div className="footer-bloco">
          <h4>Navegação</h4>
          <Link to="/">Início</Link>
          <Link to="/sobre">Conheça a nossa empresa</Link>
          <Link to="/carrinho">Carrinho</Link>
        </div>

        <div className="footer-bloco">
          <h4>Acesso</h4>
          <Link to="/login">Login</Link>
          <Link to="/cadastro">Cadastrar</Link>
          <Link to="/adm/login">Login Administrador</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Desenvolvido por: Beatriz Gomes Santana e Francesco Gris</p>
      </div>
    </footer>
  );
}

export default Footer;