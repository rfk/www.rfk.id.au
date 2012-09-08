/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
*/
//
//  Pure-javascript Primary Identity Provider for Mozilla Persona:
//
//     https://login.persona.org/
//     https://developer.mozilla.org/Persona/Identity_Provider_Overview
//
//  Inspired by @callahad's MockMyId project, but with at least a semblance
//  of security:
//
//     https://mockmyid.com/
//
//  This script provides the ability to run a single-user Primary IdP for
//  Mozilla Persona, without requiring any server-side support.  It might
//  be useful for folks who run their own vanity domain using a simple
//  static hosting setup.  It will definitely *not* be useful for multi-user
//  scenarios and should not be preferred over a server-side solution.
//
//  The trick is to encrypt the BrowserID private key with a master passphrase
//  and store the encrypted blob as part of the .well-known/browserid document.
//  When it comes time to generate a certificate, the flow goes like this:
//
//     * the authentication page:
//        * prompts the user for the passphrase,
//        * fetches the encrypted private key from the well-known file, and
//        * decrypts the private key and stores it in a session cookie
//
//     * the provisioning page:
//        * reads the private key from the cookie, and
//        * uses it to sign the certificate.
//
//  This setup has some obvious security ramifications:
//
//     * anyone who knows the master passphrase can generate BrowserID
//       assertions for any address at the hosting domain.  So it's really
//       only useful for single-user vanity domains and the like.
//
//     * an attacker could download the encrypted private key and try to
//       brute-force the encryption.  So you need to use a strong passphrase
//       and rotate the key regularly.
//


// All functions exposed by this code are on the "personalIDP" object.
//
// From the perspective of implementing an IdP, the most important ones
// are checkIfAuthenticated(), authenticate(), and generateCertificate().
//
var personalIDP = {};


(function() {


// Grab some libs from the browserid JS bundle.
// This gives us access to decent in-browser crypto.
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


// Create data for a new support-document for the hosting domain.
// This establishes a new private key, encrypts it with the given password
// and then returns it as part of the modified support-document.
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

  // We need entropy both for the key generation and for
  // salting/IVing the encryption.
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
      error: onError,
      success: function(supportDoc) {
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


// The name of the cookie in which we'll store the unlocked private key.
//
personalIDP.cookieName = "personalIDP_privkey";


// This function "signs in" as any claimed user.
// In reality this means decrypting the private key and setting some cookies.
// They must supply the correct master password for our site's private key.
//
personalIDP.authenticate = function(args) {
  var email = args.email;
  var password = args.password;
  var onSuccess = args.success || personalIDP.default_callback;
  var onError = args.error || personalIDP.default_callback;

  // Try to load the private key data using the given password.
  // If that fails then they're not authenticated.
  // If that succeeds then remember it in a session cookie.
  personalIDP.decryptPrivateKeyData({
      "password": password,
      "error": onError,
      "success": function(privKeyData) {
         var cookie = personalIDP.cookieName + "=" + privKeyData + ";";

         // To prevent malicious javascript from stealing this cookie,
         // we path-limit it to the directory with the browserid documents.
         var path = window.location.pathname.split("/").slice(0, -1).join("/");
         cookie += " path=" + path + ";";

         // To prevent this cookie being sent out to be sniffed on the network,
         // we set the "secure" flag to restrict it to https connections.
         cookie += " secure;";

         // To prevent this cookie being read from disk, we do not set an
         // expiration time.  The browserid could keep it in memory and
         // discard it at the end of the browsing session.
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

  // Ah, the joys of parsing out an individual cookie.
  // jQuery doesn't seem to have a utility for this.
  var privKeyData = null;
  var bits = $.map(document.cookie.split(";"), function(bit) {
      return $.trim(bit);
  });
  for(var i=0; i<bits.length; i++) {
      var prefix = personalIDP.cookieName + "=";
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
// This just checks if the private key can be loaded from cookie.
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

  // Older APIs pass this in as a string.
  if(typeof publicKey == "string") {
      publicKey = JSON.parse(publicKey)
  }

  // Don't allow absurdly long certificate duration.
  // According to the developer docs, this must never exceed 24 hours.
  var maxCertDuration = 24 * 60 * 60;
  if(certDuration > maxCertDuration) {
      certDuration = maxCertDuration;
  }

  // Get the full signing key by loading the private key data from cookie,
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

                // We have to ensure that enough entropy is available,
                // or the signing function will block waiting to collect more.
                // Also, you know, it's good for security and all that...
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
// seems better than doing nothing or trying to fake it with
// locally-generated data.
//
// Currently random data is obtained from https://www.random.org/
//
// Once more browsers get support for crypto.getRandomValues this
// this will no longer be necessary, but will still be safe to do.
//
// If the attempt to fetch random data fails, then we still get a small
// amount of entropy from the network timing data.  Not ideal.  But the
// alternative is to forbid logins when entropy isn't available, and I
// think that's acceptable.
//
personalIDP.ensureEntropy = function(cb) {
  cb = cb || personalIDP.default_callback;

  if(personalIDP._haveEnsuredEntropy) {
      cb();
      return
  }

  // Start SJCL in-browser collectors.
  // This is *supposed* to be done automatically but doesn't
  // seem to work for me, and there's no harm in doing it twice.
  sjcl.random.startCollectors();

  // Request some randomness from random.org.
  //
  // This might fail if the sercice is down, or if we request too much
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
//
// With luck this will give us a microsecond-precision timer
// from window.performance, but we fall back to millisecond
// precision from Date() if that's not available.
//
// This measures elapsed time, not absolute time.  It's good
// for timing things and not at all useful for date calculations.
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
