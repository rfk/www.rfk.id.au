+++
title = "Automagical 'self' for Python Methods"
date = 2007-09-12T16:26:55
updated = 2008-11-16T22:30:18.323770
[taxonomies]
tags = ['software', 'python']
+++

Inspired by the never-ending stream of "explicit self is really ugly" comments that Python seems to attract, and wanting to hack around a little in the deep bowels of Python, I've put together a new python module called [autoself](http://cheeseshop.python.org/pypi/autoself/).

As the name suggests, it does one very simple thing: automagically adds 'self' as the first argument in a method  definition.  It doesn't turn local variables into instance attributes.  It doesn't change the semantics of method calls in any way shape or form.  It just lets you save five keystrokes when defining a method.
Will I be using this in my own code?  No. No no no. I love explicit 'self'!  But it was a lot of fun, and surprisingly subtle to get right in non-trivial cases such as inner classes.  And I can now cross "python bytecode hacking" off my things-to-do list. (Interesting fact: python uses different bytecodes to access local variables, for optimization purposes.  So turning 'self' from a free variable reference to a local variable requires rewriting the function's bytecode)