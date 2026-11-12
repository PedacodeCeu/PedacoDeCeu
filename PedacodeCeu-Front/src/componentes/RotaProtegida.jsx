import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RotaProtegida({ children }) {
  const { token, carregando } = useAuth();
  // Espera o AuthContext ler o login salvo no localStorage. Sem isso, ao abrir ou
  // recarregar uma página protegida, o token ainda está vazio no primeiro instante
  // e o usuário logado é mandado para a tela de login (igual ao RotaAdmin).
  if (carregando) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
