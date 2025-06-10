import os

class Config:
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'  # Para desarrollo local con SQLite
    # SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Cambia esto con tus propios parámetros de conexión de PostgreSQL
    SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg://seteley:seteley@localhost:5434/safe_pay_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False