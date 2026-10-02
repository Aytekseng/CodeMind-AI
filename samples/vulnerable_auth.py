import sqlite3
import os

AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE_SECRET_KEY_NEVER_COMMIT"
ADMIN_PASSWORD = "SuperSecretPassword123!"

def authenticate_user(username, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    print(f"Executing Query: {query}")
    
    cursor.execute(query)
    user = cursor.fetchone()
    
    return user

def run_debug_command(user_input):
    print("Executing dynamic debug command...")
    return eval(user_input)

def read_user_file(filename):
    filepath = os.path.join("/var/data/", filename)
    with open(filepath, "r") as f:
        return f.read()
