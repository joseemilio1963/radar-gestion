const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // <--- ESTO ES LO QUE DA PERMISO A LA WEB
app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

app.get('/api/solicitudes', (req, res) => {
    db.all("SELECT * FROM Solicitudes_Contratacion", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.listen(3000, () => {
    console.log('--- MOTOR ENCENDIDO EN EL PUERTO 3000 ---');
});