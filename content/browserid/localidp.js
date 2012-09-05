
var sjcl = require("/libs/all.js").sjcl;
var jwcrypto = require("./lib/jwcrypto");
require("./lib/algs/rs");

var localidp = {}

// A placeholder callback function that does nothing.
//
localidp.noop = function() {};


// Get the support-document data for the hosting domain.
// This is retrieved from the .well-known/browserid document
// and cached in memory for future use.
//
localidp.getSupportDocument = function(args) {
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;
  if(localidp._cachedSupportDocument) {
      onSuccess(localidp._cachedSupportDocument);
  } else {
      $.ajax("/.well-known/browserid", {
          dataType: "json",
          error: onError,
          success: function(data) {
              localidp._cachedSupportDocument = data;
              onSuccess(localidp._cachedSupportDocument);
          }
      });
  }
}


// Create a new set support-document data for the hosting domain.
// This establishes a new private key, encrypts it with the given password
// and then returns it as a support-document.
//
localidp.createSupportDocument = function(args) {
  var password = args.password;
  var template = $.extend({}, args.template || {});
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;

  localidp._cachedSupportDocument = null;

  if(!password) {
      onError("you must specify a password");
      return;
  }

  var keyParams = {"algorithm": "RS", "keysize": 128};
  jwcrypto.generateKeypair(keyParams, function(err, kp) {
      if(err) {
          onError(err);
          return;
      }

      // Extract the key data into plain JS objects.
      var pubKey = {"algorithm": kp.algorithm};
      var privKey = {};
      kp.publicKey.serializeToObject(pubKey);
      kp.secretKey.serializeToObject(privKey);

      // Delete any information from privKey that's duplicated in pubKey.
      // No point bulking up the file with needlessly-encrypted data.
      var to_delete = [];
      for(var nm in privKey) {
          if(privKey.hasOwnProperty(nm) && pubKey.hasOwnProperty(nm)) {
              to_delete.push(nm);
          }
      }
      for(var i=0; i<to_delete.length; i++) {
          delete privKey[to_delete[i]];
      }

      // Encrypt the private key data with the given password.
      var privKeyData = escape(JSON.stringify(privKey));
      var encPrivKeyData = sjcl.encrypt(password, privKeyData);

      // Put it all into the support document.
      var supportDoc = $.extend({}, template);
      supportDoc["public-key"] = pubKey;
      supportDoc["encrypted-private-key"] = encPrivKeyData;
      onSuccess(supportDoc);
  });
}


//  Decrypt and load private key data for the hosting domain.
//  This grabs the encrypted private-key blob from the support document
//  and decrypts it with the supplied password.
//
localidp.decryptPrivateKeyData = function(args) {
  var password = args.password || "";
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;

  localidp.getSupportDocument({
      "error": onError,
      "success": function(supportDoc) {
          try {
              var encPrivKeyData = supportDoc["encrypted-private-key"];
              var privKeyData = sjcl.decrypt(password, encPrivKeyData);
              onSuccess(privKeyData);
          } catch(err) {
              onError(err);
          }
      }
  });
}


// This function "signs in" as any claimed user.
// In reality this means checking the password and setting some cookies.
// They must supply the correct master password for our site's publicKey.
//
localidp.authenticate = function(args) {
  var email = args.email;
  var password = args.password;
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;

  // Try to load the private key data using the given password.
  // If that fails then they're not authenticated.
  // If that succeeds then remember it in a short-lived cookie.
  localidp.decryptPrivateKeyData({
      "password": password,
      "error": onError,
      "success": function(privKeyData) {
         var cookie = "localidp_privkey=" + privKeyData;
         var tomorrow = new Date((new Date()).getTime() + (24*60*60*1000));
         cookie += "; expires=" + tomorrow.toString();
         cookie += "; path=/"
         document.cookie = cookie;
         onSuccess();
      }
  });
};


// Load private key data that was previously stored in a cookie.
//
localidp.loadPrivateKeyData = function(args) {
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;

  var privKeyData = null;
  var bits = $.map(document.cookie.split(";"), function(bit) {
      return $.trim(bit);
  });
  for(var i=0; i<bits.length; i++) {
      if(bits[i].indexOf("localidp_privkey=") == 0) {
          privKeyData = bits[i].substring(17, bits[i].length);
          break;
      }
  }

  if(!privKeyData) {
      onError("user is not authenticated");
  } else {
      onSuccess(privKeyData);
  }
}


// Check whether the user is currently signed in.
// This just involves a local cookie check.
//
localidp.checkIfAuthenticated = function(args) {
  localidp.loadPrivateKeyData(args);
}


// Generate a certificate certifying the user's public key.
//
localidp.generateCertificate = function(args) {
  var email = args.email;
  var publicKey = args.publicKey;
  var certDuration = args.certDuration;
  var onSuccess = args.success || localidp.noop;
  var onError = args.error || localidp.noop;

  // Don't allow absurdly long certificate duration.
  var maxCertDuration = 24 * 60 * 60;
  if(certDuration > maxCertDuration) {
      certDuration = maxCertDuration;
  }

  // Get the signing key by loading the private key data from a cookie,
  // and the public key data from the live support document.
  localidp.loadPrivateKeyData({
    "error": onError,
    "success": function(privKeyData) {
        localidp.getSupportDocument({
            "error": onError,
            "success": function(supportDoc) {
                var keyData = {};
                $.extend(keyData, supportDoc["public-key"]);
                $.extend(keyData, JSON.parse(unescape(privKeyData)));

                var myKey = jwcrypto.loadSecretKeyFromObject(keyData);
                var userKey = jwcrypto.loadPublicKeyFromObject(publicKey);

                var now = (new Date()).getTime();
                var exp = now + (certDuration * 1000);

                jwcrypto.cert.sign(
                    {publicKey: userKey, principal: {email: email}},
                    {issuer: 'rfk.id.au', issuedAt: now, expiresAt: exp},
                    {}, myKey,
                    function(err, certificate) {
                        if(err) {
                            onError(err);
                        } else {
                            onSuccess(certificate);
                        }
                    }
                )
            }
        });
    }
  });
}
