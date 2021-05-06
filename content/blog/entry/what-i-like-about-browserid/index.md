---
title: >
 What I like about BrowserID
slug: what-i-like-about-browserid
created: !!timestamp '2011-09-30 14:08:00.000000'
modified: !!timestamp '2011-09-30 14:08:00.000000'
tags: 
    - technology
---

{% mark excerpt %}

<p>I'm really impressed by Mozilla's new <a href="http://browserid.org">BrowserID</a> project.</p>

<p>A robust distributed identity infrastructure will make the internet a better place, and I'm keen to help that goal along however I can.  I was quick to jump on the <a href="http://en.wikipedia.org/wiki/OpenID">OpenID</a> bandwagon when it came rolling by, and still use "<a href="http://www.rfk.id.au">http://www.rfk.id.au</a>" as a delegated identity on sites that support it.  But I've never really <i>liked</i> OpenID &ndash; it has always felt clunky to me, both a UI level and as a protocol.</p>

<p>BrowserID fixes pretty much all of the things I dislike about OpenID, and a couple more problems that I didn't even realise I had.</p>

{% endmark %}

<p>First the simple stuff: identifiers.  I don't care how hard you try to get people to call them "Universal Resource Identifiers", anything that looks like "http://blah.blah.com" is a going to be thought of as a <i>URL</i>.  And a URL is something you visit.  It's not an identity, it's a location.  An address.  It's like someone asking "who are you?" and me replying with "I'm 15201 Maple Systems Road".</p>

<p>Despite containing the word "address", an email address is different. It's inextricably tied to a real person.  It <i>feels</i> like an identity in the same way that a Twitter handle feels like one.   It shouldn't really matter, but it does.  Signing in with a URL feels weird, signing in with an email address feels natural.</p>

<p>More important though, at least to me, are the details of BrowserID at the protocol level &ndash; the flow of communication between the user, the website, and the identity provider.</p>

<p>The entire OpenID workflow is built around HTTP redirects, with the intention that it should work just the same across all browsers.  Take a look at this (simplified) protocol diagram (that's "U" for User, "W" for Website and "I" for Identity provider):</p>

<img src="./images/openid.png" />

<p>There are 10 steps in this workflow to shuffle data between the User, the Website, and the Identity provider:</p>
<ol>
<li>The Website asks the User to sign in with OpenID.</li>
<li>The User sends the Website their OpenID URL.</li>
<li>The Website looks up the URL to determine the appropriate Identity provider</li>
<li>The Identity provider sends back some metadata about the authentication.</li>
<li>The Website requests a shared secret from the Identity provider.</li>
<li>The Identity provider response with the shared secret.</li>
<li>The Website sends a token back to the User.</li>
<li>The User provides their credentials to the the Identity provider, asking them to sign the token.</li>
<li>The Identity provider sends back the signature.</li>
<li>The User provides the signed token to the Website to prove their identity.</li>
</ol>

<p>If that's a bit hard to follow, you might like to try this <a href="./images/openid_animated.gif">animated version narrated by lolcats</a>.</p>

<p>Now take a look at BrowserID for comparison:</p>

<img src="./images/browserid.png" />

<p>The first thing to notice is that this workflow contains only 6 steps:</p>
<ol>
<li>The Website asks the User to sign in with BrowserID.</li>
<li>The User sends their credentials to the Identity provider, asking them to sign the User's public key.</li>
<li>The Identity provider sends back a signature to the User.</li>
<li>The User creates a signed assertion using their private key, and sends this to the Website along with their signed public key.</li>
<li>The Website asks the Identity provider for their public key.</li>
<li>The Identity provider sends their public key to the Website, which uses it to verify the assertion.</li>
</ol>

<p>Again, if that's hard to follow, here it is <a href="./images/browserid_animated.gif">explained using a worn-out meme</a>.</p>

<p>The relative simplicity of this protocol is great, but that's not the key point.  What really makes BrowserID tick is that the three sets of interactions are <i>completely decoupled</i>.  Check it out:</p>

<ul>
<li>The User asks the Identity provider to sign their public key.  This has nothing to do with any particular Website.</li>
<li>The Website asks the Identity provider for its public key for verification of signatures.  This has nothing to do with any particular User.</li>
<li>The Website asks the User for their BrowserID, which they return along with a signature and their signed public key.  There's no need to involve the Identity provider in this exchange.</li>
</ul>

<p>Because each interaction is decoupled, the user-agent can maintain its stash of signed identities independent of any website, caching them or refreshing them or discarding them according to its own policies.  The website can likewise keep track of the identity-provider keys on its own schedule, trusting or distrusting any particular provider as it sees fit.</p>

<p>This enables one of the key advantages that the BrowserID team <a href="http://identity.mozilla.com/post/7669886219/how-browserid-differs-from-openid">highlight on their site</a>: the BrowserID protocol respects your privacy.  Unlike OpenID, your identity provider is never sent information about what sites you are visiting or when.</p>


