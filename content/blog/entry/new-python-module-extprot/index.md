+++
title = "New Python module: extprot"
date = 2009-08-04T12:01:54.140449
updated = 2009-08-04T12:01:54.140519
[taxonomies]
tags = ['software', 'python']
+++


One of my commercial projects requires a space-efficient object serialisation format, and until now I've been using the obvious choice in Google's [Protocol Buffers](http://code.google.com/p/protobuf/).  I'm happy enough with the format itself, but the experience of using the Python bindings was just barely satisfactory.  The interface feels quite Java-ish and there are some non-obvious gotchas, such as having to use special methods to manipulate list fields.  I ploughed ahead, but was quietly looking around for alternatives.

The last straw came when I tried to establish a deployment scheme using [pip requirements files](http://blog.ianbicking.org/2008/12/16/using-pip-requirements/).  Both `pip install protobuf` and `easy_install protobuf` fail hard: the pypi eggs are out of date, the source download has a non-standard structure, and the `setup.py` script tries to bootstrap itself using the protobuf compiler that it assumes you have already built.  Yuck.  This was more pain than I was willing to put up with.  Plus it was a good opportunity to take another look around.

I toyed briefly with [Facebook's](http://developers.facebook.com/thrift/)...errr...I mean [Apache Thrift](http://developers.facebook.com/thrift/), but it had too much remote-procedure-call baggage and not enough documentation.  Then I stumbled across a great little screed about [extprot](http://eigenclass.org/R2/writings/extprot-extensible-protocols-intro), a technology to create "compact, efficient and extensible binary protocols that can be used for cross-language communication and long-term data serialization".<!-- more -->

Yet another wire format for data serialisation?  Yes, but this one has some neat features that fit well into my headspace:


* a **powerful type system**; This inludes strongly-typed tuples and lists, tagged disjoint unions, and parametric polymorphism in the style of Haskell or ML.  Once you've used a disjoint union type, you will never want to see another enum as long as you live.
* **self-describing data**; The 'skeleton' of a message can be recovered without knowing the protocol definition.  This is approximately like reading an XML document without knowing anything about the tag names.
* **self-delimiting data**; All serialised messages indicate their length, allowing easy streaming and skipping of individual protocol components.  Entirely new wire types can thus be added without breaking existing parsers.


These features combine to make extprot strongly extensible. Messages can often maintain backward *and* forward compatibility across protocol extensions that include adding fields to a message, adding elements to a tuple, adding cases to a disjoint union, and promoting a primitive type into
a tuple, list or union.

There's just one problem of course – no Python bindings.  But as they say, every problem is an opportunity in disguise.

The module's called "extprot", the packages are on [pypi](http://pypi.python.org/pypi/extprot/), and the code is on [github](http://github.com/rfk/extprot/tree/master).  It was a remarkably fun experience trying to reify a Hindley-Milner-style type system as Python class objects, and I'm quite happy with the way it turned out.  As an added bonus I got to try out the fabulous [pyparsing](http://pyparsing.wikispaces.com/) module for the first time.  In the author's humble opinion, this extprot package has got some serious advantages over the protobuf python bindings:


* It's a pure-python module, packaged and distributed in the standard fashion.
* It's friendly to dynamic package management tools like pip.
* It works exclusively with standard Python objects.  Declared a list field?  It's a native list object.
* You don't need to compile your protocol definitions.


That last point deserves a special mention.  Dammit, ***this is Python!***  I don't want to introduce a compiler into my fantastically productive read-eval-print loop.  With extprot, you can point the module to your protocol definition file and dynamically compile it into an in-memory class structure.  Suppose I have the following protocol definition file:

```
    message person = {
        id:   int;
        name: string;
        emails: [ string ]
    }
```

I can load and use it in python with this much work:

```python 
>>> import extprot
>>> extprot.import_protocol("mydefs.proto",globals())
>>> print person
<class '<extprot.dynamic>.person'>
```

And I can work with the resulting classes without any knowledge of extprot:

```python 
>>> p1 = person(1,"Guido")    # kwd args would also work
>>> print p1.emails    # fields use a sensible default if possible
[]
>>> p1.emails.append("guido@python.org")
>>> p1.emails.append(7)    # all fields are dynamically typechecked
Traceback (mosts recent call last):
    ...
ValueError: not a valid String: 7
>>> print repr(p1.to_string())    # look at that compact binary string!
'\x01\x1f\x03\x00\x02\x03\x05Guido\x05\x13\x01\x03\x10guido@python.org'
>>> print person.from_string(p1.to_string()).name
'Guido'
```

Now it's time to fess up just a little: the size of the encodings produced by extprot are of the same order as those from protobuf, but they do have a few extra bytes of overhead due to their self-delimiting nature.  For my applications these extra bytes don't outweigh the advantages I've described above, but your mileage may vary.  I also suspect it would be trivial to remove these delimiters in a separate translation step if you really needed to squeeze them out.

So, looking for a language-neutral serialisation or messaging scheme?  Take a look at [extprot](http://eigenclass.org/R2/writings/extprot-extensible-protocols-intro), its very powerful [type system](http://github.com/mfp/extprot/blob/38ef5d4d9c6d206943ef96abf1e36a01f5578176/doc/protocol-definition.md) and the flexible [protocol extensions](http://eigenclass.org/R2/writings/protocol-extension-with-extprot) that it permits.  In my opinion it's a serious contender, and I hope these Python bindings help push it along  just a little.
