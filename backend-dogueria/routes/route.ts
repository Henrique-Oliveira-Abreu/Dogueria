import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',           // seu usuário MySQL
      password: 'ABREu1811@',  // sua senha MySQL
      database: 'dogueria',   // nome do banco
    });

    const [rows] = await connection.execute(`
      SELECT 
        p.id_produto, 
        p.nome, 
        p.valor,
        p.descricao, 
        c.nome AS categoria
      FROM produtos p
      JOIN categoria c ON p.id_categoria = c.id_categoria
    `);

    await connection.end();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}
