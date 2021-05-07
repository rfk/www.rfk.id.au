+++
title = "PyEnchant: now with OSX!"
date = 2010-08-17T21:53:27.443930
updated = 2010-08-17T21:53:27.443981
[taxonomies]
tags = ['software', 'python']
+++


The latest release of [PyEnchant](http://www.rfk.id.au/software/pyenchant/) now contains an experimental binary distribution for OSX, as both an mpkg installer and a python egg.  In theory, users on OSX 10.4 or later should be able to just drop [`pyenchant-1.6.3-py2.6-macosx-10.4-universal.egg`](http://pypi.python.org/packages/2.6/p/pyenchant/pyenchant-1.6.3-py2.6-macosx-10.4-universal.egg) somewhere on sys.path and be up and running and spellchecking with ease.

If you're a Mac user, please try it out and [let me know](http://github.com/rfk/pyenchant/issues/) if anything doesn't work the way you expect.

<!-- more -->

The experience of building this was quite interesting, and more than a little painful, because I wanted to build a proper universal library that could be used on almost any Mac out there.  The gory details can be found in [pyenchant-bdist-osx-sources-1.6.3.tar.gz](http://www.rfk.id.au/software/pyenchant/downloads/pyenchant-bdist-osx-sources-1.6.3.tar.gz); this post is a quick set of notes that might help others get started.

Fortunately for me, the familiar build toolchain of `./configure; make; make install` is pretty much intact on OSX.  The only real trickery is getting the resulting library to work on systems other than your own.  I hit two major stumbling blocks in this regard:

* how to build [fat binaries](http://en.wikipedia.org/wiki/Fat_binary) that still work on older versions of OSX?
* how to make the libraries relocatable, so they can be installed at any location?

This may all be old news to seasoned OSX veterans, but hopefully these notes can help out other expat linux users like me.


## Fat Binaries (the hard way)

If you're lucky, building your lib into a fat binary will be easy: just add `-arch i386 -arch ppc -arch x86_64` to your CFLAGS and off you go.  But if the library's build scripts aren't prepared to handle multiple `-arch` options, or if you need to support older versions of OSX, then this will most likely fail.  PyEnchant's dependencies (mostly [glib](http://library.gnome.org/devel/glib/)) failed on both counts, so instead I had to construct the fat binaries by hand.

To build libraries that work all the way back to OSX 10.4, you need to build against the 10.4u SDK. But there's a problem – the 10.4u SDK is missing 64-bit versions of several vital APIs.  The only way I could find to work around it was to compile the i386 and ppc versions of the library against the 10.4u SDK, compile the x86_64 version against the 10.5 SDK, then stitch them together into a custom fat binary.  Here are the basics of how it looks in the PyEnchant build script:

``` 
# create three different compile trees for the three architectures.
cp -r glib-2.24.1 glib-2.24.1.i386
cp -r glib-2.24.1 glib-2.24.1.ppc
cp -r glib-2.24.1 glib-2.24.1.x86_64

# compile the i386 and ppc versions against the 10.4u SDK
cd glib-2.24.1.i386
./configure CC=gcc-4.0 CFLAGS="-isysroot /Developer/SDKs/MacOSX10.4u.sdk -mmacosx-version-min=10.4 -arch i386"
make

cd ../glib-2.24.1.ppc
./configure CC=gcc-4.0 CFLAGS="-isysroot /Developer/SDKs/MacOSX10.4u.sdk -mmacosx-version-min=10.4 -arch ppc"
make

# compile the x86_64 version against the 10.5 SDK
cd ../glib-2.24.1.x86_64
./configure CC=gcc-4.0 CFLAGS="-isysroot /Developer/SDKs/MacOSX10.5.sdk -mmacosx-version-min=10.5 -arch x86_64"
make

# use lipo to stitch them all together
lipo -create -arch i386 glib-2.24.1.i386/glib/.libs/libglib.dylib -arch ppc glib-2.24.1.ppc/glib/.libs/libglib.dylib \
           -arch x86_64 glib-2.24.1.x86_64/glib/.libs/libglib.dylib -output ./libglib.dylib
```

Just to be sure, we can also use lipo to verify that the resulting library contains code for all three architectures:

``` 
$> lipo -info ./libglib.dylib
Architectures in the fat file: ./libglib.dylib are: i386 ppc x86_64
```


## Relocatable Libraries

If you take a peek inside the resulting dynamic libraries, you will see that they embed *absolute paths* at which they expect to find their runtime dependencies.  Here are the dependencies from the glib library after compiling using the trick above:

``` 
$> otool -L ./build/lib/libglib-2.0.0.dylib
./build/lib/libglib-2.0.0.dylib:
        /Users/rfk/software/pyenchant/tools/pyenchant-bdist-osx-sources/build/lib/libglib-2.0.0.dylib (...snip...)
        /System/Library/Frameworks/Carbon.framework/Versions/A/Carbon (...snip...)
        /Users/rfk/software/pyenchant/tools/pyenchant-bdist-osx-sources/build/lib/libiconv.2.dylib (...snip...)
        /Users/rfk/software/pyenchant/tools/pyenchant-bdist-osx-sources/build/lib/libintl.8.dylib (...snip...)
        /usr/lib/libSystem.B.dylib (...snip...)
        /usr/lib/libgcc_s.1.dylib (...snip...)
        /System/Library/Frameworks/CoreServices.framework/Versions/A/CoreServices (...snip...)
        /System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation (...snip...)
```

While the libraries under `/usr` and `/System` aren't likely to go missing, the end-user is clearly not going to have anything installed under the `pyenchant-bdist-osx-sources` build directory! Shipped as is, this library will give linker errors on any machine but my own.

In the linux world we have the concept of an [rpath](http://en.wikipedia.org/wiki/Rpath_%28linking%29), which is a path embedded in the library telling the linker where to look for dependencies.  Crucially, the rpath can contain the string `${ORIGIN}` to specify paths relative to the installed location of the library.

Starting with 10.4, OSX has a similar facility called the "loader path".  If you embed the string `@loader_path` into the dependency paths of your dynamic library, it will be replaced with the parent directory of the library or executable that is currently loading your lib.  This can [cause difficulties](http://lapcatsoftware.com/blog/2007/08/11/embedding-frameworks-in-loadable-bundles/) when your library may be loaded from several different places, but for PyEnchant it is enough to get going.

In my `setup.py` file I use [`install_name_tool`](http://developer.apple.com/mac/library/documentation/Darwin/Reference/ManPages/man1/install_name_tool.1.html) to adjust these paths to the following:

```
$> otool -L ./enchant/lib/libglib-2.0.0.dylib
./enchant/lib/libglib-2.0.0.dylib:
        @loader_path/libglib-2.0.0.dylib (...snip...)
        /System/Library/Frameworks/Carbon.framework/Versions/A/Carbon (...snip...)
        @loader_path/libiconv.2.dylib (...snip...)
        @loader_path/libintl.8.dylib (...snip...)
        /usr/lib/libSystem.B.dylib (...snip...)
        /usr/lib/libgcc_s.1.dylib (...snip...)
        /System/Library/Frameworks/CoreServices.framework/Versions/A/CoreServices (...snip...)
        /System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation (...snip...)
```

Now I can simply bundle all the required libraries into the "lib" directory of the enchant distribution, and they will all happily find each other at runtime.

This all seems to work for me on a 32-bit python running under 10.4, a 32-bit python running under 10.6, and the native 64-bit python that comes with 10.6.  Unfortunately I don't have a ppc Mac to test this on – any reports that it works (or otherwise) would be greatly appreciated.

