import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { listarCategorias, deletarCategoria } from '../services/api';
import { FolderOpen } from 'lucide-react';
import Paginacao from '../componentes/Paginacao';
import MensagemErro from '../componentes/MensagemErro';

export default function Categorias() {
  const location = useLocation();
  const [categorias, setCategorias] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
  buscar();
}, [pagina]);

useEffect(() => {
  buscar();
}, [location.key]);

  async function buscar() {
    setCarregando(true);
    setErro('');
    try {
      const res = await listarCategorias(pagina, 10);
      setCategorias(res.dados);
      setTotalPaginas(res.meta.totalPaginas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setCarregando(false);
    }
  }

  async function handleDeletar(id) {
    if (!window.confirm('Deseja excluir esta categoria?')) return;
    try {
      await deletarCategoria(id);
      await buscar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir categoria');
    }
  }

  return (
    <div className="pagina-crud">
      <div className="pagina-crud__topo">
        <h2><FolderOpen /> Categorias</h2>
        <Link to="/admin/categorias/nova">
          <button className="botao botao--primario" style={{ width: 'auto' }}>+ Nova Categoria</button>
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
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    Nenhuma categoria encontrada
                  </td>
                </tr>
              ) : (
                categorias.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>
                      <div className="tabela__acoes">
                        <Link to={`/admin/categorias/editar/${c.id}`}>
                          <button className="btn-sm btn-sm--editar">Editar</button>
                        </Link>
                        <button className="btn-sm btn-sm--deletar" onClick={() => handleDeletar(c.id)}>
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