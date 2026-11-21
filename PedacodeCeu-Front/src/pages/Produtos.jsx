import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listarProdutos, deletarProduto } from '../services/api';
import Paginacao from '../componentes/Paginacao';
import MensagemErro from '../componentes/MensagemErro';

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const location = useLocation();

  const buscarProdutos = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await listarProdutos(pagina, 10);
      setProdutos(resposta.dados);
      setTotalPaginas(resposta.meta.totalPaginas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setCarregando(false);
    }
  }, [pagina]);

  // Busca ao abrir a tela, ao trocar de página e ao voltar para esta rota (location.key muda a cada navegação).
  useEffect(() => {
    buscarProdutos();
  }, [buscarProdutos, location.key]);

  async function handleDeletar(id) {
    if (!window.confirm('Deseja excluir este produto?')) return;
    try {
      await deletarProduto(id);
      await buscarProdutos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  }

  return (
    <div className="pagina-crud">
      <div className="pagina-crud__topo">
        <h2>🍰 Produtos</h2>
        <Link to="/admin/produtos/novo">
          <button className="botao botao--primario" style={{ width: 'auto' }}>+ Novo Produto</button>
        </Link>
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
                <th>Descrição</th>
                <th>Preço</th>
                <th>Categoria</th>
                <th>Destaque</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.descricao}</td>
                    <td>R$ {Number(p.preco).toFixed(2).replace('.', ',')}</td>
                    <td>{p.categoria?.nome ?? p.categoriaId}</td>
                    <td>{p.destaque ? '⭐' : '—'}</td>
                    <td>{p.ativo ? '✅' : '❌'}</td>
                    <td>
                      <div className="tabela__acoes">
                        <Link to={`/admin/produtos/editar/${p.id}`}>
                          <button className="btn-sm btn-sm--editar">Editar</button>
                        </Link>
                        <button className="btn-sm btn-sm--deletar" onClick={() => handleDeletar(p.id)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}