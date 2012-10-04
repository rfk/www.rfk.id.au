
import random
import wsgiref.simple_server

import tokenlib

from pyramid.config import Configurator
from pyramid.interfaces import IAuthenticationPolicy
from pyramid.response import Response
from pyramid.security import authenticated_userid
from pyramid.exceptions import Forbidden

from pyramid_macauth import MACAuthenticationPolicy


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


def provision_creds(request):
    userid = authenticated_userid(request)
    if userid is None:
        raise Forbidden()
    policy = request.registry.getUtility(IAuthenticationPolicy)
    policy = policy.get_policy(MACAuthenticationPolicy)
    id, key = policy.encode_mac_id(request, userid)
    return {"id": id, "key": key}
 

if __name__ == "__main__":
    settings = {
      "persona.secret": "TED KOPPEL IS A ROBOT",
      "persona.audiences": "localhost:8080",

      "macauth.master_secret": "V8 JUICE IS 1/8TH GASOLINE",

      "multiauth.policies": "pyramid_persona pyramid_macauth",
    }

    config = Configurator(settings=settings)
    config.add_route("number", "/")
    config.add_view(lucky_number, route_name="number")

    config.include("pyramid_multiauth")
    config.add_forbidden_view("pyramid_persona.views.forbidden")

    config.add_route("provision", "/provision")
    config.add_view(provision_creds, route_name="provision", renderer="json")

    app = config.make_wsgi_app()
    server = wsgiref.simple_server.make_server("", 8080, app)
    server.serve_forever()
