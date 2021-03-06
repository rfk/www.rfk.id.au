+++
title = "PyPy.js: First Steps"
date = 2013-07-23T23:43:00
updated = 2013-07-23T23:43:00
[taxonomies]
tags = ['technology', 'mozilla', 'python', 'javascript']
+++

I've been spending a lot of time in JavaScript land lately.  It's not totally unexpected – when I first applied for a job with Mozilla, I was warned only semi-jokingly that "they hire all the best Python programmers and then force them to write JavaScript".  I've no deep love or hate for it as a language, but JavaScript is pretty interesting to me as a *platform*, as a kind of runs-everywhere lowest-common-denominator environment that is slowly being molded and coerced into a pretty decent universal runtime.  But if ["the Web is the Platform"](https://blog.mozilla.org/blog/2012/02/27/mozilla-in-mobile-the-web-is-the-platform/), what's a stranded Pythonista to do?

Port Python to JavaScript, of course!

This has been done before in a variety of ways.  [Skulpt](http://www.skulpt.org/) and [Brython](http://www.brython.info/tests/console.html) are impressive re-implementations of Python on top of JavaScript, including interactive consoles that make for a very compelling demo.  [Pyjamas](http://pyjs.org/) lets you translate Python apps into JavaScript so they can be run in the browser.  There are many more examples with varying degrees of success and completeness.

I don't want to down-play the phenomenal efforts behind projects like this.  But personally, I'm a little wary of the re-implementation treadmill that they risk being stuck on.  I'd much prefer to leverage the work that's already been done on making a fantastic Python interpreter, along with the work that's already been done on making a fantastic JavaScript runtime, and re-implement as little as possible while gluing them both together.

I've finally taken my first tentative steps down that path, by combining two amazing projects open-source projects: [PyPy](http://pypy.org) and [Emscripten](http://emscripten.org).

<!-- more -->

### PyPy

PyPy advertises itself as ["a fast, compliant alternative implementation of the Python language"](http://pypy.org/), and it has a slick [speedtest site](http://speed.pypy.org/) to back up its claims.  Speed is great of course, but what's really interesting to me are the details of its implementation.  In the process of building a new Python interpreter, the PyPy team have created an powerful generic toolkit for constructing dynamic language interpreters, and as a result the PyPy project comes in two largely-independent halves.

First there is the PyPy interpreter itself, which is written entirely in Python.  To be more specific, it's written in a restricted subset of the language called [RPython](https://rpython.readthedocs.org), which keeps many of the niceties of the full Python language while enabling efficient ahead-of-time compilation.  This allows for greater ease and flexibility of development than implementing the interpreter directly in C, as is done with the standard interpreter available from [python.org](http://python.org).

Second, there is the [RPython translation toolchain](https://rpython.readthedocs.org), which provides a dazzling array of different methods and options for turning RPython code into an executable.  It can translate RPython into low-level C code for direct compilation, or into higher-level bytecode for the Java and .NET virtual machines.  It can plug in any one of several different memory-management schemes, threading implementations, and a host of other options to customize the final executable.

The RPython toolchain also contains the secret to PyPy's speed: the ability to mostly-automatically generate a [just-in-time compiler](https://en.wikipedia.org/wiki/Tracing_JIT) for the hot loops of an RPython program.  It's meta-level magic of the deepest sort, and it's exactly the kind of thing that would be needed to get decent performance out of a Python interpreter running on the web.

So in theory, we could get a fast and compliant port of Python to JavaScript just by implementing a JavaScript-emitting backend for the RPython translation toolchain.

### Emscripten

Emscripten is ["an LLVM to JavaScript compiler"](http://Emscripten.org/) that can be used to compile C or C++ programs into JavaScript.  It is typically used to bring large existing C++ apps to the web, and is the compiler behind the recent demo of [Epic Citadel running in the browser](https://blog.mozilla.org/futurereleases/2013/05/02/epic-citadel-demo-shows-the-power-of-the-web-as-a-platform-for-gaming/).  It's a terrifyingly beautiful hack, and thanks to recent hot competition in the browser-JavaScript-performance space, the resulting code can provide quite acceptable performance.

The techniques used by Emscripten to map the C programming model onto JavaScript have recently been formalized in a specification called [asm.js](http://asmjs.org/), a restricted subset of JavaScript that allows efficient ahead-of-time compilation.  In JavaScript engines that recognize asm.js code, an Emscripten-compiled program can perform with overhead as low as [just two-times slowdown](http://kripken.github.io/mloc_Emscripten_talk/#/27) when compared to a native executable.

The potential combination of these two technologies is obvious in theory:  have the RPython toolchain compile things down to C code; compile the C code to JavaScript using Emscripten; party down with Python in your browser.

Indeed, Emscripten has previously been used to compile the standard C-based Python interpreter into JavaScript; this is what powers the Python shell at [repl.it](http://repl.it).  But the thought of unlocking the extra speed of PyPy is quite seductive, and the flexibility of the RPython build chain should open up some interesting possibilities.  So what might it look like?


### A JavaScript backend for RPython

To the great credit of the PyPy and Emscripten developers, combining these two technologies was almost as easy in practice as it sounds in theory.  PyPy's RPython toolchain has extension points that let you easily plug in a custom compiler, or indeed a whole new toolchain.  My github fork contains the necessary logic to hook it up to Emscripten:

  [https://github.com/rfk/pypy](https://github.com/rfk/pypy)

Emscripten goes out of its way to act like a standard posix build chain, asking only that you replace the usual "gcc" invocation with "emcc".  I did have to make a few tweaks to the simulated posix runtime environment, so you'll need to use my fork until these are merged with upstream:

  [https://github.com/rfk/emscripten](https://github.com/rfk/emscripten)

To compile RPython code into a normal executable, you invoke the `rpython` translator program on it.  Here's a simple hello-world example that can be run out-of-the-box from the PyPy source repo:

```
$> python ./rpython/bin/rpython ./rpython/translator/goal/targetnopstandalone.py
[...lots and lots of compiler output...]
$>
$> ./targetnopstandalone-c 
debug: hello world
$>
```

To instead compile the RPython code into JavaScript, you just need to specify the `--backend=js` option.  The resulting JavaScript file can be executed from the command-line using a JavaScript shell such as nodejs:

```
$> python ./rpython/bin/rpython --backend=js ./rpython/translator/goal/targetnopstandalone.py
[...lots and lots of compiler output...]
$>
$> node ./targetnopstandalone-js
debug: hello world
$>
```

That is pretty much all there is to it.  If you've got a few spare hours, you can translate the entire PyPy interpreter into JavaScript by doing the following:

```
$> python ./rpython/bin/rpython --backend=js --opt=2 ./pypy/goal/targetpypystandalone.py
[...seriously, this will take forever...]
^C
$>
```

Or you can just grab the end result:  [pypy.js](./pypy.js.gz).

Uncompressed, that's 139M of generated JavaScript.  It includes a full Python language interpreter, a couple of the more important builtin modules, and the bundled contents of all the `.py` files from the Python standard library.  If you've got a JavaScript shell handy, you can run Python commands with this thing by passing them on the command-line like so:

```
$> node pypy.js -c 'print "HELLO WORLD"'
debug: WARNING: Library path not found, using compiled-in sys.path.
debug: WARNING: 'sys.prefix' will not be set.
debug: WARNING: Make sure the pypy binary is kept inside its tree of files.
debug: WARNING: It is ok to create a symlink to it from somewhere else.
'import site' failed
HELLO WORLD
$>
```

As you might expect, this first version comes with quite a list of caveats:


* There's no JIT compiler.  I explicitly disabled it by passing in the `--opt=2` option above.  Producing a JIT compiler will require some platform-specific support code and I haven't really got my head around what that might look like yet.
* There's no filesystem access, which causes debug warnings to be printed at startup.  There is work taking place to extend Emscripten with a pluggable virtual filesystem, which should enable native file access at some point in the future.
* Instead, it uses a bundled snapshot of the filesystem to provide the Python standard library.  This makes startup *very very* slow, as the whole snapshot gets unpacked into memory before entering the main loop of the interpreter.
* There's no interactive console.  Output works fine, but input not so much.  I simply haven't dug into the details of this yet, but it shouldn't be too hard to get something rudimentary working.
* Lots of builtin modules are missing, because they require additional C-level dependencies.  For example, the `hashlib` module depends on OpenSSL.  I'll work on adding them, one by one.
* I most certainly haven't put a slick browser-based UI on top of it like [repl.it](http://repl.it).


So no, you probably can't run this in your browser right now.  But it is a real Python interpreter and it can execute real Python commands.  To get all that in exchange for a little bit of glue code, seems pretty awesome to me.


### Performance

The big question of course is, how does it perform?  To analyze this I turned to the Python community's most favorite and unscientific benchmark: pystone.  This is a pointless little program that exercises the Python interpreter through a number of loops and gives it a speed result in "pystones per second".  Here are the results from the various Python interpreters I have sitting on my machine; higher numbers are better:

<table style="border: 1px solid; width: 50%;">
<tbody><tr><th style="width: 100%">Interpreter</th><th>Pystones/sec</th></tr>
<tr><td>pypy.js, on node</td><td style="text-align: right">877</td></tr>
<tr><td>pypy.js, on spidermonkey</td><td style="text-align: right">7427</td></tr>
<tr><td>native pypy, no JIT</td><td style="text-align: right">53418</td></tr>
<tr><td>native cPython</td><td style="text-align: right">128205</td></tr>
<tr><td>native pypy, with JIT</td><td style="text-align: right">781250</td></tr>
</tbody></table>

The slowest result by far was running the compiled pypy.js on the stable release of [nodejs](http://nodejs.org/) that I happen to have installed.  This is essentially the base-case performance of the JavaScript, as this version of node has no particular special handling for the asm.js style of code emitted by Emscripten.  If I built the current development version it would probably run quite a bit faster.

Next slowest was running the compiled pypy.js under a nightly build of the [SpiderMonkey](https://developer.mozilla.org/en-US/docs/SpiderMonkey) JavaScript shell.  This is the JavaScript engine that powers Firefox, and it is able to recognize and optimize the asm.js syntax emitted by Emscripten.  As expected, this additional optimization provides a substantial speedup.

Next slowest is a native build of PyPy with its JIT-compilation features disabled.  Comparing this version to pypy.js gives some idea of the overhead paid when running in JavaScript versus native code, and we can see that it is around 7 times faster.  That's not even close to the only-two-times-slower results that have been shown on other asm.js-compiled code.  But then again, I've put precisely zero work into investigating or tweaking its performance.  I suspect there would be some relatively low-hanging fruit that could help close this gap.

Faster still is the native Python interpreter that came with my system, CPython 2.7.4.  This is an important point that sometimes gets forgotten: without its JIT, the PyPy interpreter can often be slower than the standard CPython interpreter.  That's currently the price it pays for the flexibility of its implementation, but things need not stay that way – the PyPy developers are always on the lookout for ways to speed up their interpreter even in the absence of its JIT.

Unsurprisingly, the speed king here is a native build of PyPy with its JIT-compilation features enabled.

It would be easy to compare pypy.js to the native JIT-enabled PyPy and conclude that this experiment was a bust.  There is a *two orders of magnitude* speed difference right now!  But this is just a first attempt, and the JavaScript version was running without the benefit of PyPy's special speed sauce.  If we could successfully translate PyPy's JIT functionality into JavaScript, we should be able to claw back a substantial chunk of that performance gap.  It's a pretty big "if", to be sure, but an interesting possibility.

As a preview of what might be possible, consider the [stand-alone RPython version of pystone](https://github.com/rfk/pypy/blob/master/rpython/translator/test/rpystone.py) that's available in the PyPy repo.  If we compile that from RPython down to native code, it will give us a rough upper limit on the capabilities of the machine.  And if we compile that from RPython down to JavaScript, it will give us a rough upper limit on what the possibilities of a JIT-enabled-PyPy-in-JavaScript might be:


<table style="border: 1px solid; width: 50%;">
<tbody><tr><th style="width: 100%">Interpreter</th><th>Pystones/sec</th></tr>
<tr><td>native rpystone</td><td style="text-align: right">38461538</td></tr>
<tr><td>rpystone.js, on spidermonkey</td><td style="text-align: right">13531802</td></tr>
</tbody></table>

Compared to the interpreted-pystone results above, these numbers are astonishingly high.  So much so that I suspect they're not entirely accurate, and are being skewed by some difference between the RPython version of pystone and the standard one.  But that's not really the point anyway.

The interesting thing here is the comparative performance of the two versions.  The JavaScript version is  less than three times slower than the natively-compiled version, a much smaller gap than what we saw with the full interpreter.  Could a JIT-enabled pypy.js run its hot loops at just three times slower than a native interpreter?  It's an interesting possibility.

### Will it JIT?

So I'm left with one burning question at this stage: is JavaScript-the-platform powerful enough to support PyPy's JIT-compilation features?  Frankly, I've no idea!  But it's my ongoing mission to dig more into the details of the RPython JIT generator and figure out what a JavaScript backend built around Emscripten and asm.js might look like.

From the JavaScript side, there is one very positive note: the [asm.js specification](http://asmjs.org) explicitly calls out the possibility of generating and linking new asm.js modules at any stage during the running of your code.  It is fully supported and fully expected, given the dynamic nature of JavaScript.

However, code running in asm.js mode is forbidden from creating new functions for itself.  If the pypy.js interpreter wanted to JIT-compile some code, it would have to move out of the asm.js fast-path by invoking an external JavaScript function.  Actually *running* the generated code would likewise require an external trampoline to let the interpreter escape from its own asm.js module and call into the new one, and the JITed code would need a similar trampoline to call back into the main interpreter.

This kind of [inter-asmjs-module linking](https://github.com/kripken/Emscripten/wiki/Linking) is a tentative item on the Emscripten roadmap, but it's not clear how much overhead it would entail.  If the cost of all this jumping back-and-forth were too high, it could easily swamp any performance benefit that the JITed code might bring.

There are also some potential roadblocks on the PyPy side.  The PyPy developers tried several times to build their JIT system on top of LLVM, but [repeatedly found it to be too limited for their needs](https://RPython.readthedocs.org/en/improve-docs/faq.html#could-we-use-llvm).  One of the main reasons cited was an inability to dynamically patch the generated machine code, a weakness that would be shared by a JavaScript JIT backend.

It's not yet clear to me exactly how limiting this will be.  If it's something that can be worked around at the cost of some efficiency, e.g. by adding additional checks and flag variables into the generated code, then maybe we can still get some value out of the JIT.  But if this kind of dynamic code-patching is fundamental to the operation of the JIT then we may be plain out of luck.

Ultimately, someone just needs to try it and see.  Assuming I can find the time, I plan to give it a shot.

PyPy with JIT is often reported to be six or more times faster than CPython on some benchmarks.  And we've seen that asm.js code can run less than three times slower than native code.  Combine those two numbers, and here's my lofty, crazy, good-for-motivation-but-likely-futile goal for the rest of the year:

**pypy.js, running in the spidermonkey shell, getting more pystones per second than the native CPython interpreter.**

Possible?  I've no idea.  But it's going to be fun finding out!

Any gamblers in the audience can [direct their enquiries to Brendan Eich](http://alwaysbetonjs.com/).
