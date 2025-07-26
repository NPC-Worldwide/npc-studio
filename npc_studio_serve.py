# npc_serve.py

from npcpy.serve import start_flask_server
if __name__ == "__main__":
    
    start_flask_server(
        port="5337",   
        cors_origins="localhost:5173", 
        debug=False)