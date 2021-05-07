+++
title = "jQuery, first impressions"
date = 2009-01-11T00:33:15.974903
updated = 2009-01-11T00:33:15.974946
[taxonomies]
tags = ['software', 'javascript']
+++

New projects are always a great opportunity to develop some new skills along
the way. With my latest project I've jumped on the chance to tick a box
that's spent far too long on my todo-list, and find out what all the
fuss is about concerning the "write less, do more"
JavaScript library known as [jQuery](http://jquery.com/).

<!-- more -->

I've got a long history with JavaScript. It was the first programming 
language I ever learned, way back in 1998 – yikes, over ten years ago! – before the AJAX craze and all these modern libraries, toolkits and frameworks.  More recently, I've spent a couple of years slinging [Dojo](http://www.dojotoolkit.org/) code at [VPAC](http://www.vpac.org/).  While I enjoyed the Dojo experience, I've always felt slightly uncomfortable with it for reasons that I couldn't quite put my finger on.  With only a week or so of jQuery under my belt, I think I can now articulate why.

Dojo, particularly in its early versions but even so today, is a relatively "enterprisey" toolkit – it puts a lot of effort into structuring the development process and ensuring that your project can be broken down in the standard Java-esque style of modules and classes.  While this produces some very useful features, such as the excellent module and widget systems, it can also feel quite alien in a language as dynamic as JavaScript.  You wind up spending an inordinate amount of time trying to make your JavaScript look less like JavaScript and more like Java, for example by defining  classes in "standard" OO style using dojo.declare() rather than using JavaScript's prototype-based object semantics.  There are advantages in this approach, but it's clear that you're fighting the language to achieve them.<!-- more -->

jQuery strikes me as the polar opposite to the Dojo approach, as it is unashamedly about writing JavaScript – prototype-based-classes, private-member-closures and all.  Its primary mode of operation isn't "write some classes then instantiate and manipulate them", but rather "find some DOM nodes and do stuff with them".  This seems to encourage lightweight, judicious use of JavaScript rather than the development of a heavyweight client platform.

Even though jQuery is famed for its succinctness, I quite wasn't prepared for just how true this would be. For the first few hours it seemed to reach well beyond "terse" and into the realm of "barren", until I realised that almost every function was overloaded to provide several different modes of operation.  The top-level "$" function, for example, serves four different purposes: selecting nodes from the DOM, wrapping a DOM node in a jQuery object, creating new DOM nodes from HTML, and registering callbacks for the document load event.

Ordinarily I'm not a fan of overloading functions in this way, since [explicit is better than implicit](http://www.python.org/dev/peps/pep-0020/).  But after working with jQuery for the past week, I have to admit that it works in this particular instance – the code is easy to write, easy to read, I'm genuinely writing less and doing more!  There's definitely a unique "jQuery style" that takes a little getting used to, but John et. al. have a good eye for clarity of code and ease of use, so don't fight it.  Remember, [beautiful is better than ugly](http://www.python.org/dev/peps/pep-0020/).

I'm certainly no rockstar just yet, but I'm enjoying what I see so far and looking forward to using jQuery more intensely over the coming weeks.  I've even released a jQuery plugin called [jquery-loadInline](http://rfk.github.com/jquery-loadinline/), a neat little function to make links and forms load their contents into a page element rather than changing the page location, producing a kind of "mini browser" within the page.  At 213 lines of code and a few hours to write, it's a pretty solid return on my jQuery investment so far.