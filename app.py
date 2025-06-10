from app import create_app, db

app = create_app()

with app.app_context():
    # Verificar si la conexión a la base de datos funciona
    print(db.engine.url)
    print("Conexión exitosa")