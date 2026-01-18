# npc_serve.py

from npcpy.serve import start_flask_server
import os

if __name__ == "__main__":
    # Use INCOGNIDE_PORT env var if set, otherwise default to 5337 (prod)
    port = os.environ.get('INCOGNIDE_PORT', '5337')
    # Frontend port follows the pattern: dev=7337, prod=6337
    frontend_port = '7337' if port == '5437' else '6337'

    print(f"Starting Flask server on http://0.0.0.0:{port}")

    start_flask_server(
        port=port,
        cors_origins=f"localhost:{frontend_port}",
        db_path=os.path.expanduser('~/npcsh_history.db'),
        user_npc_directory=os.path.expanduser('~/.npcsh/npc_team'),
        debug=False)