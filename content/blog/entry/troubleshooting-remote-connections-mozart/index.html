---
title: >
 Troubleshooting Remote Connections in Mozart
slug: troubleshooting-remote-connections-mozart
created: !!timestamp '2009-01-23 15:12:24.132975'
modified: !!timestamp '2009-01-23 15:12:24.133011'
tags: 
    - software
    - technology
    - mozart
---

{% mark excerpt %}
<p>The <a href="http://www.mozart-oz.org/">Mozart/Oz</a> programming language provides a comprehensive <a href="http://www.mozart-oz.org/home/doc/dstutorial/index.html">distributed programming</a> subsystem, and when it works, it's a thing of great power and elegance.  But when it doesn't work, it tends to fail out with error messages that are exceedingly unhelpful.  This is particularly troubling if you're working with a high-level abstraction such as <a href="http://www.mozart-oz.org/documentation/system/node13.html#section.search.parallel">Parallel Search</a> &ndash; the error messages are far removed from the code that you're actually writing.</p>

<p>Inspired by a recent request for help on the mozart-users mailing list, I've decided to compile a quick troubleshooting guide for Mozart remote connections.  And when I say "quick" I really mean it - there's only two steps but they can solve a lot of common problems with getting the distributed programming subsystem up and running.</p>

<h3>Step 1: Ensure remote processes are forked correctly</h3>

<p>This step is actually quite well documented in the Mozart documentation on the <a href="http://www.mozart-oz.org/documentation/system/node48.html#chapter.remote">Remote</a> module.  However, that's a pretty obscure corner of the documentation for someone wanting to work with higher-level abstractions, and the necessary steps are buried in a long discussion of the underlying mechanics of the remote forking mechanism. Below is the quick-and-dirty version of what you need to know.</p>{% endmark %}

<p>Forking a new Mozart process requires a <i>hostname</i> and a <i>fork method</i>.  The fork method is simply an operating system command that will be used to spawn a new connection to the remote machine; by default it is "rsh" but you probably want to use "ssh" instead.  This command must be capable of running commands on the remote machine when executed as follows:</p>

<p class="code">&lt;FORK&gt; &lt;HOSTNAME&gt; &lt;COMMAND&gt;</p>

<p>Moreover, the remote environment set up by the fork command must include the oz runtime, libraries etc.  If the command doesn't set things up just so, spawning the remote computation will fail.  Fortunately there's a built-in mechanism for testing that the environment is set up correctly &ndash; simply execute the following command:</p>

<p class="code">ssh hostname ozengine x-oz://system/RemoteServer.ozf --test</p>

<p>Of course, substitute the desired remote host for "hostname" and, if you're adventurous enough to connect using something other than ssh, substitute that command as appropriate.  If this replies with "Remote: Test succeeded..." then your forking environment is set up correctly.  If it does anything else &ndash; including asking for a password &ndash; then your setup will probably cause errors when launching remote computations.</p>

<p>If the above command asks you for a password, you likely need to set up <a href="http://sial.org/howto/openssh/publickey-auth/">public-key authentication</a> on the remote system.  If it does not print the "test succeeded" message, you need to check your installation of Oz on the remote machine and make sure that the Oz  directories are in your path.  A simple way to check your path is the following command:</p>

<p class="code">ssh hostname 'echo $PATH'</p>

<p>This should print the value of the remote PATH variable.  Note that if you use double-quotes instead of single quotes, it will print the <i>local</i> value of your path variable &ndash; not really what you're after.</p>

<h3>Step 2: Ensure that tickets are exposed correctly</h3>

<p>Even if the above tests succeed, it is still possible for the spawning of a remote process to fail with a mysterious error such as "cannot take ticket" or "ticket refers to dead site".  Unfortunately the Mozart docs are a lot less helpful on this point.  Again, here's the quick-and-dirty of what you need to know.</p>

<p>Communication between remote processes is managed using <a href="http://www.mozart-oz.org/documentation/system/node47.html#chapter.connection">tickets</a>, which are opaque references to objects living within a Mozart instance.  Under the hood, tickets are actually URLs such as the following:</p>

<p class="code">x-ozticket://192.168.0.2:9000:FTnZey:cEu/y:w:w:s:yABZ4w</p>

<p>To quickly test whether tickets are offered and taken correctly, I've written a simple program called <a href="/static/scratch/TestTickets.oz">TestTickets.oz</a>.  Compile it down to an executable and run it like so:</p>

<p class="code">rfk@rambutan:~$ ozc -p -x TestTickets.oz 
rfk@rambutan:~$ ./TestTickets --host=mango --fork=ssh
Offered ticket 'x-ozticket://192.168.0.2:9000:80nZey:zlt/y:w:w:s:RMbZox'
Created remote manager
Ticket taken successfully
rfk@rambutan:~$ 
</p>

<p>If spawning a remote computation fails with a ticket-related error, it should include in the traceback a ticket URL similar to the one above.  Here's a typical example, culled from the mailing list today:</p>

<p class="code">Remote Server: failed to take a ticket

%*********************** Error: connections *********************
%**
%** Ticket refused: refers to dead site
%**
%** Ticket: x-ozticket://127.0.1.1:9000:pSrZey:uFt/y:w:w:s:WDxNtx
%**
%** Call Stack:
%** procedure 'TakeWithTimer' in file 
"/build/buildd/mozart-1.3.2.20060615+dfsg/mozart/share/lib/dp/Connection.oz", 
line 237, column 3, PC = 147729640
%** procedure in file 
"/build/buildd/mozart-1.3.2.20060615+dfsg/mozart/share/lib/dp/RemoteServer.oz", 
line 29, column 0, PC = 147379820
%**--------------------------------------------------------------
</p>

<p>If you see an error such as this, take a careful look at the IP address of the ticket URL.  Is it the external IP address of the host machine?  Or is it, as in this case, some sort of local IP?  For remoting to work correctly, tickets must be exposed on an IP address that is accessible by the remote machine.</p>

<p>Mozart determines the IP address to use by looking up the hostname of your machine.  In this particular case, there's probably an entry in the /etc/hosts file that maps the local machine name to 127.0.1.1.  The simplest fix is to adjust your hosts file so that the machine name maps to its external IP instead of an internal one. If this isn't possible, you can explicitly tell Mozart what IP address to use with the <a href="http://www.mozart-oz.org/home/doc/system/node46.html">DP.initWith</a> function (<a href="http://www.mozart-oz.org/home/doc/system/node53.html">DPInit.init</a> in older Mozart versions).  But of course, this comes with all the attendant maintenance problems of hard-coding environment settings in your source code.</p>

<h3>Step 3: Profit!</h3>

<p>Hopefully this is enough to get your remote computations up-and-running in Mozart, and you can now enjoy pain-free <a href="http://www.mozart-oz.org/home/doc/dstutorial/index.html">authoring of distributed applications</a> and <a href="http://www.mozart-oz.org/documentation/system/node13.html#section.search.parallel">easy transparent parallelisation</a> of your constraint programming problems.  I'm planning a more detailed primer on exploiting this particular ability of Mozart, so stay tuned...</p>