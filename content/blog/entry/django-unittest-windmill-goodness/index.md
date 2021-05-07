+++
title = "Django + unittest + Windmill == Goodness"
date = 2009-01-22T23:48:01.373384
updated = 2009-05-08T17:14:15.518648
[taxonomies]
tags = ['software', 'python', 'django']
+++

I've been having my mind blown by [Django](http://www.djangoproject.com/) over the course of this week.  Not the in flashy one-shining-moment-of-brilliance kind of way, but through a slowly dawning awareness of just how much it makes possible.  Or perhaps it's more accurate to say: just how much I need to re-calibrate my expectations of what should be possible, and what should be downright *easy*.  My latest little epiphany has revolved around unit-testing, which back when I was cutting my teeth on PHP4 was far from a trivial undertaking for even a simple web-app.

<!-- more -->

While developing my various Python libraries, I've become accustomed to the straightforward [testing support in setuptools](http://peak.telecommunity.com/DevCenter/setuptools#test).  This allows a simple `python setup.py test` to run the full suite of unittests against a clean build of the code, including an automatic re-build of any C extensions if required.  But testing libraries is one thing, and testing an interactive application is quite another.  Suffice to say, I was expecting to be in for a good deal of pain.

A quick Google for "Django unittest" later, and I was feeling a lot more optimistic.  The top result is the official Django docs page on [testing Django applications](http://docs.djangoproject.com/en/dev/topics/testing/), and it's a pretty decent overview of the bundled testing framework.  They've done a great job of leveraging the standard [unittest](http://docs.python.org/library/unittest.html) module to make testing a Django application feel much like testing any other Python project – you write tests inside subclasses of unittest.TestCase, and a simple `python manage.py test` runs them in a clean build of the code, including setup of a separate test database. All in all, remarkably pain free.

But while it provides a powerful [test client](http://docs.djangoproject.com/en/dev/topics/testing/#module-django.test.client) for interrogating and checking the output of your views, Django doesn't provide native facilities for testing the kind of rich javascript-based behaviors so beloved of Web 2.0.  For this, you need an in-browser testing framework such as [Selenium](http://seleniumhq.org/) or [Windmill](http://www.getwindmill.com/).  I gritted my teeth once more and prepared for the pain of integrating these in-browser tests with my newly-written Django test cases.

Google "Django Windmill".  Find the official wiki page on [integrating Windmill and Django](http://trac.getwindmill.com/wiki/WindmillAndDjango).  Relax.  It's all going to be OK...

I had only two small hiccups following the above procedure for running Windmill tests within Django.  First, failed Windmill tests seems to hang on to an open TCP socket for a few minutes, making it difficult to re-run the tests after fixing whatever it was that was failing.  The fix is quite simple and I've submitted it upstream: [explicitly close the socket when django.TestServerThread exits](http://trac.getwindmill.com/ticket/174).

Second, all of the Windmill tests are run as a single Django test instance, meaning that they share the same test database and can potentially clobber one another's data.  This is understandable, since the Windmill startup process is quite time-consuming, but it is contrary to the ideals of unit testing; each test is supposed to run in a completely independent environment.  I worked around this using the following code instead of the example from the Windmill wiki:

```python 
from os import path
from windmill.authoring import djangotest

wmtests = path.join(path.dirname(path.abspath(__file__)),"windmilltests")
for nm in os.listdir(wmtests):
    if nm.startswith("test") and nm.endswith(".py"):
        testnm = nm[:-3]
        class WindmillTest(djangotest.WindmillDjangoUnitTest):
            test_dir = path.join(wmtests,nm)
            browser = "firefox"
        WindmillTest.__name__ = testnm
        globals()[testnm] = WindmillTest
        del WindmillTest
```

This creates a separate WindmillDjangoUnitTest subclass for each test*.py file found in the windmilltests directory, allowing each test to run with a fresh copy of the Django test database.  The end result is a testing environment that I can really feel comfortable with.

Now, any Ruby folks reading this post are probably laughing and smugly recalling the awesome power of [Rails](http://rubyonrails.org/) and [RSpec](http://rspec.info/), which have provided this sort of thing for some time.  But this really just proves the point that I'm coming to realise more and more with Django, and that we've seen in the open-source world time after time: [It's](http://www.universitybusiness.com/viewarticle.aspx?articleid=1147) [the](http://blogs.atlassian.com/news/2007/03/lessons_from_fi.html) [community](http://www.garfieldtech.com/blog/its-the-community-stupid), [stupid](http://www.slideshare.net/karinejoly/eduweb-2008-closing-keynote-its-the-community-stupid).

This post isn't about Django having the best technology stack; I'm far from convinced on that account.  But it's clear that the Django community is really a powerful beast, and this leads to a bunch of work on integrating, extending, and generally toying around with Django, finding ways to shape it to fit a whole variety of different needs and leading to built-in Django support in related projects such as Windmill.  Most importantly, the results of all this work are easy to find and easy to apply in your own projects.  In this instance I'm particularly grateful to the Django team and the Django community; I've deployed a few web apps without a decent testing framework in the past, and the resulting fragility was a source of constant pain.

Colour me impressed.
