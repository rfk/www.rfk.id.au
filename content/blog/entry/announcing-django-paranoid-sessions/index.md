+++
title = "Announcing: django-paranoid-sessions"
date = 2009-08-15T22:55:44.594125
updated = 2009-08-15T23:04:51.623835
[taxonomies]
tags = ['python', 'django']
+++

Like most web frameworks, Django provides a convenient mechanism for storing data across requests in a persistent "session" object.  Like most web frameworks, Django implements sessions using a simple mapping from a "session key" to a session object stored on the server.  And like most web frameworks, Django's [default session implementation](http://docs.djangoproject.com/en/dev/topics/http/sessions/) is trivially vulnerable to [session hijacking](http://en.wikipedia.org/wiki/Session_hijacking) attacks.

<!-- more -->

Django's session implementation is quite similar to that provided by PHP; for all the gory details here is an excellent article on [The Truth about Sessions](http://shiflett.org/articles/the-truth-about-sessions), but the simplified version is as follows.  When you first visit a Django-powered site, the server generates a random "session key" and returns it to your browser in a cookie.  Any data that the server wants to remember about you (say, whether you have logged in and under what username) is stored in a giant dictionary indexed by the session key.  On each subsequent visit you browser sends the key back to the server, which looks up your data in this dictionary and proceeds merrily on its way.  The interaction looks something like the following:

* You login at the (hypothetical) Django-powered website `http://www.my-todo-list.com/`.
* The server stores your login details in its session database, and sends back a session key of `123456`.
* You send a request to update your todo list, presenting a session key of `123456`.
* The server looks up "123456" in its session database, checks that the session is correctly logged in as you, and proceeds with the requested update.

It's a simple and convenient mechanism, but it has an important security issue: anyone who knows your session key can impersonate you to the server!  Consider what happens next:

* Using my l33t hacking skillz, I manage to discover your session key.
* I send a request to delete your todo list, presenting a session key of `123456`.
* The server looks up `123456` in its session database, checks that the session is correctly logged in as you, and proceeds to delete all your data.

So the security of this session mechanism depends crucially on the secrecy of the session key.  Unfortunately, finding someone's session key is far from complicated – it's frequently sent back-and-forth between your browser and the server in plain text, meaning anyone on your network can sniff it with ease.  Cookies can also be stolen using a cross-site scripting vulnerability or by exploiting browser bugs.  If the session key is embedded in the URL (as PHP sometimes does) then it can easily show up in referrer logs, bookmarks or emails.

Unlike certain other frameworks, Django *does* take [some simple steps](http://code.djangoproject.com/ticket/362) to avoid session-stealing attacks.  If you can suffer the increased server load, Django also allows you to restrict the session key to secure connections so that it cannot be sniffed in transit.  But there are a range of additional security measures that aren't currently available.

Inspired by this [ancient ticket](http://code.djangoproject.com/ticket/362) about session security, I've developed a new app called [django-paranoid-sessions](http://github.com/rfk/django-paranoid-sessions/tree/master).  It provides a middleware class to make Django work a lot harder at session security, through a (configurable) combination of:

* periodic cycling of session keys.
* HTTP header fingerprinting.
* per-request [nonces](http://en.wikipedia.org/wiki/Cryptographic_nonce).

As usual there's a tradeoff here, providing additional security at the cost of doing more work per request.  You also run the risk of rejecting legitimate user requests that happen to look suspicious. For this reason django-paranoid-sessions is highly configurable, letting you find the right balance for your project.  The [README](http://github.com/rfk/django-paranoid-sessions/tree/master) has all the details, but I'll provide a brief overview of each feature below.

First, a disclaimer:  I'm not a security expert and I'm certainly not a cryptographer.  I'm just interested in these issues and have read a lot about them.  I will not be held responsible if this app randomly boots users out of your site, slows your server to a crawl, or emails all your login details to North Korea.  Having said that, I've been using it on my own projects and I'm pretty confident it's doing what it's supposed to do – so on with the show:

### Session Key Cycling

This is just what it sounds like – forcing the server to generate a fresh session key after a certain time has elapsed.  This means an attacker only has a certain amount of time to discover and exploit your session key before it is discarded by the server.  As an added bonus, it also makes brute-force attempts to guess a session key much more difficult.

### HTTP Header Fingerprinting

This technique records certain characteristics of your browser in the session data; commonly this will include your IP address and User-Agent string.  If a later request against your session does not match the recorded browser "fingerprint", it is assumed to be a session-stealing attack and is rejected.

Such fingerprinting can help prevent casual or accidental session-stealing, but will not stop a determined attacker – all information that the browser provides to the server can potentially be spoofed.  It also runs the risk of terminating legitimate user sessions, for example if your ISP has a habit of changing your IP address mid-session.  Nevertheless, many sites find this to be an acceptable compromise between security and user convenience.

### Per-request Nonces

Using this technique, the server sends another piece of information in addition to the session key: a cryptographic "nonce" that changes with every request.  Like the session key, your browser must present the server with a valid nonce in order to be permitted access to the session.  Unlike the session key, each nonce can only be used for a single request.  To see how this works, consider again my attempt to hack your todo list:


* You login at the (hypothetical) Django-powered website `http://www.my-todo-list.com/`.
* The server stores your login details in its session database, sending back a session key of `123456` and a nonce of `ABCDE`.
* Using my l33t hacking skillz, I manage to sniff your session key and nonce.
* You send a request to update your todo list, presenting a session key of `123456` and a nonce of `ABCDE`.
* The server looks up `123456` in its session database and checks that the session is correctly logged in as you.
* The server checks that `ABCDE` is a valid nonce, records that this nonce has been used, and proceeds with the requested update.
* I send a request to delete your todo list, presenting a session key of `123456` and a nonce of `ABCDE`.
* The server looks up `123456` in its session database and checks that the session is correctly logged in as you.
* The server discovers that the nonce `ABCDE` has already been used, and rejects my request.


Much better!  The use of nonces dramatically narrows the window in which session-stealing attacks can be performed – not only do I have to steal your session key and nonce, but I have to use the nonce before you do.  Even then, your next attempt to use the nonce will invalidate the stolen session and hence limit the damage I can do.

Unfortunately things are not quite as simple as this example.  To allow a user to execute multiple overlapping requests, there must be a brief window during which duplicate nonces are accepted by the server.  django-paranoid-sessions lets you narrow or widen this window as you please, to find the appropriate compromise between security and user convenience for your application.

### More?

That's about the limit of what I know when it comes to securing sessions, but I'm keen to pack as much goodness into this app as possible.  If you've got a favourite technique for squeezing a little more security out of your web apps, I'd love to hear about it.
