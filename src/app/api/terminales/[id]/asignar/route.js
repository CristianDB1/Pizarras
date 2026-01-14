export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { ColegioID, Colegio, Asignado, FechaEntrega } = data;

    console.log('🔄 Asignando/actualizando terminal ID:', id, 'Datos:', data);

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

      const terminalActual = existing[0];
      
      // Lógica para determinar el valor de Asignado:
      let asignadoValue;
      
      // Si se envía un valor específico en Asignado, usarlo
      if (Asignado && Asignado.trim() !== '') {
        asignadoValue = Asignado.trim();
      } 
      // Si se asigna a un colegio pero no se especifica Asignado
      else if (ColegioID && ColegioID.toString().trim() !== '' && Colegio && Colegio.trim() !== '') {
        asignadoValue = Colegio.trim(); // Usar nombre del colegio por defecto
      }
      // Si se está desasignando (quitando el colegio)
      else if (!ColegioID || ColegioID.toString().trim() === '') {
        asignadoValue = 'No asignado';
      }
      // Mantener el valor actual si no hay cambios
      else {
        asignadoValue = terminalActual.Asignado || 'No asignado';
      }

      console.log('📝 Valor final para Asignado:', asignadoValue);

      // Actualizar solo campos de asignación
      const [result] = await connection.query(
        `UPDATE Terminales SET 
          ColegioID = ?, 
          Colegio = ?, 
          Asignado = ?,
          FechaEntrega = ?
         WHERE Id_terminal = ?`,
        [
          ColegioID && ColegioID.toString().trim() !== '' ? parseInt(ColegioID) : null,
          Colegio?.trim() || '',
          asignadoValue, 
          FechaEntrega || null,
          id
        ]
      );

      console.log('✅ Terminal actualizado:', result.affectedRows, 'filas afectadas');

      // Obtener el registro actualizado
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      return NextResponse.json(rows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error al asignar terminal:', error);
    return NextResponse.json(
      { error: `Error al asignar terminal: ${error.message}` },
      { status: 500 }
    );
  }
}