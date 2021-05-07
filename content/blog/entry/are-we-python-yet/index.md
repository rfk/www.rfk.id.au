+++
title = "Are we Python yet?"
date = 2015-01-28T21:17:00
updated = 2015-01-28T21:17:00
[taxonomies]
tags = ['mozilla', 'python', 'javascript']
+++

While it was a lot of fun to see [a web-based python interpreter beat my system python on a single carefully-tuned benchmark](/blog/entry/pypy-js-faster-than-cpython), that result obviously didn't say much about the usefulness of [PyPy.js](http://pypyjs.org) for any real-world applications.  I'm keen to find out whether the web can support dynamic language interpreters for general-purpose use in a way that's truly competitive with a native environment.

Inspired by the [PyPy speed center](http://speed.pypy.org/) and the fine Mozilla tradition of [publicly](http://arewefastyet.com/) [visualising](https://areweslimyet.com/) [performance](http://areweamillionyet.org/) [metrics](http://arewemetayet.com/), I've been working on a benchmark suite and metrics-tracking site for PyPy.js.  The initial version is finally live:

[Are we Python yet?](http://arewepythonyet.com)

**TL;DR:**  not really, not yet – but we're tracking slowly towards that goal.

<!-- more -->

There are a lot of different ways to look at the data on this site, but here are a few highlights from my own explorations:




* While the front page of the [PyPy speed center](http://speed.pypy.org/) features twenty python benchmarks that exercise a variety of workloads, the PyPy.js suite currently contains [a mere eight of them](http://arewepythonyet.com/performance.html#view=breakdown).  These are the ones that were easiest for me to get up and running, and they therefore tend to skew towards synthetic-benchmark-style tests rather than real-world code.  I hope to get at least the Django and Spitfire tests ported over sometime soon.

* Each python benchmark is [run for 20 iterations](http://arewepythonyet.com/performance.html#benchmark=chaos&view=detail) and by default we [summarize by taking the mean](http://arewepythonyet.com/performance.html#view=trend) across all iterations.  It's also possible to compare the [max](http://arewepythonyet.com/performance.html#view=trend&metric=max) (to get an idea of JIT warmup overhead) or the [min](http://arewepythonyet.com/performance.html#view=trend&metric=min) (to disregard said overhead).

* We track performance of a native PyPy interpreter alongside the asmjs version, and the results when [comparing PyPy against CPython](http://arewepythonyet.com/performance.html#view=breakdown&native=on&js=off&d8=off) seem to roughly match those reported on PyPy's own speed center.  That's a nice sanity-check, and hopefully means that I haven't committed any terribly grievous sins in analysing these results!

* When compiled without a JIT, the asmjs version sees a [fairly uniform 1.5 to 2 times slowdown](http://arewepythonyet.com/performance.html#view=trend&js=on&d8=off&jit=off&norm=pypy) from a native PyPy interpreter when run under SpiderMonkey.  It is also quite uniform under V8, at a [4 to 6 times slowdown](http://arewepythonyet.com/performance.html#benchmark=chaos&view=trend&native=off&js=off&d8=on&jit=off&norm=pypy).  This is nicely within the expected range of performance penalty when compiling to asmjs.

* When compiled with an asmjs-targeting JIT, performance is [a lot more variable](http://arewepythonyet.com/performance.html#view=breakdown&js=on&d8=on&jit=on&norm=pypy) – there's anywhere from five times to ***several hundred times*** slowdown compared to a native PyPy, depending on the benchmark and the javascript engine in use.

* Digging into the performance over an [individual benchmark run](http://arewepythonyet.com/performance.html#view=detail&norm=pypy), the source of this large and highly-variable slowdown is obvious.  The javascript versions show [substantial](http://arewepythonyet.com/performance.html#benchmark=richards&view=detail&js=on&d8=off&jit=on&norm=pypy) [spikes](http://arewepythonyet.com/performance.html#benchmark=spectral-norm&view=detail&js=on&d8=off&jit=on&norm=pypy) that correspond to the JIT kicking in and taking a lot of time to re-compile a bunch of javascript code.

* If we compare the [minimum iteration time](http://arewepythonyet.com/performance.html#benchmark=spectral-norm&view=detail&js=on&d8=off&jit=on&norm=pypy&metric=min) from each benchmark rather than the mean across all iterations, the results are a lot less variable and the asmjs version tends to be within a 10 times slowdown from native.  That's still not great, but it's a lot better than 100 or more.

* Compared to a native CPython interpreter rather than native PyPy, the story is more interesting.  The [minimum iteration times](http://arewepythonyet.com/performance.html#benchmark=chaos&view=breakdown&js=on&d8=on&native=off&norm=cpython&jit=on&metric=min) average out to be slightly faster than CPython, but the [maximum times](http://arewepythonyet.com/performance.html#benchmark=chaos&view=breakdown&js=on&d8=on&native=off&norm=cpython&jit=on&metric=max) are much slower.  Mean performance works out at around [2 times slower than CPython](http://arewepythonyet.com/performance.html#benchmark=chaos&view=breakdown&js=on&d8=on&native=off&norm=cpython&jit=on&metric=mean), but again, with very high variability.

* The download size is [still humongous](http://arewepythonyet.com/startup.html#view=filesize) and will probably stay that way for some time.  I've got a few ideas in the works that will pull that graph downwards a little, but I've no real sense for how small we might feasibly make the compiled code.  Disabling the JIT [saves a few MB](http://arewepythonyet.com/startup.html#view=filesize&jit=off) but leaves plenty behind.



So where are we at, and where to from here?

Given the above, I think it's fair to say that PyPy.js is not yet competitive with a native python environment.  The combination of large download size and startup overhead, expensive JIT compilation pauses, and occasional embarrassing performance penalties will be a show-stopper for anything but very specialised applications.  And we're not yet even tracking another important metric: the [performance of interacting with the host javascript environment and DOM](https://github.com/rfk/arewepythonyet/issues/1).

But I do see a lot of scope for continuing to improve these metrics.

On the performance front, there will always be *some* penalty to the approach taken in PyPy.js – while a native PyPy interpreter can just write a chunk of native code into memory and then jump to it, we must build a javascript source string in memory, copy it out of the asmjs heap into a native string object, ask the host environment to compile it for us, then indirectly execute it via a helper function.  There is, however, plenty that could be done to reduce this overhead from the current implementation, which naively builds all the code for a loop into a single function and re-compiles it on every change.  Since [javascript compilation time can increase non-linearly with function size](http://mozakai.blogspot.com.au/2013/08/outlining-workaround-for-jits-and-big.html), just breaking things up into smaller functions should go a long way here.

When it comes to download size, I think I can still squeeze out maybe a MB or two through improvements to the code generation process, such as this in-progress patch for [reducing the number of writes to PyPy's shadowstack](https://github.com/rfk/pypy/compare/rfk:master...rfk/optz-shadow-stack).  After that we'll have to reach for more drastic techniques, such as separating the code for builtin modules from that of the interpreter itself so that they can be loaded on demand.

Can these improvements bring us within reach of competing with native?  While I'm hopeful, I honestly don't know.  But if nothing else, having these graphs to watch is highly motivating!  We may not be python yet, but we're also not done yet.  Stay tuned.
