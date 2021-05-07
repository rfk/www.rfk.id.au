+++
title = "Extended Iterable Unpacking"
date = 2008-12-11T11:50:29.802627
updated = 2009-05-08T17:15:28.725664
[taxonomies]
tags = ['software', 'python']
+++

If you care about these things, you probably already know: [Python 3](http://www.python.org/) was released last week to much fanfare.  There has been some good-natured debate about the [pros](http://sayspy.blogspot.com/2008/12/whats-with-30-hatin.html) and [cons](http://mooseyard.com/Jens/2008/12/python-30-whats-the-point/) of switching from the 2.x series, focused mostly around the big-ticket changes like better Unicode handling (pro) and breaking compatibility with all existing Python libraries (con).  Instead, I wanted to share a small joy I've found in Python 3 that I'm already missing in Python 2: [extended iterable unpacking](http://www.python.org/dev/peps/pep-3132/).

<!-- more -->

In Python 2, you can automatically unpack a list/tuple/iterable into a series of variables using a single assignment statement:

```python 
>>> a,b,c = [1,2,3]
>>> print a
1
>>> print c
3
>>>
```

This is a very elegant technique, assuming you know how many items are in the list and want each of them in a separate variable.  But if you want to unpack only certain elements of the list, you're stuck doing the unpacking yourself.  Python's slicing syntax makes this bearable, but still pretty ugly:

```python 
>>> items = [1,2,3,4,5]
>>> start = items[0]
>>> end = items[-1]
>>> rest = items[1:-1]
>>> print start
1
>>> print rest
[2, 3, 4]
>>> 
```

Yuck.  But in Python 3, you can now use the starred-variable syntax familiar from function argument definitions to say "put all the unmatched elements into this variable":<!-- more -->

```python 
>>> items = [1,2,3,4,5]
>>> start, *rest, end = items
>>> print(start)
1
>>> print(rest)
[2, 3, 4]
>>> 
```

The ability to compress this into a clean one-liner might seem trivial, but I'm already finding it a significant win.  When writing code, it lets you express your intention directly and then get on with the business of handling the data.  When reading code, it reduces the line-noise effect of the explicit slicing and makes your intention that much easier to discern.

Maybe it's just my background in logic programming and resulting love for pattern-matching assignment, but this seems to be one of those features that you never think you'd use until you have opportunity to use it, and then you start seeing opportunities to use it everywhere.  Unfortunately the syntax doesn't appear to have been back-ported to Python 2.6, and since most of my projects need to stay 2.x-compatible I'm now that much worse off – I'm stuck doing it the old way with explicit slicing, but I know there's something better just beyond my reach...
