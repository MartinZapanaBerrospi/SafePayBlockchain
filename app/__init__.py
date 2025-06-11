from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from .config import Config


db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models
    from .crud import bp as crud_bp
    app.register_blueprint(crud_bp, url_prefix='/api', name='crud_api')
    from .routes import bp as routes_bp
    app.register_blueprint(routes_bp, url_prefix='/api', name='routes_api')
    return app