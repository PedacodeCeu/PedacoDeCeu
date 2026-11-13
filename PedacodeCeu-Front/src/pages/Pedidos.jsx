import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import { listarPedidos, deletarPedido, editarPedido } from '../services/api'; 
import Paginacao from '../componentes/Paginacao';
import MensagemErro from '../componentes/MensagemErro';
import { Package } from 'lucide-react';

const STATUS_CORES = {
  pendente:   { bg: '#ed8936', label: 'Pendente' },
  confirmado: { bg: '#3182ce', label: 'Confirmado' },
  entregue:   { bg: '#38a169', label: 'Entregue' },
  cancelado:  { bg: '#e53e3e', label: 'Cancelado' },
};

export default function Pedidos() {
  const { usuario } = useAuth(); 
  const isAdmin = usuario?.role === 'admin'; 

  const [pedidos, setPedidos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { buscar(); }, [pagina]);

  async function buscar() {
    setCarregando(true);
    setErro('');
    try {
      const res = await listarPedidos(pagina, 10);
      setPedidos(res.dados);
      setTotalPaginas(res.meta.totalPaginas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setCarregando(false);
    }
  }

  async function handleDeletar(id) {
    if (!window.confirm('Deseja excluir este pedido?')) return;
    try {
      await deletarPedido(id);
      await buscar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir pedido');
    }
  }

  async function handleConfirmarEntrega(id) {
    if (!window.confirm('Confirmar que o pedido foi entregue?')) return;
    try {
      await editarPedido(id, { status: 'entregue' });
      await buscar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao confirmar entrega');
    }
  }

  return (
    <div className="pagina-crud">
      <div className="pagina-crud__topo">
        <h2><Package /> {isAdmin ? 'Todos os Pedidos' : 'Meus Pedidos'}</h2>
        {isAdmin && (
          <Link to="/pedidos/novo">
            <button className="botao botao--primario" style={{ width: 'auto' }}>+ Novo Pedido</button>
          </Link>
        )}
      </div>

      <MensagemErro mensagem={erro} />

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Status</th>
                <th>Total</th>
                <th>Itens</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => {
                  const cor = STATUS_CORES[p.status] ?? { bg: '#999', label: p.status };
                  return (
                    <tr key={p.id}>
                      <td>{p.usuario?.nome ?? p.usuarioId}</td>
                      <td>
                        <span style={{
                          background: cor.bg,
                          color: 'white',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}>
                          {cor.label}
                        </span>
                      </td>
                      <td>R$ {Number(p.total).toFixed(2).replace('.', ',')}</td>
                      <td>{p.itens?.length ?? '—'} {p.itens?.length === 1 ? 'item' : 'itens'}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="tabela__acoes">
                          {isAdmin ? (
                            <>
                              <Link to={`/pedidos/editar/${p.id}`}>
                                <button className="btn-sm btn-sm--editar">Editar</button>
                              </Link>
                              <button className="btn-sm btn-sm--deletar" onClick={() => handleDeletar(p.id)}>
                                Excluir
                              </button>
                            </>
                          ) : (
                            p.status === 'confirmado' && (
                              <button
                                className="btn-sm btn-sm--editar"
                                onClick={() => handleConfirmarEntrega(p.id)}
                              >
                                Confirmar Entrega
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}