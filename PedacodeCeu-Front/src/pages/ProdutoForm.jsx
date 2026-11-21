import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { criarProduto, editarProduto, buscarProduto, listarCategorias, urlDaImagem } from '../services/api';
import CampoTexto from '../componentes/CampoTexto';
import Botao from '../componentes/Botao';
import MensagemErro from '../componentes/MensagemErro';

export default function ProdutoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [arquivoImagem, setArquivoImagem] = useState(null); // File novo escolhido agora, se houver
  const [imagemAtual, setImagemAtual] = useState(null); // nome do arquivo já salvo no servidor (ao editar)
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarCategorias();
    if (id) carregarProduto(id);
  }, [id]);

  async function carregarCategorias() {
    try {
      const res = await listarCategorias(1, 100);
      setCategorias(res.dados);
    } catch {}
  }

  async function carregarProduto(produtoId) {
    try {
      const produto = await buscarProduto(produtoId);
      setNome(produto.nome);
      setDescricao(produto.descricao);
      setPreco(String(produto.preco));
      setImagemAtual(produto.imagem || null);
      setDestaque(produto.destaque ?? false);
      setAtivo(produto.ativo ?? true);
      setCategoriaId(produto.categoriaId);
    } catch {}
  }

  function validar() {
    const novosErros = {};
    if (!nome.trim()) novosErros.nome = 'Nome é obrigatório';
    if (!descricao.trim()) novosErros.descricao = 'Descrição é obrigatória';
    if (!preco) novosErros.preco = 'Preço é obrigatório';
    else if (isNaN(Number(preco)) || Number(preco) <= 0) novosErros.preco = 'Preço inválido';
    if (!categoriaId) novosErros.categoriaId = 'Categoria é obrigatória';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit() {
    setErroApi('');
    if (!validar()) return;
    setCarregando(true);
    try {
      const payload = { nome, descricao, preco: Number(preco), arquivoImagem, destaque, ativo, categoriaId };
      if (editando && id) {
        await editarProduto(id, payload);
      } else {
        await criarProduto(payload);
      }
      navigate('/admin/produtos');
    } catch (err) {
      setErroApi(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-crud" style={{ maxWidth: 540 }}>
      <div className="pagina-crud__topo">
        <h2>{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
      </div>
      <div className="perfil-form">
        <MensagemErro mensagem={erroApi} />
        <CampoTexto id="nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
        <CampoTexto id="descricao" label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} />
        <CampoTexto id="preco" label="Preço (R$)" type="number" value={preco} onChange={(e) => setPreco(e.target.value)} erro={erros.preco} placeholder="0.00" />

        <div className="campo-grupo">
          <label className="campo-label" htmlFor="imagem">Foto do produto (opcional)</label>
          <input
            id="imagem"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => setArquivoImagem(e.target.files[0] || null)}
          />
          {imagemAtual && !arquivoImagem && (
            <img
              src={urlDaImagem(imagemAtual)}
              alt="Imagem atual do produto"
              style={{ width: 80, height: 80, objectFit: 'cover', marginTop: 8, borderRadius: 8 }}
            />
          )}
          {arquivoImagem && (
            <img
              src={URL.createObjectURL(arquivoImagem)}
              alt="Pré-visualização da nova imagem"
              style={{ width: 80, height: 80, objectFit: 'cover', marginTop: 8, borderRadius: 8 }}
            />
          )}
        </div>

        <div className="campo-grupo">
          <label className="campo-label" htmlFor="categoria">Categoria</label>
          <select
            id="categoria"
            className={`campo-input${erros.categoriaId ? ' campo-input--erro' : ''}`}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {erros.categoriaId && <span className="campo-erro">{erros.categoriaId}</span>}
        </div>

        <div style={{ display: 'flex', gap: 24, margin: '12px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={destaque}
              onChange={(e) => setDestaque(e.target.checked)}
            />
            ⭐ Produto em destaque
          </label>
          {editando && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              ✅ Produto ativo
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="botao botao--secundario"
            style={{ width: 'auto' }}
            onClick={() => navigate('/admin/produtos')}
          >
            Cancelar
          </button>
          <Botao onClick={handleSubmit} carregando={carregando}>
            {editando ? 'Salvar alterações' : 'Criar produto'}
          </Botao>
        </div>
      </div>
    </div>
  );
}
