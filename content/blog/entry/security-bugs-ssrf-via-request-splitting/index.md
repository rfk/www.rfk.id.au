---
title: >
 Security Bugs in Practice: SSRF via Request Splitting
slug: security-bugs-ssrf-via-request-splitting
created: !!timestamp '2018-09-10 17:48:00.000000'
modified: !!timestamp '2018-09-11 06:07:00.000000'
tags: 
    - technology
    - mozilla
---

{% mark excerpt %}<p>One of the most interesting (and sometimes scary!)
parts of my job at Mozilla is dealing with security bugs.  We don't always
ship perfect code &ndash; nobody does &ndash; but I'm privileged to work with a great
team of engineers and security folks who know how to deal effectively with
security issues when they arise.  I'm also privileged to be able to work
in the open, and I want to start taking more advantage of that to share
some of my experiences.</p>

<p>One of the best ways to learn how to write more secure code is to get
experience watching code fail in practice.  With that in mind, I'm planning
to write about some of the security-bug stories that I've been involved in
during my time at Mozilla.  Let's start with a recent one:
<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1447452">Bug 1447452</a>,
in which some mishandling of unicode characters by the Firefox Accounts API
server could have allowed an attacker to make arbitrary requests to its
backend data store.</p>

{% endmark %}

<h3>The bug: corruption of unicode characters in HTTP request path</h3>

<p>It started when I was debugging an unrelated unicode-handling issue that eventually led me to a
<a href="https://github.com/nodejs/node/issues/13296">bug report against the Node.js `http` module</a>,
where the reporter noted that:</p>

<blockquote>When making a request using `http.get` with the path set to '/caf&#233;&#128054;,
the server receives /caf&#233;=6</blockquote>

<p>In other words, the reporter was asking Node.js to make a HTTP request to a particular path, but the outgoing request was actually directed at a different path!  Digging into the details, it turned out that this issue was caused by a lossy encoding of unicode characters when Node.js was writing the HTTP request out to the wire.</p>

<p>Although users of the `http` module will typically specify the request path as a string, Node.js must ultimately output the request as raw bytes.  JavaScript has unicode strings, so converting them into bytes means selecting and applying an appropriate unicode encoding. For requests that do not include a body, Node.js defaults to using "latin1", a single-byte encoding that cannot represent high-numbered unicode characters such as the &#128054; emoji.  Such characters are instead truncated to just their lowest byte of their internal JavaScript representation:</p>

<p class="code">&gt; v = "/caf\u{E9}\u{01F436}"
'/caf&#233;&#128054;'
&gt; Buffer.from(v, 'latin1').toString('latin1')
'/caf&#233;=6'
</p>

<p>
Data corruption when handling user input is frequently a red flag for an underlying security issue, and I knew that our codebase made outgoing HTTP requests that could include user input in the path.  So I immediately filed a confidential security bug in <a href="https://bugzilla.mozilla.org/">Bugzilla</a>, reached out to the <a href="https://nodejs.org/en/security/">node security team</a> for more info, and dove in to look for places where we might be constructing URLs based on user-provided unicode strings.</p>

<h3>The vulnerability: SSRF via Request Splitting</h3>

<p>The specific vulnerability I was worried about was an attack called <a href="http://projects.webappsec.org/w/page/13246929/HTTP%20Request%20Splitting">request splitting</a>, to which text-based protocols like HTTP are often vulnerable.  Consider a server that takes some user input and includes it in a request to an internal service exposed over HTTP, like this:</p>

<p class="code">GET /private-api?q=&lt;user-input-here&gt; HTTP/1.1
Authorization: server-secret-key
</p>

<p>If the server does not properly validate the user input, it may be possible for an attacker to inject protocol control characters directly into the outgoing request.  Suppose in this case that the server accepted a user input of:
</p>

<p class="code">"x HTTP/1.1\r\n\r\nDELETE /private-api HTTP/1.1\r\n"</p>

<p>When making its outgoing request, the server might write this out to the wire directly as:</p>

<p class="code">GET /private-api?q=x HTTP/1.1

DELETE /private-api
Authorization: server-secret-key
</p>

<p>The receiving service would interpret this as two separate HTTP requests, a `GET` followed by a `DELETE`, with no way to know that this isn't what the caller intended.</p>

<p>In effect, this specially-crafted user input would trick the server into making an additional outbound request, a situation known as <a href="https://www.owasp.org/index.php/Server_Side_Request_Forgery">Server-Side Request Forgery</a> or "SSRF".  The server may have privileges that the attacker does not, such as access to internal networks or secret API keys, which would increase the severity of the issue.</p>

<p>Good-quality HTTP libraries will typically include mitigations to prevent this behaviour, and  Node.js is no exception: if you attempt to make an outbound HTTP request with control characters in the path, they will be percent-escaped before being written out to the wire:</p>

<p class="code">&gt; http.get('http://example.com/\r\n/test').output
[ 'GET /%0D%0A/test HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n' ]
</p>

<p>Unfortunately, the above bug in handling unicode characters means that these measures can be circumvented.  Consider a URL like the following, which contains some unicode characters with diacritics:</p>

<p class="code">&gt; 'http://example.com/\u{010D}\u{010A}/test'
http://example.com/&#269;&#266;/test
</p>

<p>When Node.js version 8 or lower makes a `GET` request to this URL, it doesn't escape them because they're not HTTP control characters:</p>

<p class="code">&gt; http.get('http://example.com/\u010D\u010A/test').output
[ 'GET /&#269;&#266;/test HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n' ]
</p>

<p>But when the resulting string is encoded as latin1 to write it out to the wire, these characters get truncated into the bytes for "\r" and "\n" respectively:</p>

<p class="code">&gt; Buffer.from('http://example.com/\u{010D}\u{010A}/test', 'latin1').toString()
'http://example.com/\r\n/test'
</p>

<p>Thus, by including carefully-selected unicode characters in the request path, an attacker could trick Node.js into writing HTTP protocol control characters out to the wire.
</p>

<p>The behaviour has been fixed in the recent Node.js 10 release, which will throw an error if the request path contains non-ascii characters.  But for Node.js versions 8 or lower, any server that makes outgoing HTTP requests may be vulnerable to an SSRF via request splitting if it:</p>
<ul>
<li>Accepts unicode data from from user input, and</li>
<li>Includes that input in the request path of an outgoing HTTP request, and</li>
<li>The request has a zero-length body (such as a GET or DELETE).</li>
</ul>


<h3>The impact: forging requests to the FxA data store</h3>

<p>We audited the FxA server stack to look for places where it makes HTTP requests with a zero-length body and user-provided data in the request path, and we found three places where the above bug could be triggered.</p>

<p>The first was in our support for <a href="https://developer.mozilla.org/en-US/docs/Web/API/Push_API">WebPush</a>.  A signed-in client can provide a https URI at which to receive notification of account status changes, which the server will deliver by making a zero-length `PUT` request.  Fortunately, the requests made by the server in this case do not carry any special privileges or include any API tokens. The bug could be exploited here to trick the FxA server into making an unintended request to the webpush notification host, but that request would not be any more powerful than one which the attacker could have made directly.</p>

<p>The second was in checking the authenticity of <a href="https://en.wikipedia.org/wiki/Mozilla_Persona">BrowserID</a> certificates, where the FxA server parses a hostname out of a user-provided JSON blob, and then fetches the signing keys for that host by making a `GET` request like:

<p class="code">GET /.well-known/browserid?domain=&lt;hostname&gt;</p>

<p>In our development environment, this bug could thus be exploited to trick the server into making arbitrary requests to arbitrary hostnames. Fortunately, in our production environment these requests are all sent via the <a href="http://www.squid-cache.org/">squid</a> caching proxy, which is configured with strict validation rules to block any unexpected outgoing requests, and which prevented the bug from being exploited in this case.</p>

<p>The third was in making HTTP requests to our backend data store, and it's here that we had a real exploitable issue in practice.</p>

<p>As a bit of background, the Firefox Accounts production server is split between a <a href="https://github.com/mozilla/fxa-auth-server">web-facing API server</a> and a separate internal <a href="https://github.com/mozilla/fxa-auth-db-mysql">datastore service</a> that talks to a MySQL database, like this:</p>

<p class="code">    +--------+        +--------+        +-----------+       +----------+
    | Client |  HTTP  |  API   |  HTTP  | DataStore |  SQL  |   MySQL  |
    |        |<------>| Server |<------>|  Service  |<----->| Database |
    +--------+        +--------+        +-----------+       +----------+
</p>

<p>The API server talks to the datastore service over plain old HTTP, and it turned out that there was one single place where unicode data from user input could make its way into the path of one of these requests.</p>

<p>Many of our data storage requests are keyed by email address, and email addresses are allowed to contain unicode characters. To avoid issues with unicode encoding and decoding between the two services, most email-related operations in our datastore API accept the email as a hex-encoded utf8 string.  For example, the API server would fetch the account record for email "test@example.com" by making a HTTP request to the data store like this:</p>

<p class="code">GET /email/74657374406578616d706c652e636f6d</p>

<p>By a simple historical oversight, there was one operation that accepted the email address as a raw string.  Deleting an email from an account with id "xyz" was done via a request like:</p>

<p class="code">DELETE /account/xyz/emails/test@example.com</p>

<p>This is inconsistent, but it's not obvious from casual inspection that it could cause a security problem &mdash; we carefully validate all user input coming into the system, so the email address can't contain any HTTP control characters, and even if it did they would be automatically escaped by the `http` module.  But the email address <i>can</i> contain unicode characters.</p>

<p>In a test environment, I was able to create an account and add the following  strange-but-valid email address to it:</p>

<p class="code">x@&#800;&#328;&#390;&#390;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;&#582;&#837;&#390;&#800;&#303;account&#303;f9f9eebb05ef4b819b0467cc5ddd3b4a&#303;sessions&#800;&#328;&#390;&#390;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;.cc</p>

<p>The non-ascii characters here are carefully chosen so that, when lowercased and encoded in latin1, they will produce the raw bytes for various HTTP control characters:</p>

<p class="code">&gt; v = 'x@&#800;&#328;&#390;&#390;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;&#582;&#837;&#390;&#800;&#303;account&#303;f9f9eebb05ef4b819b0467cc5ddd3b4a&#303;sessions&#800;&#328;&#390;&#390;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;.cc'
&gt; Buffer.from(v.toLowerCase(), "latin1").toString()
'x@ HTTP/1.1\r\n\r\nGET /account/f9f9eebb05ef4b819b0467cc5ddd3b4a/sessions HTTP/1.1\r\n\r\n.cc'
</p>

<p>By adding this email address to an account and then deleting it, I could cause the API server to make an HTTP request to the datastore like:</p>


<p class="code">DELETE /account/f9f9eebb05ef4b819b0467cc5ddd3b4a/email/x@&#800;&#328;&#596;&#596;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;&#583;&#837;&#596;&#800;&#303;account&#303;f9f9eebb05ef4b819b0467cc5ddd3b4a&#303;sessions&#800;&#328;&#596;&#596;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;.cc</p>

<p>Which, thanks to the above bug in Node.js, would be written out to the wire as:</p>

<p class="code">&gt; console.log(Buffer.from('DELETE /account/f9f9eebb05ef4b819b0467cc5ddd3b4a/email/x@&#800;&#328;&#596;&#596;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;&#583;&#837;&#596;&#800;&#303;account&#303;f9f9eebb05ef4b819b0467cc5ddd3b4a&#303;sessions&#800;&#328;&#596;&#596;&#592;&#303;1&#814;1&#269;&#778;&#269;&#778;.cc', 'latin1').toString())
DELETE /account/f9f9eebb05ef4b819b0467cc5ddd3b4a/email/x@ HTTP/1.1

GET /account/f9f9eebb05ef4b819b0467cc5ddd3b4a/sessions HTTP/1.1

.cc
</p>

<p>That's an SSRF, causing the API server to make an extra `GET` that it did not intend.</p>

<p>This specific `GET` request would be harmless, but it was enough to convince me that the bug was exploitable and could potentially be used to trick the API server into making a wide variety of fraudulent requests to the datastore API &mdash; say, to create an account for an email address that the user did not control, or to reset the password on another user's account, or just about any operation that could be expressed within the 255-unicode-character length limit that Firefox Accounts imposes on an email address.</p>

<p>Fortunately, we do not have any evidence of this bug being actively exploited in our production environment.</p>

<p>It's also important to note that it would <i>not</i> have been possible for an attacker to exploit this bug to access a user's Firefox Sync data.  Firefox Sync uses strong client-side encryption to ensure that only someone who knows your account password can access your synced data.</p>

<h3>The quick fix: encoding the email address</h3>

<p>Upon first encountering the underlying Node.js issue, I had reached out to the <a href="https://nodejs.org/en/security/">node security team</a> for information and guidance.  They were very responsive, and confirmed that this was a known behaviour that couldn't be changed for backwards-compatibility reasons, but would be fixed in the then-upcoming release of Node.js 10.  In other words: we would have to ship a fix in our application.</p>

<p>In a bit of a twist, It turned out that we had <a href="https://github.com/mozilla/fxa-auth-db-mysql/issues/311">already noticed</a> this discrepancy in the behaviour of the email-deletion endpoint, and our fantastic Outreachy intern <a href="https://github.com/deeptibaghel">Deepti</a> had fixed it to hex-encode the email address as a matter of general code cleanliness.  Unfortunately that fix had not yet shipped to production, so we had to enact our "chemspill" process to ship it to production as quickly as possible.</p>

<p>We maintain a private github fork of all Firefox Accounts code repositories for exactly this purpose, so in practice the process of releasing the fix involved:</p>
<ul>
<li>Syncing the private repo with the latest release branch from the public repo.</li>
<li>Cherry-picking the fix into the private release branch, and requesting review.</li>
<li>Making a new release tag in the private repo, and allowing CircleCI to build docker images for deployment.</li>
<li>Deploying the new release to our staging environment and running a suite of both manual and automated tests to guard against regressions.</li>
<li>Rolling out the fix to our production environment.</li>
</ul>

<p>All up, it took us a little less than 24 hours to go from initial awareness of the underlying Node.js bug through to having a fix deployed in production.  That's including the time spent on analysis, auditing, code review, QA and deployment, and I think it's a pretty solid turnaround time!  I'm very proud of everyone on the Firefox Accounts team for their quick and professional response to this issue.</p>

<h3>The followup: adding additional mitigations</h3>

<p>With any security-related issue, it's important not to just push out a fix and then walk away.  Instead, try to figure out what circumstances led to the issue and whether similar issues can be prevented or mitigated in the future.</p>

<p>In this case, the ultimate cause of the issue was HTTP's text-based nature making it vulnerable to injection-style attacks such as request splitting.  This particular Node.js bug is just one example of how things can go wrong when constructing HTTP requests; the recent Blackhat presentation "<a href="https://www.blackhat.com/docs/us-17/thursday/us-17-Tsai-A-New-Era-Of-SSRF-Exploiting-URL-Parser-In-Trending-Programming-Languages.pdf">A New Era of SSRF</a>" provides many more examples in a variety of programming languages.</p>

<p>In my opinion, the best long-term mitigation will be for us to move away from using HTTP for internal service requests, and towards something more structured like <a href="https://grpc.io/">gRPC</a>.  However, that's not feasible in the short-term.</p>

<p>Instead, we borrowed a page from the playbook of another classic text-based protocol with a long history of injection-style attacks: SQL. A modern web app should never be building SQL queries from user input by hand, but should instead be using techniques such as <a href="https://www.owasp.org/index.php/SQL_Injection_Prevention_Cheat_Sheet">parameterized queries</a> or programmatic query builders.  Bugs like this one show that we should not be constructing any part of a HTTP request by hand either.</p>

<p>Once we were confident that the initial fix was stable and working in production, we refactored all outgoing HTTP requests in the API server to use a <a href="https://github.com/mozilla/fxa-auth-server/blob/master/lib/safe-url.js">thin wrapper</a> around the <a href="https://www.npmjs.com/package/safe-url-assembler">safe-url-assembler</a> package.  This should ensure that the final URL string is assembled from properly-encoded components, providing an extra layer of protection against any similar bugs that may arise in the future.</p>

<p>If you run a server that can make outgoing HTTP requests that include any sort of user input, I highly recommend taking a look at the "<a href="https://www.blackhat.com/docs/us-17/thursday/us-17-Tsai-A-New-Era-Of-SSRF-Exploiting-URL-Parser-In-Trending-Programming-Languages.pdf">A New Era of SSRF</a>" presentation to get a sense of all the ways this can go wrong.  It's eye-opening stuff, and it makes the small overheads of an extra safety layer like <a href="https://www.npmjs.com/package/safe-url-assembler">safe-url-assembler</a> seem very worthwhile for some extra peace of mind.</p>

<hr />

<p>Thanks to <a href="https://github.com/shane-tomlinson/">Shane Tomlinson</a>, <a href="https://github.com/ckarlof">Chris Karlof</a>, and <a href="https://github.com/g-k">Greg Guthe</a> for reviewing initial drafts of this post, and to the entire <a href="https://mozilla.github.io/application-services/docs/accounts/project-details.html#people-and-places">Firefox Accounts team</a> for this among many other adventures.</p>
