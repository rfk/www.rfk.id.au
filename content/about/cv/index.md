+++
title = "Curriculum Vitae of Ryan Francis Kelly"
aliases = ["/about/cv.html"]
+++

I am a software engineer and occasional consultant.  I live in the <a href="http://en.wikipedia.org/wiki/Inverloch,_Victoria">seaside town of Inverloch</a>, on <a href="https://www.bunuronglc.org/">Bunurong Country</a> near Melbourne, Australia.
I currently work remotely as a Senior Software Engineer at <a href="https://harrison.ai/">harrison.ai</a>.

The best way to contact me is by email; use `ryan@` plus the domain of this website.

Professionally, I have worked as a software engineer for over a decade. I have substantial experience with Rust, Python, and JavaScript, but will confidently dabble in just about any language.
I've worked at scale across the stack, from back-end services to webapps to native clients, and have even spent a few years in management. I've found that regardless of language or platform, nothing beats the satisfaction of working with good people to ship code that you're proud of, and watching it make a difference to your users.

Academically, I hold a PhD in Computer Science from the Intelligent Agents Laboratory at the University of Melbourne. My undergraduate studies were a double bachelor's degree in Engineering and Computer Science, which I was awarded with first class honours.

Personally, I enjoy public speaking, theatre and performance arts of any persuasion.  I am a keen hiker and camper, even though it means being disconnected from the Internet for hours or even days at a time.

More details are available in the sections below:
* <a href="#employment">Employment History</a>
* <a href="#education">Education</a>
* <a href="#presentations">Presentations</a>
* <a href="#publications">Publications</a>
* <a href="#personal">Personal Interests</a>

<!-- * <a href="#skills">Skills</a> -->

<hr />

## <a name="employment"></a>Employment History

### Software Engineer, harrison.ai
<p class="item-meta">October 2021 to Present</p>

I currently work as a Senior Software Engineer on the <a href="http://harrison.ai/">harrison.ai</a> Data Engineering team.

**Keywords**: Rust, Python, AWS, Serverless.

### Software Engineer, Mozilla
<p class="item-meta">September 2011 to August 2021</p>

I spent almost a decade as a Software Engineer at <a href="http://www.mozilla.com/">Mozilla</a>, reaching the level of "Senior Staff" and taking broad responsibility for the <a href="https://accounts.firefox.com/">Firefox Accounts</a> identity system
and the client and server components that powered <a href="https://www.mozilla.org/en-US/firefox/sync/">Firefox Sync</a>.

Highlights from my work over the years included:
* Re-designing [the HTTP service API for Firefox Sync](https://mozilla-services.readthedocs.io/en/latest/storage/apis-1.5.html) so that multiple clients can sync concurrently without risking data corruption.
* Working in a small team to launch [a new account system](https://blog.mozilla.org/blog/2014/02/07/introducing-mozilla-firefox-accounts/) and [simplified Sync setup experience](https://blog.mozilla.org/services/2014/02/07/a-better-firefox-sync/), then watching the service steadily grow to support millions of Firefox users across the globe.
* Collaborating with security experts to help keep user data safe, from reviewing the [security properties of new account account features](https://github.com/mozilla/fxa/blob/main/packages/fxa-content-server/docs/pairing-architecture.md#intended-security-properties), to finding and fixing [security](/blog/entry/security-bugs-ssrf-via-request-splitting/) [bugs](/blog/entry/exploring-security-persona/), to mitigating [malicious service traffic](https://blog.mozilla.org/services/2016/04/09/stolen-passwords-used-to-break-into-firefox-accounts/).
* Managing a team of five engineers for ongoing development of the [Firefox Accounts](https://accounts.firefox.com/) service, including the promotion of two senior engineers and the hiring of some amazing new colleagues.
* Championing the development of a unified cross-platform sync client SDK, and creating a [multi-language bindings generator for Rust](https://github.com/mozilla/uniffi-rs/) to lighten its maintenance burden.

**Keywords**: Python, JavaScript, Node.js, Rust, Cloud Services, MySQL, System Architecture, OAuth, Security, Encryption, SDKs.

<hr class="mini" />

### Director and Lead Developer, Cloud Matrix
<p class="item-meta">July 2009 to December 2011</p>

I co-founded and was lead developer at <a href="http://www.cloudmatrix.com.au/">Cloud Matrix</a>, a small Melbourne-based startup in the cloud storage space.  We built "SaltDrive", an encrypted cloud-enabled USB stick.  The SaltDrive technology stack was predominantly Python including PySide for the desktop client, Django and jQuery for the website, and some custom python code to interface with Amazon Web Services for file storage.

We built a working product, but did not achieve any noteworthy market traction.

**Keywords**: Python, Django, Native Apps, AWS, Encryption.

<hr class="mini" />

### Freelance Developer and Consultant
<p class="item-meta">November 2008 to September 2011</p>

I have done occasional work as a freelance developer and software consultant.  My past projects have involved developing Python-based desktop and online applications, and code maintenance and translation services for Prolog.

**Keywords**: Python, Django, Web Apps, Prolog.

<hr class="mini" />


### Programmer, The Victorian Partnership for Advanced Computing
<p class="item-meta">March 2004 to November 2008</p>

After completing a Summer Internship with the Victorian Partnership for Advanced Computing, I undertook ongoing programming work on a casual basis.  My roles ranged from developer to software architect, handling the design and development of software for engineering applications. Projects included a Python-based desktop application to support computer-aided design workflows, and a PHP-based project management portal used to coordinate research and development activities among several large organisations.

**Keywords**: Python, PHP, Native Apps, Web Apps, Computational Engineering.

<hr class="mini" />

### Earlier Work

I also worked a variety of part-time roles while completing my academic studies;
if you're interested you can read about them in [my full profile on LinkedIn](https://www.linkedin.com/in/ryanfkelly/).

<hr />

## <a name="education"></a>Education

I have a PhD in Computer Science from the University of Melbourne, Department of Computer Science and Software Engineering.  My thesis, entitled *"Asynchronous Multi-Agent Reasoning in the Situation Calculus"*,
as submitted in October 2008.  The main outcomes of my research are summarized <a href="http://www.rfk.id.au/ramblings/research/">here</a>.

Prior to this, I obtained a Bachelor of Engineering (Mechatronics) and a Bachelor of Computer Science from the University of Melbourne, graduating in 2005 with first-class honours.

<hr />

<!--
## <a name="skills" />Skills

I dislike playing buzzword bingo, and am a big believer in cultivating a "T-shaped" skillset - having both a broad base of general knowledge, and the ability to dig in deep on something on demand.

Still, this *is* a CV, so here are a selection of skills that I've had the opportunity to dig in deep on in the past:

### Python

Python is currently my language of choice for general-purpose development, as shown by its prevalence among my current <a href="https://github.com/rfk/">open-source software projects</a>.  Like many Pythonistas, I appreciate the language's simplicity and its elegant conceptual model.  I've come to depend on Python's comprehensive standard library and the great variety of software available on the <a href="http://pypi.python.org/">Python Package Index</a> to get things done quickly and easily.

Some of my more popular open-source Python projects include:
* <a href="https://github.com/rfk/esky/">Esky</a>:  an auto-update framework for frozen Python apps.
* <a href="https://github.com/rfk/pypyjs">PyPy.js</a>:  a javascript backend and JIT target for the PyPy python interpreter.
* <a href="https://github.com/rfk/playitagainsam">playitagainsam</a>:  a presentation tool for recording and replaying live terminal sessions.


### JavaScript and Node.js

JavaScript was the first programming language I ever learned and I have been using it sporadically for over ten years.  The rise of node.js in recent years has seen me deploying it on both client and server (and occasionally typing "===" into my python code when I jump between projects).  Aside from the obvious list of warts, I find JavaScript to be very powerful and highly productive language.

Some of my more popular open-source JavaScript projects include:
* <a href="https://github.com/rfk/playitagainsam-js">playitagainsam-js</a>:  a web-based player for recorded terminal sessions.
* <a href="https://github.com/mozilla/awsboxen">awsboxen</a>:  a node.js deployment tool built on Amazon Cloud Formation.
* <a href="http://github.com/rfk/xmlns/">jquery.xmlns</a>:  a jQuery plugin providing CSS-3 namespace selector syntax.

### Rust

Recently learned, really enjoying. Wrote a bindings generator.

### Identity, Authentication and OAuth

I built an identity system.

### Cryptography

I'm not a cryptographer, but I've worked with some! Interfacing between cryptographic design and code.


### Written Communication

Constantly getting better at it.

### Public Speaking

Love it, have done a lot of it.

<hr />
-->

## Presentations

I love to talk, present and discuss just about anything software-related, from new technologies and tools to the philosophy of API design.  Some of my previous conference presentations include:

* <a href="http://www.youtube.com/watch?v=8C9q94F6Uqo">PyPy.js: What? How? Why?</a> (PyCon Australia, 2014).
  * Also presented at <a href="https://www.youtube.com/watch?v=pt-e-X_q-dk">Kiwi PyCon 2014</a> and <a href="https://www.youtube.com/watch?v=PiBfOFqDIAI">PyCon US 2015</a>.
* <a href="https://www.youtube.com/watch?v=DH94wksQFPM">Testing for Graceful Failure with Vaurien and Marteau</a>. (PyCon Australia, 2013).
  * Also presented at <a href="http://pyvideo.org/video/2378/testing-for-graceful-failure-with-vaurien-and-mar-">Kiwi PyCon, 2013</a>.
* <a href="http://pyvideo.org/video/1646/the-lazy-devs-guide-to-testing-your-web-api">The Lazy Dev's Guide to Testing Your Web API</a> (PyCon Australia, 2012).
* <a href="http://pyvideo.org/video/958/deep-freeze-building-better-stand-alone-apps-wit">Deep Freeze: Building better stand-alone apps with Python</a>. (PyCon US, 2012).
* <a href="http://pyvideo.org/video/1000/bytecode-what-why-and-how-to-hack-it">Bytecode: What, Why, and How to Hack it</a>. (PyCon Australia, 2011).
* <a href="http://pyvideo.org/video/989/say-what-you-mean-meta-programming-a-declarative">Say What You Mean: Meta-Programming a Declarative API</a>. (PyCon Australia, 2011).
* <a href="http://pyvideo.org/video/470/pyconau-2010--esky--keep-your-frozen-apps-fresh">Esky: keep your frozen apps fresh</a>. (PyCon Australia, 2010).

<hr />

## Publications

<p>I co-authored the following publications as a result of my doctoral studies:</p>

<ul>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Asynchronous Knowledge with Hidden Actions in the Situation Calculus</i></b>. Artificial Intelligence 221, pp. 1-35, 2015.</li>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Property Persistence in the Situation Calculus</i></b>. Artificial Intelligence 174, pp. 865-888, 2010.</li>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Complex Epistemic Modalities in the Situation Calculus</i></b>, in Proceedings of the 11th International Conference on Principles of Knowledge Representation and Reasoning, 2008.</li>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Knowledge and Observations in the Situation Calculus</i></b>, in Proceedings of the 2007 International Conference on Autonomous Agents and Multi-Agent Systems, 2007.</li>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Property Persistence in the Situation Calculus</i></b>, in Proceedings of the 20th International Joint Conference on Artificial Intelligence, 2007.</li>
<li>Ryan F. Kelly and Adrian R. Pearce. <b><i>Towards High-Level Programming for Distributed Problem Solving</i></b>, in Proceedings of the 2006 IEEE/WIC/ACM International Conference on Intelligent Agent Technology, 2006.</li>
</ul>

<hr />

## <a name="personal"></a> Personal Interests

I enjoy tech conferences in both a personal and professional capacity, and have volunteered on the managing committee for [PyCon Au](https://pycon-au.org/) on several occasions. Most recently I served as PyCon Au Treasurer for the 2016 and 2017 conferences.

I love public speaking and the performing arts in general. As a younger man I had major roles in several amateur theatrical/musical productions; as a busy working parent I look forward to fitting such things into my schedule again one day in the future.

I am a keen hiker and keen-if-the-weather-looks-good camper, and enjoy regular outdoor escapes with family and friends, even if it means being disconnected from the Internet for days at a time.
(Besides, have you *seen* all the tech gear you can get for camping these days?).

