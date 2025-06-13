from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from flask import request, jsonify, Blueprint

class Usuario(db.Model):
    __tablename__ = 'usuario'
    id_usuario = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.Text, nullable=False)
    correo = db.Column(db.Text, unique=True, nullable=False)
    telefono = db.Column(db.Text)
    fecha_creacion = db.Column(db.DateTime, default=db.func.current_timestamp())
    contrasena_hash = db.Column(db.String(128), nullable=False)
    clave_privada = db.Column(db.Text, nullable=True)  # Guardada como string PEM o base64
    clave_publica = db.Column(db.Text, nullable=True)  # Guardada como string PEM
    cuentas = db.relationship('Cuenta', backref='usuario', lazy=True)
    dispositivos = db.relationship('Dispositivo', backref='usuario', lazy=True)
    solicitudes_enviadas = db.relationship('SolicitudPago', foreign_keys='SolicitudPago.solicitante', backref='usuario_solicitante', lazy=True)
    solicitudes_recibidas = db.relationship('SolicitudPago', foreign_keys='SolicitudPago.destinatario', backref='usuario_destinatario', lazy=True)
    tarjetas = db.relationship('Tarjeta', backref='usuario_tarjeta', lazy=True)

    def set_contrasena(self, contrasena):
        self.contrasena_hash = generate_password_hash(contrasena)

    def check_contrasena(self, contrasena):
        return check_password_hash(self.contrasena_hash, contrasena)

    def generar_claves(self):
        # Genera un par de claves RSA y las almacena en el usuario
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        private_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        public_key = private_key.public_key()
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        self.clave_privada = private_bytes.decode('utf-8')  # Guardar como string PEM
        self.clave_publica = public_bytes.decode('utf-8')   # Guardar como string PEM
        # Forzar a str explícitamente (por si el modelo espera str)
        if isinstance(self.clave_privada, bytes):
            self.clave_privada = self.clave_privada.decode('utf-8')
        if isinstance(self.clave_publica, bytes):
            self.clave_publica = self.clave_publica.decode('utf-8')

class Cuenta(db.Model):
    __tablename__ = 'cuenta'
    id_cuenta = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    saldo = db.Column(db.Numeric(12, 2), default=0.00)
    moneda = db.Column(db.String(3), default='USD')
    activa = db.Column(db.Boolean, default=True)
    transacciones_origen = db.relationship('Transaccion', foreign_keys='Transaccion.cuenta_origen', backref='cuenta_origen_rel', lazy=True)
    transacciones_destino = db.relationship('Transaccion', foreign_keys='Transaccion.cuenta_destino', backref='cuenta_destino_rel', lazy=True)

class Tarjeta(db.Model):
    __tablename__ = 'tarjeta'
    id_tarjeta = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    numero_cuenta = db.Column(db.String(20), nullable=False)
    fecha_vencimiento = db.Column(db.String(7), nullable=False)  # formato MM/AAAA
    cvv = db.Column(db.String(4), nullable=False)
    # Relación ya definida en Usuario con backref='tarjetas'

class Transaccion(db.Model):
    __tablename__ = 'transaccion'
    id_transaccion = db.Column(db.Integer, primary_key=True)
    cuenta_origen = db.Column(db.Integer, db.ForeignKey('cuenta.id_cuenta'))
    cuenta_destino = db.Column(db.Integer, db.ForeignKey('cuenta.id_cuenta'))
    monto = db.Column(db.Numeric(12, 2), nullable=False)
    descripcion = db.Column(db.Text)
    fecha = db.Column(db.DateTime, default=db.func.current_timestamp())
    estado = db.Column(db.String(20), default='completada')
    # Eliminamos la FK aquí y la movemos a Dispositivo

class SolicitudPago(db.Model):
    __tablename__ = 'solicitudpago'
    id_solicitud = db.Column(db.Integer, primary_key=True)
    solicitante = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    destinatario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    monto = db.Column(db.Numeric(12, 2))
    mensaje = db.Column(db.Text)
    estado = db.Column(db.String(20), default='pendiente')
    fecha_solicitud = db.Column(db.DateTime, default=db.func.current_timestamp())
    fecha_vencimiento = db.Column(db.DateTime, nullable=True)

class Dispositivo(db.Model):
    __tablename__ = 'dispositivo'
    id_dispositivo = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    nombre = db.Column(db.Text)
    ip_registro = db.Column(db.String(50))
    ultimo_acceso = db.Column(db.DateTime, default=db.func.current_timestamp())
    latitud = db.Column(db.Float, nullable=True)
    longitud = db.Column(db.Float, nullable=True)
    id_transaccion = db.Column(db.Integer, db.ForeignKey('transaccion.id_transaccion'), unique=True)
    transaccion = db.relationship('Transaccion', backref=db.backref('dispositivo_rel', uselist=False))

pagos_bp = Blueprint('pagos', __name__)

# El endpoint de pago de solicitud ha sido migrado a routes.py