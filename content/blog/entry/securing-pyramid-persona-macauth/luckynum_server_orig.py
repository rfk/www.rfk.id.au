
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
    """Pyramid view to generate a lucky number."""

    # Check that the user is authenticated.
    userid = authenticated_userid(request)
    if userid is None:
        raise Forbidden()

    # Generate and return the lucky numbe.
    number = random.randint(1,100)
    return Response(TEMPLATE.format(**locals()), content_type="text/plain")


def main():
    """Construct and return a WSGI app for the luckynumber service."""

    settings = {
      # The pyramid_persona plugin needs as master secret to use for
      # signing login cookies, and the expected hostname of your website
      # to prevent fradulent login attempts.
      "persona.secret": "TED KOPPEL IS A ROBOT",
      "persona.audiences": "localhost:8080",
    }

    config = Configurator(settings=settings)
    config.add_route("number", "/")
    config.add_view(lucky_number, route_name="number")

    # Including pyramid_persona magically enables authentication.
    config.include("pyramid_persona")
 
    return config.make_wsgi_app()


if __name__ == "__main__":
    app = main()
    server = wsgiref.simple_server.make_server("", 8080, app)
    server.serve_forever()
