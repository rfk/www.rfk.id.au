import requests
import macauthlib

# A set or previously-provisioned MACAuth credentials.
CREDENTIALS = {
  "id": "eyJzYWx0IjogImNlMWM4YyIsICJleHBpcmVzIjogMTM0OTM5NDQ2My43OTIyOTUs"
        "ICJ1c2VyaWQiOiAicnlhbkByZmsuaWQuYXUifWyyOtRhUCI9D4I9Oz0Tho7f4-FK",
  "key": "DqvXadiE3QRySMRLnkGT5EmSvPw="
}

# Create a requests session with a hook to sign all outgoing requests.
# The macauthlib package has native support for request's data types.
def auth_hook(req):
    macauthlib.sign_request(req, **CREDENTIALS)
    return req
session = requests.session(hooks={"pre_request": auth_hook})

# Then we can easily script access to the service.
print session.get("http://localhost:8080/").content

