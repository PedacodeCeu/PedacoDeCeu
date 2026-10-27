import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { House, Package, User, ClipboardList, FolderOpen, Users } from 'lucide-react';
import { listarCategorias } from '../services/api';
import './Sidebar.css';

const ICONE = { size: 18, strokeWidth: 1.75 };

function Sidebar() {
  const { usuario, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    buscar();
  }, []);

  async function buscar() {
    try {
      const res = await listarCategorias(1, 100);
      setCategorias(res.dados);
    } catch {}
  }

  function handleCategoria(categoriaId) {
    navigate(`/?categoria=${categoriaId}`);
  }

  return (
    <aside className="sidebar">
      <h2 className="sidebar-titulo">Categorias</h2>
      <ul className="sidebar-lista">
        <li className="sidebar-item">
          <NavLink to="/" end>
            <House {...ICONE} /> Início
          </NavLink>
        </li>

        {categorias.length > 0 && (
          <>
            <li className="sidebar-separador" />
            {categorias.map((cat) => (
              <li key={cat.id} className="sidebar-item">
                <button className="sidebar-btn" onClick={() => handleCategoria(cat.id)}>
                  {cat.nome}
                </button>
              </li>
            ))}
          </>
        )}

        {usuario && (
          <>
            <li className="sidebar-separador" />
            <li className="sidebar-item">
              <NavLink to="/pedidos">
                <Package {...ICONE} /> Meus Pedidos
              </NavLink>
            </li>
            <li className="sidebar-item">
              <NavLink to="/perfil">
                <User {...ICONE} /> Meu Perfil
              </NavLink>
            </li>
          </>
        )}

        {isAdmin && (
          <>
            <li className="sidebar-separador" />
            <p className="sidebar-secao">Administração</p>
            <li className="sidebar-item">
              <NavLink to="/admin/produtos">
                <ClipboardList {...ICONE} /> Produtos
              </NavLink>
            </li>
            <li className="sidebar-item">
              <NavLink to="/admin/categorias">
                <FolderOpen {...ICONE} /> Categorias
              </NavLink>
            </li>
            <li className="sidebar-item">
              <NavLink to="/admin/usuarios">
                <Users {...ICONE} /> Usuários
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
}

export default Sidebar;
