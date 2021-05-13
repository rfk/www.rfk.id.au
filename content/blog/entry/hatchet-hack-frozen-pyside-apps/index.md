+++
title = "Hatchet: hack frozen PySide apps down to size"
date = 2011-02-07T08:14:52.182195
updated = 2011-02-07T08:14:52.182251
[taxonomies]
tags = ['software', 'python']
+++

If you've seen any of my [latest](http://pypi.python.org/pypi/esky) [python](http://pypi.python.org/pypi/zipimportx) [projects](http://pypi.python.org/pypi/signedimp), you know that I spend a lot of time thinking about *freezing* python programs – taking a python script and packaging it up into a stand-alone application that can be deployed to an end user.  My latest quest has been freezing an application that uses [PySide](http://www.pyside.org/) for its GUI, and trying to make the resulting distribution bundle as small as possible.  The result is a neat little tool called [Hatchet](https://github.com/rfk/pysidekick/blob/master/PySideKick/Hatchet.py).

This post is part motivational, part example.  I'll show you a basic "hello world" app in PySide, take you through the process of freezing it into a stand-alone application, then show how to use Hatchet to shrink the distribution down to a manageable size.  If that seems a little too academic for you, consider this for real-world motivation: using the techniques shown in this post, I was able to chop over *40MB* off of the [SaltDrive](http://www.saltdrive.com/) application bundle for Mac OSX.

<!-- more -->

Let's begin with the PySide version of "hello world".  Here's the code:

```python 
import sys
from PySide import QtGui

app = QtGui.QApplication(sys.argv)
msg = QtGui.QLabel("Hello  World!")
msg.show()
app.exec_()
```

To make this into a stand-alone application, we can freeze it using [cxfreeze](http://cx-freeze.sourceforge.net/) (or [bbfreeze](https://pypi.org/project/bbfreeze/), or [py2exe](https://pypi.org/project/py2exe/), or [pyp2app](https://py2app.readthedocs.io/en/latest/), the results will all be similar).  Using just the packages installed into my system python, we get the following:

``` 
$> #  call cxfreeze to generate the frozen app
$> cxfreeze hello.py
...
...  lots of output from cxfreeze
...
$> #  the "dist" directory then contains the frozen executable
$> ls dist/
bz2.so              _codecs_kr.so  libpyside-py26.so.1.0    _multibytecodec.so
_codecs_cn.so       _codecs_tw.so  libpython2.6.so.1.0      PySide.QtCore.so
_codecs_hk.so       datetime.so    libQtCore.so.4           PySide.QtGui.so
_codecs_iso2022.so  _heapq.so      libQtGui.so.4            readline.so
_codecs_jp.so       hello          libshiboken-py26.so.1.0
```

And here's the resulting application running in all its glory on my Ubuntu box:

```console 
$> ./dist/hello
```

<img src="/static/scratch/helloworld.png"></img>

Very nice.  Unfortunately, it's gigantic:

```console 
$> du -hs dist/
33M	dist/
```

Yes, that's 33 megabytes for "hello world"!  We can definitely do better.  Of course there are no prizes for guessing what's taking up most of that space:

```console 
$> du -hs dist/* | grep Qt
2.5M	dist/libQtCore.so.4
11M	dist/libQtGui.so.4
2.8M	dist/PySide.QtCore.so
13M	dist/PySide.QtGui.so
```

That's 13.5M for the Qt libraries, plus another 15.8M for the PySide bindings, for over 29M out of a 33M distribution.  I repeat:  we can do better!

First for the low-hanging fruit.  I made a custom build of Python, Qt and PySide using some well-known techniques for reducing code size:

* add `-Os` to the build flags for Python and Qt, to switch off optimizations that increase code size
* configure the PySide build with `-DCMAKE_BUILD_TYPE=MinSizeRel`, which is the cmake equivalent of the above
* add `-fno-exceptions` to the build flags for Qt and PySide, to disable generation of C++ stack-unwinding code


The results were actually far better than I expected:

```console 
$> rm -rf dist/
$> ~/smallpy/local/bin/cxfreeze hello.py
...
...
$>
$> du -hs dist/* | grep Qt
1.8M	dist/libQtCore.so.4
6.8M	dist/libQtGui.so.4
1.8M	dist/PySide.QtCore.so
7.0M	dist/PySide.QtGui.so
$>
$> du -hs dist/
23M	dist/
```

A nice improvement!  We've saved around 10M just by adjusting the compiler options.  But 23M for a "hello world" application is still somewhere in the vicinity of gigantic.  We should be able to do better.

The biggest contributor to all this bloat is *dead code*.  This simple little application doesn't use Qt classes such as [QClipboard](http://www.pyside.org/docs/pyside/PySide/QtGui/QClipboard.html), [QGestureRecognizer](http://www.pyside.org/docs/pyside/PySide/QtGui/QGestureRecognizer.html), [QGraphicsEllipseItem](http://www.pyside.org/docs/pyside/PySide/QtGui/QGraphicsEllipseItem.html) or many hundreds of others.  But it still bundles all the code for these classes in the Qt binaries, and bindings for them in the PySide binaries.

If this were a C++ application, the solution would be straightforward.  We'd simply [statically link the Qt libraries](http://www.formortals.com/how-to-statically-link-qt-4/) and only pull in code for the classes we actually use.  Unfortunately this isn't an option for PySide, since python extension modules must be compiled as dynamic libraries.

There's only one thing for it:  we must eliminate unused code from within the PySide bindings themselves.  Enter the latest addition to my [PySideKick](http://pypi.python.org/pypi/PySideKick/) utility module: [Hatchet](https://github.com/rfk/pysidekick/blob/master/PySideKick/Hatchet.py).  Hatchet lets you hack your PySide binaries down to size, by rebuilding them with just the classes and methods you need.  Grab it like so:

``` 
$> pip install PySideKick
```

Here's what Hatchet does to your frozen app in a nutshell:


* Walks the code for your frozen application, extracting all the identifiers.
* Determines the set of PySide classes and methods that your application is *definitely not* using.
* Downloads the latest PySide sources and configures them for a minimum size build as described above.
* Hacks the PySide sources so they won't build bindings for classes you don't use.
* Builds the hacked sources and inserts them into your frozen application.


Let's take a look:

``` 
$> #  execute Hatchet as a script, giving the path to the frozen app
$> ~/smallpy/local/bin/python -m PySideKick.Hatchet ./dist/
...
... Lots of output from Hatchet.
... The most important lines are:
...
PySideKick.Hatchet:   keeping 66 classes
PySideKick.Hatchet:   rejecting 761 classes, 3881 methods
...
... Ryan grabs a coffee as it analyses the code
... and rebuilds the PySide binaries.
...
$>
$> du -hs dist/* | grep Qt
1.8M	dist/libQtCore.so.4
6.8M	dist/libQtGui.so.4
508K	dist/PySide.QtCore.so
512K	dist/PySide.QtGui.so
$>
$> du -hs dist
16M	dist
```

You'll notice that the sizes of the PySide binaries are now reported in kilobytes rather than megabytes.  Very nice!  We've saved another 7M by hacking dead code out of the PySide bindings.  How much code?  Hatchet reports that it has kept the bindings for only 66 classes, entirely eliminating 761 classes from the Qt API.  And for the classes it kept, it suppressed the bindings for an additional 3881 methods.

Why does it keep 66 classes when the code only uses QApplication and QLabel?  Part of the reason is that Hatchet will generate bindings for the argument types and return types of all kept methods, and the base classes of all kept classes.   But it's also due to *false positives* in the code analysis process – classes and methods that Hatchet thinks the code is using even though it isn't.

To avoid some false positives, we can tell Hatchet to only examine the code in our hello.py script rather than looking at the entire frozen application:

```console 
$> #  tell Hatchet to only examine hello.py, and not follow any imports
$> ~/smallpy/local/bin/python -m PySideKick.Hatchet --no-follow-imports ./dist/ ./hello.py
...
... Lots of output from Hatchet.
... The most important lines are:
...
PySideKick.Hatchet:   keeping 50 classes
PySideKick.Hatchet:   rejecting 764 classes, 3622 methods
...
... Ryan goes to lunch as it analyses the code
... and rebuilds the PySide binaries, again.
...
$>
$> du -hs dist/* | grep Qt
1.8M	dist/libQtCore.so.4
6.8M	dist/libQtGui.so.4
432K	dist/PySide.QtCore.so
328K	dist/PySide.QtGui.so
$>
$> du -hs dist
15M	dist
```

Another meg saved.  Not bad.

And just to confirm, it still does everything that a hello-world app should do:

```console 
$> ./dist/hello
```

<img src="/static/scratch/helloworld.png"></img>

By tweaking the build options and eliminating dead code from within PySide, we have managed to *halve* the size of the distribution.  Now, 15M is still pretty big for a simple "hello world" application.  But a fair chunk of that size can be attributed to Python rather than to the GUI libraries.  For comparison, a text-only "hello world" in python freezes at around 4.5M on my machine:

```console 
$> cat hellotxt.py 

print "hello world"

$>
$> cxfreeze hellotxt.py 
...
$>
$> du -hs dist/
4.5M	dist/
```

Can we do better still?  To make any serious progress, we would need to start eliminating dead code from within the Qt libraries themselves.  There's an interesting possibility here – although we can't compile PySide itself as a static library, we *could* statically link Qt into the PySide libraries.  Since the hacked-down PySide bindings no longer reference large parts of the Qt API, this should provide a nice additional saving.  I've done some initial experiments but the results have been too buggy to be practical.  Watch this space for updates; I aim to get this hello-world application below 10M uncompressed.

And of course there are always executable packers such as [UPX](http://upx.sourceforge.net/) if you need to shave just that little bit more off the binaries.

Now for the caveats:


* Since Hatchet rebuilds PySide from source, you'll need a full development environment including the Qt libraries and headers and the shiboken bindings generator.
* You can easily fool Hatchet by constructing class names dynamically, e.g. `getattr(QtGui,"QLab"+"el")`.  Don't do that.
* The more of the Qt API your application uses, the less benefit you'll get by using Hatchet.  Obviously.


Other than that, I've found this hackery to be remarkably effective and the resulting size-reduced binaries very stable.  That such a thing is possible at all, let alone possible in the ~1000 lines of code that comprise Hatchet, is a credit to the designers of the PySide bindings and the [Shiboken](http://www.pyside.org/docs/shiboken/) bindings generator.

I hope you'll find it useful

