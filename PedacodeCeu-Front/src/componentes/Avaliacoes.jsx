import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  resumoAvaliacoes,
  listarAvaliacoes,
  minhaAvaliacao,
  criarAvaliacao,
  editarAvaliacao,
  removerAvaliacao,
} from '../services/api';
import './Avaliacoes.css';

const POR_PAGINA = 5;

function Estrelas({ nota, tamanho = 18 }) {
  return (
    <span className="estrelas" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={tamanho}
          className={n <= Math.round(nota) ? 'estrela estrela--cheia' : 'estrela'}
        />
      ))}
    </span>
  );
}

function SeletorEstrelas({ valor, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="seletor-estrelas" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className="seletor-estrela"
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={26} className={n <= (hover || valor) ? 'estrela estrela--cheia' : 'estrela'} />
        </button>
      ))}
    </div>
  );
}

function FormAvaliacao({ inicial, onSalvar, onCancelar }) {
  const [nota, setNota] = useState(inicial?.nota ?? 0);
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (nota < 1) {
      setErro('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await onSalvar({ nota, comentario: comentario.trim() || null });
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar a avaliação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="avaliacao-form" onSubmit={handleSubmit}>
      <SeletorEstrelas valor={nota} onChange={setNota} />
      <textarea
        className="campo-input avaliacao-textarea"
        placeholder="Conte o que achou do produto (opcional)"
        maxLength={1000}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />
      {erro && <p className="campo-erro">{erro}</p>}
      <div className="avaliacao-form-acoes">
        <button type="submit" className="card-button" disabled={enviando}>
          {enviando ? 'Enviando...' : inicial ? 'Salvar alterações' : 'Enviar avaliação'}
        </button>
        {onCancelar && (
          <button type="button" className="card-button card-button--secundario" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function Avaliacoes({ produtoId }) {
  const { usuario, isAdmin } = useAuth();

  const [resumo, setResumo] = useState(null);
  const [lista, setLista] = useState([]);
  const [meta, setMeta] = useState(null);
  const [minha, setMinha] = useState(null);
  const [editando, setEditando] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([
        resumoAvaliacoes(produtoId),
        listarAvaliacoes(produtoId, 1, POR_PAGINA),
      ]);
      setResumo(r);
      setLista(l.dados);
      setMeta(l.meta);
      setIndisponivel(false);
    } catch {
      // O serviço de avaliações fora do ar não pode quebrar a página do produto.
      setIndisponivel(true);
      return;
    }

    if (usuario) {
      try {
        setMinha(await minhaAvaliacao(produtoId));
      } catch {
        setMinha(null);
      }
    } else {
      setMinha(null);
    }
  }, [produtoId, usuario]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function verMais() {
    const proxima = meta.pagina + 1;
    const l = await listarAvaliacoes(produtoId, proxima, POR_PAGINA);
    setLista((atual) => [...atual, ...l.dados]);
    setMeta(l.meta);
  }

  async function handleCriar(dados) {
    await criarAvaliacao({ produtoId, ...dados });
    await carregar();
  }

  async function handleEditar(dados) {
    await editarAvaliacao(minha.avaliacao.id, dados);
    setEditando(false);
    await carregar();
  }

  async function handleRemover(id) {
    if (!window.confirm('Remover esta avaliação?')) return;
    try {
      await removerAvaliacao(id);
      await carregar();
    } catch (err) {
      alert(err.message || 'Não foi possível remover a avaliação.');
    }
  }

  if (indisponivel) {
    return (
      <section className="avaliacoes">
        <h2>Avaliações</h2>
        <p className="avaliacoes-aviso">As avaliações estão indisponíveis no momento.</p>
      </section>
    );
  }

  if (!resumo) return null;

  const minhaExistente = minha?.avaliacao;

  return (
    <section className="avaliacoes">
      <h2>Avaliações</h2>

      <div className="avaliacoes-resumo">
        {resumo.total > 0 ? (
          <>
            <span className="avaliacoes-media">{resumo.media.toFixed(1).replace('.', ',')}</span>
            <div>
              <Estrelas nota={resumo.media} tamanho={20} />
              <p className="avaliacoes-total">
                {resumo.total} {resumo.total === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>
            <div className="avaliacoes-distribuicao">
              {[5, 4, 3, 2, 1].map((n) => {
                const qtd = resumo.distribuicao[String(n)] || 0;
                return (
                  <div key={n} className="distribuicao-linha">
                    <span>{n}</span>
                    <div className="distribuicao-barra">
                      <div style={{ width: `${(qtd / resumo.total) * 100}%` }} />
                    </div>
                    <span>{qtd}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="avaliacoes-aviso">Este produto ainda não tem avaliações.</p>
        )}
      </div>

      {!usuario && (
        <p className="avaliacoes-aviso">
          <Link to="/login">Entre na sua conta</Link> para avaliar produtos que você recebeu.
        </p>
      )}

      {usuario && minha?.podeAvaliar && (
        <div className="avaliacao-minha">
          <h3>Avalie este produto</h3>
          <FormAvaliacao onSalvar={handleCriar} />
        </div>
      )}

      {usuario && minhaExistente && (
        <div className="avaliacao-minha">
          <h3>Sua avaliação</h3>
          {editando ? (
            <FormAvaliacao inicial={minhaExistente} onSalvar={handleEditar} onCancelar={() => setEditando(false)} />
          ) : (
            <div className="avaliacao-item avaliacao-item--minha">
              <Estrelas nota={minhaExistente.nota} />
              {minhaExistente.comentario && <p>{minhaExistente.comentario}</p>}
              <div className="avaliacao-acoes">
                <button className="btn-icone" onClick={() => setEditando(true)} aria-label="Editar">
                  <Pencil size={16} /> Editar
                </button>
                <button className="btn-icone btn-icone--perigo" onClick={() => handleRemover(minhaExistente.id)} aria-label="Remover">
                  <Trash2 size={16} /> Remover
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {usuario && minha && !minha.podeAvaliar && !minhaExistente && minha.motivo && (
        <p className="avaliacoes-aviso">{minha.motivo}</p>
      )}

      <ul className="avaliacoes-lista">
        {lista.map((a) => (
          <li key={a.id} className="avaliacao-item">
            <div className="avaliacao-cabecalho">
              <strong>{a.autorNome}</strong>
              <Estrelas nota={a.nota} tamanho={15} />
              <span className="avaliacao-data">{formatarData(a.criadoEm)}</span>
              {isAdmin && a.usuarioId !== usuario?.id && (
                <button className="btn-icone btn-icone--perigo" onClick={() => handleRemover(a.id)} aria-label="Remover avaliação">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            {a.comentario && <p>{a.comentario}</p>}
          </li>
        ))}
      </ul>

      {meta && meta.pagina < meta.totalPaginas && (
        <button className="card-button card-button--secundario" onClick={verMais}>
          Ver mais avaliações
        </button>
      )}
    </section>
  );
}
