+++
title = "A GIL Adventure (with a happy ending)"
date = 2010-02-05T13:33:01.185423
updated = 2010-02-05T13:33:01.185488
[taxonomies]
tags = ['software', 'python']
+++

I just halved the running time of one of my test suites.

The tests in question are multi-threaded, and while they perform a lot of IO they still push the CPU pretty hard.  For some time now, [nose](http://somethingaboutorange.com/mrl/projects/nose/) has been reporting a happy little message along these lines:

```
Ran 35 tests in 24.893s
```

I wouldn't have though anything of it, but every so often this number would drop dramatically – often down to as little as 15 seconds.  After a lot of puzzling, I realised that the tests would run faster whenever I had another test suite running *at the same time*.  Making my computer work harder made these tests run almost twice as fast!

<!-- more -->

Could it be?  Yes, I was finally seeing a manifestation of Python's dreaded [Global Interpreter Lock](http://en.wikipedia.org/wiki/Global_Interpreter_Lock) - a.k.a. the ["GIL of Doom"](http://blog.ianbicking.org/gil-of-doom.html).  Because I'm running on a dual core system, the different threads in this test suite were spreading themselves over both processors and engaging in an epic [GIL Battle](http://blip.tv/file/2232410) that bogged down the whole process.

The typical response to this awful multi-core behaviour is "just use [multiprocessing](http://docs.python.org/library/multiprocessing.html)".  That's not an option here, not least because these tests are supposed to be checking the thread safety of my code!

Not one to take such an indignity lying down, I've put together a set of extensions to Python's threading library that gives you more control over the behaviour of each thread.   In particular, it lets specify both a priority and a [CPU affinity](http://en.wikipedia.org/wiki/Processor_affinity) for each thread.  Grab it from PyPI: [threading2](http://pypi.python.org/pypi/threading2).

I shaved about 5 seconds off the execution time by using a special "background thread" class to execute some tasks at lower priority:

```python 
class BGThread(threading2.Thread):
    def __init__(self,*args,**kwds):
        super(BGThread,self).__init__(*args,**kwds)
        self.priority = 0.2
```

The biggest improvement, however, came from the following two lines of code:

```python 
cpu = random.choice(list(threading2.system_affinity()))
threading2.process_affinity((cpu,))
```

The `system_affinity` function returns the set of all CPUs on the system, while the `process_affinity` function sets the CPU affinity for the entire Python process.  So what we're doing here is simply picking a random CPU, then forcing all threads in the program to run only on that CPU.  With this simple change, nose now reports an even *happier* little message for my tests:

```
Ran 35 tests in 12.299s
```

It's sad to have to resort this kind of hackery, but at least there's a straightforward workaround. If I get a chance I'll try this out on Python 3 and report back – it's got a [new GIL implementation](http://mail.python.org/pipermail/python-dev/2009-October/093321.html) designed to avoid some of these pathological performance issues

And finally, before anyone chimes in with "why doesn't python set the process affinity automatically?!?!" – there are plenty of cases where spreading your threads across several processors can be a useful, sensible and efficient thing to do in Python.  But given the known pathological behaviour of the GIL in some cases, it should be easy to disable multi-core execution for programs that can't make use of it.  Well, [now you can](http://pypi.python.org/pypi/threading2).
