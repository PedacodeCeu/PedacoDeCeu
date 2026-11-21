import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { criarPedido, editarPedido, listarPedidos, listarProdutos } from '../services/api';
import Botao from '../componentes/Botao';
import MensagemErro from '../componentes/MensagemErro';

const STATUS_OPTIONS = ['pendente', 'confirmado', 'entregue', 'cancelado'];

export default function PedidoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);

  const [status, setStatus] = useState('pendente');
  const [produtos, setProdutos] = useState([]);
  const [itens, setItens] = useState([]);
  const [erroApi, setErroApi] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarProdutos();
    if (id) carregarPedido(id);
  }, [id]);

  async function carregarProdutos() {
    try {
      const res = await listarProdutos(1, 100);
      setProdutos(res.dados.filter((p) => p.ativo !== false));
    } catch {}
  }

  async function carregarPedido(pedidoId) {
    try {
      const res = await listarPedidos(1, 100);
      const pedido = res.dados.find((p) => p.id === pedidoId);
      if (pedido) {
        setStatus(pedido.status);
        if (pedido.itens) {
          setItens(pedido.itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
          })));
        }
      }
    } catch {}
  }

  function adicionarItem() {
    setItens((prev) => [...prev, { produtoId: '', quantidade: 1 }]);
  }

  function removerItem(index) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarItem(index, campo, valor) {
    setItens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  }

  function calcularTotal() {
    return itens.reduce((acc, item) => {
      const produto = produtos.find((p) => p.id === item.produtoId);
      if (!produto) return acc;
      return acc + produto.preco * Number(item.quantidade);
    }, 0);
  }

  async function handleSubmit() {
    setErroApi('');

    if (itens.length === 0) {
      setErroApi('Adicione ao menos um item ao pedido');
      return;
    }

    const itensFiltrados = itens.filter((i) => i.produtoId && i.quantidade > 0);
    if (itensFiltrados.length === 0) {
      setErroApi('Preencha todos os itens corretamente');
      return;
    }

    setCarregando(true);
    try {
      const payload = { status, itens: itensFiltrados };
      if (editando && id) {
        await editarPedido(id, payload);
      } else {
        await criarPedido(payload);
      }
      navigate('/pedidos');
    } catch (err) {
      setErroApi(err instanceof Error ? err.message : 'Erro ao salvar pedido');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-crud" style={{ maxWidth: 600 }}>
      <div className="pagina-crud__topo">
        <h2>{editando ? 'Editar Pedido' : 'Novo Pedido'}</h2>
      </div>

      <div className="perfil-form">
        <MensagemErro mensagem={erroApi} />

        <div className="campo-grupo">
          <label className="campo-label" htmlFor="status">Status</label>
          <select
            id="status"
            className="campo-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="campo-label">Itens do Pedido</label>
            <button
              className="botao botao--secundario"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
              onClick={adicionarItem}
            >
              + Adicionar item
            </button>
          </div>

          {itens.length === 0 && (
            <p style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
              Nenhum item adicionado ainda
            </p>
          )}

          {itens.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
              <div className="campo-grupo" style={{ flex: 2, marginBottom: 0 }}>
                <label className="campo-label">Produto</label>
                <select
                  className="campo-input"
                  value={item.produtoId}
                  onChange={(e) => atualizarItem(index, 'produtoId', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo" style={{ flex: 1, marginBottom: 0 }}>
                <label className="campo-label">Qtd</label>
                <input
                  className="campo-input"
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => atualizarItem(index, 'quantidade', e.target.value)}
                />
              </div>

              <button
                className="btn-sm btn-sm--deletar"
                style={{ marginBottom: 0, height: 40 }}
                onClick={() => removerItem(index)}
              >
                ✕
              </button>
            </div>
          ))}

          {itens.length > 0 && (
            <div style={{
              background: '#fdf9f6',
              border: '1px solid #d9c4b8',
              borderRadius: 8,
              padding: '10px 16px',
              marginTop: 12,
              textAlign: 'right',
              fontWeight: 600,
              color: '#4b2c20',
            }}>
              Total estimado: R$ {calcularTotal().toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="botao botao--secundario"
            style={{ width: 'auto' }}
            onClick={() => navigate('/pedidos')}
          >
            Cancelar
          </button>
          <Botao onClick={handleSubmit} carregando={carregando}>
            {editando ? 'Salvar alterações' : 'Criar pedido'}
          </Botao>
        </div>
      </div>
    </div>
  );
}