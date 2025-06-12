-- Poblamiento inicial para SafePayBlockchain

-- Usuario destino: UNI
INSERT INTO usuario (nombre, correo, telefono, fecha_creacion, contrasena_hash, clave_privada, clave_publica)
VALUES ('UNI', 'uni@uni.edu', '0000000000', CURRENT_TIMESTAMP, 'hash_uni', NULL, NULL);


-- Cuenta para UNI
INSERT INTO cuenta (id_usuario, saldo, moneda, activa)
SELECT id_usuario, 1000.00, 'USD', TRUE FROM usuario WHERE nombre = 'UNI';

-- Cuenta para seteley
INSERT INTO cuenta (id_usuario, saldo, moneda, activa)
SELECT id_usuario, 500.00, 'USD', TRUE FROM usuario WHERE nombre = 'seteley';

-- Dos solicitudes de pago de UNI a seteley
INSERT INTO solicitudpago (solicitante, destinatario, monto, mensaje, estado, fecha_solicitud)
SELECT u1.id_usuario, u2.id_usuario, 50.00, 'Pago 1', 'pendiente', CURRENT_TIMESTAMP
FROM usuario u1, usuario u2 WHERE u1.nombre = 'UNI' AND u2.nombre = 'seteley';

INSERT INTO solicitudpago (solicitante, destinatario, monto, mensaje, estado, fecha_solicitud)
SELECT u1.id_usuario, u2.id_usuario, 75.00, 'Pago 2', 'pendiente', CURRENT_TIMESTAMP
FROM usuario u1, usuario u2 WHERE u1.nombre = 'UNI' AND u2.nombre = 'seteley';
