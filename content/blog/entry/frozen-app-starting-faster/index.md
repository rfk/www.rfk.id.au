+++
title = "Starting Faster for Frozen Python Apps"
date = 2010-07-21T16:08:17.961874
updated = 2010-07-21T16:08:17.961951
[taxonomies]
tags = ['software', 'python']
+++

I've just spent a few days trying to improve the performance of a frozen Python app - specifically, the time it takes to start up and present a login window.  Most of the improvements were down to good old-fashioned writing of better code, but I also put together a couple of tricks to help shave off even more milliseconds.  They both target one of the major sources of slowness when starting up a Python app: imports.

<!-- more -->

Import processing is an area where an app written in Python is at a big disadvantage compared to compiled languages such as C or Java.  In a such languages the equivalent of an "import" statement is usually a *compile-time* directive that sucks in code from another file, and its impact on startup time is negligible.  In Python, the import statement is a *run-time* directive that goes looking for the named module, compiles the source file if necessary, loads the compiled code into memory, executes the code in a new namespace, and finally returns the resulting module object.  Clearly the fewer imports you can do at application startup, the better.


### Lazy Imports

I first learned how important lazy imports can be from [Andrew Bennetts](http://bemusement.org/), who works for Canonical on the [Bazaar](http://bazaar.canonical.com) version control system.  Most Python-related conferences in Australia feature Andrew giving a presentation on performance (most recently it was at PyCon AU with [Making your python code fast](http://pyconau.blip.tv/file/3838190/)) and he always mentions the lazy import mechanism used by Bazaar.

The idea is simple:  declare your imports at the top of each file as usual, but arrange for the actual import process to take place only when needed.  This lets the program get up and running without paying the overhead of module search and initialisation for *all* its dependencies at start time.  And if it turns out that a certain module isn't actually needed this time around, so much the better - you don't pay the overhead of importing that module at all.

A good idea, but most implementations of it annoy me.  They tend to create a little mini-language for declaring the imports, which you provide as a string in your source file.  Compare this example from the [Importing](http://peak.telecommunity.com/DevCenter/Importing) module:

```python 
sdist = lazyModule('distutils.command.sdist')
```

And this one using [bzrlib.lazy_import](http://people.canonical.com/~mwh/bzrlibapi/bzrlib.lazy_import.html):

```python 
lazy_import(globals(), '''
from bzrlib import (
    errors,
    osutils,
    branch,
    )
import bzrlib.branch
''')
```

Why don't I like this approach?  It tends to hide your imports from various analysis tools.  In the first example above, you can't even *grep* for your imports without knowing that lazyModule is being used.  I like the bzrlib approach much better, but I still worry that it hides the imports from tools like [py2exe](http://www.py2exe.org/), which tracks imports by crawling the compiled code looking for import-related opcodes.

In the end I rolled my own solution, which is included in the latest release of [esky](http://pypi.python.org/pypi/esky/).  It's a simple decorator syntax that works as follows:

```python 
from esky.util import lazy_import

@lazy_import
def socket():
    import socket
    return socket
```

For a simple example like that, this syntax is much more verbose than the alternatives shown above.  But here the imports live in actual code inside your module, so they won't be hidden from anything but the most simple-minded analysis tools.  And instead of trying to parse an import-related mini-language, I can use the full power of python to describe the lazy imports.  For example:

```python 
@lazy_import
def pickle():
    try:    
        import cPickle as pickle
    except ImportError:
        import pickle
    return pickle
```

It even supports lazily-evaluated conditional imports like this:

```python 
@lazy_import
def fcntl():
    try:    
        import fcntl
    except ImportError:
        fcntl = None
    return fcntl
```

I'm sure there are lots of corner-cases where this scheme breaks down, but as long as you keep your imports simple it will work fine.  Most importantly, I cut more than a second off my program's startup time with just a few `@lazy_import` decorators.


### Pre-processed Zip Files

One of the key components of a frozen python app is the `library.zip` file, which contains the precompiled bytecode for all the modules it may need to import at runtime.  Very convient, as long as importing from a zipfile is fast.  So imagine my surprise when profiling showed that my app was spending almost two *seconds* just loading up its `library.zip` file!

Fortunately it appears performance is only that bad when running the app from a mapped SMB drive, and on a native disk the zipfile loading time is on the order of 100 milliseconds.  Still, that's time spent parsing the meta-data out of a zipfile that could be spent more productively – especially since the contents of the zipfile are never going to change.

If you peek into the internals of the [`zipimport`](http://docs.python.org/library/zipimport.html) module, you'll find a dictionary called `_zip_directory_cache` which is used to hold pre-processed information about the contents of each zipfile on `sys.path`.  So if we can somehow arrange for this dict to be populated with the correct information *before* trying to import anything from `library.zip`, we can avoid the cost of parsing the directory information out of the zipfile.

Enter today's little project: [`zipimportx`](http://pypi.python.org/pypi/zipimportx/).  This is a simple wrapper around the `zipimporter` class that first looks for an index file named, for example, `library.zip.win32.idx`.  If such a file is found, it's loaded using the [`marshal`](http://docs.python.org/library/marshal.html) module and the result is directly inserted into `_zip_directory_cache`.

Create the index files like this:

```python 
from zipimportx import zipimporter
zipimporter("/path/to/library.zip").write_index()
```

And enable their use in your frozen app like this:

```python 
zipimportx.zipimporter.install()
```

My tests show that the use of these pre-processed index files can speed up zipfile loading by about a factor of 3 on Linux, a factor of 5 on Windows, and a factor of *thousands* when running from a mapped SMB drive.  I'll let you draw your own conclusions about the I/O subsystems of each platform.

(Edit: Actually, I've skipped a little bit here - you have to somehow arrange for the `zipimportx` module to live *outside* your `library.zip`, or you obviously can't use it to speed up the loading of that file!  I recommend using `inspect.getsource()` to embed the code from `zipimportx` directly in your application's startup script.)

Unlike lazy imports, this trick probably isn't going to make-or-break the startup speed of your application.  But it's very easy to apply and is essentially free, barring the extra storage space for the index files.

