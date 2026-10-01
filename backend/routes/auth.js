const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('Email', sql.VarChar(150), email)
            .query(`
                SELECT U.UsuarioID, U.NombreCompleto, U.Email, U.PasswordHash, 
                       U.Activo, R.NombreRol, R.RolID
                FROM Usuarios U
                INNER JOIN Roles R ON U.RolID = R.RolID
                WHERE U.Email = @Email
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = result.recordset[0];
        if (!user.Activo) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        // Verificación simple (en producción usa bcrypt.compare)
        const passwordMatch = password === user.PasswordHash || 
                              await bcrypt.compare(password, user.PasswordHash).catch(() => false);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar último acceso
        await pool.request()
            .input('ID', sql.Int, user.UsuarioID)
            .query('UPDATE Usuarios SET UltimoAcceso = GETDATE() WHERE UsuarioID = @ID');

        const token = jwt.sign(
            { id: user.UsuarioID, email: user.Email, rol: user.NombreRol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            usuario: {
                id: user.UsuarioID,
                nombre: user.NombreCompleto,
                email: user.Email,
                rol: user.NombreRol
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// REGISTRO
router.post('/registro', async (req, res) => {
    try {
        const { nombreCompleto, email, password, rolID, codigo, telefono, direccion } = req.body;
        
        if (!nombreCompleto || !email || !password || !rolID) {
            return res.status(400).json({ error: 'Campos obligatorios faltantes' });
        }

        // No permitir registrar administradores
        if (parseInt(rolID) === 1) {
            return res.status(403).json({ error: 'No puedes registrarte como administrador' });
        }

        const pool = await getPool();

        // Verificar si el email ya existe
        const existe = await pool.request()
            .input('Email', sql.VarChar(150), email)
            .query('SELECT 1 FROM Usuarios WHERE Email = @Email');
        
        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Verificar si el rol requiere código
        const rolInfo = await pool.request()
            .input('RolID', sql.Int, rolID)
            .query('SELECT RequiereCodigo FROM Roles WHERE RolID = @RolID');

        if (rolInfo.recordset.length === 0) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        if (rolInfo.recordset[0].RequiereCodigo) {
            if (!codigo) {
                return res.status(400).json({ error: 'Este rol requiere un código especial' });
            }

            const codigoValido = await pool.request()
                .input('Codigo', sql.VarChar(50), codigo)
                .input('RolID', sql.Int, rolID)
                .query(`
                    SELECT CodigoID FROM CodigosEspeciales
                    WHERE Codigo = @Codigo AND RolID = @RolID 
                    AND Activo = 1 AND Usado = 0
                `);

            if (codigoValido.recordset.length === 0) {
                return res.status(400).json({ error: 'Código especial inválido o ya usado' });
            }

            await pool.request()
                .input('Codigo', sql.VarChar(50), codigo)
                .query('UPDATE CodigosEspeciales SET Usado = 1 WHERE Codigo = @Codigo');
        }

        // Hash de contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('Nombre', sql.VarChar(100), nombreCompleto)
            .input('Email', sql.VarChar(150), email)
            .input('Password', sql.VarChar(255), passwordHash)
            .input('RolID', sql.Int, rolID)
            .input('Codigo', sql.VarChar(50), codigo || null)
            .input('Telefono', sql.VarChar(20), telefono || null)
            .input('Direccion', sql.VarChar(200), direccion || null)
            .query(`
                INSERT INTO Usuarios (NombreCompleto, Email, PasswordHash, RolID, CodigoUsado, Telefono, Direccion)
                VALUES (@Nombre, @Email, @Password, @RolID, @Codigo, @Telefono, @Direccion)
            `);

        res.json({ success: true, message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// OBTENER ROLES
router.get('/roles', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT RolID, NombreRol, Descripcion, RequiereCodigo 
            FROM Roles 
            WHERE RolID != 1
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;