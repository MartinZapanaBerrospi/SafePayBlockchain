from flask import Blueprint
from .models import db, Usuario, Transaccion, SolicitudPago, Cuenta

bp_dash = Blueprint('routes_dash', __name__)

@bp_dash.route('/dashboard/indicadores', methods=['GET'])
def dashboard_indicadores():
    total_transacciones = db.session.query(Transaccion).count()
    monto_total = db.session.query(db.func.sum(Transaccion.monto)).scalar() or 0
    usuarios_activos = db.session.query(Usuario).count()
    solicitudes_pendientes = db.session.query(SolicitudPago).filter_by(estado='pendiente').count()

    # Top usuarios con más transacciones (como origen o destino)
    top_usuarios_transacciones = db.session.query(
        Usuario.nombre,
        db.func.count(Transaccion.id_transaccion).label('num_transacciones')
    ).join(Cuenta, Cuenta.id_usuario == Usuario.id_usuario) \
     .outerjoin(Transaccion, ((Transaccion.cuenta_origen == Cuenta.id_cuenta) | (Transaccion.cuenta_destino == Cuenta.id_cuenta))) \
    .group_by(Usuario.id_usuario) \
    .order_by(db.desc('num_transacciones')) \
    .limit(5).all()
    top_transacciones = [
        {'usuario': nombre, 'transacciones': num} for nombre, num in top_usuarios_transacciones
    ]

    # Top usuarios con más dinero movido (sum monto como origen o destino)
    top_usuarios_monto = db.session.query(
        Usuario.nombre,
        db.func.coalesce(db.func.sum(Transaccion.monto), 0).label('monto_total')
    ).join(Cuenta, Cuenta.id_usuario == Usuario.id_usuario) \
     .outerjoin(Transaccion, ((Transaccion.cuenta_origen == Cuenta.id_cuenta) | (Transaccion.cuenta_destino == Cuenta.id_cuenta))) \
    .group_by(Usuario.id_usuario) \
    .order_by(db.desc('monto_total')) \
    .limit(5).all()
    top_montos = [
        {'usuario': nombre, 'monto': float(monto)} for nombre, monto in top_usuarios_monto
    ]

    return {
        'total_transacciones': total_transacciones,
        'monto_total': float(monto_total),
        'usuarios_activos': usuarios_activos,
        'solicitudes_pendientes': solicitudes_pendientes,
        'top_transacciones': top_transacciones,
        'top_montos': top_montos
    }
