+++
title = "Preparing PyEnchant for Python 3.0"
date = 2008-11-26T11:10:30.521355
updated = 2009-05-08T17:16:42.355457
[taxonomies]
tags = ['software', 'python']
+++

Yesterday I released a new version of the [PyEnchant](http://pyenchant.sourceforge.net/) library with two important forward-looking features.

First, I've switched from generating the C-library binding with [SWIG](http://www.swig.org/) to the awesomeness that is [ctypes](http://www.python.org/doc/2.5.2/lib/module-ctypes.html).  The process was very straightforward and the switch brings a couple of significant advantages. PyEnchant is now a pure-python extension module, making it much simpler to distribute and saving me the trouble of creating a separate installer for each python version.  More importantly, it means that PyEnchant can now be used with [PyPy](http://codespeak.net/pypy/)!  There are also ctypes implementations in the works for both [Jython](http://www.nabble.com/ctypes-td19659413.html) and [IronPython](http://lists.ironpython.com/pipermail/users-ironpython.com/2006-June/002518.html).

Second, PyEnchant is now upwards-compatible with the upcoming [Python 3](http://www.python.org/download/releases/3.0/) series.  Fortunately PyEnchant doesn't use too many advanced features of Python, so it's possible to support both Python 2 and Python 3 from a single codebase.  However, it does take a little work to manage the differences between string objects in the two versions.  These tricks might be useful to others so I'll give a brief overview below.

<!-- more -->

**Update:** Of course, the recommended way to prepare for Python 3 is to use [2to3](http://docs.python.org/library/2to3.html) to automatically generate a Python 3 version of your Python 2 code, and I'll probably ship separate versions once Python 3 starts being being deployed.  For the moment, the changes required for PyEnchant are minimal enough that I can manage them inline in the old codebase, and the new string handling is actually cleaner and more robust than it was in the old Python-2-only version.

The standard behavior of Python 2, and the behavior provided by PyEnchant, is for string-handling functions to accept either normal ASCII string objects (instances of 'str') or Unicode string objects (instances of 'unicode'), and to return new strings that are of the same type as those provided.  So ASCII in gives ASCII out, and Unicode in gives Unicode out.  In Python 3, the 'str' class always represents a Unicode string.  On top of this, I'm interfacing with a C library that expects strings as UTF-8 encoded character arrays.

### Trick 1: Vocabulary

In Python 2, it's darn useful to know whether you've got a Unicode string, which you test for by doing the following:

```python 
if isinstance(s,unicode):
    handle_unicode(s)
else:
    handle_ascii(s)
```

You can also check whether you've got a string object of either kind using the special 'basestring' class:

```python 
if isinstance(s,basestring):
    handle_string(s)
else:
    handle_other(s)
```

These are both errors in Python 3 since there's no such thing as 'unicode' or 'basestring'.  But it's pretty simple to normalise the vocabulary between the two versions:

```python 
try:
    unicode = unicode
except NameError:
    # 'unicode' is undefined, must be Python 3
    str = str
    unicode = str
    bytes = bytes
    basestring = (str,bytes)
else:
    # 'unicode' exists, must be Python 2
    str = str
    unicode = unicode
    bytes = str
    basestring = basestring
```

You can then do all the standard string type-testing that you'd do in Python 2, and it does the right thing in Python 3.

### Trick 2: Unicode Literals

In Python 2 you create Unicode string objects by prepending "u" to the string literal, and embedding non-ASCII characters using Unicode escape sequences:

```python 
s = u"This is the Unicode phi symbol: \u03d5"
```

These are a syntax error in Python 3, which has dropped the "u" prefix for string literals.  The equivalent in Python 3 would be:

```python 
s = "This is the Unicode phi symbol: \u03d5"
```

While this is legal in Python 2, it won't give you what you want - instead, it will produce a string containing the literal character sequence "\u03d5".

To produce a notation that works correctly across both versions, we can take advantage of Python's powerful support for encoding/decoding Unicode strings to process the Unicode escape characters at run-time.  The following function will perform the necessary trickery:

```python 
def u(s):
    return s.encode("ascii").decode("unicode-escape")
```

In Python 2, this would take an ASCII string, encode it into ASCII (leaving it unchanged) and then decode it into a Unicode string by processing the contained escape characters.  In Python 3, it would take a Unicode string, encode it into an ASCII bytestring, then decode it back into a Unicode string by processing the contained escape characters.

The only remaining trick is to stop the Python parser from processing the escape characters itself when it first loads the string; we can use raw string literals for this purpose.   The final notation is:

```python 
s = u(r"This is the Unicode phi symbol: \u03d5")
```

This will correctly produce a Unicode string object in both Python 2 and Python 3.

It may be possible to achieve a similar effect by directly embedding the Unicode characters in the Python source file, and [specifying the file encoding](http://www.python.org/dev/peps/pep-0263/) appropriately.
But I prefer to keep my source files as pure ASCII since I sometimes need to use text editors that can't even be trusted to get line-endings right, let alone preserve non-ASCII characters.

### Trick 3: Unicode in, Unicode out

The final step in the compatibiltiy migration was ensuring that we respect the traditional Unicode-in/Unicode-out semantics of Python 2,
while correctly handling Unicode strings in Python 3 *and* correctly passing UTF-8 encoded byte arrays into the underlying C library.
To do so, I created a special subclass of 'str' that knows about the necessary logic:

```python 
class EnchantStr(str):

      def __new__(cls,value):
        """EnchantStr data constructor.

        This method records whether the initial string was unicode, then
        simply passes it along to the default string constructor.
        """
        if type(value) is unicode:
          was_unicode = True
          if str is not unicode:
            value = value.encode("utf-8")
        else:
          was_unicode = False
          if str is not bytes:
            raise RuntimeError("Don't pass bytestrings to pyenchant")
        self = str.__new__(cls,value)
        self._was_unicode = was_unicode
        return self

    def encode(self):
        """Encode this string into a form usable by the enchant C library."""
        if str is unicode:
          return str.encode(self,"utf-8")
        else:
          return self

    def decode(self,value):
        """Decode a string returned by the enchant C library."""
        if self._was_unicode:
          if str is unicode:
            # ctypes converts c_char_p into a unicode string, but
            # it may not use utf-8.
            return value.encode().decode("utf-8")
          else:
            return value.decode("utf-8")
        else:
          return value
```

All incoming strings received by PyEnchant are immediately converted to an EnchantStr, which is a subclass of the 'str' type that remembers whether the original string was unicode or ASCII.  This object then knows how to encode itself into a UTF-8 byte array for passing into the C library, and how to decode any strings coming out of the C library back into the appropriate type.  The only trick here is using "str is unicode" to detect that we're on Python 3, and "str is not unicode" to detect Python 2.

Here's a short example of how this class gets used ('_e' is the ctypes binding to the enchant C library):

```python 
def suggest(self,word):
    word = EnchantStr(word)
    suggs = _e.dict_suggest(self._this,word.encode())
    return [word.decode(w) for w in suggs]
```

Using these simple idioms, PyEnchant can now transparently do-the-right-thing with strings in both Python 2 and Python 3, all from a single codebase.