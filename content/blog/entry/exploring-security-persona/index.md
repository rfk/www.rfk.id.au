+++
title = "Exploring Security on persona.org"
date = 2012-12-05T11:43:00
updated = 2012-12-05T11:43:00
[taxonomies]
tags = ['technology', 'mozilla']
+++

A few weeks ago, I was involved in discovering a security flaw in the pre-beta version of [login.persona.org](https://login.persona.org),  the hosted account manager that drives [Mozilla Persona](https://login.persona.org/about).  It was fixed quickly, but was not publicly disclosed until the team could conduct a full review of any potential impact.  It is public now, and we're confident that no users were affected, so I wanted to share my take on the experience.

<!-- more -->

The underlying bug I discovered was [Bug 793579](https://bugzilla.mozilla.org/show_bug.cgi?id=793579), and on the surface it was quite unremarkable – an input validation routine that didn't cover all the edge cases, the kind of bug that every working programmer has committed to code at least once[^1].  But I found the process of discovering, exploring, and finally escalating the bug into a security breach to be a remarkable learning experience.

I've always believed that you learn more about yourself from your failures than you do from your successes, and the same seems to be true about software.  I learned more about the security measures underlying persona.org, and about the philosophy of software security in general, through one afternoon of trying to make it fail than through a year of theorising about how it should succeed.

This post is a bit of a ramble, but I hope it will prove interesting to other developers.  I want to talk about:

* The original bug that I discovered, and how it could easily have been an immediate full system exploit.
* The multiple layers of additional security that kept me from exploiting the bug straight away.
* The *missing* layer of security that ultimately let me turn the bug into a working exploit.
* Some resultant amateur philosophising on software security in general.


The final outcome of my little adventure might seem counter-intuitive: the process of penetrating the defences on persona.org has actually *increased* my confidence in the ultimate security of the system.  The fact is, bugs do happen, especially while a system is under heavy development.   But its focus on multiple layers of security gives persona.org a strong set of defences to limit any potential fallout.

Oh, and to prevent any confusion:  I am employed by Mozilla, but am not part of the team behind Mozilla Persona.  As far as this story is concerned, I am simply an interested third-party.


### Preliminaries

For this post to make any sense at all, I first need to describe what Persona actually *does*, at least a high level.

Put simply, Persona is a new login system for the web.  It is built upon the [BrowserID protocol](https://github.com/mozilla/id-specs/blob/prod/browserid/index.md), through which your email provider can give you a digitally-signed **Identity Certificate** that attests to your ownership of a particular email address.  You can then use this certificate to generate an **Identity Assertion** that lets you login on a persona-supporting website, without have to set up yet another username and password.

I encourage you to check out the [developer docs](https://developer.mozilla.org/docs/persona), it's a very elegant system.

The difficulty with such a scheme, though, is that there's a classic chicken-and-egg problem at work – websites will only see value from Persona if many email providers offer it for their users, and email providers will only see value from Persona if it can be used on many websites.  There is little incentive for either party to strike out on their own as an early adopter.

To bootstrap around this issue, Mozilla provides what is called a **Fallback Identity Provider**.  This service issues Identity Certificates for users whose email provider does not have native BrowserID support, using a standard email-confirmation-link workflow.  Websites can thus push ahead and add Persona support without waiting for individual email providers to get on board.

The Fallback Provider is what's running on [login.persona.org](https://login.persona.org/).

If I could somehow convince the Fallback Provider to issue me an Identity Certificate for an email address that I do not own, then I could fraudulently login to any persona-supporting website with that identity.  That's precisely the exploit that I uncovered.




### The Bug

It all started completely by accident.

While working on [turning my personal domain into a Persona Identity Provider](/blog/entry/persona-identity-provider/), I happened to have [firebug](https://getfirebug.com/) open and happened to notice a network call succeeding when it should have failed.  The call was to [/wsapi/auth_with_assertion](https://login.persona.org/wsapi/auth_with_assertion), part of the internal web-service API for persona.org, and it was successfully logging me in despite the fact that I had provided it with an invalid Identity Assertion.

The primary [underlying bug](https://bugzilla.mozilla.org/show_bug.cgi?id=793579) turned out to be quite an ordinary omission with quite dramatic consequences.  The routine for validating Identity Assertions was failing to perform all the necessary checks.  By carefully crafting the input to this API call, I could establish a valid login session with any email address of my choosing.

At first blush, this sounds like a slam-dunk, game-over security exploit – I use this bug to login to your account, obtain an Identity Certificate for one of your email addresses, and merrily go about the business of impersonating you all over the web.  Right?




### Four Failed Attempts

Not so fast.

The login system on persona.org understands two distinct levels of authorisation, depending on how you proved your identity.  If you login with an Identity Assertion using the API call from above, then you get a session marked with an authorisation level of "assertion".  This lets you do various account-management activities like adding or removing email addresses, but it restricts access to more sensitive features like the generation of Identity Certificates.  For that, you have to have a session with an authorisation level of "password".

So I could exploit this bug to vandalise your account a little, but not to impersonate you to other websites.  By having an additional layer of security checking in place, persona.org prevented this bug from causing an immediate and total breach of its security.

I am, however, a determined attacker.

What I *can* do from the "assertion" authorisation level is to reset the password on your account.  I add my own email address onto the account, have a password reset email sent there, and click through the contained link to change your password to something of my choosing.  This would allow me to login with "password" authorisation level and take complete control over your account.  Right?

Not so fast.

The password-reset flow on persona.org does more than just change the password.  It also resets all your email addresses so that they're marked as "unconfirmed".  When I try to use the freshly-changed password to request an Identity Certificate, persona.org will send an email asking you to re-confirm ownership of the address.  Since I can't read your email, I can't click the confirmation link and my attempt to impersonate you will fail.

As I understand it, this mechanism was put in place to handle email addresses that change hands, such as a work-related address that is passed on from one employee to another.  But because it was implemented as an independent security mechanism, it was able to prevent escalation of an unrelated bug into a more serious security breach.

I am, however, a very wily character.

Perhaps I can trick you into clicking the confirmation link for me?  I can control the URL displayed in the confirmation email, so I could make it say something like "[click-to-get-a-free-ipad.com](https://click-to-get-a-free-ipad.com)".  As an unsuspecting user you might click on the link, re-confirm the email address as part of your Persona account, and enable me to impersonate you all over the web.  Possible?

Not so fast.

First off, Persona's confirmation emails are very carefully worded to reduce the chance of clicking through a confirmation you did not initiate.  But users are known to skip reading things from time to time, so it's still a possibility.

Persona also has an extra security measure in place here: its confirmation links are tied to a particular browsing session.  Most users will probably never notice it, but if you add an email address on one computer and then click through the confirmation email on a different computer, you will be asked to re-enter your password before proceeding.

Of course, you can't re-enter your password, because I just changed it to gain access to your account.  So even my long-shot of a phishing attempt will fail.

I am, however, a very patient man.

At this point you will likely notice that your password is not working, and go through the password reset process yourself in order to repair it.  If I just keep my existing password-level login session active, waiting patiently for you to repair the account and re-confirm your email addresses, then I will eventually have full access and be able to impersonate you.  Right?

You guessed it – not so fast.

The password-reset flow doesn't just unconfirm any email addresses associated with your account, it also invalidates any active login sessions.   As soon as you re-assert control over your account, my hacked session is invalidated and I will be locked back out.

At this point I gave up, as you can see from [my initial comments](https://bugzilla.mozilla.org/show_bug.cgi?id=793579#c2) on the bug.

Try as I might, I could not find a way to exploit this bug in the [/wsapi/auth_with_assertion](https://login.persona.org/wsapi/auth_with_assertion) API call.  Despite gaining the ability to login to arbitrary accounts, four separate layers of additional security prevented me from doing anything more serious than some light vandalism.  That's pretty impressive, and it would be wonderful if the story could stop here – It's a perfect textbook example of how a securely-constructed system should behave.




### The Exploit

After sleeping on it, I had another idea.

Since all [the code behind persona.org](http://github.com/mozilla/browserid) is open-source, I could poke around in the source to find the precise location of the bug, then look for other API calls that might be vulnerable.  This is one of the wonderfully scary facts about building open source software – there is nowhere for bad code to hide.

The buggy function turned out to be [primary.verifyAssertion](https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/primary.js#L280), a utility function for checking if Identity Assertions are valid.  A little bit of grepping revealed another API endpoint, [/wsapi/add_email_with_assertion](https://login.persona.org/wsapi/add_email_with_assertion), that depends on this function for its security.  While the previous endpoint would let me fraudulently login to another user's account, this one let me fraudulently add email addresses onto my own account.

Unfortunately, this one *was* a slam-dunk, game-over security exploit.  By calling this API with a malicious Identity Assertion, I could associate your email address with my account, generate an Identity Certificate for this fraudulently-added address, then use it to impersonate you all over the web.

But here's the interesting thing: it didn't have to be that way.

Each email address attached to a persona.org account is marked as either "primary" or "secondary".  Primary emails are those that offer native support for the BrowserID protocol, while secondary emails are those that require use of the Fallback Identity Provider.  When I exploited this bug to add an email address onto my account, it was marked as "primary" because I proved ownership of it with a (fraudulent) Identity Assertion.

In the normal flow of things, the Fallback Provider should *never* be asked to issue an Identity Certificate for a primary-type address.  The email provider has native support, so the the fallback would never be called on to get involved in the first place.  If it is, then that's an indication that something fishy is going on.

So there was, in fact, a second bug at play here:  The Fallback Identity Provider was happily issuing Identity Certificates for an address that it believed to have native BrowserID support, even though there is no reason it should ever be asked to do that.

It would be easy to overlook this bug, or even to consider it as not a bug at all.  What's the harm in issuing Identity Certificates for primary-type addresses, as long as the user has proved that they own the address in question?  Technically, nothing.  When everything else is working as designed, it makes absolutely no difference to the security of the system.

But if the certificate-issuing code had been just a little more paranoid, a little less trusting of the integrity of the rest of the system, then the fallout from [Bug 793579](https://bugzilla.mozilla.org/show_bug.cgi?id=793579) would have been absolutely minimal.  This missed opportunity for another layer of defence ultimately made the difference between annoying bug and full-blown security breach.




### Lessons Learned

I found several interesting lessons in this experience.

To begin, it showed concrete examples of some sophisticated security practices that could be useful on other sites.  Tying confirmation links to a particular login session, and clearing active login sessions when the password is reset, are things that could be done just about anywhere but are rarely seen in practice.  To pick an arbitrary example, neither [Django's](https://www.djangoproject.com/) builtin [session framework](https://docs.djangoproject.com/en/dev/topics/http/sessions/) nor its highly popular [email-confirmation package](https://bitbucket.org/ubernostrum/django-registration/) implement these measures.  Neither, for that matter, does my own [django-paranoid-sessions](http://pypi.python.org/pypi/django-paranoid-sessions/) module.

The experience also helped to reinforce an old design adage: [Don't Repeat Yourself](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself).  The buggy [primary.verifyAssertion](https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/primary.js#L280) function was essentially equivalent to the [certassertion.verify](https://github.com/mozilla/browserid/blob/6fcb9c31947b7bff48d9b6630dadd22b6a8fb422/lib/verifier/certassertion.js#L90) function used by another part of the code – the only differences seem to be some implicit parameters, and a critical security bug.  If this logic had been factored out into a shared helper function, the bug would almost certainly have been discovered and removed.  (Of course, you have to be careful that such refactoring doesn't [introduce bugs of its own](http://www.daemonology.net/blog/2011-01-18-tarsnap-critical-security-bug.html).)

Finally, this was a really good demonstration of how multiple layers of security can save your skin when things start to go wrong.  The security community call this principle [Defence in Depth](https://www.owasp.org/index.php/Defense_in_depth), but I personally prefer the eminently practical phrasing offered by Ben Adida: [Defending Against Your Own Stupidity](http://benlog.com/articles/2010/09/07/defending-against-your-own-stupidity/).

In fact, I'm just going to quote him verbatim:

> Consider the utility of a safety parachute. A determined attacker trying to kill you will
> obviously sabotage the safety parachute just as easily as he can sabotage the primary one.
> So, does that mean you might as well jump without a safety parachute? Of course not.
> You want to take into account not just the worst-case attacker, you want to take into account
> your own stupidity. A safety parachute means that, if you packed your primary wrong, you can
> still live. Defense in depth, as it's more commonly known in the security community, is usually
> not about building the 12 layers of security around the "Die Hard" vault that a skilled attacker
> has to vanquish, one by one. Defense in depth is the humble realization that, of all the security
> measures you implement, a few will fail because of your own stupidity. It's good to have a few
> backups, just in case.

This principle is most often applied at the macro level, by building multiple levels of security into your system or your protocol.  This is why Persona uses [a separate process for writing to the database](http://lloyd.io/persona-architectural-changes).  It's why Mozilla Services apps will be using [MACAuth](/blog/entry/securing-pyramid-persona-macauth/) instead of simple bearer tokens, even though all communication is done over TLS and is theoretically secure against eavesdropping.  And it's why security experts insist that OAuth 2.0 [should](http://hueniverse.com/2010/09/oauth-2-0-without-signatures-is-bad-for-the-web/) [have](benlog.com/articles/2009/12/22/its-a-wrap/) [done](http://www.links.org/?p=833) [likewise](http://hueniverse.com/2010/09/oauth-bearer-tokens-are-a-terrible-idea/).

But it can also be applied at the micro level, between different layers within a single software system.  I have read about this idea in the past, most memorably in Colin Percival 's excellent articles [Cryptographic Right Answers](http://www.daemonology.net/blog/2009-06-11-cryptographic-right-answers.html) and [Encrypt-then-MAC](http://www.daemonology.net/blog/2009-06-24-encrypt-then-mac.html), but don't think I ever understood it as anything more than theory.  After having an up-close-and-personal view of both how it can succeed, and how it *could have* succeeded, I will definitely think more deliberately about this principle in the future.

Actually, I think [DAYOS](http://benlog.com/articles/2010/09/07/defending-against-your-own-stupidity/) could be right up there with [DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself) as an acronymic axiom to program by.

All of this pondering has led me to a rather counter-intuitive discovery: going through the process of breaking the security on persona.org has given me *more* confidence in the ultimate security of the system.  If an input validation bug of this sort had been present in my own code, it most likely would have lead immediately to a full security breach – not to having to navigate around all these extra layers of protection.

So perhaps the overall lesson here is simply that good security is a lot of hard work.  When you can, it's a good idea to leave it to the professionals.  To me, that sounds like another good reason to consider [Persona](https://login.persona.org/) instead of rolling your own authentication system.

[^1]: My own personal worst: an online file manager that let you download `/etc/password`.
