+++
title = "Compiling RPython Programs"
date = 2010-08-09T15:45:36.194366
updated = 2010-08-09T16:44:24.776465
[taxonomies]
tags = ['python']
+++

Inspired by a recent [discussion on Reddit](http://www.reddit.com/r/programming/comments/cytcx/shed_skin_05_released_an_optimizing_pythontoc/) about a Python-to-C++ compiler called [Shed Skin](http://shed-skin.blogspot.com/2010/08/shed-skin-05.html), I decided to write up my own experiences on compiling (a restricted subset of) Python to a stand-alone executable.  My tool of choice is the translation toolchain from the [PyPy](http://pypy.org/) project – a project, by the way, that every Python programmer should take a look at.

Take this very exciting (**EDIT:** and [needlessly inefficient](http://www.reddit.com/r/Python/comments/cyyzz/compiling_rpython_programs/c0wbopq)) python script, which we'll assume is in a file "factors.py":

```python 
def factors(n):
    """Calculate all the factors of n."""
    for i in xrange(2,n / 2 + 1):
       if n % i == 0:
           return [i] + factors(n / i)
    return [n]

def main(argv):
    n = int(argv[1])
    print "factors of", n, "are", factors(n)

if __name__ == "__main__":
    import sys
    main(sys.argv)
```

We can of course run this from the command-line using the python interpreter, but gosh that's boring:

```console 
$> python factors.py 987654321
factors of 987654321 are [3, 3, 17, 17, 379721]
```

Instead, let's compile it into a stand-alone executable!  Grab the latest source tarball from the [PyPy downloads page](http://pypy.org/download.html#building-from-source) and unzip it in your work directory:<!-- more -->

```
$> ls
pypy-1.3  factors.py
```

To compile this script using the PyPy translator, it will need to be in a restricted subset of Python known as "RPython".  Among other things this means no generators, no runtime function definitions, and no changing the type of a variable.  Unfortunately there is no complete definition of what RPython is – it's basically whatever subset of Python the PyPy developers have managed to make work.  A good reference for getting started is the [PyPy coding guide](http://codespeak.net/pypy/dist/pypy/doc/coding-guide.html#restricted-python).

Fortunately, our simple script is already valid RPython :-)

Next we need to add a hook telling the PyPy compiler where execution of our script begins.  Rather than the classic __name__ == "__main__" block, PyPy loads and executes a special function named "target" to find the entry point for the script:

```python 
def factors(n):
    """Calculate all the factors of n."""
    for i in xrange(2,n / 2):
       if n % i == 0:
           return [i] + factors(n / i)
    return [n]

def main(argv):
    n = int(argv[1])
    print "factors of", n, "are", factors(n)
    return 0

def target(driver,args):
    return main,None
```

Note that the "target" function returns the desired entry-point for the script as a function object.  I've no idea why it has to return a tuple – perhaps one of the PyPy devs will stumble past and enlighten us.  Also note that the main routine is required to return an integer status code.

Now, we can simply invoke the PyPy translation toolchain on our script:

```
$> python pypy-1.3/pypy/translator/goal/translate.py --batch --output factors.exe factors.py
...
...lots and lots of output
...
[Timer] Total:                         --- 17.9 s
$>
$> ls
pypy-1.3  factors.exe  factors.py
```

Yep, it takes almost 20 seconds to compile on my machine.  That should give you some idea of how much work PyPy is doing behind the scenes.

The `--output` option lets you specify the name of the output file, and the `--batch` option prevents the compiler from trying to open an interactive debug window.  You can of course pass `--help` to get a list of available options, but most of them are specific to building PyPy's standlone python interpreter (e.g. they select the GC engine to use, whether to include stackless extensions, etc) and are not relevant for a generic RPython program.

The resulting executable does just what you'd expect:

```
$> ./factors.exe 987654321
factors of 987654321 are [3, 3, 17, 17, 379721]
```

Neat.

For a real-life example of this toolchain in action, check out the experimental ["pypy-compile" branch of esky](http://github.com/rfk/esky/tree/pypy-compile).  The script [esky/bootstrap.py](http://github.com/rfk/esky/blob/pypy-compile/esky/bootstrap.py) is valid RPython, while the function `compile_to_bootstrap_exe` in [esky/bdist_esky/__init__.py](http://github.com/rfk/esky/blob/pypy-compile/esky/bdist_esky/__init__.py) automates the process shown here, calling out to PyPy to compile this bootstrapping script into a stand-alone executable.

As for why you might want to go to all this trouble, here's a simple demonstration:

```
$> time python factors.py 987654321
factors of 987654321 are [3, 3, 17, 17, 379721]

real	0m0.040s
user	0m0.032s
sys	0m0.004s
```

```
$> time ./factors.exe 987654321
factors of 987654321 are [3, 3, 17, 17, 379721]

real	0m0.005s
user	0m0.004s
sys	0m0.000s
```

That's an order-of-magnitude speedup.
