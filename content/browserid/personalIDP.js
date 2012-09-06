

// This script exposes a single global variable "personalIDP".
// It is populated by within a closure below to avoid pollution.
var personalIDP = {};


(function() {


// Grab some libs from the browserid JS bundle.
//
var sjcl = require("/libs/all.js").sjcl;
var jwcrypto = require("./lib/jwcrypto");
require("./lib/algs/rs");
require("./lib/algs/ds");


// A placeholder callback function, used when no callback is provided.
// This defaults to logging unhandled callbacks to the console.
//
personalIDP.default_callback = function() {
  if(window.console) {
      console.log(["Unhandled callback", arguments]);
  }
};


// Get the support-document data for the hosting domain.
// This is retrieved from the .well-known/browserid document
// and cached in memory for future use.
//
personalIDP.getSupportDocument = function(args) {
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  if(personalIDP._cachedSupportDocument) {
      onSuccess(personalIDP._cachedSupportDocument);
  } else {
      $.ajax("/.well-known/browserid", {
          dataType: "json",
          error: onError,
          success: function(data) {
              personalIDP._cachedSupportDocument = data;
              onSuccess(personalIDP._cachedSupportDocument);
          }
      });
  }
}


// Create a new set support-document data for the hosting domain.
// This establishes a new private key, encrypts it with the given password
// and then returns it as a support-document.
//
personalIDP.createSupportDocument = function(args) {
  var password = args.password;
  var template = $.extend({}, args.template || {});
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  personalIDP._cachedSupportDocument = null;

  if(!password) {
      onError("you must specify a password");
      return;
  }

  personalIDP.ensureEntropy(function() {
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
  });
}


//  Decrypt and load private key data for the hosting domain.
//  This grabs the encrypted private-key blob from the support document
//  and decrypts it with the supplied password.
//
personalIDP.decryptPrivateKeyData = function(args) {
  var password = args.password || "";
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  personalIDP.getSupportDocument({
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
personalIDP.authenticate = function(args) {
  var email = args.email;
  var password = args.password;
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  // Try to load the private key data using the given password.
  // If that fails then they're not authenticated.
  // If that succeeds then remember it in a short-lived cookie.
  personalIDP.decryptPrivateKeyData({
      "password": password,
      "error": onError,
      "success": function(privKeyData) {
         var cookie = "personalIDP_privkey=" + privKeyData;
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
personalIDP.loadPrivateKeyData = function(args) {
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  var privKeyData = null;
  var bits = $.map(document.cookie.split(";"), function(bit) {
      return $.trim(bit);
  });
  for(var i=0; i<bits.length; i++) {
      var prefix = "personalIDP_privkey=";
      if(bits[i].indexOf(prefix) == 0) {
          privKeyData = bits[i].substring(prefix.length, bits[i].length);
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
personalIDP.checkIfAuthenticated = function(args) {
  personalIDP.loadPrivateKeyData(args);
}


// Generate a certificate certifying the user's public key.
//
personalIDP.generateCertificate = function(args) {
  var email = args.email;
  var publicKey = args.publicKey;
  var certDuration = args.certDuration;
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  // Older APIs passed this in as a string.
  if(typeof publicKey == "string") {
      publicKey = JSON.parse(publicKey)
  }

  // Don't allow absurdly long certificate duration.
  var maxCertDuration = 24 * 60 * 60;
  if(certDuration > maxCertDuration) {
      certDuration = maxCertDuration;
  }

  // Get the signing key by loading the private key data from a cookie,
  // and the public key data from the live support document.
  personalIDP.loadPrivateKeyData({
    "error": onError,
    "success": function(privKeyData) {
        personalIDP.getSupportDocument({
            "error": onError,
            "success": function(supportDoc) {
                var keyData = {};
                $.extend(keyData, supportDoc["public-key"]);
                $.extend(keyData, JSON.parse(unescape(privKeyData)));

                var myKey = jwcrypto.loadSecretKeyFromObject(keyData);
                var userKey = jwcrypto.loadPublicKeyFromObject(publicKey);

                var now = (new Date()).getTime();
                var exp = now + (certDuration * 1000);
                var issuer = document.domain;

                personalIDP.ensureEntropy(function() {
                    jwcrypto.cert.sign(
                        {publicKey: userKey, principal: {email: email}},
                        {issuer: issuer, issuedAt: now, expiresAt: exp},
                        {}, myKey,
                        function(err, certificate) {
                            if(err) {
                                onError(err);
                            } else {
                                onSuccess(certificate);
                            }
                        }
                    )
                });
            }
        });
    }
  });
}


// Ensure that we have some entropy, requesting it from an
// external service if necessary.  This is not ideal, but it
// seems better than doing nothing.
//
personalIDP.ensureEntropy = function(cb) {
  cb = cb || personalIDP.default_callback;

  if(personalIDP._haveEnsuredEntropy) {
      cb();
      return
  }

  // Start in-browser collectors.
  // This is *supposed* to be done automatically but doesn't
  // seem to work for me, and there's no harm in doing it twice.
  sjcl.random.startCollectors();

  // Request some randomness from random.org.
  //
  // This might fail if the serice is down, or if we request too much
  // data in a single day.  But we'll at least get the timing data to
  // add into the mix.
  //
  // We expect the PRNG to be resistant to malicious sources of entropy.

  var rand_url = "https://www.random.org/cgi-bin/randbyte?nbytes=32&format=h";
  var rand_data = " WE COULD NOT GET ANY REAL ENTROPY :-( "
  var tstart = personalIDP.clock();
  $.ajax(rand_url, {
      success: function(data) {
          rand_data = data;
      },
      complete: function() {
          var tdiff = personalIDP.clock() - tstart;
          jwcrypto.addEntropy(rand_data + tdiff);
          personalIDP._haveEnsuredEntropy = true;
          cb();
      },
  });
}


// Function giving highest precision clock that we can find.
// This is good for timing things, not for absolute time.
//
personalIDP.clock = function() {
  return (new Date()).getTime();
}

var perf = window.performance || {};
if(perf.now) {
  personalIDP.clock = perf.now.bind(perf);
} else if(perf.mozNow) {
  personalIDP.clock = perf.mozNow.bind(perf);
} else if(perf.webkitNow) {
  personalIDP.clock = perf.webkitNow.bind(perf);
} else if(perf.msNow) {
  personalIDP.clock = perf.msNow.bind(perf);
} else if(perf.oNow) {
  personalIDP.clock = perf.oNow.bind(perf);
}

})();
