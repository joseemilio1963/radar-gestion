const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usamos la ruta actual para no perdernos
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Borramos la tabla si existe para que no dé errores de duplicados
    db.run("DROP TABLE IF EXISTS Solicitudes_Contratacion");

    // La creamos con el nombre EXACTO que buscará el otro archivo
    db.run(`CREATE TABLE Solicitudes_Contratacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa TEXT,
    sector TEXT,
    ayuda TEXT,
    estado TEXT,
    limite TEXT
  )`, (err) => {
        if (err) {
            console.error("Error creando la tabla:", err.message);
        } else {
            console.log("--- ¡TODO LIMPIO Y FUNCIONANDO! ---");
        }
        db.close();
    });
});