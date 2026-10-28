import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { editarUsuario } from "../services/api";
import { validarCPF, validarSenha, formatarCPF } from "../services/validacoes";
import { User } from 'lucide-react';
import CampoTexto from "../componentes/CampoTexto";
import Botao from "../componentes/Botao";
import MensagemErro from "../componentes/MensagemErro";

export default function Perfil() {
  const { usuario, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [cpf, setCpf] = useState(usuario?.cpf ?? "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  function validar() {
    const novosErros = {};
    if (!nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (!cpf) novosErros.cpf = "CPF é obrigatório";
    else if (!validarCPF(cpf)) novosErros.cpf = "CPF inválido";
    if (senha) {
      const { valida, mensagem } = validarSenha(senha);
      if (!valida) novosErros.senha = mensagem;
      if (!confirmarSenha) novosErros.confirmarSenha = "Confirme a nova senha";
      else if (senha !== confirmarSenha) novosErros.confirmarSenha = "As senhas não coincidem";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit() {
    setErroApi("");
    setSucesso("");
    if (!validar() || !usuario) return;
    setCarregando(true);
    try {
      const payload = { nome, cpf: cpf.replace(/\D/g, "") };
      if (senha) payload.senha = senha;
      const atualizado = await editarUsuario(usuario.id, payload);
      atualizarUsuario(atualizado);
      setSucesso("Perfil atualizado com sucesso!");
      setSenha("");
      setConfirmarSenha("");
    } catch (err) {
      setErroApi(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina-perfil">
      <h2><User size={24} color="#4b2c20" /> Meu Perfil</h2>
      <div className="perfil-form">
        <MensagemErro mensagem={erroApi} />
        {sucesso && (
          <div style={{ background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", borderRadius: 7, padding: "10px 14px", marginBottom: 14, fontSize: "0.9rem" }}>
            ✅ {sucesso}
          </div>
        )}
        <CampoTexto
          id="nome"
          label="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
        />
        <CampoTexto
          id="email"
          label="E-mail (não editável)"
          type="email"
          value={usuario?.email ?? ""}
          disabled
        />
        <CampoTexto
          id="cpf"
          label="CPF"
          value={formatarCPF(cpf)}
          onChange={(e) => setCpf(formatarCPF(e.target.value))}
          erro={erros.cpf}
          maxLength={14}
        />
        <CampoTexto
          id="senha"
          label="Nova senha (deixe em branco para não alterar)"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
          placeholder="Nova senha"
        />
        <CampoTexto
          id="confirmarSenha"
          label="Confirmar nova senha"
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          erro={erros.confirmarSenha}
          placeholder="Repita a nova senha"
        />
        <Botao onClick={handleSubmit} carregando={carregando}>
          Salvar alterações
        </Botao>
      </div>
    </div>
  );
}
