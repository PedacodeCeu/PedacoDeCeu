import request from 'supertest';
import app from '../app';

describe('Teste de integração - Categorias', () => {

      test('Listar categorias sem token (rota pública)', async () => {
    const result = await request(app).get('/categorias');

    expect(result.statusCode).toEqual(200);
  });

  test('Buscar categoria inexistente sem token (rota pública)', async () => {
    const result = await request(app).get('/categorias/id-que-nao-existe');

    expect(result.statusCode).toEqual(404);
  });

  test('Criar categoria sem token', async () => {
    const result = await request(app)
      .post('/categorias')
      .send({ nome: 'Bolos' });

    expect(result.statusCode).toEqual(401);
  });

  test('Criar categoria com nome vazio sem token', async () => {
    const result = await request(app)
      .post('/categorias')
      .send({ nome: '' });

    expect(result.statusCode).toEqual(401);
  });

});