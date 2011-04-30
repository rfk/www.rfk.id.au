---
title: >
 Preparing PyEnchant for Python 3.0
slug: preparing-pyenchant-for-python-3
created: !!timestamp '2008-11-26 11:10:30.521355'
modified: !!timestamp '2009-05-08 17:16:42.355457'
tags: 
    - software
    - python
---

{% mark excerpt %}<p>Yesterday I released a new version of the <a href="http://pyenchant.sourceforge.net/">PyEnchant</a> library with two important forward-looking features.</p>
<p>First, I've switched from generating the C-library binding with <a href="http://www.swig.org/">SWIG</a> to the awesomeness that is <a href="http://www.python.org/doc/2.5.2/lib/module-ctypes.html">ctypes</a>.  The process was very straightforward and the switch brings a couple of significant advantages. PyEnchant is now a pure-python extension module, making it much simpler to distribute and saving me the trouble of creating a separate installer for each python version.  More importantly, it means that PyEnchant can now be used with <a href="http://codespeak.net/pypy/">PyPy</a>!  There are also ctypes implementations in the works for both <a href="http://www.nabble.com/ctypes-td19659413.html">Jython</a> and <a href="http://lists.ironpython.com/pipermail/users-ironpython.com/2006-June/002518.html">IronPython</a>.</p>
<p>Second, PyEnchant is now upwards-compatible with the upcoming <a href="http://www.python.org/download/releases/3.0/">Python 3</a> series.  Fortunately PyEnchant doesn't use too many advanced features of Python, so it's possible to support both Python 2 and Python 3 from a single codebase.  However, it does take a little work to manage the differences between string objects in the two versions.  These tricks might be useful to others so I'll give a brief overview below.</p>
<p><b>Update:</b> Of course, the recommended way to prepare for Python 3 is to use <a href="http://docs.python.org/library/2to3.html">2to3</a> to automatically generate a Python 3 version of your Python 2 code, and I'll probably ship separate versions once Python 3 starts being being deployed.  For the moment, the changes required for PyEnchant are minimal enough that I can manage them inline in the old codebase, and the new string handling is actually cleaner and more robust than it was in the old Python-2-only version.</p>{% endmark %}
<p>The standard behavior of Python 2, and the behavior provided by PyEnchant, is for string-handling functions to accept either normal ASCII string objects (instances of 'str') or Unicode string objects (instances of 'unicode'), and to return new strings that are of the same type as those provided.  So ASCII in gives ASCII out, and Unicode in gives Unicode out.  In Python 3, the 'str' class always represents a Unicode string.  On top of this, I'm interfacing with a C library that expects strings as UTF-8 encoded character arrays.</p>
<h3>Trick 1: Vocabulary</h3>
<p>In Python 2, it's darn useful to know whether you've got a Unicode string, which you test for by doing the following:</p>
{% syntax python %}if isinstance(s,unicode):
    handle_unicode(s)
else:
    handle_ascii(s){% endsyntax %}
<p>You can also check whether you've got a string object of either kind using the special 'basestring' class:</p>
{% syntax python %}if isinstance(s,basestring):
    handle_string(s)
else:
    handle_other(s){% endsyntax %}
<p>These are both errors in Python 3 since there's no such thing as 'unicode' or 'basestring'.  But it's pretty simple to normalise the vocabulary between the two versions:</p>
{% syntax python %}try:
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
    basestring = basestring{% endsyntax %}
<p>You can then do all the standard string type-testing that you'd do in Python 2, and it does the right thing in Python 3.</p>
<h3>Trick 2: Unicode Literals</h3>
<p>In Python 2 you create Unicode string objects by prepending "u" to the string literal, and embedding non-ASCII characters using Unicode escape sequences:
{% syntax python %}s = u"This is the Unicode phi symbol: \u03d5"{% endsyntax %}
<p>These are a syntax error in Python 3, which has dropped the "u" prefix for string literals.  The equivalent in Python 3 would be:</p>
{% syntax python %}s = "This is the Unicode phi symbol: \u03d5"{% endsyntax %}
<p>While this is legal in Python 2, it won't give you what you want - instead, it will produce a string containing the literal character sequence "\u03d5".</p>
<p>To produce a notation that works correctly across both versions, we can take advantage of Python's powerful support for encoding/decoding Unicode strings to process the Unicode escape characters at run-time.  The following function will perform the necessary trickery:</p>
{% syntax python %}def u(s):
    return s.encode("ascii").decode("unicode-escape"){% endsyntax %}




<p>In Python 2, this would take an ASCII string, encode it into ASCII (leaving it unchanged) and then decode it into a Unicode string by processing the contained escape characters.  In Python 3, it would take a Unicode string, encode it into an ASCII bytestring, then decode it back into a Unicode string by processing the contained escape characters.</p>
<p>The only remaining trick is to stop the Python parser from processing the escape characters itself when it first loads the string; we can use raw string literals for this purpose.   The final notation is:</p>
{% syntax python %}s = u(r"This is the Unicode phi symbol: \u03d5"){% endsyntax %}
<p>This will correctly produce a Unicode string object in both Python 2 and Python 3.</p>
<p>It may be possible to achieve a similar effect by directly embedding the Unicode characters in the Python source file, and <a href="http://www.python.org/dev/peps/pep-0263/">specifying the file encoding</a> appropriately.  But I prefer to keep my source files as pure ASCII since I sometimes need to use text editors that can't even be trusted to get line-endings right, let alone preserve non-ASCII characters.</p>
<h3>Trick 3: Unicode in, Unicode out</h3>
<p>The final step in the compatibiltiy migration was ensuring that we respect the traditional Unicode-in/Unicode-out semantics of Python 2, while correctly handling Unicode strings in Python 3 <i>and</i> correctly passing UTF-8 encoded byte arrays into the underlying C library.  To do so, I created a special subclass of 'str' that knows about the necessary logic:</p>
{% syntax python %}class EnchantStr(str):

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
          return value{% endsyntax %}
<p>All incoming strings received by PyEnchant are immediately converted to an EnchantStr, which is a subclass of the 'str' type that remembers whether the original string was unicode or ASCII.  This object then knows how to encode itself into a UTF-8 byte array for passing into the C library, and how to decode any strings coming out of the C library back into the appropriate type.  The only trick here is using "str is unicode" to detect that we're on Python 3, and "str is not unicode" to detect Python 2.</p>
<p>Here's a short example of how this class gets used ('_e' is the ctypes binding to the enchant C library):</p>
{% syntax python %}def suggest(self,word):
    word = EnchantStr(word)
    suggs = _e.dict_suggest(self._this,word.encode())
    return [word.decode(w) for w in suggs]{% endsyntax %}
<p>Using these simple idioms, PyEnchant can now transparently do-the-right-thing with strings in both Python 2 and Python 3, all from a single codebase.</p>


