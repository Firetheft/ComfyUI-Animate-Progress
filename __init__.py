import os
import server
from aiohttp import web

WEB_DIRECTORY = "./web"

gif_directory = os.path.join(os.path.dirname(__file__), "web", "runners")

if not os.path.exists(gif_directory):
    os.makedirs(gif_directory)

@server.PromptServer.instance.routes.get("/extensions/ComfyUI-Animate-Progress/get_gifs")
async def get_gifs(request):

    gif_files = [f for f in os.listdir(gif_directory) if f.lower().endswith('.gif')]
    return web.json_response(gif_files)

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']