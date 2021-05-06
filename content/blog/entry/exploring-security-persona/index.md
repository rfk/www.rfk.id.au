---
title: >
 Exploring Security on persona.org
slug: exploring-security-persona
created: !!timestamp '2012-12-05 11:43:00.000000'
modified: !!timestamp '2012-12-05 11:43:00.000000'
tags: 
    - technology
    - mozilla
---

{% mark excerpt %}<p>A few weeks ago, I was involved in discovering a security flaw in the pre-beta version of <a href="https://login.persona.org">login.persona.org</a>,  the hosted account manager that drives <a href="https://login.persona.org/about">Mozilla Persona</a>.  It was fixed quickly, but was not publicly disclosed until the team could conduct a full review of any potential impact.  It is public now, and we're confident that no users were affected, so I wanted to share my take on the experience.</p>

<p>The underlying bug I discovered was <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=793579">Bug 793579</a>, and on the surface it was quite unremarkable &ndash; an input validation routine that didn't cover all the edge cases, the kind of bug that every working programmer has committed to code at least once[^1].  But I found the process of discovering, exploring, and finally escalating the bug into a security breach to be a remarkable learning experience.</p>

<p>I've always believed that you learn more about yourself from your failures than you do from your successes, and the same seems to be true about software.  I learned more about the security measures underlying persona.org, and about the philosophy of software security in general, through one afternoon of trying to make it fail than through a year of theorising about how it should succeed.</p>

<p>This post is a bit of a ramble, but I hope it will prove interesting to other developers.  I want to talk about:</p>
<ul>
<li>The original bug that I discovered, and how it could easily have been an immediate full system exploit.</li>
<li>The multiple layers of additional security that kept me from exploiting the bug straight away.</li>
<li>The <i>missing</i> layer of security that ultimately let me turn the bug into a working exploit.</li>
<li>Some resultant amateur philosophising on software security in general.</li>
</ul>

<p>The final outcome of my little adventure might seem counter-intuitive: the process of penetrating the defences on persona.org has actually <i>increased</i> my confidence in the ultimate security of the system.  The fact is, bugs do happen, especially while a system is under heavy development.   But its focus on multiple layers of security gives persona.org a strong set of defences to limit any potential fallout.</p>

<p>Oh, and to prevent any confusion:  I am employed by Mozilla, but am not part of the team behind Mozilla Persona.  As far as this story is concerned, I am simply an interested third-party.</p>{% endmark %}

<br />
<h3>Preliminaries</h3>

<p>For this post to make any sense at all, I first need to describe what Persona actually <i>does</i>, at least a high level.</p>

<p>Put simply, Persona is a new login system for the web.  It is built upon the <a href="https://github.com/mozilla/id-specs/blob/prod/browserid/index.md">BrowserID protocol</a>, through which your email provider can give you a digitally-signed <b>Identity Certificate</b> that attests to your ownership of a particular email address.  You can then use this certificate to generate an <b>Identity Assertion</b> that lets you login on a persona-supporting website, without have to set up yet another username and password.</p>

<p>I encourage you to check out the <a href="https://developer.mozilla.org/docs/persona">developer docs</a>, it's a very elegant system.</p>

<p>The difficulty with such a scheme, though, is that there's a classic chicken-and-egg problem at work &ndash; websites will only see value from Persona if many email providers offer it for their users, and email providers will only see value from Persona if it can be used on many websites.  There is little incentive for either party to strike out on their own as an early adopter.</p>

<p>To bootstrap around this issue, Mozilla provides what is called a <b>Fallback Identity Provider</b>.  This service issues Identity Certificates for users whose email provider does not have native BrowserID support, using a standard email-confirmation-link workflow.  Websites can thus push ahead and add Persona support without waiting for individual email providers to get on board.<p>

<p>The Fallback Provider is what's running on <a href="https://login.persona.org/">login.persona.org</a>.</p>

<p>If I could somehow convince the Fallback Provider to issue me an Identity Certificate for an email address that I do not own, then I could fraudulently login to any persona-supporting website with that identity.  That's precisely the exploit that I uncovered.</p>


<br />
<h3 id="the-bug">The Bug</h3>

<p>It all started completely by accident.</p>

<p>While working on <a href="/blog/entry/persona-identity-provider/">turning my personal domain into a Persona Identity Provider</a>, I happened to have <a href="https://getfirebug.com/">firebug</a> open and happened to notice a network call succeeding when it should have failed.  The call was to <a href="https://login.persona.org/wsapi/auth_with_assertion">/wsapi/auth_with_assertion</a>, part of the internal web-service API for persona.org, and it was successfully logging me in despite the fact that I had provided it with an invalid Identity Assertion.</p>

<p>The primary <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=793579">underlying bug</a> turned out to be quite an ordinary omission with quite dramatic consequences.  The routine for validating Identity Assertions was failing to perform all the necessary checks.  By carefully crafting the input to this API call, I could establish a valid login session with any email address of my choosing.</p>

<p>At first blush, this sounds like a slam-dunk, game-over security exploit &ndash; I use this bug to login to your account, obtain an Identity Certificate for one of your email addresses, and merrily go about the business of impersonating you all over the web.  Right?</p>


<br />
<h3 id="failed-attempts">Four Failed Attempts</h3>

<p>Not so fast.<p>

<p>The login system on persona.org understands two distinct levels of authorisation, depending on how you proved your identity.  If you login with an Identity Assertion using the API call from above, then you get a session marked with an authorisation level of "assertion".  This lets you do various account-management activities like adding or removing email addresses, but it restricts access to more sensitive features like the generation of Identity Certificates.  For that, you have to have a session with an authorisation level of "password".</p>

<p>So I could exploit this bug to vandalise your account a little, but not to impersonate you to other websites.  By having an additional layer of security checking in place, persona.org prevented this bug from causing an immediate and total breach of its security.</p>

<p>I am, however, a determined attacker.</p>

<p>What I <i>can</i> do from the "assertion" authorisation level is to reset the password on your account.  I add my own email address onto the account, have a password reset email sent there, and click through the contained link to change your password to something of my choosing.  This would allow me to login with "password" authorisation level and take complete control over your account.  Right?</p>

<p>Not so fast.</p>

<p>The password-reset flow on persona.org does more than just change the password.  It also resets all your email addresses so that they're marked as "unconfirmed".  When I try to use the freshly-changed password to request an Identity Certificate, persona.org will send an email asking you to re-confirm ownership of the address.  Since I can't read your email, I can't click the confirmation link and my attempt to impersonate you will fail.</p>

<p>As I understand it, this mechanism was put in place to handle email addresses that change hands, such as a work-related address that is passed on from one employee to another.  But because it was implemented as an independent security mechanism, it was able to prevent escalation of an unrelated bug into a more serious security breach.</p>

<p>I am, however, a very wily character.</p>

<p>Perhaps I can trick you into clicking the confirmation link for me?  I can control the URL displayed in the confirmation email, so I could make it say something like "<a href="https://click-to-get-a-free-ipad.com">click-to-get-a-free-ipad.com</a>".  As an unsuspecting user you might click on the link, re-confirm the email address as part of your Persona account, and enable me to impersonate you all over the web.  Possible?</p>

<p>Not so fast.</p>

<p>First off, Persona's confirmation emails are very carefully worded to reduce the chance of clicking through a confirmation you did not initiate.  But users are known to skip reading things from time to time, so it's still a possibility.</p>

<p>Persona also has an extra security measure in place here: its confirmation links are tied to a particular browsing session.  Most users will probably never notice it, but if you add an email address on one computer and then click through the confirmation email on a different computer, you will be asked to re-enter your password before proceeding.</p>

<p>Of course, you can't re-enter your password, because I just changed it to gain access to your account.  So even my long-shot of a phishing attempt will fail.</p>

<p>I am, however, a very patient man.</p>

<p>At this point you will likely notice that your password is not working, and go through the password reset process yourself in order to repair it.  If I just keep my existing password-level login session active, waiting patiently for you to repair the account and re-confirm your email addresses, then I will eventually have full access and be able to impersonate you.  Right?</p>

<p>You guessed it &ndash; not so fast.</p>

<p>The password-reset flow doesn't just unconfirm any email addresses associated with your account, it also invalidates any active login sessions.   As soon as you re-assert control over your account, my hacked session is invalidated and I will be locked back out.</p>

<p>At this point I gave up, as you can see from <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=793579#c2">my initial comments</a> on the bug.</p>

<p>Try as I might, I could not find a way to exploit this bug in the <a href="https://login.persona.org/wsapi/auth_with_assertion">/wsapi/auth_with_assertion</a> API call.  Despite gaining the ability to login to arbitrary accounts, four separate layers of additional security prevented me from doing anything more serious than some light vandalism.  That's pretty impressive, and it would be wonderful if the story could stop here &ndash; It's a perfect textbook example of how a securely-constructed system should behave.</p>


<br />
<h3 id="the-exploit">The Exploit</h3>

<p>After sleeping on it, I had another idea.</p>

<p>Since all <a href="http://github.com/mozilla/browserid">the code behind persona.org</a> is open-source, I could poke around in the source to find the precise location of the bug, then look for other API calls that might be vulnerable.  This is one of the wonderfully scary facts about building open source software &ndash; there is nowhere for bad code to hide.</p>

<p>The buggy function turned out to be <a href="https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/primary.js#L280">primary.verifyAssertion</a>, a utility function for checking if Identity Assertions are valid.  A little bit of grepping revealed another API endpoint, <a href="https://login.persona.org/wsapi/add_email_with_assertion">/wsapi/add_email_with_assertion</a>, that depends on this function for its security.  While the previous endpoint would let me fraudulently login to another user's account, this one let me fraudulently add email addresses onto my own account.</p>

<p>Unfortunately, this one <i>was</i> a slam-dunk, game-over security exploit.  By calling this API with a malicious Identity Assertion, I could associate your email address with my account, generate an Identity Certificate for this fraudulently-added address, then use it to impersonate you all over the web.</p>

<p>But here's the interesting thing: it didn't have to be that way.</p>

<p>Each email address attached to a persona.org account is marked as either "primary" or "secondary".  Primary emails are those that offer native support for the BrowserID protocol, while secondary emails are those that require use of the Fallback Identity Provider.  When I exploited this bug to add an email address onto my account, it was marked as "primary" because I proved ownership of it with a (fraudulent) Identity Assertion.</p>

<p>In the normal flow of things, the Fallback Provider should <i>never</i> be asked to issue an Identity Certificate for a primary-type address.  The email provider has native support, so the the fallback would never be called on to get involved in the first place.  If it is, then that's an indication that something fishy is going on.</p>

<p>So there was, in fact, a second bug at play here:  The Fallback Identity Provider was happily issuing Identity Certificates for an address that it believed to have native BrowserID support, even though there is no reason it should ever be asked to do that.</p>

<p>It would be easy to overlook this bug, or even to consider it as not a bug at all.  What's the harm in issuing Identity Certificates for primary-type addresses, as long as the user has proved that they own the address in question?  Technically, nothing.  When everything else is working as designed, it makes absolutely no difference to the security of the system.</p>

<p>But if the certificate-issuing code had been just a little more paranoid, a little less trusting of the integrity of the rest of the system, then the fallout from <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=793579">Bug 793579</a> would have been absolutely minimal.  This missed opportunity for another layer of defence ultimately made the difference between annoying bug and full-blown security breach.</p>


<br />
<h3 id="lessons-learned">Lessons Learned</h3>

<p>I found several interesting lessons in this experience.</p>

<p>To begin, it showed concrete examples of some sophisticated security practices that could be useful on other sites.  Tying confirmation links to a particular login session, and clearing active login sessions when the password is reset, are things that could be done just about anywhere but are rarely seen in practice.  To pick an arbitrary example, neither <a href="https://www.djangoproject.com/">Django's</a> builtin <a href="https://docs.djangoproject.com/en/dev/topics/http/sessions/">session framework</a> nor its highly popular <a href="https://bitbucket.org/ubernostrum/django-registration/">email-confirmation package</a> implement these measures.  Neither, for that matter, does my own <a href="http://pypi.python.org/pypi/django-paranoid-sessions/">django-paranoid-sessions</a> module.</p>

<p>The experience also helped to reinforce an old design adage: <a href="http://en.wikipedia.org/wiki/Don%27t_repeat_yourself">Don't Repeat Yourself</a>.  The buggy <a href="https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/primary.js#L280">primary.verifyAssertion</a> function was essentially equivalent to the <a href="https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/verifier/certassertion.js#L90">certassertion.verify</a> function used by another part of the code &ndash; the only differences seem to be some implicit parameters, and a critical security bug.  If this logic had been factored out into a shared helper function, the bug would almost certainly have been discovered and removed.  (Of course, you have to be careful that such refactoring doesn't <a href="http://www.daemonology.net/blog/2011-01-18-tarsnap-critical-security-bug.html">introduce bugs of its own</a>.)</p>

<p>Finally, this was a really good demonstration of how multiple layers of security can save your skin when things start to go wrong.  The security community call this principle <a href="https://www.owasp.org/index.php/Defense_in_depth">Defence in Depth</a>, but I personally prefer the eminently practical phrasing offered by Ben Adida: <a href="http://benlog.com/articles/2010/09/07/defending-against-your-own-stupidity/">Defending Against Your Own Stupidity</a>.</p>

<p>In fact, I'm just going to quote him verbatim:</p>

<blockquote cite="http://benlog.com/articles/2010/09/07/defending-against-your-own-stupidity/">
Consider the utility of a safety parachute. A determined attacker trying to kill you will obviously sabotage the safety parachute just as easily as he can sabotage the primary one. So, does that mean you might as well jump without a safety parachute? Of course not. You want to take into account not just the worst-case attacker, you want to take into account your own stupidity. A safety parachute means that, if you packed your primary wrong, you can still live. Defense in depth, as it's more commonly known in the security community, is usually not about building the 12 layers of security around the "Die Hard" vault that a skilled attacker has to vanquish, one by one. Defense in depth is the humble realization that, of all the security measures you implement, a few will fail because of your own stupidity. It's good to have a few backups, just in case.
</blockquote>

<p>This principle is most often applied at the macro level, by building multiple levels of security into your system or your protocol.  This is why Persona uses <a href="http://lloyd.io/persona-architectural-changes">a separate process for writing to the database</a>.  It's why Mozilla Services apps will be using <a href="/blog/entry/securing-pyramid-persona-macauth/">MACAuth</a> instead of simple bearer tokens, even though all communication is done over TLS and is theoretically secure against eavesdropping.  And it's why security experts insist that OAuth 2.0 <a href="http://hueniverse.com/2010/09/oauth-2-0-without-signatures-is-bad-for-the-web/">should</a> <a href="benlog.com/articles/2009/12/22/its-a-wrap/">have</a> <a href="http://www.links.org/?p=833">done</a> <a href="http://hueniverse.com/2010/09/oauth-bearer-tokens-are-a-terrible-idea/">likewise</a>.</p>

<p>But it can also be applied at the micro level, between different layers within a single software system.  I have read about this idea in the past, most memorably in Colin Percival 's excellent articles <a href="http://www.daemonology.net/blog/2009-06-11-cryptographic-right-answers.html">Cryptographic Right Answers</a> and <a href="http://www.daemonology.net/blog/2009-06-24-encrypt-then-mac.html">Encrypt-then-MAC</a>, but don't think I ever understood it as anything more than theory.  After having an up-close-and-personal view of both how it can succeed, and how it <i>could have</i> succeeded, I will definitely think more deliberately about this principle in the future.</p>

<p>Actually, I think <a href="http://benlog.com/articles/2010/09/07/defending-against-your-own-stupidity/">DAYOS</a> could be right up there with <a href="http://en.wikipedia.org/wiki/Don%27t_repeat_yourself">DRY</a> as an acronymic axiom to program by.</p>

<p>All of this pondering has led me to a rather counter-intuitive discovery: going through the process of breaking the security on persona.org has given me <i>more</i> confidence in the ultimate security of the system.  If an input validation bug of this sort had been present in my own code, it most likely would have lead immediately to a full security breach &ndash; not to having to navigate around all these extra layers of protection.</p>

<p>So perhaps the overall lesson here is simply that good security is a lot of hard work.  When you can, it's a good idea to leave it to the professionals.  To me, that sounds like another good reason to consider <a href="https://login.persona.org/">Persona</a> instead of rolling your own authentication system.</p>

<p>[^1] My own personal worst: an online file manager that let you download /etc/password.</p>
