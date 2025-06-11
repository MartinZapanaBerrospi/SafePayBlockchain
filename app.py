from app import create_app, db

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

with app.app_context():
    # Verificar si la conexión a la base de datos funciona
    print(db.engine.url)
    print("Conexión exitosa")