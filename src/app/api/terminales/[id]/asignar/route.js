export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { ColegioID, Colegio, Asignado, FechaEntrega } = data;

    const connection = await pool.getConnection();
    
    try {
      // Verificar si el terminal existe
      const [existing] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Terminal no encontrado' }, { status: 404 });
      }

      // Actualizar solo campos de asignación
      const [result] = await connection.query(
        `UPDATE Terminales SET 
          ColegioID = ?, 
          Colegio = ?, 
          Asignado = ?,
          FechaEntrega = ?
         WHERE Id_terminal = ?`,
        [
          ColegioID || null,
          Colegio?.trim() || '',
          Asignado || 'No',
          FechaEntrega || null,
          id
        ]
      );

      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      return NextResponse.json(rows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al asignar terminal:', error);
    return NextResponse.json(
      { error: 'Error al asignar terminal' },
      { status: 500 }
    );
  }
}