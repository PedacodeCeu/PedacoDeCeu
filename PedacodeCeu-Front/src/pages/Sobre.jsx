import React from 'react';
import { Cookie } from 'lucide-react';

export default function Sobre() {
  return (
    <div className="pagina-sobre">
      <h1><Cookie size={24} color="#4b2c20" strokeWidth={2} /> Sobre a Pedaço do Céu</h1>
      <p>
        A Pedaço do Céu é uma padaria especializada em doces artesanais, 
        feitos com ingredientes selecionados e muito carinho. Cada produto 
        é preparado de forma artesanal, garantindo sabor e qualidade únicos 
        em cada mordida.
      </p>
      <p>
        Nossa missão é levar um pedacinho de felicidade para o seu dia, 
        seja com um bolo recheado, um brownie irresistível ou um cookie 
        crocante por fora e macio por dentro.
      </p>
      <p>
        Trabalhamos com encomendas personalizadas e entrega local. 
        Entre em contato e transforme seu momento especial em algo ainda mais doce.
      </p>
    </div>
  );
}