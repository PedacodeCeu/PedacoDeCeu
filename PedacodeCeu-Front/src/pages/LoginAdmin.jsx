import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validarEmail } from '../services/validacoes';
import { Lock } from 'lucide-react';
import CampoTexto from '../componentes/CampoTexto';
import MensagemErro from '../componentes/MensagemErro';

export default function LoginAdmin() {
  const { loginAdmin } = useAuth();
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
      await loginAdmin(email, senha);
      navigate('/');
    } catch (err) {
      setErroApi(err instanceof Error ? err.message : 'Acesso negado');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-auth">
      <div className="formulario-auth">
        <div className="admin-badge">
          <Lock color="#4b2c20" strokeWidth={4} size={24} />
          <h3>Área Administrativa</h3>
        </div>
        <MensagemErro mensagem={erroApi} />
        <CampoTexto
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
          placeholder="admin@email.com"
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
        <button
          className="btn-cadastrar"
          onClick={handleSubmit}
          disabled={carregando}
        >
          {carregando ? 'Entrando...' : 'Entrar como Administrador'}
        </button>
      </div>
    </div>
  );
}