# npc_serve.py

from npcpy.serve import start_flask_server
import os 
if __name__ == "__main__":
    
    start_flask_server(
        port="5337",   
        cors_origins="localhost:6337", 
        db_path = os.path.expanduser('~/npcsh_history.db'),
        user_npc_directory = os.path.expanduser('~/.npcsh/npc_team'), 
        debug=False)