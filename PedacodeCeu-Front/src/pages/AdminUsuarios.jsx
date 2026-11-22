import { useState, useEffect, useCallback } from 'react';
import MensagemErro from '../componentes/MensagemErro';
import { listarUsuarios, deletarUsuario, alterarRoleUsuario } from '../services/api';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [novoRole, setNovoRole] = useState('usuario');
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState('');

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const data = await listarUsuarios();
      setUsuarios(Array.isArray(data) ? data : data.dados ?? []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  async function handleDeletar(id) {
    if (!window.confirm('Deseja excluir este usuário?')) return;
    try {
      await deletarUsuario(id);
      await buscar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    }
  }

  function abrirModal(usuario) {
    setUsuarioSelecionado(usuario);
    setNovoRole(usuario.role ?? 'usuario');
    setErroModal('');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setUsuarioSelecionado(null);
  }

  async function handleSalvarRole() {
    if (!usuarioSelecionado) return;
    setSalvando(true);
    setErroModal('');
    try {
      await alterarRoleUsuario(usuarioSelecionado.id, novoRole);

      await buscar();
      fecharModal();
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pagina-crud">
      <div className="pagina-crud__topo">
        <h2>👥 Usuários</h2>
      </div>

      <MensagemErro mensagem={erro} />

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Perfil</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.cpf}</td>
                    <td>
                      <span
                        style={{
                          background: u.role === 'admin' ? '#4b2c20' : '#d2b48c',
                          color: u.role === 'admin' ? '#F3E9DC' : '#4b2c20',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td>
                      <div className="tabela__acoes">
                        <button
                          className="btn-sm btn-sm--editar"
                          onClick={() => abrirModal(u)}
                        >
                          Editar
                        </button>

                        {u.role !== 'admin' && (
                          <button
                            className="btn-sm btn-sm--deletar"
                            onClick={() => handleDeletar(u.id)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && usuarioSelecionado && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-caixa" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Perfil — {usuarioSelecionado.nome}</h3>
              <button className="modal-fechar" onClick={fecharModal}>✕</button>
            </div>

            <div className="modal-body">
              <MensagemErro mensagem={erroModal} />

              <div className="campo-grupo">
                <label className="campo-label">Tipo de usuário</label>
                <select
                  className="campo-input"
                  value={novoRole}
                  onChange={(e) => setNovoRole(e.target.value)}
                >
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  className="botao botao--secundario"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  className="botao botao--primario"
                  onClick={handleSalvarRole}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}