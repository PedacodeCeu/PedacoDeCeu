import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validarEmail } from '../services/validacoes';
import CampoTexto from '../componentes/CampoTexto';
import Botao from '../componentes/Botao';
import MensagemErro from '../componentes/MensagemErro';
import { Cookie } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [carregando, setCarregando] = useState(false);

  function validar() {
    const novosErros = {};
    if (!email) novosErros.email = 'E-mail é obrigatório';
    else if (!validarEmail(email)) novosErros.email = 'E-mail inválido';
    if (!senha) novosErros.senha = 'Senha é obrigatória';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit() {
    setErroApi('');
    if (!validar()) return;
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setErroApi(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-auth">
      <div className="formulario-auth">
        <h2><Cookie size={24} color="#4b2c20" strokeWidth={2} /> Entrar</h2>
        <MensagemErro mensagem={erroApi} />
        <CampoTexto
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
          placeholder="seu@email.com"
        />
        <CampoTexto
          id="senha"
          label="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
          placeholder="Sua senha"
        />
        <Botao onClick={handleSubmit} carregando={carregando}>
          Entrar
        </Botao>
        <p>
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
