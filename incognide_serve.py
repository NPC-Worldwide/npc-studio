# npc_serve.py

from npcpy.serve import start_flask_server
import os
import sys

if __name__ == "__main__":
    # Check for --dev flag or detect dev environment
    # Dev mode is enabled if:
    # 1. --dev flag is passed
    # 2. NODE_ENV=development is set
    # 3. Running from npc-studio directory (dev setup, not installed app)
    is_dev_flag = '--dev' in sys.argv
    is_dev_env = os.environ.get('NODE_ENV') == 'development'

    # Check if running from source directory (dev) vs installed location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    is_running_from_source = 'npc-studio' in script_dir and not '/app/' in script_dir

    is_dev = is_dev_flag or is_dev_env or is_running_from_source

    # Dev: 5437, Prod: 5337
    default_port = '5437' if is_dev else '5337'
    port = os.environ.get('INCOGNIDE_PORT', default_port)

    # Frontend port follows the pattern: dev=7337, prod=6337
    frontend_port = '7337' if port == '5437' else '6337'

    mode_str = 'dev' if is_dev else 'prod'
    print(f"Starting Flask server on http://0.0.0.0:{port} ({mode_str} mode)")

    start_flask_server(
        port=port,
        cors_origins=f"localhost:{frontend_port}",
        db_path=os.path.expanduser('~/npcsh_history.db'),
        user_npc_directory=os.path.expanduser('~/.npcsh/npc_team'),
        debug=False)