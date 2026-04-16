const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO Solicitudes_Contratacion (empresa, sector, ayuda, estado, limite) VALUES (?, ?, ?, ?, ?)");

    // Datos de prueba comerciales (El famoso Bono de 12.000€)
    stmt.run("Transportes Levante S.L.", "Transporte", "Bono Kit Digital: 12.000€", "Solicitada", "2026-10-31");
    stmt.run("Clínica Dental Salud", "Sanidad", "Modernización Tecnológica", "Abierta", "2026-09-01");

    stmt.finalize((err) => {
        if (err) {
            console.error("Error al meter los datos:", err.message);
        } else {
            console.log("--- ¡DATOS INSERTADOS CORRECTAMENTE! ---");
        }
        db.close();
    });
});