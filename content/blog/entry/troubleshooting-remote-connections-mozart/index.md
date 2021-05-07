+++
title = "Troubleshooting Remote Connections in Mozart"
date = 2009-01-23T15:12:24.132975
updated = 2009-01-23T15:12:24.133011
[taxonomies]
tags = ['software', 'technology', 'mozart']
+++

The [Mozart/Oz](http://www.mozart-oz.org/) programming language provides a comprehensive [distributed programming](http://www.mozart-oz.org/home/doc/dstutorial/index.html) subsystem, and when it works, it's a thing of great power and elegance.  But when it doesn't work, it tends to fail out with error messages that are exceedingly unhelpful.  This is particularly troubling if you're working with a high-level abstraction such as [Parallel Search](http://www.mozart-oz.org/documentation/system/node13.html#section.search.parallel) – the error messages are far removed from the code that you're actually writing.

Inspired by a recent request for help on the mozart-users mailing list, I've decided to compile a quick troubleshooting guide for Mozart remote connections.  And when I say "quick" I really mean it - there's only two steps but they can solve a lot of common problems with getting the distributed programming subsystem up and running.

<!-- more -->

### Step 1: Ensure remote processes are forked correctly

This step is actually quite well documented in the Mozart documentation on the [Remote](http://www.mozart-oz.org/documentation/system/node48.html#chapter.remote) module.  However, that's a pretty obscure corner of the documentation for someone wanting to work with higher-level abstractions, and the necessary steps are buried in a long discussion of the underlying mechanics of the remote forking mechanism. Below is the quick-and-dirty version of what you need to know.

Forking a new Mozart process requires a *hostname* and a *fork method*.  The fork method is simply an operating system command that will be used to spawn a new connection to the remote machine; by default it is "rsh" but you probably want to use "ssh" instead.  This command must be capable of running commands on the remote machine when executed as follows:

```
<FORK> <HOSTNAME> <COMMAND>
```

Moreover, the remote environment set up by the fork command must include the oz runtime, libraries etc.  If the command doesn't set things up just so, spawning the remote computation will fail.  Fortunately there's a built-in mechanism for testing that the environment is set up correctly – simply execute the following command:

```
ssh hostname ozengine x-oz://system/RemoteServer.ozf --test
```

Of course, substitute the desired remote host for "hostname" and, if you're adventurous enough to connect using something other than ssh, substitute that command as appropriate.  If this replies with "Remote: Test succeeded..." then your forking environment is set up correctly.  If it does anything else – including asking for a password – then your setup will probably cause errors when launching remote computations.

If the above command asks you for a password, you likely need to set up [public-key authentication](http://sial.org/howto/openssh/publickey-auth/) on the remote system.  If it does not print the "test succeeded" message, you need to check your installation of Oz on the remote machine and make sure that the Oz  directories are in your path.  A simple way to check your path is the following command:

```
ssh hostname 'echo $PATH'
```

This should print the value of the remote PATH variable.  Note that if you use double-quotes instead of single quotes, it will print the *local* value of your path variable – not really what you're after.

### Step 2: Ensure that tickets are exposed correctly

Even if the above tests succeed, it is still possible for the spawning of a remote process to fail with a mysterious error such as "cannot take ticket" or "ticket refers to dead site".  Unfortunately the Mozart docs are a lot less helpful on this point.  Again, here's the quick-and-dirty of what you need to know.

Communication between remote processes is managed using [tickets](http://www.mozart-oz.org/documentation/system/node47.html#chapter.connection), which are opaque references to objects living within a Mozart instance.  Under the hood, tickets are actually URLs such as the following:

```
x-ozticket://192.168.0.2:9000:FTnZey:cEu/y:w:w:s:yABZ4w
```

To quickly test whether tickets are offered and taken correctly, I've written a simple program called [TestTickets.oz](/static/scratch/TestTickets.oz).  Compile it down to an executable and run it like so:

```
rfk@rambutan:~$ ozc -p -x TestTickets.oz 
rfk@rambutan:~$ ./TestTickets --host=mango --fork=ssh
Offered ticket 'x-ozticket://192.168.0.2:9000:80nZey:zlt/y:w:w:s:RMbZox'
Created remote manager
Ticket taken successfully
rfk@rambutan:~$ 
```

If spawning a remote computation fails with a ticket-related error, it should include in the traceback a ticket URL similar to the one above.  Here's a typical example, culled from the mailing list today:

```
Remote Server: failed to take a ticket

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
```

If you see an error such as this, take a careful look at the IP address of the ticket URL.  Is it the external IP address of the host machine?  Or is it, as in this case, some sort of local IP?  For remoting to work correctly, tickets must be exposed on an IP address that is accessible by the remote machine.

Mozart determines the IP address to use by looking up the hostname of your machine.  In this particular case, there's probably an entry in the /etc/hosts file that maps the local machine name to 127.0.1.1.  The simplest fix is to adjust your hosts file so that the machine name maps to its external IP instead of an internal one. If this isn't possible, you can explicitly tell Mozart what IP address to use with the [DP.initWith](http://www.mozart-oz.org/home/doc/system/node46.html) function ([DPInit.init](http://www.mozart-oz.org/home/doc/system/node53.html) in older Mozart versions).  But of course, this comes with all the attendant maintenance problems of hard-coding environment settings in your source code.

### Step 3: Profit!

Hopefully this is enough to get your remote computations up-and-running in Mozart, and you can now enjoy pain-free [authoring of distributed applications](http://www.mozart-oz.org/home/doc/dstutorial/index.html) and [easy transparent parallelisation](http://www.mozart-oz.org/documentation/system/node13.html#section.search.parallel) of your constraint programming problems.  I'm planning a more detailed primer on exploiting this particular ability of Mozart, so stay tuned...