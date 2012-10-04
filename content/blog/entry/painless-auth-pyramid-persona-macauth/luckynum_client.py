
import requests
import macauthlib


CREDENTIALS = {
  "id": "eyJzYWx0IjogIjE3MThmMSIsICJleHBpcmVzIjogMTM0OTM1MDIwMC40MDM1NzMsI"
        "CJ1c2VyaWQiOiAicnlhbkByZmsuaWQuYXUifRCtAtGwIml5Fk6vaL2uvRQchPMC",
  "key": "p9tYCJ6TGaWbZq9GJq_DalpZmIg="
}


def auth_hook(req):
    macauthlib.sign_request(req, **CREDENTIALS)
    return req


session = requests.session(hooks={"pre_request": auth_hook})
print session.get("http://localhost:8080/").content

