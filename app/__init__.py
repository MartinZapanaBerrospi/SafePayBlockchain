from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .config import Config


db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.debug = True  # Activa el modo debug
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