import os

class Config:
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'  # Para desarrollo local con SQLite
    # SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Cambia esto con tus propios parámetros de conexión de PostgreSQL
    SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg://postgres:%40marzabe96@localhost:5432/safe_pay_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False