from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail
from .config import Config


db = SQLAlchemy()
migrate = Migrate()
mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.debug = True  # Activa el modo debug
    # Configuración Flask-Mail para distintos proveedores
    # --- Gmail ---
    # app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    # app.config['MAIL_PORT'] = 587
    # app.config['MAIL_USE_TLS'] = True
    # app.config['MAIL_USERNAME'] = 'TU_CORREO@gmail.com'
    # app.config['MAIL_PASSWORD'] = 'TU_CONTRASEÑA_DE_APLICACION'
    # app.config['MAIL_DEFAULT_SENDER'] = 'TU_CORREO@gmail.com'

    # --- Hotmail/Outlook ---
    # app.config['MAIL_SERVER'] = 'smtp.office365.com'
    # app.config['MAIL_PORT'] = 587
    # app.config['MAIL_USE_TLS'] = True
    # app.config['MAIL_USERNAME'] = 'TU_CORREO@hotmail.com'
    # app.config['MAIL_PASSWORD'] = 'TU_CONTRASEÑA'
    # app.config['MAIL_DEFAULT_SENDER'] = 'TU_CORREO@hotmail.com'

    # --- Institucional UNI (@uni.pe) o empresa (@servicios.pe) ---
    # app.config['MAIL_SERVER'] = 'smtp.uni.pe'  # Cambia por el servidor SMTP real
    # app.config['MAIL_PORT'] = 587  # O el puerto que te indique tu área de TI
    # app.config['MAIL_USE_TLS'] = True  # O False, según el proveedor
    # app.config['MAIL_USERNAME'] = 'TU_CORREO@uni.pe'  # O @servicios.pe
    # app.config['MAIL_PASSWORD'] = 'TU_CONTRASEÑA'
    # app.config['MAIL_DEFAULT_SENDER'] = 'TU_CORREO@uni.pe'  # O @servicios.pe

    # Elige y descomenta la configuración que usarás
    mail.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})  # Permite CORS global para /api
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models
    from .crud import bp as crud_bp
    app.register_blueprint(crud_bp, url_prefix='/api', name='crud_api')
    from .routes import bp as routes_bp
    app.register_blueprint(routes_bp, url_prefix='/api', name='routes_api')
    from .routes_dash import bp_dash
    app.register_blueprint(bp_dash, url_prefix='/api', name='routes_dash_api')
    from .models import pagos_bp
    app.register_blueprint(pagos_bp)
    from .chatbot_nlp import bp as chatbot_bp
    app.register_blueprint(chatbot_bp, url_prefix='/api')

    # Imprimir todas las rutas registradas
    print("=== RUTAS REGISTRADAS EN FLASK ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint:30s} {','.join(rule.methods):20s} {rule}")

    return app