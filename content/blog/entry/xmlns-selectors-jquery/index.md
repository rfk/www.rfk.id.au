+++
title = "XML Namespace Selectors for jQuery"
date = 2009-05-22T00:03:27.819312
updated = 2009-05-22T00:16:02.966747
[taxonomies]
tags = ['software', 'javascript']
+++

I hit my first real roadbump with [jQuery](http://www.jquery.com/)
yesterday, a missing feature that really made me stop and stare in puzzlement:
jQuery doesn't support xml-namespace selectors.  Since I'm trying to parse [WebDAV](http://en.wikipedia.org/wiki/WebDAV) response bodies, and such documents make extensive use of namespaces, it's quite the issue for me.  Or rather, it *was* quite the issue – read on if you're interested in the details, or just [download my solution](/static/scratch/jquery.xmlns.js) if you're impatient.

<!-- more -->

Oh sure, jQuery supports *prefix* selectors just fine.  If your
document contains an element <D:response>, you can quite safely query
for that element by name as long as you remember to backslash-escape the colon:

```javascript 
$(doc).find("D\\:response")
```

This works as long as you can guarantee that a single prefix is used for
the target namespace, and that it's used uniformly throughout the document.  But
the [XML Namespaces standard](http://www.w3.org/TR/REC-xml-names/),
as well as the [WebDAV
standard](http://www.ietf.org/rfc/rfc2518.txt), make it very clear that you can't rely on this in general.

> The node name prefix is a purely syntactic construct, while its actual
> namespace is a semantic property that can be specified in several different
> ways.

Fortunately, the [CSS Level 3](http://www.w3.org/TR/css3-selectors/) standard provides a very clear syntax and semantics for namespace-aware queries.  After declaring 'D' to be the proper WebDAV namespace URI, the CSS-3 equivalent to the above prefix query would be:

```javascript 
$(doc).find("D|response")
```

Unfortunately, this syntax is largely still a pipe-dream.  Not only is it missing from jQuery, but I couldn't find another implementation to help get me off the ground.  The only thing for it was to implement it myself – so about six hours later, after studying the internals of the [Sizzle selector engine](http://www.sizzlejs.com/) and adventuring from `getElementsByTagNameNS` through to XPath's `namespace-uri()` and `local-name()` functions, I have a solution that I'm happy to show to the world: [jquery.xmlns.js](/static/scratch/jquery.xmlns.js).

This plugin extends the jQuery tag and attribute query functions to allow an optional namespace selector.  In the simplest case you declare a namespace prefix in the *`$.xmlns`* object, then just query for it as normal:

```javascript 
$.xmlns["D"] = "DAV:";
$(doc).find("D|response").each(...);
```

Sadly, the namespace declarations need to be global since the underlying jQuery/Sizzle selector machinery is stateless.  If you're anything like me, such globals will offend your delicate programming sensibilities.  To perform a namespace-based query and automatically clean up when you're done, you can use the *xmlns* query method as follows:

```javascript 
$(doc).xmlns({D:"DAV:"},function() {
  //  The 'D' namespace is declared within this function
  return this.find("D|response").each(...);
  //  and removed again when the function exits
});
```

It's also possible to specify a default namespace, which will be used when no explicit selector is given.  Just pass a string rather than a mapping object, like so:

```javascript 
$(doc).xmlns("DAV:",function() {
  //  This only searches within the 'DAV:' namespace
  return this.find("response").each(...);
});
```

Namespaced attribute selectors are also supported, although there are some restrictions as spelled out [here](http://www.w3.org/TR/css3-selectors/#attrnmsp).  The following would search for elements with a 'href' attribute in any namespace:

```javascript 
$(doc).find("[*|href]");
```

Of course, there are plenty of caveats here.  I've tested this on Firefox and IE7 and it meets my expectations, but I haven't explored any of the bizarre corner cases that I'm sure are lurking out there.  I also haven't done any performance testing, although I have tried hard not to slow down the common case where a namespace selector is not specified.  I'm far from an expert here –  any bug reports, success reports or general suggestions most welcome!

Now, to actually get on with the job I was supposed to be doing yesterday...
