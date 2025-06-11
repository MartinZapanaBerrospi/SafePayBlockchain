from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class Usuario(db.Model):
    __tablename__ = 'usuario'
    id_usuario = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.Text, nullable=False)
    correo = db.Column(db.Text, unique=True, nullable=False)
    telefono = db.Column(db.Text)
    fecha_creacion = db.Column(db.DateTime, default=db.func.current_timestamp())
    contrasena_hash = db.Column(db.String(128), nullable=False)
    cuentas = db.relationship('Cuenta', backref='usuario', lazy=True)
    dispositivos = db.relationship('Dispositivo', backref='usuario', lazy=True)
    solicitudes_enviadas = db.relationship('SolicitudPago', foreign_keys='SolicitudPago.solicitante', backref='usuario_solicitante', lazy=True)
    solicitudes_recibidas = db.relationship('SolicitudPago', foreign_keys='SolicitudPago.destinatario', backref='usuario_destinatario', lazy=True)

    def set_contrasena(self, contrasena):
        self.contrasena_hash = generate_password_hash(contrasena)

    def check_contrasena(self, contrasena):
        return check_password_hash(self.contrasena_hash, contrasena)

class Cuenta(db.Model):
    __tablename__ = 'cuenta'
    id_cuenta = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    saldo = db.Column(db.Numeric(12, 2), default=0.00)
    moneda = db.Column(db.String(3), default='USD')
    activa = db.Column(db.Boolean, default=True)
    transacciones_origen = db.relationship('Transaccion', foreign_keys='Transaccion.cuenta_origen', backref='cuenta_origen_rel', lazy=True)
    transacciones_destino = db.relationship('Transaccion', foreign_keys='Transaccion.cuenta_destino', backref='cuenta_destino_rel', lazy=True)

class Transaccion(db.Model):
    __tablename__ = 'transaccion'
    id_transaccion = db.Column(db.Integer, primary_key=True)
    cuenta_origen = db.Column(db.Integer, db.ForeignKey('cuenta.id_cuenta'))
    cuenta_destino = db.Column(db.Integer, db.ForeignKey('cuenta.id_cuenta'))
    monto = db.Column(db.Numeric(12, 2), nullable=False)
    descripcion = db.Column(db.Text)
    fecha = db.Column(db.DateTime, default=db.func.current_timestamp())
    estado = db.Column(db.String(20), default='completada')

class SolicitudPago(db.Model):
    __tablename__ = 'solicitudpago'
    id_solicitud = db.Column(db.Integer, primary_key=True)
    solicitante = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    destinatario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    monto = db.Column(db.Numeric(12, 2))
    mensaje = db.Column(db.Text)
    estado = db.Column(db.String(20), default='pendiente')
    fecha_solicitud = db.Column(db.DateTime, default=db.func.current_timestamp())

class Dispositivo(db.Model):
    __tablename__ = 'dispositivo'
    id_dispositivo = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    nombre = db.Column(db.Text)
    ip_registro = db.Column(db.String(50))  # SQLAlchemy no tiene tipo INET, se usa String
    ultimo_acceso = db.Column(db.DateTime, default=db.func.current_timestamp())