-- ============================================
-- NeoCommerce - Base de Datos SQL Server 2022
-- Script corregido (idempotente)
-- ============================================

USE master;
GO

-- Crear la BD solo si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'NeoCommerceDB')
BEGIN
    CREATE DATABASE NeoCommerceDB;
END
GO

USE NeoCommerceDB;
GO

-- ============================================
-- ELIMINAR OBJETOS SI YA EXISTEN (orden inverso por FKs)
-- ============================================
IF OBJECT_ID('dbo.sp_Login', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_Login;
IF OBJECT_ID('dbo.sp_RegistrarUsuario', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_RegistrarUsuario;
IF OBJECT_ID('dbo.DetalleVenta', 'U') IS NOT NULL DROP TABLE dbo.DetalleVenta;
IF OBJECT_ID('dbo.MovimientosInventario', 'U') IS NOT NULL DROP TABLE dbo.MovimientosInventario;
IF OBJECT_ID('dbo.Ventas', 'U') IS NOT NULL DROP TABLE dbo.Ventas;
IF OBJECT_ID('dbo.Productos', 'U') IS NOT NULL DROP TABLE dbo.Productos;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
IF OBJECT_ID('dbo.CodigosEspeciales', 'U') IS NOT NULL DROP TABLE dbo.CodigosEspeciales;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

-- ============================================
-- CREAR TABLAS
-- ============================================

CREATE TABLE Roles (
    RolID INT IDENTITY(1,1) PRIMARY KEY,
    NombreRol VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(200),
    RequiereCodigo BIT DEFAULT 0
);
GO

INSERT INTO Roles (NombreRol, Descripcion, RequiereCodigo) VALUES
('Administrador', 'Control total del sistema', 0),
('Gerente', 'Gestión de inventario y reportes', 1),
('Cajero', 'Procesamiento de ventas', 1),
('Repositor', 'Reabastecimiento de productos', 1),
('Proveedor', 'Proveedor externo de productos', 1);
GO

CREATE TABLE CodigosEspeciales (
    CodigoID INT IDENTITY(1,1) PRIMARY KEY,
    RolID INT NOT NULL,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME DEFAULT GETDATE(),
    Usado BIT DEFAULT 0,
    FOREIGN KEY (RolID) REFERENCES Roles(RolID)
);
GO

INSERT INTO CodigosEspeciales (RolID, Codigo) VALUES
(2, 'GERENTE2024-XYZ'),
(3, 'CAJERO2024-ABC'),
(4, 'REPOSITOR2024-DEF'),
(5, 'PROVEEDOR2024-GHI');
GO

CREATE TABLE Usuarios (
    UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
    NombreCompleto VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    RolID INT NOT NULL,
    CodigoUsado VARCHAR(50),
    Telefono VARCHAR(20),
    Direccion VARCHAR(200),
    Activo BIT DEFAULT 1,
    FechaRegistro DATETIME DEFAULT GETDATE(),
    UltimoAcceso DATETIME,
    FOREIGN KEY (RolID) REFERENCES Roles(RolID)
);
GO

-- Administrador por defecto
INSERT INTO Usuarios (NombreCompleto, Email, PasswordHash, RolID, Activo) VALUES
('Administrador Principal', 'admin@neocommerce.com', 'Admin123!', 1, 1);
GO

CREATE TABLE Productos (
    ProductoID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Descripcion VARCHAR(MAX),
    Precio DECIMAL(10,2) NOT NULL,
    Stock INT DEFAULT 0,
    Categoria VARCHAR(100),
    ImagenURL VARCHAR(500),
    ProveedorID INT NULL,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ProveedorID) REFERENCES Usuarios(UsuarioID)
);
GO

INSERT INTO Productos (Nombre, Descripcion, Precio, Stock, Categoria) VALUES
('Laptop Quantum X1', 'Laptop de alto rendimiento con GPU holográfica', 2499.99, 15, 'Tecnología'),
('Drone Nebula Pro', 'Drone con cámara 8K y autonomía extendida', 1299.50, 8, 'Tecnología'),
('Auriculares Void 360', 'Audio envolvente con cancelación neural', 349.99, 25, 'Audio'),
('Smartwatch Cyber S', 'Reloj inteligente con proyección holográfica', 599.99, 12, 'Wearables'),
('Teclado Plasma RGB', 'Teclado mecánico con retroiluminación plasma', 189.99, 30, 'Accesorios');
GO

CREATE TABLE Ventas (
    VentaID INT IDENTITY(1,1) PRIMARY KEY,
    CajeroID INT NOT NULL,
    Fecha DATETIME DEFAULT GETDATE(),
    Total DECIMAL(10,2) NOT NULL,
    MetodoPago VARCHAR(50),
    Estado VARCHAR(30) DEFAULT 'Completada',
    FOREIGN KEY (CajeroID) REFERENCES Usuarios(UsuarioID)
);
GO

CREATE TABLE DetalleVenta (
    DetalleID INT IDENTITY(1,1) PRIMARY KEY,
    VentaID INT NOT NULL,
    ProductoID INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);
GO

CREATE TABLE MovimientosInventario (
    MovimientoID INT IDENTITY(1,1) PRIMARY KEY,
    ProductoID INT NOT NULL,
    UsuarioID INT NOT NULL,
    TipoMovimiento VARCHAR(20) NOT NULL,
    Cantidad INT NOT NULL,
    Motivo VARCHAR(200),
    Fecha DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID)
);
GO

-- ============================================
-- STORED PROCEDURES
-- (GO va ANTES de cada CREATE PROCEDURE)
-- ============================================

CREATE PROCEDURE dbo.sp_Login
    @Email VARCHAR(150),
    @Password VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT U.UsuarioID, U.NombreCompleto, U.Email, R.NombreRol
    FROM Usuarios U
    INNER JOIN Roles R ON U.RolID = R.RolID
    WHERE U.Email = @Email AND U.PasswordHash = @Password AND U.Activo = 1;
END;
GO

CREATE PROCEDURE dbo.sp_RegistrarUsuario
    @NombreCompleto VARCHAR(100),
    @Email VARCHAR(150),
    @Password VARCHAR(255),
    @RolID INT,
    @Codigo VARCHAR(50) = NULL,
    @Telefono VARCHAR(20) = NULL,
    @Direccion VARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RequiereCodigo BIT;
    SELECT @RequiereCodigo = RequiereCodigo FROM Roles WHERE RolID = @RolID;

    IF @RequiereCodigo IS NULL
    BEGIN
        RAISERROR('Rol inválido', 16, 1);
        RETURN;
    END

    IF @RequiereCodigo = 1
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM CodigosEspeciales
            WHERE Codigo = @Codigo AND RolID = @RolID
              AND Activo = 1 AND Usado = 0
        )
        BEGIN
            RAISERROR('Código especial inválido o ya usado', 16, 1);
            RETURN;
        END

        UPDATE CodigosEspeciales SET Usado = 1 WHERE Codigo = @Codigo;
    END

    INSERT INTO Usuarios (NombreCompleto, Email, PasswordHash, RolID, CodigoUsado, Telefono, Direccion)
    VALUES (@NombreCompleto, @Email, @Password, @RolID, @Codigo, @Telefono, @Direccion);
END;
GO

PRINT '✅ Base de datos NeoCommerceDB creada/actualizada correctamente.';
GO