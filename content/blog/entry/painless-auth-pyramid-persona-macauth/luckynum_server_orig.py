
import random
import wsgiref.simple_server

from pyramid.config import Configurator
from pyramid.response import Response
from pyramid.security import authenticated_userid
from pyramid.exceptions import Forbidden


TEMPLATE = """
Hello {userid}!
Your lucky number for today is {number}.
"""

 
def lucky_number(request):
    userid = authenticated_userid(request)
    if userid is None:
        raise Forbidden()
    number = random.randint(1,100)
    return Response(TEMPLATE.format(**locals()), content_type="text/plain")


if __name__ == "__main__":
    settings = {
      "persona.secret": "TED KOPPEL IS A ROBOT",
      "persona.audiences": "localhost:8080",
    }

    config = Configurator(settings=settings)
    config.add_route("number", "/")
    config.add_view(lucky_number, route_name="number")

    config.include("pyramid_persona")

    app = config.make_wsgi_app()
    server = wsgiref.simple_server.make_server("", 8080, app)
    server.serve_forever()
